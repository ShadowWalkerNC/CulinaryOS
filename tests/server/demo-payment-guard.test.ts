import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { paymentsRoutes } from '../../apps/server/src/routes/payments.ts';

const TENANT = '00000000-0000-0000-0000-000000000001';
const ENV_KEYS = ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'] as const;
const saved: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>> = {};

describe('demo payment guard', () => {
  beforeEach(() => {
    for (const key of ENV_KEYS) saved[key] = process.env[key];
    process.env.STRIPE_SECRET_KEY = 'sk_test_51placeholder';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_placeholder';
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      const value = saved[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it('returns an explicitly marked preview and refuses capture without a database', async () => {
    const headers = {
      'Content-Type': 'application/json',
      'X-Tenant-Id': TENANT,
    };

    const checkout = await paymentsRoutes.request('/checkout', {
      method: 'POST',
      headers,
      body: JSON.stringify({ order_id: 'demo-order', tip_cents: 125 }),
    });

    expect(checkout.status).toBe(201);
    const checkoutBody = await checkout.json();
    expect(checkoutBody.data.demo_mode).toBe(true);
    expect(checkoutBody.data.client_secret.startsWith('mock_sec_')).toBe(true);

    const capture = await paymentsRoutes.request('/capture', {
      method: 'POST',
      headers,
      body: JSON.stringify({ payment_intent_id: 'pi_demo_not_chargeable' }),
    });

    expect(capture.status).toBe(503);
    const captureBody = await capture.json();
    expect(captureBody.ok).toBe(false);
  });
});
