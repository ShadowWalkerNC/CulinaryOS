// ============================================================
// R4 Durable Offline Queue — failure/restart/ack tests (P4a/A02/A03)
// Scope: packages/shared/src/offline-store.ts via injected backends.
//
// What this suite proves (with fakes): persistence failure surfaces
// before success, restart preserves pending work, tenant/device
// partitioning, stable operation IDs, ack-only-submitted-known-IDs,
// preserved financial evidence, and never-replayed queued cards.
//
// ACTUAL BROWSER LIMITS — NOT certified here (honest boundary):
// - Real IndexedDB quota, LRU eviction under disk pressure, version
//   upgrade/blocked-connection races, and multi-tab read-modify-write
//   interleavings are not exercised; this file only asserts the IDB
//   backend fails closed when IndexedDB is absent (Node).
// - Per-browser behavior (Chrome/Edge, Safari incl. private mode where
//   IDB may be unavailable or transient, Firefox quota prompts, Android
//   WebView) requires on-device runs with exact model/firmware/SDK.
// - Cross-tab coordination, service-worker interplay, and storage-pressure
//   eviction need a real-browser harness (R8 rehearsal), not these fakes.
// - MemoryOfflineBackend is test-only and intentionally non-durable.
// A PASS here is regression evidence, never production certification.
// See docs/POS_PILOT_CORRECTNESS_SPEC.md A02/A03 and
// docs/ARCHITECTURE_RESILIENCE_PLAN.md R4.
// ============================================================

import { describe, it, expect, mock } from 'bun:test';
import {
  DurableOfflineQueue,
  MemoryOfflineBackend,
  LocalStorageOfflineBackend,
  IndexedDBOfflineBackend,
  createAutoOfflineBackend,
  indexedDBAvailable,
  durablePartitionKey,
  generateOpId,
  getPosDeviceId,
  isSubmittableDelta,
  extractConfirmedIds,
  LEGACY_OFFLINE_QUEUE_KEY,
  OfflineStoreError,
  type OfflineBackend,
  type OfflineScope,
  type DurableOfflineDelta,
  type EnqueueDurableInput,
  type StorageLike,
} from '@culinaryos/shared';

// ---------- helpers ----------

const SCOPE_A: OfflineScope = { tenantId: 'tenant-a', deviceId: 'device-1' };
const SCOPE_A2: OfflineScope = { tenantId: 'tenant-a', deviceId: 'device-2' };
const SCOPE_B: OfflineScope = { tenantId: 'tenant-b', deviceId: 'device-1' };

const FIXED_TS = '2026-09-30T12:00:00.000Z';

function cashInput(id: string, overrides: Record<string, any> = {}): EnqueueDurableInput {
  return {
    id,
    tenant_id: SCOPE_A.tenantId,
    device_id: SCOPE_A.deviceId,
    order_id: `order-${id}`,
    action: 'finalize_payment',
    payload: { amount: 4950, method: 'cash', tip_amount: 500, ...overrides },
    timestamp: FIXED_TS,
  };
}

function lineInput(id: string, scope: OfflineScope = SCOPE_A): EnqueueDurableInput {
  return {
    id,
    tenant_id: scope.tenantId,
    device_id: scope.deviceId,
    order_id: 'order-1',
    action: 'add_line_item',
    payload: { menu_item_id: 'item-1', quantity: 1, line_total: 1500 },
    timestamp: FIXED_TS,
  };
}

function makeMapStorage(initial?: Record<string, string>): StorageLike & { map: Map<string, string> } {
  const map = new Map<string, string>(Object.entries(initial ?? {}));
  return {
    map,
    getItem: (k: string) => (map.has(k) ? (map.get(k) as string) : null),
    setItem: (k: string, v: string) => {
      map.set(k, v);
    },
    removeItem: (k: string) => {
      map.delete(k);
    },
  };
}

function quotaError(): Error {
  const err = new Error('storage quota exceeded');
  err.name = 'QuotaExceededError';
  return err;
}

function makeQuotaStorage(): StorageLike & { map: Map<string, string> } {
  const inner = makeMapStorage();
  return { ...inner, setItem: () => { throw quotaError(); } };
}

function captureFetch(body: unknown, ok = true) {
  const seen: any[] = [];
  const fn = mock(async (_url: string, opts: any) => {
    seen.push(JSON.parse(opts.body));
    return { ok, json: async () => body };
  });
  return { fetch: fn as unknown as typeof fetch, seen, calls: (fn as any).calls as any[] };
}

async function expectStoreErrorCode(promise: Promise<unknown>, code: string): Promise<OfflineStoreError> {
  try {
    await promise;
  } catch (err) {
    expect(err).toBeInstanceOf(OfflineStoreError);
    expect((err as OfflineStoreError).code).toBe(code);
    return err as OfflineStoreError;
  }
  throw new Error(`expected OfflineStoreError ${code} but the call succeeded`);
}

// ---------- A02: persistence failure surfaces before success ----------

describe('durable queue persistence failures (A02)', () => {
  it('quota-exceeded enqueue throws QUOTA_EXCEEDED and records nothing', async () => {
    const storage = makeQuotaStorage();
    const q = new DurableOfflineQueue({ backend: new LocalStorageOfflineBackend(storage) });
    await expectStoreErrorCode(q.enqueue(cashInput('op-quota-1'), SCOPE_A), 'QUOTA_EXCEEDED');
    expect(storage.map.size).toBe(0);
    expect(await q.getPending(SCOPE_A)).toEqual([]);
  });

  it('write-throwing backend surfaces WRITE_FAILED with no success reported', async () => {
    const inner = new MemoryOfflineBackend();
    const failing: OfflineBackend = {
      backendName: 'failing-write',
      list: (s) => inner.list(s),
      insert: async () => {
        throw new OfflineStoreError('disk gone', 'WRITE_FAILED');
      },
      markSynced: (s, ids) => inner.markSynced(s, ids),
      bulkInsert: (s, d) => inner.bulkInsert(s, d),
    };
    const q = new DurableOfflineQueue({ backend: failing });
    await expectStoreErrorCode(q.enqueue(lineInput('op-write-1'), SCOPE_A), 'WRITE_FAILED');
    expect(await q.getPending(SCOPE_A)).toEqual([]);
  });

  it('read failure surfaces READ_FAILED on getPending', async () => {
    const failing: OfflineBackend = {
      backendName: 'failing-read',
      list: async () => {
        throw new OfflineStoreError('read gone', 'READ_FAILED');
      },
      insert: async (_s, d) => d,
      markSynced: async () => ({ acked: [], ignored: [] }),
      bulkInsert: async () => {},
    };
    const q = new DurableOfflineQueue({ backend: failing });
    await expectStoreErrorCode(q.getPending(SCOPE_A), 'READ_FAILED');
  });

  it('ack-path write failure preserves the pending row for retry', async () => {
    const shared = makeMapStorage();
    const q1 = new DurableOfflineQueue({ backend: new LocalStorageOfflineBackend(shared) });
    await q1.enqueue(cashInput('op-ack-fail'), SCOPE_A);
    const quota: StorageLike = {
      getItem: (k) => shared.getItem(k),
      setItem: () => { throw quotaError(); },
      removeItem: (k) => shared.removeItem(k),
    };
    const q2 = new DurableOfflineQueue({ backend: new LocalStorageOfflineBackend(quota) });
    await expectStoreErrorCode(q2.markSynced(SCOPE_A, ['op-ack-fail']), 'QUOTA_EXCEEDED');
    const pending = await q1.getPending(SCOPE_A);
    expect(pending.map((d) => d.id)).toContain('op-ack-fail');
  });
});

// ---------- A02/A04: restart durability ----------

describe('durable queue restart recovery (A02/A04)', () => {
  it('localStorage partition survives a simulated restart with identical rows', async () => {
    const storage = makeMapStorage();
    const q1 = new DurableOfflineQueue({ backend: new LocalStorageOfflineBackend(storage) });
    await q1.enqueue(cashInput('op-restart-1'), SCOPE_A);
    await q1.enqueue(lineInput('op-restart-2'), SCOPE_A);
    // Simulated restart: brand-new queue + backend over the same bytes.
    const q2 = new DurableOfflineQueue({ backend: new LocalStorageOfflineBackend(storage) });
    const pending = await q2.getPending(SCOPE_A);
    expect(pending.map((d) => d.id).sort()).toEqual(['op-restart-1', 'op-restart-2']);
    expect(pending.find((d) => d.id === 'op-restart-1')?.payload).toEqual({
      amount: 4950,
      method: 'cash',
      tip_amount: 500,
    });
  });

  it('restart preserves synced flags as financial evidence', async () => {
    const storage = makeMapStorage();
    const q1 = new DurableOfflineQueue({ backend: new LocalStorageOfflineBackend(storage) });
    await q1.enqueue(cashInput('op-ev-1'), SCOPE_A);
    await q1.enqueue(cashInput('op-ev-2'), SCOPE_A);
    await q1.markSynced(SCOPE_A, ['op-ev-1']);
    const q2 = new DurableOfflineQueue({ backend: new LocalStorageOfflineBackend(storage) });
    const all = await q2.getAll(SCOPE_A);
    expect(all.find((d) => d.id === 'op-ev-1')?.synced).toBe(true);
    expect(all.find((d) => d.id === 'op-ev-2')?.synced).toBe(false);
  });

  it('memory backend is explicitly non-durable across instances', async () => {
    const q1 = new DurableOfflineQueue({ backend: new MemoryOfflineBackend() });
    await q1.enqueue(lineInput('op-mem-1'), SCOPE_A);
    const q2 = new DurableOfflineQueue({ backend: new MemoryOfflineBackend() });
    expect(await q2.getPending(SCOPE_A)).toEqual([]);
  });
});

// ---------- I11: tenant/device partitioning ----------

describe('durable queue tenant/device partitioning (I11)', () => {
  it('same tenant on different devices is isolated', async () => {
    const backend = new MemoryOfflineBackend();
    const q = new DurableOfflineQueue({ backend });
    await q.enqueue(lineInput('op-dev-1', SCOPE_A), SCOPE_A);
    await q.enqueue(lineInput('op-dev-2', SCOPE_A2), SCOPE_A2);
    expect((await q.getPending(SCOPE_A)).map((d) => d.id)).toEqual(['op-dev-1']);
    expect((await q.getPending(SCOPE_A2)).map((d) => d.id)).toEqual(['op-dev-2']);
  });

  it('different tenants are isolated', async () => {
    const backend = new MemoryOfflineBackend();
    const q = new DurableOfflineQueue({ backend });
    const bInput: EnqueueDurableInput = {
      ...lineInput('op-tenant-b', SCOPE_B),
      tenant_id: SCOPE_B.tenantId,
      device_id: SCOPE_B.deviceId,
    };
    await q.enqueue(lineInput('op-tenant-a'), SCOPE_A);
    await q.enqueue(bInput, SCOPE_B);
    expect((await q.getPending(SCOPE_A)).map((d) => d.id)).toEqual(['op-tenant-a']);
    expect((await q.getPending(SCOPE_B)).map((d) => d.id)).toEqual(['op-tenant-b']);
  });

  it('markSynced ignores cross-scope IDs without creating rows', async () => {
    const q = new DurableOfflineQueue({ backend: new MemoryOfflineBackend() });
    await q.enqueue(lineInput('op-xscope-1'), SCOPE_A);
    const result = await q.markSynced(SCOPE_B, ['op-xscope-1']);
    expect(result.acked).toEqual([]);
    expect(result.ignored).toEqual(['op-xscope-1']);
    expect(await q.getAll(SCOPE_B)).toEqual([]);
    expect((await q.getPending(SCOPE_A)).map((d) => d.id)).toEqual(['op-xscope-1']);
  });

  it('partition keys differ per scope', () => {
    const a = durablePartitionKey(SCOPE_A);
    const a2 = durablePartitionKey(SCOPE_A2);
    const b = durablePartitionKey(SCOPE_B);
    expect(a === a2).toBe(false);
    expect(a === b).toBe(false);
    expect(a2 === b).toBe(false);
  });

  it('localStorage backend keeps one partition per device', async () => {
    const storage = makeMapStorage();
    const q = new DurableOfflineQueue({ backend: new LocalStorageOfflineBackend(storage) });
    await q.enqueue(lineInput('op-part-1', SCOPE_A), SCOPE_A);
    await q.enqueue(lineInput('op-part-2', SCOPE_A2), SCOPE_A2);
    expect(storage.map.size).toBe(2);
    expect((await q.getPending(SCOPE_A)).map((d) => d.id)).toEqual(['op-part-1']);
    expect((await q.getPending(SCOPE_A2)).map((d) => d.id)).toEqual(['op-part-2']);
  });
});

// ---------- I03/A03: stable operation IDs ----------

describe('durable queue stable operation IDs (I03/A03)', () => {
  it('same ID with same payload is idempotent, never duplicated', async () => {
    const q = new DurableOfflineQueue({ backend: new MemoryOfflineBackend() });
    const first = await q.enqueue(lineInput('op-stable-1'), SCOPE_A);
    const second = await q.enqueue(lineInput('op-stable-1'), SCOPE_A);
    expect(second.id).toBe(first.id);
    expect(await q.getAll(SCOPE_A)).toHaveLength(1);
  });

  it('same ID with different payload conflicts and preserves the original', async () => {
    const q = new DurableOfflineQueue({ backend: new MemoryOfflineBackend() });
    await q.enqueue(lineInput('op-conflict-1'), SCOPE_A);
    const altered = {
      ...lineInput('op-conflict-1'),
      payload: { menu_item_id: 'item-1', quantity: 99, line_total: 99999 },
    };
    await expectStoreErrorCode(q.enqueue(altered, SCOPE_A), 'CONFLICT');
    const all = await q.getAll(SCOPE_A);
    expect(all).toHaveLength(1);
    expect(all[0]?.payload.quantity).toBe(1);
  });

  it('same ID on another device is an independent scoped row', async () => {
    const q = new DurableOfflineQueue({ backend: new MemoryOfflineBackend() });
    await q.enqueue(lineInput('op-shared-id', SCOPE_A), SCOPE_A);
    const other = {
      ...lineInput('op-shared-id', SCOPE_A2),
      payload: { menu_item_id: 'item-9', quantity: 2, line_total: 3000 },
    };
    await q.enqueue(other, SCOPE_A2);
    expect(await q.getAll(SCOPE_A)).toHaveLength(1);
    expect(await q.getAll(SCOPE_A2)).toHaveLength(1);
  });
});

// ---------- I03: acknowledge only submitted known IDs ----------

describe('durable queue acknowledgements (I03)', () => {
  it('flush acks only submitted known IDs and ignores foreign IDs', async () => {
    const q = new DurableOfflineQueue({ backend: new MemoryOfflineBackend() });
    await q.enqueue(lineInput('op-ack-1'), SCOPE_A);
    await q.enqueue(lineInput('op-ack-2'), SCOPE_A);
    const { fetch } = captureFetch({ data: { confirmedIds: ['op-ack-1', 'delta-foreign-9'] } });
    const result = await q.flush(SCOPE_A, 'http://pos-sync.test', {}, fetch);
    expect(result.submitted.sort()).toEqual(['op-ack-1', 'op-ack-2']);
    expect(result.acked).toEqual(['op-ack-1']);
    expect(result.ignored).toContain('delta-foreign-9');
    expect((await q.getPending(SCOPE_A)).map((d) => d.id)).toEqual(['op-ack-2']);
    // Both rows preserved; only the submitted known ID is marked synced.
    expect(await q.getAll(SCOPE_A)).toHaveLength(2);
  });

  it('flush never wipes on a bare 200 without confirmedIds', async () => {
    const q = new DurableOfflineQueue({ backend: new MemoryOfflineBackend() });
    await q.enqueue(lineInput('op-bare-1'), SCOPE_A);
    const { fetch } = captureFetch({ status: 'success', synced: 1 });
    const result = await q.flush(SCOPE_A, 'http://pos-sync.test', {}, fetch);
    expect(result.acked).toEqual([]);
    expect((await q.getPending(SCOPE_A)).map((d) => d.id)).toEqual(['op-bare-1']);
  });

  it('flush preserves the queue on a non-ok response', async () => {
    const q = new DurableOfflineQueue({ backend: new MemoryOfflineBackend() });
    await q.enqueue(lineInput('op-500-1'), SCOPE_A);
    const { fetch } = captureFetch({ error: 'boom' }, false);
    const result = await q.flush(SCOPE_A, 'http://pos-sync.test', {}, fetch);
    expect(result.submitted).toEqual(['op-500-1']);
    expect(result.acked).toEqual([]);
    expect((await q.getPending(SCOPE_A)).map((d) => d.id)).toEqual(['op-500-1']);
  });

  it('flush preserves the queue when the network throws', async () => {
    const q = new DurableOfflineQueue({ backend: new MemoryOfflineBackend() });
    await q.enqueue(lineInput('op-net-1'), SCOPE_A);
    const throwing = (async () => {
      throw new TypeError('network down');
    }) as unknown as typeof fetch;
    const result = await q.flush(SCOPE_A, 'http://pos-sync.test', {}, throwing);
    expect(result.submitted).toEqual(['op-net-1']);
    expect(result.acked).toEqual([]);
    expect((await q.getPending(SCOPE_A)).map((d) => d.id)).toEqual(['op-net-1']);
  });

  it('markSynced with unknown IDs never creates rows', async () => {
    const q = new DurableOfflineQueue({ backend: new MemoryOfflineBackend() });
    const result = await q.markSynced(SCOPE_A, ['delta-nope-1', 'delta-nope-2']);
    expect(result.acked).toEqual([]);
    expect(result.ignored).toEqual(['delta-nope-1', 'delta-nope-2']);
    expect(await q.getAll(SCOPE_A)).toEqual([]);
  });

  it('flush never submits card-like rows even when the backend holds them', async () => {
    const backend = new MemoryOfflineBackend();
    const q = new DurableOfflineQueue({ backend });
    const cardRow: DurableOfflineDelta = {
      id: 'op-seeded-card',
      tenant_id: SCOPE_A.tenantId,
      device_id: SCOPE_A.deviceId,
      order_id: 'order-card',
      action: 'finalize_payment',
      payload: { amount: 2000, method: 'card' },
      timestamp: FIXED_TS,
      synced: false,
    };
    await backend.bulkInsert(SCOPE_A, [cardRow]);
    const { fetch, seen, calls } = captureFetch({ data: { confirmedIds: ['op-seeded-card'] } });
    const result = await q.flush(SCOPE_A, 'http://pos-sync.test', {}, fetch);
    expect(calls.length).toBe(0);
    expect(seen).toEqual([]);
    expect(result.submitted).toEqual([]);
    expect(result.skippedCard).toEqual(['op-seeded-card']);
    expect(result.acked).toEqual([]);
    expect((await q.getPending(SCOPE_A)).map((d) => d.id)).toEqual(['op-seeded-card']);
  });
});

// ---------- I05/A07: never replay queued cards ----------

describe('durable queue card containment (I05/A07)', () => {
  it('enqueue rejects card-like finalize_payment before any write', async () => {
    for (const method of ['card', 'tap', 'scan', 'credit']) {
      const q = new DurableOfflineQueue({ backend: new MemoryOfflineBackend() });
      await expectStoreErrorCode(
        q.enqueue(cashInput(`op-card-${method}`, { method }), SCOPE_A),
        'CARD_OFFLINE_REJECTED'
      );
      expect(await q.getAll(SCOPE_A)).toEqual([]);
    }
  });

  it('enqueue finalize_payment without an explicit method is rejected', async () => {
    const q = new DurableOfflineQueue({ backend: new MemoryOfflineBackend() });
    const input = cashInput('op-nomethod-1');
    delete (input.payload as Record<string, any>).method;
    await expectStoreErrorCode(q.enqueue(input, SCOPE_A), 'VALIDATION_FAILED');
    expect(await q.getAll(SCOPE_A)).toEqual([]);
  });

  it('enqueue rejects card-data fields outright', async () => {
    for (const [suffix, extra] of [
      ['pan', { pan: '4111111111111111' }],
      ['cvv', { cvv: '123' }],
    ] as const) {
      const q = new DurableOfflineQueue({ backend: new MemoryOfflineBackend() });
      await expectStoreErrorCode(
        q.enqueue(cashInput(`op-carddata-${suffix}`, extra), SCOPE_A),
        'VALIDATION_FAILED'
      );
      expect(await q.getAll(SCOPE_A)).toEqual([]);
    }
  });

  it('legacy card rows migrate for audit but are never submitted', async () => {
    const legacy = makeMapStorage({
      [LEGACY_OFFLINE_QUEUE_KEY]: JSON.stringify([
        {
          id: 'legacy-cash-1',
          tenant_id: SCOPE_A.tenantId,
          order_id: 'order-legacy',
          action: 'finalize_payment',
          payload: { amount: 1000, method: 'cash' },
          timestamp: FIXED_TS,
          synced: false,
        },
        {
          id: 'legacy-card-1',
          tenant_id: SCOPE_A.tenantId,
          order_id: 'order-legacy',
          action: 'finalize_payment',
          payload: { amount: 2000, method: 'card' },
          timestamp: FIXED_TS,
          synced: false,
        },
      ]),
    });
    const q = new DurableOfflineQueue({ backend: new MemoryOfflineBackend() });
    const migrated = await q.migrateLegacy(SCOPE_A, { legacyStorage: legacy });
    expect(migrated.migrated.sort()).toEqual(['legacy-card-1', 'legacy-cash-1']);
    const { fetch, seen } = captureFetch({ data: { confirmedIds: ['legacy-cash-1', 'legacy-card-1'] } });
    const result = await q.flush(SCOPE_A, 'http://pos-sync.test', {}, fetch);
    expect(seen).toHaveLength(1);
    expect(seen[0].deltas.map((d: any) => d.id)).toEqual(['legacy-cash-1']);
    expect(result.skippedCard).toEqual(['legacy-card-1']);
    expect(result.acked).toEqual(['legacy-cash-1']);
    expect(result.ignored).toContain('legacy-card-1');
    const all = await q.getAll(SCOPE_A);
    expect(all.find((d) => d.id === 'legacy-card-1')?.synced).toBe(false);
  });

  it('isSubmittableDelta gates replay by method', () => {
    expect(isSubmittableDelta({ action: 'finalize_payment', payload: { method: 'cash' } })).toBe(true);
    expect(isSubmittableDelta({ action: 'finalize_payment', payload: { method: 'COMP' } })).toBe(true);
    expect(isSubmittableDelta({ action: 'finalize_payment', payload: { method: 'card' } })).toBe(false);
    expect(isSubmittableDelta({ action: 'finalize_payment', payload: {} })).toBe(false);
    expect(isSubmittableDelta({ action: 'add_line_item', payload: {} })).toBe(true);
  });
});

// ---------- I09: financial evidence preserved ----------

describe('durable queue evidence preservation (I09)', () => {
  it('markSynced marks synced and never deletes rows', async () => {
    const q = new DurableOfflineQueue({ backend: new MemoryOfflineBackend() });
    await q.enqueue(cashInput('op-fin-1'), SCOPE_A);
    await q.enqueue(cashInput('op-fin-2'), SCOPE_A);
    await q.markSynced(SCOPE_A, ['op-fin-1', 'op-fin-2']);
    const all = await q.getAll(SCOPE_A);
    expect(all).toHaveLength(2);
    expect(all.every((d) => d.synced)).toBe(true);
  });

  it('bulkInsert is idempotent and preserves existing rows', async () => {
    const backend = new MemoryOfflineBackend();
    const row: DurableOfflineDelta = {
      id: 'op-bulk-1',
      tenant_id: SCOPE_A.tenantId,
      device_id: SCOPE_A.deviceId,
      order_id: 'order-1',
      action: 'add_line_item',
      payload: { menu_item_id: 'item-1' },
      timestamp: FIXED_TS,
      synced: false,
    };
    await backend.bulkInsert(SCOPE_A, [row]);
    await backend.bulkInsert(SCOPE_A, [row]);
    expect(await backend.list(SCOPE_A)).toHaveLength(1);
  });
});

// ---------- safe legacy migration ----------

describe('durable queue legacy migration', () => {
  function legacyRow(id: string, overrides: Record<string, any> = {}) {
    return {
      id,
      tenant_id: SCOPE_A.tenantId,
      order_id: `order-${id}`,
      action: 'add_line_item',
      payload: { menu_item_id: 'item-1', quantity: 1 },
      timestamp: FIXED_TS,
      synced: false,
      ...overrides,
    };
  }

  it('migrates in-scope rows and removes only migrated rows from legacy', async () => {
    const otherTenant = legacyRow('legacy-other-tenant', { tenant_id: SCOPE_B.tenantId });
    const legacy = makeMapStorage({
      [LEGACY_OFFLINE_QUEUE_KEY]: JSON.stringify([
        legacyRow('legacy-a-1'),
        legacyRow('legacy-a-2'),
        otherTenant,
      ]),
    });
    const q = new DurableOfflineQueue({ backend: new MemoryOfflineBackend() });
    const result = await q.migrateLegacy(SCOPE_A, { legacyStorage: legacy });
    expect(result.migrated.sort()).toEqual(['legacy-a-1', 'legacy-a-2']);
    expect(result.remainingLegacy).toBe(1);
    expect(result.skippedOtherTenant).toBe(1);
    expect((await q.getAll(SCOPE_A)).map((d) => d.id).sort()).toEqual(['legacy-a-1', 'legacy-a-2']);
    expect(JSON.parse(legacy.getItem(LEGACY_OFFLINE_QUEUE_KEY) as string)).toEqual([otherTenant]);
  });

  it('other-device rows stay in legacy for that device', async () => {
    const legacy = makeMapStorage({
      [LEGACY_OFFLINE_QUEUE_KEY]: JSON.stringify([
        legacyRow('legacy-dev2-1', { device_id: SCOPE_A2.deviceId }),
      ]),
    });
    const q = new DurableOfflineQueue({ backend: new MemoryOfflineBackend() });
    const result = await q.migrateLegacy(SCOPE_A, { legacyStorage: legacy });
    expect(result.migrated).toEqual([]);
    expect(result.remainingLegacy).toBe(1);
    expect(await q.getAll(SCOPE_A)).toEqual([]);
    expect(JSON.parse(legacy.getItem(LEGACY_OFFLINE_QUEUE_KEY) as string)).toHaveLength(1);
  });

  it('corrupt legacy JSON aborts with the original preserved', async () => {
    const raw = '{not-json';
    const legacy = makeMapStorage({ [LEGACY_OFFLINE_QUEUE_KEY]: raw });
    const q = new DurableOfflineQueue({ backend: new MemoryOfflineBackend() });
    const err = await expectStoreErrorCode(
      q.migrateLegacy(SCOPE_A, { legacyStorage: legacy }),
      'CORRUPTED'
    );
    expect(err.raw).toBe(raw);
    expect(legacy.getItem(LEGACY_OFFLINE_QUEUE_KEY)).toBe(raw);
    expect(await q.getAll(SCOPE_A)).toEqual([]);
  });

  it('an invalid legacy row aborts everything with the original preserved', async () => {
    const rows = [legacyRow('legacy-good-1'), legacyRow('legacy-bad-1', { order_id: '' })];
    const raw = JSON.stringify(rows);
    const legacy = makeMapStorage({ [LEGACY_OFFLINE_QUEUE_KEY]: raw });
    const q = new DurableOfflineQueue({ backend: new MemoryOfflineBackend() });
    await expectStoreErrorCode(q.migrateLegacy(SCOPE_A, { legacyStorage: legacy }), 'CORRUPTED');
    expect(legacy.getItem(LEGACY_OFFLINE_QUEUE_KEY)).toBe(raw);
    expect(await q.getAll(SCOPE_A)).toEqual([]);
  });

  it('a non-object legacy payload aborts migration instead of dropping data', async () => {
    const rows = [legacyRow('legacy-badpayload-1', { payload: 'oops' })];
    const raw = JSON.stringify(rows);
    const legacy = makeMapStorage({ [LEGACY_OFFLINE_QUEUE_KEY]: raw });
    const q = new DurableOfflineQueue({ backend: new MemoryOfflineBackend() });
    await expectStoreErrorCode(q.migrateLegacy(SCOPE_A, { legacyStorage: legacy }), 'CORRUPTED');
    expect(legacy.getItem(LEGACY_OFFLINE_QUEUE_KEY)).toBe(raw);
    expect(await q.getAll(SCOPE_A)).toEqual([]);
  });

  it('durable commit failure leaves legacy untouched', async () => {
    const rows = [legacyRow('legacy-commit-1')];
    const raw = JSON.stringify(rows);
    const legacy = makeMapStorage({ [LEGACY_OFFLINE_QUEUE_KEY]: raw });
    const inner = new MemoryOfflineBackend();
    const failing: OfflineBackend = {
      backendName: 'failing-bulk',
      list: (s) => inner.list(s),
      insert: (s, d) => inner.insert(s, d),
      markSynced: (s, ids) => inner.markSynced(s, ids),
      bulkInsert: async () => {
        throw new OfflineStoreError('commit gone', 'WRITE_FAILED');
      },
    };
    const q = new DurableOfflineQueue({ backend: failing });
    await expectStoreErrorCode(q.migrateLegacy(SCOPE_A, { legacyStorage: legacy }), 'WRITE_FAILED');
    expect(legacy.getItem(LEGACY_OFFLINE_QUEUE_KEY)).toBe(raw);
  });

  it('migration retry after success migrates nothing new', async () => {
    const legacy = makeMapStorage({
      [LEGACY_OFFLINE_QUEUE_KEY]: JSON.stringify([legacyRow('legacy-retry-1')]),
    });
    const q = new DurableOfflineQueue({ backend: new MemoryOfflineBackend() });
    const first = await q.migrateLegacy(SCOPE_A, { legacyStorage: legacy });
    expect(first.migrated).toEqual(['legacy-retry-1']);
    const second = await q.migrateLegacy(SCOPE_A, { legacyStorage: legacy });
    expect(second.migrated).toEqual([]);
    expect((await q.getAll(SCOPE_A)).map((d) => d.id)).toEqual(['legacy-retry-1']);
  });
});

// ---------- A02: corruption handling ----------

describe('durable queue corruption handling (A02)', () => {
  it('malformed partition bytes throw CORRUPTED with the raw preserved', async () => {
    const raw = '{oops';
    const storage = makeMapStorage({ [durablePartitionKey(SCOPE_A)]: raw });
    const q = new DurableOfflineQueue({ backend: new LocalStorageOfflineBackend(storage) });
    const err = await expectStoreErrorCode(q.getPending(SCOPE_A), 'CORRUPTED');
    expect(err.raw).toBe(raw);
    expect(storage.getItem(durablePartitionKey(SCOPE_A))).toBe(raw);
  });

  it('an invalid row inside a partition throws and preserves the original', async () => {
    const raw = JSON.stringify([{ id: 'bad-row', tenant_id: SCOPE_A.tenantId }]);
    const storage = makeMapStorage({ [durablePartitionKey(SCOPE_A)]: raw });
    const q = new DurableOfflineQueue({ backend: new LocalStorageOfflineBackend(storage) });
    await expectStoreErrorCode(q.getPending(SCOPE_A), 'CORRUPTED');
    expect(storage.getItem(durablePartitionKey(SCOPE_A))).toBe(raw);
  });
});

// ---------- I04: money + method validation ----------

describe('durable queue money validation (I04)', () => {
  it('finalize_payment money fields must be integer cents >= 0', async () => {
    for (const [suffix, extra] of [
      ['float', { amount: 49.5 }],
      ['negative', { amount: -100 }],
      ['string-tip', { tip_amount: 'large' }],
      ['unsafe', { amount: Number.MAX_SAFE_INTEGER + 1 }],
    ] as const) {
      const q = new DurableOfflineQueue({ backend: new MemoryOfflineBackend() });
      await expectStoreErrorCode(
        q.enqueue(cashInput(`op-money-${suffix}`, extra as Record<string, any>), SCOPE_A),
        'VALIDATION_FAILED'
      );
      expect(await q.getAll(SCOPE_A)).toEqual([]);
    }
  });

  it('cash/comp methods are accepted case-insensitively', async () => {
    for (const method of ['cash', 'Cash', 'CASH', 'comp', 'Comp']) {
      const q = new DurableOfflineQueue({ backend: new MemoryOfflineBackend() });
      const delta = await q.enqueue(cashInput(`op-method-${method}`, { method }), SCOPE_A);
      expect(delta.payload.method).toBe(method);
    }
  });
});

// ---------- I11: scope validation ----------

describe('durable queue scope validation (I11)', () => {
  it('empty tenant/device scope is rejected', async () => {
    const q = new DurableOfflineQueue({ backend: new MemoryOfflineBackend() });
    await expectStoreErrorCode(
      q.enqueue(lineInput('op-scope-1'), { tenantId: '', deviceId: 'device-1' }),
      'VALIDATION_FAILED'
    );
    await expectStoreErrorCode(
      q.enqueue(lineInput('op-scope-2'), { tenantId: 'tenant-a', deviceId: '' }),
      'VALIDATION_FAILED'
    );
  });

  it('input tenant/device must match the scope', async () => {
    const q = new DurableOfflineQueue({ backend: new MemoryOfflineBackend() });
    const wrongTenant = { ...lineInput('op-mismatch-1'), tenant_id: 'tenant-evil' };
    await expectStoreErrorCode(q.enqueue(wrongTenant, SCOPE_A), 'VALIDATION_FAILED');
    const wrongDevice = { ...lineInput('op-mismatch-2'), device_id: 'device-evil' };
    await expectStoreErrorCode(q.enqueue(wrongDevice, SCOPE_A), 'VALIDATION_FAILED');
    expect(await q.getAll(SCOPE_A)).toEqual([]);
  });
});

// ---------- I03/I08: concurrency ----------

describe('durable queue concurrency', () => {
  it('concurrent enqueues lose no writes', async () => {
    const q = new DurableOfflineQueue({ backend: new MemoryOfflineBackend() });
    await Promise.all(
      Array.from({ length: 20 }, (_, i) => q.enqueue(lineInput(`op-race-${i}`), SCOPE_A))
    );
    expect(await q.getAll(SCOPE_A)).toHaveLength(20);
  });

  it('an enqueue during flush is preserved and never falsely acked', async () => {
    const q = new DurableOfflineQueue({ backend: new MemoryOfflineBackend() });
    await q.enqueue(lineInput('op-snap-1'), SCOPE_A);
    const fetchFn = (async () => {
      // New work lands while the network request is in flight.
      await q.enqueue(lineInput('op-midflight-1'), SCOPE_A);
      return {
        ok: true,
        json: async () => ({ data: { confirmedIds: ['op-snap-1', 'op-midflight-1'] } }),
      };
    }) as unknown as typeof fetch;
    const result = await q.flush(SCOPE_A, 'http://pos-sync.test', {}, fetchFn);
    expect(result.submitted).toEqual(['op-snap-1']);
    expect(result.acked).toEqual(['op-snap-1']);
    expect(result.ignored).toContain('op-midflight-1');
    expect((await q.getPending(SCOPE_A)).map((d) => d.id)).toEqual(['op-midflight-1']);
  });
});

// ---------- backend selection + documented browser limits ----------

describe('durable queue backend selection', () => {
  it('IndexedDB backend fails closed when IndexedDB is absent', async () => {
    // Node has no IndexedDB; the browser path needs a real-device harness.
    expect(indexedDBAvailable()).toBe(false);
    const q = new DurableOfflineQueue({ backend: new IndexedDBOfflineBackend() });
    await expectStoreErrorCode(q.getPending(SCOPE_A), 'READ_FAILED');
  });

  it('auto backend falls back without IndexedDB or globals', () => {
    const g = globalThis as Record<string, unknown>;
    const savedIDB = g['indexedDB'];
    const savedLS = g['localStorage'];
    const hadIDB = 'indexedDB' in g;
    const hadLS = 'localStorage' in g;
    delete g['indexedDB'];
    delete g['localStorage'];
    try {
      expect(createAutoOfflineBackend().backendName).toBe('memory');
      expect(createAutoOfflineBackend(makeMapStorage()).backendName).toBe(
        'localStorage-partitioned'
      );
    } finally {
      if (hadIDB) g['indexedDB'] = savedIDB;
      else delete g['indexedDB'];
      if (hadLS) g['localStorage'] = savedLS;
      else delete g['localStorage'];
    }
  });

  it('device ID is stable and persisted', () => {
    const storage = makeMapStorage();
    const first = getPosDeviceId(storage);
    const second = getPosDeviceId(storage);
    expect(first).toBe(second);
    expect(first).toMatch(/^terminal-[0-9a-f-]{36}$/);
  });

  it('device ID surfaces storage failure instead of inventing identity', () => {
    const readFailing: Pick<Storage, 'getItem' | 'setItem'> = {
      getItem: () => {
        throw new Error('read gone');
      },
      setItem: () => {},
    };
    let readCode = '';
    try {
      getPosDeviceId(readFailing);
    } catch (err) {
      readCode = (err as OfflineStoreError).code;
    }
    expect(readCode).toBe('READ_FAILED');
    const writeFailing: Pick<Storage, 'getItem' | 'setItem'> = {
      getItem: () => null,
      setItem: () => {
        throw quotaError();
      },
    };
    let writeCode = '';
    try {
      getPosDeviceId(writeFailing);
    } catch (err) {
      writeCode = (err as OfflineStoreError).code;
    }
    expect(writeCode).toBe('QUOTA_EXCEEDED');
  });

  it('confirmed-ID extraction reads nested and direct shapes only', () => {
    expect(extractConfirmedIds({ data: { confirmedIds: ['a'] } })).toEqual(['a']);
    expect(extractConfirmedIds({ confirmedIds: ['b'] })).toEqual(['b']);
    expect(extractConfirmedIds({ data: {} })).toEqual([]);
    expect(extractConfirmedIds({ data: { confirmedIds: 'nope' } })).toEqual([]);
    expect(extractConfirmedIds({ data: { confirmedIds: ['ok', 7, ''] } })).toEqual(['ok']);
    expect(extractConfirmedIds(null)).toEqual([]);
  });

  it('generated operation IDs are stable delta UUIDs', () => {
    expect(generateOpId()).toMatch(
      /^delta-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });
});
