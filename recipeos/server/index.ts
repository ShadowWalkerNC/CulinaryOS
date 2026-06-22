// ============================================================
// RecipeOS API Server — Hono on Bun
// Base URL: http://localhost:3001
// ============================================================

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { requireApiKey, requireTenant } from '../../backend/middleware/auth';
import { withSupabase } from '../../backend/middleware/supabase';
import { pantryRoutes }  from './routes/pantry';
import { ingredientRoutes } from './routes/ingredients';

const app = new Hono();

app.use('*', logger());
app.use('*', cors({
  origin: (o) => o,
  allowHeaders: ['Content-Type', 'Authorization', 'X-Tenant-Id', 'X-Caller-Service', 'X-Request-Id'],
  allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
}));

app.use('/v1/*', requireApiKey, requireTenant, withSupabase);

app.route('/v1/pantry',      pantryRoutes);
app.route('/v1/ingredients', ingredientRoutes);

app.get('/health', (c) => c.json({
  service: 'recipeos',
  status: 'healthy',
  version: '1.0.0',
  uptime: Math.floor(process.uptime()),
  checkedAt: new Date().toISOString(),
}));

const PORT = parseInt(process.env.PORT ?? '3001', 10);
console.log(`RecipeOS server running on :${PORT}`);
export default { port: PORT, fetch: app.fetch };
