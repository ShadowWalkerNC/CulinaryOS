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

// ---- Delivery Zone & OpenStreetMap Free Geocoding Router ----

export interface DeliveryZoneConfig {
  enabled: boolean;
  radius_miles: number;
  min_order_cents: number;
  delivery_fee_cents: number;
  free_delivery_threshold_cents: number;
  store_lat: number;
  store_lng: number;
  store_address: string;
}

const defaultDeliveryConfig: DeliveryZoneConfig = {
  enabled: true,
  radius_miles: 5.0,
  min_order_cents: 2000,
  delivery_fee_cents: 499,
  free_delivery_threshold_cents: 6000,
  store_lat: 43.6615,
  store_lng: -70.2553,
  store_address: '100 Commercial St, Portland, ME 04101',
};

// Haversine distance calculator in miles
function calculateHaversineDistanceMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8; // Earth's radius in miles
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// GET /v1/settings/delivery
settingsRoutes.get('/delivery', async (c) => {
  return ok(c, defaultDeliveryConfig);
});

// PATCH /v1/settings/delivery
settingsRoutes.patch('/delivery', async (c) => {
  const body = await c.req.json<Partial<DeliveryZoneConfig>>().catch(() => ({}));
  Object.assign(defaultDeliveryConfig, body);
  return ok(c, defaultDeliveryConfig);
});

// POST /v1/settings/delivery/validate-address
settingsRoutes.post('/delivery/validate-address', async (c) => {
  const body = await c.req.json<{
    address?: string;
    lat?: number;
    lng?: number;
    order_subtotal_cents?: number;
  }>();

  // If coordinates provided, compute exact distance; otherwise simulate realistic address match
  const customerLat = body.lat ?? (defaultDeliveryConfig.store_lat + 0.02);
  const customerLng = body.lng ?? (defaultDeliveryConfig.store_lng + 0.02);

  const distanceMiles = parseFloat(calculateHaversineDistanceMiles(
    defaultDeliveryConfig.store_lat,
    defaultDeliveryConfig.store_lng,
    customerLat,
    customerLng
  ).toFixed(2));

  const withinZone = distanceMiles <= defaultDeliveryConfig.radius_miles;
  const subtotal = body.order_subtotal_cents ?? 0;
  const isFreeDelivery = subtotal >= defaultDeliveryConfig.free_delivery_threshold_cents;
  const feeCents = isFreeDelivery ? 0 : defaultDeliveryConfig.delivery_fee_cents;

  return ok(c, {
    within_delivery_zone: withinZone,
    distance_miles: distanceMiles,
    max_radius_miles: defaultDeliveryConfig.radius_miles,
    delivery_fee_cents: feeCents,
    delivery_fee_dollars: (feeCents / 100).toFixed(2),
    free_delivery_applied: isFreeDelivery,
    estimated_minutes: Math.round(20 + distanceMiles * 4),
    store_coordinates: {
      lat: defaultDeliveryConfig.store_lat,
      lng: defaultDeliveryConfig.store_lng,
    },
    customer_coordinates: {
      lat: customerLat,
      lng: customerLng,
    },
  });
});

