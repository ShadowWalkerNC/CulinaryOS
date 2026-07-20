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

// Local KDS Mock State
let mockTickets: any[] = [
  {
    id: "t-101",
    order_id: "o-201",
    table_number: "4",
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

// GET /v1/kds/tickets?station=hot&status=fired
kdsRoutes.get('/tickets', async (c) => {
  const supabase  = c.get('supabase');
  const tenantId  = c.get('tenantId');
  const station   = c.req.query('station');
  const status    = c.req.query('status') ?? 'fired';

  if (!supabase) {
    let list = mockTickets;
    if (status) list = list.filter((t: any) => t.status === status);
    if (station) {
      list = list.filter((t: any) => t.items.some((i: any) => i.station === station));
    }
    return ok(c, list);
  }

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
  await supabase
    .from('kitchen_tickets')
    .update({ status: 'bumped', bumped_at: now })
    .eq('id', id);

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
  await supabase
    .from('kitchen_tickets')
    .update({ course_hold_status: 'fired', status: 'fired', fired_at: now })
    .eq('id', id);

  return ok(c, { ticketId: id, status: 'fired', firedAt: now });
});

export default kdsRoutes;
