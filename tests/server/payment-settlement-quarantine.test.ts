import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { Hono } from 'hono';
import { paymentsRoutes } from '../../apps/server/src/routes/payments.ts';
import type { Env } from '../../apps/server/src/types.ts';

const keys = ['INTERNAL_API_KEY', 'STRIPE_SECRET_KEY'] as const;
const saved: Partial<Record<(typeof keys)[number], string>> = {};

describe('unfinished payment flows fail closed', () => {
  beforeEach(() => {
    for (const key of keys) saved[key] = process.env[key];
    process.env.INTERNAL_API_KEY = 'settlement-regression-test-key';
  });
  afterEach(() => {
    for (const key of keys) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  });
  for (const configured of [false, true]) {
    for (const [path, body] of [
      ['/terminal/process', { order_id: 'order-1', payment_intent_id: 'pi_unverified' }],
      ['/split', { order_id: 'order-1', splits: [{ amount_cents: 1, method: 'card' }] }],
      ['/tabs/preauth', { tab_name: 'Unverified tab', hold_cents: 2500 }],
    ] as const) {
      it(`rejects ${path}, configured=${configured}, without database writes`, async () => {
        process.env.STRIPE_SECRET_KEY = configured ? 'sk_test_regression_no_network' : '';
        let databaseCalls = 0;
        const app = new Hono<Env>();
        app.use('*', async (c, next) => {
          c.set('supabase', { from() {
            databaseCalls++;
            throw new Error('Quarantined payment accessed the database');
          } } as any);
          await next();
        });
        app.route('/payments', paymentsRoutes);
        for (let attempt = 0; attempt < 2; attempt++) {
          const response = await app.request(`/payments${path}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Tenant-Id': '00000000-0000-0000-0000-000000000001',
              Authorization: 'Bearer settlement-regression-test-key',
            },
            body: JSON.stringify(body),
          });
          expect(response.status).toBe(503);
          const result = await response.json();
          expect(result.ok).toBe(false);
          expect(result.error.code).toBe('PAYMENT_FLOW_UNAVAILABLE');
          expect(result.data).toBeUndefined();
        }
        expect(databaseCalls).toBe(0);
      });
    }
  }
});
