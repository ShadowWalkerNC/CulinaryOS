// ============================================================
// CulinaryOS — Reports Routes
// ============================================================

import { Hono } from 'hono';
import { requireTenant, ok, err } from '../middleware/auth.js';
import type { Env } from '../types.js';

export const reportsRoutes = new Hono<Env>();

reportsRoutes.use('*', requireTenant);

async function salesSummary(c: any) {
  const supabase = c.get('supabase');
  const tenantId = c.get('tenantId');
  const from     = c.req.query('from') ?? c.req.query('date') ?? new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  const to       = c.req.query('to')   ?? c.req.query('date') ?? new Date().toISOString().split('T')[0];

  if (!supabase) {
    return ok(c, { from, to, byDay: {}, orders: 0, revenueCents: 0 });
  }

  const { data, error } = await supabase
    .from('pos_orders')
    .select('id, total, total_cents, created_at, status')
    .eq('tenant_id', tenantId)
    .neq('status', 'voided')
    .gte('created_at', from)
    .lte('created_at', to + 'T23:59:59Z');

  if (error) return err(c, 'DB_ERROR', error.message, 500);

  const byDay: Record<string, { orders: number; revenueCents: number }> = {};
  let orders = 0;
  let revenueCents = 0;
  for (const o of data ?? []) {
    const day = o.created_at.split('T')[0];
    if (!byDay[day]) byDay[day] = { orders: 0, revenueCents: 0 };
    const cents = o.total_cents ?? o.total ?? 0;
    byDay[day].orders++;
    byDay[day].revenueCents += cents;
    orders++;
    revenueCents += cents;
  }

  return ok(c, { from, to, byDay, orders, revenueCents });
}

// GET /v1/reports/kds-summary
reportsRoutes.get('/kds-summary', async (c) => {
  const supabase = c.get('supabase');
  const tenantId = c.get('tenantId');
  const from     = c.req.query('from') ?? new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const to       = c.req.query('to')   ?? new Date().toISOString().split('T')[0];

  if (!supabase) return ok(c, { from, to, stations: {} });

  const { data, error } = await supabase
    .from('kitchen_tickets')
    .select('station, status, fired_at, bumped_at')
    .eq('tenant_id', tenantId)
    .gte('fired_at', from)
    .lte('fired_at', to + 'T23:59:59Z');

  if (error) return err(c, 'DB_ERROR', error.message, 500);

  const summary: Record<string, { total: number; bumped: number; avgTimeMs: number }> = {};
  for (const t of data ?? []) {
    const station = t.station || 'unknown';
    if (!summary[station]) summary[station] = { total: 0, bumped: 0, avgTimeMs: 0 };
    const stat = summary[station]!;
    stat.total++;
    if (t.status === 'bumped' && t.bumped_at && t.fired_at) {
      stat.bumped++;
      stat.avgTimeMs += new Date(t.bumped_at).getTime() - new Date(t.fired_at).getTime();
    }
  }
  for (const s of Object.values(summary)) {
    s.avgTimeMs = s.bumped > 0 ? Math.round(s.avgTimeMs / s.bumped) : 0;
  }

  return ok(c, { from, to, stations: summary });
});

reportsRoutes.get('/sales-summary', salesSummary);
reportsRoutes.get('/sales', salesSummary); // MCP / alias

// GET /v1/reports/pantry-usage
reportsRoutes.get('/pantry-usage', async (c) => {
  const supabase = c.get('supabase');
  const tenantId = c.get('tenantId');

  if (!supabase) return ok(c, { items: [], lowStockCount: 0, lowStock: [] });

  const { data, error } = await supabase
    .from('pantry_status')
    .select('id, name, current_qty, reorder_at, unit, stock_status')
    .eq('tenant_id', tenantId)
    .order('current_qty', { ascending: true })
    .limit(20);

  if (error) {
    const { data: items, error: e2 } = await supabase
      .from('ingredients')
      .select('id, name, current_qty, reorder_at, unit')
      .eq('tenant_id', tenantId)
      .order('current_qty', { ascending: true })
      .limit(20);
    if (e2) return err(c, 'DB_ERROR', e2.message, 500);
    const mapped = (items ?? []).map((i: any) => ({
      ...i,
      quantity: i.current_qty,
      stock_status:
        i.current_qty <= 0 ? 'out_of_stock' : i.current_qty <= i.reorder_at ? 'low_stock' : 'ok',
    }));
    const lowStock = mapped.filter((i) => i.stock_status !== 'ok');
    return ok(c, { items: mapped, lowStockCount: lowStock.length, lowStock });
  }

  const lowStock = (data ?? []).filter((i: any) => i.stock_status !== 'ok');
  return ok(c, {
    items: (data ?? []).map((i: any) => ({ ...i, quantity: i.current_qty })),
    lowStockCount: lowStock.length,
    lowStock,
  });
});

// GET /v1/reports/eod — end of day rollup
reportsRoutes.get('/eod', async (c) => {
  const date = (c.req.query('date') ?? new Date().toISOString().split('T')[0]) as string;
  const supabase = c.get('supabase');
  const tenantId = c.get('tenantId');

  if (!supabase) {
    return ok(c, { date, orders: 0, revenueCents: 0, byDay: { [date]: { orders: 0, revenueCents: 0 } } });
  }

  const { data, error } = await supabase
    .from('pos_orders')
    .select('id, total, total_cents, created_at, status')
    .eq('tenant_id', tenantId)
    .neq('status', 'voided')
    .gte('created_at', date)
    .lte('created_at', date + 'T23:59:59Z');

  if (error) return err(c, 'DB_ERROR', error.message, 500);

  let orders = 0;
  let revenueCents = 0;
  for (const o of data ?? []) {
    orders++;
    revenueCents += o.total_cents ?? o.total ?? 0;
  }

  return ok(c, {
    date,
    orders,
    revenueCents,
    byDay: { [date]: { orders, revenueCents } },
  });
});

// GET /v1/reports/range
reportsRoutes.get('/range', async (c) => salesSummary(c));

export default reportsRoutes;
