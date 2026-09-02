// ============================================================
// CulinaryOS — AI Kitchen Autopilot & Predictive Operations API
// ============================================================

import { Hono } from 'hono';
import { requireTenant, ok, err } from '../middleware/auth.js';
import {
  forecastDaypartDemand,
  evaluateKitchenBottlenecks,
  calculateAdaptiveParLevels,
} from '@culinaryos/forecast-engine';
import type { Env } from '../types.js';

export const autopilotRoutes = new Hono<Env>();
autopilotRoutes.use('*', requireTenant);

// ---- GET /v1/autopilot/forecast ----
autopilotRoutes.get('/forecast', async (c) => {
  const dayOfWeek = parseInt(c.req.query('day_of_week') ?? String(new Date().getDay()), 10);
  const daypart = (c.req.query('daypart') ?? 'dinner') as any;
  const weather = parseFloat(c.req.query('weather_multiplier') ?? '1.0');

  // Sample historical data
  const history = [
    { dayOfWeek, daypart, orderCount: 75, grossRevenueCents: 225000 },
    { dayOfWeek, daypart, orderCount: 88, grossRevenueCents: 264000 },
    { dayOfWeek, daypart, orderCount: 82, grossRevenueCents: 246000 },
  ];

  const forecast = forecastDaypartDemand(history, dayOfWeek, daypart, weather);
  return ok(c, {
    dayOfWeek,
    daypart,
    forecast,
  });
});

// ---- GET /v1/autopilot/bottleneck-advisory ----
autopilotRoutes.get('/bottleneck-advisory', async (c) => {
  // In demo / live mode, pull active station queues
  const stations = [
    { stationName: 'grill', activeTickets: 14, nominalCapacity: 10 },
    { stationName: 'fry', activeTickets: 6, nominalCapacity: 8 },
    { stationName: 'cold', activeTickets: 4, nominalCapacity: 10 },
    { stationName: 'bar', activeTickets: 12, nominalCapacity: 12 },
  ];

  const advisories = evaluateKitchenBottlenecks(stations);
  const highestBottleneck = advisories.find((a) => a.advisoryLevel === 'heavy_rush_throttle')
    || advisories.find((a) => a.advisoryLevel === 'moderate_delay');

  return ok(c, {
    advisories,
    hasActiveBottleneck: Boolean(highestBottleneck),
    globalPaddingRecommendationMins: highestBottleneck?.recommendedPrepPaddingMins ?? 0,
    timestamp: new Date().toISOString(),
  });
});

// ---- GET /v1/autopilot/par-suggestions ----
autopilotRoutes.get('/par-suggestions', async (c) => {
  const sampleItems = [
    { ingredientId: 'ing-beef-8oz', name: '8oz Dry-Aged Beef Patties', unit: 'portions', currentParLevel: 40, dailyUsageHistory: [38, 42, 45, 39, 44, 48, 50], supplierLeadTimeDays: 2 },
    { ingredientId: 'ing-buns', name: 'Brioche Burger Buns', unit: 'packs', currentParLevel: 15, dailyUsageHistory: [10, 12, 11, 10, 14, 13, 12], supplierLeadTimeDays: 1 },
    { ingredientId: 'ing-truffle-oil', name: 'White Truffle Oil', unit: 'bottles', currentParLevel: 8, dailyUsageHistory: [1, 0, 1, 1, 0, 1, 0], supplierLeadTimeDays: 3 },
  ];

  const suggestions = calculateAdaptiveParLevels(sampleItems);
  return ok(c, { suggestions });
});
