// ============================================================
// @culinaryos/shared — Offline POS Command Executors (R4 follow-up)
// Dependency-injected create_order / apply_discount with durable-first
// offline fallbacks. Closes the R4 remaining gap: useCreateOrder and
// useApplyDiscount mock fallbacks enqueue no delta.
//
// Rule: durable enqueue BEFORE any local mock mutation or success.
// Persistence failure throws with no local success recorded. A fetch
// throw (no HTTP response) is the ONLY offline-eligible outcome; any
// received response (!ok) throws the server message and NEVER falls
// back — 400/401/403/404/409/422 are explicit denials, not offline.
//
// Stable identities: operation ID (delta-<uuid>) and order ID
// (<uuid> for created orders) are generated once per attempt and
// reused for both the queued delta and the mock row. Same operation
// ID + same payload replays idempotently; same ID + different
// payload conflicts and preserves the original (see offline-store).
//
// ---- Payload contracts (client -> POST /v1/pos/sync-deltas) ----
// Server replay is Codex-owned (apps/server/src/routes/pos-sync.ts).
// These contracts make integration concrete; replay gaps are noted.
//
// create_order:
//   order_id: client-generated stable ID, format `<uuid>`.
//   payload: { table_number, tableNumber, cover_count, coverCount,
//     server_name, serverName, status: 'open' } — both casings are
//     sent because replay reads tableNumber/table_number but only
//     camelCase coverCount/serverName. Replay upserts pos_orders with
//     id = order_id (idempotent onConflict id).
//
// apply_discount:
//   order_id: existing order ID.
//   payload: { discount_percent, discountPercent (0-100),
//     discount_flat, discountFlat (integer cents >= 0) } — both
//     casings; replay reads both. Client omits `total`; replay sets
//     only the discount columns. Offline input is validated locally
//     (the live discount route currently validates nothing).
//
// void_line_item (POS enqueue only; replay NOT implemented):
//   order_id: existing order ID.
//   payload: { itemId, reasonCode, isCooked, notes } — as enqueued by
//   useVoidLineItem (durable-first). pos-sync has NO void_line_item
//   case, so the route reports unknown-action and never acks; rows
//   stay pending as preserved evidence until the server owner adds
//   replay. See VOID_LINE_ITEM_CONTRACT below.
//
// Limitations (do not overclaim):
// - Queue durability, partitioning, and ack semantics are owned by
//   ./offline-store.ts; this file only guarantees ordering (persist
//   before mutate) and fallback gating (never on server denial).
// - Offline discount requires the order to exist in the local mock
//   store; unknown orders fail explicitly instead of queuing blind.
// ============================================================

import {
  generateOpId,
  OfflineStoreError,
  type DurableOfflineDelta,
  type EnqueueDurableInput,
  type OfflineScope,
} from './offline-store.js';

export interface OfflineCommandQueue {
  enqueue(input: EnqueueDurableInput, scope: OfflineScope): Promise<DurableOfflineDelta>;
}

export interface OfflineCommandMockStore {
  readMockOrders(): any[];
  saveMockOrders(orders: any[]): void;
}

export interface OfflineCommandDeps {
  fetchImpl: typeof fetch;
  apiBase: string;
  headers: Record<string, string>;
  queue: OfflineCommandQueue;
  resolveScope: () => OfflineScope;
  store: OfflineCommandMockStore;
  generateOrderId?: () => string;
  generateOperationId?: () => string;
  nowIso?: () => string;
}

export interface CreateOrderCommandInput {
  tenantId: string;
  table_number?: string | null;
  cover_count?: number;
  server_name?: string;
}

export interface ApplyDiscountCommandInput {
  tenantId: string;
  orderId: string;
  discountPercent: number;
  discountFlat: number;
}

export type OfflinePosCommandErrorCode =
  | 'PERSISTENCE_FAILED'
  | 'SCOPE_FAILED'
  | 'ORDER_NOT_FOUND'
  | 'VALIDATION_FAILED';

export class OfflinePosCommandError extends Error {
  readonly code: OfflinePosCommandErrorCode;
  constructor(message: string, code: OfflinePosCommandErrorCode, opts?: { cause?: unknown }) {
    super(message, opts?.cause !== undefined ? { cause: opts.cause } : undefined);
    this.name = 'OfflinePosCommandError';
    this.code = code;
  }
}

/** HTTP statuses that are explicit server denials, never offline. Any
 * received response (including 5xx) forbids the offline path; these
 * auth/validation/conflict statuses must never be disguised as
 * network loss. */
export const NO_FALLBACK_STATUSES: ReadonlySet<number> = new Set([400, 401, 403, 404, 409, 422]);

export function isNoFallbackStatus(status: number): boolean {
  return NO_FALLBACK_STATUSES.has(status);
}

export const CREATE_ORDER_CONTRACT = {
  action: 'create_order',
  orderIdFormat: '<uuid>',
  operationIdFormat: 'delta-<uuid>',
  payloadKeys: [
    'table_number',
    'tableNumber',
    'cover_count',
    'coverCount',
    'server_name',
    'serverName',
    'status',
  ],
  serverReplay: 'UPSERT_POS_ORDERS_BY_ID',
} as const;

export const APPLY_DISCOUNT_CONTRACT = {
  action: 'apply_discount',
  payloadKeys: ['discount_percent', 'discountPercent', 'discount_flat', 'discountFlat'],
  serverReplay: 'UPDATE_POS_ORDERS_DISCOUNT_COLUMNS',
} as const;

export const VOID_LINE_ITEM_CONTRACT = {
  action: 'void_line_item',
  payloadKeys: ['itemId', 'reasonCode', 'isCooked', 'notes'],
  serverReplay: 'NOT_IMPLEMENTED',
  note: 'pos-sync reports unknown-action and never acks; rows stay pending as evidence',
} as const;

export interface CreateOrderDeltaPayload {
  table_number: string | null;
  tableNumber: string | null;
  cover_count: number;
  coverCount: number;
  server_name: string;
  serverName: string;
  status: 'open';
}

export function buildCreateOrderPayload(input: {
  table_number?: string | null;
  cover_count?: number;
  server_name?: string;
}): CreateOrderDeltaPayload {
  const table = typeof input.table_number === 'string' && input.table_number.length > 0
    ? input.table_number
    : null;
  const cover = typeof input.cover_count === 'number'
    && Number.isInteger(input.cover_count)
    && input.cover_count > 0
    ? input.cover_count
    : 1;
  const server = typeof input.server_name === 'string' && input.server_name.length > 0
    ? input.server_name
    : 'Server';
  return {
    table_number: table,
    tableNumber: table,
    cover_count: cover,
    coverCount: cover,
    server_name: server,
    serverName: server,
    status: 'open',
  };
}

export interface ApplyDiscountDeltaPayload {
  discount_percent: number;
  discountPercent: number;
  discount_flat: number;
  discountFlat: number;
}

export function buildApplyDiscountPayload(input: {
  discountPercent: number;
  discountFlat: number;
}): ApplyDiscountDeltaPayload {
  const percent = input.discountPercent;
  if (typeof percent !== 'number' || !Number.isFinite(percent) || percent < 0 || percent > 100) {
    throw new OfflinePosCommandError(
      `Discount percent must be a number between 0 and 100; received ${String(percent)}`,
      'VALIDATION_FAILED'
    );
  }
  const flat = input.discountFlat;
  if (
    typeof flat !== 'number' || !Number.isInteger(flat) || flat < 0 || !Number.isSafeInteger(flat)
  ) {
    throw new OfflinePosCommandError(
      `Discount flat must be an integer cents value >= 0; received ${String(flat)}`,
      'VALIDATION_FAILED'
    );
  }
  return {
    discount_percent: percent,
    discountPercent: percent,
    discount_flat: flat,
    discountFlat: flat,
  };
}

export function generateOfflineOrderId(): string {
  const cryptoRef = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (!cryptoRef?.randomUUID) {
    throw new OfflinePosCommandError(
      'Cannot generate stable order ID: crypto.randomUUID unavailable',
      'PERSISTENCE_FAILED'
    );
  }
  return cryptoRef.randomUUID();
}

async function safeJson(res: Response): Promise<any> {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

function describeCause(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

/** Storage/infra queue failures become explicit persistence errors.
 * Semantic queue decisions (validation/conflict/card) propagate as-is:
 * all are explicit failures with no local success recorded. */
function throwQueueError(err: unknown, what: 'Order' | 'Discount'): never {
  if (err instanceof OfflinePosCommandError) throw err;
  if (
    err instanceof OfflineStoreError
    && (err.code === 'VALIDATION_FAILED' || err.code === 'CONFLICT' || err.code === 'CARD_OFFLINE_REJECTED')
  ) {
    throw err;
  }
  throw new OfflinePosCommandError(
    `${what} could not be saved on this device: ${describeCause(err)}`,
    'PERSISTENCE_FAILED',
    { cause: err }
  );
}

function resolveOfflineScope(deps: OfflineCommandDeps, what: 'Order' | 'Discount'): OfflineScope {
  try {
    return deps.resolveScope();
  } catch (err) {
    throw new OfflinePosCommandError(
      `${what} could not be saved on this device: ${describeCause(err)}`,
      'SCOPE_FAILED',
      { cause: err }
    );
  }
}

function resolveIds(
  deps: OfflineCommandDeps,
  what: 'Order' | 'Discount',
  needOrderId: boolean
): { orderId: string | null; opId: string } {
  try {
    const genOrder = deps.generateOrderId ?? generateOfflineOrderId;
    const genOp = deps.generateOperationId ?? generateOpId;
    return { orderId: needOrderId ? genOrder() : null, opId: genOp() };
  } catch (err) {
    if (err instanceof OfflinePosCommandError) throw err;
    throw new OfflinePosCommandError(
      `${what} could not be saved on this device: ${describeCause(err)}`,
      'PERSISTENCE_FAILED',
      { cause: err }
    );
  }
}

async function runOfflineCreateOrder(
  deps: OfflineCommandDeps,
  input: CreateOrderCommandInput,
  preAllocated?: { orderId: string; opId: string }
): Promise<any> {
  const scope = resolveOfflineScope(deps, 'Order');
  const { orderId, opId } = preAllocated ?? resolveIds(deps, 'Order', true);
  const createdId = orderId as string;
  const payload = buildCreateOrderPayload(input);
  const timestamp = (deps.nowIso ?? (() => new Date().toISOString()))();
  try {
    await deps.queue.enqueue(
      {
        id: opId,
        tenant_id: input.tenantId,
        device_id: scope.deviceId,
        order_id: createdId,
        action: 'create_order',
        payload: { ...payload },
        timestamp,
      },
      scope
    );
  } catch (err) {
    throwQueueError(err, 'Order');
  }
  // Only after durable persistence: mirror to the mock store with the
  // SAME stable identities (no regeneration between queue and mock).
  const newOrder = {
    id: createdId,
    tenant_id: input.tenantId,
    status: 'open',
    table_number: payload.table_number,
    cover_count: payload.cover_count,
    server_name: payload.server_name,
    items: [],
    total: 0,
    created_at: timestamp,
  };
  const orders = deps.store.readMockOrders();
  orders.push(newOrder);
  deps.store.saveMockOrders(orders);
  return newOrder;
}

export async function runCreateOrderCommand(
  deps: OfflineCommandDeps,
  input: CreateOrderCommandInput
): Promise<any> {
  // Stable identity allocation upfront: pre-allocate canonical order UUID
  // and operation ID before the first network attempt. If the HTTP request
  // commits on the server but the response drops (timeout/network loss), the
  // fallback enqueues the EXACT SAME identities to prevent duplicate orders.
  const { orderId, opId } = resolveIds(deps, 'Order', true);
  const createdId = orderId as string;

  let res: Response;
  try {
    res = await deps.fetchImpl(`${deps.apiBase}/v1/orders`, {
      method: 'POST',
      headers: {
        ...deps.headers,
        'Idempotency-Key': opId,
      },
      body: JSON.stringify({
        id: createdId,
        tableNumber: input.table_number || '1',
        coverCount: input.cover_count || 1,
        serverName: input.server_name || 'Server',
      }),
    });
  } catch {
    // No HTTP response reached us: the only offline-eligible outcome.
    // Retain and reuse the exact pre-allocated orderId and opId.
    return runOfflineCreateOrder(deps, input, { orderId: createdId, opId });
  }
  if (res.ok) {
    const json = await safeJson(res);
    // Online success returns server data; never mint a local mock row
    // on an online response (that would duplicate the order).
    return json?.data ?? json;
  }
  // A response arrived, so we are not offline. Auth/validation/
  // conflict denials surface here and must never queue or mutate.
  const body = await safeJson(res);
  throw new Error(body?.error?.message ?? `Create order failed (${res.status})`);
}

async function runOfflineApplyDiscount(
  deps: OfflineCommandDeps,
  input: ApplyDiscountCommandInput,
  preAllocatedOpId?: string
): Promise<any> {
  // Validate before any read/write: invalid discounts never queue.
  const payload = buildApplyDiscountPayload({
    discountPercent: input.discountPercent,
    discountFlat: input.discountFlat,
  });
  const orders = deps.store.readMockOrders();
  const order = orders.find((o: any) => o?.id === input.orderId);
  if (!order) {
    throw new OfflinePosCommandError(
      `Order ${input.orderId} not found on this device; discount was not applied`,
      'ORDER_NOT_FOUND'
    );
  }
  const scope = resolveOfflineScope(deps, 'Discount');
  const opId = preAllocatedOpId ?? resolveIds(deps, 'Discount', false).opId;
  const timestamp = (deps.nowIso ?? (() => new Date().toISOString()))();
  try {
    await deps.queue.enqueue(
      {
        id: opId,
        tenant_id: input.tenantId,
        device_id: scope.deviceId,
        order_id: input.orderId,
        action: 'apply_discount',
        payload: { ...payload },
        timestamp,
      },
      scope
    );
  } catch (err) {
    throwQueueError(err, 'Discount');
  }
  // Only after durable persistence: apply to the same mock row.
  order.discount_percent = payload.discount_percent;
  order.discount_flat = payload.discount_flat;
  deps.store.saveMockOrders(orders);
  return order;
}

export async function runApplyDiscountCommand(
  deps: OfflineCommandDeps,
  input: ApplyDiscountCommandInput
): Promise<any> {
  // Pre-allocate stable operation identity upfront for idempotency
  const { opId } = resolveIds(deps, 'Discount', false);

  let res: Response;
  try {
    res = await deps.fetchImpl(`${deps.apiBase}/v1/orders/${input.orderId}/discount`, {
      method: 'POST',
      headers: {
        ...deps.headers,
        'Idempotency-Key': opId,
      },
      body: JSON.stringify({ discountPercent: input.discountPercent, discountFlat: input.discountFlat }),
    });
  } catch {
    // No HTTP response reached us: the only offline-eligible outcome.
    return runOfflineApplyDiscount(deps, input, opId);
  }
  if (res.ok) {
    const json = await safeJson(res);
    return json?.data ?? json;
  }
  // A response arrived, so we are not offline. Auth/validation/
  // conflict denials surface here and must never queue or mutate.
  const body = await safeJson(res);
  throw new Error(body?.error?.message ?? `Apply discount failed (${res.status})`);
}
