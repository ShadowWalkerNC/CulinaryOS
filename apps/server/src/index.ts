// ============================================================
// CulinaryOS — API Server (apps/server)
// Hono on Node 20 (or Bun). Entry point.
//
// Routes mounted:
//   GET  /health
//   POST /internal/events        — event bus ingress
//   GET  /internal/events        — event log (last 100)
//   *    /v1/kds/*               — kitchen display routes
//   *    /v1/pantry/*            — pantry / inventory routes
//   *    /v1/reports/*           — analytics + reporting
//
// Coming in upcoming commits:
//   /v1/payments/*               — Commit 10
//   /v1/menu/*                   — Commit 11
//   /v1/online-orders/*          — Commit 12
//   /v1/pos/orders/*             — Phase 3
//   /v1/tenants/register         — Commit 13
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

const app = new Hono();

// ---- Global middleware ----

app.use('*', logger());
app.use('*', cors({
  origin: (origin) => origin,
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

  let q = supabase.from('domain_events').select('*').order('created_at', { ascending: false }).limit(100);
  if (tenantId) q = q.eq('tenant_id', tenantId);

  const { data, error } = await q;
  if (error) return c.json({ ok: false, error: { code: 'INTERNAL_ERROR', message: error.message } }, 500);
  return c.json({ ok: true, data });
});

// ---- API v1 routes ----

app.route('/v1/kds',     kdsRoutes);
app.route('/v1/pantry',  pantryRoutes);
app.route('/v1/reports', reportsRoutes);

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

export default app;
