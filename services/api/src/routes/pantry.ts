import { Hono }         from 'hono';
import type { Context } from 'hono';
import { createClient } from '@supabase/supabase-js';

const pantry = new Hono();

// ── Supabase client helper (service role — runs server-side) ────────────────
function db() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ============================================================
// PANTRY STATUS
// ============================================================

/**
 * GET /v1/pantry
 * Returns all ingredients with current stock status.
 * Supports ?status=low_stock|out_of_stock|ok filter.
 */
pantry.get('/', async (c: Context) => {
  const tenantId    = c.get('tenantId') as string;
  const statusFilter = c.req.query('status');

  let query = db()
    .from('pantry_status')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('name');

  if (statusFilter) {
    query = query.eq('stock_status', statusFilter) as typeof query;
  }

  const { data, error } = await query;
  if (error) return c.json({ ok: false, error: error.message }, 500);
  return c.json({ ok: true, data });
});

/**
 * GET /v1/pantry/alerts
 * Returns only low_stock and out_of_stock ingredients.
 * This is what the admin dashboard and event bus watch.
 */
pantry.get('/alerts', async (c: Context) => {
  const tenantId = c.get('tenantId') as string;
  const { data, error } = await db()
    .from('pantry_status')
    .select('*')
    .eq('tenant_id', tenantId)
    .in('stock_status', ['low_stock', 'out_of_stock'])
    .order('current_qty');

  if (error) return c.json({ ok: false, error: error.message }, 500);
  return c.json({ ok: true, data, count: data?.length ?? 0 });
});

/**
 * PATCH /v1/pantry/:ingredientId/adjust
 * Body: { delta: number, reason: string, reference_id?: string }
 * Adjusts current_qty and writes a pantry_ledger entry atomically.
 */
pantry.patch('/:ingredientId/adjust', async (c: Context) => {
  const tenantId      = c.get('tenantId') as string;
  const ingredientId  = c.req.param('ingredientId');
  const body          = await c.req.json<{ delta: number; reason: string; reference_id?: string }>();

  if (!body.delta || !body.reason) {
    return c.json({ ok: false, error: 'delta and reason are required' }, 400);
  }

  const supabase = db();

  // Fetch current qty
  const { data: ing, error: fetchErr } = await supabase
    .from('ingredients')
    .select('id, current_qty, name')
    .eq('id', ingredientId)
    .eq('tenant_id', tenantId)
    .single();

  if (fetchErr || !ing) return c.json({ ok: false, error: 'Ingredient not found' }, 404);

  const newQty = Math.max(0, Number(ing.current_qty) + body.delta);

  // Update qty
  const { error: updateErr } = await supabase
    .from('ingredients')
    .update({ current_qty: newQty })
    .eq('id', ingredientId)
    .eq('tenant_id', tenantId);

  if (updateErr) return c.json({ ok: false, error: updateErr.message }, 500);

  // Write ledger entry
  await supabase.from('pantry_ledger').insert({
    tenant_id:     tenantId,
    ingredient_id: ingredientId,
    delta:         body.delta,
    reason:        body.reason,
    reference_id:  body.reference_id ?? null,
  });

  return c.json({ ok: true, data: { id: ingredientId, current_qty: newQty } });
});

// ============================================================
// PURCHASE ORDERS — CRUD
// ============================================================

/**
 * GET /v1/pantry/purchase-orders
 * Returns POs for this tenant, newest first.
 * Supports ?status=draft|approved|sent|received|cancelled filter.
 */
pantry.get('/purchase-orders', async (c: Context) => {
  const tenantId     = c.get('tenantId') as string;
  const statusFilter = c.req.query('status');

  let query = db()
    .from('restock_purchase_orders')
    .select('*, po_line_items(*)')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (statusFilter) {
    query = query.eq('status', statusFilter) as typeof query;
  }

  const { data, error } = await query;
  if (error) return c.json({ ok: false, error: error.message }, 500);
  return c.json({ ok: true, data });
});

/**
 * POST /v1/pantry/purchase-orders
 * Creates a draft PO, optionally auto-populating lines from low-stock alerts.
 * Body: { supplier?: string, notes?: string, lines?: POLineInput[], auto?: boolean }
 *
 * If auto=true, lines are generated from all current low_stock/out_of_stock
 * ingredients using their reorder_qty and cost_per_unit.
 */
pantry.post('/purchase-orders', async (c: Context) => {
  const tenantId = c.get('tenantId') as string;
  const userId   = c.get('userId')   as string ?? 'system';
  const body     = await c.req.json<{
    supplier?: string;
    notes?:    string;
    lines?:    Array<{ ingredient_id: string; ordered_qty: number; unit_cost?: number }>;
    auto?:     boolean;
  }>();

  const supabase = db();

  // Generate PO number
  const { data: poNumRow } = await supabase
    .rpc('next_po_number', { p_tenant_id: tenantId });
  const poNumber = poNumRow as string ?? `PO-${Date.now()}`;

  // Create PO header
  const { data: po, error: poErr } = await supabase
    .from('restock_purchase_orders')
    .insert({
      tenant_id:  tenantId,
      po_number:  poNumber,
      supplier:   body.supplier ?? null,
      notes:      body.notes    ?? null,
      created_by: userId,
    })
    .select()
    .single();

  if (poErr || !po) return c.json({ ok: false, error: poErr?.message ?? 'PO insert failed' }, 500);

  let lines = body.lines ?? [];

  // Auto-generate lines from low-stock alerts
  if (body.auto) {
    const { data: alerts } = await supabase
      .from('pantry_status')
      .select('id, name, unit, reorder_qty, cost_per_unit')
      .eq('tenant_id', tenantId)
      .in('stock_status', ['low_stock', 'out_of_stock']);

    lines = (alerts ?? []).map((a) => ({
      ingredient_id: a.id,
      ordered_qty:   a.reorder_qty ?? 1,
      unit_cost:     a.cost_per_unit ?? 0,
    }));
  }

  if (lines.length === 0) {
    return c.json({ ok: true, data: po, warning: 'PO created with no lines' });
  }

  // Resolve ingredient names + units for denormalisation
  const ingredientIds = lines.map((l) => l.ingredient_id);
  const { data: ings } = await supabase
    .from('ingredients')
    .select('id, name, unit, cost_per_unit')
    .in('id', ingredientIds)
    .eq('tenant_id', tenantId);

  const ingMap = new Map((ings ?? []).map((i) => [i.id, i]));

  const lineInserts = lines.map((l) => ({
    po_id:           po.id,
    ingredient_id:   l.ingredient_id,
    ingredient_name: ingMap.get(l.ingredient_id)?.name ?? 'Unknown',
    unit:            ingMap.get(l.ingredient_id)?.unit  ?? '?',
    ordered_qty:     l.ordered_qty,
    unit_cost:       l.unit_cost ?? ingMap.get(l.ingredient_id)?.cost_per_unit ?? 0,
  }));

  const { error: lineErr } = await supabase.from('po_line_items').insert(lineInserts);
  if (lineErr) return c.json({ ok: false, error: lineErr.message }, 500);

  // Compute and store total_cost
  const totalCost = lineInserts.reduce((sum, l) => sum + l.ordered_qty * l.unit_cost, 0);
  await supabase
    .from('restock_purchase_orders')
    .update({ total_cost: totalCost })
    .eq('id', po.id);

  const { data: full } = await supabase
    .from('restock_purchase_orders')
    .select('*, po_line_items(*)')
    .eq('id', po.id)
    .single();

  return c.json({ ok: true, data: full }, 201);
});

/**
 * GET /v1/pantry/purchase-orders/:poId
 * Returns a single PO with its line items.
 */
pantry.get('/purchase-orders/:poId', async (c: Context) => {
  const tenantId = c.get('tenantId') as string;
  const poId     = c.req.param('poId');

  const { data, error } = await db()
    .from('restock_purchase_orders')
    .select('*, po_line_items(*)')
    .eq('id', poId)
    .eq('tenant_id', tenantId)
    .single();

  if (error) return c.json({ ok: false, error: 'PO not found' }, 404);
  return c.json({ ok: true, data });
});

/**
 * PATCH /v1/pantry/purchase-orders/:poId/approve
 * Moves PO from draft → approved. Records who approved it.
 */
pantry.patch('/purchase-orders/:poId/approve', async (c: Context) => {
  const tenantId  = c.get('tenantId') as string;
  const userId    = c.get('userId')   as string ?? 'system';
  const poId      = c.req.param('poId');

  const { data, error } = await db()
    .from('restock_purchase_orders')
    .update({ status: 'approved', approved_by: userId, approved_at: new Date().toISOString() })
    .eq('id', poId)
    .eq('tenant_id', tenantId)
    .eq('status', 'draft')  // only draft → approved is valid here
    .select()
    .single();

  if (error || !data) return c.json({ ok: false, error: 'PO not found or not in draft state' }, 404);
  return c.json({ ok: true, data });
});

/**
 * PATCH /v1/pantry/purchase-orders/:poId/send
 * Moves approved PO → sent. Records sent_at timestamp.
 */
pantry.patch('/purchase-orders/:poId/send', async (c: Context) => {
  const tenantId = c.get('tenantId') as string;
  const poId     = c.req.param('poId');
  const body     = await c.req.json<{ expected_at?: string }>().catch(() => ({}));

  const { data, error } = await db()
    .from('restock_purchase_orders')
    .update({
      status:      'sent',
      sent_at:     new Date().toISOString(),
      expected_at: body.expected_at ?? null,
    })
    .eq('id', poId)
    .eq('tenant_id', tenantId)
    .eq('status', 'approved')
    .select()
    .single();

  if (error || !data) return c.json({ ok: false, error: 'PO not found or not in approved state' }, 404);
  return c.json({ ok: true, data });
});

/**
 * PATCH /v1/pantry/purchase-orders/:poId/receive
 * Marks PO as received.
 * Body: { lines: [{ line_item_id, received_qty }] }
 * Updates received_qty on each line and restocks ingredient current_qty.
 * Writes a pantry_ledger entry per line item.
 */
pantry.patch('/purchase-orders/:poId/receive', async (c: Context) => {
  const tenantId = c.get('tenantId') as string;
  const poId     = c.req.param('poId');
  const body     = await c.req.json<{
    lines: Array<{ line_item_id: string; received_qty: number }>;
  }>();

  if (!Array.isArray(body.lines) || body.lines.length === 0) {
    return c.json({ ok: false, error: 'lines array is required' }, 400);
  }

  const supabase = db();

  // Verify PO belongs to tenant and is in 'sent' status
  const { data: po, error: poErr } = await supabase
    .from('restock_purchase_orders')
    .select('id, status')
    .eq('id', poId)
    .eq('tenant_id', tenantId)
    .single();

  if (poErr || !po) return c.json({ ok: false, error: 'PO not found' }, 404);
  if (po.status !== 'sent') return c.json({ ok: false, error: `PO is ${po.status}, must be sent` }, 409);

  // Fetch line items
  const lineIds = body.lines.map((l) => l.line_item_id);
  const { data: dbLines } = await supabase
    .from('po_line_items')
    .select('id, ingredient_id, ingredient_name, unit')
    .in('id', lineIds)
    .eq('po_id', poId);

  const lineMap = new Map((dbLines ?? []).map((l) => [l.id, l]));

  // Apply each received qty
  for (const line of body.lines) {
    const dbLine = lineMap.get(line.line_item_id);
    if (!dbLine || line.received_qty <= 0) continue;

    // Update received_qty on line
    await supabase
      .from('po_line_items')
      .update({ received_qty: line.received_qty })
      .eq('id', line.line_item_id);

    // Restock ingredient
    const { data: ing } = await supabase
      .from('ingredients')
      .select('current_qty')
      .eq('id', dbLine.ingredient_id)
      .single();

    if (ing) {
      const newQty = Number(ing.current_qty) + line.received_qty;
      await supabase
        .from('ingredients')
        .update({ current_qty: newQty })
        .eq('id', dbLine.ingredient_id);
    }

    // Ledger entry
    await supabase.from('pantry_ledger').insert({
      tenant_id:     tenantId,
      ingredient_id: dbLine.ingredient_id,
      delta:         line.received_qty,
      reason:        'restock',
      reference_id:  poId,
    });
  }

  // Mark PO received
  const { data: updated } = await supabase
    .from('restock_purchase_orders')
    .update({ status: 'received', received_at: new Date().toISOString() })
    .eq('id', poId)
    .select('*, po_line_items(*)')
    .single();

  return c.json({ ok: true, data: updated });
});

/**
 * DELETE /v1/pantry/purchase-orders/:poId
 * Cancels a draft or approved PO. Cannot cancel sent/received.
 */
pantry.delete('/purchase-orders/:poId', async (c: Context) => {
  const tenantId = c.get('tenantId') as string;
  const poId     = c.req.param('poId');

  const { data, error } = await db()
    .from('restock_purchase_orders')
    .update({ status: 'cancelled' })
    .eq('id', poId)
    .eq('tenant_id', tenantId)
    .in('status', ['draft', 'approved'])
    .select()
    .single();

  if (error || !data) return c.json({ ok: false, error: 'PO not found or cannot be cancelled' }, 404);
  return c.json({ ok: true, data });
});

export { pantry as pantryRoutes };
