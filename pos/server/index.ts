// ============================================================
// POS API Server — Hono on Bun
// Base URL: http://localhost:3003
// ============================================================

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { requireApiKey, requireTenant } from '../../backend/middleware/auth';
import { withSupabase } from '../../backend/middleware/supabase';
import { orderRoutes }   from './routes/orders';
import { menuRoutes }    from './routes/menu';
import { tabRoutes }     from './routes/tabs';
import { paymentRoutes } from './routes/payments';

const app = new Hono();

app.use('*', logger());
app.use('*', cors({
  origin: (o) => o,
  allowHeaders: ['Content-Type', 'Authorization', 'X-Tenant-Id', 'X-Caller-Service', 'X-Request-Id'],
  allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
}));

app.use('/v1/*', requireApiKey, requireTenant, withSupabase);

app.route('/v1/orders',   orderRoutes);
app.route('/v1/menu',     menuRoutes);
app.route('/v1/tabs',     tabRoutes);
app.route('/v1/payments', paymentRoutes);

app.get('/health', (c) => c.json({
  service: 'pos',
  status: 'healthy',
  version: '1.0.0',
  uptime: Math.floor(process.uptime()),
  checkedAt: new Date().toISOString(),
}));

const PORT = parseInt(process.env.PORT ?? '3003', 10);
console.log(`POS server running on :${PORT}`);
export default { port: PORT, fetch: app.fetch };
