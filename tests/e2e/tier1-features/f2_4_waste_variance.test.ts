// ============================================================
// Tier 1 — F2.4: 1-Click Waste & Food Cost Variance (Granular Feature Tests)
// Covers: Scrap logging, cost per gram, category aggregation,
// and actual-vs-theoretical food cost variance alerting.
// ============================================================

import { describe, expect, it } from 'bun:test';
import { summarizeWaste, wastePct, type WasteEntry } from '@culinaryos/waste-engine';
import { calcVariance, costRecipe, type CostIngredient } from '@culinaryos/food-cost-engine';

describe('F2.4 1-Click Waste & Food Cost Variance — Tier 1 Isolation', () => {
  const sampleWasteEntries: WasteEntry[] = [
    { date: '2026-09-01', ingredient: 'Wagyu Beef', quantity: 450, reason: 'trim', costPerGram: 0.12 },
    { date: '2026-09-01', ingredient: 'Atlantic Salmon', quantity: 300, reason: 'overcook', costPerGram: 0.05 },
    { date: '2026-09-01', ingredient: 'Organic Tomatoes', quantity: 600, reason: 'spoilage', costPerGram: 0.01 },
  ];

  it('1. calculates scrap dollar loss per entry and summarizes totals accurately', () => {
    const summary = summarizeWaste(sampleWasteEntries);
    // Wagyu: 450 * 0.12 = 54.00
    // Salmon: 300 * 0.05 = 15.00
    // Tomatoes: 600 * 0.01 = 6.00
    // Total = 75.00
    expect(summary.totalCost).toBe(75.00);
    expect(summary.totalGrams).toBe(1350);
    expect(summary.byReason['trim'].cost).toBe(54.00);
    expect(summary.byReason['overcook'].cost).toBe(15.00);
    expect(summary.byReason['spoilage'].cost).toBe(6.00);
  });

  it('2. ranks top wasted ingredients by financial loss', () => {
    const summary = summarizeWaste(sampleWasteEntries);
    expect(summary.topWastedIngredients[0].ingredient).toBe('Wagyu Beef');
    expect(summary.topWastedIngredients[0].cost).toBe(54.00);
    expect(summary.topWastedIngredients[1].ingredient).toBe('Atlantic Salmon');
    expect(summary.topWastedIngredients[2].ingredient).toBe('Organic Tomatoes');
  });

  it('3. computes waste percentage against total food cost', () => {
    const totalWasteCost = 75.00;
    const totalFoodCost = 1500.00;
    const pct = wastePct(totalWasteCost, totalFoodCost);
    // (75 / 1500) * 100 = 5.00%
    expect(pct).toBe(5.00);
  });

  it('4. computes recipe standard cost and food cost percentage', () => {
    const ingredients: CostIngredient[] = [
      { name: 'Pasta Dough', quantity: 180, unit: 'g', costPerUnit: 0.01 }, // $1.80
      { name: 'Black Truffle', quantity: 10, unit: 'g', costPerUnit: 0.80 },  // $8.00
      { name: 'Parmigiano Reggiano', quantity: 40, unit: 'g', costPerUnit: 0.03 }, // $1.20
    ];
    const cost = costRecipe(ingredients, 1, 35.00);
    // Total cost = 1.80 + 8.00 + 1.20 = 11.00
    // Food cost pct = (11.00 / 35.00) * 100 = 31.43%
    expect(cost.totalCost).toBe(11.00);
    expect(cost.costPerServing).toBe(11.00);
    expect(cost.foodCostPct).toBe(31.43);
  });

  it('5. evaluates actual-vs-theoretical variance and triggers alert status thresholds', () => {
    // OK status (<2%)
    const okVariance = calcVariance(1000.00, 1015.00); // 1.5%
    expect(okVariance.variance).toBe(15.00);
    expect(okVariance.variancePct).toBe(1.5);
    expect(okVariance.status).toBe('ok');

    // WARN status (2% to 4.99%)
    const warnVariance = calcVariance(1000.00, 1035.00); // 3.5%
    expect(warnVariance.status).toBe('warn');

    // ALERT status (>=5%)
    const alertVariance = calcVariance(1000.00, 1065.00); // 6.5%
    expect(alertVariance.status).toBe('alert');
  });
});
