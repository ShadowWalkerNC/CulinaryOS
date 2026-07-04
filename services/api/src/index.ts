// ============================================================
// CulinaryOS — Hono API Gateway
// All tenant routes are mounted here under /v1
// Auth middleware injects tenantId + userId on every request
// ============================================================

import { Hono }        from 'hono';
import { serve }       from '@hono/node-server';
import { cors }        from 'hono/cors';
import { logger }      from 'hono/logger';
import { analyticsRoutes } from './routes/analytics';
import { pantryRoutes }    from './routes/pantry';
import { reportsRoutes }   from './routes/reports';

export interface Env {
  Variables: {
    tenantId: string;
    userId: string;
  };
}

const app = new Hono<Env>();

// ── Global middleware ─────────────────────────────────────────────────
app.use('*', logger());
app.use('*', cors({
  origin: [
    process.env.APP_POS_URL   ?? 'http://localhost:5173',
    process.env.APP_KDS_URL   ?? 'http://localhost:5174',
    process.env.APP_ADMIN_URL ?? 'http://localhost:5175',
    'http://localhost:3000',
  ],
  allowHeaders:  ['Content-Type', 'Authorization'],
  allowMethods:  ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials:   true,
}));

// ── Auth middleware — injects tenantId + userId into context ──────────────
// NOTE: skipped for /health. In production, validate JWT from Supabase here.
app.use('/v1/*', async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader && process.env.NODE_ENV !== 'development') {
    return c.json({ ok: false, error: 'Unauthorized' }, 401);
  }
  // In dev, fall back to env-supplied tenant for ease of testing
  c.set('tenantId', process.env.DEV_TENANT_ID ?? 'dev-tenant');
  c.set('userId',   process.env.DEV_USER_ID   ?? 'dev-user');
  await next();
});

// ── Routes ───────────────────────────────────────────────────────────
app.get('/health', (c) => c.json({ ok: true, version: '0.1.0', ts: new Date().toISOString() }));

app.route('/v1/kds',     analyticsRoutes);   // GET /v1/kds/stations/:id/analytics
app.route('/v1/pantry',  pantryRoutes);      // GET|POST|PATCH /v1/pantry/**
app.route('/v1/reports', reportsRoutes);     // GET /v1/reports/**

// ── 404 fallback ────────────────────────────────────────────────────────
app.notFound((c) => c.json({ ok: false, error: `No route for ${c.req.method} ${c.req.path}` }, 404));

// ── Start ─────────────────────────────────────────────────────────────
const PORT = Number(process.env.PORT ?? 3000);
serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`⚡ CulinaryOS API listening on http://localhost:${PORT}`);
});

export default app;
