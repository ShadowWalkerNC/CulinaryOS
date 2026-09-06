import { describe, expect, it } from 'bun:test';
import { app } from '../../apps/server/src/index';

const DEMO_TENANT = '00000000-0000-0000-0000-000000000001';

describe('Commissary Multi-Unit Stock Transfer API', () => {
  it('1. GET /v1/commissary/transfers returns list of transfers for tenant', async () => {
    const res = await app.request('/v1/commissary/transfers', {
      headers: { 'X-Tenant-Id': DEMO_TENANT },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(Array.isArray(body.data.transfers)).toBe(true);
  });

  it('2. POST /v1/commissary/transfers/request creates an internal replenishment order', async () => {
    const res = await app.request('/v1/commissary/transfers/request', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': DEMO_TENANT,
      },
      body: JSON.stringify({
        items: [
          { itemName: 'Brioche Burger Buns', quantityRequested: 40, unit: 'packs' },
          { itemName: 'House Truffle Aioli', quantityRequested: 10, unit: 'liters' },
        ],
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data.status).toBe('requested');
    expect(body.data.items.length).toBe(2);
    expect(body.data.orderNumber).toMatch(/^TR-\d+/);
  });

  it('3. PATCH /v1/commissary/transfers/:id/fulfill assigns batch lot codes and marks shipped', async () => {
    // Create an order first
    const createRes = await app.request('/v1/commissary/transfers/request', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': DEMO_TENANT,
      },
      body: JSON.stringify({
        items: [{ itemName: 'Marinara Sauce Base', quantityRequested: 25, unit: 'kg' }],
      }),
    });
    const transfer = (await createRes.json()).data;

    // Fulfill
    const fulfillRes = await app.request(`/v1/commissary/transfers/${transfer.id}/fulfill`, {
      method: 'PATCH',
      headers: { 'X-Tenant-Id': DEMO_TENANT },
    });
    expect(fulfillRes.status).toBe(200);
    const fulfillBody = await fulfillRes.json();
    expect(fulfillBody.ok).toBe(true);
    expect(fulfillBody.data.status).toBe('shipped');
    expect(fulfillBody.data.items[0].lotCode).toBeDefined();
    expect(fulfillBody.data.items[0].lotCode).toMatch(/^LOT-/);
  });

  it('4. GET /v1/commissary/royalty-ledger calculates multi-store franchise royalties', async () => {
    const res = await app.request('/v1/commissary/royalty-ledger?from=2026-09-01&to=2026-09-30', {
      headers: { 'X-Tenant-Id': DEMO_TENANT },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data.totalRoyaltyDueCents).toBeGreaterThan(0);
    expect(Array.isArray(body.data.stores)).toBe(true);
  });
});
