import { describe, it, expect } from 'bun:test';
import {
  calculateIngredientVariance,
  calculateActualVsTheoretical,
  type TheoreticalUsageItem,
  type ActualUsageItem,
  type WasteLogItem,
} from '@culinaryos/food-cost-engine';

describe('Food Cost Variance Engine', () => {
  it('calculates single ingredient variance and threshold status', () => {
    // Exact match: 0% variance -> ok
    const exact = calculateIngredientVariance(10, 10, 0, 5.0, 'Beef Patty', 'portion');
    expect(exact.varianceCost).toBe(0);
    expect(exact.variancePct).toBe(0);
    expect(exact.status).toBe('ok');

    // 3% variance -> warn
    const warn = calculateIngredientVariance(100, 103, 0, 2.0, 'Brioche Buns', 'units');
    expect(warn.varianceQuantity).toBe(3);
    expect(warn.varianceCost).toBe(6);
    expect(warn.variancePct).toBe(3);
    expect(warn.status).toBe('warn');

    // 8% variance -> alert
    const alert = calculateIngredientVariance(50, 54, 2, 10.0, 'Ribeye Steak', 'portion');
    expect(alert.varianceQuantity).toBe(4);
    expect(alert.varianceCost).toBe(40);
    expect(alert.variancePct).toBe(8);
    expect(alert.unexplainedQuantity).toBe(2);
    expect(alert.unexplainedCost).toBe(20);
    expect(alert.status).toBe('alert');
  });

  it('aggregates theoretical usage, actual consumption, and waste loss into full report', () => {
    const theoreticalUsage: TheoreticalUsageItem[] = [
      { ingredientName: 'Prime Ribeye Steak', theoreticalQuantity: 50, unit: 'portions', unitCost: 12.0 },
      { ingredientName: 'Salmon Fillet', theoreticalQuantity: 30, unit: 'portions', unitCost: 8.0 },
    ];

    const actualUsage: ActualUsageItem[] = [
      { ingredientName: 'Prime Ribeye Steak', actualQuantity: 54, unit: 'portions', unitCost: 12.0 },
      { ingredientName: 'Salmon Fillet', actualQuantity: 30, unit: 'portions', unitCost: 8.0 },
    ];

    const wasteLogs: WasteLogItem[] = [
      { ingredientName: 'Prime Ribeye Steak', quantity: 2, unit: 'portions', wasteCost: 24.0, reason: 'burned' },
    ];

    const report = calculateActualVsTheoretical({
      theoreticalUsage,
      actualUsage,
      wasteLogs,
    });

    expect(report.totalTheoreticalCost).toBe(840); // 50*12 + 30*8 = 600 + 240
    expect(report.totalActualCost).toBe(888); // 54*12 + 30*8 = 648 + 240
    expect(report.totalWasteCost).toBe(24);
    expect(report.totalVarianceCost).toBe(48);
    expect(report.totalUnexplainedCost).toBe(24); // 48 - 24
    expect(report.ingredients.length).toBe(2);
    expect(report.topOffenders.length).toBeGreaterThan(0);
    expect(report.topOffenders[0].ingredientName).toBe('Prime Ribeye Steak');
  });
});
