import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { forecastDaypartDemand, evaluateKitchenBottlenecks, calculateAdaptiveParLevels, type HistoricalDaypartSales } from './index.js';

describe('Forecast Engine: Daypart Demand and Kitchen Bottlenecks', () => {
  it('predicts daypart demand with weather multiplier and staffing recommendation', () => {
    const history: HistoricalDaypartSales[] = [
      { dayOfWeek: 5, daypart: 'dinner', orderCount: 100, grossRevenueCents: 350000 },
      { dayOfWeek: 5, daypart: 'dinner', orderCount: 120, grossRevenueCents: 450000 },
    ];

    const forecast = forecastDaypartDemand(history, 5, 'dinner', 1.1);

    assert.equal(forecast.predictedOrderCount, 121); // round(110 * 1.1)
    assert.equal(forecast.projectedRevenueCents, 440000); // round(400000 * 1.1)
    assert.equal(forecast.suggestedLineStaffCount, 7); // ceil(121 / 20)
    assert.ok(forecast.confidenceScorePercent >= 70);
  });

  it('detects kitchen station bottlenecks and applies appropriate rush padding', () => {
    const stations = [
      { stationName: 'Grill', activeTickets: 16, nominalCapacity: 10 }, // 1.6 loadFactor -> heavy
      { stationName: 'Salad', activeTickets: 5, nominalCapacity: 10 },  // 0.5 loadFactor -> normal
    ];

    const advisories = evaluateKitchenBottlenecks(stations);

    assert.equal(advisories[0]?.isBottleneck, true);
    assert.equal(advisories[0]?.advisoryLevel, 'heavy_rush_throttle');
    assert.equal(advisories[0]?.recommendedPrepPaddingMins, 20);

    assert.equal(advisories[1]?.isBottleneck, false);
    assert.equal(advisories[1]?.advisoryLevel, 'normal');
    assert.equal(advisories[1]?.recommendedPrepPaddingMins, 0);
  });

  it('calculates adaptive safety stock par levels based on daily velocity and lead time', () => {
    const recommendations = calculateAdaptiveParLevels([
      {
        ingredientId: 'brioche-buns',
        name: 'Brioche Buns',
        unit: 'pack',
        currentParLevel: 10,
        dailyUsageHistory: [10, 12, 8, 10, 10, 10, 10], // avg = 10
        supplierLeadTimeDays: 2, // 10 * 2 * 1.5 = 30
      },
    ]);

    assert.equal(recommendations[0]?.suggestedParLevel, 30);
    assert.equal(recommendations[0]?.averageDailyUsage, 10);
    assert.equal(recommendations[0]?.deltaPercent, 200);
  });
});
