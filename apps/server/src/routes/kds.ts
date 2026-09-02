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
import {
  bumpMockTicket,
  fireMockTicket,
  getMockTickets,
  getMock86Items,
  setMock86Count,
  toggleMock86,
  holdMockTicket,
} from '../lib/mock-kitchen.js';
import type { Env } from '../types.js';

export const kdsRoutes = new Hono<Env>();

kdsRoutes.use('*', requireTenant);

// GET /v1/kds/tickets?station=grill|1&status=fired
kdsRoutes.get('/tickets', async (c) => {
  const supabase  = c.get('supabase');
  const tenantId  = c.get('tenantId');
  const station   = c.req.query('station');
  const status    = c.req.query('status');

  if (!supabase) {
    let list = getMockTickets().filter((t) => t.tenant_id === tenantId || !t.tenant_id);
    if (status) list = list.filter((t) => t.status === status);
    else list = list.filter((t) => (KDS_ACTIVE_STATUSES as readonly string[]).includes(t.status));
    if (station && station !== 'all' && station !== 'expo') {
      const allowed = resolveDbStations(station);
      list = list.filter((t) => allowed.includes(t.station) ||
        t.items?.some((i) => i.station != null && allowed.includes(i.station)));
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
    const ticket = getMockTickets().find(t => t.id === id);
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
    const ticket = bumpMockTicket(id);
    if (!ticket) return err(c, 'NOT_FOUND', `Ticket ${id} not found`, 404);
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
    const ticket = fireMockTicket(id);
    if (!ticket) return err(c, 'NOT_FOUND', `Ticket ${id} not found`, 404);
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

// PATCH /v1/kds/tickets/:id/hold
kdsRoutes.patch('/tickets/:id/hold', async (c) => {
  const supabase = c.get('supabase');
  const tenantId = c.get('tenantId');
  const { id } = c.req.param();

  if (!supabase) {
    const ticket = holdMockTicket(id);
    if (!ticket) return err(c, 'NOT_FOUND', `Ticket ${id} not found`, 404);
    return ok(c, { ticketId: id, status: 'queued', courseHoldStatus: 'held' });
  }

  const { data: ticket, error: ticketErr } = await supabase
    .from('kitchen_tickets')
    .select('id, course_hold_status')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single();

  if (ticketErr || !ticket) return err(c, 'NOT_FOUND', `Ticket ${id} not found`, 404);

  const { error: updateErr } = await supabase
    .from('kitchen_tickets')
    .update({ course_hold_status: 'held', status: 'queued' })
    .eq('id', id)
    .eq('tenant_id', tenantId);

  if (updateErr) return err(c, 'DB_ERROR', updateErr.message, 500);

  return ok(c, { ticketId: id, status: 'queued', courseHoldStatus: 'held' });
});

// PATCH /v1/kds/tickets/:id/fire-course (fires all course tickets for an order)
kdsRoutes.patch('/tickets/:id/fire-course', async (c) => {
  const supabase = c.get('supabase');
  const tenantId = c.get('tenantId');
  const { id } = c.req.param();
  const body = await c.req.json().catch(() => ({}));
  const courseNumber = Number(body.courseNumber || 2);

  if (!supabase) {
    const tickets = getMockTickets().filter(
      (t) => (t.id === id || t.order_id === id) && t.course_number === courseNumber
    );
    for (const t of tickets) {
      t.course_hold_status = 'fired';
      t.status = 'fired';
      t.fired_at = new Date().toISOString();
    }
    return ok(c, { firedCount: tickets.length, courseNumber });
  }

  const now = new Date().toISOString();
  const { data: updated, error } = await supabase
    .from('kitchen_tickets')
    .update({ course_hold_status: 'fired', status: 'fired', fired_at: now })
    .eq('tenant_id', tenantId)
    .eq('order_id', id)
    .eq('course_number', courseNumber)
    .select('id');

  if (error) return err(c, 'DB_ERROR', error.message, 500);
  return ok(c, { firedCount: updated?.length ?? 0, courseNumber });
});

// GET /v1/kds/86-items (Live 86 Inventory items & countdowns)
kdsRoutes.get('/86-items', async (c) => {
  const supabase = c.get('supabase');
  const tenantId = c.get('tenantId');

  if (!supabase) {
    return ok(c, getMock86Items());
  }

  const { data, error } = await supabase
    .from('menu_items')
    .select('id, name, count_remaining, status, is_available, category, station')
    .eq('tenant_id', tenantId)
    .or('status.eq.86d,count_remaining.not.is.null,is_available.eq.false');

  if (error) {
    // Return mock fallback if column not yet migrated
    return ok(c, getMock86Items());
  }

  const items = (data || []).map((m: any) => ({
    id: m.id,
    name: m.name,
    countRemaining: m.count_remaining ?? null,
    is86: m.status === '86d' || m.is_available === false || (m.count_remaining != null && m.count_remaining <= 0),
    station: m.station,
  }));

  return ok(c, items);
});

// POST /v1/kds/86-items/:id/set-count (Sets active portion countdown)
kdsRoutes.post('/86-items/:id/set-count', async (c) => {
  const supabase = c.get('supabase');
  const tenantId = c.get('tenantId');
  const { id } = c.req.param();
  const body = await c.req.json<{ count: number }>().catch(() => ({ count: 0 }));
  const count = Math.max(0, Number(body.count) || 0);

  if (!supabase) {
    const item = setMock86Count(id, count);
    return ok(c, item);
  }

  const is86 = count <= 0;
  const { data, error } = await supabase
    .from('menu_items')
    .update({
      count_remaining: count,
      status: is86 ? '86d' : 'available',
      is_available: !is86,
    })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single();

  if (error) {
    const item = setMock86Count(id, count);
    return ok(c, item);
  }

  return ok(c, {
    id: data.id,
    name: data.name,
    countRemaining: data.count_remaining,
    is86: data.status === '86d' || !data.is_available,
  });
});

// POST /v1/kds/86-items/:id/toggle-86 (Toggles 86 lock)
kdsRoutes.post('/86-items/:id/toggle-86', async (c) => {
  const supabase = c.get('supabase');
  const tenantId = c.get('tenantId');
  const { id } = c.req.param();

  if (!supabase) {
    const item = toggleMock86(id);
    return ok(c, item);
  }

  const { data: existing } = await supabase
    .from('menu_items')
    .select('id, status, is_available')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single();

  const isCurrently86 = existing?.status === '86d' || existing?.is_available === false;
  const newStatus = isCurrently86 ? 'available' : '86d';
  const newAvailable = isCurrently86;

  const { data, error } = await supabase
    .from('menu_items')
    .update({
      status: newStatus,
      is_available: newAvailable,
      count_remaining: isCurrently86 ? 10 : 0,
    })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single();

  if (error) {
    const item = toggleMock86(id);
    return ok(c, item);
  }

  return ok(c, {
    id: data.id,
    name: data.name,
    countRemaining: data.count_remaining,
    is86: data.status === '86d' || !data.is_available,
  });
});

// GET /v1/kds/pacing (Course hold/fire pacing tracking & alerts)
kdsRoutes.get('/pacing', async (c) => {
  const supabase = c.get('supabase');
  const tenantId = c.get('tenantId');

  const tickets = supabase
    ? (await supabase.from('kitchen_tickets').select('*, ticket_items(*)').eq('tenant_id', tenantId)).data || []
    : getMockTickets();

  const now = Date.now();
  const pacingOrders: any[] = [];
  const orderGroups = new Map<string, any[]>();

  for (const t of tickets) {
    const key = t.order_id || t.id;
    if (!orderGroups.has(key)) orderGroups.set(key, []);
    orderGroups.get(key)!.push(t);
  }

  for (const [orderId, orderTickets] of orderGroups.entries()) {
    const c1 = orderTickets.find((t) => t.course_number === 1);
    const c2 = orderTickets.find((t) => t.course_number === 2);
    const c3 = orderTickets.find((t) => t.course_number === 3);

    const c1FiredAt = c1?.fired_at ? new Date(c1.fired_at).getTime() : null;
    const c1ElapsedSeconds = c1FiredAt ? Math.round((now - c1FiredAt) / 1000) : 0;

    // Standard pacing: Course 2 should be fired 12-15 minutes (720-900s) after Course 1
    const targetC2FireSeconds = 720;
    const remainingToC2Seconds = Math.max(0, targetC2FireSeconds - c1ElapsedSeconds);

    let pacingAlert: 'normal' | 'warning' | 'urgent' = 'normal';
    if (c2 && c2.course_hold_status === 'held') {
      if (c1ElapsedSeconds >= 900) pacingAlert = 'urgent'; // 15+ mins
      else if (c1ElapsedSeconds >= 720) pacingAlert = 'warning'; // 12-15 mins
    }

    pacingOrders.push({
      orderId,
      tableNumber: c1?.table_number ?? null,
      c1Status: c1?.status ?? 'none',
      c1ElapsedSeconds,
      c2Status: c2?.course_hold_status ?? (c2?.status || 'none'),
      c2TicketId: c2?.id ?? null,
      c3Status: c3?.course_hold_status ?? (c3?.status || 'none'),
      c3TicketId: c3?.id ?? null,
      targetC2FireSeconds,
      remainingToC2Seconds,
      pacingAlert,
    });
  }

  return ok(c, pacingOrders);
});

// GET /v1/kds/stations/:id/analytics
kdsRoutes.get('/stations/:id/analytics', async (c) => {
  const supabase = c.get('supabase');
  const tenantId = c.get('tenantId');
  const stationId = c.req.param('id');
  const periodMinutes = Number(c.req.query('periodMinutes') ?? 60);

  if (!supabase) {
    const all = getMockTickets();
    const active = all.filter((t) => (KDS_ACTIVE_STATUSES as readonly string[]).includes(t.status));
    return ok(c, {
      stationId,
      periodMinutes,
      avgTicketSeconds: 0,
      bumpRate: 0,
      queueDepth: active.length,
      heldCount: all.filter((t) => t.course_hold_status === 'held').length,
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
  const list = getMockTickets();
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
