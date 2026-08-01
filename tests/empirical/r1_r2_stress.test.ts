// ============================================================
// Empirical Adversarial Stress Test Suite for Requirements R1 & R2
// Challenger 1 (teamwork_preview_challenger_1)
// ============================================================

import { describe, it, mock } from 'bun:test';
import assert from 'node:assert';

// Polyfill LocalStorage for Node environment if not present
if (typeof (globalThis as any).localStorage === 'undefined') {
  const store = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
  };
}

import { encodeBinaryEvent, decodeBinaryEvent } from '@culinaryos/event-bus';
import type { DomainEvent } from '@culinaryos/shared';
import {
  enqueueOfflineDelta,
  getOfflineQueue,
  markDeltasSynced,
  flushOfflineQueue,
} from '@culinaryos/shared';

const STORAGE_KEY = 'culinaryos_offline_transaction_queue';

function clearQueue() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    if (localStorage.clear) localStorage.clear();
  } catch {}
}

describe('R1: Binary Event Protocol Stress Tests (encodeBinaryEvent / decodeBinaryEvent)', () => {
  const sampleEvent: DomainEvent = {
    eventId: 'evt-1001',
    eventType: 'pos:order:created',
    tenantId: 'tenant-bistro-01',
    source: 'pos-terminal-01',
    timestamp: new Date().toISOString(),
    version: 1,
    payload: { orderId: 'ord-55', total: 49.99 },
  };

  it('R1-1: Handled truncated or short buffers (< 6 bytes)', () => {
    assert.strictEqual(decodeBinaryEvent(new Uint8Array(0)), null);
    assert.strictEqual(decodeBinaryEvent(new Uint8Array([0x43])), null);
    assert.strictEqual(decodeBinaryEvent(new Uint8Array([0x43, 0x01])), null);
    assert.strictEqual(decodeBinaryEvent(new Uint8Array([0x43, 0x01, 0x00, 0x00, 0x00])), null);
  });

  it('R1-2: Invalid magic byte or version byte in header', () => {
    const encoded = encodeBinaryEvent(sampleEvent);
    
    const badMagic = new Uint8Array(encoded);
    badMagic[0] = 0x99;
    assert.strictEqual(decodeBinaryEvent(badMagic), null);

    const badVersion = new Uint8Array(encoded);
    badVersion[1] = 0x02;
    assert.strictEqual(decodeBinaryEvent(badVersion), null);
  });

  it('R1-3: Lying payload length field in header (length exceeds actual buffer)', () => {
    const encoded = encodeBinaryEvent(sampleEvent);
    const view = new DataView(encoded.buffer, encoded.byteOffset, encoded.byteLength);
    view.setUint32(2, 100000, false);

    assert.strictEqual(decodeBinaryEvent(encoded), null);
  });

  it('R1-4: Subarray buffer with byteOffset > 0 (DataView alignment test)', () => {
    const encoded = encodeBinaryEvent(sampleEvent);
    const padded = new Uint8Array(encoded.length + 20);
    padded.set(encoded, 10);
    const sliced = padded.subarray(10, 10 + encoded.length);

    const decoded = decodeBinaryEvent(sliced);
    assert.notStrictEqual(decoded, null);
    assert.deepStrictEqual(decoded, sampleEvent);
  });

  it('R1-5: Huge payload (1 MB JSON string / 10,000 array items)', () => {
    const largeItems = Array.from({ length: 10000 }, (_, i) => ({
      id: `item-${i}`,
      name: `Special Item #${i} with extra long description to inflate payload size`,
      price: i * 1.5,
    }));

    const hugeEvent: DomainEvent = {
      eventId: 'evt-huge-999',
      eventType: 'pos:order:bulk_created',
      tenantId: 'tenant-huge-01',
      source: 'pos-server',
      timestamp: new Date().toISOString(),
      version: 1,
      payload: { items: largeItems },
    };

    const encoded = encodeBinaryEvent(hugeEvent);
    assert.ok(encoded.length > 50000);

    const decoded = decodeBinaryEvent(encoded);
    assert.notStrictEqual(decoded, null);
    assert.strictEqual(decoded?.eventId, 'evt-huge-999');
    assert.strictEqual((decoded?.payload as any).items.length, 10000);
  });

  it('R1-6: Complex Unicode, Emojis, Control characters & Escaped backslashes', () => {
    const unicodeEvent: DomainEvent = {
      eventId: 'evt-unicode-🍣🔥',
      eventType: 'pos:order:created',
      tenantId: 'tenant-東京-01',
      source: 'pos-terminal-01',
      timestamp: new Date().toISOString(),
      version: 1,
      payload: {
        dishName: '特選和牛サーロインステーキ 🍣 & Lobster Bisque 🦞',
        notes: 'Line 1\nLine 2\tTabbed "Quote" \\EscapedBackslash\\ \u0000 NullByte',
        specialRequests: ['No peanuts 🥜', 'Extra spicy 🌶️🌶️🌶️'],
      },
    };

    const encoded = encodeBinaryEvent(unicodeEvent);
    const decoded = decodeBinaryEvent(encoded);
    assert.notStrictEqual(decoded, null);
    assert.deepStrictEqual(decoded, unicodeEvent);
  });

  it('R1-7: Corrupted JSON payload in buffer (header valid, JSON malformed)', () => {
    const header = new Uint8Array(6);
    header[0] = 0x43;
    header[1] = 0x01;
    
    const badJsonBytes = new TextEncoder().encode('{invalid_json_string_here:');
    const view = new DataView(header.buffer);
    view.setUint32(2, badJsonBytes.length, false);

    const packet = new Uint8Array(header.length + badJsonBytes.length);
    packet.set(header, 0);
    packet.set(badJsonBytes, 6);

    let threw = false;
    let result = null;
    try {
      result = decodeBinaryEvent(packet);
    } catch (err) {
      threw = true;
    }
    assert.strictEqual(result, null);
  });
});

describe('R2: Offline Delta Sync Engine Storage & Uniqueness Tests', () => {
  it('R2-1: Rapid / High-Volume insertions (500 deltas) & Cryptographic UUIDv4 Uniqueness', () => {
    clearQueue();
    const generatedIds = new Set<string>();
    const count = 500;

    for (let i = 0; i < count; i++) {
      const delta = enqueueOfflineDelta({
        tenant_id: 'tenant-001',
        order_id: `ord-${i}`,
        action: 'add_line_item',
        payload: { item: `item-${i}`, qty: 1 },
      });

      assert.ok(/^delta-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(delta.id));
      assert.strictEqual(generatedIds.has(delta.id), false);
      generatedIds.add(delta.id);
    }

    assert.strictEqual(generatedIds.size, count);

    const queue = getOfflineQueue();
    assert.strictEqual(queue.length, count);
    assert.strictEqual(queue[0].order_id, 'ord-0');
    assert.strictEqual(queue[count - 1].order_id, `ord-${count - 1}`);
    clearQueue();
  });

  it('R2-2: LocalStorage setItem failure (QuotaExceededError) handling', () => {
    clearQueue();
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = () => {
      const err = new Error('QuotaExceededError: DOM Exception 22');
      err.name = 'QuotaExceededError';
      throw err;
    };

    try {
      const delta = enqueueOfflineDelta({
        tenant_id: 'tenant-001',
        order_id: 'ord-quota-test',
        action: 'create_order',
        payload: {},
      });

      assert.ok(delta !== null && delta !== undefined);
      assert.ok(delta.id.startsWith('delta-'));
    } finally {
      localStorage.setItem = originalSetItem;
      clearQueue();
    }
  });

  it('R2-3: LocalStorage corrupted data (invalid JSON string)', () => {
    clearQueue();
    localStorage.setItem(STORAGE_KEY, '<<<CORRUPTED_RAW_JSON>>>');
    
    const queue = getOfflineQueue();
    assert.deepStrictEqual(queue, []);

    const delta = enqueueOfflineDelta({
      tenant_id: 'tenant-001',
      order_id: 'ord-recover',
      action: 'create_order',
      payload: {},
    });
    assert.ok(delta !== null && delta !== undefined);
    clearQueue();
  });

  it('R2-4: Sequential network failure, HTTP 500, and in-flight concurrent enqueue flush resilience', async () => {
    const originalFetch = globalThis.fetch;

    // Subtest A: Network offline failure
    clearQueue();
    enqueueOfflineDelta({
      tenant_id: 'tenant-001',
      order_id: 'ord-net-fail',
      action: 'finalize_payment',
      payload: { amount: 100 },
    });

    (globalThis as any).fetch = mock(async () => {
      throw new TypeError('NetworkError when attempting to fetch resource.');
    });

    let syncedCount = await flushOfflineQueue('http://localhost:3000');
    assert.strictEqual(syncedCount, 0);
    let queue = getOfflineQueue();
    assert.strictEqual(queue.length, 1);
    assert.strictEqual(queue[0].order_id, 'ord-net-fail');

    // Subtest B: HTTP 500 Server Error
    clearQueue();
    enqueueOfflineDelta({
      tenant_id: 'tenant-001',
      order_id: 'ord-500-error',
      action: 'finalize_payment',
      payload: { amount: 50 },
    });

    (globalThis as any).fetch = mock(async () => ({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Internal Server Error' }),
    }));

    syncedCount = await flushOfflineQueue('http://localhost:3000');
    assert.strictEqual(syncedCount, 0);
    queue = getOfflineQueue();
    assert.strictEqual(queue.length, 1);
    assert.strictEqual(queue[0].order_id, 'ord-500-error');

    // Subtest C: In-flight concurrent delta enqueue during async flush
    clearQueue();
    enqueueOfflineDelta({
      tenant_id: 'tenant-001',
      order_id: 'ord-first',
      action: 'create_order',
      payload: {},
    });

    (globalThis as any).fetch = mock(async () => {
      enqueueOfflineDelta({
        tenant_id: 'tenant-001',
        order_id: 'ord-second-in-flight',
        action: 'add_line_item',
        payload: {},
      });

      return {
        ok: true,
        json: async () => ({ status: 'success', synced: 1 }),
      };
    });

    syncedCount = await flushOfflineQueue('http://localhost:3000');
    assert.strictEqual(syncedCount, 1);
    const remainingQueue = getOfflineQueue();
    assert.strictEqual(remainingQueue.length, 1);
    assert.strictEqual(remainingQueue[0].order_id, 'ord-second-in-flight');

    (globalThis as any).fetch = originalFetch;
    clearQueue();
  });
});
