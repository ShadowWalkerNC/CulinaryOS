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
import { requireTenant, ok, err } from '../middleware/auth.js';
import type { Env } from '../types.js';

export const ordersRoutes = new Hono<Env>();

ordersRoutes.use('*', requireTenant);

// Resolve backend base URL from CULINARYOS_HOST (bare hostname, no scheme)
const CULINARYOS_URL = process.env.CULINARYOS_HOST
  ? `https://${process.env.CULINARYOS_HOST}`
  : 'http://localhost:3000';

// Local Mock Database for Offline/Demo Mode
let mockOrders: any[] = [];

// POST /v1/orders
ordersRoutes.post('/', async (c) => {
  const supabase  = c.get('supabase');
  const tenantId  = c.get('tenantId');
  const body      = await c.req.json();

  if (!body.tableNumber && !body.takeaway)
    return err(c, 'VALIDATION_ERROR', 'tableNumber or takeaway:true is required', 422);

  if (!supabase) {
    const newOrder = {
      id: `o-${Math.floor(1000 + Math.random() * 9000)}`,
      tenant_id: tenantId,
      table_number: body.tableNumber ?? null,
      cover_count: body.coverCount ?? null,
      server_name: body.serverName ?? 'AI Assistant',
      status: 'open',
      subtotal: 0,
      tax: 0,
      total: 0,
      created_at: new Date().toISOString(),
      items: []
    };
    mockOrders.push(newOrder);
    return ok(c, newOrder, 201);
  }

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

// POST /v1/orders/:id/items
ordersRoutes.post('/:id/items', async (c) => {
  const supabase = c.get('supabase');
  const tenantId = c.get('tenantId');
  const { id }   = c.req.param();
  const body     = await c.req.json();

  if (!supabase) {
    const order = mockOrders.find(o => o.id === id);
    if (!order) return err(c, 'NOT_FOUND', `Order ${id} not found`, 404);

    const price = body.unitPrice ?? 0;
    const quantity = body.quantity ?? 1;
    const lineTotal = price * quantity;

    const newItem = {
      id: `li-${Math.floor(10000 + Math.random() * 90000)}`,
      order_id: id,
      menu_item_id: body.menuItemId,
      name: body.name,
      quantity,
      unit_price: price,
      line_total: lineTotal,
      station: body.station ?? 'hot',
      course_number: body.courseNumber ?? 1,
      notes: body.notes ?? null,
    };

    order.items = order.items || [];
    order.items.push(newItem);
    order.subtotal = order.items.reduce((s: number, i: any) => s + i.line_total, 0);
    order.tax = Math.round(order.subtotal * 0.1);
    order.total = order.subtotal + order.tax;

    return ok(c, newItem, 201);
  }

  const { data, error } = await supabase
    .from('pos_order_line_items')
    .insert({
      tenant_id:     tenantId,
      order_id:      id,
      menu_item_id:  body.menuItemId,
      name:          body.name,
      quantity:      body.quantity ?? 1,
      unit_price:    body.unitPrice,
      line_total:    body.unitPrice * (body.quantity ?? 1),
      station:       body.station ?? 'hot',
      course_number: body.courseNumber ?? 1,
      notes:         body.notes ?? null,
    })
    .select()
    .single();

  if (error) return err(c, 'INTERNAL_ERROR', error.message, 500);

  // Update order subtotal and total
  const { data: items } = await supabase
    .from('pos_order_line_items')
    .select('line_total')
    .eq('order_id', id);

  const subtotal = items?.reduce((sum, item) => sum + item.line_total, 0) ?? 0;
  const tax = Math.round(subtotal * 0.1);
  const total = subtotal + tax;

  await supabase
    .from('pos_orders')
    .update({ subtotal, tax, total })
    .eq('id', id);

  return ok(c, data, 201);
});

// GET /v1/orders
ordersRoutes.get('/', async (c) => {
  const supabase  = c.get('supabase');
  const tenantId  = c.get('tenantId');
  const status    = c.req.query('status');

  if (!supabase) {
    let list = mockOrders.filter(o => o.tenant_id === tenantId);
    if (status) list = list.filter(o => o.status === status);
    else list = list.filter(o => ['open','sent','in-progress','ready'].includes(o.status));
    return ok(c, list);
  }

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
ordersRoutes.get('/:id', async (c) => {
  const supabase  = c.get('supabase');
  const tenantId  = c.get('tenantId');
  const { id }    = c.req.param();

  if (!supabase) {
    const order = mockOrders.find(o => o.id === id && o.tenant_id === tenantId);
    if (!order) return err(c, 'NOT_FOUND', `Order ${id} not found`, 404);
    return ok(c, order);
  }

  const { data, error } = await supabase
    .from('pos_orders')
    .select('*, items:pos_order_line_items(*)')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single();

  if (error) return err(c, 'NOT_FOUND', `Order ${id} not found`, 404);
  return ok(c, data);
});

// PATCH /v1/orders/:id/send
ordersRoutes.patch('/:id/send', async (c) => {
  const supabase  = c.get('supabase');
  const tenantId  = c.get('tenantId');
  const { id }    = c.req.param();

  if (!supabase) {
    const order = mockOrders.find(o => o.id === id && o.tenant_id === tenantId);
    if (!order) return err(c, 'NOT_FOUND', `Order ${id} not found`, 404);
    if (order.status !== 'open') return err(c, 'CONFLICT', `Order is already ${order.status}`, 409);

    order.status = 'sent';
    order.fired_at = new Date().toISOString();

    // Trigger local offline event message/broadcast print mock
    console.log(`[Offline Event Bus] order:created emitted for order ${id}`);
    return ok(c, { orderId: id, status: 'sent' });
  }

  const { data: order, error: orderErr } = await supabase
    .from('pos_orders')
    .select('*, items:pos_order_line_items(*)')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single();

  if (orderErr || !order) return err(c, 'NOT_FOUND', `Order ${id} not found`, 404);
  if (!['open'].includes(order.status))
    return err(c, 'CONFLICT', `Order is already ${order.status}`, 409);

  await supabase.from('pos_orders').update({ status: 'sent' }).eq('id', id);

  await fetch(`${CULINARYOS_URL}/internal/events`, {
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
ordersRoutes.post('/:id/fire-course', async (c) => {
  const supabase    = c.get('supabase');
  const tenantId    = c.get('tenantId');
  const { id }      = c.req.param();
  const body        = await c.req.json();

  if (!body.courseNumber)
    return err(c, 'VALIDATION_ERROR', 'courseNumber is required', 422);

  const courseNumber = Number(body.courseNumber);
  if (isNaN(courseNumber) || courseNumber < 2)
    return err(c, 'VALIDATION_ERROR', 'courseNumber must be 2 or greater', 422);

  if (!supabase) {
    const order = mockOrders.find(o => o.id === id && o.tenant_id === tenantId);
    if (!order) return err(c, 'NOT_FOUND', `Order ${id} not found`, 404);
    return ok(c, { orderId: id, courseNumber, firedTickets: 1, firedBy: body.serverName ?? 'server' });
  }

  const { data: order, error: orderErr } = await supabase
    .from('pos_orders').select('id, status').eq('id', id).eq('tenant_id', tenantId).single();

  if (orderErr || !order) return err(c, 'NOT_FOUND', `Order ${id} not found`, 404);
  if (['paid','voided'].includes(order.status))
    return err(c, 'CONFLICT', `Cannot fire course on a ${order.status} order`, 409);

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

  await fetch(`${CULINARYOS_URL}/internal/events`, {
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
ordersRoutes.patch('/:id/void', async (c) => {
  const supabase  = c.get('supabase');
  const tenantId  = c.get('tenantId');
  const { id }    = c.req.param();
  const body      = await c.req.json().catch(() => ({}));

  if (!supabase) {
    const order = mockOrders.find(o => o.id === id && o.tenant_id === tenantId);
    if (!order) return err(c, 'NOT_FOUND', `Order ${id} not found`, 404);
    order.status = 'voided';
    order.void_reason = body.reason ?? null;
    return ok(c, order);
  }

  const { data, error } = await supabase
    .from('pos_orders')
    .update({ status: 'voided', void_reason: body.reason ?? null })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single();

  if (error) return err(c, 'NOT_FOUND', `Order ${id} not found`, 404);

  await supabase
    .from('kitchen_tickets')
    .update({ status: 'voided' })
    .eq('tenant_id', tenantId)
    .eq('order_id', id)
    .not('status', 'in', '("bumped","voided")');

  return ok(c, data);
});

// PATCH /v1/orders/:id/items/:itemId/void
ordersRoutes.patch('/:id/items/:itemId/void', async (c) => {
  const supabase   = c.get('supabase');
  const tenantId   = c.get('tenantId');
  const { id, itemId } = c.req.param();
  const body       = await c.req.json().catch(() => ({}));

  if (!supabase) {
    const order = mockOrders.find(o => o.id === id && o.tenant_id === tenantId);
    if (!order) return err(c, 'NOT_FOUND', `Order ${id} not found`, 404);
    const item = order.items?.find((i: any) => i.id === itemId);
    if (!item) return err(c, 'NOT_FOUND', `Item ${itemId} not found`, 404);
    item.is_voided = true;
    item.void_reason = body.reason ?? null;
    return ok(c, item);
  }

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

export default ordersRoutes;
