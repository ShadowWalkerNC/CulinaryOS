// ============================================================
// Tests: POS Orders — validation + total calculation logic
// ============================================================

import { describe, it, expect } from 'bun:test';

// ---- Unit: order total recalculation ----

describe('order total recalculation', () => {
  interface LineItem { line_total: number; is_voided: boolean; }

  function recalc(items: LineItem[]): { subtotal: number; tax: number; total: number } {
    const subtotal = items
      .filter((i) => !i.is_voided)
      .reduce((s, i) => s + i.line_total, 0);
    const tax   = Math.round(subtotal * 0.1);
    const total = subtotal + tax;
    return { subtotal, tax, total };
  }

  it('calculates correct totals', () => {
    const items = [
      { line_total: 4500, is_voided: false },
      { line_total: 1800, is_voided: false },
    ];
    const result = recalc(items);
    expect(result.subtotal).toBe(6300);
    expect(result.tax).toBe(630);
    expect(result.total).toBe(6930);
  });

  it('excludes voided items from total', () => {
    const items = [
      { line_total: 4500, is_voided: false },
      { line_total: 1800, is_voided: true },  // voided
    ];
    const result = recalc(items);
    expect(result.subtotal).toBe(4500);
    expect(result.tax).toBe(450);
    expect(result.total).toBe(4950);
  });

  it('handles empty order', () => {
    const result = recalc([]);
    expect(result.subtotal).toBe(0);
    expect(result.tax).toBe(0);
    expect(result.total).toBe(0);
  });

  it('rounds tax on fractional cents correctly', () => {
    // 1 item at $10.01 = 1001 cents → tax = round(100.1) = 100
    const result = recalc([{ line_total: 1001, is_voided: false }]);
    expect(result.tax).toBe(100);
    expect(result.total).toBe(1101);
  });

  it('all items voided → zero total', () => {
    const result = recalc([
      { line_total: 4500, is_voided: true },
      { line_total: 1800, is_voided: true },
    ]);
    expect(result.total).toBe(0);
  });
});

// ---- Unit: payment tip + total ----

describe('payment amount calculation', () => {
  function paymentAmount(orderTotal: number, tipAmount: number): number {
    return orderTotal + tipAmount;
  }

  it('adds tip to order total', () => {
    expect(paymentAmount(6930, 1000)).toBe(7930);
  });

  it('handles zero tip', () => {
    expect(paymentAmount(6930, 0)).toBe(6930);
  });
});

// ---- Integration: POS to KDS Realtime Bridge & Offline Menu ----

import { app } from '../../apps/server/src/index';

describe('POS to KDS Realtime Bridge & Offline Fallback', () => {
  const DEMO_TENANT = '00000000-0000-0000-0000-000000000001';

  it('fires POS order snapshot to kitchen and creates station-routed KDS tickets', async () => {
    const orderId = `test-pos-fire-${Date.now()}`;
    const firePayload = {
      order: {
        tableNumber: 'Table 7',
        serverName: 'Demo Server',
        createdAt: new Date().toISOString(),
        items: [
          {
            lineItemId: `li-test-1-${Date.now()}`,
            menuItemId: 'item-burger',
            name: 'Prime Smash Cheeseburger',
            quantity: 2,
            station: 'grill',
            courseNumber: 1,
            modifiers: ['Double Cabot Cheddar'],
            notes: 'Medium Rare',
          },
          {
            lineItemId: `li-test-2-${Date.now()}`,
            menuItemId: 'item-salad',
            name: 'House Caesar Salad',
            quantity: 1,
            station: 'cold',
            courseNumber: 1,
            modifiers: [],
            notes: null,
          },
        ],
      },
    };

    // 1. Send / Fire order from POS
    const sendRes = await app.request(`/v1/orders/${orderId}/send`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        'x-tenant-id': DEMO_TENANT,
      },
      body: JSON.stringify(firePayload),
    });

    expect(sendRes.status).toBe(200);
    const sendBody = await sendRes.json();
    expect(sendBody.data.orderId).toBe(orderId);
    expect(sendBody.data.status).toBe('sent');
    expect(sendBody.data.ticketCount).toBeGreaterThanOrEqual(1);

    // 2. Query KDS tickets endpoint for grill station
    const kdsRes = await app.request('/v1/kds/tickets?station=grill', {
      headers: { 'x-tenant-id': DEMO_TENANT },
    });
    expect(kdsRes.status).toBe(200);
    const kdsBody = await kdsRes.json();
    expect(Array.isArray(kdsBody.data)).toBe(true);
    const matchingGrillTicket = kdsBody.data.find((t: any) => t.order_id === orderId);
    expect(matchingGrillTicket).toBeDefined();
    expect(matchingGrillTicket.table_number).toBe('Table 7');
    expect(matchingGrillTicket.items.some((i: any) => i.name.includes('Prime Smash'))).toBe(true);
  });

  it('serves rich public menu and item details when offline / demo without throwing 500', async () => {
    // 1. Full public menu by slug
    const menuRes = await app.request('/v1/menu/golden-fork');
    expect(menuRes.status).toBe(200);
    const menuBody = await menuRes.json();
    expect(menuBody.ok).toBe(true);
    expect(menuBody.data.restaurant.slug).toBe('golden-fork');
    expect(menuBody.data.sections.length).toBeGreaterThanOrEqual(1);

    // 2. Individual item endpoint offline fallback
    const itemRes = await app.request('/v1/menu/golden-fork/item/item-1');
    expect(itemRes.status).toBe(200);
    const itemBody = await itemRes.json();
    expect(itemBody.ok).toBe(true);
    expect(itemBody.data.name).toBe('Maine Clam Chowder');
  });
});
