// ============================================================
// @culinaryos/shared — Offline-First Transaction Delta Sync Engine
// Instant 0ms local checkout queue with zero-collision UUID replay
// ============================================================

export interface OfflineTransactionDelta {
  id: string;
  tenant_id: string;
  order_id: string;
  action: 'create_order' | 'add_line_item' | 'apply_discount' | 'finalize_payment' | 'void_order';
  payload: Record<string, any>;
  timestamp: string;
  synced: boolean;
}

const STORAGE_KEY = 'culinaryos_offline_transaction_queue';

export function enqueueOfflineDelta(delta: Omit<OfflineTransactionDelta, 'id' | 'timestamp' | 'synced'>): OfflineTransactionDelta {
  const fullDelta: OfflineTransactionDelta = {
    ...delta,
    id: `delta-${crypto.randomUUID()}`,
    timestamp: new Date().toISOString(),
    synced: false,
  };

  try {
    const existing = getOfflineQueue();
    existing.push(fullDelta);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  } catch (err) {
    console.warn('[OfflineSyncEngine] Failed to write delta to LocalStorage:', err);
  }

  return fullDelta;
}

export function getOfflineQueue(): OfflineTransactionDelta[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function markDeltasSynced(syncedIds: string[]) {
  try {
    const queue = getOfflineQueue().filter(d => !syncedIds.includes(d.id));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch (err) {
    console.warn('[OfflineSyncEngine] Failed to clear synced deltas:', err);
  }
}

export async function flushOfflineQueue(syncApiUrl: string): Promise<number> {
  const queue = getOfflineQueue();
  if (queue.length === 0) return 0;

  try {
    const res = await fetch(`${syncApiUrl}/v1/pos/sync-deltas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deltas: queue }),
    });

    if (res.ok) {
      const syncedIds = queue.map(q => q.id);
      markDeltasSynced(syncedIds);
      return syncedIds.length;
    }
  } catch {
    // Network offline; maintain queue for next attempt
  }

  return 0;
}
