import { DomainError, integer, text, uuid } from './domain.js';
import type { NativeExecutor, NativeVerifiedIdentity } from './executor.js';
import { getOrder } from './orders.js';
import { claimReceipt, finalizeReceipt, operationKey, requestFingerprint } from './receipts.js';
import { managerGateNative } from './identity.js';

export interface PaymentRow {
  id: string;
  tenant_id: string;
  order_id: string;
  amount: number;
  method: string;
  status: string;
  tip_amount: number;
  tip_cents: number;
  refunded_cents: number;
  reference_id: string | null;
  idempotency_key: string | null;
  stripe_payment_intent_id: string | null;
}

const CASH_COMP = new Set(['cash', 'comp']);

/**
 * Cash/comp only. Cards require verified processor evidence and are rejected
 * here; offline card settlement is never inferred from a queue flag. Comp
 * (giving product away) additionally requires a human manager session.
 * Idempotent on (tenant, operation) with atomic claims: concurrent rivals
 * serialize on the receipt key and losers replay or conflict, never duplicate.
 */
export async function recordCashCompPayment(
  tx: NativeExecutor,
  auth: NativeVerifiedIdentity,
  tenantId: string,
  input: { orderId: string; method: string; amount: number; tipCents?: number; operationId: string },
): Promise<{ payment: PaymentRow; replayed: boolean }> {
  const orderId = uuid(input.orderId, 'order');
  const method = text(input.method, 'method', 32).toLowerCase();
  if (!CASH_COMP.has(method)) {
    throw new DomainError('VALIDATION_ERROR', 'Only cash/comp payments may be recorded here; cards require verified processor settlement', 422);
  }
  if (method === 'comp' && managerGateNative(auth) !== 'ok') {
    throw new DomainError('FORBIDDEN', 'Complimentary payments require a human manager session', 403);
  }
  const amount = integer(input.amount, 'amount');
  const tip = input.tipCents === undefined ? 0 : integer(input.tipCents, 'tip');
  const key = operationKey(input.operationId);
  const hash = requestFingerprint({ orderId, method, amount, tip });
  const claim = await claimReceipt(tx, tenantId, key, hash);
  if (!claim.owned) {
    const prior = claim.receipt.result as { payment?: PaymentRow };
    if (!prior.payment) throw new DomainError('INTERNAL_ERROR', 'Stored payment receipt is incomplete', 500);
    return { payment: prior.payment, replayed: true };
  }
  const order = await getOrder(tx, tenantId, orderId);
  if (order.status === 'paid' || order.status === 'voided') {
    throw new DomainError('CONFLICT', `Order is ${order.status}; payment cannot be recorded`, 409);
  }
  if (amount !== order.total) {
    throw new DomainError('VALIDATION_ERROR', 'Payment amount must equal the authoritative order total', 422);
  }
  const inserted = await tx.query<PaymentRow>(
    `INSERT INTO public.payments (tenant_id, order_id, amount, method, status, tip_amount, tip_cents, idempotency_key, processed_at)
     VALUES ($1, $2, $3, $4, 'completed', $5, $5, $6, now()) RETURNING *`,
    [tenantId, orderId, amount, method, tip, key],
  );
  const payment = inserted.rows[0];
  if (!payment) throw new DomainError('INTERNAL_ERROR', 'Payment insert failed', 500);
  await tx.query('UPDATE public.pos_orders SET status = $3, paid_at = now() WHERE tenant_id = $1 AND id = $2', [
    tenantId, orderId, 'paid',
  ]);
  await finalizeReceipt(tx, tenantId, key, JSON.parse(JSON.stringify({ payment })) as Record<string, unknown>);
  return { payment, replayed: false };
}

export interface WebhookInboxRow {
  id: string;
  tenant_id: string;
  stripe_event_id: string;
  event_type: string;
  status: string;
}

/**
 * Durable webhook inbox: persist before ack, dedupe by Stripe event ID.
 * Tenant must already be resolved from verified metadata; unattributed
 * events are rejected, never stored. Provider signature verification
 * happens in the route before this call; test-mode traces remain unfinished.
 */
export async function saveWebhookEvent(
  tx: NativeExecutor,
  tenantId: string,
  input: { stripeEventId: string; eventType: string; payload: unknown },
): Promise<{ inbox: WebhookInboxRow; duplicate: boolean }> {
  const eventId = text(input.stripeEventId, 'event', 128);
  const eventType = text(input.eventType, 'event type', 128);
  if (!input.payload || typeof input.payload !== 'object') {
    throw new DomainError('VALIDATION_ERROR', 'Webhook payload must be an object', 422);
  }
  const existing = await tx.query<WebhookInboxRow>(
    'SELECT id, tenant_id, stripe_event_id, event_type, status FROM public.stripe_webhook_inbox WHERE stripe_event_id = $1',
    [eventId],
  );
  const row = existing.rows[0];
  if (row) {
    if (row.tenant_id !== tenantId) {
      throw new DomainError('CONFLICT', 'Webhook event already recorded for another tenant', 409);
    }
    return { inbox: row, duplicate: true };
  }
  const inserted = await tx.query<WebhookInboxRow>(
    `INSERT INTO public.stripe_webhook_inbox (tenant_id, stripe_event_id, event_type, status, payload)
     VALUES ($1, $2, $3, 'received', $4) RETURNING id, tenant_id, stripe_event_id, event_type, status`,
    [tenantId, eventId, eventType, JSON.stringify(input.payload)],
  );
  const inbox = inserted.rows[0];
  if (!inbox) throw new DomainError('INTERNAL_ERROR', 'Webhook inbox insert failed', 500);
  return { inbox, duplicate: false };
}

/**
 * Reconcile a succeeded PaymentIntent against tenant-scoped ledger rows.
 * The stored payment row (locked by intent + tenant) must be pending, must
 * match the amount, and must belong to the requested order: the paid order
 * is taken from the STORED row, never from a caller-supplied ID, so a
 * mismatched request matches nothing instead of paying a stranger's check.
 * Currency/connected-account binding is a recorded schema gap (the payments
 * table carries no currency/merchant columns); this service must only be
 * called from a signature-verified webhook path that resolves those upstream.
 * Unknown timeouts stay pending and never assume success.
 */
export async function reconcileSucceededIntent(
  tx: NativeExecutor,
  tenantId: string,
  input: { stripeIntentId: string; orderId: string; amountCents: number },
): Promise<{ matched: boolean }> {
  const intentId = text(input.stripeIntentId, 'intent', 128);
  const orderId = uuid(input.orderId, 'order');
  const amount = integer(input.amountCents, 'amount');
  const found = await tx.query<PaymentRow>(
    `SELECT * FROM public.payments WHERE tenant_id = $1 AND stripe_payment_intent_id = $2 FOR UPDATE`,
    [tenantId, intentId],
  );
  const payment = found.rows[0];
  if (!payment) return { matched: false };
  if (payment.status !== 'pending') return { matched: false };
  if (payment.amount !== amount) return { matched: false };
  if (payment.order_id !== orderId) return { matched: false };
  await tx.query(
    `UPDATE public.payments SET status = 'completed', processed_at = now(), reference_id = $3
     WHERE tenant_id = $1 AND id = $2`,
    [tenantId, payment.id, intentId],
  );
  await tx.query('UPDATE public.pos_orders SET status = $3, paid_at = now() WHERE tenant_id = $1 AND id = $2', [
    tenantId, payment.order_id, 'paid',
  ]);
  return { matched: true };
}

/** Manager-human-only partial refund with cumulative cap enforcement. */
export async function recordRefund(
  tx: NativeExecutor,
  auth: NativeVerifiedIdentity,
  tenantId: string,
  input: { paymentId: string; amountCents: number; reason: string; operationId: string },
): Promise<{ payment: PaymentRow; replayed: boolean }> {
  if (managerGateNative(auth) !== 'ok') {
    throw new DomainError('FORBIDDEN', 'Refunds require a human manager session', 403);
  }
  const paymentId = uuid(input.paymentId, 'payment');
  const amount = integer(input.amountCents, 'refund', 1);
  const reason = text(input.reason, 'reason', 500);
  const key = operationKey(input.operationId);
  const hash = requestFingerprint({ paymentId, amount, reason });
  const claim = await claimReceipt(tx, tenantId, key, hash);
  if (!claim.owned) {
    const prior = claim.receipt.result as { payment?: PaymentRow };
    if (!prior.payment) throw new DomainError('INTERNAL_ERROR', 'Stored refund receipt is incomplete', 500);
    return { payment: prior.payment, replayed: true };
  }
  const locked = await tx.query<PaymentRow>('SELECT * FROM public.payments WHERE tenant_id = $1 AND id = $2 FOR UPDATE', [
    tenantId, paymentId,
  ]);
  const payment = locked.rows[0];
  if (!payment) throw new DomainError('NOT_FOUND', 'Payment not found', 404);
  if (payment.status !== 'completed' && payment.status !== 'refunded') {
    throw new DomainError('CONFLICT', `Payment is ${payment.status}; only completed payments can be refunded`, 409);
  }
  if (payment.refunded_cents + amount > payment.amount) {
    throw new DomainError('VALIDATION_ERROR', 'Cumulative refunds cannot exceed the captured amount', 422);
  }
  const updated = await tx.query<PaymentRow>(
    `UPDATE public.payments SET refunded_cents = refunded_cents + $3, status = CASE WHEN refunded_cents + $3 >= amount THEN 'refunded' ELSE status END
     WHERE tenant_id = $1 AND id = $2 RETURNING *`,
    [tenantId, paymentId, amount],
  );
  const row = updated.rows[0];
  if (!row) throw new DomainError('INTERNAL_ERROR', 'Refund update failed', 500);
  await finalizeReceipt(tx, tenantId, key, JSON.parse(JSON.stringify({ payment: row })) as Record<string, unknown>);
  return { payment: row, replayed: false };
}
