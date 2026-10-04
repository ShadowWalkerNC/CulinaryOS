import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { Hono } from 'hono';
import Stripe from 'stripe';
import { paymentsRoutes } from '../../apps/server/src/routes/payments.ts';
import type { Env } from '../../apps/server/src/types.ts';

// E12: terminal/create-intent must never send a real Stripe request using a
// default/demo total when the tenant order is missing or invalid. In
// configured Stripe mode every rejection below must happen before any
// provider call (proven by validation error codes, never STRIPE_ERROR, and a
// intercepted Stripe resource request).

const TENANT_ID = '00000000-0000-0000-0000-000000000001';
const API_KEY = 'terminal-intent-regression-test-key';
const FAKE_STRIPE_KEY = 'sk_test_regression_no_network';

const keys = ['INTERNAL_API_KEY', 'STRIPE_SECRET_KEY'] as const;
const saved: Partial<Record<(typeof keys)[number], string>> = {};
const resourcePrototype = Stripe.StripeResource.prototype as unknown as {
  _makeRequest: (...args: any[]) => Promise<unknown>;
};
const realRequest = resourcePrototype._makeRequest;
let providerCalls = 0;
let providerPayload: any;

function fakeOrderDb(result: { data: any; error: any }) {
  return {
    from() {
      return {
        select() {
          return {
            eq() {
              return {
                eq() {
                  return {
                    single: async () => ({ data: result.data, error: result.error }),
                  };
                },
              };
            },
          };
        },
      };
    },
  };
}

function buildApp(supabaseValue: unknown) {
  const app = new Hono<Env>();
  app.use('*', async (c, next) => {
    if (supabaseValue !== undefined) c.set('supabase', supabaseValue as any);
    await next();
  });
  app.route('/payments', paymentsRoutes);
  return app;
}

async function postIntent(app: Hono<Env>, body: unknown) {
  return app.request('/payments/terminal/create-intent', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Tenant-Id': TENANT_ID,
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify(body),
  });
}

describe('terminal/create-intent containment (E12)', () => {
  beforeEach(() => {
    for (const key of keys) saved[key] = process.env[key];
    process.env.INTERNAL_API_KEY = API_KEY;
    process.env.STRIPE_SECRET_KEY = FAKE_STRIPE_KEY;
    providerCalls = 0;
    providerPayload = undefined;
    resourcePrototype._makeRequest = async (args: any[]) => {
      providerCalls++;
      providerPayload = args[0];
      return { id: 'pi_verified_fixture', client_secret: 'fixture_secret' };
    };
  });
  afterEach(() => {
    for (const key of keys) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
    resourcePrototype._makeRequest = realRequest;
  });

  it('rejects without DB in configured mode, no provider call', async () => {
    const response = await postIntent(buildApp(undefined), { order_id: 'order-1' });
    expect(response.status).toBe(503);
    const result = await response.json();
    expect(result.ok).toBe(false);
    expect(result.error.code).toBe('SERVICE_UNAVAILABLE');
    expect(providerCalls).toBe(0);
  });

  it('rejects missing order without provider call', async () => {
    const response = await postIntent(buildApp(fakeOrderDb({ data: null, error: null })), { order_id: 'order-missing' });
    expect(response.status).toBe(404);
    const result = await response.json();
    expect(result.ok).toBe(false);
    expect(result.error.code).toBe('NOT_FOUND');
    expect(providerCalls).toBe(0);
  });

  it('rejects order lookup error without provider call', async () => {
    const response = await postIntent(
      buildApp(fakeOrderDb({ data: null, error: { message: 'lookup exploded' } })),
      { order_id: 'order-1' },
    );
    expect(response.status).toBe(500);
    const result = await response.json();
    expect(result.ok).toBe(false);
    expect(result.error.code).toBe('DB_ERROR');
    expect(providerCalls).toBe(0);
  });

  for (const status of ['paid', 'voided', 'split']) {
    it(`rejects ${status} order without provider call`, async () => {
      const response = await postIntent(
        buildApp(fakeOrderDb({ data: { id: 'order-1', total: 2500, status }, error: null })),
        { order_id: 'order-1' },
      );
      expect(response.status).toBe(409);
      const result = await response.json();
      expect(result.ok).toBe(false);
      expect(result.error.code).toBe('CONFLICT');
      expect(providerCalls).toBe(0);
    });
  }

  const badTotals: Array<[string, unknown]> = [
    ['zero', 0],
    ['negative', -100],
    ['fractional', 10.5],
    ['string', '2500'],
    ['non-safe-integer', Number.MAX_SAFE_INTEGER + 1],
  ];
  for (const [label, total] of badTotals) {
    it(`rejects ${label} order total without provider call`, async () => {
      const response = await postIntent(
        buildApp(fakeOrderDb({ data: { id: 'order-1', total, status: 'open' }, error: null })),
        { order_id: 'order-1' },
      );
      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result.ok).toBe(false);
      expect(result.error.code).toBe('VALIDATION_ERROR');
      expect(providerCalls).toBe(0);
    });
  }

  const badTips: Array<[string, unknown]> = [
    ['negative tip', { order_id: 'order-1', tip_cents: -1 }],
    ['fractional tip', { order_id: 'order-1', tip_cents: 2.5 }],
    ['non-safe tip', { order_id: 'order-1', tip_cents: Number.MAX_SAFE_INTEGER + 1 }],
    ['string tip', { order_id: 'order-1', tip_cents: '100' }],
    ['negative gratuity', { order_id: 'order-1', auto_gratuity_cents: -5 }],
    ['fractional gratuity', { order_id: 'order-1', auto_gratuity_cents: 1.1 }],
    ['tip sum overflow', { order_id: 'order-1', tip_cents: Number.MAX_SAFE_INTEGER, auto_gratuity_cents: 1 }],
    ['total sum overflow', { order_id: 'order-1', tip_cents: 1 }],
  ];
  for (const [label, body] of badTips) {
    it(`rejects ${label} without provider call`, async () => {
      const total = label === 'total sum overflow' ? Number.MAX_SAFE_INTEGER : 2500;
      const response = await postIntent(
        buildApp(fakeOrderDb({ data: { id: 'order-1', total, status: 'open' }, error: null })),
        body,
      );
      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result.ok).toBe(false);
      expect(result.error.code).toBe('VALIDATION_ERROR');
      expect(providerCalls).toBe(0);
    });
  }

  it('rejects missing order_id without provider call', async () => {
    const response = await postIntent(buildApp(undefined), {});
    expect(response.status).toBe(400);
    const result = await response.json();
    expect(result.ok).toBe(false);
    expect(result.error.code).toBe('VALIDATION_ERROR');
    expect(providerCalls).toBe(0);
  });

  it('preserves explicitly marked no-Stripe demo preview without DB', async () => {
    process.env.STRIPE_SECRET_KEY = '';
    const response = await postIntent(buildApp(undefined), { order_id: 'order-1' });
    expect(response.status).toBe(201);
    const result = await response.json();
    expect(result.ok).toBe(true);
    expect(result.data.demo_mode).toBe(true);
    expect(result.data.amount_cents).toBe(2500);
    expect(providerCalls).toBe(0);
  });

  it('uses the tenant order amount plus validated tips for a valid intent', async () => {
    const response = await postIntent(
      buildApp(fakeOrderDb({ data: { id: 'order-1', total: 4321, status: 'open' }, error: null })),
      { order_id: 'order-1', tip_cents: 100, auto_gratuity_cents: 25 },
    );
    expect(response.status).toBe(201);
    expect(providerCalls).toBe(1);
    expect(providerPayload.amount).toBe(4446);
    expect(providerPayload.currency).toBe('usd');
    expect(providerPayload.metadata.tenant_id).toBe(TENANT_ID);
    expect(providerPayload.metadata.order_id).toBe('order-1');
    const result = await response.json();
    expect(result.data.demo_mode).toBe(false);
    expect(result.data.amount_cents).toBe(4446);
  });
});
