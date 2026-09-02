// ============================================================
// CulinaryOS — Stripe Billing Routes (SaaS Subscriptions)
// POST /v1/billing/checkout     — create Stripe Checkout Session
// POST /v1/billing/webhook      — Stripe webhook (no auth — sig verified)
// POST /v1/billing/portal       — Stripe Customer Portal session
// GET  /v1/billing/subscription — current subscription for tenant
// ============================================================

import { Hono }         from 'hono';
import type { Context } from 'hono';
import Stripe           from 'stripe';
import { requireTenant, ok, err } from '../middleware/auth.js';
import { adminSupabase }          from '../middleware/supabase.js';
import { isPlaceholderSecret }    from '../lib/secrets.js';
import type { Env } from '../types.js';

export const billingRoutes = new Hono<Env>();

// ---- helpers ----------------------------------------------------------------

function isBillingConfigured(): boolean {
  const key = process.env.STRIPE_SECRET_KEY;
  return Boolean(key && !isPlaceholderSecret(key));
}

function stripe(): Stripe {
  return new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock_key', {
    apiVersion: '2024-04-10',
  });
}

const PLAN_PRICE_ENV: Record<string, string> = {
  starter:    'STRIPE_PRICE_STARTER',
  pro:        'STRIPE_PRICE_PRO',
  enterprise: 'STRIPE_PRICE_ENTERPRISE',
};

function priceIdForPlan(plan: string): string | null {
  const envKey = PLAN_PRICE_ENV[plan];
  if (!envKey) return null;
  const id = process.env[envKey];
  if (!id || isPlaceholderSecret(id)) return null;
  return id;
}

// ---- POST /v1/billing/checkout -----------------------------------------------

billingRoutes.post('/checkout', requireTenant, async (c: Context<Env>) => {
  const tenantId = c.get('tenantId') as string;
  const supabase = c.get('supabase');
  const body = await c.req.json<{
    plan:         'starter' | 'pro' | 'enterprise';
    success_url?: string;
    cancel_url?:  string;
  }>().catch(() => null);

  if (!body || !body.plan) {
    return err(c, 'VALIDATION_ERROR', 'plan is required (starter | pro | enterprise)', 400);
  }
  if (!['starter', 'pro', 'enterprise'].includes(body.plan)) {
    return err(c, 'VALIDATION_ERROR', `Unknown plan: ${body.plan}`, 400);
  }

  if (!isBillingConfigured()) {
    return ok(c, {
      checkout_url: 'https://stripe.com/demo',
      demo_mode:    true,
    });
  }

  // Look up tenant email from restaurants table
  let customerEmail: string | undefined;
  let existingCustomerId: string | undefined;

  if (supabase) {
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('id, name, owner_id')
      .eq('id', tenantId)
      .single();

    if (restaurant?.owner_id) {
      const admin = adminSupabase();
      if (admin) {
        const { data: userData } = await admin.auth.admin.getUserById(restaurant.owner_id);
        customerEmail = userData?.user?.email ?? undefined;
      }
    }

    // Check for existing stripe_customer_id
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('tenant_id', tenantId)
      .maybeSingle();

    existingCustomerId = sub?.stripe_customer_id ?? undefined;
  }

  const priceId = priceIdForPlan(body.plan);
  if (!priceId) {
    return err(
      c,
      'CONFIGURATION_ERROR',
      `Stripe price ID not configured for plan: ${body.plan}. Set ${PLAN_PRICE_ENV[body.plan]} in env.`,
      500
    );
  }

  try {
    // Retrieve or create Stripe customer
    let customerId = existingCustomerId;
    if (!customerId) {
      const customer = await stripe().customers.create({
        ...(customerEmail ? { email: customerEmail } : {}),
        metadata: { tenant_id: tenantId },
      });
      customerId = customer.id;
    }

    const session = await stripe().checkout.sessions.create({
      mode:       'subscription',
      customer:   customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: body.success_url ?? `${process.env.CULINARYOS_URL ?? 'http://localhost:3000'}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  body.cancel_url  ?? `${process.env.CULINARYOS_URL ?? 'http://localhost:3000'}/billing/cancel`,
      metadata:   { tenant_id: tenantId, plan: body.plan },
    });

    return ok(c, { checkout_url: session.url });
  } catch (error: any) {
    return err(c, 'STRIPE_ERROR', error.message || 'Failed to create checkout session', 500);
  }
});

// ---- POST /v1/billing/webhook (no auth — raw body, Stripe sig verified) ------

billingRoutes.post('/webhook', async (c: Context<Env>) => {
  const webhookSecret = process.env.STRIPE_BILLING_WEBHOOK_SECRET;
  const signature     = c.req.header('stripe-signature');
  const rawBody       = await c.req.text();
  const supabase      = adminSupabase();

  let event: Stripe.Event;

  const isRelaxed =
    !isBillingConfigured() ||
    !webhookSecret         ||
    isPlaceholderSecret(webhookSecret);

  if (isRelaxed) {
    // Demo / offline mode — accept raw JSON without signature verification
    try {
      event = JSON.parse(rawBody) as Stripe.Event;
    } catch {
      return err(c, 'VALIDATION_ERROR', 'Invalid JSON body', 400);
    }
  } else {
    if (!signature) {
      return err(c, 'UNAUTHORIZED', 'Missing stripe-signature header', 401);
    }
    try {
      event = stripe().webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (error: any) {
      return err(c, 'WEBHOOK_SIGNATURE_INVALID', error.message || 'Signature verification failed', 400);
    }
  }

  if (!supabase) {
    // No DB in demo mode — acknowledge silently
    return c.json({ ok: true });
  }

  try {
    switch (event.type) {

      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== 'subscription') break;

        const tenantId   = session.metadata?.tenant_id;
        const plan        = session.metadata?.plan ?? 'starter';
        const customerId  = typeof session.customer      === 'string' ? session.customer      : session.customer?.id;
        const subId       = typeof session.subscription  === 'string' ? session.subscription  : session.subscription?.id;

        if (!tenantId) break;

        await supabase
          .from('subscriptions')
          .upsert(
            {
              tenant_id:              tenantId,
              stripe_customer_id:     customerId  ?? null,
              stripe_subscription_id: subId       ?? null,
              plan,
              status:                 'active',
              updated_at:             new Date().toISOString(),
            },
            { onConflict: 'tenant_id' }
          );
        break;
      }

      case 'customer.subscription.updated': {
        const sub        = event.data.object as Stripe.Subscription;
        const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
        const status     = sub.status === 'active' ? 'active'
                         : sub.status === 'past_due' ? 'past_due'
                         : sub.status === 'canceled'  ? 'canceled'
                         : sub.status === 'paused'    ? 'paused'
                         : 'trialing';

        await supabase
          .from('subscriptions')
          .update({
            status,
            current_period_end:   sub.current_period_end
              ? new Date(sub.current_period_end * 1000).toISOString()
              : null,
            cancel_at_period_end: sub.cancel_at_period_end ?? false,
            updated_at:           new Date().toISOString(),
          })
          .eq('stripe_customer_id', customerId);
        break;
      }

      case 'customer.subscription.deleted': {
        const sub        = event.data.object as Stripe.Subscription;
        const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;

        await supabase
          .from('subscriptions')
          .update({ status: 'canceled', updated_at: new Date().toISOString() })
          .eq('stripe_customer_id', customerId);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice    = event.data.object as Stripe.Invoice;
        const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
        if (!customerId) break;

        await supabase
          .from('subscriptions')
          .update({ status: 'past_due', updated_at: new Date().toISOString() })
          .eq('stripe_customer_id', customerId);
        break;
      }

      default:
        // Unhandled event type — acknowledge silently
        break;
    }
  } catch (error: any) {
    console.error('[billing/webhook] Handler error:', error.message);
    // Still return 200 to Stripe — we log and move on
  }

  return c.json({ ok: true });
});

// ---- POST /v1/billing/portal -------------------------------------------------

billingRoutes.post('/portal', requireTenant, async (c: Context<Env>) => {
  const tenantId = c.get('tenantId') as string;
  const supabase = c.get('supabase');
  const body = await c.req.json<{ return_url?: string }>().catch(() => ({} as { return_url?: string }));

  if (!isBillingConfigured()) {
    return ok(c, {
      portal_url: 'https://billing.stripe.com/demo',
      demo_mode:  true,
    });
  }

  if (!supabase) {
    return err(c, 'SERVICE_UNAVAILABLE', 'Database not configured', 503);
  }

  const { data: sub, error: subErr } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (subErr) {
    return err(c, 'DB_ERROR', subErr.message, 500);
  }

  const customerId = sub?.stripe_customer_id;
  if (!customerId) {
    return err(
      c,
      'NOT_FOUND',
      'No billing account found. Complete a checkout first.',
      404
    );
  }

  try {
    const session = await stripe().billingPortal.sessions.create({
      customer:   customerId,
      return_url: body.return_url ?? `${process.env.CULINARYOS_URL ?? 'http://localhost:3000'}/settings/billing`,
    });

    return ok(c, { portal_url: session.url });
  } catch (error: any) {
    return err(c, 'STRIPE_ERROR', error.message || 'Failed to create billing portal session', 500);
  }
});

// ---- GET /v1/billing/subscription -------------------------------------------

billingRoutes.get('/subscription', requireTenant, async (c: Context<Env>) => {
  const tenantId = c.get('tenantId') as string;
  const supabase = c.get('supabase');

  if (!supabase) {
    return ok(c, { plan: 'trial', status: 'trialing', trial_ends_at: null, demo_mode: true });
  }

  const { data: sub, error } = await supabase
    .from('subscriptions')
    .select(
      'id, plan, status, trial_ends_at, current_period_end, cancel_at_period_end, stripe_subscription_id, created_at, updated_at'
    )
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (error) {
    return err(c, 'DB_ERROR', error.message, 500);
  }

  if (!sub) {
    return ok(c, { plan: 'trial', status: 'trialing', trial_ends_at: null });
  }

  return ok(c, sub);
});
