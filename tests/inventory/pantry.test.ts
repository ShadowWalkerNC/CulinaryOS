import { describe, it, expect } from 'bun:test';

// ─── Stock status logic ────────────────────────────────────────────────────
describe('Stock status derivation', () => {
  function stockStatus(current: number, reorderAt: number): string {
    if (current <= 0)          return 'out_of_stock';
    if (current <= reorderAt)  return 'low_stock';
    return 'ok';
  }

  it('out_of_stock when qty is 0',             () => expect(stockStatus(0,   10)).toBe('out_of_stock'));
  it('out_of_stock when qty is negative',      () => expect(stockStatus(-1,  10)).toBe('out_of_stock'));
  it('low_stock when qty equals reorder_at',   () => expect(stockStatus(10,  10)).toBe('low_stock'));
  it('low_stock when qty is below reorder_at', () => expect(stockStatus(5,   10)).toBe('low_stock'));
  it('ok when qty is above reorder_at',        () => expect(stockStatus(11,  10)).toBe('ok'));
  it('ok when reorder_at is 0',                () => expect(stockStatus(1,   0)).toBe('ok'));
});

// ─── PO state machine ──────────────────────────────────────────────────────────
describe('PO state machine transitions', () => {
  const TRANSITIONS: Record<string, string[]> = {
    draft:     ['approved', 'cancelled'],
    approved:  ['sent',     'cancelled'],
    sent:      ['received'],
    received:  [],
    cancelled: [],
  };

  function canTransition(from: string, to: string): boolean {
    return TRANSITIONS[from]?.includes(to) ?? false;
  }

  it('draft → approved is valid',    () => expect(canTransition('draft',    'approved')).toBe(true));
  it('draft → cancelled is valid',   () => expect(canTransition('draft',    'cancelled')).toBe(true));
  it('approved → sent is valid',     () => expect(canTransition('approved', 'sent')).toBe(true));
  it('approved → cancelled is valid',() => expect(canTransition('approved', 'cancelled')).toBe(true));
  it('sent → received is valid',     () => expect(canTransition('sent',     'received')).toBe(true));
  it('received → anything is invalid',() => expect(canTransition('received', 'draft')).toBe(false));
  it('cannot skip draft → sent',     () => expect(canTransition('draft',    'sent')).toBe(false));
  it('cannot go backwards',           () => expect(canTransition('sent',     'draft')).toBe(false));
});

// ─── PO line total cost calculation ───────────────────────────────────────────
describe('PO total cost computation', () => {
  interface Line { ordered_qty: number; unit_cost: number; }

  function totalCost(lines: Line[]): number {
    return lines.reduce((sum, l) => sum + l.ordered_qty * l.unit_cost, 0);
  }

  it('computes single line total',    () => expect(totalCost([{ ordered_qty: 10, unit_cost: 250 }])).toBe(2500));
  it('sums multiple lines',           () => expect(totalCost([
    { ordered_qty: 5,  unit_cost: 100 },
    { ordered_qty: 20, unit_cost: 50  },
  ])).toBe(1500));
  it('returns 0 for empty lines',     () => expect(totalCost([])).toBe(0));
  it('handles zero unit cost lines',  () => expect(totalCost([{ ordered_qty: 100, unit_cost: 0 }])).toBe(0));
});
