// ============================================================
// CulinaryOS — Uncovered Routes Parity & Security Suite
// Covers the 8 route modules identified in the Phase 1 Audit:
// 1. /v1/billing
// 2. /v1/reservations
// 3. /v1/tabs
// 4. /v1/online-orders
// 5. /v1/settings
// 6. /v1/integrations/square
// 7. /v1/integrations/toast
// 8. /v1/jobs & /v1/talent
// ============================================================

import { describe, it, expect, beforeEach } from 'bun:test';
import { Hono } from 'hono';
import { billingRoutes } from '../../apps/server/src/routes/billing.js';
import { reservationRoutes } from '../../apps/server/src/routes/reservations.js';
import { tabsRoutes } from '../../apps/server/src/routes/tabs.js';
import { onlineOrdersRoutes } from '../../apps/server/src/routes/online-orders.js';
import { settingsRoutes } from '../../apps/server/src/routes/settings.js';
import { squareRoutes } from '../../apps/server/src/routes/integrations/square.js';
import { toastRoutes } from '../../apps/server/src/routes/integrations/toast.js';
import { talentPublicRoutes, talentAdminRoutes } from '../../apps/server/src/routes/talent.js';
import type { Env } from '../../apps/server/src/types.js';

const TENANT_ID = '00000000-0000-0000-0000-000000000001';

function createTestApp(): Hono<Env> {
  process.env.AUTH_RELAXED = 'true';
  process.env.CULINARYOS_DEMO_MODE = 'true';
  const app = new Hono<Env>();
  app.use('*', async (c, next) => {
    const headerTenant = c.req.header('X-Tenant-Id') ?? TENANT_ID;
    c.set('tenantId', headerTenant);
    await next();
  });
  app.route('/v1/billing', billingRoutes);
  app.route('/v1/reservations', reservationRoutes);
  app.route('/v1/tabs', tabsRoutes);
  app.route('/v1/online-orders', onlineOrdersRoutes);
  app.route('/v1/settings', settingsRoutes);
  app.route('/v1/integrations/square', squareRoutes);
  app.route('/v1/integrations/toast', toastRoutes);
  app.route('/v1/jobs', talentPublicRoutes);
  app.route('/v1/talent', talentAdminRoutes);
  return app;
}

describe('Uncovered API Routes Parity Suite (8 Route Modules)', () => {
  let app: Hono<Env>;

  beforeEach(() => {
    app = createTestApp();
  });

  it('1. /v1/billing validates plan selection and supports demo checkout & subscription query', async () => {
    // Reject invalid plan
    const badRes = await app.request('/v1/billing/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Tenant-Id': TENANT_ID },
      body: JSON.stringify({ plan: 'invalid-plan' }),
    });
    expect(badRes.status).toBe(400);
    const badJson = await badRes.json() as any;
    expect(badJson.ok).toBe(false);

    // Valid starter plan in demo mode
    const okRes = await app.request('/v1/billing/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Tenant-Id': TENANT_ID },
      body: JSON.stringify({ plan: 'pro' }),
    });
    expect(okRes.status).toBe(200);
    const okJson = await okRes.json() as any;
    expect(okJson.ok).toBe(true);
    expect(okJson.data.checkout_url).toBeDefined();

    // Subscription status query
    const subRes = await app.request('/v1/billing/subscription', {
      headers: { 'X-Tenant-Id': TENANT_ID },
    });
    expect(subRes.status).toBe(200);
    const subJson = await subRes.json() as any;
    expect(subJson.ok).toBe(true);
  });

  it('2. /v1/reservations validates future date-time, party size, and supports listing', async () => {
    // Past date rejected
    const pastRes = await app.request('/v1/reservations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Tenant-Id': TENANT_ID },
      body: JSON.stringify({
        guest_name: 'Chef Test',
        party_size: 4,
        reserved_at: '2020-01-01T18:00:00.000Z',
      }),
    });
    expect(pastRes.status).toBe(422);

    // Future date accepted
    const futureIso = new Date(Date.now() + 86_400_000).toISOString();
    const createRes = await app.request('/v1/reservations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Tenant-Id': TENANT_ID },
      body: JSON.stringify({
        guest_name: 'Gordon Ramsay',
        party_size: 4,
        reserved_at: futureIso,
      }),
    });
    expect(createRes.status).toBe(201);
    const created = await createRes.json() as any;
    expect(created.ok).toBe(true);
    expect(created.data.guest_name).toBe('Gordon Ramsay');
    expect(created.data.party_size).toBe(4);

    // List reservations
    const listRes = await app.request('/v1/reservations', {
      headers: { 'X-Tenant-Id': TENANT_ID },
    });
    expect(listRes.status).toBe(200);
    const listJson = await listRes.json() as any;
    expect(listJson.ok).toBe(true);
    expect(Array.isArray(listJson.data)).toBe(true);
  });

  it('3. /v1/tabs opens, retrieves, and closes bar tabs with integer-cent preauth', async () => {
    const openRes = await app.request('/v1/tabs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Tenant-Id': TENANT_ID },
      body: JSON.stringify({
        guestName: 'Anthony Bourdain',
        cardLast4: '8888',
        preauthAmount: 7500,
      }),
    });
    expect(openRes.status).toBe(201);
    const openJson = await openRes.json() as any;
    expect(openJson.ok).toBe(true);
    expect(openJson.data.preauth_amount).toBe(7500);
    const tabId = openJson.data.id;

    // Fetch single tab
    const getRes = await app.request(`/v1/tabs/${tabId}`, {
      headers: { 'X-Tenant-Id': TENANT_ID },
    });
    expect(getRes.status).toBe(200);

    // Close tab
    const closeRes = await app.request(`/v1/tabs/${tabId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'X-Tenant-Id': TENANT_ID },
      body: JSON.stringify({ status: 'closed' }),
    });
    expect(closeRes.status).toBe(200);
    const closeJson = await closeRes.json() as any;
    expect(closeJson.data.status).toBe('closed');
  });

  it('4. /v1/online-orders requires tenantSlug and creates guest online order', async () => {
    const missingSlugRes = await app.request('/v1/online-orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [] }),
    });
    expect(missingSlugRes.status).toBe(422);

    const validRes = await app.request('/v1/online-orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantSlug: 'alley-katz',
        mode: 'pickup',
        total: 2450,
        customer: { name: 'Sarah Connor', phone: '555-0199' },
      }),
    });
    expect(validRes.status).toBe(201);
    const validJson = await validRes.json() as any;
    expect(validJson.ok).toBe(true);
    expect(validJson.data.tenant_slug).toBe('alley-katz');
  });

  it('5. /v1/settings reads, updates, and applies business template presets without schema branching', async () => {
    const getRes = await app.request('/v1/settings', {
      headers: { 'X-Tenant-Id': TENANT_ID },
    });
    expect(getRes.status).toBe(200);
    const getJson = await getRes.json() as any;
    expect(getJson.ok).toBe(true);
    expect(getJson.data.tenantId).toBe(TENANT_ID);

    // Apply food-truck template preset (Stage 4 requirement)
    const tplRes = await app.request('/v1/settings/apply-template', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Tenant-Id': TENANT_ID },
      body: JSON.stringify({ template: 'food-truck' }),
    });
    expect(tplRes.status).toBe(200);
    const tplJson = await tplRes.json() as any;
    expect(tplJson.ok).toBe(true);
    expect(tplJson.data.template).toBe('food-truck');
  });

  it('6. /v1/integrations/square imports Square catalog objects and reports status', async () => {
    const importRes = await app.request('/v1/integrations/square/import-catalog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Tenant-Id': TENANT_ID },
      body: JSON.stringify({
        objects: [
          { type: 'CATEGORY', id: 'cat-1', category_data: { name: 'Wood-Fired Pizzas' } },
          {
            type: 'ITEM',
            id: 'item-1',
            item_data: {
              name: 'Margherita DOP',
              category_id: 'cat-1',
              variations: [
                { id: 'var-1', item_variation_data: { name: 'Regular', price_money: { amount: 1800, currency: 'USD' } } },
              ],
            },
          },
        ],
      }),
    });
    expect(importRes.status).toBe(201);
    const importJson = await importRes.json() as any;
    expect(importJson.ok).toBe(true);
  });

  it('7. /v1/integrations/toast syncs menus and dispatches Toast webhook orders to KDS', async () => {
    const syncRes = await app.request('/v1/integrations/toast/sync-menu', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Tenant-Id': TENANT_ID },
      body: JSON.stringify({ restaurant_guid: 'toast-guid-01', menus: [{ name: 'Dinner' }] }),
    });
    expect(syncRes.status).toBe(200);
    const syncJson = await syncRes.json() as any;
    expect(syncJson.ok).toBe(true);
    expect(syncJson.data.bridge).toBe('toast');

    const whRes = await app.request('/v1/integrations/toast/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Tenant-Id': TENANT_ID },
      body: JSON.stringify({
        guid: 'toast-order-999',
        table: { name: 'Patio 4' },
        checks: [
          {
            guid: 'chk-1',
            totalAmount: 3200,
            selections: [{ item: { name: 'Smashburger', guid: 'itm-1' }, quantity: 2, price: 1600 }],
          },
        ],
      }),
    });
    expect(whRes.status).toBe(200);
    const whJson = await whRes.json() as any;
    expect(whJson.ok).toBe(true);
    expect(whJson.data.kds_dispatched).toBe(true);
  });

  it('8. /v1/jobs & /v1/talent lists active restaurant jobs and manages applicant pipeline', async () => {
    const jobsRes = await app.request('/v1/jobs', {
      headers: { 'X-Tenant-Id': TENANT_ID },
    });
    expect(jobsRes.status).toBe(200);
    const jobsJson = await jobsRes.json() as any;
    expect(jobsJson.ok).toBe(true);
    expect(Array.isArray(jobsJson.data.jobs)).toBe(true);
    expect(jobsJson.data.jobs.length).toBeGreaterThan(0);

    const appsRes = await app.request('/v1/talent/applications', {
      headers: { 'X-Tenant-Id': TENANT_ID },
    });
    expect(appsRes.status).toBe(200);
    const appsJson = await appsRes.json() as any;
    expect(appsJson.ok).toBe(true);
  });
});
