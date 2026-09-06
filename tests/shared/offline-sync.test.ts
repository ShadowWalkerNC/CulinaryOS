// ============================================================
// Unit Tests: Offline Sync Engine
// ============================================================

import { describe, it, expect, beforeEach, mock } from 'bun:test';

// Polyfill LocalStorage for Node environment
if (typeof (globalThis as any).localStorage === 'undefined') {
  const store = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
  };
}

import {
  enqueueOfflineDelta,
  getOfflineQueue,
  getPendingOfflineQueue,
  markDeltasSynced,
  flushOfflineQueue,
  acquireTableSeatLock,
  releaseTableSeatLock,
  resolveOrderDeltaConflict,
} from '@culinaryos/shared';

describe('offline-sync engine', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('enqueues transaction deltas with cryptographic UUIDv4 IDs', () => {
    const deltaInput = {
      tenant_id: 'tenant-001',
      order_id: 'ord-1001',
      action: 'finalize_payment' as const,
      payload: { amount: 89.50, paymentMethod: 'card' },
    };

    const result = enqueueOfflineDelta(deltaInput);
    expect(result.id).toMatch(/^delta-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    expect(result.synced).toBe(false);
    expect(result.tenant_id).toBe('tenant-001');

    const queue = getOfflineQueue();
    expect(queue.length).toBe(1);
    expect(queue[0].id).toBe(result.id);
  });

  it('marks synced deltas without deleting them from the queue', () => {
    const d1 = enqueueOfflineDelta({
      tenant_id: 'tenant-001',
      order_id: 'ord-1001',
      action: 'create_order' as const,
      payload: { total: 50.00 },
    });

    const d2 = enqueueOfflineDelta({
      tenant_id: 'tenant-001',
      order_id: 'ord-1002',
      action: 'create_order' as const,
      payload: { total: 75.00 },
    });

    expect(getPendingOfflineQueue().length).toBe(2);

    markDeltasSynced([d1.id]);

    expect(getOfflineQueue().length).toBe(2);
    expect(getPendingOfflineQueue().length).toBe(1);
    expect(getPendingOfflineQueue()[0].id).toBe(d2.id);
  });

  it('flushes offline queue only for confirmed IDs from the API', async () => {
    const d1 = enqueueOfflineDelta({
      tenant_id: 'tenant-001',
      order_id: 'ord-1001',
      action: 'finalize_payment' as const,
      payload: { amount: 50.00 },
    });

    const originalFetch = globalThis.fetch;
    (globalThis as any).fetch = mock(async () => ({
      ok: true,
      json: async () => ({ ok: true, data: { confirmedIds: [d1.id], applied: 1 } }),
    }));

    try {
      const syncedCount = await flushOfflineQueue('http://localhost:3000');
      expect(syncedCount).toBe(1);
      expect(getPendingOfflineQueue().length).toBe(0);
      expect(getOfflineQueue().length).toBe(1);
      expect(getOfflineQueue()[0].synced).toBe(true);
    } finally {
      (globalThis as any).fetch = originalFetch;
    }
  });

  it('does not clear queue on bare HTTP 200 without confirmedIds', async () => {
    enqueueOfflineDelta({
      tenant_id: 'tenant-001',
      order_id: 'ord-1001',
      action: 'finalize_payment' as const,
      payload: { amount: 50.00 },
    });

    const originalFetch = globalThis.fetch;
    (globalThis as any).fetch = mock(async () => ({
      ok: true,
      json: async () => ({ status: 'success', synced: 1 }),
    }));

    try {
      const syncedCount = await flushOfflineQueue('http://localhost:3000');
      expect(syncedCount).toBe(0);
      expect(getPendingOfflineQueue().length).toBe(1);
    } finally {
      (globalThis as any).fetch = originalFetch;
    }
  });

  it('handles simulated 2-hour offline dinner rush with 50+ orders and idempotent replay', async () => {
    // Stage 5: Offline depth — order queue + idempotent reconcile
    const tenantId = 'tenant-rush-01';
    const orderCount = 50;

    // Simulate 50 orders created and paid offline during a network outage
    for (let i = 1; i <= orderCount; i++) {
      const orderId = `ord-rush-${i}`;
      // 1. create_order delta
      enqueueOfflineDelta({
        tenant_id: tenantId,
        order_id: orderId,
        action: 'create_order',
        payload: {
          tableNumber: String((i % 15) + 1),
          coverCount: 2,
          serverName: 'Offline Server',
          subtotal: 4500,
          tax: 450,
          total: 4950,
        },
      });

      // 2. finalize_payment delta (cash/offline)
      enqueueOfflineDelta({
        tenant_id: tenantId,
        order_id: orderId,
        action: 'finalize_payment',
        payload: {
          amount: 4950,
          method: 'cash',
          tip_amount: 500,
        },
      });
    }

    const initialPending = getPendingOfflineQueue();
    expect(initialPending.length).toBe(orderCount * 2); // 100 deltas

    // Mock API server confirming all deltas deterministically
    const originalFetch = globalThis.fetch;
    (globalThis as any).fetch = mock(async (_url: string, opts: any) => {
      const parsed = JSON.parse(opts.body);
      const ids = parsed.deltas.map((d: any) => d.id);
      return {
        ok: true,
        json: async () => ({
          ok: true,
          data: {
            confirmedIds: ids,
            applied: ids.length,
          },
        }),
      };
    });

    try {
      const syncedCount = await flushOfflineQueue('http://localhost:3000');
      expect(syncedCount).toBe(100);
      expect(getPendingOfflineQueue().length).toBe(0);

      // Verify idempotency: calling flush again when queue is synced does 0 requests
      const secondFlushCount = await flushOfflineQueue('http://localhost:3000');
      expect(secondFlushCount).toBe(0);

      // Verify audit integrity: all 100 deltas remain in historical queue marked synced
      const allDeltas = getOfflineQueue();
      expect(allDeltas.length).toBe(100);
      expect(allDeltas.every((d) => d.synced === true)).toBe(true);
    } finally {
      (globalThis as any).fetch = originalFetch;
    }
  });

  it('manages optimistic table seat locks and rejects competing terminals', () => {
    const lock1 = acquireTableSeatLock('T-12', 'terminal-01', 'Alice', 5000);
    expect(lock1.success).toBe(true);
    expect(lock1.activeLock?.locked_by_device_id).toBe('terminal-01');

    // Competing terminal tries to lock same table
    const lock2 = acquireTableSeatLock('T-12', 'terminal-02', 'Bob', 5000);
    expect(lock2.success).toBe(false);
    expect(lock2.error).toContain('actively locked by Alice');

    // Terminal 01 releases lock
    const released = releaseTableSeatLock('T-12', 'terminal-01');
    expect(released).toBe(true);

    // Terminal 02 can now successfully acquire
    const lock3 = acquireTableSeatLock('T-12', 'terminal-02', 'Bob', 5000);
    expect(lock3.success).toBe(true);
    expect(lock3.activeLock?.locked_by_device_id).toBe('terminal-02');
  });

  it('deterministically merges concurrent offline line-item additions without dropping items', () => {
    const deltaA = {
      id: 'delta-1',
      tenant_id: 'tenant-001',
      order_id: 'ord-99',
      action: 'add_line_item' as const,
      payload: { menu_item_id: 'item-burger', quantity: 2, line_total: 3000 },
      timestamp: '2026-09-06T12:00:00.000Z',
      synced: false,
    };

    const deltaB = {
      id: 'delta-2',
      tenant_id: 'tenant-001',
      order_id: 'ord-99',
      action: 'add_line_item' as const,
      payload: { menu_item_id: 'item-burger', quantity: 1, line_total: 1500 },
      timestamp: '2026-09-06T12:00:05.000Z',
      synced: false,
    };

    const merged = resolveOrderDeltaConflict(deltaA, deltaB);
    expect(merged.payload.quantity).toBe(3);
    expect(merged.payload.line_total).toBe(4500);
  });
});
