// ============================================================
// CulinaryOS Backend — Main Server
// Hono on Bun (or Node). Hosts:
//   POST /internal/events  — event bus ingress
//   GET  /internal/events  — event log (last 100)
//   GET  /health
// Each service (KDS, POS, RecipeOS) runs its own server
// that also accepts POST /internal/events for direct emission.
// This file is the CulinaryOS orchestrator's backend.
// ============================================================

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { handleIncomingEvent } from './event-bus/broker';
import { startRealtimeBridge } from './event-bus/realtime-bridge';

const app = new Hono();

app.use('*', logger());
app.use('*', cors({
  origin: (origin) => origin,   // tighten in production
  allowHeaders: ['Content-Type', 'Authorization', 'X-Tenant-Id', 'X-Caller-Service', 'X-Request-Id'],
  allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
}));

// ---- Auth middleware for internal routes ----
app.use('/internal/*', async (c, next) => {
  const key = c.req.header('Authorization')?.replace('Bearer ', '');
  if (key !== process.env.INTERNAL_API_KEY) {
    return c.json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Invalid API key' } }, 401);
  }
  await next();
});

// ---- Event Bus ----

app.post('/internal/events', async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body) return c.json({ ok: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid JSON' } }, 422);

  const result = await handleIncomingEvent(body);
  if (!result.ok) return c.json({ ok: false, error: { code: 'INTERNAL_ERROR', message: result.error } }, 500);

  return c.json({ ok: true });
});

app.get('/internal/events', async (c) => {
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const tenantId = c.req.header('X-Tenant-Id');

  let q = supabase.from('domain_events').select('*').order('created_at', { ascending: false }).limit(100);
  if (tenantId) q = q.eq('tenant_id', tenantId);

  const { data, error } = await q;
  if (error) return c.json({ ok: false, error: { code: 'INTERNAL_ERROR', message: error.message } }, 500);
  return c.json({ ok: true, data });
});

// ---- Health ----

app.get('/health', (c) => c.json({
  service: 'culinaryos',
  status: 'healthy',
  version: '1.0.0',
  uptime: Math.floor(process.uptime()),
  checkedAt: new Date().toISOString(),
}));

// ---- Boot ----

const PORT = parseInt(process.env.PORT ?? '3000', 10);
startRealtimeBridge();
console.log(`CulinaryOS backend running on :${PORT}`);
export default { port: PORT, fetch: app.fetch };
