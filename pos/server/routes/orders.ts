// ============================================================
// POS — /v1/orders routes
//
// GET    /v1/orders                 list orders
// GET    /v1/orders/:id             get order + line items
// POST   /v1/orders                 create order
// PATCH  /v1/orders/:id             update order (fire, void, status)
// POST   /v1/orders/:id/items       add line item
// PATCH  /v1/orders/:id/items/:iid  update line item
// DELETE /v1/orders/:id/items/:iid  void line item
// GET    /v1/orders/:id/payments    list payments for order
// ============================================================

import { Hono } from 'hono';
import { ok, err } from '../../../backend/middleware/auth';

const app = new Hono();

// GET /v1/orders
app.get('/', async (c) => {
  const supabase = c.get('supabase');
  const tenantId = c.get('tenantId');
  const status   = c.req.query('status');
  const tabId    = c.req.query('tab_id');

  let q = supabase
    .from('pos_orders')
    .select('*, items:pos_order_line_items(*, modifiers:line_item_modifiers(*))')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (status) {
    status.includes(',')
      ? q = q.in('status', status.split(','))
      : q = q.eq('status', status);
  }
  if (tabId) q = q.eq('tab_id', tabId);

  const { data, error } = await q;
  if (error) return err(c, 'INTERNAL_ERROR', error.message, 500);
  return ok(c, data);
});

// GET /v1/orders/:id
app.get('/:id', async (c) => {
  const supabase = c.get('supabase');
  const tenantId = c.get('tenantId');
  const { id }   = c.req.param();

  const { data, error } = await supabase
    .from('pos_orders')
    .select('*, items:pos_order_line_items(*, modifiers:line_item_modifiers(*))')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single();

  if (error) return err(c, 'NOT_FOUND', `Order ${id} not found`, 404);
  return ok(c, data);
});

// POST /v1/orders
app.post('/', async (c) => {
  const supabase = c.get('supabase');
  const tenantId = c.get('tenantId');
  const body     = await c.req.json();

  const { data, error } = await supabase
    .from('pos_orders')
    .insert({
      tenant_id:    tenantId,
      tab_id:       body.tab_id ?? null,
      table_number: body.table_number ?? null,
      cover_count:  body.cover_count ?? null,
      server_name:  body.server_name ?? null,
      notes:        body.notes ?? null,
      status:       'open',
      subtotal: 0, tax: 0, total: 0,
    })
    .select()
    .single();

  if (error) return err(c, 'INTERNAL_ERROR', error.message, 500);
  return ok(c, data, 201);
});

// PATCH /v1/orders/:id
app.patch('/:id', async (c) => {
  const supabase = c.get('supabase');
  const tenantId = c.get('tenantId');
  const { id }   = c.req.param();
  const body     = await c.req.json();

  const allowed = ['status', 'notes', 'server_name', 'fired_at', 'paid_at', 'voided_at', 'void_reason', 'subtotal', 'tax', 'total'];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) if (key in body) updates[key] = body[key];

  if (updates.status === 'sent'   && !updates.fired_at)  updates.fired_at  = new Date().toISOString();
  if (updates.status === 'voided' && !updates.voided_at) updates.voided_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('pos_orders')
    .update(updates)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select('*, items:pos_order_line_items(*)')
    .single();

  if (error) return err(c, 'NOT_FOUND', `Order ${id} not found`, 404);

  // Emit event if order was just fired
  if (updates.status === 'sent') {
    await emitOrderCreated(data, tenantId);
  }
  if (updates.status === 'voided') {
    await emitEvent('pos:order:cancelled', tenantId, { orderId: id, reason: body.void_reason });
  }

  return ok(c, data);
});

// POST /v1/orders/:id/items
app.post('/:id/items', async (c) => {
  const supabase = c.get('supabase');
  const tenantId = c.get('tenantId');
  const { id }   = c.req.param();
  const body     = await c.req.json();

  // Fetch menu item for snapshot
  const { data: menuItem, error: miErr } = await supabase
    .from('menu_items')
    .select('id, name, price, station')
    .eq('id', body.menu_item_id)
    .eq('tenant_id', tenantId)
    .single();

  if (miErr || !menuItem) return err(c, 'NOT_FOUND', `Menu item ${body.menu_item_id} not found`, 404);

  const qty        = body.quantity ?? 1;
  const unit_price = menuItem.price;
  const line_total = unit_price * qty;

  const { data, error } = await supabase
    .from('pos_order_line_items')
    .insert({
      order_id:      id,
      tenant_id:     tenantId,
      menu_item_id:  menuItem.id,
      name:          menuItem.name,
      quantity:      qty,
      unit_price,
      line_total,
      station:       menuItem.station,
      course_number: body.course_number ?? 1,
      notes:         body.notes ?? null,
    })
    .select()
    .single();

  if (error) return err(c, 'INTERNAL_ERROR', error.message, 500);

  // Recalculate order totals
  await recalcOrderTotals(supabase, id, tenantId);

  return ok(c, data, 201);
});

// PATCH /v1/orders/:id/items/:iid
app.patch('/:id/items/:iid', async (c) => {
  const supabase = c.get('supabase');
  const tenantId = c.get('tenantId');
  const { iid }  = c.req.param();
  const body     = await c.req.json();

  const allowed = ['quantity', 'notes', 'course_number', 'is_voided', 'void_reason'];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) if (key in body) updates[key] = body[key];

  const { data, error } = await supabase
    .from('pos_order_line_items')
    .update(updates)
    .eq('id', iid)
    .eq('tenant_id', tenantId)
    .select()
    .single();

  if (error) return err(c, 'NOT_FOUND', `Line item ${iid} not found`, 404);

  await recalcOrderTotals(supabase, data.order_id, tenantId);
  return ok(c, data);
});

// DELETE /v1/orders/:id/items/:iid  (soft void)
app.delete('/:id/items/:iid', async (c) => {
  const supabase = c.get('supabase');
  const tenantId = c.get('tenantId');
  const { id, iid } = c.req.param();

  const { data, error } = await supabase
    .from('pos_order_line_items')
    .update({ is_voided: true, void_reason: 'Removed by server' })
    .eq('id', iid)
    .eq('tenant_id', tenantId)
    .select()
    .single();

  if (error) return err(c, 'NOT_FOUND', `Line item ${iid} not found`, 404);
  await recalcOrderTotals(supabase, id, tenantId);
  return ok(c, data);
});

// GET /v1/orders/:id/payments
app.get('/:id/payments', async (c) => {
  const supabase = c.get('supabase');
  const tenantId = c.get('tenantId');
  const { id }   = c.req.param();

  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('order_id', id)
    .eq('tenant_id', tenantId)
    .order('created_at');

  if (error) return err(c, 'INTERNAL_ERROR', error.message, 500);
  return ok(c, data);
});

// ---- Helpers ----

async function recalcOrderTotals(supabase: any, orderId: string, tenantId: string) {
  const { data: items } = await supabase
    .from('pos_order_line_items')
    .select('line_total, is_voided')
    .eq('order_id', orderId)
    .eq('tenant_id', tenantId);

  const subtotal = (items ?? []).filter((i: any) => !i.is_voided).reduce((s: number, i: any) => s + i.line_total, 0);
  const tax      = Math.round(subtotal * 0.1);
  const total    = subtotal + tax;

  await supabase.from('pos_orders').update({ subtotal, tax, total }).eq('id', orderId);
}

async function emitOrderCreated(order: any, tenantId: string) {
  const items = (order.items ?? []).map((i: any) => ({
    lineItemId:   i.id,
    menuItemId:   i.menu_item_id,
    name:         i.name,
    quantity:     i.quantity,
    modifiers:    [],
    station:      i.station,
    courseNumber: i.course_number,
    recipeId:     i.recipe_id ?? undefined,
  }));

  await emitEvent('pos:order:created', tenantId, {
    orderId:     order.id,
    tableNumber: order.table_number,
    serverName:  order.server_name,
    items,
    createdAt:   order.created_at,
  });
}

async function emitEvent(eventType: string, tenantId: string, payload: unknown) {
  const url = process.env.CULINARYOS_URL ?? 'http://localhost:3000';
  try {
    await fetch(`${url}/internal/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.INTERNAL_API_KEY ?? ''}`,
        'X-Tenant-Id': tenantId,
        'X-Caller-Service': 'pos',
      },
      body: JSON.stringify({
        eventId: crypto.randomUUID(), eventType, tenantId,
        source: 'pos', timestamp: new Date().toISOString(), version: 1, payload,
      }),
    });
  } catch {
    console.warn(`[POS] Failed to emit ${eventType} (non-fatal)`);
  }
}

export { app as orderRoutes };
