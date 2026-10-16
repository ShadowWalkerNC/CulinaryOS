import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { Hono } from 'hono';
import { posSyncRoutes } from '../../apps/server/src/routes/pos-sync.ts';
import type { Env } from '../../apps/server/src/types.ts';

const TENANT_A = '00000000-0000-0000-0000-000000000001';
const TENANT_B = '00000000-0000-0000-0000-000000000002';

interface MockState {
  orders: Record<string, any>;
  lineItems: Record<string, any>;
  payments: any[];
}

function createMockSupabase(state: MockState) {
  return {
    from(table: string) {
      if (table === 'pos_orders') {
        return {
          select(_cols?: string) {
            const filters: Record<string, string> = {};
            const chain: any = {
              eq(col: string, val: string) {
                filters[col] = val;
                return chain;
              },
              async maybeSingle() {
                const order = state.orders[filters.id];
                if (!order) return { data: null, error: null };
                if (filters.tenant_id && order.tenant_id !== filters.tenant_id) {
                  return { data: null, error: null };
                }
                return { data: { ...order }, error: null };
              },
            };
            return chain;
          },
          async upsert(row: any, _opts?: any) {
            state.orders[row.id] = { ...(state.orders[row.id] ?? {}), ...row };
            return { error: null };
          },
          update(patch: any) {
            const filters: Record<string, string> = {};
            const chain: any = {
              eq(col: string, val: string) {
                filters[col] = val;
                return chain;
              },
              then(resolve: (val: any) => void) {
                const order = state.orders[filters.id];
                if (order && (!filters.tenant_id || order.tenant_id === filters.tenant_id)) {
                  Object.assign(order, patch);
                }
                resolve({ error: null });
              },
            };
            return chain;
          },
        };
      }

      if (table === 'pos_order_line_items') {
        return {
          async insert(row: any) {
            state.lineItems[row.id] = { ...row };
            return { error: null };
          },
          update(patch: any) {
            const filters: Record<string, any> = {};
            const chain: any = {
              eq(col: string, val: any) {
                filters[col] = val;
                return chain;
              },
              async select(_cols?: string) {
                const li = state.lineItems[filters.id];
                if (
                  li &&
                  li.order_id === filters.order_id &&
                  li.tenant_id === filters.tenant_id
                ) {
                  Object.assign(li, patch);
                  return { data: [{ id: li.id }], error: null };
                }
                return { data: [], error: null };
              },
              then(resolve: (val: any) => void) {
                for (const li of Object.values(state.lineItems)) {
                  if (
                    (!filters.id || li.id === filters.id) &&
                    (!filters.order_id || li.order_id === filters.order_id) &&
                    (!filters.tenant_id || li.tenant_id === filters.tenant_id)
                  ) {
                    Object.assign(li, patch);
                  }
                }
                resolve({ error: null });
              },
            };
            return chain;
          },
        };
      }

      if (table === 'payments') {
        return {
          async insert(row: any) {
            state.payments.push(row);
            return { error: null };
          },
        };
      }

      throw new Error(`Unexpected table ${table}`);
    },
  };
}

function createApp(state: MockState) {
  const app = new Hono<Env>();
  const supabase = createMockSupabase(state);
  app.use('*', async (c, next) => {
    c.set('supabase', supabase as any);
    await next();
  });
  app.route('/pos', posSyncRoutes);
  return app;
}

async function postDeltas(app: Hono<Env>, tenantId: string, deltas: unknown[]) {
  const res = await app.request('/pos/sync-deltas', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Tenant-Id': tenantId,
      Authorization: 'Bearer pos-sync-test-key',
    },
    body: JSON.stringify({ deltas }),
  });
  expect(res.status).toBe(200);
  const body = await res.json();
  return body.data as {
    confirmedIds: string[];
    applied: number;
    failures: { id: string; error: string }[];
  };
}

describe('POS Offline Sync Security & Replay Integrity (pos-sync)', () => {
  let savedKey: string | undefined;

  beforeEach(() => {
    savedKey = process.env.INTERNAL_API_KEY;
    process.env.INTERNAL_API_KEY = 'pos-sync-test-key';
  });

  afterEach(() => {
    if (savedKey === undefined) delete process.env.INTERNAL_API_KEY;
    else process.env.INTERNAL_API_KEY = savedKey;
  });

  it('1. Rejects create_order when order_id already belongs to another tenant (BLOCKER-1)', async () => {
    const state: MockState = {
      orders: {
        'order-shared-uuid': {
          id: 'order-shared-uuid',
          tenant_id: TENANT_B,
          table_number: '99',
          total: 8500,
        },
      },
      lineItems: {},
      payments: [],
    };
    const app = createApp(state);

    const result = await postDeltas(app, TENANT_A, [
      {
        id: 'delta-hijack-1',
        tenant_id: TENANT_A,
        order_id: 'order-shared-uuid',
        action: 'create_order',
        timestamp: '2026-10-16T10:00:00Z',
        payload: { tableNumber: '1', coverCount: 2, serverName: 'Attacker', total: 0 },
      },
    ]);

    expect(result.confirmedIds).toEqual([]);
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0].error).toContain('Cross-tenant order ID collision rejected');
    expect(state.orders['order-shared-uuid'].tenant_id).toBe(TENANT_B);
    expect(state.orders['order-shared-uuid'].total).toBe(8500);
  });

  it('2. Rejects add_line_item when parent order belongs to another tenant and recomputes line_total (BLOCKER-1 & RISK-1)', async () => {
    const state: MockState = {
      orders: {
        'order-tenant-a': { id: 'order-tenant-a', tenant_id: TENANT_A, total: 0 },
        'order-tenant-b': { id: 'order-tenant-b', tenant_id: TENANT_B, total: 5000 },
      },
      lineItems: {},
      payments: [],
    };
    const app = createApp(state);

    const result = await postDeltas(app, TENANT_A, [
      {
        id: 'delta-cross-line',
        tenant_id: TENANT_A,
        order_id: 'order-tenant-b',
        action: 'add_line_item',
        timestamp: '2026-10-16T10:01:00Z',
        payload: { id: 'li-cross', name: 'Steak', quantity: 1, unit_price: 4000, line_total: 4000 },
      },
      {
        id: 'delta-valid-line',
        tenant_id: TENANT_A,
        order_id: 'order-tenant-a',
        action: 'add_line_item',
        timestamp: '2026-10-16T10:02:00Z',
        payload: {
          id: 'li-valid',
          name: 'Smash Burger',
          quantity: 3,
          unit_price: 1400,
          line_total: 100, // Spoofed low line_total — server must recompute 3 * 1400 = 4200
        },
      },
    ]);

    expect(result.confirmedIds).toEqual(['delta-valid-line']);
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0].id).toBe('delta-cross-line');
    expect(result.failures[0].error).toContain('Parent order not found for tenant');
    expect(state.lineItems['li-cross']).toBeUndefined();
    expect(state.lineItems['li-valid'].line_total).toBe(4200);
  });

  it('3. Replays void_line_item for matching tenant order and rejects cross-tenant or missing itemId (BLOCKER-4)', async () => {
    const state: MockState = {
      orders: {
        'order-a': { id: 'order-a', tenant_id: TENANT_A, total: 2800 },
      },
      lineItems: {
        'li-a-1': {
          id: 'li-a-1',
          order_id: 'order-a',
          tenant_id: TENANT_A,
          name: 'Fries',
          is_voided: false,
        },
        'li-b-1': {
          id: 'li-b-1',
          order_id: 'order-b',
          tenant_id: TENANT_B,
          name: 'Lobster',
          is_voided: false,
        },
      },
      payments: [],
    };
    const app = createApp(state);

    const result = await postDeltas(app, TENANT_A, [
      {
        id: 'delta-void-valid',
        tenant_id: TENANT_A,
        order_id: 'order-a',
        action: 'void_line_item',
        timestamp: '2026-10-16T10:03:00Z',
        payload: { itemId: 'li-a-1', reasonCode: 'customer_change' },
      },
      {
        id: 'delta-void-cross-tenant',
        tenant_id: TENANT_A,
        order_id: 'order-b',
        action: 'void_line_item',
        timestamp: '2026-10-16T10:04:00Z',
        payload: { itemId: 'li-b-1', reasonCode: 'customer_change' },
      },
      {
        id: 'delta-void-missing-id',
        tenant_id: TENANT_A,
        order_id: 'order-a',
        action: 'void_line_item',
        timestamp: '2026-10-16T10:05:00Z',
        payload: {},
      },
    ]);

    expect(result.confirmedIds).toEqual(['delta-void-valid']);
    expect(result.failures).toHaveLength(2);
    expect(state.lineItems['li-a-1'].is_voided).toBe(true);
    expect(state.lineItems['li-a-1'].void_reason).toBe('customer_change');
    expect(state.lineItems['li-b-1'].is_voided).toBe(false);
  });

  it('4. Rejects finalize_payment when amount mismatches authoritative order total or is non-integer (RISK-1)', async () => {
    const state: MockState = {
      orders: {
        'order-a': { id: 'order-a', tenant_id: TENANT_A, status: 'open', total: 3500 },
      },
      lineItems: {},
      payments: [],
    };
    const app = createApp(state);

    const result = await postDeltas(app, TENANT_A, [
      {
        id: 'delta-pay-tampered',
        tenant_id: TENANT_A,
        order_id: 'order-a',
        action: 'finalize_payment',
        timestamp: '2026-10-16T10:06:00Z',
        payload: { method: 'cash', amount: 100, tip_cents: 0 },
      },
      {
        id: 'delta-pay-float',
        tenant_id: TENANT_A,
        order_id: 'order-a',
        action: 'finalize_payment',
        timestamp: '2026-10-16T10:07:00Z',
        payload: { method: 'cash', amount: 35.5, tip_cents: 0 },
      },
      {
        id: 'delta-pay-exact',
        tenant_id: TENANT_A,
        order_id: 'order-a',
        action: 'finalize_payment',
        timestamp: '2026-10-16T10:08:00Z',
        payload: { method: 'cash', amount: 3500, tip_cents: 500 },
      },
    ]);

    expect(result.confirmedIds).toEqual(['delta-pay-exact']);
    expect(result.failures).toHaveLength(2);
    expect(result.failures.find((f) => f.id === 'delta-pay-tampered')?.error).toContain(
      'does not match authoritative order total'
    );
    expect(result.failures.find((f) => f.id === 'delta-pay-float')?.error).toContain(
      'non-negative integer cents'
    );
    expect(state.payments).toHaveLength(1);
    expect(state.payments[0].amount).toBe(3500);
    expect(state.orders['order-a'].status).toBe('paid');
  });
});
