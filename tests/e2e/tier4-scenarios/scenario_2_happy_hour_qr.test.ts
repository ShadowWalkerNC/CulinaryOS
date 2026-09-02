// ============================================================
// Tier 4 — Scenario 2: Happy Hour Shift Transition & Tableside QR Ordering
// Features Exercised: F1.3 (Daypart / Happy Hour Pricing),
// F1.4 (3-Mode Tableside QR Experience), F2.1 (Live 86 Countdowns),
// F3.3 (Multi-Rate Tax Engine).
// ============================================================

import { describe, expect, it } from 'bun:test';
import { resolveEffectivePrice, type DaypartSchedule } from '../tier1-features/f1_3_daypart_pricing.test.js';
import { buildTablesideUrl, calculateTablesideTip, initTablesideSession } from '../tier1-features/f1_4_tableside_qr.test.js';
import { decrementLive86, type CountdownItem } from '../tier1-features/f2_1_live_86.test.js';
import { computeMultiRateTax, type TaxRatesConfig } from '../tier1-features/f3_3_multi_rate_tax.test.js';

describe('Tier 4 — Scenario 2: Happy Hour Shift Transition & Tableside QR', () => {
  const hhDrinkSchedule: DaypartSchedule = {
    id: 'dp-hh-drinks',
    name: 'Happy Hour Cocktails',
    daysOfWeek: [1, 2, 3, 4, 5], // Mon-Fri
    startTime: '16:00',
    endTime: '18:00',
    adjustmentType: 'percent',
    value: -30, // 30% off drinks
  };

  const hhAppSchedule: DaypartSchedule = {
    id: 'dp-hh-apps',
    name: 'Happy Hour Small Plates',
    daysOfWeek: [1, 2, 3, 4, 5],
    startTime: '16:00',
    endTime: '18:00',
    adjustmentType: 'fixed_cents',
    value: -400, // $4.00 off
  };

  const taxConfig: TaxRatesConfig = {
    preparedFoodRatePct: 8.25,
    alcoholRatePct: 15.00,
    taxExemptRatePct: 0.00,
  };

  it('executes tableside QR ordering during happy hour transition with tax breakdown and live 86 tracking', () => {
    // Step 1: Customer sits at Table 8, scans QR code
    const qrUrl = buildTablesideUrl('https://orders.culinaryos.org', 'the-golden-fork', '8', 'self_ordering');
    expect(qrUrl).toBe('https://orders.culinaryos.org/table/the-golden-fork/8?mode=self_ordering');

    const session = initTablesideSession('self_ordering', 'the-golden-fork', '8');
    expect(session.allowOrdering).toBe(true);

    // Step 2: Customer orders drinks & apps at 17:15 (during Happy Hour)
    const cocktailBasePrice = 1800; // $18.00
    const calamariBasePrice = 1600; // $16.00

    const hhCocktailPrice = resolveEffectivePrice(cocktailBasePrice, [hhDrinkSchedule], { dayOfWeek: 4, timeStr: '17:15' });
    const hhCalamariPrice = resolveEffectivePrice(calamariBasePrice, [hhAppSchedule], { dayOfWeek: 4, timeStr: '17:15' });

    // 1800 * (1 - 0.30) = 1260 ($12.60)
    // 1600 - 400 = 1200 ($12.00)
    expect(hhCocktailPrice).toBe(1260);
    expect(hhCalamariPrice).toBe(1200);

    // Step 3: Check Oyster Special 86 Count (starts at 3 servings)
    let oysterStock: CountdownItem = {
      id: 'item-oysters',
      name: 'Pacific Oysters 1/2 Dozen',
      status: 'available',
      countRemaining: 3,
      autoLockAtZero: true,
    };
    const { updatedItem: oystersAfterOrder } = decrementLive86(oysterStock, 2);
    expect(oystersAfterOrder.countRemaining).toBe(1);
    expect(oystersAfterOrder.status).toBe('available');

    // Step 4: Customer places second round at 18:05 (After Happy Hour expires)
    const regularCocktailPrice = resolveEffectivePrice(cocktailBasePrice, [hhDrinkSchedule], { dayOfWeek: 4, timeStr: '18:05' });
    expect(regularCocktailPrice).toBe(1800); // Full price $18.00

    // Step 5: Multi-Rate Tax Computation (Prepared Food 8.25% vs Alcohol 15%)
    const basket = [
      { id: '1', name: 'Signature Cocktail (HH)', category: 'alcohol' as const, quantity: 2, unitPriceCents: hhCocktailPrice }, // 2520
      { id: '2', name: 'Crispy Calamari (HH)', category: 'prepared_food' as const, quantity: 1, unitPriceCents: hhCalamariPrice }, // 1200
      { id: '3', name: 'Signature Cocktail (Reg)', category: 'alcohol' as const, quantity: 1, unitPriceCents: regularCocktailPrice }, // 1800
    ];
    const taxSummary = computeMultiRateTax(basket, taxConfig);

    // Alcohol sales: 2520 + 1800 = 4320 -> Tax (15%): 648
    // Food sales: 1200 -> Tax (8.25%): 99
    // Subtotal: 5520
    // Total Tax: 747
    // Grand Total: 6267
    expect(taxSummary.alcoholSalesCents).toBe(4320);
    expect(taxSummary.alcoholTaxCents).toBe(648);
    expect(taxSummary.preparedFoodSalesCents).toBe(1200);
    expect(taxSummary.preparedFoodTaxCents).toBe(99);
    expect(taxSummary.grandTotalCents).toBe(6267);

    // Step 6: Tableside QR Checkout with 20% Gratuity
    const checkout = calculateTablesideTip(taxSummary.subtotalCents, taxSummary.totalTaxCents, { type: 'percent', value: 20 });
    // Tip: 5520 * 0.20 = 1104 ($11.04)
    // Total: 5520 + 747 + 1104 = 7371 ($73.71)
    expect(checkout.tipCents).toBe(1104);
    expect(checkout.totalCents).toBe(7371);
  });
});
