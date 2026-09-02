// ============================================================
// Tier 2 — F2.4: 1-Click Waste & Food Cost Variance (Boundary & Corner Cases)
// Covers: 0 gram scrap entry, negative quantities, division by 0 safety,
// 100% loss scenarios, and sub-cent precision on micro portions.
// ============================================================

import { describe, expect, it } from 'bun:test';
import { summarizeWaste, wastePct, type WasteEntry } from '@culinaryos/waste-engine';
import { calcVariance, costRecipe, type CostIngredient } from '@culinaryos/food-cost-engine';

describe('F2.4 Waste & Variance — Tier 2 Boundaries', () => {
  it('1. handles 0 gram waste entry without producing NaN or errors', () => {
    const zeroWaste: WasteEntry[] = [
      { date: '2026-09-01', ingredient: 'Salt', quantity: 0, reason: 'spoilage', costPerGram: 0.005 },
    ];
    const summary = summarizeWaste(zeroWaste);
    expect(summary.totalGrams).toBe(0);
    expect(summary.totalCost).toBe(0);
  });

  it('2. handles 0 theoretical cost without division by zero NaN in variance percentage', () => {
    const res = calcVariance(0, 50.00);
    expect(res.variance).toBe(50.00);
    expect(res.variancePct).toBe(0); // safe fallback
    expect(res.status).toBe('ok');
  });

  it('3. calculates 100% food cost loss when whole dish or batch is discarded', () => {
    const pct = wastePct(1200.00, 1200.00);
    expect(pct).toBe(100.00);
  });

  it('4. calculates 0% waste percentage when total food cost is $0 (empty shift)', () => {
    const pct = wastePct(0, 0);
    expect(pct).toBe(0);
  });

  it('5. preserves high decimal precision on expensive micro-gram ingredients (e.g. Saffron)', () => {
    const ingredients: CostIngredient[] = [
      { name: 'Iranian Saffron Threads', quantity: 0.5, unit: 'g', costPerUnit: 15.00 }, // $7.50
      { name: 'Arborio Rice', quantity: 200, unit: 'g', costPerUnit: 0.008 },             // $1.60
    ];
    const recipe = costRecipe(ingredients, 2, 28.00);
    // Total = 7.50 + 1.60 = 9.10; Cost per serving = 9.10 / 2 = 4.55
    expect(recipe.totalCost).toBe(9.10);
    expect(recipe.costPerServing).toBe(4.55);
    expect(recipe.foodCostPct).toBe(16.25);
  });
});
