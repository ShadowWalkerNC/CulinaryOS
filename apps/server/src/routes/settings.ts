// ============================================================
// CulinaryOS — Settings & Customization API
// Company info, tax/tip defaults, station routing, and A11y/display
// ============================================================

import { Hono } from 'hono';
import type { Env } from '../types.js';
import { requireTenant, ok, err } from '../middleware/auth.js';
import {
  DEFAULT_SETTINGS,
  DEFAULT_KITCHEN_STATIONS,
  DEFAULT_ITEM_ROUTING_RULES,
  type CulinaryOSSettings,
  type KitchenStationConfig,
  type ItemRoutingRule,
} from '@culinaryos/shared';

export const settingsRoutes = new Hono<Env>();
settingsRoutes.use('*', requireTenant);

// Memory cache per tenant
const settingsCache = new Map<string, CulinaryOSSettings>();

function getTenantSettings(tenantId: string): CulinaryOSSettings {
  if (!settingsCache.has(tenantId)) {
    settingsCache.set(tenantId, {
      ...DEFAULT_SETTINGS,
      tenantId,
      updatedAt: new Date().toISOString(),
    });
  }
  return settingsCache.get(tenantId)!;
}

// GET /v1/settings — Get all settings for current tenant
settingsRoutes.get('/', async (c) => {
  const tenantId = c.get('tenantId');
  const current = getTenantSettings(tenantId);
  return ok(c, current);
});

// PATCH /v1/settings — Update settings for current tenant
settingsRoutes.patch('/', async (c) => {
  const tenantId = c.get('tenantId');
  const body = await c.req.json().catch(() => ({}));
  const current = getTenantSettings(tenantId);

  const updated: CulinaryOSSettings = {
    ...current,
    ...body,
    company: { ...current.company, ...(body.company || {}) },
    display: { ...current.display, ...(body.display || {}) },
    stations: body.stations || current.stations,
    routingRules: body.routingRules || current.routingRules,
    updatedAt: new Date().toISOString(),
  };

  settingsCache.set(tenantId, updated);
  return ok(c, updated);
});

// GET /v1/settings/stations — List kitchen stations
settingsRoutes.get('/stations', async (c) => {
  const tenantId = c.get('tenantId');
  const current = getTenantSettings(tenantId);
  return ok(c, { stations: current.stations });
});

// PATCH /v1/settings/stations — Update station routing list
settingsRoutes.patch('/stations', async (c) => {
  const tenantId = c.get('tenantId');
  const body = await c.req.json<{ stations: KitchenStationConfig[] }>().catch(() => ({ stations: [] }));
  if (!Array.isArray(body.stations)) {
    return err(c, 'VALIDATION_ERROR', 'stations must be an array', 422);
  }

  const current = getTenantSettings(tenantId);
  current.stations = body.stations;
  current.updatedAt = new Date().toISOString();
  settingsCache.set(tenantId, current);

  return ok(c, { stations: current.stations });
});

// GET /v1/settings/routing — Item routing rules
settingsRoutes.get('/routing', async (c) => {
  const tenantId = c.get('tenantId');
  const current = getTenantSettings(tenantId);
  return ok(c, { routingRules: current.routingRules });
});

// PATCH /v1/settings/routing — Update item routing rules
settingsRoutes.patch('/routing', async (c) => {
  const tenantId = c.get('tenantId');
  const body = await c.req.json<{ rules: ItemRoutingRule[] }>().catch(() => ({ rules: [] }));
  if (!Array.isArray(body.rules)) {
    return err(c, 'VALIDATION_ERROR', 'rules must be an array', 422);
  }

  const current = getTenantSettings(tenantId);
  current.routingRules = body.rules;
  current.updatedAt = new Date().toISOString();
  settingsCache.set(tenantId, current);

  return ok(c, { routingRules: current.routingRules });
});

// POST /v1/settings/reset — Reset settings back to default factory presets
settingsRoutes.post('/reset', async (c) => {
  const tenantId = c.get('tenantId');
  const resetSettings: CulinaryOSSettings = {
    ...DEFAULT_SETTINGS,
    tenantId,
    updatedAt: new Date().toISOString(),
  };
  settingsCache.set(tenantId, resetSettings);
  return ok(c, resetSettings);
});
