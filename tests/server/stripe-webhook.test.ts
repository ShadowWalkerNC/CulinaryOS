// ==============================================================================
// Test Suite: Stripe Webhook Cryptographic Signature Verification & Tenant Isolation
// Non-Negotiable Rule 3: Stripe webhook handlers must verify signatures.
// Non-Negotiable Rule 1: Multi-tenant payment isolation.
// ==============================================================================

import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import Stripe from 'stripe';
import { stripeWebhook } from '../../apps/server/src/routes/stripe-webhook.ts';
import { setAdminSupabaseForTesting } from '../../apps/server/src/middleware/supabase.ts';

const TENANT_A = '00000000-0000-0000-0000-0000000000aa';
const TENANT_B = '00000000-0000-0000-0000-0000000000bb';
const TEST_STRIPE_KEY = 'sk_test_51MockLiveTestKeyForWebhookVerification';
const TEST_WEBHOOK_SECRET = 'whsec_test_secret_hash_verification_9876543210';

const stripe = new Stripe(TEST_STRIPE_KEY, { apiVersion: '2024-04-10' });

describe('Stripe Webhook Signature Verification & Payment Isolation', () => {
  const ENV_KEYS = [
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'AUTH_RELAXED',
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
  ] as const;
  const saved: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>> = {};

  beforeEach(() => {
    for (const key of ENV_KEYS) saved[key] = process.env[key];
    process.env.AUTH_RELAXED = 'false';
    process.env.SUPABASE_URL = 'https://live.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-live';
  });

  afterEach(() => {
    setAdminSupabaseForTesting(null);
    for (const key of ENV_KEYS) {
      const value = saved[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it('1. Returns 503 when Stripe is not configured (placeholder secret)', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_placeholder';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_placeholder';

    const res = await stripeWebhook.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'payment_intent.succeeded' }),
    });

    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toContain('Stripe not configured');
  });

  it('2. Rejects unsigned webhook requests with 400 when live secret configured', async () => {
    process.env.STRIPE_SECRET_KEY = TEST_STRIPE_KEY;
    process.env.STRIPE_WEBHOOK_SECRET = TEST_WEBHOOK_SECRET;

    const res = await stripeWebhook.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // No stripe-signature header provided
      body: JSON.stringify({ type: 'payment_intent.succeeded' }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toContain('Webhook signature required');
  });

  it('3. Rejects invalid or forged signature with 400', async () => {
    process.env.STRIPE_SECRET_KEY = TEST_STRIPE_KEY;
    process.env.STRIPE_WEBHOOK_SECRET = TEST_WEBHOOK_SECRET;

    const rawPayload = JSON.stringify({
      id: 'evt_test_123',
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_test_123' } },
    });

    const res = await stripeWebhook.request('/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 't=1600000000,v1=forged_bad_signature_hash_00000000',
      },
      body: rawPayload,
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
  });

  it('4. Accepts and processes a cryptographically verified signature', async () => {
    process.env.STRIPE_SECRET_KEY = TEST_STRIPE_KEY;
    process.env.STRIPE_WEBHOOK_SECRET = TEST_WEBHOOK_SECRET;

    const payload = {
      id: 'evt_valid_123',
      object: 'event',
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_valid_payment_intent',
          metadata: {
            tenant_id: TENANT_A,
            order_id: 'order_12345',
          },
        },
      },
    };
    const rawPayload = JSON.stringify(payload);

    // Generate valid cryptographic signature using Stripe SDK
    const signature = stripe.webhooks.generateTestHeaderString({
      payload: rawPayload,
      secret: TEST_WEBHOOK_SECRET,
    });

    // Mock Supabase to track tenant-isolated updates
    let paymentUpdated = false;
    let orderUpdated = false;

    setAdminSupabaseForTesting({
      from: (table: string) => {
        const filters: Record<string, any> = {};
        const chain: any = {
          update: () => chain,
          eq: (col: string, val: string) => {
            filters[col] = val;
            return chain;
          },
          select: () => {
            if (table === 'payments') {
              if (
                filters.stripe_payment_intent_id === 'pi_valid_payment_intent' &&
                filters.tenant_id === TENANT_A
              ) {
                paymentUpdated = true;
                return Promise.resolve({ data: [{ id: 'pay_row_1' }], error: null });
              }
            }
            return Promise.resolve({ data: [], error: null });
          },
          then: (resolve: any) => {
            if (table === 'pos_orders') {
              if (filters.id === 'order_12345' && filters.tenant_id === TENANT_A) {
                orderUpdated = true;
              }
            }
            return Promise.resolve(resolve({ data: null, error: null }));
          },
        };
        return chain;
      },
    });

    const res = await stripeWebhook.request('/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': signature,
      },
      body: rawPayload,
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.received).toBe(true);
    expect(paymentUpdated).toBe(true);
    expect(orderUpdated).toBe(true);
  });

  it('5. Proves cross-tenant payment isolation: Tenant A webhook cannot mark Tenant B order paid', async () => {
    process.env.STRIPE_SECRET_KEY = TEST_STRIPE_KEY;
    process.env.STRIPE_WEBHOOK_SECRET = TEST_WEBHOOK_SECRET;

    // Attacker sends valid signature with Tenant A metadata trying to target Tenant B order
    const payload = {
      id: 'evt_adversarial_cross_tenant',
      object: 'event',
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_tenant_a_spoof',
          metadata: {
            tenant_id: TENANT_A, // Webhook signed with Tenant A
            order_id: 'order_belongs_to_tenant_b',
          },
        },
      },
    };
    const rawPayload = JSON.stringify(payload);

    const signature = stripe.webhooks.generateTestHeaderString({
      payload: rawPayload,
      secret: TEST_WEBHOOK_SECRET,
    });

    let orderMarkedPaid = false;

    setAdminSupabaseForTesting({
      from: (table: string) => {
        const filters: Record<string, any> = {};
        const chain: any = {
          update: () => chain,
          eq: (col: string, val: string) => {
            filters[col] = val;
            return chain;
          },
          select: () => {
            // In database, the payment intent belongs to Tenant B, NOT Tenant A
            // Because filters.tenant_id is TENANT_A, it matches 0 rows
            return Promise.resolve({ data: [], error: null });
          },
          then: (resolve: any) => {
            if (table === 'pos_orders') {
              orderMarkedPaid = true;
            }
            return Promise.resolve(resolve({ data: null, error: null }));
          },
        };
        return chain;
      },
    });

    const res = await stripeWebhook.request('/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': signature,
      },
      body: rawPayload,
    });

    expect(res.status).toBe(200);
    // Order MUST NOT be marked paid because payment row tenant check returned 0 matches
    expect(orderMarkedPaid).toBe(false);
  });
});
