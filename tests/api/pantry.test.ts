// ============================================================
// Tests: RecipeOS Pantry — deduct logic
// ============================================================

import { describe, it, expect } from 'bun:test';

// ---- Unit: deduct quantity math ----

describe('pantry deduct math', () => {
  function calcNewQty(currentQty: number, linkQty: number, soldQty: number): number {
    const delta = -(linkQty * soldQty);
    return Math.max(0, currentQty + delta);
  }

  it('deducts correct amount', () => {
    expect(calcNewQty(24, 1, 3)).toBe(21);   // 3 ribeyes sold
  });

  it('deducts fractional recipe quantities', () => {
    expect(calcNewQty(2000, 30, 2)).toBe(1940); // 2 dishes × 30g butter each
  });

  it('floors at 0 — never goes negative', () => {
    expect(calcNewQty(2, 1, 5)).toBe(0); // only 2 steaks left, sold 5
  });

  it('no-op when qty is 0 deducted', () => {
    expect(calcNewQty(100, 0, 5)).toBe(100);
  });
});

// ---- Unit: low-stock threshold detection ----

describe('low-stock detection', () => {
  function isLowStock(currentQty: number, reorderAt: number): boolean {
    return currentQty <= reorderAt;
  }

  it('detects low stock at exactly the threshold', () => {
    expect(isLowStock(8, 8)).toBe(true);
  });

  it('detects low stock below threshold', () => {
    expect(isLowStock(3, 8)).toBe(true);
  });

  it('reports ok when above threshold', () => {
    expect(isLowStock(24, 8)).toBe(false);
  });

  it('detects out-of-stock', () => {
    expect(isLowStock(0, 8)).toBe(true);
  });
});

// ---- Unit: stock status label ----

describe('pantry_status view logic', () => {
  function stockStatus(currentQty: number, reorderAt: number): string {
    if (currentQty <= 0)          return 'out_of_stock';
    if (currentQty <= reorderAt)  return 'low_stock';
    return 'ok';
  }

  it('returns ok when well stocked', ()     => expect(stockStatus(24, 8)).toBe('ok'));
  it('returns low_stock at threshold', ()   => expect(stockStatus(8, 8)).toBe('low_stock'));
  it('returns low_stock below threshold', ()=> expect(stockStatus(5, 8)).toBe('low_stock'));
  it('returns out_of_stock at zero', ()     => expect(stockStatus(0, 8)).toBe('out_of_stock'));
  it('returns out_of_stock below zero', ()  => expect(stockStatus(-1, 8)).toBe('out_of_stock'));
});
