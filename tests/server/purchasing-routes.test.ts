// ============================================================
// CulinaryOS — Purchasing & Distributor Routes Integration Tests
// Validates ShorelineOps API parity:
// Vendors, Catalogs, Order Guides, Dennis CSV Import, Split MRP,
// and PO Approval/Receiving lifecycle.
// ============================================================

import { describe, expect, it } from 'bun:test';
import { app } from '../../apps/server/src/index';

const DEMO_TENANT = '00000000-0000-0000-0000-000000000001';

describe('Purchasing & Distributor API Endpoints (ShorelineOps Parity)', () => {
  it('1. GET /v1/purchasing/vendors returns active vendor list', async () => {
    const res = await app.request('/v1/purchasing/vendors', {
      headers: { 'X-Tenant-Id': DEMO_TENANT },
    });
    expect(res.status).toBe(200);
    const vendors = await res.json();
    expect(Array.isArray(vendors)).toBe(true);
    expect(vendors.length).toBeGreaterThanOrEqual(3);

    const dennis = vendors.find((v: any) => v.code === 'dennis');
    expect(dennis).toBeDefined();
    expect(dennis.name).toBe('Dennis Food Service');

    const sysco = vendors.find((v: any) => v.code === 'sysco');
    expect(sysco).toBeDefined();
    expect(sysco.name).toBe('Sysco Foods');
  });

  it('2. GET /v1/purchasing/order-guide returns standing order guide items', async () => {
    const res = await app.request('/v1/purchasing/order-guide?vendorId=dennis-1', {
      headers: { 'X-Tenant-Id': DEMO_TENANT },
    });
    expect(res.status).toBe(200);
    const guide = await res.json();
    expect(Array.isArray(guide)).toBe(true);
    expect(guide.length).toBeGreaterThan(0);
    expect(guide[0].vendor_id).toBe('dennis-1');
    expect(guide[0].item_name).toBeDefined();
    expect(typeof guide[0].par_level).toBe('number');
    expect(typeof guide[0].on_hand).toBe('number');
  });

  it('3. PUT /v1/purchasing/order-guide/:id updates par level and on-hand count', async () => {
    // Get first guide entry
    const listRes = await app.request('/v1/purchasing/order-guide?vendorId=dennis-1', {
      headers: { 'X-Tenant-Id': DEMO_TENANT },
    });
    const guide = await listRes.json();
    const target = guide[0];

    const updateRes = await app.request(`/v1/purchasing/order-guide/${target.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': DEMO_TENANT,
      },
      body: JSON.stringify({
        parLevel: 10,
        onHand: 4,
      }),
    });

    expect(updateRes.status).toBe(200);
    const updated = await updateRes.json();
    expect(updated.par_level).toBe(10);
    expect(updated.on_hand).toBe(4);
  });

  it('4. POST /v1/purchasing/suggested-order calculates below-par deficits and estimated spend', async () => {
    const res = await app.request('/v1/purchasing/suggested-order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': DEMO_TENANT,
      },
      body: JSON.stringify({ vendorId: 'dennis-1' }),
    });

    expect(res.status).toBe(200);
    const summary = await res.json();
    expect(summary.vendorId).toBe('dennis-1');
    expect(Array.isArray(summary.lines)).toBe(true);
    expect(summary.totalItems).toBeGreaterThan(0);
    expect(summary.totalUnits).toBeGreaterThan(0);
    expect(summary.totalCost).toBeGreaterThan(0);
  });

  it('5. POST /v1/purchasing/import-guide ingests Dennis CSV and syncs order guide', async () => {
    const csvContent = `
Item Number,Description,Brand,Pack / Size,UOM,Category,Price,Par Level,Current On Hand
DNS-9001,"Maine Wild Blueberries Frozen",Dennis Farms,1/30 LB,case,Frozen Fruit,74.50,4,1
DNS-9002,"Haddock Fillets Skinless Fresh",Dennis Seafood,1/10 LB,case,Seafood,89.00,3,0
`;

    const res = await app.request('/v1/purchasing/import-guide', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': DEMO_TENANT,
      },
      body: JSON.stringify({
        vendorId: 'dennis-1',
        csvText: csvContent,
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.importedCount).toBe(2);

    // Verify items now exist in catalog and order guide
    const guideRes = await app.request('/v1/purchasing/order-guide?vendorId=dennis-1', {
      headers: { 'X-Tenant-Id': DEMO_TENANT },
    });
    const guide = await guideRes.json();
    const blueberries = guide.find((g: any) => g.vendor_sku === 'DNS-9001');
    expect(blueberries).toBeDefined();
    expect(blueberries.par_level).toBe(4);
    expect(blueberries.on_hand).toBe(1);
  });

  it('6. POST /v1/purchasing/split-mrp-optimizer routes items to lowest-cost vendor and computes savings', async () => {
    const res = await app.request('/v1/purchasing/split-mrp-optimizer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': DEMO_TENANT,
      },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(200);
    const splitData = await res.json();
    expect(splitData.ok).toBe(true);
    expect(Array.isArray(splitData.splitOrders)).toBe(true);
    expect(typeof splitData.totalSplitCost).toBe('number');
    expect(typeof splitData.projectedSavings).toBe('number');
  });

  it('7. executes full PO lifecycle: draft -> approve -> submit -> interactive line receiving', async () => {
    // A. Create draft purchase order
    const createRes = await app.request('/v1/purchasing/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': DEMO_TENANT,
      },
      body: JSON.stringify({
        vendorId: 'dennis-1',
        orderDate: '2026-09-20',
        lines: [
          {
            vendorItemId: 'vi-1',
            qtyOrdered: 4,
            unitCost: 48.50,
            notes: 'Restock peaches for breakfast bar',
          },
        ],
        notes: 'ShorelineOps integration verification PO',
      }),
    });

    expect(createRes.status).toBe(201);
    const po = await createRes.json();
    expect(po.status).toBe('draft');
    expect(po.lines.length).toBe(1);
    const lineId = po.lines[0].id;

    // B. Approve PO (manager approval workflow)
    const approveRes = await app.request(`/v1/purchasing/orders/${po.id}/approve`, {
      method: 'POST',
      headers: { 'X-Tenant-Id': DEMO_TENANT },
    });
    expect(approveRes.status).toBe(200);
    const approvedPO = await approveRes.json();
    expect(approvedPO.status).toBe('approved');

    // C. Submit PO (transmission to vendor)
    const submitRes = await app.request(`/v1/purchasing/orders/${po.id}/submit`, {
      method: 'POST',
      headers: { 'X-Tenant-Id': DEMO_TENANT },
    });
    expect(submitRes.status).toBe(200);
    const submittedPO = await submitRes.json();
    expect(submittedPO.status).toBe('submitted');

    // D. Partial line receive (2 of 4 cases arrive)
    const partialRecRes = await app.request(`/v1/purchasing/orders/${po.id}/lines/${lineId}/receive`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': DEMO_TENANT,
      },
      body: JSON.stringify({ qtyReceived: 2 }),
    });
    expect(partialRecRes.status).toBe(200);
    const partBody = await partialRecRes.json();
    expect(partBody.ok).toBe(true);
    expect(partBody.qtyReceived).toBe(2);
    expect(partBody.flags.partial).toBe(true);
    expect(partBody.flags.complete).toBe(false);
    expect(partBody.orderStatus).toBe('partial');

    // E. Final line receive (complete delivery of all 4 cases)
    const fullRecRes = await app.request(`/v1/purchasing/orders/${po.id}/lines/${lineId}/receive`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': DEMO_TENANT,
      },
      body: JSON.stringify({ qtyReceived: 4 }),
    });
    expect(fullRecRes.status).toBe(200);
    const fullBody = await fullRecRes.json();
    expect(fullBody.ok).toBe(true);
    expect(fullBody.qtyReceived).toBe(4);
    expect(fullBody.flags.complete).toBe(true);
    expect(fullBody.orderStatus).toBe('received');
  });
});
