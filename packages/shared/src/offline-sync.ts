// ============================================================
// @culinaryos/shared — Offline-First Transaction Delta Sync Engine
// Instant local checkout queue with confirmed-ID replay
// ============================================================

export interface TableSeatLock {
  table_id: string;
  locked_by_device_id: string;
  locked_by_server_name: string;
  locked_at: string;
  expires_at: string;
}

export interface OfflineTransactionDelta {
  id: string;
  tenant_id: string;
  order_id: string;
  action:
    | 'create_order'
    | 'add_line_item'
    | 'apply_discount'
    | 'finalize_payment'
    | 'void_order'
    | 'lock_table'
    | 'transfer_table'
    | 'fire_course';
  payload: Record<string, any>;
  timestamp: string;
  synced: boolean;
}

const STORAGE_KEY = 'culinaryos_offline_transaction_queue';
const TABLE_LOCKS_KEY = 'culinaryos_offline_table_locks';

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

/**
 * Optimistic Table / Seat Locks for Multi-Terminal Edge Mesh
 */
export function getTableSeatLocks(): Record<string, TableSeatLock> {
  try {
    const raw = localStorage.getItem(TABLE_LOCKS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveTableSeatLocks(locks: Record<string, TableSeatLock>) {
  try {
    localStorage.setItem(TABLE_LOCKS_KEY, JSON.stringify(locks));
  } catch {
    // ignore
  }
}

export function acquireTableSeatLock(
  tableId: string,
  deviceId: string,
  serverName: string,
  leaseMs: number = 60000
): { success: boolean; activeLock?: TableSeatLock; error?: string } {
  const locks = getTableSeatLocks();
  const existing = locks[tableId];
  const now = new Date();

  if (existing && new Date(existing.expires_at) > now) {
    if (existing.locked_by_device_id === deviceId) {
      // Refresh lease
      existing.expires_at = new Date(now.getTime() + leaseMs).toISOString();
      locks[tableId] = existing;
      saveTableSeatLocks(locks);
      return { success: true, activeLock: existing };
    }
    return {
      success: false,
      activeLock: existing,
      error: `Table ${tableId} is actively locked by ${existing.locked_by_server_name}`,
    };
  }

  const newLock: TableSeatLock = {
    table_id: tableId,
    locked_by_device_id: deviceId,
    locked_by_server_name: serverName,
    locked_at: now.toISOString(),
    expires_at: new Date(now.getTime() + leaseMs).toISOString(),
  };
  locks[tableId] = newLock;
  saveTableSeatLocks(locks);
  return { success: true, activeLock: newLock };
}

export function releaseTableSeatLock(tableId: string, deviceId: string): boolean {
  const locks = getTableSeatLocks();
  const existing = locks[tableId];
  if (!existing || existing.locked_by_device_id === deviceId) {
    delete locks[tableId];
    saveTableSeatLocks(locks);
    return true;
  }
  return false;
}

/**
 * Deterministic Conflict Resolution:
 * When two terminals edit the same order line item offline:
 * - Quantities: additive merge (neither server drops an item)
 * - Discounts / Status: higher timestamp / manager authority wins
 */
export function resolveOrderDeltaConflict(
  existingDelta: OfflineTransactionDelta,
  incomingDelta: OfflineTransactionDelta
): OfflineTransactionDelta {
  if (
    existingDelta.action === 'add_line_item' &&
    incomingDelta.action === 'add_line_item' &&
    existingDelta.payload.menu_item_id === incomingDelta.payload.menu_item_id
  ) {
    return {
      ...incomingDelta,
      payload: {
        ...incomingDelta.payload,
        quantity: (existingDelta.payload.quantity || 1) + (incomingDelta.payload.quantity || 1),
        line_total: (existingDelta.payload.line_total || 0) + (incomingDelta.payload.line_total || 0),
      },
    };
  }

  // Fallback: Last-Write-Wins based on ISO-8601 timestamp
  return new Date(incomingDelta.timestamp) >= new Date(existingDelta.timestamp)
    ? incomingDelta
    : existingDelta;
}

