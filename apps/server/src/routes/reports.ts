// ============================================================
// CulinaryOS — Reports Routes
// GET /v1/reports/kds-summary    — avg ticket time, bump rate by station
// GET /v1/reports/sales-summary  — order count + revenue by day
// GET /v1/reports/pantry-usage   — top depleted pantry items
// ============================================================

import { Hono } from 'hono';
import { requireTenant, ok, err } from '../middleware/auth.js';
import type { Env } from '../types.js';

export const reportsRoutes = new Hono<Env>();

reportsRoutes.use('*', requireTenant);

// GET /v1/reports/kds-summary?from=YYYY-MM-DD&to=YYYY-MM-DD
reportsRoutes.get('/kds-summary', async (c) => {
  const supabase = c.get('supabase');
  const tenantId = c.get('tenantId');
  const from     = c.req.query('from') ?? new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const to       = c.req.query('to')   ?? new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('kitchen_tickets')
    .select('station, status, fired_at, bumped_at')
    .eq('tenant_id', tenantId)
    .gte('fired_at', from)
    .lte('fired_at', to + 'T23:59:59Z');

  if (error) return err(c, 'DB_ERROR', error.message, 500);

  // Aggregate by station
  const summary: Record<string, { total: number; bumped: number; avgTimeMs: number }> = {};
  for (const t of data ?? []) {
    const station = t.station || 'unknown';
    if (!summary[station]) {
      summary[station] = { total: 0, bumped: 0, avgTimeMs: 0 };
    }
    const stat = summary[station]!;
    stat.total++;
    if (t.status === 'bumped' && t.bumped_at && t.fired_at) {
      stat.bumped++;
      stat.avgTimeMs +=
        new Date(t.bumped_at).getTime() - new Date(t.fired_at).getTime();
    }
  }
  for (const s of Object.values(summary)) {
    s.avgTimeMs = s.bumped > 0 ? Math.round(s.avgTimeMs / s.bumped) : 0;
  }

  return ok(c, { from, to, stations: summary });
});

// GET /v1/reports/sales-summary?from=YYYY-MM-DD&to=YYYY-MM-DD
reportsRoutes.get('/sales-summary', async (c) => {
  const supabase = c.get('supabase');
  const tenantId = c.get('tenantId');
  const from     = c.req.query('from') ?? new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  const to       = c.req.query('to')   ?? new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('pos_orders')
    .select('id, total_cents, created_at, status')
    .eq('tenant_id', tenantId)
    .neq('status', 'voided')
    .gte('created_at', from)
    .lte('created_at', to + 'T23:59:59Z');

  if (error) return err(c, 'DB_ERROR', error.message, 500);

  const byDay: Record<string, { orders: number; revenueCents: number }> = {};
  for (const o of data ?? []) {
    const day = o.created_at.split('T')[0];
    if (!byDay[day]) byDay[day] = { orders: 0, revenueCents: 0 };
    byDay[day].orders++;
    byDay[day].revenueCents += o.total_cents ?? 0;
  }

  return ok(c, { from, to, byDay });
});

// GET /v1/reports/pantry-usage?days=7
reportsRoutes.get('/pantry-usage', async (c) => {
  const supabase = c.get('supabase');
  const tenantId = c.get('tenantId');

  const { data, error } = await supabase
    .from('pantry_items')
    .select('id, name, quantity, reorder_at, unit')
    .eq('tenant_id', tenantId)
    .order('quantity', { ascending: true })
    .limit(20);

  if (error) return err(c, 'DB_ERROR', error.message, 500);

  const lowStock = (data ?? []).filter((i) => i.quantity <= i.reorder_at);
  return ok(c, { items: data, lowStockCount: lowStock.length, lowStock });
});
