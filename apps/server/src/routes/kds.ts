// ============================================================
// CulinaryOS — KDS Routes
// GET  /v1/kds/tickets          — list active tickets for a station
// GET  /v1/kds/tickets/:id      — get single ticket
// PATCH /v1/kds/tickets/:id/bump — bump a ticket
// PATCH /v1/kds/tickets/:id/fire — fire a held course
// ============================================================

import { Hono } from 'hono';
import { requireTenant, ok, err } from '../middleware/auth.js';
import type { Env } from '../types.js';

export const kdsRoutes = new Hono<Env>();

kdsRoutes.use('*', requireTenant);

// GET /v1/kds/tickets?station=hot&status=fired
kdsRoutes.get('/tickets', async (c) => {
  const supabase  = c.get('supabase');
  const tenantId  = c.get('tenantId');
  const station   = c.req.query('station');
  const status    = c.req.query('status') ?? 'fired';

  let q = supabase
    .from('kitchen_tickets')
    .select('*, ticket_items(*)')
    .eq('tenant_id', tenantId)
    .eq('status', status)
    .order('fired_at', { ascending: true });

  if (station) q = q.eq('station', station);

  const { data, error } = await q;
  if (error) return err(c, 'DB_ERROR', error.message, 500);
  return ok(c, data);
});

// GET /v1/kds/tickets/:id
kdsRoutes.get('/tickets/:id', async (c) => {
  const supabase = c.get('supabase');
  const tenantId = c.get('tenantId');
  const { id }   = c.req.param();

  const { data, error } = await supabase
    .from('kitchen_tickets')
    .select('*, ticket_items(*)')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single();

  if (error) return err(c, 'NOT_FOUND', 'Ticket not found', 404);
  return ok(c, data);
});

// PATCH /v1/kds/tickets/:id/bump
kdsRoutes.patch('/tickets/:id/bump', async (c) => {
  const supabase  = c.get('supabase');
  const tenantId  = c.get('tenantId');
  const requestId = c.get('requestId');
  const { id }    = c.req.param();
  const body      = await c.req.json().catch(() => ({}));

  const { error } = await supabase
    .from('kitchen_tickets')
    .update({
      status:    'bumped',
      bumped_at: new Date().toISOString(),
      bumped_by: body.bumpedBy ?? 'unknown',
    })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .neq('status', 'voided');

  if (error) return err(c, 'DB_ERROR', error.message, 500);

  // Fire domain event
  const { data: ticket } = await supabase
    .from('kitchen_tickets')
    .select('order_id')
    .eq('id', id)
    .single();

  if (ticket) {
    await fetch(`${c.req.url.split('/v1')[0]}/internal/events`, {
      method:  'POST',
      headers: {
        'Content-Type':     'application/json',
        'Authorization':    `Bearer ${process.env.INTERNAL_API_KEY ?? ''}`,
        'X-Tenant-Id':      tenantId,
        'X-Caller-Service': 'kds',
        'X-Request-Id':     requestId,
      },
      body: JSON.stringify({
        eventId:   crypto.randomUUID(),
        eventType: 'kds:ticket:bumped',
        tenantId,
        source:    'kds',
        timestamp: new Date().toISOString(),
        version:   1,
        payload:   { ticketId: id, orderId: ticket.order_id, bumpedBy: body.bumpedBy ?? 'unknown', bumpedAt: new Date().toISOString() },
      }),
    }).catch(() => null);
  }

  return ok(c, { ticketId: id, status: 'bumped' });
});

// PATCH /v1/kds/tickets/:id/fire
kdsRoutes.patch('/tickets/:id/fire', async (c) => {
  const supabase = c.get('supabase');
  const tenantId = c.get('tenantId');
  const { id }   = c.req.param();

  const { error } = await supabase
    .from('kitchen_tickets')
    .update({ status: 'fired', fired_at: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .eq('status', 'queued');

  if (error) return err(c, 'DB_ERROR', error.message, 500);
  return ok(c, { ticketId: id, status: 'fired' });
});

// GET /v1/kds/stations/:stationId/analytics
kdsRoutes.get('/stations/:stationId/analytics', async (c) => {
  const supabase   = c.get('supabase');
  const tenantId   = c.get('tenantId');
  const stationId = c.req.param('stationId');
  const periodMin = Number(c.req.query('period') ?? '30');
  const since     = new Date(Date.now() - periodMin * 60_000).toISOString();

  // Avg ticket time (bumped tickets in period)
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
        bumpedRows.reduce((sum: number, r: any) => {
          const fired  = new Date(r.fired_at!).getTime();
          const bumped = new Date(r.bumped_at!).getTime();
          return sum + (bumped - fired) / 1000;
        }, 0) / totalBumps
      )
    : 0;

  // Bumps per hour (extrapolated)
  const bumpRate = parseFloat(((totalBumps / periodMin) * 60).toFixed(1));

  // Current queue depth
  const { count: queueDepth } = await supabase
    .from('kitchen_tickets')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('station_id', stationId)
    .in('status', ['queued', 'cooking', 'ready']);

  // Held count (waiting for course advance)
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
