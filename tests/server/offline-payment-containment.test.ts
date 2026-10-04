import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { Hono } from 'hono';
import { posSyncRoutes } from '../../apps/server/src/routes/pos-sync.ts';
import type { Env } from '../../apps/server/src/types.ts';

const tenant = '00000000-0000-0000-0000-000000000001';
let savedKey: string | undefined;

function appWithDatabase(database: unknown) {
  const app = new Hono<Env>();
  app.use('*', async (c, next) => {
    c.set('supabase', database as any);
    await next();
  });
  app.route('/pos', posSyncRoutes);
  return app;
}

function delta(method: unknown, flag?: unknown) {
  return {
    id: 'payment-delta', tenant_id: tenant, order_id: 'order-1',
    action: 'finalize_payment', timestamp: '2026-09-30T12:00:00Z',
    payload: { method, allow_offline_card: flag, amount: 2500, tip_cents: 0 },
  };
}

async function replay(app: Hono<Env>, deltas: unknown[]) {
  const response = await app.request('/pos/sync-deltas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Tenant-Id': tenant,
      Authorization: 'Bearer offline-containment-test' },
    body: JSON.stringify({ deltas }),
  });
  expect(response.status).toBe(200);
  return (await response.json()).data;
}

describe('offline replay cannot authorize card settlement', () => {
  beforeEach(() => {
    savedKey = process.env.INTERNAL_API_KEY;
    process.env.INTERNAL_API_KEY = 'offline-containment-test';
  });
  afterEach(() => {
    if (savedKey === undefined) delete process.env.INTERNAL_API_KEY;
    else process.env.INTERNAL_API_KEY = savedKey;
  });

  for (const method of ['card', 'CARD', 'gift_card', 'unknown']) {
    for (const flag of [undefined, false, true]) {
      it(`rejects ${method} with flag=${flag} before database access`, async () => {
        let calls = 0;
        const app = appWithDatabase({ from() { calls++; throw new Error('Must not write'); } });
        const result = await replay(app, [delta(method, flag)]);
        expect(result.confirmedIds).toEqual([]);
        expect(result.failures.length).toBe(1);
        expect(result.failures[0].id).toBe('payment-delta');
        expect(calls).toBe(0);
      });
    }
  }

  it('does not confirm card deltas in demo mode, including duplicates', async () => {
    const result = await replay(appWithDatabase(null), [delta('card', true), delta('card', true)]);
    expect(result.confirmedIds).toEqual([]);
    expect(result.failures.length).toBe(2);
  });

  for (const method of ['cash', 'comp']) {
    it(`preserves ${method} replay while rejecting card in the same batch`, async () => {
      const payments: unknown[] = [];
      let orderUpdates = 0;
      const update = {
        eq() { return update; },
        then(resolve: (value: unknown) => void) { resolve({ error: null }); },
      };
      const database = { from(table: string) {
        if (table === 'payments') return { async insert(payment: unknown) {
          payments.push(payment); return { error: null };
        } };
        if (table === 'pos_orders') return { update() { orderUpdates++; return update; } };
        throw new Error(`Unexpected table ${table}`);
      } };
      const cash = { ...delta(method), id: 'allowed-payment' };
      const result = await replay(appWithDatabase(database), [delta('card', true), cash]);
      expect(result.confirmedIds).toEqual(['allowed-payment']);
      expect(result.failures.length).toBe(1);
      expect(payments.length).toBe(1);
      expect(orderUpdates).toBe(1);
    });
  }
});
