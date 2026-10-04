// ============================================================
// R4 follow-up — Offline POS command paths (create/discount)
// Scope: packages/shared/src/offline-pos-commands.ts via injected
// fakes, plus two real-queue integration checks.
//
// What this suite proves: durable enqueue runs BEFORE any mock
// mutation/success; stable operation/order IDs are shared by queue
// and mock (never regenerated between them); persistence failures
// throw explicitly with the mock untouched; and any received HTTP
// error response (401/403/400/422/409/404/500) throws with no queue
// write and no mock change — server denials are never disguised as
// network offline. Only a fetch throw reaches the offline path.
//
// NOT proven here (honest boundary): real browser IndexedDB/quota
// behavior (see offline-durability.test.ts limits + R8 harness);
// React hook rendering (hooks are thin wrappers over these
// executors); server replay outcomes (Codex-owned pos-sync).
// ============================================================

import { describe, it, expect } from 'bun:test';
import {
  runCreateOrderCommand,
  runApplyDiscountCommand,
  buildCreateOrderPayload,
  buildApplyDiscountPayload,
  generateOfflineOrderId,
  isNoFallbackStatus,
  CREATE_ORDER_CONTRACT,
  APPLY_DISCOUNT_CONTRACT,
  VOID_LINE_ITEM_CONTRACT,
  OfflinePosCommandError,
  OfflineStoreError,
  DurableOfflineQueue,
  MemoryOfflineBackend,
  type OfflineCommandDeps,
  type OfflineScope,
  type EnqueueDurableInput,
  type DurableOfflineDelta,
} from '@culinaryos/shared';

// ---------- helpers ----------

const SCOPE: OfflineScope = { tenantId: 'tenant-a', deviceId: 'device-1' };
const FIXED_TS = '2026-10-01T12:00:00.000Z';

function jsonResponse(ok: boolean, status: number, body: unknown): Response {
  return { ok, status, json: async () => body } as unknown as Response;
}

function throwingFetch(seen: any[]): typeof fetch {
  return (async (url: string, init: any) => {
    seen.push({ url, init });
    throw new TypeError('network down');
  }) as unknown as typeof fetch;
}

function respondingFetch(seen: any[], res: Response): typeof fetch {
  return (async (url: string, init: any) => {
    seen.push({ url, init, body: JSON.parse(init.body) });
    return res;
  }) as unknown as typeof fetch;
}

interface Harness {
  deps: OfflineCommandDeps;
  queueCalls: { input: EnqueueDurableInput; scope: OfflineScope }[];
  saves: any[][];
  events: string[];
  getRows: () => any[];
}

function makeHarness(opts: {
  fetchImpl: typeof fetch;
  queueImpl?: (input: EnqueueDurableInput, scope: OfflineScope) => Promise<DurableOfflineDelta>;
  initialOrders?: any[];
  resolveScope?: () => OfflineScope;
  generateOrderId?: () => string;
  generateOperationId?: () => string;
  nowIso?: () => string;
}): Harness {
  const queueCalls: Harness['queueCalls'] = [];
  const saves: any[][] = [];
  const events: string[] = [];
  let rows: any[] = (opts.initialOrders ?? []).map((o) => JSON.parse(JSON.stringify(o)));
  const inner = opts.queueImpl ?? (async (input: EnqueueDurableInput, scope: OfflineScope) => ({
    id: input.id ?? 'delta-default',
    tenant_id: scope.tenantId,
    device_id: scope.deviceId,
    order_id: input.order_id,
    action: input.action,
    payload: input.payload,
    timestamp: input.timestamp ?? FIXED_TS,
    synced: false,
  }));
  const deps: OfflineCommandDeps = {
    fetchImpl: opts.fetchImpl,
    apiBase: 'http://pos.test',
    headers: {},
    queue: {
      enqueue: async (input, scope) => {
        events.push('enqueue');
        queueCalls.push({ input, scope });
        return inner(input, scope);
      },
    },
    resolveScope: opts.resolveScope ?? (() => ({ ...SCOPE })),
    store: {
      readMockOrders: () => rows,
      saveMockOrders: (next: any[]) => {
        events.push('save');
        saves.push(JSON.parse(JSON.stringify(next)));
        rows = next;
      },
    },
    generateOrderId: opts.generateOrderId ?? (() => 'o-test-order-1'),
    generateOperationId: opts.generateOperationId ?? (() => 'delta-test-op-1'),
    nowIso: opts.nowIso ?? (() => FIXED_TS),
  };
  return { deps, queueCalls, saves, events, getRows: () => rows };
}

function snapshot(rows: any[]): string {
  return JSON.stringify(rows);
}

async function expectCommandError(
  promise: Promise<unknown>,
  code: string,
  messagePart: string
): Promise<OfflinePosCommandError> {
  try {
    await promise;
  } catch (err) {
    expect(err).toBeInstanceOf(OfflinePosCommandError);
    expect((err as OfflinePosCommandError).code).toBe(code);
    expect((err as Error).message).toContain(messagePart);
    return err as OfflinePosCommandError;
  }
  throw new Error(`expected OfflinePosCommandError ${code} but the call succeeded`);
}

async function expectServerDenial(promise: Promise<unknown>, messagePart: string): Promise<Error> {
  try {
    await promise;
  } catch (err) {
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toContain(messagePart);
    return err as Error;
  }
  throw new Error('expected server denial throw but the call succeeded');
}

// ---------- create_order: online ----------

describe('offline-pos-commands create online', () => {
  it('online success returns server data with no queue or mock write', async () => {
    const seen: any[] = [];
    const serverOrder = { id: 'o-server-9', status: 'open' };
    const h = makeHarness({
      fetchImpl: respondingFetch(seen, jsonResponse(true, 201, { data: serverOrder })),
    });
    const before = snapshot(h.getRows());
    const result = await runCreateOrderCommand(h.deps, {
      tenantId: SCOPE.tenantId,
      table_number: '12',
      cover_count: 4,
      server_name: 'Kim',
    });
    expect(result).toEqual(serverOrder);
    expect(seen).toHaveLength(1);
    expect(seen[0].url).toBe('http://pos.test/v1/orders');
    expect(seen[0].body).toEqual({ id: 'o-test-order-1', tableNumber: '12', coverCount: 4, serverName: 'Kim' });
    expect(seen[0].init?.headers?.['Idempotency-Key']).toBe('delta-test-op-1');
    expect(h.queueCalls).toHaveLength(0);
    expect(h.saves).toHaveLength(0);
    expect(snapshot(h.getRows())).toBe(before);
  });

  it('online request applies table/cover/server defaults', async () => {
    const seen: any[] = [];
    const h = makeHarness({
      fetchImpl: respondingFetch(seen, jsonResponse(true, 201, { data: { id: 'o-1' } })),
    });
    await runCreateOrderCommand(h.deps, { tenantId: SCOPE.tenantId });
    expect(seen[0].body).toEqual({ id: 'o-test-order-1', tableNumber: '1', coverCount: 1, serverName: 'Server' });
    expect(seen[0].init?.headers?.['Idempotency-Key']).toBe('delta-test-op-1');
    expect(h.queueCalls).toHaveLength(0);
    expect(h.saves).toHaveLength(0);
  });

  it('online ok without data returns the body and mints no mock row', async () => {
    const seen: any[] = [];
    const h = makeHarness({
      fetchImpl: respondingFetch(seen, jsonResponse(true, 200, { ok: true })),
    });
    const result = await runCreateOrderCommand(h.deps, { tenantId: SCOPE.tenantId });
    expect(result).toEqual({ ok: true });
    expect(h.queueCalls).toHaveLength(0);
    expect(h.saves).toHaveLength(0);
    expect(h.getRows()).toEqual([]);
  });
});

// ---------- create_order: server denials never fallback ----------

describe('offline-pos-commands create denials', () => {
  it('401/403 auth denials throw with no queue write and no mock row', async () => {
    for (const status of [401, 403]) {
      const seen: any[] = [];
      const h = makeHarness({
        fetchImpl: respondingFetch(
          seen,
          jsonResponse(false, status, { error: { message: `denied-${status}` } })
        ),
      });
      await expectServerDenial(
        runCreateOrderCommand(h.deps, { tenantId: SCOPE.tenantId }),
        `denied-${status}`
      );
      expect(h.queueCalls).toHaveLength(0);
      expect(h.saves).toHaveLength(0);
      expect(h.getRows()).toEqual([]);
    }
  });

  it('400/422 validation denials throw with no queue write and no mock row', async () => {
    for (const status of [400, 422]) {
      const h = makeHarness({
        fetchImpl: respondingFetch(
          [],
          jsonResponse(false, status, { error: { message: `invalid-${status}` } })
        ),
      });
      await expectServerDenial(
        runCreateOrderCommand(h.deps, { tenantId: SCOPE.tenantId }),
        `invalid-${status}`
      );
      expect(h.queueCalls).toHaveLength(0);
      expect(h.saves).toHaveLength(0);
      expect(h.getRows()).toEqual([]);
    }
  });

  it('404/409 denials throw with no queue write and no mock row', async () => {
    for (const status of [404, 409]) {
      const h = makeHarness({
        fetchImpl: respondingFetch(
          [],
          jsonResponse(false, status, { error: { message: `conflict-${status}` } })
        ),
      });
      await expectServerDenial(
        runCreateOrderCommand(h.deps, { tenantId: SCOPE.tenantId }),
        `conflict-${status}`
      );
      expect(h.queueCalls).toHaveLength(0);
      expect(h.saves).toHaveLength(0);
      expect(h.getRows()).toEqual([]);
    }
  });

  it('5xx responses throw with no offline fallback', async () => {
    const h = makeHarness({
      fetchImpl: respondingFetch([], jsonResponse(false, 503, { error: { message: 'downstream down' } })),
    });
    await expectServerDenial(
      runCreateOrderCommand(h.deps, { tenantId: SCOPE.tenantId }),
      'downstream down'
    );
    expect(h.queueCalls).toHaveLength(0);
    expect(h.saves).toHaveLength(0);
    expect(h.getRows()).toEqual([]);
  });
});

// ---------- create_order: offline durable-first ----------

describe('offline-pos-commands create offline', () => {
  it('fetch throw enqueues before the mock mutation with shared stable IDs', async () => {
    const seen: any[] = [];
    const h = makeHarness({ fetchImpl: throwingFetch(seen) });
    const order = await runCreateOrderCommand(h.deps, {
      tenantId: SCOPE.tenantId,
      table_number: '12',
      cover_count: 4,
      server_name: 'Kim',
    });
    expect(order.id).toBe('o-test-order-1');
    expect(order).toEqual({
      id: 'o-test-order-1',
      tenant_id: SCOPE.tenantId,
      status: 'open',
      table_number: '12',
      cover_count: 4,
      server_name: 'Kim',
      items: [],
      total: 0,
      created_at: FIXED_TS,
    });
    expect(h.events).toEqual(['enqueue', 'save']);
    expect(h.queueCalls).toHaveLength(1);
    const call = h.queueCalls[0]!;
    expect(call.input.id).toBe('delta-test-op-1');
    expect(call.input.order_id).toBe(order.id);
    expect(call.input.action).toBe('create_order');
    expect(call.input.tenant_id).toBe(SCOPE.tenantId);
    expect(call.scope).toEqual(SCOPE);
    expect(call.input.payload).toEqual({
      table_number: '12',
      tableNumber: '12',
      cover_count: 4,
      coverCount: 4,
      server_name: 'Kim',
      serverName: 'Kim',
      status: 'open',
    });
    expect(h.saves).toHaveLength(1);
    expect(h.getRows()).toHaveLength(1);
  });

  it('order/operation IDs are generated once, never regenerated between queue and mock', async () => {
    let orderCalls = 0;
    let opCalls = 0;
    const h = makeHarness({
      fetchImpl: throwingFetch([]),
      generateOrderId: () => `o-count-${++orderCalls}`,
      generateOperationId: () => `delta-count-${++opCalls}`,
    });
    const order = await runCreateOrderCommand(h.deps, { tenantId: SCOPE.tenantId });
    expect(orderCalls).toBe(1);
    expect(opCalls).toBe(1);
    expect(h.queueCalls[0]!.input.order_id).toBe(order.id);
    expect(h.queueCalls[0]!.input.id).toBe('delta-count-1');
    expect(order.id).toBe('o-count-1');
  });

  it('quota failure throws PERSISTENCE_FAILED with the mock untouched', async () => {
    const quota = new OfflineStoreError('storage quota exceeded', 'QUOTA_EXCEEDED');
    const h = makeHarness({
      fetchImpl: throwingFetch([]),
      queueImpl: async () => {
        throw quota;
      },
    });
    const err = await expectCommandError(
      runCreateOrderCommand(h.deps, { tenantId: SCOPE.tenantId }),
      'PERSISTENCE_FAILED',
      'Order could not be saved on this device'
    );
    expect((err.cause as OfflineStoreError).code).toBe('QUOTA_EXCEEDED');
    expect(h.queueCalls).toHaveLength(1);
    expect(h.saves).toHaveLength(0);
    expect(h.getRows()).toEqual([]);
  });

  it('write failure throws PERSISTENCE_FAILED with no success recorded', async () => {
    const h = makeHarness({
      fetchImpl: throwingFetch([]),
      queueImpl: async () => {
        throw new OfflineStoreError('disk gone', 'WRITE_FAILED');
      },
    });
    await expectCommandError(
      runCreateOrderCommand(h.deps, { tenantId: SCOPE.tenantId }),
      'PERSISTENCE_FAILED',
      'Order could not be saved on this device'
    );
    expect(h.saves).toHaveLength(0);
    expect(h.getRows()).toEqual([]);
  });

  it('scope failure throws SCOPE_FAILED before any queue or mock write', async () => {
    const h = makeHarness({
      fetchImpl: throwingFetch([]),
      resolveScope: () => {
        throw new Error('no storage');
      },
    });
    await expectCommandError(
      runCreateOrderCommand(h.deps, { tenantId: SCOPE.tenantId }),
      'SCOPE_FAILED',
      'Order could not be saved on this device'
    );
    expect(h.queueCalls).toHaveLength(0);
    expect(h.saves).toHaveLength(0);
    expect(h.getRows()).toEqual([]);
  });

  it('queue conflict propagates explicitly with no mock write', async () => {
    const conflict = new OfflineStoreError('ID already exists with a different payload', 'CONFLICT');
    const h = makeHarness({
      fetchImpl: throwingFetch([]),
      queueImpl: async () => {
        throw conflict;
      },
    });
    try {
      await runCreateOrderCommand(h.deps, { tenantId: SCOPE.tenantId });
    } catch (err) {
      expect(err).toBe(conflict);
      expect(h.saves).toHaveLength(0);
      expect(h.getRows()).toEqual([]);
      return;
    }
    throw new Error('expected queue conflict to propagate but the call succeeded');
  });

  it('commit-then-response-loss preserves identical pre-allocated orderId and opId into offline queue', async () => {
    let capturedBody: any = null;
    let capturedHeaders: any = null;
    let networkCalls = 0;
    const preAllocOrderId = 'o-stable-uuid-99';
    const preAllocOpId = 'delta-stable-op-99';

    // Simulate commit-then-response-loss: server receives request and processes it,
    // but the network connection drops or aborts before returning the HTTP response to the client.
    const droppingFetch: typeof fetch = (async (_url: string, init: any) => {
      networkCalls++;
      capturedBody = JSON.parse(init.body);
      capturedHeaders = init.headers;
      throw new TypeError('Failed to fetch: connection reset after send');
    }) as unknown as typeof fetch;

    const h = makeHarness({
      fetchImpl: droppingFetch,
      generateOrderId: () => preAllocOrderId,
      generateOperationId: () => preAllocOpId,
    });

    const localOrder = await runCreateOrderCommand(h.deps, {
      tenantId: SCOPE.tenantId,
      table_number: '14',
      cover_count: 2,
      server_name: 'Alex',
    });

    // 1. The initial network attempt sent the pre-allocated IDs
    expect(networkCalls).toBe(1);
    expect(capturedBody.id).toBe(preAllocOrderId);
    expect(capturedHeaders['Idempotency-Key']).toBe(preAllocOpId);

    // 2. The local offline fallback received the EXACT SAME pre-allocated IDs
    expect(localOrder.id).toBe(preAllocOrderId);
    expect(h.queueCalls).toHaveLength(1);
    expect(h.queueCalls[0]!.input.id).toBe(preAllocOpId);
    expect(h.queueCalls[0]!.input.order_id).toBe(preAllocOrderId);

    // 3. Local mock store mirrors the exact same orderId
    const stored = h.getRows();
    expect(stored).toHaveLength(1);
    expect(stored[0]!.id).toBe(preAllocOrderId);
  });
});

// ---------- apply_discount: online ----------

describe('offline-pos-commands discount online', () => {
  it('online success returns server data with no queue or mock write', async () => {
    const seen: any[] = [];
    const serverOrder = { id: 'order-7', discount_percent: 10 };
    const initial = [{ id: 'order-7', tenant_id: SCOPE.tenantId, total: 5000 }];
    const h = makeHarness({
      fetchImpl: respondingFetch(seen, jsonResponse(true, 200, { data: serverOrder })),
      initialOrders: initial,
    });
    const before = snapshot(h.getRows());
    const result = await runApplyDiscountCommand(h.deps, {
      tenantId: SCOPE.tenantId,
      orderId: 'order-7',
      discountPercent: 10,
      discountFlat: 250,
    });
    expect(result).toEqual(serverOrder);
    expect(seen).toHaveLength(1);
    expect(seen[0].url).toBe('http://pos.test/v1/orders/order-7/discount');
    expect(seen[0].body).toEqual({ discountPercent: 10, discountFlat: 250 });
    expect(seen[0].init?.headers?.['Idempotency-Key']).toBe('delta-test-op-1');
    expect(h.queueCalls).toHaveLength(0);
    expect(h.saves).toHaveLength(0);
    expect(snapshot(h.getRows())).toBe(before);
  });

  it('online path sends raw values without client pre-validation', async () => {
    const seen: any[] = [];
    const h = makeHarness({
      fetchImpl: respondingFetch(seen, jsonResponse(true, 200, { data: { id: 'order-7' } })),
    });
    // Server behavior preserved: the live route validates nothing, so the
    // online attempt must not reject before the server sees the values.
    // Offline input IS validated (see below).
    await runApplyDiscountCommand(h.deps, {
      tenantId: SCOPE.tenantId,
      orderId: 'order-7',
      discountPercent: 999,
      discountFlat: 0,
    });
    expect(seen).toHaveLength(1);
    expect(h.queueCalls).toHaveLength(0);
    expect(h.saves).toHaveLength(0);
  });
});

// ---------- apply_discount: server denials never fallback ----------

describe('offline-pos-commands discount denials', () => {
  it('401/403/422 denials throw with no queue write and no mock change', async () => {
    for (const status of [401, 403, 422]) {
      const initial = [{ id: 'order-7', tenant_id: SCOPE.tenantId, total: 5000 }];
      const h = makeHarness({
        fetchImpl: respondingFetch(
          [],
          jsonResponse(false, status, { error: { message: `denied-${status}` } })
        ),
        initialOrders: initial,
      });
      const before = snapshot(h.getRows());
      await expectServerDenial(
        runApplyDiscountCommand(h.deps, {
          tenantId: SCOPE.tenantId,
          orderId: 'order-7',
          discountPercent: 10,
          discountFlat: 0,
        }),
        `denied-${status}`
      );
      expect(h.queueCalls).toHaveLength(0);
      expect(h.saves).toHaveLength(0);
      expect(snapshot(h.getRows())).toBe(before);
    }
  });

  it('404/409/500 responses throw with no offline fallback', async () => {
    for (const status of [404, 409, 500]) {
      const initial = [{ id: 'order-7', tenant_id: SCOPE.tenantId, total: 5000 }];
      const h = makeHarness({
        fetchImpl: respondingFetch(
          [],
          jsonResponse(false, status, { error: { message: `failed-${status}` } })
        ),
        initialOrders: initial,
      });
      const before = snapshot(h.getRows());
      await expectServerDenial(
        runApplyDiscountCommand(h.deps, {
          tenantId: SCOPE.tenantId,
          orderId: 'order-7',
          discountPercent: 10,
          discountFlat: 0,
        }),
        `failed-${status}`
      );
      expect(h.queueCalls).toHaveLength(0);
      expect(h.saves).toHaveLength(0);
      expect(snapshot(h.getRows())).toBe(before);
    }
  });
});

// ---------- apply_discount: offline durable-first ----------

describe('offline-pos-commands discount offline', () => {
  it('fetch throw enqueues before the mock mutation with dual-casing payload', async () => {
    const initial = [{ id: 'order-7', tenant_id: SCOPE.tenantId, total: 5000 }];
    const h = makeHarness({ fetchImpl: throwingFetch([]), initialOrders: initial });
    const order = await runApplyDiscountCommand(h.deps, {
      tenantId: SCOPE.tenantId,
      orderId: 'order-7',
      discountPercent: 10,
      discountFlat: 250,
    });
    expect(order.discount_percent).toBe(10);
    expect(order.discount_flat).toBe(250);
    expect(h.events).toEqual(['enqueue', 'save']);
    expect(h.queueCalls).toHaveLength(1);
    const call = h.queueCalls[0]!;
    expect(call.input.id).toBe('delta-test-op-1');
    expect(call.input.order_id).toBe('order-7');
    expect(call.input.action).toBe('apply_discount');
    expect(call.input.payload).toEqual({
      discount_percent: 10,
      discountPercent: 10,
      discount_flat: 250,
      discountFlat: 250,
    });
    expect(h.saves).toHaveLength(1);
    const saved = h.getRows().find((o: any) => o.id === 'order-7');
    expect(saved.discount_percent).toBe(10);
    expect(saved.discount_flat).toBe(250);
  });

  it('unknown local order fails ORDER_NOT_FOUND with no queue write', async () => {
    const h = makeHarness({
      fetchImpl: throwingFetch([]),
      initialOrders: [{ id: 'order-other', tenant_id: SCOPE.tenantId }],
    });
    await expectCommandError(
      runApplyDiscountCommand(h.deps, {
        tenantId: SCOPE.tenantId,
        orderId: 'order-missing',
        discountPercent: 10,
        discountFlat: 0,
      }),
      'ORDER_NOT_FOUND',
      'not found on this device'
    );
    expect(h.queueCalls).toHaveLength(0);
    expect(h.saves).toHaveLength(0);
  });

  it('invalid discount values fail VALIDATION_FAILED before any write', async () => {
    const cases: { discountPercent: number; discountFlat: number }[] = [
      { discountPercent: -1, discountFlat: 0 },
      { discountPercent: 101, discountFlat: 0 },
      { discountPercent: Number.NaN, discountFlat: 0 },
      { discountPercent: 10, discountFlat: -5 },
      { discountPercent: 10, discountFlat: 1.5 },
      { discountPercent: 10, discountFlat: Number.NaN },
    ];
    for (const c of cases) {
      const h = makeHarness({
        fetchImpl: throwingFetch([]),
        initialOrders: [{ id: 'order-7', tenant_id: SCOPE.tenantId, total: 5000 }],
      });
      const before = snapshot(h.getRows());
      await expectCommandError(
        runApplyDiscountCommand(h.deps, {
          tenantId: SCOPE.tenantId,
          orderId: 'order-7',
          discountPercent: c.discountPercent,
          discountFlat: c.discountFlat,
        }),
        'VALIDATION_FAILED',
        'Discount'
      );
      expect(h.queueCalls).toHaveLength(0);
      expect(h.saves).toHaveLength(0);
      expect(snapshot(h.getRows())).toBe(before);
    }
  });

  it('persistence failure leaves the mock discount fields unset', async () => {
    const initial = [{ id: 'order-7', tenant_id: SCOPE.tenantId, total: 5000 }];
    const h = makeHarness({
      fetchImpl: throwingFetch([]),
      initialOrders: initial,
      queueImpl: async () => {
        throw new OfflineStoreError('storage quota exceeded', 'QUOTA_EXCEEDED');
      },
    });
    await expectCommandError(
      runApplyDiscountCommand(h.deps, {
        tenantId: SCOPE.tenantId,
        orderId: 'order-7',
        discountPercent: 10,
        discountFlat: 250,
      }),
      'PERSISTENCE_FAILED',
      'Discount could not be saved on this device'
    );
    expect(h.saves).toHaveLength(0);
    const row = h.getRows().find((o: any) => o.id === 'order-7');
    expect(row.discount_percent).toBeUndefined();
    expect(row.discount_flat).toBeUndefined();
  });
});

// ---------- payload builders, contracts, identities ----------

describe('offline-pos-commands contracts', () => {
  it('buildCreateOrderPayload defaults and mirrors both casings', () => {
    expect(buildCreateOrderPayload({})).toEqual({
      table_number: null,
      tableNumber: null,
      cover_count: 1,
      coverCount: 1,
      server_name: 'Server',
      serverName: 'Server',
      status: 'open',
    });
    expect(
      buildCreateOrderPayload({ table_number: '12', cover_count: 4, server_name: 'Kim' })
    ).toEqual({
      table_number: '12',
      tableNumber: '12',
      cover_count: 4,
      coverCount: 4,
      server_name: 'Kim',
      serverName: 'Kim',
      status: 'open',
    });
    expect(buildCreateOrderPayload({ cover_count: 0 }).cover_count).toBe(1);
    expect(buildCreateOrderPayload({ cover_count: -3 }).coverCount).toBe(1);
    expect(buildCreateOrderPayload({ table_number: '' }).table_number).toBeNull();
  });

  it('buildApplyDiscountPayload mirrors both casings', () => {
    expect(buildApplyDiscountPayload({ discountPercent: 10, discountFlat: 250 })).toEqual({
      discount_percent: 10,
      discountPercent: 10,
      discount_flat: 250,
      discountFlat: 250,
    });
  });

  it('buildApplyDiscountPayload rejects invalid values', async () => {
    const bad: [number, number][] = [
      [-1, 0],
      [101, 0],
      [Number.NaN, 0],
      [10, -1],
      [10, 1.5],
    ];
    for (const [discountPercent, discountFlat] of bad) {
      try {
        buildApplyDiscountPayload({ discountPercent, discountFlat });
      } catch (err) {
        expect(err).toBeInstanceOf(OfflinePosCommandError);
        expect((err as OfflinePosCommandError).code).toBe('VALIDATION_FAILED');
        continue;
      }
      throw new Error(`expected VALIDATION_FAILED for ${discountPercent}/${discountFlat}`);
    }
  });

  it('contract constants pin the integration surface', () => {
    expect(CREATE_ORDER_CONTRACT.action).toBe('create_order');
    expect(CREATE_ORDER_CONTRACT.orderIdFormat).toBe('<uuid>');
    expect([...CREATE_ORDER_CONTRACT.payloadKeys]).toContain('coverCount');
    expect([...CREATE_ORDER_CONTRACT.payloadKeys]).toContain('cover_count');
    expect(CREATE_ORDER_CONTRACT.serverReplay).toBe('UPSERT_POS_ORDERS_BY_ID');
    expect(APPLY_DISCOUNT_CONTRACT.action).toBe('apply_discount');
    expect([...APPLY_DISCOUNT_CONTRACT.payloadKeys]).toContain('discountPercent');
    expect([...APPLY_DISCOUNT_CONTRACT.payloadKeys]).toContain('discount_flat');
    expect(VOID_LINE_ITEM_CONTRACT.action).toBe('void_line_item');
    expect(VOID_LINE_ITEM_CONTRACT.serverReplay).toBe('NOT_IMPLEMENTED');
    expect([...VOID_LINE_ITEM_CONTRACT.payloadKeys]).toContain('itemId');
  });

  it('isNoFallbackStatus marks auth/validation/conflict denials', () => {
    for (const status of [400, 401, 403, 404, 409, 422]) {
      expect(isNoFallbackStatus(status)).toBe(true);
    }
    expect(isNoFallbackStatus(200)).toBe(false);
    expect(isNoFallbackStatus(201)).toBe(false);
    expect(isNoFallbackStatus(500)).toBe(false);
  });

  it('generateOfflineOrderId mints stable <uuid> identities', () => {
    const first = generateOfflineOrderId();
    const second = generateOfflineOrderId();
    expect(first).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect(second).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect(first === second).toBe(false);
  });
});

// ---------- real-queue integration ----------

describe('offline-pos-commands real queue', () => {
  it('create persists a real delta with the same ID as the mock row', async () => {
    const realQueue = new DurableOfflineQueue({ backend: new MemoryOfflineBackend() });
    const h = makeHarness({
      fetchImpl: throwingFetch([]),
      queueImpl: (input, scope) => realQueue.enqueue(input, scope),
    });
    const order = await runCreateOrderCommand(h.deps, {
      tenantId: SCOPE.tenantId,
      table_number: '5',
    });
    const pending = await realQueue.getPending(SCOPE);
    expect(pending).toHaveLength(1);
    expect(pending[0]!.id).toBe('delta-test-op-1');
    expect(pending[0]!.order_id).toBe(order.id);
    expect(pending[0]!.action).toBe('create_order');
    expect(h.getRows().map((o: any) => o.id)).toEqual([order.id]);
  });

  it('discount persists a real delta before the mock change', async () => {
    const realQueue = new DurableOfflineQueue({ backend: new MemoryOfflineBackend() });
    const h = makeHarness({
      fetchImpl: throwingFetch([]),
      queueImpl: (input, scope) => realQueue.enqueue(input, scope),
      initialOrders: [{ id: 'order-7', tenant_id: SCOPE.tenantId, total: 5000 }],
    });
    await runApplyDiscountCommand(h.deps, {
      tenantId: SCOPE.tenantId,
      orderId: 'order-7',
      discountPercent: 15,
      discountFlat: 0,
    });
    const pending = await realQueue.getPending(SCOPE);
    expect(pending).toHaveLength(1);
    expect(pending[0]!.action).toBe('apply_discount');
    expect(pending[0]!.payload).toEqual({
      discount_percent: 15,
      discountPercent: 15,
      discount_flat: 0,
      discountFlat: 0,
    });
    expect(h.events).toEqual(['enqueue', 'save']);
  });
});
