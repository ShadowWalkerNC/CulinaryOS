// ============================================================
// CulinaryOS — KDS Routes
// GET  /v1/kds/tickets          — list active tickets for a station
// GET  /v1/kds/tickets/:id      — get single ticket
// PATCH /v1/kds/tickets/:id/bump — bump a ticket
// PATCH /v1/kds/tickets/:id/fire — fire a held course
// GET  /v1/kds/stations/:id/analytics — station counters
// GET  /v1/kds/pending-push     — reconnect catch-up
// ============================================================

import { Hono } from 'hono';
import { requireTenant, ok, err, escapeHtml } from '../middleware/auth.js';
import { KDS_ACTIVE_STATUSES, resolveDbStations } from '@culinaryos/shared';
import type { Env } from '../types.js';

export const kdsRoutes = new Hono<Env>();

kdsRoutes.use('*', requireTenant);

let mockTickets: any[] = [
  {
    id: "t-101",
    order_id: "o-201",
    table_number: "4",
    station: "grill",
    status: "fired",
    course_number: 1,
    course_hold_status: "fired",
    fired_at: new Date().toISOString(),
    items: [
      { id: "i-1", name: "Truffle Hummus & Pita", quantity: 1, station: "cold" },
      { id: "i-2", name: "Crispy Calamari", quantity: 1, station: "fry" }
    ]
  }
];

// GET /v1/kds/tickets?station=grill|1&status=fired
kdsRoutes.get('/tickets', async (c) => {
  const supabase  = c.get('supabase');
  const tenantId  = c.get('tenantId');
  const station   = c.req.query('station');
  const status    = c.req.query('status');

  if (!supabase) {
    let list = mockTickets;
    if (status) list = list.filter((t: any) => t.status === status);
    else list = list.filter((t: any) => KDS_ACTIVE_STATUSES.includes(t.status));
    if (station && station !== 'all' && station !== 'expo') {
      const allowed = resolveDbStations(station);
      list = list.filter((t: any) => allowed.includes(t.station) ||
        t.items?.some((i: any) => allowed.includes(i.station)));
    }
    return ok(c, list);
  }

  let q = supabase
    .from('kitchen_tickets')
    .select('*, ticket_items(*)')
    .eq('tenant_id', tenantId)
    .order('fired_at', { ascending: true });

  if (status) {
    q = q.eq('status', status);
  } else {
    q = q.in('status', [...KDS_ACTIVE_STATUSES]);
  }

  if (station && station !== 'all' && station !== 'expo') {
    q = q.in('station', resolveDbStations(station));
  }

  const { data, error } = await q;
  if (error) return err(c, 'DB_ERROR', error.message, 500);
  return ok(c, data);
});

// GET /v1/kds/tickets/:id
kdsRoutes.get('/tickets/:id', async (c) => {
  const supabase  = c.get('supabase');
  const tenantId  = c.get('tenantId');
  const { id }    = c.req.param();

  if (!supabase) {
    const ticket = mockTickets.find(t => t.id === id);
    if (!ticket) return err(c, 'NOT_FOUND', `Ticket ${id} not found`, 404);
    return ok(c, ticket);
  }

  const { data, error } = await supabase
    .from('kitchen_tickets')
    .select('*, ticket_items(*)')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single();

  if (error || !data) return err(c, 'NOT_FOUND', `Ticket ${id} not found`, 404);
  return ok(c, data);
});

// PATCH /v1/kds/tickets/:id/bump
kdsRoutes.patch('/tickets/:id/bump', async (c) => {
  const supabase  = c.get('supabase');
  const tenantId  = c.get('tenantId');
  const { id }    = c.req.param();

  if (!supabase) {
    const ticket = mockTickets.find(t => t.id === id);
    if (!ticket) return err(c, 'NOT_FOUND', `Ticket ${id} not found`, 404);
    ticket.status = 'bumped';
    ticket.bumped_at = new Date().toISOString();
    return ok(c, { ticketId: id, status: 'bumped' });
  }

  const { data: ticket, error: ticketErr } = await supabase
    .from('kitchen_tickets')
    .select('id, status')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single();

  if (ticketErr || !ticket) return err(c, 'NOT_FOUND', `Ticket ${id} not found`, 404);

  const now = new Date().toISOString();
  const { error: updateErr } = await supabase
    .from('kitchen_tickets')
    .update({ status: 'bumped', bumped_at: now })
    .eq('id', id)
    .eq('tenant_id', tenantId);

  if (updateErr) return err(c, 'DB_ERROR', updateErr.message, 500);

  return ok(c, { ticketId: id, status: 'bumped', bumpedAt: now });
});

// PATCH /v1/kds/tickets/:id/fire
kdsRoutes.patch('/tickets/:id/fire', async (c) => {
  const supabase  = c.get('supabase');
  const tenantId  = c.get('tenantId');
  const { id }    = c.req.param();

  if (!supabase) {
    const ticket = mockTickets.find(t => t.id === id);
    if (!ticket) return err(c, 'NOT_FOUND', `Ticket ${id} not found`, 404);
    ticket.course_hold_status = 'fired';
    ticket.status = 'fired';
    ticket.fired_at = new Date().toISOString();
    return ok(c, { ticketId: id, status: 'fired' });
  }

  const { data: ticket, error: ticketErr } = await supabase
    .from('kitchen_tickets')
    .select('id, course_hold_status')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single();

  if (ticketErr || !ticket) return err(c, 'NOT_FOUND', `Ticket ${id} not found`, 404);

  const now = new Date().toISOString();
  const { error: updateErr } = await supabase
    .from('kitchen_tickets')
    .update({ course_hold_status: 'fired', status: 'fired', fired_at: now })
    .eq('id', id)
    .eq('tenant_id', tenantId);

  if (updateErr) return err(c, 'DB_ERROR', updateErr.message, 500);

  return ok(c, { ticketId: id, status: 'fired', firedAt: now });
});

// GET /v1/kds/stations/:id/analytics
kdsRoutes.get('/stations/:id/analytics', async (c) => {
  const supabase = c.get('supabase');
  const tenantId = c.get('tenantId');
  const stationId = c.req.param('id');
  const periodMinutes = Number(c.req.query('periodMinutes') ?? 60);

  if (!supabase) {
    const active = mockTickets.filter((t) => KDS_ACTIVE_STATUSES.includes(t.status));
    return ok(c, {
      stationId,
      periodMinutes,
      avgTicketSeconds: 0,
      bumpRate: 0,
      queueDepth: active.length,
      heldCount: mockTickets.filter((t) => t.course_hold_status === 'held').length,
      activeCount: active.length,
      avgCookSeconds: null,
    });
  }

  const since = new Date(Date.now() - periodMinutes * 60_000).toISOString();

  let activeQ = supabase
    .from('kitchen_tickets')
    .select('id, status, course_hold_status, cook_time_seconds, fired_at, bumped_at')
    .eq('tenant_id', tenantId);

  if (stationId !== 'all' && stationId !== 'expo') {
    activeQ = activeQ.in('station', resolveDbStations(stationId));
  }

  const { data: tickets, error } = await activeQ;
  if (error) return err(c, 'DB_ERROR', error.message, 500);

  const rows = tickets ?? [];
  const active = rows.filter((t: any) => KDS_ACTIVE_STATUSES.includes(t.status));
  const heldCount = rows.filter((t: any) => t.course_hold_status === 'held').length;
  const queueDepth = active.filter((t: any) => t.status === 'queued' || t.status === 'fired' || t.status === 'cooking').length;

  const bumpedInPeriod = rows.filter(
    (t: any) => t.status === 'bumped' && t.bumped_at && t.bumped_at >= since
  );
  const cookSamples = bumpedInPeriod
    .map((t: any) => {
      if (typeof t.cook_time_seconds === 'number') return t.cook_time_seconds;
      if (t.fired_at && t.bumped_at) {
        return Math.round((new Date(t.bumped_at).getTime() - new Date(t.fired_at).getTime()) / 1000);
      }
      return null;
    })
    .filter((n: number | null): n is number => typeof n === 'number');

  const avgTicketSeconds =
    cookSamples.length > 0
      ? Math.round(cookSamples.reduce((a, b) => a + b, 0) / cookSamples.length)
      : 0;
  const bumpRate = periodMinutes > 0 ? (bumpedInPeriod.length / periodMinutes) * 60 : 0;

  return ok(c, {
    stationId,
    periodMinutes,
    avgTicketSeconds,
    bumpRate: Math.round(bumpRate * 10) / 10,
    queueDepth,
    heldCount,
    activeCount: active.length,
    avgCookSeconds: avgTicketSeconds || null,
  });
});

// GET /v1/kds/pending-push?since=<uuid-or-iso>
kdsRoutes.get('/pending-push', async (c) => {
  const supabase = c.get('supabase');
  const tenantId = c.get('tenantId');
  const since = c.req.query('since');
  const station = c.req.query('station');

  if (!supabase) return ok(c, []);

  let q = supabase
    .from('pending_push')
    .select('*')
    .eq('tenant_id', tenantId)
    .is('delivered_at', null)
    .order('created_at', { ascending: true })
    .limit(200);

  if (since) {
    // Accept ISO timestamp or uuid id
    if (since.includes('-') && since.length > 20 && !since.includes('T')) {
      q = q.gt('id', since);
    } else {
      q = q.gt('created_at', since);
    }
  }
  if (station && station !== 'all' && station !== 'expo') {
    q = q.in('station_id', resolveDbStations(station));
  }

  const { data, error } = await q;
  if (error) {
    if (error.message.includes('pending_push')) return ok(c, []);
    return err(c, 'DB_ERROR', error.message, 500);
  }
  return ok(c, data ?? []);
});

// POST /v1/kds/pending-push/ack — mark delivered
kdsRoutes.post('/pending-push/ack', async (c) => {
  const supabase = c.get('supabase');
  const tenantId = c.get('tenantId');
  const body = await c.req.json<{ ids?: string[] }>().catch(() => ({ ids: [] as string[] }));
  const ids = Array.isArray(body.ids) ? body.ids : [];

  if (ids.length === 0) return ok(c, { acknowledged: 0 });
  if (!supabase) return ok(c, { acknowledged: ids.length });

  const { error } = await supabase
    .from('pending_push')
    .update({ delivered_at: new Date().toISOString() })
    .eq('tenant_id', tenantId)
    .in('id', ids);

  if (error) return err(c, 'DB_ERROR', error.message, 500);
  return ok(c, { acknowledged: ids.length });
});

// GET /v1/kds/htmx-cards (Zero-JS HTMX Kiosk Endpoint)
kdsRoutes.get('/htmx-cards', async (c) => {
  const list = mockTickets;
  const html = list.map(t => `
    <div class="kds-card border border-gray-300 rounded-xl p-4 bg-white shadow-sm mb-3 font-mono">
      <div class="flex justify-between font-bold border-b pb-2">
        <span>TICKET #${escapeHtml(t.id)} (T-${escapeHtml(t.table_number)})</span>
        <span class="text-green-600 uppercase">${escapeHtml(t.status)}</span>
      </div>
      <div class="py-2 space-y-1 text-xs">
        ${t.items.map((i: any) => `<div>${escapeHtml(i.quantity)}x ${escapeHtml(i.name)} [${escapeHtml(i.station)}]</div>`).join('')}
      </div>
      <button hx-patch="/v1/kds/tickets/${escapeHtml(t.id)}/bump" hx-target="closest .kds-card" hx-swap="outerHTML"
        class="w-full bg-green-500 text-white py-2 rounded font-bold text-xs uppercase mt-2">
        BUMP TICKET
      </button>
    </div>
  `).join('');

  return c.html(html);
});

export default kdsRoutes;
