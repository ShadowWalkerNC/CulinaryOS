import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  detectWasteAnomalies,
  calculatePrimeCost,
  analyzeMenuMatrix,
  generateRevivalPlan,
  type WasteLogItem,
  type StationHistoricalWaste,
  type MenuItemSalesInput,
} from '../src/diagnostics/index.ts';

describe('Diagnostics Subsystem', () => {
  describe('Waste Anomaly Detection', () => {
    const historical: StationHistoricalWaste[] = [
      { station: 'Grill', averageGrams: 500 },
      { station: 'Saute', averageGrams: 400 },
      { station: 'Pantry/Salad', averageGrams: 300 },
    ];

    it('flags volume spikes and ranks cost impact', () => {
      const logs: WasteLogItem[] = [
        {
          station: 'Grill',
          ingredient: 'Prime Ribeye Trim',
          quantityGrams: 1200, // 2.4x historical average
          costPerGramCents: 6, // $72.00
          reason: 'overcooked',
        },
        {
          station: 'Saute',
          ingredient: 'Shallots',
          quantityGrams: 450, // 1.12x average (normal)
          costPerGramCents: 1, // $4.50
        },
        {
          station: 'Pantry/Salad',
          ingredient: 'Heirloom Greens',
          quantityGrams: 800, // 2.67x average
          costPerGramCents: 3, // $24.00
          reason: 'wilted',
        },
      ];

      const report = detectWasteAnomalies(logs, historical);

      assert.equal(report.totalWasteGrams, 2450);
      assert.equal(report.totalWasteCostCents, 10050); // 7200 + 450 + 2400
      assert.equal(report.highestCostImpactStation, 'Grill');

      // Anomalies flagged (Grill and Pantry/Salad spike above 1.5x)
      assert.equal(report.anomalyCount, 2);
      assert.equal(report.rankedCostImpact[0].station, 'Grill');
      assert.equal(report.rankedCostImpact[0].costCents, 7200);
      assert.equal(report.rankedCostImpact[0].isSpike, true);
      assert.equal(report.rankedCostImpact[0].severity, 'critical');

      assert.equal(report.rankedCostImpact[1].station, 'Pantry/Salad');
      assert.equal(report.rankedCostImpact[1].costCents, 2400);
    });

    it('handles clean shifts with zero anomalies', () => {
      const logs: WasteLogItem[] = [
        {
          station: 'Grill',
          ingredient: 'Burger trimmings',
          quantityGrams: 350,
          costCents: 500,
        },
      ];

      const report = detectWasteAnomalies(logs, historical);
      assert.equal(report.anomalyCount, 0);
      assert.equal(report.anomalies.length, 0);
    });
  });

  describe('Prime Cost Analysis', () => {
    it('evaluates healthy prime cost below 60%', () => {
      const analysis = calculatePrimeCost({
        revenueCents: 10000000, // $100,000
        cogsCents: 2700000,     // $27,000 (27%)
        laborCents: 3100000,    // $31,000 (31%)
      });

      assert.equal(analysis.primeCostPercent, 58);
      assert.equal(analysis.severity, 'healthy');
      assert.equal(analysis.status, 'OPTIMAL');
      assert.equal(analysis.breakdown.cogsStatus, 'on-target');
      assert.equal(analysis.breakdown.laborStatus, 'on-target');
      assert.equal(analysis.potentialAnnualSavingsCents, 0);
    });

    it('evaluates warning elevated prime cost', () => {
      const analysis = calculatePrimeCost({
        revenueCents: 10000000,
        cogsCents: 3100000,     // 31% (> 28%)
        laborCents: 3400000,    // 34% (> 32%)
      });

      assert.equal(analysis.primeCostPercent, 65);
      assert.equal(analysis.severity, 'warning');
      assert.equal(analysis.status, 'ELEVATED');
      assert.equal(analysis.variancePercent, 5);
      // 5% of $100k = $5,000/mo * 12 = $60,000/yr
      assert.equal(analysis.potentialAnnualSavingsCents, 6000000);
    });

    it('evaluates critical risk prime cost above 68%', () => {
      const analysis = calculatePrimeCost({
        revenueCents: 8000000, // $80,000
        cogsCents: 3200000,    // 40%
        laborCents: 2800000,    // 35%
      });

      assert.equal(analysis.primeCostPercent, 75);
      assert.equal(analysis.severity, 'critical');
      assert.equal(analysis.status, 'CRITICAL_RISK');
      assert.ok(analysis.actionableRecommendations.some((r) => r.includes('CRITICAL')));
    });

    it('throws when revenue is zero or negative', () => {
      assert.throws(() => {
        calculatePrimeCost({ revenueCents: 0, cogsCents: 1000, laborCents: 1000 });
      });
    });
  });

  describe('Menu Engineering Matrix (BCG / Kasavana & Smith)', () => {
    it('classifies dishes into Stars, Plowhorses, Puzzles, and Dogs', () => {
      const menu: MenuItemSalesInput[] = [
        {
          itemId: 'dish-1',
          name: 'Signature Wagyu Burger',
          salesCount: 150, // High volume
          priceCents: 2400,
          costCents: 600,  // Margin $18.00 (High margin)
        },
        {
          itemId: 'dish-2',
          name: 'Fish & Chips',
          salesCount: 140, // High volume
          priceCents: 1800,
          costCents: 1100, // Margin $7.00 (Low margin)
        },
        {
          itemId: 'dish-3',
          name: 'Truffle Lobster Risotto',
          salesCount: 20,  // Low volume
          priceCents: 4500,
          costCents: 1500, // Margin $30.00 (High margin)
        },
        {
          itemId: 'dish-4',
          name: 'Boiled Turnip Medley',
          salesCount: 10,  // Low volume
          priceCents: 1200,
          costCents: 800,  // Margin $4.00 (Low margin)
        },
      ];

      const report = analyzeMenuMatrix(menu);

      assert.equal(report.totalSalesCount, 320);
      assert.equal(report.items.length, 4);

      const star = report.items.find((i) => i.itemId === 'dish-1');
      assert.equal(star?.quadrant, 'star');
      assert.equal(star?.suggestedAction, 'maintain');

      const plowhorse = report.items.find((i) => i.itemId === 'dish-2');
      assert.equal(plowhorse?.quadrant, 'plowhorse');
      assert.ok(plowhorse?.suggestedAction === 'reprice' || plowhorse?.suggestedAction === 're-engineer');

      const puzzle = report.items.find((i) => i.itemId === 'dish-3');
      assert.equal(puzzle?.quadrant, 'puzzle');
      assert.equal(puzzle?.suggestedAction, 'promote');

      const dog = report.items.find((i) => i.itemId === 'dish-4');
      assert.equal(dog?.quadrant, 'dog');
      assert.equal(dog?.suggestedAction, '86');

      assert.equal(report.summary.stars, 1);
      assert.equal(report.summary.plowhorses, 1);
      assert.equal(report.summary.puzzles, 1);
      assert.equal(report.summary.dogs, 1);
    });

    it('handles empty menu gracefully', () => {
      const report = analyzeMenuMatrix([]);
      assert.equal(report.totalSalesCount, 0);
      assert.equal(report.items.length, 0);
    });
  });

  describe('30-Day Financial Revival Planner', () => {
    it('creates a phased 4-week recovery roadmap', () => {
      const primeCost = calculatePrimeCost({
        revenueCents: 10000000,
        cogsCents: 3500000,
        laborCents: 3600000,
      });

      const menuMatrix = analyzeMenuMatrix([
        { itemId: '1', name: 'Burger', salesCount: 100, priceCents: 2000, costCents: 500 },
        { itemId: '2', name: 'Overpriced Salad', salesCount: 5, priceCents: 1000, costCents: 800 },
      ]);

      const plan = generateRevivalPlan({
        restaurantName: 'Alley Katz Bistro',
        primeCost,
        menuMatrix,
      });

      assert.equal(plan.restaurantName, 'Alley Katz Bistro');
      assert.equal(plan.urgencyLevel, 'urgent');
      assert.equal(plan.weeks.length, 4);
      assert.equal(plan.weeks[0].week, 1);
      assert.equal(plan.weeks[0].dailyActions.length, 7);
      assert.equal(plan.weeks[1].week, 2);
      assert.equal(plan.weeks[2].week, 3);
      assert.equal(plan.weeks[3].week, 4);

      assert.ok(plan.projectedMonthlySavingsCents > 0);
      assert.ok(plan.projectedAnnualSavingsCents > 0);
      assert.equal(plan.immediateTop3Priorities.length, 3);
      assert.ok(plan.immediateTop3Priorities.some((p) => p.includes('overtime') || p.includes('clock-in')));
    });
  });
});
