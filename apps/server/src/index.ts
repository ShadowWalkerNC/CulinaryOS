// ============================================================
// CulinaryOS — API Server (apps/server)
// Hono on Node 20 (or Bun). Entry point.
// ============================================================

import { serve }               from '@hono/node-server';
import { Hono }                from 'hono';
import { cors }                from 'hono/cors';
import { logger }              from 'hono/logger';
import { requireApiKey }       from './middleware/auth';
import { withSupabase }        from './middleware/supabase';
import {
  handleIncomingEvent,
  startRealtimeBridge,
}                              from '@culinaryos/event-bus';
import { kdsRoutes }           from './routes/kds';
import { pantryRoutes }        from './routes/pantry';
import { reportsRoutes }       from './routes/reports';
import { ordersRoutes }        from './routes/orders';
import { tabsRoutes }          from './routes/tabs';
import { menuRoutes }          from './routes/menu';
import { paymentsRoutes }      from './routes/payments';
import { posSyncRoutes }       from './routes/pos-sync';
import { onlineOrdersRoutes }  from './routes/online-orders';
import { authRoutes }          from './routes/auth';
import { opsRoutes }           from './routes/ops';
import { adminRoutes }         from './routes/admin';
import { stripeWebhook }       from './routes/stripe-webhook';
import { marketplaceRoutes }   from './routes/marketplace';
import { settingsRoutes }      from './routes/settings';
import { squareRoutes }        from './routes/integrations/square';
import { toastRoutes }         from './routes/integrations/toast';
import { talentPublicRoutes, talentAdminRoutes } from './routes/talent';
import { tablesRoutes }        from './routes/tables';
import { daypartsRoutes }      from './routes/dayparts';
import { billingRoutes }       from './routes/billing';
import { signupRoutes }        from './routes/signup';
import { reservationRoutes }   from './routes/reservations';
import type { Env }            from './types';




export const app = new Hono<Env>();

// ---- Global middleware ----

app.use('*', logger());

const corsAllowlist = (process.env.CORS_ORIGINS ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use('*', cors({
  origin: (origin) => {
    if (!origin) return corsAllowlist[0] ?? 'http://localhost:5173';
    if (corsAllowlist.length === 0) {
      // Dev & LAN default: localhost + private network ranges (192.168.x, 10.x, 172.16-31.x, *.local)
      if (
        /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) ||
        /^https?:\/\/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$/.test(origin) ||
        /^https?:\/\/[a-zA-Z0-9-]+\.local(:\d+)?$/.test(origin)
      ) {
        return origin;
      }
      return '';
    }
    return corsAllowlist.includes(origin) ? origin : '';
  },
  allowHeaders: ['Content-Type', 'Authorization', 'X-Tenant-Id', 'X-Caller-Service', 'X-Request-Id'],
  allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
}));
app.use('*', withSupabase);

// ---- Internal routes (API key protected) ----

app.use('/internal/*', requireApiKey);

app.post('/internal/events', async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body) return c.json({ ok: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid JSON' } }, 422);

  const result = await handleIncomingEvent(body);
  if (!result.ok) return c.json({ ok: false, error: { code: 'INTERNAL_ERROR', message: result.error } }, 500);
  return c.json({ ok: true });
});

app.get('/internal/events', async (c) => {
  const supabase = c.get('supabase');
  const tenantId = c.req.header('X-Tenant-Id');

  if (!tenantId) {
    return c.json({
      ok: false,
      error: { code: 'VALIDATION_ERROR', message: 'X-Tenant-Id required — refuse unscoped event listing' },
    }, 422);
  }

  const q = supabase
    .from('domain_events')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(100);

  const { data, error } = await q;
  if (error) return c.json({ ok: false, error: { code: 'INTERNAL_ERROR', message: error.message } }, 500);
  return c.json({ ok: true, data });
});

app.route('/v1/auth',         authRoutes);
app.route('/v1/auth',         signupRoutes);
app.route('/v1/billing',      billingRoutes);
app.route('/v1/reservations', reservationRoutes);
app.route('/v1/ops',          opsRoutes);
app.route('/v1/admin',    adminRoutes);
app.route('/v1/kds',      kdsRoutes);
app.route('/v1/pantry',   pantryRoutes);
app.route('/v1/reports',  reportsRoutes);
app.route('/v1/orders',   ordersRoutes);
app.route('/v1/tabs',     tabsRoutes);
app.route('/v1/menu',     menuRoutes);
app.route('/v1/payments', paymentsRoutes);
app.route('/v1/pos',      posSyncRoutes);
app.route('/v1/online-orders', onlineOrdersRoutes);
app.route('/v1/tables',   tablesRoutes);
app.route('/v1/dayparts', daypartsRoutes);

// Stripe webhook — no tenant middleware (signature-verified)
app.route('/v1/webhooks/stripe', stripeWebhook);

// Marketplace & optional AI layer
app.route('/v1/marketplace', marketplaceRoutes);
app.route('/v1/settings',    settingsRoutes);

// External POS & Payment Hub Bridges (Square, Toast)
app.route('/v1/integrations/square', squareRoutes);
app.route('/v1/integrations/toast',  toastRoutes);

// CulinaryTalent & Jobs Engine
app.route('/v1/jobs', talentPublicRoutes);
app.route('/v1/talent', talentAdminRoutes);

// ---- Health ----

app.get('/health', (c) => c.json({
  service:   'culinaryos-api',
  status:    'healthy',
  version:   '0.1.0',
  uptime:    Math.floor(process.uptime()),
  checkedAt: new Date().toISOString(),
}));

// ---- Boot ----

const PORT = parseInt(process.env.PORT ?? '3000', 10);
const HOST = process.env.HOST ?? '0.0.0.0';
startRealtimeBridge();

if (process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
  serve({ fetch: app.fetch, port: PORT, hostname: HOST }, () => {
    console.log(`[culinaryos-api] listening on http://${HOST}:${PORT}`);
  });
}
