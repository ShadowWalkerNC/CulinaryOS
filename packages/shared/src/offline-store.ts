// ============================================================
// @culinaryos/shared — Durable Offline Command Store (R4/P4a)
// Transactional browser persistence with explicit failure.
// Answers: docs/POS_PILOT_CORRECTNESS_SPEC.md P4a/A02/A03 and
// docs/ARCHITECTURE_RESILIENCE_PLAN.md R4 persistence slice
// (E02 queue loss/corruption/partitioning).
//
// Production POS must await this API and stop on failure. A local
// order/cash acceptance must not report success until persisted.
// Storage/quota/corruption failures throw; they are never swallowed
// and never masquerade as success. Financial queue records are
// marked synced, never deleted.
//
// Partitioning: every operation is scoped to { tenantId, deviceId }.
// A server ack only acknowledges submitted known IDs for the matching
// tenant; unknown/remote IDs are ignored, never applied.
//
// No card replay: finalize_payment is only durable-accepted for
// cash/comp. Card-like methods throw before any write. Legacy card
// rows already in storage are preserved for audit but never submitted.
//
// Limitations (do not overclaim):
// - Local persistence + locks do NOT prove cross-device coordination.
//   Concurrent-device conflicts require explicit server semantics
//   (version/precondition or equivalent); see resolveOrderDeltaConflict
//   notes in offline-sync.ts.
// - Durability tests use injected fake backends and do not certify
//   real browser IndexedDB, quota, eviction, or cross-tab behavior.
// ============================================================

export type DurableOfflineAction =
  | 'create_order'
  | 'add_line_item'
  | 'void_line_item'
  | 'apply_discount'
  | 'finalize_payment'
  | 'void_order'
  | 'lock_table'
  | 'transfer_table'
  | 'fire_course';

export interface DurableOfflineDelta {
  id: string;
  tenant_id: string;
  device_id: string;
  order_id: string;
  action: DurableOfflineAction;
  payload: Record<string, any>;
  timestamp: string;
  synced: boolean;
}

export interface OfflineScope {
  tenantId: string;
  deviceId: string;
}

export interface EnqueueDurableInput {
  tenant_id: string;
  device_id?: string;
  order_id: string;
  action: DurableOfflineAction;
  payload: Record<string, any>;
  id?: string;
  timestamp?: string;
}

export type OfflineErrorCode =
  | 'WRITE_FAILED'
  | 'QUOTA_EXCEEDED'
  | 'READ_FAILED'
  | 'CORRUPTED'
  | 'VALIDATION_FAILED'
  | 'CONFLICT'
  | 'CARD_OFFLINE_REJECTED'
  | 'MIGRATION_FAILED';

export class OfflineStoreError extends Error {
  readonly code: OfflineErrorCode;
  readonly raw?: string;
  constructor(message: string, code: OfflineErrorCode, opts?: { raw?: string; cause?: unknown }) {
    super(message, opts?.cause !== undefined ? { cause: opts.cause } : undefined);
    this.name = 'OfflineStoreError';
    this.code = code;
    if (opts?.raw !== undefined) this.raw = opts.raw;
  }
}

export class OfflineCorruptionError extends OfflineStoreError {
  constructor(message: string, raw: string, cause?: unknown) {
    super(message, 'CORRUPTED', cause === undefined ? { raw } : { raw, cause });
    this.name = 'OfflineCorruptionError';
  }
}

export class OfflineValidationError extends OfflineStoreError {
  constructor(message: string, cause?: unknown) {
    super(message, 'VALIDATION_FAILED', cause === undefined ? undefined : { cause });
    this.name = 'OfflineValidationError';
  }
}

export class OfflineConflictError extends OfflineStoreError {
  constructor(message: string, cause?: unknown) {
    super(message, 'CONFLICT', cause === undefined ? undefined : { cause });
    this.name = 'OfflineConflictError';
  }
}

export class OfflineCardRejectedError extends OfflineStoreError {
  constructor(message: string) {
    super(message, 'CARD_OFFLINE_REJECTED');
    this.name = 'OfflineCardRejectedError';
  }
}

export const LEGACY_OFFLINE_QUEUE_KEY = 'culinaryos_offline_transaction_queue';
export const POS_DEVICE_ID_KEY = 'culinaryos_device_id';

const DURABLE_KEY_PREFIX = 'culinaryos_offline_queue_v2';
const ALLOWED_ACTIONS: ReadonlySet<string> = new Set([
  'create_order',
  'add_line_item',
  'void_line_item',
  'apply_discount',
  'finalize_payment',
  'void_order',
  'lock_table',
  'transfer_table',
  'fire_course',
]);
const CASH_COMP_METHODS: ReadonlySet<string> = new Set(['cash', 'comp']);
// Substrings that indicate raw card data must never be queued. Deterministic,
// case-insensitive match on payload keys.
const CARD_DATA_KEY_FRAGMENTS: readonly string[] = [
  'pan',
  'card_number',
  'cardnumber',
  'card_number_encrypted',
  'cvv',
  'cvc',
  'track1',
  'track2',
  'magstripe',
  'emv_tag',
];

export function durablePartitionKey(scope: OfflineScope): string {
  return `${DURABLE_KEY_PREFIX}:${encodeURIComponent(scope.tenantId)}:${encodeURIComponent(scope.deviceId)}`;
}

export function scopeKey(scope: OfflineScope): string {
  return `${scope.tenantId}::${scope.deviceId}`;
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function cloneDelta(delta: DurableOfflineDelta): DurableOfflineDelta {
  // JSON round-trip gives a deterministic deep clone for plain queue rows.
  return JSON.parse(JSON.stringify(delta)) as DurableOfflineDelta;
}

export function stableStringify(value: unknown): string {
  if (value === null || value === undefined) return JSON.stringify(value) as string;
  if (typeof value !== 'object') return JSON.stringify(value) as string;
  if (Array.isArray(value)) return `[${value.map((v) => stableStringify(v)).join(',')}]`;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  const parts = keys.map((k) => `${JSON.stringify(k)}:${stableStringify(record[k])}`);
  return `{${parts.join(',')}}`;
}

function payloadsEqual(a: unknown, b: unknown): boolean {
  return stableStringify(a) === stableStringify(b);
}

export function generateOpId(): string {
  const cryptoRef = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (!cryptoRef?.randomUUID) {
    throw new OfflineStoreError('Cannot generate stable operation ID: crypto.randomUUID unavailable', 'WRITE_FAILED');
  }
  return `delta-${cryptoRef.randomUUID()}`;
}

export function getPosDeviceId(storageLike?: Pick<Storage, 'getItem' | 'setItem'>): string {
  const storage =
    storageLike ??
    (typeof globalThis !== 'undefined'
      ? (globalThis as { localStorage?: Pick<Storage, 'getItem' | 'setItem'> }).localStorage
      : undefined);
  if (!storage) {
    throw new OfflineStoreError('Cannot resolve device ID: no storage available', 'READ_FAILED');
  }
  let existing: string | null = null;
  try {
    existing = storage.getItem(POS_DEVICE_ID_KEY);
  } catch (err) {
    throw new OfflineStoreError('Cannot read device ID from storage', 'READ_FAILED', { cause: err });
  }
  if (existing !== null && existing !== '' && typeof existing === 'string') return existing;
  const cryptoRef = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (!cryptoRef?.randomUUID) {
    throw new OfflineStoreError('Cannot create device ID: crypto.randomUUID unavailable', 'WRITE_FAILED');
  }
  const created = `terminal-${cryptoRef.randomUUID()}`;
  try {
    storage.setItem(POS_DEVICE_ID_KEY, created);
  } catch (err) {
    throw mapWriteError(err, 'Cannot persist device ID');
  }
  return created;
}

function validateScope(scope: OfflineScope): void {
  if (!isRecord(scope)) throw new OfflineValidationError('Offline scope must be an object');
  if (typeof scope.tenantId !== 'string' || scope.tenantId.length === 0) {
    throw new OfflineValidationError('Offline scope tenantId must be a non-empty string');
  }
  if (typeof scope.deviceId !== 'string' || scope.deviceId.length === 0) {
    throw new OfflineValidationError('Offline scope deviceId must be a non-empty string');
  }
  if (scope.tenantId.length > 128 || scope.deviceId.length > 128) {
    throw new OfflineValidationError('Offline scope tenant/device ID exceeds 128 characters');
  }
}

function readMethod(payload: Record<string, any>): string | null {
  const raw = payload.method ?? payload.paymentMethod ?? payload.payment_method;
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function findCardDataKey(payload: Record<string, any>): string | null {
  for (const key of Object.keys(payload)) {
    const lower = key.toLowerCase();
    for (const fragment of CARD_DATA_KEY_FRAGMENTS) {
      if (lower.includes(fragment)) return key;
    }
  }
  return null;
}

function validateMoneyField(payload: Record<string, any>, field: string): void {
  if (!(field in payload)) return;
  const value = payload[field];
  if (value === null || value === undefined) return;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || !Number.isSafeInteger(value)) {
    throw new OfflineValidationError(
      `finalize_payment payload.${field} must be an integer cents value >= 0`
    );
  }
}

function validateEnqueueInput(input: EnqueueDurableInput, scope: OfflineScope): { id: string; timestamp: string } {
  validateScope(scope);
  if (!isRecord(input)) throw new OfflineValidationError('Enqueue input must be an object');
  if (typeof input.tenant_id !== 'string' || input.tenant_id.length === 0) {
    throw new OfflineValidationError('tenant_id must be a non-empty string');
  }
  if (input.tenant_id !== scope.tenantId) {
    throw new OfflineValidationError('tenant_id does not match offline scope tenantId');
  }
  const deviceId = input.device_id ?? scope.deviceId;
  if (typeof deviceId !== 'string' || deviceId.length === 0) {
    throw new OfflineValidationError('device_id must be a non-empty string');
  }
  if (deviceId !== scope.deviceId) {
    throw new OfflineValidationError('device_id does not match offline scope deviceId');
  }
  if (typeof input.order_id !== 'string' || input.order_id.length === 0) {
    throw new OfflineValidationError('order_id must be a non-empty string');
  }
  if (typeof input.action !== 'string' || !ALLOWED_ACTIONS.has(input.action)) {
    throw new OfflineValidationError(`action must be one of ${[...ALLOWED_ACTIONS].join(', ')}`);
  }
  if (!isRecord(input.payload)) throw new OfflineValidationError('payload must be a plain object');
  const cardKey = findCardDataKey(input.payload);
  if (cardKey !== null) {
    throw new OfflineValidationError(`payload contains forbidden card-data field "${cardKey}"`);
  }
  if (input.id !== undefined && (typeof input.id !== 'string' || input.id.length === 0)) {
    throw new OfflineValidationError('id must be a non-empty string when provided');
  }
  if (input.id !== undefined && input.id.length > 128) {
    throw new OfflineValidationError('id exceeds 128 characters');
  }
  let timestamp = input.timestamp;
  if (timestamp === undefined) timestamp = new Date().toISOString();
  if (typeof timestamp !== 'string' || Number.isNaN(Date.parse(timestamp))) {
    throw new OfflineValidationError('timestamp must be a parseable date string');
  }

  if (input.action === 'finalize_payment') {
    const method = readMethod(input.payload);
    if (method === null) {
      throw new OfflineValidationError('finalize_payment payload requires an explicit method');
    }
    if (!CASH_COMP_METHODS.has(method.toLowerCase())) {
      throw new OfflineCardRejectedError(
        `Offline finalize_payment only accepts cash/comp; method "${method}" requires verified processor settlement`
      );
    }
    validateMoneyField(input.payload, 'amount');
    validateMoneyField(input.payload, 'total');
    validateMoneyField(input.payload, 'tip_amount');
    validateMoneyField(input.payload, 'tip_cents');
  }
  return { id: input.id ?? generateOpId(), timestamp };
}

function validateStoredRow(row: unknown): DurableOfflineDelta {
  if (!isRecord(row)) throw new OfflineValidationError('Stored offline row must be an object');
  if (typeof row.id !== 'string' || row.id.length === 0) throw new OfflineValidationError('Stored row id invalid');
  if (typeof row.tenant_id !== 'string' || row.tenant_id.length === 0) {
    throw new OfflineValidationError('Stored row tenant_id invalid');
  }
  if (typeof row.device_id !== 'string' || row.device_id.length === 0) {
    throw new OfflineValidationError('Stored row device_id invalid');
  }
  if (typeof row.order_id !== 'string' || row.order_id.length === 0) {
    throw new OfflineValidationError('Stored row order_id invalid');
  }
  if (typeof row.action !== 'string' || !ALLOWED_ACTIONS.has(row.action)) {
    throw new OfflineValidationError('Stored row action invalid');
  }
  if (!isRecord(row.payload)) throw new OfflineValidationError('Stored row payload invalid');
  if (typeof row.timestamp !== 'string' || Number.isNaN(Date.parse(row.timestamp))) {
    throw new OfflineValidationError('Stored row timestamp invalid');
  }
  if (typeof row.synced !== 'boolean') throw new OfflineValidationError('Stored row synced flag invalid');
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    device_id: row.device_id,
    order_id: row.order_id,
    action: row.action as DurableOfflineAction,
    payload: row.payload as Record<string, any>,
    timestamp: row.timestamp,
    synced: row.synced,
  };
}

/** True only for rows the durable queue is allowed to submit. Card-like
 * finalize_payment rows are preserved but never replayed. */
export function isSubmittableDelta(delta: Pick<DurableOfflineDelta, 'action' | 'payload'>): boolean {
  if (delta.action !== 'finalize_payment') return true;
  if (!isRecord(delta.payload)) return false;
  const method = readMethod(delta.payload);
  if (method === null) return false;
  return CASH_COMP_METHODS.has(method.toLowerCase());
}

function mapWriteError(err: unknown, prefix: string): OfflineStoreError {
  const name = (err as { name?: string } | null)?.name ?? '';
  const message = err instanceof Error ? err.message : String(err);
  if (name.includes('Quota') || message.includes('Quota') || message.includes('quota')) {
    return new OfflineStoreError(`${prefix}: storage quota exceeded`, 'QUOTA_EXCEEDED', { cause: err });
  }
  return new OfflineStoreError(`${prefix}: ${message}`, 'WRITE_FAILED', { cause: err });
}

export function extractConfirmedIds(body: unknown): string[] {
  if (!isRecord(body)) return [];
  const nested = isRecord(body.data) ? (body.data as Record<string, unknown>).confirmedIds : undefined;
  const direct = (body as Record<string, unknown>).confirmedIds;
  const raw = Array.isArray(nested) ? nested : Array.isArray(direct) ? direct : [];
  return raw.filter((v): v is string => typeof v === 'string' && v.length > 0);
}

// ------------------------------------------------------------
// Backend seam: atomic per-call persistence primitives.
// ------------------------------------------------------------

export interface OfflineBackend {
  readonly backendName: string;
  list(scope: OfflineScope): Promise<DurableOfflineDelta[]>;
  insert(scope: OfflineScope, delta: DurableOfflineDelta): Promise<DurableOfflineDelta>;
  markSynced(scope: OfflineScope, ids: string[]): Promise<{ acked: string[]; ignored: string[] }>;
  bulkInsert(scope: OfflineScope, deltas: DurableOfflineDelta[]): Promise<void>;
}

function checkDuplicate(existing: DurableOfflineDelta, incoming: DurableOfflineDelta): 'same' | 'conflict' {
  const sameCore =
    existing.tenant_id === incoming.tenant_id &&
    existing.device_id === incoming.device_id &&
    existing.order_id === incoming.order_id &&
    existing.action === incoming.action &&
    payloadsEqual(existing.payload, incoming.payload);
  return sameCore ? 'same' : 'conflict';
}

export class MemoryOfflineBackend implements OfflineBackend {
  readonly backendName = 'memory';
  private partitions = new Map<string, Map<string, DurableOfflineDelta>>();

  private partition(scope: OfflineScope, create: boolean): Map<string, DurableOfflineDelta> | undefined {
    const key = scopeKey(scope);
    let part = this.partitions.get(key);
    if (!part && create) {
      part = new Map();
      this.partitions.set(key, part);
    }
    return part;
  }

  async list(scope: OfflineScope): Promise<DurableOfflineDelta[]> {
    validateScope(scope);
    const part = this.partition(scope, false);
    if (!part) return [];
    return [...part.values()].map(cloneDelta);
  }

  async insert(scope: OfflineScope, delta: DurableOfflineDelta): Promise<DurableOfflineDelta> {
    validateScope(scope);
    const part = this.partition(scope, true) as Map<string, DurableOfflineDelta>;
    const existing = part.get(delta.id);
    if (existing) {
      if (checkDuplicate(existing, delta) === 'same') return cloneDelta(existing);
      throw new OfflineConflictError(`Stable operation ID ${delta.id} already exists with a different payload`);
    }
    part.set(delta.id, cloneDelta(delta));
    const stored = part.get(delta.id) as DurableOfflineDelta;
    return cloneDelta(stored);
  }

  async markSynced(scope: OfflineScope, ids: string[]): Promise<{ acked: string[]; ignored: string[] }> {
    validateScope(scope);
    const part = this.partition(scope, false);
    const acked: string[] = [];
    const ignored: string[] = [];
    if (!part) {
      for (const id of ids) ignored.push(id);
      return { acked, ignored };
    }
    for (const id of ids) {
      const row = part.get(id);
      // Only acknowledge submitted known IDs for the matching tenant.
      // Unknown IDs and cross-tenant rows are ignored, never created.
      if (!row || row.tenant_id !== scope.tenantId || row.device_id !== scope.deviceId) {
        ignored.push(id);
        continue;
      }
      part.set(id, { ...cloneDelta(row), synced: true });
      acked.push(id);
    }
    return { acked, ignored };
  }

  async bulkInsert(scope: OfflineScope, deltas: DurableOfflineDelta[]): Promise<void> {
    validateScope(scope);
    const part = this.partition(scope, true) as Map<string, DurableOfflineDelta>;
    // Validate all before writing any (transactional all-or-nothing).
    for (const delta of deltas) {
      const existing = part.get(delta.id);
      if (existing && checkDuplicate(existing, delta) === 'conflict') {
        throw new OfflineConflictError(`Stable operation ID ${delta.id} already exists with a different payload`);
      }
    }
    for (const delta of deltas) {
      if (!part.has(delta.id)) part.set(delta.id, cloneDelta(delta));
    }
  }
}

export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export class LocalStorageOfflineBackend implements OfflineBackend {
  readonly backendName = 'localStorage-partitioned';
  private storage: StorageLike;

  constructor(storage?: StorageLike) {
    const fallback =
      typeof globalThis !== 'undefined'
        ? (globalThis as { localStorage?: StorageLike }).localStorage
        : undefined;
    if (!storage && !fallback) {
      throw new OfflineStoreError('localStorage backend requires a Storage implementation', 'READ_FAILED');
    }
    this.storage = storage ?? (fallback as StorageLike);
  }

  private readRaw(key: string): string | null {
    try {
      return this.storage.getItem(key);
    } catch (err) {
      throw new OfflineStoreError(`Cannot read offline partition ${key}`, 'READ_FAILED', { cause: err });
    }
  }

  private writeRaw(key: string, raw: string): void {
    try {
      this.storage.setItem(key, raw);
    } catch (err) {
      throw mapWriteError(err, `Cannot write offline partition ${key}`);
    }
  }

  private parsePartition(key: string, raw: string | null, scope: OfflineScope): DurableOfflineDelta[] {
    if (raw === null || raw === '') return [];
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      throw new OfflineCorruptionError(
        `Offline partition for tenant ${scope.tenantId} is corrupt; original preserved for recovery`,
        raw,
        err
      );
    }
    if (!Array.isArray(parsed)) {
      throw new OfflineCorruptionError(
        `Offline partition for tenant ${scope.tenantId} is not an array; original preserved`,
        raw
      );
    }
    const rows: DurableOfflineDelta[] = [];
    for (const row of parsed) {
      try {
        const valid = validateStoredRow(row);
        if (valid.tenant_id !== scope.tenantId || valid.device_id !== scope.deviceId) {
          throw new OfflineValidationError('Stored row scope mismatch');
        }
        rows.push(valid);
      } catch (err) {
        if (err instanceof OfflineStoreError && err.code === 'VALIDATION_FAILED') {
          throw new OfflineCorruptionError(
            `Offline partition for tenant ${scope.tenantId} contains an invalid row; original preserved`,
            raw,
            err
          );
        }
        throw err;
      }
    }
    return rows;
  }

  async list(scope: OfflineScope): Promise<DurableOfflineDelta[]> {
    validateScope(scope);
    const key = durablePartitionKey(scope);
    const raw = this.readRaw(key);
    return this.parsePartition(key, raw, scope).map(cloneDelta);
  }

  async insert(scope: OfflineScope, delta: DurableOfflineDelta): Promise<DurableOfflineDelta> {
    validateScope(scope);
    const key = durablePartitionKey(scope);
    // Read-modify-write runs under the queue mutex; the single setItem
    // preserves the previous value when it throws (quota/write failure).
    const rows = this.parsePartition(key, this.readRaw(key), scope);
    const existing = rows.find((r) => r.id === delta.id);
    if (existing) {
      if (checkDuplicate(existing, delta) === 'same') return cloneDelta(existing);
      throw new OfflineConflictError(`Stable operation ID ${delta.id} already exists with a different payload`);
    }
    rows.push(cloneDelta(delta));
    this.writeRaw(key, JSON.stringify(rows));
    return cloneDelta(delta);
  }

  async markSynced(scope: OfflineScope, ids: string[]): Promise<{ acked: string[]; ignored: string[] }> {
    validateScope(scope);
    const key = durablePartitionKey(scope);
    const rows = this.parsePartition(key, this.readRaw(key), scope);
    const byId = new Map(rows.map((r) => [r.id, r]));
    const acked: string[] = [];
    const ignored: string[] = [];
    for (const id of ids) {
      const row = byId.get(id);
      if (!row || row.tenant_id !== scope.tenantId || row.device_id !== scope.deviceId) {
        ignored.push(id);
        continue;
      }
      row.synced = true;
      acked.push(id);
    }
    if (acked.length > 0) this.writeRaw(key, JSON.stringify(rows));
    return { acked, ignored };
  }

  async bulkInsert(scope: OfflineScope, deltas: DurableOfflineDelta[]): Promise<void> {
    validateScope(scope);
    const key = durablePartitionKey(scope);
    const rows = this.parsePartition(key, this.readRaw(key), scope);
    const byId = new Map(rows.map((r) => [r.id, r]));
    for (const delta of deltas) {
      const existing = byId.get(delta.id);
      if (existing && checkDuplicate(existing, delta) === 'conflict') {
        throw new OfflineConflictError(`Stable operation ID ${delta.id} already exists with a different payload`);
      }
    }
    for (const delta of deltas) {
      if (!byId.has(delta.id)) {
        const row = cloneDelta(delta);
        rows.push(row);
        byId.set(row.id, row);
      }
    }
    this.writeRaw(key, JSON.stringify(rows));
  }
}

// ------------------------------------------------------------
// Native IndexedDB backend (browsers). Each method commits in a
// single IndexedDB transaction; failures abort without partial
// writes and the previous committed state is preserved.
// ------------------------------------------------------------

const IDB_DB_NAME = 'culinaryos-offline';
const IDB_DB_VERSION = 1;
const IDB_DELTAS_STORE = 'deltas';

export function indexedDBAvailable(): boolean {
  return (
    typeof globalThis !== 'undefined' &&
    'indexedDB' in (globalThis as Record<string, unknown>) &&
    (globalThis as { indexedDB?: unknown }).indexedDB !== null &&
    (globalThis as { indexedDB?: unknown }).indexedDB !== undefined
  );
}

function idbRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
  });
}

function idbTransactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'));
    tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted'));
  });
}

function openOfflineDb(): Promise<IDBDatabase> {
  return new Promise<IDBDatabase>((resolve, reject) => {
    try {
      const indexedDBRef = (globalThis as { indexedDB: IDBFactory }).indexedDB;
      const request = indexedDBRef.open(IDB_DB_NAME, IDB_DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(IDB_DELTAS_STORE)) {
          const store = db.createObjectStore(IDB_DELTAS_STORE, { keyPath: 'id' });
          store.createIndex('by_tenant_device', ['tenant_id', 'device_id'], { unique: false });
          store.createIndex('by_tenant', 'tenant_id', { unique: false });
        } else {
          const store = request.transaction?.objectStore(IDB_DELTAS_STORE);
          if (store && !store.indexNames.contains('by_tenant_device')) {
            store.createIndex('by_tenant_device', ['tenant_id', 'device_id'], { unique: false });
          }
          if (store && !store.indexNames.contains('by_tenant')) {
            store.createIndex('by_tenant', 'tenant_id', { unique: false });
          }
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(
          new OfflineStoreError(
            `IndexedDB open failed: ${request.error?.message ?? 'unknown error'}`,
            'READ_FAILED',
            { cause: request.error ?? undefined }
          )
        );
      request.onblocked = () =>
        reject(new OfflineStoreError('IndexedDB open blocked by another connection', 'READ_FAILED'));
    } catch (err) {
      reject(new OfflineStoreError('IndexedDB open threw', 'READ_FAILED', { cause: err }));
    }
  });
}

async function withOfflineDb<T>(fn: (db: IDBDatabase) => Promise<T>): Promise<T> {
  if (!indexedDBAvailable()) {
    throw new OfflineStoreError('IndexedDB is not available in this environment', 'READ_FAILED');
  }
  const db = await openOfflineDb();
  try {
    return await fn(db);
  } finally {
    try {
      db.close();
    } catch {
      // Close failures do not invalidate the committed transaction result.
    }
  }
}

function mapIdbError(err: unknown, prefix: string, fallback: OfflineErrorCode): OfflineStoreError {
  if (err instanceof OfflineStoreError) return err;
  const name = (err as { name?: string } | null)?.name ?? '';
  const message = err instanceof Error ? err.message : String(err);
  if (name.includes('Quota') || message.includes('Quota') || message.includes('quota')) {
    return new OfflineStoreError(`${prefix}: storage quota exceeded`, 'QUOTA_EXCEEDED', { cause: err });
  }
  return new OfflineStoreError(`${prefix}: ${message}`, fallback, { cause: err });
}

export class IndexedDBOfflineBackend implements OfflineBackend {
  readonly backendName = 'indexeddb';

  async list(scope: OfflineScope): Promise<DurableOfflineDelta[]> {
    validateScope(scope);
    try {
      return await withOfflineDb(async (db) => {
        const tx = db.transaction(IDB_DELTAS_STORE, 'readonly');
        const store = tx.objectStore(IDB_DELTAS_STORE);
        let rows: unknown[];
        try {
          const index = store.index('by_tenant_device');
          rows = (await idbRequest(index.getAll([scope.tenantId, scope.deviceId]))) as unknown[];
        } catch {
          // Fallback when the compound index is missing (older DB version):
          // read all and filter deterministically in code.
          const all = (await idbRequest(store.getAll())) as unknown[];
          rows = all.filter(
            (row) =>
              isRecord(row) && row.tenant_id === scope.tenantId && row.device_id === scope.deviceId
          );
        }
        await idbTransactionDone(tx);
        return rows.map((row) => {
          try {
            const valid = validateStoredRow(row);
            if (valid.tenant_id !== scope.tenantId || valid.device_id !== scope.deviceId) {
              throw new OfflineValidationError('Stored row scope mismatch');
            }
            return cloneDelta(valid);
          } catch (err) {
            throw new OfflineCorruptionError(
              `IndexedDB offline row is invalid; stored record preserved for recovery`,
              (() => {
                try {
                  return JSON.stringify(row);
                } catch {
                  return '[unserializable IndexedDB row]';
                }
              })(),
              err
            );
          }
        });
      });
    } catch (err) {
      throw mapIdbError(err, 'IndexedDB list failed', 'READ_FAILED');
    }
  }

  async insert(scope: OfflineScope, delta: DurableOfflineDelta): Promise<DurableOfflineDelta> {
    validateScope(scope);
    try {
      return await withOfflineDb(async (db) => {
        const tx = db.transaction(IDB_DELTAS_STORE, 'readwrite');
        const store = tx.objectStore(IDB_DELTAS_STORE);
        const existing = (await idbRequest(store.get(delta.id))) as unknown;
        if (existing !== undefined && existing !== null) {
          const valid = validateStoredRow(existing);
          if (checkDuplicate(valid, delta) === 'same') {
            // Idempotent replay of the same stable operation: do not duplicate.
            await idbTransactionDone(tx);
            return cloneDelta(valid);
          }
          tx.abort();
          throw new OfflineConflictError(
            `Stable operation ID ${delta.id} already exists with a different payload`
          );
        }
        await idbRequest(store.put(cloneDelta(delta)));
        await idbTransactionDone(tx);
        return cloneDelta(delta);
      });
    } catch (err) {
      throw mapIdbError(err, 'IndexedDB insert failed', 'WRITE_FAILED');
    }
  }

  async markSynced(scope: OfflineScope, ids: string[]): Promise<{ acked: string[]; ignored: string[] }> {
    validateScope(scope);
    if (ids.length === 0) return { acked: [], ignored: [] };
    try {
      return await withOfflineDb(async (db) => {
        const tx = db.transaction(IDB_DELTAS_STORE, 'readwrite');
        const store = tx.objectStore(IDB_DELTAS_STORE);
        const acked: string[] = [];
        const ignored: string[] = [];
        for (const id of ids) {
          const raw = (await idbRequest(store.get(id))) as unknown;
          if (raw === undefined || raw === null) {
            ignored.push(id);
            continue;
          }
          let row: DurableOfflineDelta;
          try {
            row = validateStoredRow(raw);
          } catch {
            // A corrupt row is never acked and never deleted here; surface
            // it as ignored so flush preserves evidence for recovery.
            ignored.push(id);
            continue;
          }
          if (row.tenant_id !== scope.tenantId || row.device_id !== scope.deviceId) {
            ignored.push(id);
            continue;
          }
          await idbRequest(store.put({ ...cloneDelta(row), synced: true }));
          acked.push(id);
        }
        await idbTransactionDone(tx);
        return { acked, ignored };
      });
    } catch (err) {
      throw mapIdbError(err, 'IndexedDB mark-synced failed', 'WRITE_FAILED');
    }
  }

  async bulkInsert(scope: OfflineScope, deltas: DurableOfflineDelta[]): Promise<void> {
    validateScope(scope);
    if (deltas.length === 0) return;
    try {
      await withOfflineDb(async (db) => {
        const tx = db.transaction(IDB_DELTAS_STORE, 'readwrite');
        const store = tx.objectStore(IDB_DELTAS_STORE);
        for (const delta of deltas) {
          const existing = (await idbRequest(store.get(delta.id))) as unknown;
          if (existing !== undefined && existing !== null) {
            const valid = validateStoredRow(existing);
            if (checkDuplicate(valid, delta) === 'conflict') {
              tx.abort();
              throw new OfflineConflictError(
                `Stable operation ID ${delta.id} already exists with a different payload`
              );
            }
            continue;
          }
          await idbRequest(store.put(cloneDelta(delta)));
        }
        await idbTransactionDone(tx);
      });
    } catch (err) {
      throw mapIdbError(err, 'IndexedDB bulk insert failed', 'WRITE_FAILED');
    }
  }
}

export function createAutoOfflineBackend(storage?: StorageLike): OfflineBackend {
  if (indexedDBAvailable()) return new IndexedDBOfflineBackend();
  const fallback =
    storage ??
    (typeof globalThis !== 'undefined'
      ? (globalThis as { localStorage?: StorageLike }).localStorage
      : undefined);
  if (fallback) return new LocalStorageOfflineBackend(fallback);
  return new MemoryOfflineBackend();
}

// ------------------------------------------------------------
// Durable queue: serialized mutations, tenant/device scoping,
// card containment, and ack filtering.
// ------------------------------------------------------------

export interface FlushResult {
  submitted: string[];
  acked: string[];
  ignored: string[];
  skippedCard: string[];
  pendingAfter: number;
}

export interface MigrateResult {
  migrated: string[];
  remainingLegacy: number;
  skippedOtherTenant: number;
}

export class DurableOfflineQueue {
  private backend: OfflineBackend;
  private tail: Promise<void> = Promise.resolve();

  constructor(opts: { backend: OfflineBackend }) {
    if (!opts || !opts.backend) throw new OfflineValidationError('DurableOfflineQueue requires a backend');
    this.backend = opts.backend;
  }

  get backendName(): string {
    return this.backend.backendName;
  }

  private async runExclusive<T>(fn: () => Promise<T>): Promise<T> {
    const prev = this.tail;
    let releaseTail: () => void = () => {};
    const current = new Promise<void>((resolve) => {
      releaseTail = resolve;
    });
    this.tail = current;
    await prev;
    try {
      return await fn();
    } finally {
      releaseTail();
    }
  }

  async enqueue(input: EnqueueDurableInput, scope: OfflineScope): Promise<DurableOfflineDelta> {
    const { id, timestamp } = validateEnqueueInput(input, scope);
    const delta: DurableOfflineDelta = {
      id,
      tenant_id: scope.tenantId,
      device_id: scope.deviceId,
      order_id: input.order_id,
      action: input.action,
      payload: JSON.parse(JSON.stringify(input.payload)) as Record<string, any>,
      timestamp,
      synced: false,
    };
    // Serialized read-modify-write: concurrent enqueue/ack calls cannot
    // interleave and lose writes. The write must succeed before success is
    // reported; any storage error throws to the caller.
    return this.runExclusive(() => this.backend.insert(scope, delta));
  }

  async getPending(scope: OfflineScope): Promise<DurableOfflineDelta[]> {
    validateScope(scope);
    return this.runExclusive(async () => {
      const all = await this.backend.list(scope);
      return all.filter((d) => !d.synced);
    });
  }

  async getAll(scope: OfflineScope): Promise<DurableOfflineDelta[]> {
    validateScope(scope);
    return this.runExclusive(() => this.backend.list(scope));
  }

  async markSynced(scope: OfflineScope, ids: string[]): Promise<{ acked: string[]; ignored: string[] }> {
    validateScope(scope);
    if (!Array.isArray(ids)) throw new OfflineValidationError('ids must be an array');
    for (const id of ids) {
      if (typeof id !== 'string' || id.length === 0) throw new OfflineValidationError('ack id must be non-empty');
    }
    return this.runExclusive(() => this.backend.markSynced(scope, ids));
  }

  async flush(
    scope: OfflineScope,
    syncApiUrl: string,
    headers: Record<string, string> = {},
    fetchImpl?: typeof fetch
  ): Promise<FlushResult> {
    validateScope(scope);
    if (typeof syncApiUrl !== 'string' || syncApiUrl.length === 0) {
      throw new OfflineValidationError('syncApiUrl must be a non-empty string');
    }
    const fetchFn = fetchImpl ?? globalThis.fetch;
    if (typeof fetchFn !== 'function') throw new OfflineValidationError('fetch implementation unavailable');

    // Snapshot pending under lock, release across network I/O so concurrent
    // enqueues during flush are preserved (never deadlock, never lost).
    const snapshot = await this.runExclusive(async () => {
      const all = await this.backend.list(scope);
      return all.filter((d) => !d.synced);
    });
    const submittable = snapshot.filter(isSubmittableDelta);
    const skippedCard = snapshot.filter((d) => !isSubmittableDelta(d)).map((d) => d.id);
    if (submittable.length === 0) {
      return { submitted: [], acked: [], ignored: [], skippedCard, pendingAfter: snapshot.length };
    }
    const submittedIds = submittable.map((d) => d.id);
    const submittedSet = new Set(submittedIds);

    let response: Response;
    try {
      response = await fetchFn(`${syncApiUrl}/v1/pos/sync-deltas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ deltas: submittable }),
      });
    } catch {
      // Network offline: preserve the full queue for the next attempt.
      const pendingAfter = (await this.getPending(scope).catch(() => snapshot)).length;
      return { submitted: submittedIds, acked: [], ignored: [], skippedCard, pendingAfter };
    }
    if (!response.ok) {
      const pendingAfter = (await this.getPending(scope).catch(() => snapshot)).length;
      return { submitted: submittedIds, acked: [], ignored: [], skippedCard, pendingAfter };
    }
    const body = await (response.json as () => Promise<unknown>)().catch(() => ({}));
    const confirmed = extractConfirmedIds(body);
    // Only acknowledge submitted known IDs. Unknown/remote IDs in the
    // response are ignored and never create or mutate local rows.
    const knownAcks = confirmed.filter((id) => submittedSet.has(id));
    const unknownIds = confirmed.filter((id) => !submittedSet.has(id));
    // Never wipe on bare 200: no confirmed IDs means no ack.
    if (knownAcks.length === 0) {
      const pendingAfter = (await this.getPending(scope).catch(() => snapshot)).length;
      return { submitted: submittedIds, acked: [], ignored: unknownIds, skippedCard, pendingAfter };
    }
    const marked = await this.markSynced(scope, knownAcks);
    const pendingAfter = (await this.getPending(scope).catch(() => [])).length;
    return {
      submitted: submittedIds,
      acked: marked.acked,
      ignored: [...unknownIds, ...marked.ignored],
      skippedCard,
      pendingAfter,
    };
  }

  /**
   * Transactional legacy migration: reads the legacy global localStorage
   * queue, validates every in-scope row, commits to the durable backend,
   * then removes only migrated rows from legacy. The legacy original is
   * preserved until the durable commit succeeds; any failure throws with
   * legacy untouched (or with only other-tenant rows remaining).
   */
  async migrateLegacy(
    scope: OfflineScope,
    opts?: { legacyStorage?: StorageLike; legacyKey?: string }
  ): Promise<MigrateResult> {
    validateScope(scope);
    const legacyKey = opts?.legacyKey ?? LEGACY_OFFLINE_QUEUE_KEY;
    const storage =
      opts?.legacyStorage ??
      (typeof globalThis !== 'undefined'
        ? (globalThis as { localStorage?: StorageLike }).localStorage
        : undefined);
    if (!storage) throw new OfflineStoreError('Legacy migration requires localStorage access', 'MIGRATION_FAILED');
    let raw: string | null;
    try {
      raw = storage.getItem(legacyKey);
    } catch (err) {
      throw new OfflineStoreError('Cannot read legacy offline queue', 'READ_FAILED', { cause: err });
    }
    if (raw === null || raw === '') return { migrated: [], remainingLegacy: 0, skippedOtherTenant: 0 };
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      throw new OfflineCorruptionError('Legacy offline queue is corrupt; original preserved', raw, err);
    }
    if (!Array.isArray(parsed)) {
      throw new OfflineCorruptionError('Legacy offline queue is not an array; original preserved', raw);
    }
    type LegacyRow = {
      id?: unknown;
      tenant_id?: unknown;
      device_id?: unknown;
      order_id?: unknown;
      action?: unknown;
      payload?: unknown;
      timestamp?: unknown;
      synced?: unknown;
    };
    const inScope: DurableOfflineDelta[] = [];
    const remaining: unknown[] = [];
    let skippedOtherTenant = 0;
    for (const row of parsed as LegacyRow[]) {
      try {
        if (!isRecord(row)) throw new OfflineValidationError('Legacy row must be an object');
        if (typeof row.tenant_id !== 'string' || row.tenant_id.length === 0) {
          throw new OfflineValidationError('Legacy row tenant_id invalid');
        }
        if (row.tenant_id !== scope.tenantId) {
          remaining.push(row);
          skippedOtherTenant += 1;
          continue;
        }
        const normalized: DurableOfflineDelta = {
          id: typeof row.id === 'string' && row.id.length > 0 ? row.id : generateOpId(),
          tenant_id: row.tenant_id,
          device_id:
            typeof row.device_id === 'string' && row.device_id.length > 0 ? row.device_id : scope.deviceId,
          order_id: typeof row.order_id === 'string' ? row.order_id : '',
          action: (typeof row.action === 'string' && ALLOWED_ACTIONS.has(row.action)
            ? row.action
            : (() => {
                throw new OfflineValidationError('Legacy row action invalid');
              })()) as DurableOfflineAction,
          payload: (() => {
            if (!isRecord(row.payload)) {
              throw new OfflineValidationError('Legacy row payload invalid');
            }
            return row.payload as Record<string, any>;
          })(),
          timestamp:
            typeof row.timestamp === 'string' && !Number.isNaN(Date.parse(row.timestamp))
              ? row.timestamp
              : new Date().toISOString(),
          synced: row.synced === true,
        };
        if (normalized.order_id.length === 0) throw new OfflineValidationError('Legacy row order_id invalid');
        // Preserve even card-like legacy rows for audit; flush skips them.
        // Scope the device to this device only when legacy lacks one.
        if (normalized.device_id !== scope.deviceId) {
          // A legacy row bound to another device is preserved in legacy for
          // that device's own migration; it is not pulled cross-device here.
          remaining.push(row);
          skippedOtherTenant += 1;
          continue;
        }
        inScope.push(normalized);
      } catch (err) {
        throw new OfflineCorruptionError('Legacy offline queue contains an invalid row; original preserved', raw, err);
      }
    }
    if (inScope.length === 0) {
      return { migrated: [], remainingLegacy: remaining.length, skippedOtherTenant };
    }
    // Commit durably first; only then rewrite legacy without migrated rows.
    // bulkInsert is all-or-nothing per backend (single transaction/write).
    await this.runExclusive(() => this.backend.bulkInsert(scope, inScope));
    try {
      if (remaining.length === 0) {
        storage.removeItem(legacyKey);
      } else {
        storage.setItem(legacyKey, JSON.stringify(remaining));
      }
    } catch (err) {
      // Durable commit already succeeded and is preserved; legacy cleanup
      // failed, so a later retry is idempotent (same IDs, same payloads).
      throw new OfflineStoreError(
        'Legacy cleanup after durable commit failed; durable rows preserved, retry cleanup',
        'MIGRATION_FAILED',
        { cause: err }
      );
    }
    return {
      migrated: inScope.map((d) => d.id),
      remainingLegacy: remaining.length,
      skippedOtherTenant,
    };
  }
}

// ------------------------------------------------------------
// Default singleton for production POS callers. Tests should
// construct DurableOfflineQueue with explicit fake backends.
// ------------------------------------------------------------

let defaultQueue: DurableOfflineQueue | null = null;

export function getDefaultDurableQueue(): DurableOfflineQueue {
  if (!defaultQueue) defaultQueue = new DurableOfflineQueue({ backend: createAutoOfflineBackend() });
  return defaultQueue;
}

/** Test-only override for the default singleton. */
export function __setDefaultDurableQueueForTests(queue: DurableOfflineQueue | null): void {
  defaultQueue = queue;
}

export async function enqueueDurableDelta(
  input: EnqueueDurableInput,
  scope: OfflineScope
): Promise<DurableOfflineDelta> {
  return getDefaultDurableQueue().enqueue(input, scope);
}

export async function getPendingDurableQueue(scope: OfflineScope): Promise<DurableOfflineDelta[]> {
  return getDefaultDurableQueue().getPending(scope);
}

export async function getDurableQueue(scope: OfflineScope): Promise<DurableOfflineDelta[]> {
  return getDefaultDurableQueue().getAll(scope);
}

export async function markDurableDeltasSynced(
  scope: OfflineScope,
  ids: string[]
): Promise<{ acked: string[]; ignored: string[] }> {
  return getDefaultDurableQueue().markSynced(scope, ids);
}

export async function flushDurableQueue(
  scope: OfflineScope,
  syncApiUrl: string,
  headers: Record<string, string> = {},
  fetchImpl?: typeof fetch
): Promise<FlushResult> {
  return getDefaultDurableQueue().flush(scope, syncApiUrl, headers, fetchImpl);
}

export async function migrateLegacyQueueToDurable(
  scope: OfflineScope,
  opts?: { legacyStorage?: StorageLike; legacyKey?: string }
): Promise<MigrateResult> {
  return getDefaultDurableQueue().migrateLegacy(scope, opts);
}
