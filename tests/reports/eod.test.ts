import { describe, it, expect } from 'bun:test';

// ─── Revenue calculation helpers ─────────────────────────────────────────────
describe('EOD revenue calculations', () => {
  interface Order { status: string; total_cents: number; covers: number; }

  function gross(orders: Order[]): number {
    return orders.filter(o => o.status === 'closed').reduce((s, o) => s + o.total_cents, 0);
  }
  function voids(orders: Order[]): number {
    return orders.filter(o => o.status === 'voided').reduce((s, o) => s + o.total_cents, 0);
  }
  function avgCheck(orders: Order[]): number {
    const closed = orders.filter(o => o.status === 'closed');
    return closed.length > 0 ? Math.round(gross(orders) / closed.length) : 0;
  }
  function revenuePerCover(orders: Order[]): number {
    const closed = orders.filter(o => o.status === 'closed');
    const covers = closed.reduce((s, o) => s + o.covers, 0);
    const rev    = gross(orders);
    return covers > 0 ? Math.round(rev / covers) : 0;
  }

  const orders: Order[] = [
    { status: 'closed', total_cents: 5000, covers: 2 },
    { status: 'closed', total_cents: 3000, covers: 1 },
    { status: 'voided', total_cents: 1500, covers: 1 },
    { status: 'closed', total_cents: 8000, covers: 4 },
  ];

  it('gross revenue sums only closed orders',     () => expect(gross(orders)).toBe(16000));
  it('void total sums only voided orders',        () => expect(voids(orders)).toBe(1500));
  it('net revenue is gross minus void total',     () => expect(gross(orders) - voids(orders)).toBe(14500));
  it('avg check rounds correctly',               () => expect(avgCheck(orders)).toBe(Math.round(16000 / 3)));
  it('revenue per cover',                        () => expect(revenuePerCover(orders)).toBe(Math.round(16000 / 7)));
  it('avg check is 0 with no closed orders',      () => expect(avgCheck([])).toBe(0));
  it('revenue per cover is 0 with no covers',    () => {
    expect(revenuePerCover([{ status: 'closed', total_cents: 0, covers: 0 }])).toBe(0);
  });
});

// ─── Hourly breakdown ───────────────────────────────────────────────────────
describe('Hourly breakdown grouping', () => {
  interface HourEntry { order_count: number; revenue_cents: number; }

  function buildHourly(closedTimes: Array<{ closed_at: string; total_cents: number }>) {
    const map: Record<number, HourEntry> = {};
    for (let h = 0; h < 24; h++) map[h] = { order_count: 0, revenue_cents: 0 };
    for (const o of closedTimes) {
      const h = new Date(o.closed_at).getUTCHours();
      map[h].order_count++;
      map[h].revenue_cents += o.total_cents;
    }
    return map;
  }

  const orders = [
    { closed_at: '2026-06-26T12:15:00Z', total_cents: 2500 },
    { closed_at: '2026-06-26T12:45:00Z', total_cents: 3000 },
    { closed_at: '2026-06-26T19:05:00Z', total_cents: 7500 },
  ];

  it('groups two orders in hour 12',   () => expect(buildHourly(orders)[12].order_count).toBe(2));
  it('sums revenue for hour 12',       () => expect(buildHourly(orders)[12].revenue_cents).toBe(5500));
  it('groups one order in hour 19',    () => expect(buildHourly(orders)[19].order_count).toBe(1));
  it('hour 0 is empty by default',     () => expect(buildHourly(orders)[0].order_count).toBe(0));
});

// ─── Void breakdown by reason ──────────────────────────────────────────────
describe('Void breakdown by reason', () => {
  interface VoidOrder { void_reason: string | null; total_cents: number; }

  function voidsByReason(orders: VoidOrder[]) {
    const map: Record<string, { count: number; total_cents: number }> = {};
    for (const o of orders) {
      const key = o.void_reason ?? 'unspecified';
      if (!map[key]) map[key] = { count: 0, total_cents: 0 };
      map[key].count++;
      map[key].total_cents += o.total_cents;
    }
    return map;
  }

  const voids: VoidOrder[] = [
    { void_reason: 'customer_left', total_cents: 1200 },
    { void_reason: 'customer_left', total_cents: 800  },
    { void_reason: 'wrong_order',   total_cents: 500  },
    { void_reason: null,            total_cents: 300  },
  ];

  it('groups customer_left correctly', () => {
    const r = voidsByReason(voids);
    expect(r['customer_left'].count).toBe(2);
    expect(r['customer_left'].total_cents).toBe(2000);
  });
  it('groups null reason as unspecified', () => {
    expect(voidsByReason(voids)['unspecified'].count).toBe(1);
  });
  it('handles empty void list', () => expect(Object.keys(voidsByReason([]))).toHaveLength(0));
});

// ─── Range report grouping ──────────────────────────────────────────────────
describe('Range report day grouping', () => {
  function groupByDate(orders: Array<{ closed_at: string; total_cents: number }>) {
    const map: Record<string, number> = {};
    for (const o of orders) {
      const day = o.closed_at.slice(0, 10);
      map[day] = (map[day] ?? 0) + o.total_cents;
    }
    return map;
  }

  const orders = [
    { closed_at: '2026-06-24T12:00:00Z', total_cents: 1000 },
    { closed_at: '2026-06-24T19:00:00Z', total_cents: 2000 },
    { closed_at: '2026-06-25T11:00:00Z', total_cents: 1500 },
  ];

  it('groups two orders on June 24',  () => expect(groupByDate(orders)['2026-06-24']).toBe(3000));
  it('groups one order on June 25',   () => expect(groupByDate(orders)['2026-06-25']).toBe(1500));
  it('June 26 has no entry',          () => expect(groupByDate(orders)['2026-06-26']).toBeUndefined());
});
