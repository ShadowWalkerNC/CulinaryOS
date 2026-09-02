// ============================================================
// Tier 1 — F3.3: Multi-Rate Tax Engine (Granular Feature Tests)
// Covers: Prepared food tax rate, alcoholic beverage tax rate,
// tax-exempt goods, item-level breakdown, and order aggregation.
// ============================================================

import { describe, expect, it } from 'bun:test';

export type TaxCategory = 'prepared_food' | 'alcohol' | 'tax_exempt';

export interface TaxRatesConfig {
  preparedFoodRatePct: number; // e.g. 8.25
  alcoholRatePct: number;       // e.g. 15.00
  taxExemptRatePct: number;    // 0
}

export interface TaxableLineItem {
  id: string;
  name: string;
  category: TaxCategory;
  quantity: number;
  unitPriceCents: number;
}

export interface OrderTaxBreakdown {
  subtotalCents: number;
  preparedFoodSalesCents: number;
  preparedFoodTaxCents: number;
  alcoholSalesCents: number;
  alcoholTaxCents: number;
  exemptSalesCents: number;
  totalTaxCents: number;
  grandTotalCents: number;
}

export function computeMultiRateTax(
  items: TaxableLineItem[],
  config: TaxRatesConfig
): OrderTaxBreakdown {
  let preparedFoodSales = 0;
  let alcoholSales = 0;
  let exemptSales = 0;

  for (const item of items) {
    const lineTotal = item.unitPriceCents * item.quantity;
    if (item.category === 'prepared_food') {
      preparedFoodSales += lineTotal;
    } else if (item.category === 'alcohol') {
      alcoholSales += lineTotal;
    } else {
      exemptSales += lineTotal;
    }
  }

  const preparedFoodTax = Math.round(preparedFoodSales * (config.preparedFoodRatePct / 100));
  const alcoholTax = Math.round(alcoholSales * (config.alcoholRatePct / 100));
  const totalTax = preparedFoodTax + alcoholTax;
  const subtotal = preparedFoodSales + alcoholSales + exemptSales;
  const grandTotal = subtotal + totalTax;

  return {
    subtotalCents: subtotal,
    preparedFoodSalesCents: preparedFoodSales,
    preparedFoodTaxCents: preparedFoodTax,
    alcoholSalesCents: alcoholSales,
    alcoholTaxCents: alcoholTax,
    exemptSalesCents: exemptSales,
    totalTaxCents: totalTax,
    grandTotalCents: grandTotal,
  };
}

describe('F3.3 Multi-Rate Tax Engine — Tier 1 Isolation', () => {
  const defaultTaxConfig: TaxRatesConfig = {
    preparedFoodRatePct: 8.25,
    alcoholRatePct: 15.00,
    taxExemptRatePct: 0.00,
  };

  it('1. calculates prepared food tax rate accurately', () => {
    const items: TaxableLineItem[] = [
      { id: '1', name: 'Burger', category: 'prepared_food', quantity: 2, unitPriceCents: 1500 }, // 3000
    ];
    const tax = computeMultiRateTax(items, defaultTaxConfig);
    // 3000 * 0.0825 = 247.5 -> 248 cents ($2.48)
    expect(tax.preparedFoodSalesCents).toBe(3000);
    expect(tax.preparedFoodTaxCents).toBe(248);
    expect(tax.alcoholTaxCents).toBe(0);
    expect(tax.grandTotalCents).toBe(3248);
  });

  it('2. calculates alcoholic beverage tax rate with higher tier percentage', () => {
    const items: TaxableLineItem[] = [
      { id: '1', name: 'Cabernet Sauvignon', category: 'alcohol', quantity: 1, unitPriceCents: 6000 }, // $60.00
    ];
    const tax = computeMultiRateTax(items, defaultTaxConfig);
    // 6000 * 0.15 = 900 cents ($9.00)
    expect(tax.alcoholSalesCents).toBe(6000);
    expect(tax.alcoholTaxCents).toBe(900);
    expect(tax.preparedFoodTaxCents).toBe(0);
    expect(tax.grandTotalCents).toBe(6900);
  });

  it('3. applies 0% tax to tax-exempt items (e.g. gift cards, raw grocery)', () => {
    const items: TaxableLineItem[] = [
      { id: '1', name: '$50 Restaurant Gift Card', category: 'tax_exempt', quantity: 1, unitPriceCents: 5000 },
    ];
    const tax = computeMultiRateTax(items, defaultTaxConfig);
    expect(tax.exemptSalesCents).toBe(5000);
    expect(tax.totalTaxCents).toBe(0);
    expect(tax.grandTotalCents).toBe(5000);
  });

  it('4. aggregates mixed category basket with independent rate computations', () => {
    const items: TaxableLineItem[] = [
      { id: '1', name: 'Steak Dinner', category: 'prepared_food', quantity: 2, unitPriceCents: 4000 }, // 8000
      { id: '2', name: 'Pinot Noir Bottle', category: 'alcohol', quantity: 1, unitPriceCents: 5000 },   // 5000
      { id: '3', name: 'Branded T-Shirt', category: 'tax_exempt', quantity: 1, unitPriceCents: 2500 },  // 2500
    ];
    const tax = computeMultiRateTax(items, defaultTaxConfig);
    // Prepared food tax: 8000 * 0.0825 = 660
    // Alcohol tax: 5000 * 0.15 = 750
    // Exempt: 2500 -> 0
    // Subtotal: 15500
    // Total Tax: 1410
    // Grand Total: 16910
    expect(tax.subtotalCents).toBe(15500);
    expect(tax.preparedFoodTaxCents).toBe(660);
    expect(tax.alcoholTaxCents).toBe(750);
    expect(tax.totalTaxCents).toBe(1410);
    expect(tax.grandTotalCents).toBe(16910);
  });

  it('5. preserves arithmetic precision and whole-cent rounding across large quantities', () => {
    const items: TaxableLineItem[] = [
      { id: '1', name: 'Espresso', category: 'prepared_food', quantity: 33, unitPriceCents: 350 }, // 11550 cents
    ];
    const tax = computeMultiRateTax(items, defaultTaxConfig);
    // 11550 * 0.0825 = 952.875 -> 953 cents
    expect(tax.preparedFoodTaxCents).toBe(953);
    expect(tax.grandTotalCents).toBe(11550 + 953);
  });
});
