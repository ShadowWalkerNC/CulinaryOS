// ============================================================
// KDS — /v1/tickets routes  (with course firing)
//
// POST   /v1/tickets/fire           fire order → kitchen, hold course N>1
// PATCH  /v1/tickets/:id/bump       bump ticket, auto-advance course if ready
// PATCH  /v1/tickets/:id/void       void a ticket
// GET    /v1/tickets                active tickets for a station
// GET    /v1/tickets/:id            single ticket detail
// GET    /v1/tickets/order/:orderId all tickets for an order
// GET    /v1/tickets/order/:orderId/courses  course status summary
// ============================================================

import { Hono } from 'hono';
import { ok, err } from '../../../backend/middleware/auth';
import { initialHoldStatus, checkAndAdvanceCourse } from '../lib/course-engine';

const app = new Hono();

// POST /v1/tickets/fire
app.post('/fire', async (c) => {
  const supabase  = c.get('supabase');
  const tenantId  = c.get('tenantId');
  const body      = await c.req.json();

  if (!body.orderId) return err(c, 'VALIDATION_ERROR', 'orderId is required', 422);
  if (!Array.isArray(body.items) || body.items.length === 0)
    return err(c, 'VALIDATION_ERROR', 'items must be a non-empty array', 422);

  // Group items by station + course
  const groups = new Map<string, { station: string; courseNumber: number; items: any[] }>();
  for (const item of body.items) {
    const course = item.courseNumber ?? 1;
    const key    = `${item.station}::${course}`;
    if (!groups.has(key)) groups.set(key, { station: item.station, courseNumber: course, items: [] });
    groups.get(key)!.items.push(item);
  }

  const fired: any[] = [];
  const held:  any[] = [];

  for (const group of groups.values()) {
    const holdStatus = initialHoldStatus(group.courseNumber);
    const now        = new Date().toISOString();

    const { data: ticket, error: ticketErr } = await supabase
      .from('kitchen_tickets')
      .insert({
        tenant_id:          tenantId,
        order_id:           body.orderId,
        table_number:       body.tableNumber ?? null,
        station:            group.station,
        course_number:      group.courseNumber,
        course_hold_status: holdStatus,
        status:             holdStatus === 'held' ? 'held' : 'queued',
        priority:           body.priority ?? 0,
        fired_at:           holdStatus === 'firing' ? now : null,
        held_at:            holdStatus === 'held'   ? now : null,
      })
      .select()
      .single();

    if (ticketErr) {
      console.error('[KDS fire] ticket insert error:', ticketErr.message);
      continue;
    }

    // Insert ticket items
    if (group.items.length > 0) {
      await supabase.from('ticket_items').insert(
        group.items.map((item) => ({
          ticket_id:    ticket.id,
          menu_item_id: item.menuItemId ?? null,
          name:         item.name,
          quantity:     item.quantity ?? 1,
          modifiers:    item.modifiers ?? [],
          notes:        item.notes ?? null,
          course_number: group.courseNumber,
          is_rush:      item.isRush ?? false,
        }))
      );
    }

    if (holdStatus === 'held') held.push(ticket);
    else                       fired.push(ticket);
  }

  return ok(c, {
    orderId: body.orderId,
    fired,
    held,
    message: held.length > 0
      ? `${fired.length} ticket(s) fired. ${held.length} ticket(s) held for course ${Math.max(...held.map((t) => t.course_number))}.`
      : `${fired.length} ticket(s) fired.`,
  }, 201);
});

// PATCH /v1/tickets/:id/bump
app.patch('/:id/bump', async (c) => {
  const supabase  = c.get('supabase');
  const tenantId  = c.get('tenantId');
  const { id }    = c.req.param();
  const body      = await c.req.json().catch(() => ({}));

  // Fetch ticket first (for course info)
  const { data: ticket, error: fetchErr } = await supabase
    .from('kitchen_tickets')
    .select('id, order_id, course_number, status, tenant_id')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single();

  if (fetchErr || !ticket) return err(c, 'NOT_FOUND', `Ticket ${id} not found`, 404);
  if (ticket.status === 'bumped') return ok(c, ticket); // idempotent
  if (ticket.status === 'voided') return err(c, 'CONFLICT', 'Cannot bump a voided ticket', 409);
  if (ticket.status === 'held')   return err(c, 'CONFLICT', 'Cannot bump a held ticket — it has not been fired yet', 409);

  const now = new Date().toISOString();

  const { data: bumped, error: bumpErr } = await supabase
    .from('kitchen_tickets')
    .update({
      status:          'bumped',
      bumped_at:       now,
      cook_time_seconds: body.cookTimeSeconds ?? null,
    })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single();

  if (bumpErr) return err(c, 'INTERNAL_ERROR', bumpErr.message, 500);

  // Emit kds:ticket:bumped to event bus
  const busUrl = process.env.CULINARYOS_URL ?? 'http://localhost:3000';
  await fetch(`${busUrl}/internal/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.INTERNAL_API_KEY ?? ''}`,
      'X-Tenant-Id': tenantId,
      'X-Caller-Service': 'kds',
    },
    body: JSON.stringify({
      eventId:   crypto.randomUUID(),
      eventType: 'kds:ticket:bumped',
      tenantId,
      source:    'kds',
      timestamp: now,
      version:   1,
      payload: {
        ticketId:        id,
        orderId:         ticket.order_id,
        station:         bumped.station,
        courseNumber:    ticket.course_number,
        bumpedAt:        now,
        cookTimeSeconds: body.cookTimeSeconds ?? null,
      },
    }),
  }).catch(() => null);

  // Course advance check — auto-fire next course if ready
  const advanced = await checkAndAdvanceCourse(
    supabase, tenantId, ticket.order_id, ticket.course_number,
    body.serverName ?? 'auto'
  );

  // Emit kds:course:fired if a course was advanced
  if (advanced) {
    await fetch(`${busUrl}/internal/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.INTERNAL_API_KEY ?? ''}`,
        'X-Tenant-Id': tenantId,
        'X-Caller-Service': 'kds',
      },
      body: JSON.stringify({
        eventId:   crypto.randomUUID(),
        eventType: 'kds:course:fired',
        tenantId,
        source:    'kds',
        timestamp: now,
        version:   1,
        payload: advanced,
      }),
    }).catch(() => null);
  }

  return ok(c, { bumped, courseAdvanced: advanced });
});

// PATCH /v1/tickets/:id/void
app.patch('/:id/void', async (c) => {
  const supabase = c.get('supabase');
  const tenantId = c.get('tenantId');
  const { id }   = c.req.param();
  const body     = await c.req.json().catch(() => ({}));

  const { data, error } = await supabase
    .from('kitchen_tickets')
    .update({ status: 'voided', void_reason: body.reason ?? null })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single();

  if (error) return err(c, 'NOT_FOUND', `Ticket ${id} not found`, 404);
  return ok(c, data);
});

// GET /v1/tickets  (active tickets for a station, excluding held)
app.get('/', async (c) => {
  const supabase   = c.get('supabase');
  const tenantId   = c.get('tenantId');
  const station    = c.req.query('station');
  const showHeld   = c.req.query('show_held') === 'true';

  let q = supabase
    .from('kitchen_tickets')
    .select('*, items:ticket_items(*)')
    .eq('tenant_id', tenantId)
    .in('status', showHeld
      ? ['queued','firing','cooking','held']
      : ['queued','firing','cooking']
    )
    .order('priority', { ascending: false })
    .order('fired_at',  { ascending: true });

  if (station) q = q.eq('station', station);

  const { data, error } = await q;
  if (error) return err(c, 'INTERNAL_ERROR', error.message, 500);
  return ok(c, data);
});

// GET /v1/tickets/:id
app.get('/:id', async (c) => {
  const supabase = c.get('supabase');
  const tenantId = c.get('tenantId');
  const { id }   = c.req.param();

  const { data, error } = await supabase
    .from('kitchen_tickets')
    .select('*, items:ticket_items(*)')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single();

  if (error) return err(c, 'NOT_FOUND', `Ticket ${id} not found`, 404);
  return ok(c, data);
});

// GET /v1/tickets/order/:orderId  — all tickets for an order
app.get('/order/:orderId', async (c) => {
  const supabase  = c.get('supabase');
  const tenantId  = c.get('tenantId');
  const { orderId } = c.req.param();

  const { data, error } = await supabase
    .from('kitchen_tickets')
    .select('*, items:ticket_items(*)')
    .eq('tenant_id', tenantId)
    .eq('order_id', orderId)
    .order('course_number')
    .order('fired_at', { ascending: true, nullsFirst: false });

  if (error) return err(c, 'INTERNAL_ERROR', error.message, 500);
  return ok(c, data);
});

// GET /v1/tickets/order/:orderId/courses  — course status summary
app.get('/order/:orderId/courses', async (c) => {
  const supabase    = c.get('supabase');
  const tenantId    = c.get('tenantId');
  const { orderId } = c.req.param();

  const { data, error } = await supabase
    .from('order_course_status')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('order_id', orderId)
    .order('course_number');

  if (error) return err(c, 'INTERNAL_ERROR', error.message, 500);
  return ok(c, data);
});

export { app as ticketRoutes };
