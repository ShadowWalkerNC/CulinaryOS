// ============================================================
// Integration: POS fire → mock kitchen tickets (no Supabase)
// ============================================================

import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'bun:test';
import { ordersRoutes } from '@culinaryos/server/routes/orders';
import { kdsRoutes } from '@culinaryos/server/routes/kds';
import { resetMockTickets } from '@culinaryos/server/lib/mock-kitchen';

const TENANT = '00000000-0000-0000-0000-000000000001';

function tenantHeaders(extra: Record<string, string> = {}) {
  return {
    'Content-Type': 'application/json',
    'X-Tenant-Id': TENANT,
    Authorization: `Bearer ${process.env.DEVICE_API_KEY ?? process.env.INTERNAL_API_KEY ?? 'test-key-ci'}`,
    ...extra,
  };
}

describe('POS → KDS fire path (mock kitchen store)', () => {
  beforeAll(() => {
    process.env.AUTH_RELAXED = 'true';
    process.env.INTERNAL_API_KEY = process.env.INTERNAL_API_KEY ?? 'test-key-ci';
    process.env.DEVICE_API_KEY = process.env.DEVICE_API_KEY ?? 'test-key-ci';
    // Ensure broker/middleware treat this as offline demo
    process.env.SUPABASE_URL = process.env.SUPABASE_URL ?? 'https://your-project.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY =
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'your-service-role-key';
  });

  beforeEach(() => {
    resetMockTickets([]);
  });

  afterEach(() => {
    resetMockTickets();
  });

  it('creates kitchen tickets when send includes a client order snapshot', async () => {
    const orderId = 'o-fire-test-1';
    const sendRes = await ordersRoutes.request(`/${orderId}/send`, {
      method: 'PATCH',
      headers: tenantHeaders(),
      body: JSON.stringify({
        order: {
          tableNumber: '7',
          serverName: 'Alex',
          createdAt: new Date().toISOString(),
          items: [
            {
              lineItemId: 'li-1',
              name: 'Ribeye',
              quantity: 1,
              station: 'grill',
              courseNumber: 1,
              modifiers: ['Medium Rare'],
            },
            {
              lineItemId: 'li-2',
              name: 'Caesar Salad',
              quantity: 1,
              station: 'cold',
              courseNumber: 1,
              modifiers: [],
            },
          ],
        },
      }),
    });

    expect(sendRes.status).toBe(200);
    const sendBody = await sendRes.json();
    expect(sendBody.ok).toBe(true);
    expect(sendBody.data.status).toBe('sent');
    expect(sendBody.data.ticketCount).toBe(2);

    const ticketsRes = await kdsRoutes.request('/tickets', {
      headers: tenantHeaders(),
    });
    expect(ticketsRes.status).toBe(200);
    const ticketsBody = await ticketsRes.json();
    expect(ticketsBody.ok).toBe(true);
    const tickets = ticketsBody.data as Array<{ order_id: string; station: string; status: string }>;
    expect(tickets.length).toBe(2);
    expect(tickets.every((t) => t.order_id === orderId)).toBe(true);
    expect(tickets.map((t) => t.station).sort()).toEqual(['cold', 'grill']);
    expect(tickets.every((t) => t.status === 'fired')).toBe(true);
  });

  it('filters tickets by station query', async () => {
    const orderId = 'o-fire-test-2';
    await ordersRoutes.request(`/${orderId}/send`, {
      method: 'PATCH',
      headers: tenantHeaders(),
      body: JSON.stringify({
        order: {
          tableNumber: '3',
          items: [
            { lineItemId: 'li-a', name: 'Fries', quantity: 1, station: 'fry', courseNumber: 1 },
            { lineItemId: 'li-b', name: 'Soup', quantity: 1, station: 'hot', courseNumber: 1 },
          ],
        },
      }),
    });

    const fryRes = await kdsRoutes.request('/tickets?station=fry', {
      headers: tenantHeaders(),
    });
    const fryBody = await fryRes.json();
    expect(fryBody.data).toHaveLength(1);
    expect(fryBody.data[0].station).toBe('fry');
  });

  it('is idempotent when order already sent', async () => {
    const orderId = 'o-fire-test-3';
    const body = {
      order: {
        tableNumber: '1',
        items: [
          { lineItemId: 'li-x', name: 'Burger', quantity: 1, station: 'grill', courseNumber: 1 },
        ],
      },
    };

    const first = await ordersRoutes.request(`/${orderId}/send`, {
      method: 'PATCH',
      headers: tenantHeaders(),
      body: JSON.stringify(body),
    });
    expect((await first.json()).data.ticketCount).toBe(1);

    const second = await ordersRoutes.request(`/${orderId}/send`, {
      method: 'PATCH',
      headers: tenantHeaders(),
      body: JSON.stringify(body),
    });
    const secondBody = await second.json();
    expect(second.status).toBe(200);
    expect(secondBody.data.alreadySent).toBe(true);

    const ticketsRes = await kdsRoutes.request('/tickets', { headers: tenantHeaders() });
    const tickets = (await ticketsRes.json()).data;
    expect(tickets.filter((t: any) => t.order_id === orderId)).toHaveLength(1);
  });
});
