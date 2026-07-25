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
  markDeltasSynced,
  flushOfflineQueue
} from '../../packages/shared/src/offline-sync';

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

  it('marks synced deltas and clears them from queue', () => {
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

    expect(getOfflineQueue().length).toBe(2);

    markDeltasSynced([d1.id]);

    const remaining = getOfflineQueue();
    expect(remaining.length).toBe(1);
    expect(remaining[0].id).toBe(d2.id);
  });

  it('flushes offline queue via API sync endpoint', async () => {
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
      expect(syncedCount).toBe(1);
      expect(getOfflineQueue().length).toBe(0);
    } finally {
      (globalThis as any).fetch = originalFetch;
    }
  });
});
