// ============================================================
// @culinaryos/shared — Offline-First Transaction Delta Sync Engine
// Instant local checkout queue with confirmed-ID replay
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

let flushInFlight: Promise<number> | null = null;

function readQueue(): OfflineTransactionDelta[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: OfflineTransactionDelta[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
}

export function enqueueOfflineDelta(
  delta: Omit<OfflineTransactionDelta, 'id' | 'timestamp' | 'synced'>
): OfflineTransactionDelta {
  const fullDelta: OfflineTransactionDelta = {
    ...delta,
    id: `delta-${crypto.randomUUID()}`,
    timestamp: new Date().toISOString(),
    synced: false,
  };

  try {
    const existing = readQueue();
    existing.push(fullDelta);
    writeQueue(existing);
  } catch (err) {
    console.warn('[OfflineSyncEngine] Failed to write delta to LocalStorage:', err);
  }

  return fullDelta;
}

/** Full queue including synced rows (for audit / debugging). */
export function getOfflineQueue(): OfflineTransactionDelta[] {
  return readQueue();
}

/** Pending (unsynced) deltas only. */
export function getPendingOfflineQueue(): OfflineTransactionDelta[] {
  return readQueue().filter((d) => !d.synced);
}

/**
 * Mark deltas as synced without deleting them (protocol: never delete from queue).
 */
export function markDeltasSynced(syncedIds: string[]) {
  try {
    const idSet = new Set(syncedIds);
    const queue = readQueue().map((d) =>
      idSet.has(d.id) ? { ...d, synced: true } : d
    );
    writeQueue(queue);
  } catch (err) {
    console.warn('[OfflineSyncEngine] Failed to mark synced deltas:', err);
  }
}

export async function flushOfflineQueue(
  syncApiUrl: string,
  headers: Record<string, string> = {}
): Promise<number> {
  if (flushInFlight) return flushInFlight;

  flushInFlight = (async () => {
    const queue = getPendingOfflineQueue();
    if (queue.length === 0) return 0;

    try {
      const res = await fetch(`${syncApiUrl}/v1/pos/sync-deltas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ deltas: queue }),
      });

      if (!res.ok) return 0;

      const body = await res.json().catch(() => ({}));
      const confirmedIds: string[] = Array.isArray(body?.data?.confirmedIds)
        ? body.data.confirmedIds
        : Array.isArray(body?.confirmedIds)
          ? body.confirmedIds
          : [];

      // Never wipe the queue on a bare 200 — only clear confirmed IDs
      if (confirmedIds.length === 0) return 0;

      markDeltasSynced(confirmedIds);
      return confirmedIds.length;
    } catch {
      // Network offline; maintain queue for next attempt
      return 0;
    } finally {
      flushInFlight = null;
    }
  })();

  try {
    return await flushInFlight;
  } catch {
    flushInFlight = null;
    return 0;
  }
}
