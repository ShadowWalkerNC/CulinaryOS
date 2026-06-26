import { Hono }         from 'hono';
import type { Context } from 'hono';
import { createClient } from '@supabase/supabase-js';

const reports = new Hono();

function db() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ── Helpers ───────────────────────────────────────────────────────────
function startOfDay(date: string): string {
  return `${date}T00:00:00.000Z`;
}
function endOfDay(date: string): string {
  return `${date}T23:59:59.999Z`;
}
function cents(n: number): string {
  return `$${(n / 100).toFixed(2)}`;
}

// ============================================================
// GET /v1/reports/eod
// End-of-day revenue summary.
// Query params:
//   date  : YYYY-MM-DD  (defaults to today UTC)
//   tz    : timezone offset label for display only (default "UTC")
// ============================================================
reports.get('/eod', async (c: Context) => {
  const tenantId = c.get('tenantId') as string;
  const date     = c.req.query('date') ?? new Date().toISOString().slice(0, 10);
  const tz       = c.req.query('tz')   ?? 'UTC';
  const since    = startOfDay(date);
  const until    = endOfDay(date);
  const supabase = db();

  // ── 1. All closed orders for the day ──────────────────────────────────
  const { data: orders, error: ordersErr } = await supabase
    .from('pos_orders')
    .select('id, status, total_cents, covers, closed_at, void_reason')
    .eq('tenant_id', tenantId)
    .gte('closed_at', since)
    .lte('closed_at', until)
    .not('closed_at', 'is', null);

  if (ordersErr) return c.json({ ok: false, error: ordersErr.message }, 500);

  const allOrders   = orders ?? [];
  const closedOrders = allOrders.filter((o) => o.status === 'closed');
  const voidedOrders = allOrders.filter((o) => o.status === 'voided');

  // ── 2. Revenue totals ───────────────────────────────────────────────
  const grossRevenue = closedOrders.reduce((s, o) => s + (o.total_cents ?? 0), 0);
  const voidTotal    = voidedOrders.reduce((s, o) => s + (o.total_cents ?? 0), 0);
  const totalCovers  = closedOrders.reduce((s, o) => s + (o.covers      ?? 1), 0);
  const avgCheck     = closedOrders.length > 0
    ? Math.round(grossRevenue / closedOrders.length)
    : 0;
  const revenuePerCover = totalCovers > 0
    ? Math.round(grossRevenue / totalCovers)
    : 0;

  // ── 3. Void breakdown by reason ───────────────────────────────────────
  const voidsByReason: Record<string, { count: number; total_cents: number }> = {};
  for (const o of voidedOrders) {
    const key = o.void_reason ?? 'unspecified';
    if (!voidsByReason[key]) voidsByReason[key] = { count: 0, total_cents: 0 };
    voidsByReason[key].count++;
    voidsByReason[key].total_cents += o.total_cents ?? 0;
  }

  // ── 4. Hourly revenue breakdown ──────────────────────────────────────
  const hourlyMap: Record<number, { order_count: number; revenue_cents: number; covers: number }> = {};
  for (let h = 0; h < 24; h++) hourlyMap[h] = { order_count: 0, revenue_cents: 0, covers: 0 };

  for (const o of closedOrders) {
    const hour = new Date(o.closed_at).getUTCHours();
    hourlyMap[hour].order_count++;
    hourlyMap[hour].revenue_cents += o.total_cents ?? 0;
    hourlyMap[hour].covers        += o.covers      ?? 1;
  }

  const hourlyBreakdown = Object.entries(hourlyMap)
    .filter(([, v]) => v.order_count > 0)
    .map(([hour, v]) => ({
      hour:          Number(hour),
      label:         `${String(Number(hour)).padStart(2, '0')}:00`,
      order_count:   v.order_count,
      revenue_cents: v.revenue_cents,
      revenue_fmt:   cents(v.revenue_cents),
      covers:        v.covers,
    }));

  // ── 5. Top menu items by quantity sold ────────────────────────────────
  const orderIds = closedOrders.map((o) => o.id);
  let topItems: Array<{ name: string; qty: number; revenue_cents: number }> = [];

  if (orderIds.length > 0) {
    const { data: lineItems } = await supabase
      .from('pos_order_line_items')
      .select('menu_item_name, quantity, unit_price_cents')
      .in('order_id', orderIds);

    const itemMap: Record<string, { qty: number; revenue_cents: number }> = {};
    for (const li of lineItems ?? []) {
      const key = li.menu_item_name ?? 'Unknown';
      if (!itemMap[key]) itemMap[key] = { qty: 0, revenue_cents: 0 };
      itemMap[key].qty            += li.quantity ?? 1;
      itemMap[key].revenue_cents  += (li.quantity ?? 1) * (li.unit_price_cents ?? 0);
    }

    topItems = Object.entries(itemMap)
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10);
  }

  // ── 6. Pantry depletion summary ───────────────────────────────────────
  const { data: ledger } = await supabase
    .from('pantry_ledger')
    .select('ingredient_id, delta, ingredients(name, unit)')
    .eq('tenant_id', tenantId)
    .lt('delta', 0)   // only deductions
    .gte('created_at', since)
    .lte('created_at', until);

  const depletionMap: Record<string, { name: string; unit: string; total_deducted: number }> = {};
  for (const entry of ledger ?? []) {
    const id   = entry.ingredient_id;
    const name = (entry.ingredients as any)?.name ?? id;
    const unit = (entry.ingredients as any)?.unit ?? '';
    if (!depletionMap[id]) depletionMap[id] = { name, unit, total_deducted: 0 };
    depletionMap[id].total_deducted += Math.abs(entry.delta);
  }

  const depletionSummary = Object.values(depletionMap)
    .sort((a, b) => b.total_deducted - a.total_deducted)
    .slice(0, 10);

  // ── Response ─────────────────────────────────────────────────────────
  return c.json({
    ok:   true,
    data: {
      date,
      timezone: tz,
      summary: {
        gross_revenue_cents:  grossRevenue,
        gross_revenue_fmt:    cents(grossRevenue),
        void_total_cents:     voidTotal,
        void_total_fmt:       cents(voidTotal),
        net_revenue_cents:    grossRevenue - voidTotal,
        net_revenue_fmt:      cents(grossRevenue - voidTotal),
        closed_order_count:   closedOrders.length,
        voided_order_count:   voidedOrders.length,
        total_covers:         totalCovers,
        avg_check_cents:      avgCheck,
        avg_check_fmt:        cents(avgCheck),
        revenue_per_cover_cents: revenuePerCover,
        revenue_per_cover_fmt:   cents(revenuePerCover),
      },
      voids_by_reason:   voidsByReason,
      hourly_breakdown:  hourlyBreakdown,
      top_items:         topItems,
      depletion_summary: depletionSummary,
    },
  });
});

// ============================================================
// GET /v1/reports/range
// Revenue summary across a date range (for weekly/monthly views).
// Query params: from=YYYY-MM-DD, to=YYYY-MM-DD
// ============================================================
reports.get('/range', async (c: Context) => {
  const tenantId = c.get('tenantId') as string;
  const from     = c.req.query('from') ?? new Date().toISOString().slice(0, 10);
  const to       = c.req.query('to')   ?? from;
  const supabase = db();

  const { data: orders, error } = await supabase
    .from('pos_orders')
    .select('id, status, total_cents, covers, closed_at')
    .eq('tenant_id', tenantId)
    .eq('status', 'closed')
    .gte('closed_at', startOfDay(from))
    .lte('closed_at', endOfDay(to));

  if (error) return c.json({ ok: false, error: error.message }, 500);

  // Group by date
  const byDate: Record<string, { revenue_cents: number; order_count: number; covers: number }> = {};
  for (const o of orders ?? []) {
    const day = o.closed_at.slice(0, 10);
    if (!byDate[day]) byDate[day] = { revenue_cents: 0, order_count: 0, covers: 0 };
    byDate[day].revenue_cents += o.total_cents ?? 0;
    byDate[day].order_count++;
    byDate[day].covers += o.covers ?? 1;
  }

  const days = Object.entries(byDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({
      date,
      revenue_cents: v.revenue_cents,
      revenue_fmt:   cents(v.revenue_cents),
      order_count:   v.order_count,
      covers:        v.covers,
      avg_check_fmt: cents(v.order_count > 0 ? Math.round(v.revenue_cents / v.order_count) : 0),
    }));

  const totalRevenue = days.reduce((s, d) => s + d.revenue_cents, 0);
  const totalOrders  = days.reduce((s, d) => s + d.order_count,  0);
  const totalCovers  = days.reduce((s, d) => s + d.covers,       0);

  return c.json({
    ok:   true,
    data: {
      from,
      to,
      total_revenue_fmt: cents(totalRevenue),
      total_orders:      totalOrders,
      total_covers:      totalCovers,
      days,
    },
  });
});

export { reports as reportsRoutes };
