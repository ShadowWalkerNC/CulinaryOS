// ============================================================
// Tier 2 — F3.3: Multi-Rate Tax Engine (Boundary & Corner Cases)
// Covers: 0% tax rate across all categories, 100% tax rate, 1-cent items,
// extreme $100,000 corporate banquet invoices, and empty basket tax.
// ============================================================

import { describe, expect, it } from 'bun:test';
import {
  computeMultiRateTax,
  type TaxRatesConfig,
  type TaxableLineItem,
} from '../tier1-features/f3_3_multi_rate_tax.test.js';

describe('F3.3 Multi-Rate Tax — Tier 2 Boundaries', () => {
  const standardConfig: TaxRatesConfig = {
    preparedFoodRatePct: 8.25,
    alcoholRatePct: 15.00,
    taxExemptRatePct: 0.00,
  };

  it('1. calculates zero tax when all tax rates are 0% (e.g. tax-free jurisdiction)', () => {
    const zeroConfig: TaxRatesConfig = {
      preparedFoodRatePct: 0.00,
      alcoholRatePct: 0.00,
      taxExemptRatePct: 0.00,
    };
    const items: TaxableLineItem[] = [
      { id: '1', name: 'Steak', category: 'prepared_food', quantity: 1, unitPriceCents: 5000 },
      { id: '2', name: 'Wine', category: 'alcohol', quantity: 1, unitPriceCents: 5000 },
    ];
    const res = computeMultiRateTax(items, zeroConfig);
    expect(res.totalTaxCents).toBe(0);
    expect(res.grandTotalCents).toBe(10000);
  });

  it('2. handles empty items list returning 0 for all tax metrics', () => {
    const res = computeMultiRateTax([], standardConfig);
    expect(res.subtotalCents).toBe(0);
    expect(res.totalTaxCents).toBe(0);
    expect(res.grandTotalCents).toBe(0);
  });

  it('3. rounds 1-cent micro items correctly without precision failure', () => {
    const items: TaxableLineItem[] = [
      { id: '1', name: 'Single Mint', category: 'prepared_food', quantity: 1, unitPriceCents: 1 }, // 1 cent
    ];
    const res = computeMultiRateTax(items, standardConfig);
    // 1 * 0.0825 = 0.0825 -> 0 cents tax
    expect(res.preparedFoodTaxCents).toBe(0);
    expect(res.grandTotalCents).toBe(1);
  });

  it('4. computes tax accurately on large $100,000 banquet invoice without integer overflow', () => {
    const items: TaxableLineItem[] = [
      { id: '1', name: 'Catering Buffet', category: 'prepared_food', quantity: 1, unitPriceCents: 7000000 }, // $70,000.00
      { id: '2', name: 'Open Bar Package', category: 'alcohol', quantity: 1, unitPriceCents: 3000000 },       // $30,000.00
    ];
    const res = computeMultiRateTax(items, standardConfig);
    // Food tax: 7000000 * 0.0825 = 577500 ($5,775.00)
    // Alcohol tax: 3000000 * 0.15 = 450000 ($4,500.00)
    // Total Tax: 1027500 ($10,275.00)
    // Grand Total: 11027500 ($110,275.00)
    expect(res.subtotalCents).toBe(10000000);
    expect(res.preparedFoodTaxCents).toBe(577500);
    expect(res.alcoholTaxCents).toBe(450000);
    expect(res.totalTaxCents).toBe(1027500);
    expect(res.grandTotalCents).toBe(11027500);
  });

  it('5. handles 100% tax rate theoretical extreme without crash', () => {
    const extremeConfig: TaxRatesConfig = {
      preparedFoodRatePct: 100.00,
      alcoholRatePct: 100.00,
      taxExemptRatePct: 0.00,
    };
    const items: TaxableLineItem[] = [
      { id: '1', name: 'Caviar', category: 'prepared_food', quantity: 1, unitPriceCents: 20000 },
    ];
    const res = computeMultiRateTax(items, extremeConfig);
    expect(res.totalTaxCents).toBe(20000);
    expect(res.grandTotalCents).toBe(40000);
  });
});
