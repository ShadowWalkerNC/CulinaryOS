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

// In-memory mock ai_prompt_log store for token auditing & dashboard (demo mode)
interface AiPromptLogEntry {
  id: string;
  tenant_id: string;
  feature: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost_estimate_cents: number;
  created_at: string;
}

const mockAiPromptLogs: AiPromptLogEntry[] = [];

// Non-negotiable Rule 6: AI ships behind flags, off by default.
function isAutopilotEnabled(): boolean {
  return process.env.ENABLE_AI_AUTOPILOT === 'true';
}

autopilotRoutes.use('*', async (c, next) => {
  // Allow the status check and dashboard routes even if flag is off
  const path = c.req.path;
  if (path.endsWith('/status') || path.endsWith('/token-dashboard') || path.endsWith('/toggle')) {
    return next();
  }

  if (!isAutopilotEnabled()) {
    return err(
      c,
      'FEATURE_DISABLED',
      'AI Kitchen Autopilot is an optional accessory and is disabled by default. Enable with ENABLE_AI_AUTOPILOT=true or via settings.',
      403
    );
  }

  return next();
});

// Helper to log AI token usage to ai_prompt_log
async function recordAiTokenUsage(tenantId: string, feature: string, promptTokens: number, completionTokens: number) {
  const totalTokens = promptTokens + completionTokens;
  const costEstimateCents = Math.round((totalTokens / 1000) * 0.15 * 100) / 100;

  mockAiPromptLogs.unshift({
    id: `log-${crypto.randomUUID()}`,
    tenant_id: tenantId,
    feature,
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    total_tokens: totalTokens,
    cost_estimate_cents: costEstimateCents,
    created_at: new Date().toISOString(),
  });
}

// ---- GET /v1/autopilot/status ----
autopilotRoutes.get('/status', async (c) => {
  return ok(c, {
    enabled: isAutopilotEnabled(),
    featureFlag: 'ENABLE_AI_AUTOPILOT',
    description: 'AI Kitchen Autopilot (predictive prep, dynamic 86-ing, par suggestions)',
  });
});

// ---- GET /v1/autopilot/token-dashboard ----
autopilotRoutes.get('/token-dashboard', async (c) => {
  const tenantId = c.get('tenantId');
  const tenantLogs = mockAiPromptLogs.filter((l) => l.tenant_id === tenantId);
  const totalTokens = tenantLogs.reduce((sum, l) => sum + l.total_tokens, 0);
  const totalCostCents = tenantLogs.reduce((sum, l) => sum + l.cost_estimate_cents, 0);

  return ok(c, {
    tenantId,
    autopilotEnabled: isAutopilotEnabled(),
    totalQueries: tenantLogs.length,
    totalTokens,
    totalCostEstimateCents: Math.round(totalCostCents * 100) / 100,
    recentLogs: tenantLogs.slice(0, 20),
  });
});

// ---- GET /v1/autopilot/forecast ----
autopilotRoutes.get('/forecast', async (c) => {
  const tenantId = c.get('tenantId');
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
  await recordAiTokenUsage(tenantId, 'daypart_demand_forecast', 240, 180);

  return ok(c, {
    dayOfWeek,
    daypart,
    forecast,
  });
});

// ---- GET /v1/autopilot/bottleneck-advisory ----
autopilotRoutes.get('/bottleneck-advisory', async (c) => {
  const tenantId = c.get('tenantId');
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

  await recordAiTokenUsage(tenantId, 'rush_bottleneck_advisory', 310, 120);

  return ok(c, {
    advisories,
    hasActiveBottleneck: Boolean(highestBottleneck),
    globalPaddingRecommendationMins: highestBottleneck?.recommendedPrepPaddingMins ?? 0,
    timestamp: new Date().toISOString(),
  });
});

// ---- GET /v1/autopilot/par-suggestions ----
autopilotRoutes.get('/par-suggestions', async (c) => {
  const tenantId = c.get('tenantId');
  const sampleItems = [
    { ingredientId: 'ing-beef-8oz', name: '8oz Dry-Aged Beef Patties', unit: 'portions', currentParLevel: 40, dailyUsageHistory: [38, 42, 45, 39, 44, 48, 50], supplierLeadTimeDays: 2 },
    { ingredientId: 'ing-buns', name: 'Brioche Burger Buns', unit: 'packs', currentParLevel: 15, dailyUsageHistory: [10, 12, 11, 10, 14, 13, 12], supplierLeadTimeDays: 1 },
    { ingredientId: 'ing-truffle-oil', name: 'White Truffle Oil', unit: 'bottles', currentParLevel: 8, dailyUsageHistory: [1, 0, 1, 1, 0, 1, 0], supplierLeadTimeDays: 3 },
  ];

  const suggestions = calculateAdaptiveParLevels(sampleItems);
  await recordAiTokenUsage(tenantId, 'adaptive_par_suggestions', 450, 220);

  return ok(c, { suggestions });
});
