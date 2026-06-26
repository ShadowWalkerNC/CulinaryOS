import { Hono }         from 'hono';
import type { Context } from 'hono';
import { createClient } from '@supabase/supabase-js';

const analytics = new Hono();

/**
 * GET /v1/kds/stations/:stationId/analytics
 *
 * Returns a 30-minute analytics window for a KDS station:
 *   - avgTicketSeconds : mean seconds from fired_at to bumped_at
 *   - bumpRate         : bumps per hour (extrapolated from 30m window)
 *   - queueDepth       : current queued/cooking/ready ticket count
 *   - heldCount        : tickets currently held (waiting for course fire)
 */
analytics.get('/stations/:stationId/analytics', async (c: Context) => {
  const supabase   = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const tenantId  = c.get('tenantId') as string;
  const stationId = c.req.param('stationId');
  const periodMin = Number(c.req.query('period') ?? '30');
  const since     = new Date(Date.now() - periodMin * 60_000).toISOString();

  // ── Avg ticket time (bumped tickets in period) ──────────────────────────
  const { data: bumped } = await supabase
    .from('kitchen_tickets')
    .select('fired_at, bumped_at')
    .eq('tenant_id', tenantId)
    .eq('station_id', stationId)
    .eq('status', 'bumped')
    .gte('bumped_at', since)
    .not('fired_at', 'is', null)
    .not('bumped_at', 'is', null);

  const bumpedRows   = bumped ?? [];
  const totalBumps   = bumpedRows.length;
  const avgSecs      = totalBumps > 0
    ? Math.round(
        bumpedRows.reduce((sum, r) => {
          const fired  = new Date(r.fired_at!).getTime();
          const bumped = new Date(r.bumped_at!).getTime();
          return sum + (bumped - fired) / 1000;
        }, 0) / totalBumps
      )
    : 0;

  // Bumps per hour (extrapolated)
  const bumpRate = parseFloat(((totalBumps / periodMin) * 60).toFixed(1));

  // ── Current queue depth ─────────────────────────────────────────────────
  const { count: queueDepth } = await supabase
    .from('kitchen_tickets')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('station_id', stationId)
    .in('status', ['queued', 'cooking', 'ready']);

  // ── Held count (waiting for course advance) ─────────────────────────────
  const { count: heldCount } = await supabase
    .from('kitchen_tickets')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('station_id', stationId)
    .eq('course_hold_status', 'held');

  return c.json({
    ok: true,
    data: {
      stationId,
      periodMinutes:    periodMin,
      avgTicketSeconds: avgSecs,
      bumpRate,
      queueDepth:       queueDepth ?? 0,
      heldCount:        heldCount  ?? 0,
    },
  });
});

export { analytics as analyticsRoutes };
