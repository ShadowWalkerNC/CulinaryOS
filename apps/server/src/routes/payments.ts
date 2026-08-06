// ============================================================
// CulinaryOS — Stripe Payments Route
// POST /v1/payments/checkout  — create PaymentIntent
// POST /v1/payments/capture   — verify + close order
// POST /v1/payments/refund    — full or partial refund
// GET  /v1/payments/:orderId  — list payments for an order
// ============================================================

import { Hono }         from 'hono';
import type { Context } from 'hono';
import Stripe           from 'stripe';
import { requireTenant, ok, err } from '../middleware/auth.js';
import type { Env } from '../types.js';

export const paymentsRoutes = new Hono<Env>();

paymentsRoutes.use('*', requireTenant);

function stripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-04-10' });
}

// ============================================================
// POST /v1/payments/checkout
// Body: { order_id, tip_cents?, receipt_email? }
// ============================================================
paymentsRoutes.post('/checkout', async (c: Context) => {
  const tenantId = c.get('tenantId') as string;
  const supabase = c.get('supabase');
  const body     = await c.req.json<{
    order_id:       string;
    tip_cents?:     number;
    receipt_email?: string;
  }>();

  if (!body.order_id) return err(c, 'VALIDATION_ERROR', 'order_id is required', 400);
  if (!supabase) return err(c, 'SERVICE_UNAVAILABLE', 'Database not configured', 503);

  const { data: order, error: orderErr } = await supabase
    .from('pos_orders')
    .select('id, total, status, tenant_id')
    .eq('id', body.order_id)
    .eq('tenant_id', tenantId)
    .single();

  if (orderErr || !order) return err(c, 'NOT_FOUND', 'Order not found', 404);
  if (order.status === 'paid')   return err(c, 'CONFLICT', 'Order already paid', 409);
  if (order.status === 'voided') return err(c, 'CONFLICT', 'Order is voided', 409);

  const tipCents    = body.tip_cents ?? 0;
  const chargeCents = order.total + tipCents;

  if (chargeCents <= 0) return err(c, 'VALIDATION_ERROR', 'Charge amount must be > 0', 400);

  const intent = await stripe().paymentIntents.create({
    amount:   chargeCents,
    currency: 'usd',
    automatic_payment_methods: { enabled: true },
    metadata: { tenant_id: tenantId, order_id: body.order_id },
  });

  // Do not persist client_secret long-term — return once to client
  const { data: payment, error: payErr } = await supabase
    .from('payments')
    .insert({
      tenant_id:                tenantId,
      order_id:                 body.order_id,
      amount:                   chargeCents,
      method:                   'card',
      status:                   'pending',
      tip_cents:                tipCents,
      stripe_payment_intent_id: intent.id,
      stripe_client_secret:     null,
      receipt_email:            body.receipt_email ?? null,
    })
    .select()
    .single();

  if (payErr) return err(c, 'DB_ERROR', payErr.message, 500);

  return ok(c, {
    payment_id:    payment.id,
    client_secret: intent.client_secret,
    amount_cents:  chargeCents,
    tip_cents:     tipCents,
  }, 201);
});

// ============================================================
// POST /v1/payments/capture
// Body: { payment_intent_id }
// ============================================================
paymentsRoutes.post('/capture', async (c: Context) => {
  const tenantId = c.get('tenantId') as string;
  const supabase = c.get('supabase');
  const body     = await c.req.json<{ payment_intent_id: string }>();

  if (!body.payment_intent_id) {
    return err(c, 'VALIDATION_ERROR', 'payment_intent_id is required', 400);
  }
  if (!supabase) return err(c, 'SERVICE_UNAVAILABLE', 'Database not configured', 503);

  const intent = await stripe().paymentIntents.retrieve(body.payment_intent_id);
  if (intent.status !== 'succeeded') {
    return err(c, 'PAYMENT_REQUIRED', `PaymentIntent is ${intent.status}, not succeeded`, 402);
  }

  // Bind Stripe metadata tenant to verified request tenant
  if (intent.metadata?.tenant_id && intent.metadata.tenant_id !== tenantId) {
    return err(c, 'FORBIDDEN', 'PaymentIntent tenant mismatch', 403);
  }

  const { data: payment, error: fetchErr } = await supabase
    .from('payments')
    .select('id, order_id, amount, tip_cents, receipt_email, status')
    .eq('stripe_payment_intent_id', body.payment_intent_id)
    .eq('tenant_id', tenantId)
    .single();

  if (fetchErr || !payment) return err(c, 'NOT_FOUND', 'Payment record not found', 404);
  if (payment.status === 'completed') return ok(c, payment);

  const { data: updatedPayment } = await supabase
    .from('payments')
    .update({
      status:               'completed',
      processed_at:         new Date().toISOString(),
      stripe_client_secret: null,
      reference_id:         body.payment_intent_id,
    })
    .eq('id', payment.id)
    .eq('tenant_id', tenantId)
    .select()
    .single();

  await supabase
    .from('pos_orders')
    .update({ status: 'paid', paid_at: new Date().toISOString() })
    .eq('id', payment.order_id)
    .eq('tenant_id', tenantId);

  if (payment.receipt_email) {
    supabase.functions.invoke('send-receipt', {
      body: {
        payment_id:    payment.id,
        order_id:      payment.order_id,
        amount_cents:  payment.amount,
        tip_cents:     payment.tip_cents,
        receipt_email: payment.receipt_email,
        tenant_id:     tenantId,
      },
      headers: {
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.INTERNAL_API_KEY ?? ''}`,
      },
    }).catch((e: Error) => console.warn('[payments/capture] Receipt send failed:', e.message));
  }

  return ok(c, updatedPayment);
});

// ============================================================
// POST /v1/payments/refund
// ============================================================
paymentsRoutes.post('/refund', async (c: Context) => {
  const tenantId = c.get('tenantId') as string;
  const supabase = c.get('supabase');
  const body     = await c.req.json<{ payment_id: string; amount_cents?: number }>();

  if (!body.payment_id) return err(c, 'VALIDATION_ERROR', 'payment_id is required', 400);
  if (!supabase) return err(c, 'SERVICE_UNAVAILABLE', 'Database not configured', 503);

  const { data: payment, error } = await supabase
    .from('payments')
    .select('id, amount, status, stripe_payment_intent_id')
    .eq('id', body.payment_id)
    .eq('tenant_id', tenantId)
    .single();

  if (error || !payment) return err(c, 'NOT_FOUND', 'Payment not found', 404);
  if (payment.status !== 'completed') {
    return err(c, 'CONFLICT', 'Only completed payments can be refunded', 409);
  }

  const refundAmount = body.amount_cents ?? payment.amount;
  const refund = await stripe().refunds.create({
    payment_intent: payment.stripe_payment_intent_id!,
    amount:         refundAmount,
  });

  await supabase
    .from('payments')
    .update({ status: 'refunded', reference_id: refund.id })
    .eq('id', payment.id)
    .eq('tenant_id', tenantId);

  return ok(c, { refund_id: refund.id, amount_cents: refundAmount });
});

// ============================================================
// GET /v1/payments/:orderId
// ============================================================
paymentsRoutes.get('/:orderId', async (c: Context) => {
  const tenantId = c.get('tenantId') as string;
  const supabase = c.get('supabase');
  const orderId  = c.req.param('orderId');

  if (!supabase) return err(c, 'SERVICE_UNAVAILABLE', 'Database not configured', 503);

  const { data, error } = await supabase
    .from('payments')
    .select('id, amount, tip_cents, method, status, processed_at, reference_id, receipt_email')
    .eq('order_id', orderId)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (error) return err(c, 'DB_ERROR', error.message, 500);
  return ok(c, data);
});

export default paymentsRoutes;
