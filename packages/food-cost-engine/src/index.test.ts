import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { costRecipe, calcVariance, calculateIngredientVariance } from './index.js';

describe('Food Cost Engine: Recipe Costing and Variance Calculation', () => {
  it('computes exact recipe ingredient costs and food cost percentage', () => {
    const result = costRecipe(
      [
        { name: 'Flour', quantity: 500, unit: 'g', costPerUnit: 0.002 },
        { name: 'Butter', quantity: 100, unit: 'g', costPerUnit: 0.015 },
      ],
      4,
      10.00
    );

    assert.equal(result.totalCost, 2.50);
    assert.equal(result.costPerServing, 0.63);
    assert.equal(result.foodCostPct, 6.30);
  });

  it('evaluates status thresholds for actual vs theoretical variance', () => {
    const ok = calcVariance(100, 101);
    assert.equal(ok.status, 'ok');
    assert.equal(ok.variancePct, 1.0);

    const warn = calcVariance(100, 103);
    assert.equal(warn.status, 'warn');
    assert.equal(warn.variancePct, 3.0);

    const alert = calcVariance(100, 106);
    assert.equal(alert.status, 'alert');
    assert.equal(alert.variancePct, 6.0);
  });

  it('calculates comprehensive ingredient variance with recorded waste', () => {
    const result = calculateIngredientVariance(100, 101, 0.5, 2.5, 'Ribeye Steak', 'lb');
    assert.equal(result.theoreticalCost, 250);
    assert.equal(result.actualCost, 252.5);
    assert.equal(result.wasteCost, 1.25);
    assert.equal(result.varianceQuantity, 1);
    assert.equal(result.unexplainedQuantity, 0.5);
    assert.equal(result.status, 'ok');
  });

  it('calculates AP/EP butcher trim yield and thermal cooking shrinkage with 72% GP target', () => {
    const result = costRecipe(
      [
        // Whole ribeye bought at $10/lb with 75% trim yield (AP vs EP) and 20% cooking moisture shrinkage
        { name: 'Ribeye Sub-Primal', quantity: 1, unit: 'lb', costPerUnit: 10.00, trimYieldPct: 75, cookShrinkPct: 20 },
        { name: 'House Herb Butter', quantity: 0.1, unit: 'lb', costPerUnit: 5.00 }
      ],
      1,
      45.00,
      72
    );

    // Yield combined = 0.75 * 0.80 = 0.60. Effective ribeye cost = 10 / 0.60 = $16.67
    assert.equal(result.totalCost, 17.17);
    assert.equal(result.costPerServing, 17.17);
    assert.equal(result.foodCostPct, 38.16); // 17.17 / 45.00
    assert.equal(result.grossProfitPct, 61.84);
    assert.equal(result.minMenuPrice72Gp, 61.32); // 17.17 / 0.28
    assert.ok(result.dominantCostAlerts && result.dominantCostAlerts.length > 0);
    assert.match(result.dominantCostAlerts![0]!, /Ribeye Sub-Primal represents 97.09% of dish cost/);
  });
});
