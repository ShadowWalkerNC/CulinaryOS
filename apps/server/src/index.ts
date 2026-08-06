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
import type { Env }            from './types';

const app = new Hono<Env>();

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
      // Dev default: localhost only
      if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return origin;
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

app.route('/v1/kds',      kdsRoutes);
app.route('/v1/pantry',   pantryRoutes);
app.route('/v1/reports',  reportsRoutes);
app.route('/v1/orders',   ordersRoutes);
app.route('/v1/tabs',     tabsRoutes);
app.route('/v1/menu',     menuRoutes);
app.route('/v1/payments', paymentsRoutes);
app.route('/v1/pos',      posSyncRoutes);
app.route('/v1/online-orders', onlineOrdersRoutes);

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
startRealtimeBridge();

serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`[culinaryos-api] listening on :${PORT}`);
});
