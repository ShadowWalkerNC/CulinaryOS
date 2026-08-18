// ============================================================================
// Empirical Adversarial Stress Test Suite for Milestone 1 (Challenger 2)
// Testing: computeRecipeCost, calculateCostVariance, summarizeWaste,
//          generateShiftPrepPlan, projectBatchRequirement
// ============================================================================

import { describe, it } from 'bun:test';
import assert from 'node:assert';
import {
  computeRecipeCost,
  calculateCostVariance,
  summarizeWaste,
  calculateWastePercentage,
  generateShiftPrepPlan,
  projectBatchRequirement,
  scaleRecipeTree,
  flattenScaledTree,
  scaleByServings,
  calculateRatio,
  totalFormulaWeight,
  formatAmount,
  gramsToCups,
  cupsToGrams,
  scaleBlueprint,
  computeCost,
  fromTotalWeight,
  type RecipeBlueprint,
  type InventoryStockItem,
  type WasteLogEntry,
} from '../../packages/ratio-engine/src/index.ts';

function isCloseTo(actual: number, expected: number, epsilon = 1e-6): boolean {
  return Math.abs(actual - expected) < epsilon;
}

describe('Challenger 2 — computeRecipeCost Empirical Stress Suite', () => {
  it('handles standard multi-ingredient costing with high precision', () => {
    const ingredients = [
      { id: '1', name: 'Wagyu Ribeye', quantity: 250, unitCost: 0.08 }, // $20.00
      { id: '2', name: 'Truffle Butter', quantity: 30, unitCost: 0.15 }, // $4.50
      { id: '3', name: 'Microgreens', quantity: 15, unitCost: 0.05 },   // $0.75
    ];
    const res = computeRecipeCost(ingredients, 1, 65.0);
    assert.strictEqual(res.totalCost, 25.25);
    assert.strictEqual(res.costPerServing, 25.25);
    // (25.25 / 65.0) * 100 = 38.84615384615385
    assert.ok(isCloseTo(res.foodCostPct, 38.84615384615385));
    assert.strictEqual(res.ingredientCosts.length, 3);
    assert.strictEqual(res.ingredientCosts[0].totalCost, 20.0);
  });

  it('handles 0 servings without throwing, NaN, or Infinity', () => {
    const ingredients = [{ id: '1', name: 'Flour', quantity: 500, unitCost: 0.002 }];
    const res = computeRecipeCost(ingredients, 0, 10.0);
    assert.strictEqual(res.totalCost, 1.0);
    assert.strictEqual(res.costPerServing, 0);
    assert.strictEqual(res.foodCostPct, 0);
    assert.strictEqual(Number.isFinite(res.costPerServing), true);
    assert.strictEqual(Number.isFinite(res.foodCostPct), true);
  });

  it('handles negative servings gracefully', () => {
    const ingredients = [{ id: '1', name: 'Flour', quantity: 500, unitCost: 0.002 }];
    const res = computeRecipeCost(ingredients, -5, 10.0);
    assert.strictEqual(res.totalCost, 1.0);
    assert.strictEqual(res.costPerServing, 0);
    assert.strictEqual(res.foodCostPct, 0);
  });

  it('handles 0 menu price without division by zero', () => {
    const ingredients = [{ id: '1', name: 'Flour', quantity: 500, unitCost: 0.002 }];
    const res = computeRecipeCost(ingredients, 2, 0);
    assert.strictEqual(res.totalCost, 1.0);
    assert.strictEqual(res.costPerServing, 0.5);
    assert.strictEqual(res.foodCostPct, 0);
    assert.strictEqual(Number.isFinite(res.foodCostPct), true);
  });

  it('handles negative menu price gracefully', () => {
    const ingredients = [{ id: '1', name: 'Flour', quantity: 500, unitCost: 0.002 }];
    const res = computeRecipeCost(ingredients, 2, -15.0);
    assert.strictEqual(res.foodCostPct, 0);
  });

  it('handles completely free ingredients (cost = 0)', () => {
    const ingredients = [
      { id: '1', name: 'Tap Water', quantity: 1000, unitCost: 0 },
      { id: '2', name: 'Wild Foraged Herbs', quantity: 50, unitCost: 0 },
    ];
    const res = computeRecipeCost(ingredients, 4, 12.0);
    assert.strictEqual(res.totalCost, 0);
    assert.strictEqual(res.costPerServing, 0);
    assert.strictEqual(res.foodCostPct, 0);
  });

  it('handles empty ingredient lists, undefined inputs, and missing properties', () => {
    const emptyRes = computeRecipeCost([], 4, 20.0);
    assert.strictEqual(emptyRes.totalCost, 0);
    assert.strictEqual(emptyRes.costPerServing, 0);
    assert.strictEqual(emptyRes.foodCostPct, 0);
    assert.strictEqual(emptyRes.ingredientCosts.length, 0);

    const undefinedInput = computeRecipeCost((undefined as any), 4, 20.0);
    assert.strictEqual(undefinedInput.totalCost, 0);
    assert.strictEqual(undefinedInput.ingredientCosts.length, 0);

    const nullProps = computeRecipeCost(
      [{ id: '1', name: 'Mystery', quantity: (undefined as any), unitCost: (undefined as any) }],
      1,
      10
    );
    assert.strictEqual(nullProps.totalCost, 0);
    assert.strictEqual(nullProps.ingredientCosts[0].totalCost, 0);
  });

  it('handles extreme food cost scaling (millions of dollars / high volume catering)', () => {
    const highVolume = [
      { id: '1', name: 'Bulk Saffron', quantity: 10000, unitCost: 15.0 }, // $150,000
      { id: '2', name: 'Caviar Tins', quantity: 5000, unitCost: 80.0 },   // $400,000
    ];
    const res = computeRecipeCost(highVolume, 5000, 250.0);
    assert.strictEqual(res.totalCost, 550000);
    assert.strictEqual(res.costPerServing, 110);
    assert.strictEqual(res.foodCostPct, 44);
  });

  it('handles fractional servings (e.g. 2.5 tasting portions)', () => {
    const ingredients = [
      { id: '1', name: 'Tenderloin', quantity: 500, unitCost: 0.05 }, // $25.00
    ];
    const res = computeRecipeCost(ingredients, 2.5, 30.0);
    assert.strictEqual(res.totalCost, 25.0);
    assert.strictEqual(res.costPerServing, 10.0);
    assert.ok(isCloseTo(res.foodCostPct, 33.333333333333336));
  });
});

describe('Challenger 2 — calculateCostVariance Threshold & Edge Case Stress Suite', () => {
  it('verifies exact threshold boundary at 0% variance -> ok', () => {
    const res = calculateCostVariance(100.0, 100.0);
    assert.strictEqual(res.varianceDollars, 0);
    assert.strictEqual(res.variancePct, 0);
    assert.strictEqual(res.status, 'ok');
  });

  it('verifies < 2% upper and lower boundaries -> ok', () => {
    // 1.99% over budget
    const over199 = calculateCostVariance(100.0, 101.99);
    assert.ok(isCloseTo(over199.varianceDollars, 1.99));
    assert.ok(isCloseTo(over199.variancePct, 1.99));
    assert.strictEqual(over199.status, 'ok');

    // -1.99% under budget (favorable)
    const under199 = calculateCostVariance(100.0, 98.01);
    assert.ok(isCloseTo(under199.varianceDollars, -1.99));
    assert.ok(isCloseTo(under199.variancePct, -1.99));
    assert.strictEqual(under199.status, 'ok');
  });

  it('verifies exact 2.0% threshold boundary -> warn', () => {
    // Exactly +2.0%
    const warnOver = calculateCostVariance(100.0, 102.0);
    assert.strictEqual(warnOver.varianceDollars, 2.0);
    assert.strictEqual(warnOver.variancePct, 2.0);
    assert.strictEqual(warnOver.status, 'warn');

    // Exactly -2.0%
    const warnUnder = calculateCostVariance(100.0, 98.0);
    assert.strictEqual(warnUnder.varianceDollars, -2.0);
    assert.strictEqual(warnUnder.variancePct, -2.0);
    assert.strictEqual(warnUnder.status, 'warn');
  });

  it('verifies 2% to 5% range -> warn', () => {
    const warnMid = calculateCostVariance(200.0, 207.0); // +3.5%
    assert.ok(isCloseTo(warnMid.variancePct, 3.5));
    assert.strictEqual(warnMid.status, 'warn');

    const warnUpper = calculateCostVariance(100.0, 104.999); // +4.999%
    assert.strictEqual(warnUpper.status, 'warn');

    const warnUnder = calculateCostVariance(100.0, 95.001); // -4.999%
    assert.strictEqual(warnUnder.status, 'warn');
  });

  it('verifies exact 5.0% threshold boundary -> alert', () => {
    // Exactly +5.0%
    const alertOver = calculateCostVariance(100.0, 105.0);
    assert.strictEqual(alertOver.varianceDollars, 5.0);
    assert.strictEqual(alertOver.variancePct, 5.0);
    assert.strictEqual(alertOver.status, 'alert');

    // Exactly -5.0%
    const alertUnder = calculateCostVariance(100.0, 95.0);
    assert.strictEqual(alertUnder.varianceDollars, -5.0);
    assert.strictEqual(alertUnder.variancePct, -5.0);
    assert.strictEqual(alertUnder.status, 'alert');
  });

  it('verifies > 5.0% large variances -> alert', () => {
    const massiveOver = calculateCostVariance(500.0, 750.0); // +50%
    assert.strictEqual(massiveOver.varianceDollars, 250.0);
    assert.strictEqual(massiveOver.variancePct, 50.0);
    assert.strictEqual(massiveOver.status, 'alert');

    const massiveUnder = calculateCostVariance(500.0, 100.0); // -80%
    assert.strictEqual(massiveUnder.varianceDollars, -400.0);
    assert.strictEqual(massiveUnder.variancePct, -80.0);
    assert.strictEqual(massiveUnder.status, 'alert');
  });

  it('handles zero theoretical cost safely without division by zero', () => {
    // When theoretical cost is $0 and actual is $0
    const zeroBoth = calculateCostVariance(0, 0);
    assert.strictEqual(zeroBoth.varianceDollars, 0);
    assert.strictEqual(zeroBoth.variancePct, 0);
    assert.strictEqual(zeroBoth.status, 'ok');

    // When theoretical cost is $0 but actual cost was incurred ($25)
    const zeroTheoretical = calculateCostVariance(0, 25.0);
    assert.strictEqual(zeroTheoretical.varianceDollars, 25.0);
    assert.strictEqual(zeroTheoretical.variancePct, 0);
    assert.strictEqual(zeroTheoretical.status, 'ok');
    assert.strictEqual(Number.isFinite(zeroTheoretical.variancePct), true);
  });

  it('handles negative theoretical cost safely', () => {
    const negTheoretical = calculateCostVariance(-100, 50);
    assert.strictEqual(negTheoretical.varianceDollars, 150);
    assert.strictEqual(negTheoretical.variancePct, 0);
    assert.strictEqual(negTheoretical.status, 'ok');
  });
});

describe('Challenger 2 — summarizeWaste & WastePercentage Empirical Stress Suite', () => {
  it('handles procedurally generated 10,000-entry high-volume waste log', () => {
    const reasons = ['spoilage', 'trim', 'overcook', 'drop', 'expired', 'other'];
    const ingredients = ['Tuna', 'Beef', 'Lettuce', 'Tomato', 'Avocado', 'Cheese', 'Cream', 'Butter', 'Bread', 'Oil'];

    const entries: WasteLogEntry[] = [];
    let expectedTotalGrams = 0;
    let expectedTotalCost = 0;

    for (let i = 0; i < 10000; i++) {
      const ing = ingredients[i % ingredients.length]!;
      const reason = reasons[i % reasons.length]!;
      const grams = (i % 50) + 1; // 1 to 50g
      const costPerGram = ((i % 10) + 1) * 0.01; // $0.01 to $0.10 / g
      const itemCost = grams * costPerGram;

      entries.push({
        ingredient: ing,
        quantityGrams: grams,
        costPerGram,
        reason,
        logDate: '2026-08-16',
      });

      expectedTotalGrams += grams;
      expectedTotalCost += itemCost;
    }

    const summary = summarizeWaste(entries);
    assert.strictEqual(summary.totalGrams, expectedTotalGrams);
    assert.ok(isCloseTo(summary.totalCost, expectedTotalCost));
    assert.strictEqual(summary.topWastedIngredients.length, ingredients.length);

    // Sum of reason costs should equal total cost
    const reasonCostSum = Object.values(summary.byReason).reduce((s, r) => s + r.cost, 0);
    assert.ok(isCloseTo(reasonCostSum, expectedTotalCost));

    // Top wasted items must be sorted descending by cost
    for (let i = 0; i < summary.topWastedIngredients.length - 1; i++) {
      assert.ok(summary.topWastedIngredients[i]!.cost >= summary.topWastedIngredients[i + 1]!.cost);
    }
  });

  it('correctly handles ties in top offenders', () => {
    const entries: WasteLogEntry[] = [
      { ingredient: 'Item Alpha', quantityGrams: 100, costPerGram: 0.10, reason: 'trim' }, // $10
      { ingredient: 'Item Beta',  quantityGrams: 200, costPerGram: 0.05, reason: 'spoilage' }, // $10
      { ingredient: 'Item Gamma', quantityGrams: 50,  costPerGram: 0.20, reason: 'overcook' }, // $10
      { ingredient: 'Item Delta', quantityGrams: 10,  costPerGram: 0.10, reason: 'drop' }, // $1
    ];
    const summary = summarizeWaste(entries);
    assert.strictEqual(summary.topWastedIngredients.length, 4);
    assert.strictEqual(summary.topWastedIngredients[0].cost, 10);
    assert.strictEqual(summary.topWastedIngredients[1].cost, 10);
    assert.strictEqual(summary.topWastedIngredients[2].cost, 10);
    assert.strictEqual(summary.topWastedIngredients[3].cost, 1);
  });

  it('aggregates multiple reasons and custom reasons for single ingredient', () => {
    const entries: WasteLogEntry[] = [
      { ingredient: 'Ribeye', quantityGrams: 100, costPerGram: 0.05, reason: 'trim' },      // $5
      { ingredient: 'Ribeye', quantityGrams: 200, costPerGram: 0.05, reason: 'overcook' },  // $10
      { ingredient: 'Ribeye', quantityGrams: 300, costPerGram: 0.05, reason: 'freezer_burn' }, // $15 (custom reason)
    ];
    const summary = summarizeWaste(entries);
    assert.strictEqual(summary.totalGrams, 600);
    assert.strictEqual(summary.totalCost, 30);
    assert.strictEqual(summary.byReason['trim'].cost, 5);
    assert.strictEqual(summary.byReason['overcook'].cost, 10);
    assert.strictEqual(summary.byReason['freezer_burn'].cost, 15);
    assert.strictEqual(summary.topWastedIngredients.length, 1);
    assert.strictEqual(summary.topWastedIngredients[0].ingredient, 'Ribeye');
    assert.strictEqual(summary.topWastedIngredients[0].grams, 600);
    assert.strictEqual(summary.topWastedIngredients[0].cost, 30);
  });

  it('handles zero-cost waste events and empty inputs', () => {
    const zeroCostEntries: WasteLogEntry[] = [
      { ingredient: 'Water', quantityGrams: 1000, costPerGram: 0, reason: 'spill' },
      { ingredient: 'Scraps', quantityGrams: 0, costPerGram: 5, reason: 'other' },
    ];
    const summary = summarizeWaste(zeroCostEntries);
    assert.strictEqual(summary.totalGrams, 1000);
    assert.strictEqual(summary.totalCost, 0);

    const empty = summarizeWaste([]);
    assert.strictEqual(empty.totalGrams, 0);
    assert.strictEqual(empty.totalCost, 0);
    assert.strictEqual(Object.keys(empty.byReason).length, 0);
    assert.strictEqual(empty.topWastedIngredients.length, 0);

    const nullInput = summarizeWaste(undefined as any);
    assert.strictEqual(nullInput.totalGrams, 0);
    assert.strictEqual(nullInput.totalCost, 0);
  });

  it('handles fallback defaults for missing reason and ingredient fields', () => {
    const partialEntry: WasteLogEntry = {
      ingredient: '',
      quantityGrams: 50,
      costPerGram: 0.1,
      reason: ('' as any),
    };
    const summary = summarizeWaste([partialEntry]);
    assert.strictEqual(summary.byReason['other'].cost, 5);
    assert.strictEqual(summary.topWastedIngredients[0].ingredient, 'unknown');
  });

  it('evaluates calculateWastePercentage boundary cases', () => {
    assert.strictEqual(calculateWastePercentage(50, 1000), 5.0);
    assert.strictEqual(calculateWastePercentage(0, 1000), 0);
    assert.strictEqual(calculateWastePercentage(50, 0), 0);
    assert.strictEqual(calculateWastePercentage(-50, 1000), 0);
    assert.strictEqual(calculateWastePercentage(50, -1000), 0);
    // Waste exceeding food cost (> 100%)
    assert.strictEqual(calculateWastePercentage(1500, 1000), 150.0);
  });
});

describe('Challenger 2 — generateShiftPrepPlan Empirical Stress Suite', () => {
  it('correctly maps shift metadata for morning, evening, and prep', () => {
    const items: InventoryStockItem[] = [
      { id: '1', ingredient: 'Chopped Parsley', currentStock: 0.5, parLevel: 2.0, unit: 'kg' },
    ];
    const mPlan = generateShiftPrepPlan(items, 'morning', '2026-08-16');
    assert.strictEqual(mPlan.shift, 'morning');
    assert.strictEqual(mPlan.date, '2026-08-16');

    const ePlan = generateShiftPrepPlan(items, 'evening', '2026-08-16');
    assert.strictEqual(ePlan.shift, 'evening');

    const pPlan = generateShiftPrepPlan(items, 'prep', '2026-08-16');
    assert.strictEqual(pPlan.shift, 'prep');
  });

  it('handles negative current stock (backorders / overdue prep depletion)', () => {
    const items: InventoryStockItem[] = [
      { id: '1', ingredient: 'Brioche Buns', currentStock: -10, parLevel: 50, unit: 'count', station: 'bakery' },
    ];
    const plan = generateShiftPrepPlan(items, 'morning', '2026-08-16');
    assert.strictEqual(plan.tasks.length, 1);
    // shortfall = 50 - (-10) = 60
    assert.strictEqual(plan.tasks[0].prepAmount, 60);
    assert.strictEqual(plan.tasks[0].station, 'bakery');
  });

  it('filters out items with zero par level or overstocked items', () => {
    const items: InventoryStockItem[] = [
      { id: '1', ingredient: 'Seasonal Truffles', currentStock: 0, parLevel: 0, unit: 'g' },      // par 0 -> no task
      { id: '2', ingredient: 'Excess Flour', currentStock: 100, parLevel: 50, unit: 'kg' },        // overstocked -> no task
      { id: '3', ingredient: 'Exact Sugar', currentStock: 25, parLevel: 25, unit: 'kg' },          // exact -> no task
      { id: '4', ingredient: 'Need Prep Sauce', currentStock: 2, parLevel: 10, unit: 'l' },        // shortfall 8 -> 1 task
    ];
    const plan = generateShiftPrepPlan(items, 'morning', '2026-08-16');
    assert.strictEqual(plan.tasks.length, 1);
    assert.strictEqual(plan.tasks[0].ingredient, 'Need Prep Sauce');
    assert.strictEqual(plan.tasks[0].prepAmount, 8);
  });

  it('preserves station grouping and handles items without station', () => {
    const items: InventoryStockItem[] = [
      { id: '1', ingredient: 'Patties', currentStock: 5, parLevel: 30, unit: 'count', station: 'grill' },
      { id: '2', ingredient: 'Dressing', currentStock: 1, parLevel: 5, unit: 'l', station: 'salad' },
      { id: '3', ingredient: 'Salt Shakers', currentStock: 2, parLevel: 10, unit: 'count' }, // no station
    ];
    const plan = generateShiftPrepPlan(items, 'prep', '2026-08-16');
    assert.strictEqual(plan.tasks.length, 3);
    assert.strictEqual(plan.tasks[0].station, 'grill');
    assert.strictEqual(plan.tasks[1].station, 'salad');
    assert.strictEqual(plan.tasks[2].station, undefined);
  });

  it('handles empty inventory list and undefined input safely', () => {
    const emptyPlan = generateShiftPrepPlan([], 'morning', '2026-08-16');
    assert.strictEqual(emptyPlan.tasks.length, 0);

    const undefinedPlan = generateShiftPrepPlan((undefined as any), 'evening', '2026-08-16');
    assert.strictEqual(undefinedPlan.tasks.length, 0);
  });
});

describe('Challenger 2 — projectBatchRequirement Empirical Stress Suite', () => {
  it('applies default waste factor of 1.0 (no buffer)', () => {
    const result = projectBatchRequirement(200, 50); // 200g * 50 covers * 1.0
    assert.strictEqual(result, 10000);
  });

  it('applies custom buffer factors correctly', () => {
    // 15% waste buffer (wasteFactor = 1.15)
    const buf15 = projectBatchRequirement(250, 40, 1.15); // 250 * 40 * 1.15 = 11500
    assert.strictEqual(buf15, 11500);

    // 0 buffer (wasteFactor = 0)
    const zeroBuffer = projectBatchRequirement(250, 40, 0);
    assert.strictEqual(zeroBuffer, 0);
  });

  it('handles fractional covers and fractional portion weights', () => {
    // 180.5g portion * 25.5 covers * 1.10 buffer
    const result = projectBatchRequirement(180.5, 25.5, 1.10);
    const expected = 180.5 * 25.5 * 1.10;
    assert.ok(isCloseTo(result, expected));
  });

  it('handles 0 portion weight or 0 covers', () => {
    assert.strictEqual(projectBatchRequirement(0, 100, 1.1), 0);
    assert.strictEqual(projectBatchRequirement(200, 0, 1.1), 0);
  });

  it('throws on any negative input', () => {
    assert.throws(() => projectBatchRequirement(-100, 50, 1.1));
    assert.throws(() => projectBatchRequirement(100, -50, 1.1));
    assert.throws(() => projectBatchRequirement(100, 50, -0.05));
  });
});
