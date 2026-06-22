// ============================================================
// POS — /v1/payments routes
//
// POST /v1/payments           process payment for an order
// GET  /v1/payments/:id       get payment detail
// POST /v1/payments/:id/refund  refund a payment
// ============================================================

import { Hono } from 'hono';
import { ok, err } from '../../../backend/middleware/auth';

const app = new Hono();

app.post('/', async (c) => {
  const supabase = c.get('supabase');
  const tenantId = c.get('tenantId');
  const body     = await c.req.json();

  if (!body.order_id) return err(c, 'VALIDATION_ERROR', 'order_id is required', 422);
  if (!body.method)   return err(c, 'VALIDATION_ERROR', 'method is required', 422);

  // Fetch order to get total
  const { data: order, error: oErr } = await supabase
    .from('pos_orders').select('total, status').eq('id', body.order_id).eq('tenant_id', tenantId).single();

  if (oErr || !order) return err(c, 'NOT_FOUND', `Order ${body.order_id} not found`, 404);
  if (order.status === 'paid') return err(c, 'CONFLICT', 'Order is already paid', 409);
  if (order.status === 'voided') return err(c, 'CONFLICT', 'Cannot pay a voided order', 409);

  const tipAmount = body.tip_amount ?? 0;
  const amount    = order.total + tipAmount;

  const { data: payment, error: pErr } = await supabase
    .from('payments')
    .insert({
      tenant_id:    tenantId,
      order_id:     body.order_id,
      amount,
      method:       body.method,
      tip_amount:   tipAmount,
      status:       'completed',
      reference_id: body.reference_id ?? null,
      processed_at: new Date().toISOString(),
    })
    .select().single();

  if (pErr) return err(c, 'INTERNAL_ERROR', pErr.message, 500);

  // Mark order as paid
  await supabase
    .from('pos_orders')
    .update({ status: 'paid', paid_at: new Date().toISOString(), total: amount })
    .eq('id', body.order_id);

  // Emit item-sold events for pantry deduction
  await emitItemsSold(supabase, body.order_id, tenantId);

  return ok(c, payment, 201);
});

app.get('/:id', async (c) => {
  const supabase = c.get('supabase');
  const tenantId = c.get('tenantId');
  const { id }   = c.req.param();

  const { data, error } = await supabase
    .from('payments').select('*').eq('id', id).eq('tenant_id', tenantId).single();

  if (error) return err(c, 'NOT_FOUND', `Payment ${id} not found`, 404);
  return ok(c, data);
});

app.post('/:id/refund', async (c) => {
  const supabase = c.get('supabase');
  const tenantId = c.get('tenantId');
  const { id }   = c.req.param();

  const { data, error } = await supabase
    .from('payments').update({ status: 'refunded' }).eq('id', id).eq('tenant_id', tenantId).select().single();

  if (error) return err(c, 'NOT_FOUND', `Payment ${id} not found`, 404);
  return ok(c, data);
});

// ---- Helpers ----

async function emitItemsSold(supabase: any, orderId: string, tenantId: string) {
  const { data: items } = await supabase
    .from('pos_order_line_items')
    .select('menu_item_id, recipe_id, quantity')
    .eq('order_id', orderId)
    .eq('is_voided', false);

  const url = process.env.CULINARYOS_URL ?? 'http://localhost:3000';
  const now = new Date().toISOString();

  for (const item of items ?? []) {
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
          eventId: crypto.randomUUID(), eventType: 'pos:menu:item-sold',
          tenantId, source: 'pos', timestamp: now, version: 1,
          payload: { menuItemId: item.menu_item_id, recipeId: item.recipe_id, quantity: item.quantity, soldAt: now },
        }),
      });
    } catch { /* non-fatal */ }
  }
}

export { app as paymentRoutes };
