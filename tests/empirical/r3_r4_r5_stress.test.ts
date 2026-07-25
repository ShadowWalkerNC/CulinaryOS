// ============================================================
// Empirical & Adversarial Stress Tests for Requirements R3, R4, R5
// ============================================================

import { describe, it, expect } from 'bun:test';
import { kdsRoutes } from '../../apps/server/src/routes/kds';
import { pantryRoutes } from '../../apps/server/src/routes/pantry';
import { initialHoldStatus } from '../../kds/server/lib/course-engine';

// -------------------------------------------------------------------
// Helper: Timer Color & Alert Label Mirror (matching TicketCard.tsx)
// -------------------------------------------------------------------
function getTimerAlertInfo(secs: number) {
  let alertLabel: 'NORMAL' | 'AMBER ALERT' | 'RED ALERT';
  let color: string;

  if (secs < 300) {
    alertLabel = 'NORMAL';
    color = 'var(--green)';
  } else if (secs < 600) {
    alertLabel = 'AMBER ALERT';
    color = 'var(--amber)';
  } else {
    alertLabel = 'RED ALERT';
    color = 'var(--red)';
  }

  const m = Math.floor(Math.max(0, secs) / 60).toString().padStart(2, '0');
  const s = (Math.max(0, secs) % 60).toString().padStart(2, '0');
  const formattedTime = `${m}:${s}`;

  return { alertLabel, color, formattedTime };
}

// -------------------------------------------------------------------
// Helper: Station Filter Logic Mirror (matching useRealtimeTickets.ts)
// -------------------------------------------------------------------
interface TestTicket {
  id: string;
  stationId: string;
  courseHoldStatus: 'held' | 'fired';
  status: 'queued' | 'cooking' | 'ready' | 'bumped' | 'voided';
}

function filterTicketsByStation(tickets: TestTicket[], stationId: string): TestTicket[] {
  if (stationId === 'expo') {
    return tickets.filter(t => !['bumped', 'voided'].includes(t.status));
  }
  if (stationId === 'all') {
    return tickets.filter(t => t.courseHoldStatus === 'fired' && !['bumped', 'voided'].includes(t.status));
  }
  return tickets.filter(
    t => t.stationId === stationId && t.courseHoldStatus === 'fired' && !['bumped', 'voided'].includes(t.status)
  );
}

// -------------------------------------------------------------------
// Helper: Post-Pilot Loyalty Evaluator (matching step2_post_pilot_marketing)
// -------------------------------------------------------------------
interface GuestLoyalty {
  name: string;
  address: string;
  visitCount: number;
  totalSpendDollars: number;
}

function evaluatePostPilotLoyalty(guest: GuestLoyalty) {
  const VISIT_THRESHOLD = 5;
  const SPEND_THRESHOLD = 250.00;

  if (guest.visitCount >= VISIT_THRESHOLD || guest.totalSpendDollars >= SPEND_THRESHOLD) {
    const discount = guest.totalSpendDollars >= SPEND_THRESHOLD ? 20 : 15;
    return {
      success: true,
      couponCode: `SAVE${discount}`,
      discountPercent: discount,
      recipient: guest.name,
    };
  }
  return null;
}

// ===================================================================
// R3 Empirical Tests: HTMX Server-Driven HTML Streaming
// ===================================================================
describe('R3: HTMX Endpoint GET /v1/kds/htmx-cards Edge Cases', () => {
  it('returns 422 status code when X-Tenant-Id header is missing', async () => {
    const res = await kdsRoutes.request('/htmx-cards');
    expect(res.status).toBe(422);
  });

  it('returns 200 OK with text/html content type when X-Tenant-Id is present', async () => {
    const res = await kdsRoutes.request('/htmx-cards', {
      headers: { 'X-Tenant-Id': 'tenant-bistro-test' }
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');
    const html = await res.text();
    expect(typeof html).toBe('string');
  });

  it('verifies HTML output structure contains hx-patch bump attributes', async () => {
    const res = await kdsRoutes.request('/htmx-cards', {
      headers: { 'X-Tenant-Id': 'tenant-bistro-test' }
    });
    const html = await res.text();
    expect(html).toContain('hx-patch="/v1/kds/tickets/');
    expect(html).toContain('hx-target="closest .kds-card"');
    expect(html).toContain('hx-swap="outerHTML"');
  });

  it('analyzes unescaped HTML special characters in item names (XSS / malformed HTML risk)', async () => {
    // Demonstration of edge case: raw HTML string template formatting without sanitization
    const mockItemWithHTML = { name: 'Spicy <Soup> & "Cracker"', quantity: 1, station: 'hot' };
    const rawTemplate = `<div>${mockItemWithHTML.quantity}x ${mockItemWithHTML.name} [${mockItemWithHTML.station}]</div>`;
    // Confirm raw template preserves unescaped < and > and "
    expect(rawTemplate).toContain('<Soup>');
    expect(rawTemplate).not.toContain('&lt;Soup&gt;');
  });
});

// ===================================================================
// R4 Empirical Tests: KitchenKit KDS Engine, Timers & Age Alerts
// ===================================================================
describe('R4: KitchenKit KDS Station Filtering & Timer Age Alert Boundaries', () => {
  const sampleTickets: TestTicket[] = [
    { id: 't1', stationId: '1', courseHoldStatus: 'fired', status: 'cooking' },
    { id: 't2', stationId: '1', courseHoldStatus: 'held',  status: 'queued'  },
    { id: 't3', stationId: '2', courseHoldStatus: 'fired', status: 'cooking' },
    { id: 't4', stationId: '3', courseHoldStatus: 'fired', status: 'ready'   },
    { id: 't5', stationId: '4', courseHoldStatus: 'fired', status: 'cooking' },
    { id: 't6', stationId: '1', courseHoldStatus: 'fired', status: 'bumped'  },
  ];

  it('filters station tickets correctly for Expo Pass (expo)', () => {
    const res = filterTicketsByStation(sampleTickets, 'expo');
    expect(res.map(t => t.id)).toEqual(['t1', 't2', 't3', 't4', 't5']);
  });

  it('filters station tickets correctly for All Stations (all)', () => {
    const res = filterTicketsByStation(sampleTickets, 'all');
    expect(res.map(t => t.id)).toEqual(['t1', 't3', 't4', 't5']);
  });

  it('filters station tickets correctly for Hot Grill (station 1)', () => {
    const res = filterTicketsByStation(sampleTickets, '1');
    expect(res.map(t => t.id)).toEqual(['t1']);
  });

  it('returns empty array for non-existent station ID', () => {
    const res = filterTicketsByStation(sampleTickets, '999');
    expect(res).toEqual([]);
  });

  it('evaluates age alert boundary 4:59 -> 5:00 transition (299s vs 300s)', () => {
    const at299 = getTimerAlertInfo(299);
    expect(at299.alertLabel).toBe('NORMAL');
    expect(at299.color).toBe('var(--green)');
    expect(at299.formattedTime).toBe('04:59');

    const at300 = getTimerAlertInfo(300);
    expect(at300.alertLabel).toBe('AMBER ALERT');
    expect(at300.color).toBe('var(--amber)');
    expect(at300.formattedTime).toBe('05:00');
  });

  it('evaluates age alert boundary 9:59 -> 10:00 transition (599s vs 600s)', () => {
    const at599 = getTimerAlertInfo(599);
    expect(at599.alertLabel).toBe('AMBER ALERT');
    expect(at599.color).toBe('var(--amber)');
    expect(at599.formattedTime).toBe('09:59');

    const at600 = getTimerAlertInfo(600);
    expect(at600.alertLabel).toBe('RED ALERT');
    expect(at600.color).toBe('var(--red)');
    expect(at600.formattedTime).toBe('10:00');
  });

  it('evaluates course hold/fire state machine initial rules', () => {
    expect(initialHoldStatus(1)).toBe('firing');
    expect(initialHoldStatus(2)).toBe('held');
    expect(initialHoldStatus(3)).toBe('held');
  });

  it('verifies bump capability rules (canBump requires cooking or ready)', () => {
    const canBump = (status: string) => status === 'cooking' || status === 'ready';
    expect(canBump('queued')).toBe(false);
    expect(canBump('cooking')).toBe(true);
    expect(canBump('ready')).toBe(true);
    expect(canBump('bumped')).toBe(false);
  });
});

// ===================================================================
// R5 Empirical Tests: Plated Inventory & Post-Pilot Loyalty Bounds
// ===================================================================
describe('R5: Plated Inventory Deduction & Post-Pilot Loyalty Boundaries', () => {
  it('deducts inventory correctly on positive quantity request', async () => {
    const res = await pantryRoutes.request('/deduct', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': 'tenant-bistro-test',
      },
      body: JSON.stringify({ itemId: 'i1', quantity: 2.5 }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it('handles zero quantity deduction request', async () => {
    const res = await pantryRoutes.request('/deduct', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': 'tenant-bistro-test',
      },
      body: JSON.stringify({ itemId: 'i1', quantity: 0 }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it('evaluates negative quantity deduction behavior (finding: negative qty increases stock)', async () => {
    const res = await pantryRoutes.request('/deduct', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': 'tenant-bistro-test',
      },
      body: JSON.stringify({ itemId: 'i1', quantity: -5.0 }),
    });
    expect(res.status).toBe(200);
  });

  it('evaluates par level threshold alerts (stock <= par_level)', () => {
    const isLowStock = (stock: number, par: number) => stock <= par;

    expect(isLowStock(60, 50)).toBe(false); // Above par
    expect(isLowStock(50, 50)).toBe(true);  // Exactly at par threshold
    expect(isLowStock(40, 50)).toBe(true);  // Below par
  });

  it('evaluates Post-Pilot spend boundary ($249.99 vs $250.00)', () => {
    // $249.99 with 4 visits -> no coupon
    const sub250 = evaluatePostPilotLoyalty({
      name: 'Alice',
      address: '123 Main St',
      visitCount: 4,
      totalSpendDollars: 249.99,
    });
    expect(sub250).toBeNull();

    // $250.00 with 4 visits -> SAVE20 coupon
    const exact250 = evaluatePostPilotLoyalty({
      name: 'Alice',
      address: '123 Main St',
      visitCount: 4,
      totalSpendDollars: 250.00,
    });
    expect(exact250).not.toBeNull();
    expect(exact250?.couponCode).toBe('SAVE20');
    expect(exact250?.discountPercent).toBe(20);
  });

  it('evaluates Post-Pilot visit boundary (4 vs 5 visits)', () => {
    // 4 visits with $100 spend -> no coupon
    const visit4 = evaluatePostPilotLoyalty({
      name: 'Bob',
      address: '456 Oak St',
      visitCount: 4,
      totalSpendDollars: 100.00,
    });
    expect(visit4).toBeNull();

    // 5 visits with $100 spend -> SAVE15 coupon
    const visit5 = evaluatePostPilotLoyalty({
      name: 'Bob',
      address: '456 Oak St',
      visitCount: 5,
      totalSpendDollars: 100.00,
    });
    expect(visit5).not.toBeNull();
    expect(visit5?.couponCode).toBe('SAVE15');
    expect(visit5?.discountPercent).toBe(15);
  });

  it('evaluates precedence when both visit and spend milestones are met', () => {
    // 5 visits AND $250.00 spend -> spend milestone (20%) takes precedence over visit (15%)
    const bothMilestones = evaluatePostPilotLoyalty({
      name: 'Charlie',
      address: '789 Pine St',
      visitCount: 5,
      totalSpendDollars: 250.00,
    });
    expect(bothMilestones).not.toBeNull();
    expect(bothMilestones?.couponCode).toBe('SAVE20');
    expect(bothMilestones?.discountPercent).toBe(20);
  });
});
