// ============================================================
// Stripe webhook — payment_intent.succeeded → mark order paid
// POST /v1/payments/webhook
// ============================================================

import { Hono } from 'hono';
import Stripe from 'stripe';
import type { Env } from '../types.js';
import { adminSupabase } from '../middleware/supabase.js';
import { isDemoMode, isPlaceholderSecret } from '../lib/secrets.js';

export const stripeWebhook = new Hono<Env>();

const MAX_PROCESSED_EVENTS = 2000;
const processedWebhookEvents = new Set<string>();

export function resetWebhookDedupeForTesting(): void {
  processedWebhookEvents.clear();
}

function rememberWebhookEvent(eventId: string): void {
  if (processedWebhookEvents.size >= MAX_PROCESSED_EVENTS) {
    const oldest = processedWebhookEvents.values().next().value;
    if (oldest) processedWebhookEvents.delete(oldest);
  }
  processedWebhookEvents.add(eventId);
}

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
    if (!isPlaceholderSecret(secret)) {
      if (!sig) {
        return c.json({ ok: false, error: 'Webhook signature required' }, 400);
      }
      event = stripe.webhooks.constructEvent(raw, sig, secret);
    } else if (isDemoMode()) {
      // Local demo only — accept an unsigned fixture without live credentials.
      event = JSON.parse(raw) as Stripe.Event;
    } else {
      return c.json({ ok: false, error: 'Webhook signature required' }, 400);
    }
  } catch (e: any) {
    return c.json({ ok: false, error: e?.message ?? 'Invalid webhook' }, 400);
  }

  if (event?.id && processedWebhookEvents.has(event.id)) {
    return c.json({ ok: true, received: true, deduplicated: true });
  }

  if (event?.type === 'payment_intent.succeeded' && event.data?.object) {
    const intent = event.data.object as Stripe.PaymentIntent;
    const tenantId = intent.metadata?.tenant_id;
    const orderId = intent.metadata?.order_id;
    const supabase = adminSupabase();

    if (
      typeof intent.amount === 'number' &&
      typeof intent.amount_received === 'number' &&
      intent.amount_received < intent.amount
    ) {
      return c.json({ ok: false, error: 'Partial payment capture cannot settle order' }, 422);
    }

    if (supabase && tenantId && orderId) {
      // Optional persistent inbox deduplication when table is available
      if (event.id) {
        try {
          const inboxTable: any = supabase.from('stripe_webhook_inbox');
          if (inboxTable && typeof inboxTable.insert === 'function') {
            const inboxRes = await inboxTable.insert({
              event_id: event.id,
              event_type: event.type,
              tenant_id: tenantId,
              stripe_object_id: intent.id,
              received_at: new Date().toISOString(),
            });
            if (
              inboxRes?.error &&
              (String(inboxRes.error.code) === '23505' ||
                String(inboxRes.error.message ?? '').toLowerCase().includes('duplicate'))
            ) {
              rememberWebhookEvent(event.id);
              return c.json({ ok: true, received: true, deduplicated: true });
            }
          }
        } catch {
          // Table may not be mocked in unit tests; proceed with in-memory + row guards
        }
      }

      const { data: paymentRows, error: payErr } = await supabase
        .from('payments')
        .update({
          status: 'completed',
          processed_at: new Date().toISOString(),
          stripe_client_secret: null,
          reference_id: intent.id,
        })
        .eq('stripe_payment_intent_id', intent.id)
        .eq('tenant_id', tenantId)
        .select('id, order_id, amount');

      // Only mark the order paid when a matching tenant-scoped payment row updated
      // and its stored order_id + amount match the PaymentIntent
      if (!payErr && paymentRows && paymentRows.length > 0) {
        const matchedRow: any = paymentRows[0];
        const orderMatches =
          matchedRow.order_id === undefined || matchedRow.order_id === orderId;
        const amountMatches =
          matchedRow.amount === undefined ||
          typeof intent.amount !== 'number' ||
          matchedRow.amount === intent.amount;

        if (orderMatches && amountMatches) {
          const authoritativeOrderId = matchedRow.order_id ?? orderId;
          await supabase
            .from('pos_orders')
            .update({ status: 'paid', paid_at: new Date().toISOString() })
            .eq('id', authoritativeOrderId)
            .eq('tenant_id', tenantId);
        }
      }
    }
  }

  if (event?.id) {
    rememberWebhookEvent(event.id);
  }

  return c.json({ ok: true, received: true });
});
