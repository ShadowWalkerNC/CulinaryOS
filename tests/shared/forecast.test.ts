import { describe, it, expect } from 'vitest';
import {
  forecastDaypartDemand,
  evaluateKitchenBottlenecks,
  calculateAdaptiveParLevels,
  type HistoricalDaypartSales,
} from '../../packages/forecast-engine/src/index.js';

describe('AI Forecast & Kitchen Autopilot Engine', () => {
  describe('Daypart Demand Smoothing', () => {
    const mockHistory: HistoricalDaypartSales[] = [
      { dayOfWeek: 5, daypart: 'dinner', orderCount: 80, grossRevenueCents: 240000 },
      { dayOfWeek: 5, daypart: 'dinner', orderCount: 90, grossRevenueCents: 270000 },
      { dayOfWeek: 5, daypart: 'dinner', orderCount: 85, grossRevenueCents: 255000 },
    ];

    it('predicts Friday dinner rush volume with confidence scoring', () => {
      const forecast = forecastDaypartDemand(mockHistory, 5, 'dinner', 1.0);
      expect(forecast.predictedOrderCount).toBe(85);
      expect(forecast.projectedRevenueCents).toBe(255000);
      expect(forecast.suggestedLineStaffCount).toBe(5); // 85 / 20 = ceil 5
      expect(forecast.confidenceScorePercent).toBeGreaterThanOrEqual(80);
    });

    it('applies weather surge multipliers to predicted sales', () => {
      const surgeForecast = forecastDaypartDemand(mockHistory, 5, 'dinner', 1.2); // Sunny patio evening
      expect(surgeForecast.predictedOrderCount).toBe(102);
      expect(surgeForecast.projectedRevenueCents).toBe(306000);
    });
  });

  describe('Kitchen Bottleneck Detection & Advisory Alerts', () => {
    it('evaluates line load factors and emits heavy rush throttling recommendations', () => {
      const stations = [
        { stationName: 'grill', activeTickets: 18, nominalCapacity: 10 }, // 1.8x load
        { stationName: 'fry', activeTickets: 7, nominalCapacity: 8 },      // 0.88x load
        { stationName: 'cold', activeTickets: 11, nominalCapacity: 10 },   // 1.1x load
      ];

      const advisories = evaluateKitchenBottlenecks(stations);
      expect(advisories.length).toBe(3);

      const grill = advisories.find(a => a.station === 'grill');
      expect(grill?.isBottleneck).toBe(true);
      expect(grill?.advisoryLevel).toBe('heavy_rush_throttle');
      expect(grill?.recommendedPrepPaddingMins).toBe(20);

      const fry = advisories.find(a => a.station === 'fry');
      expect(fry?.isBottleneck).toBe(false);
      expect(fry?.advisoryLevel).toBe('normal');

      const cold = advisories.find(a => a.station === 'cold');
      expect(cold?.isBottleneck).toBe(true);
      expect(cold?.advisoryLevel).toBe('moderate_delay');
      expect(cold?.recommendedPrepPaddingMins).toBe(10);
    });
  });

  describe('Adaptive Safety-Stock Par Levels', () => {
    it('computes dynamic par adjustments based on usage velocity and lead time', () => {
      const items = [
        {
          ingredientId: 'beef-8oz',
          name: 'Prime Burger Patties',
          unit: 'portions',
          currentParLevel: 30,
          dailyUsageHistory: [25, 28, 30, 26, 29, 32, 35], // Avg ~29.3
          supplierLeadTimeDays: 2, // 29.3 * 2 * 1.5 = 87.9 -> 88
        },
        {
          ingredientId: 'lettuce-case',
          name: 'Romaine Lettuce',
          unit: 'cases',
          currentParLevel: 10,
          dailyUsageHistory: [1, 1, 0, 1, 2, 1, 1], // Avg ~1.0
          supplierLeadTimeDays: 1, // 1 * 1 * 1.5 = 1.5 -> 2
        },
      ];

      const recommendations = calculateAdaptiveParLevels(items);
      expect(recommendations.length).toBe(2);

      const beef = recommendations.find(r => r.ingredientId === 'beef-8oz');
      expect(beef?.suggestedParLevel).toBe(88);
      expect(beef?.deltaPercent).toBeGreaterThan(100);
      expect(beef?.rationale).toContain('High velocity spike detected');

      const lettuce = recommendations.find(r => r.ingredientId === 'lettuce-case');
      expect(lettuce?.suggestedParLevel).toBe(2);
      expect(lettuce?.deltaPercent).toBeLessThan(-50);
      expect(lettuce?.rationale).toContain('Low demand velocity');
    });
  });
});
