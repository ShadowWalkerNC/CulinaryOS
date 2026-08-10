// ============================================================
// Stripe webhook — payment_intent.succeeded → mark order paid
// POST /v1/payments/webhook
// ============================================================

import { Hono } from 'hono';
import Stripe from 'stripe';
import type { Env } from '../types.js';
import { adminSupabase } from '../middleware/supabase.js';
import { isPlaceholderSecret } from '../lib/secrets.js';

export const stripeWebhook = new Hono<Env>();

stripeWebhook.post('/', async (c) => {
  const secret = process.env.STRIPE_WEBHOOK_SECRET ?? '';
  const stripeKey = process.env.STRIPE_SECRET_KEY ?? '';

  if (isPlaceholderSecret(stripeKey)) {
    return c.json({ ok: false, error: 'Stripe not configured' }, 503);
  }

  const stripe = new Stripe(stripeKey, { apiVersion: '2024-04-10' });
  const raw = await c.req.text();
  const sig = c.req.header('stripe-signature');

  let event: Stripe.Event;
  try {
    if (!isPlaceholderSecret(secret) && sig) {
      event = stripe.webhooks.constructEvent(raw, sig, secret);
    } else if (process.env.AUTH_RELAXED === 'true') {
      // Local/dev only — accept JSON body without signature
      event = JSON.parse(raw) as Stripe.Event;
    } else {
      return c.json({ ok: false, error: 'Webhook signature required' }, 400);
    }
  } catch (e: any) {
    return c.json({ ok: false, error: e?.message ?? 'Invalid webhook' }, 400);
  }

  if (event.type === 'payment_intent.succeeded') {
    const intent = event.data.object as Stripe.PaymentIntent;
    const tenantId = intent.metadata?.tenant_id;
    const orderId = intent.metadata?.order_id;
    const supabase = adminSupabase();

    if (supabase && tenantId && orderId) {
      await supabase
        .from('payments')
        .update({
          status: 'completed',
          processed_at: new Date().toISOString(),
          stripe_client_secret: null,
          reference_id: intent.id,
        })
        .eq('stripe_payment_intent_id', intent.id)
        .eq('tenant_id', tenantId);

      await supabase
        .from('pos_orders')
        .update({ status: 'paid', paid_at: new Date().toISOString() })
        .eq('id', orderId)
        .eq('tenant_id', tenantId);
    }
  }

  return c.json({ ok: true, received: true });
});
