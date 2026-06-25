// ============================================================
// POS — /v1/orders routes  (extended with manual course fire)
//
// POST   /v1/orders                 create order
// GET    /v1/orders                 list active orders
// GET    /v1/orders/:id             get order detail
// PATCH  /v1/orders/:id/send        send to kitchen (fire course 1)
// PATCH  /v1/orders/:id/void        void order
// POST   /v1/orders/:id/fire-course  manually fire a held course
// PATCH  /v1/orders/:id/items/:itemId/void  void a single line item
// ============================================================

import { Hono } from 'hono';
import { ok, err } from '../../../backend/middleware/auth';

const app = new Hono();

// POST /v1/orders
app.post('/', async (c) => {
  const supabase  = c.get('supabase');
  const tenantId  = c.get('tenantId');
  const body      = await c.req.json();

  if (!body.tableNumber && !body.takeaway)
    return err(c, 'VALIDATION_ERROR', 'tableNumber or takeaway:true is required', 422);

  const { data, error } = await supabase
    .from('pos_orders')
    .insert({
      tenant_id:    tenantId,
      table_number: body.tableNumber ?? null,
      cover_count:  body.coverCount  ?? null,
      server_name:  body.serverName  ?? null,
      status:       'open',
      subtotal:     0,
      tax:          0,
      total:        0,
    })
    .select()
    .single();

  if (error) return err(c, 'INTERNAL_ERROR', error.message, 500);
  return ok(c, data, 201);
});

// GET /v1/orders
app.get('/', async (c) => {
  const supabase  = c.get('supabase');
  const tenantId  = c.get('tenantId');
  const status    = c.req.query('status');

  let q = supabase
    .from('pos_orders')
    .select('*, items:pos_order_line_items(*)')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (status) q = q.eq('status', status);
  else q = q.in('status', ['open','sent','in-progress','ready']);

  const { data, error } = await q;
  if (error) return err(c, 'INTERNAL_ERROR', error.message, 500);
  return ok(c, data);
});

// GET /v1/orders/:id
app.get('/:id', async (c) => {
  const supabase  = c.get('supabase');
  const tenantId  = c.get('tenantId');
  const { id }    = c.req.param();

  const { data, error } = await supabase
    .from('pos_orders')
    .select('*, items:pos_order_line_items(*)')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single();

  if (error) return err(c, 'NOT_FOUND', `Order ${id} not found`, 404);
  return ok(c, data);
});

// PATCH /v1/orders/:id/send  — sends order to kitchen
// Items in body carry courseNumber; course > 1 tickets are held automatically
app.patch('/:id/send', async (c) => {
  const supabase  = c.get('supabase');
  const tenantId  = c.get('tenantId');
  const { id }    = c.req.param();

  const { data: order, error: orderErr } = await supabase
    .from('pos_orders')
    .select('*, items:pos_order_line_items(*)')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single();

  if (orderErr || !order) return err(c, 'NOT_FOUND', `Order ${id} not found`, 404);
  if (!['open'].includes(order.status))
    return err(c, 'CONFLICT', `Order is already ${order.status}`, 409);

  // Update order status to sent
  await supabase.from('pos_orders').update({ status: 'sent' }).eq('id', id);

  // Emit pos:order:created to trigger ticket fire via event bus
  const busUrl = process.env.CULINARYOS_URL ?? 'http://localhost:3000';
  await fetch(`${busUrl}/internal/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.INTERNAL_API_KEY ?? ''}`,
      'X-Tenant-Id': tenantId,
      'X-Caller-Service': 'pos',
    },
    body: JSON.stringify({
      eventId:   crypto.randomUUID(),
      eventType: 'pos:order:created',
      tenantId,
      source:    'pos',
      timestamp: new Date().toISOString(),
      version:   1,
      payload: {
        orderId:     id,
        tableNumber: order.table_number,
        serverName:  order.server_name,
        items:       (order.items ?? []).map((li: any) => ({
          menuItemId:   li.menu_item_id,
          name:         li.name,
          quantity:     li.quantity,
          station:      li.station ?? 'hot',
          courseNumber: li.course_number ?? 1,
          modifiers:    li.modifiers ?? [],
          notes:        li.notes ?? null,
        })),
      },
    }),
  }).catch(() => null);

  return ok(c, { orderId: id, status: 'sent' });
});

// POST /v1/orders/:id/fire-course
// Manually fires a held course — used by server at the table
app.post('/:id/fire-course', async (c) => {
  const supabase    = c.get('supabase');
  const tenantId    = c.get('tenantId');
  const { id }      = c.req.param();
  const body        = await c.req.json();

  if (!body.courseNumber)
    return err(c, 'VALIDATION_ERROR', 'courseNumber is required', 422);

  const courseNumber = Number(body.courseNumber);
  if (isNaN(courseNumber) || courseNumber < 2)
    return err(c, 'VALIDATION_ERROR', 'courseNumber must be 2 or greater', 422);

  // Verify order belongs to tenant
  const { data: order, error: orderErr } = await supabase
    .from('pos_orders').select('id, status').eq('id', id).eq('tenant_id', tenantId).single();

  if (orderErr || !order) return err(c, 'NOT_FOUND', `Order ${id} not found`, 404);
  if (['paid','voided'].includes(order.status))
    return err(c, 'CONFLICT', `Cannot fire course on a ${order.status} order`, 409);

  // Release held tickets for this course
  const now = new Date().toISOString();
  const { data: heldTickets, error: heldErr } = await supabase
    .from('kitchen_tickets')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('order_id', id)
    .eq('course_number', courseNumber)
    .eq('course_hold_status', 'held');

  if (heldErr) return err(c, 'INTERNAL_ERROR', heldErr.message, 500);
  if (!heldTickets || heldTickets.length === 0)
    return err(c, 'NOT_FOUND', `No held tickets for course ${courseNumber} on order ${id}`, 404);

  const heldIds = heldTickets.map((t: any) => t.id);

  await supabase
    .from('kitchen_tickets')
    .update({ course_hold_status: 'fired', status: 'queued', fired_at: now })
    .in('id', heldIds)
    .eq('tenant_id', tenantId);

  await supabase.from('course_fire_log').insert({
    tenant_id:     tenantId,
    order_id:      id,
    course_number: courseNumber,
    fired_by:      body.serverName ?? 'server',
    fired_at:      now,
    ticket_ids:    heldIds,
  });

  // Emit kds:course:fired event
  const busUrl = process.env.CULINARYOS_URL ?? 'http://localhost:3000';
  await fetch(`${busUrl}/internal/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.INTERNAL_API_KEY ?? ''}`,
      'X-Tenant-Id': tenantId,
      'X-Caller-Service': 'pos',
    },
    body: JSON.stringify({
      eventId:   crypto.randomUUID(),
      eventType: 'kds:course:fired',
      tenantId,
      source:    'pos',
      timestamp: now,
      version:   1,
      payload: {
        orderId:        id,
        courseNumber,
        firedTicketIds: heldIds,
        firedBy:        body.serverName ?? 'server',
      },
    }),
  }).catch(() => null);

  return ok(c, {
    orderId:     id,
    courseNumber,
    firedTickets: heldIds.length,
    firedBy:     body.serverName ?? 'server',
  });
});

// PATCH /v1/orders/:id/void
app.patch('/:id/void', async (c) => {
  const supabase  = c.get('supabase');
  const tenantId  = c.get('tenantId');
  const { id }    = c.req.param();
  const body      = await c.req.json().catch(() => ({}));

  const { data, error } = await supabase
    .from('pos_orders')
    .update({ status: 'voided', void_reason: body.reason ?? null })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single();

  if (error) return err(c, 'NOT_FOUND', `Order ${id} not found`, 404);

  // Void all non-bumped tickets (including held ones)
  await supabase
    .from('kitchen_tickets')
    .update({ status: 'voided' })
    .eq('tenant_id', tenantId)
    .eq('order_id', id)
    .not('status', 'in', '("bumped","voided")');

  return ok(c, data);
});

// PATCH /v1/orders/:id/items/:itemId/void
app.patch('/:id/items/:itemId/void', async (c) => {
  const supabase   = c.get('supabase');
  const tenantId   = c.get('tenantId');
  const { id, itemId } = c.req.param();
  const body       = await c.req.json().catch(() => ({}));

  const { data, error } = await supabase
    .from('pos_order_line_items')
    .update({ is_voided: true, void_reason: body.reason ?? null })
    .eq('id', itemId)
    .eq('order_id', id)
    .select()
    .single();

  if (error) return err(c, 'NOT_FOUND', `Item ${itemId} not found`, 404);
  return ok(c, data);
});

export { app as orderRoutes };
