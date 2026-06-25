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
