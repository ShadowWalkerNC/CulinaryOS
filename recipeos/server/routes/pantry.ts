// ============================================================
// RecipeOS — /v1/pantry routes
//
// POST /v1/pantry/deduct        deduct stock for a sold recipe
// POST /v1/pantry/restock       add stock (delivery, manual)
// GET  /v1/pantry/status        current stock levels
// GET  /v1/pantry/low           items at or below reorder threshold
// GET  /v1/pantry/ledger        recent ledger entries
// ============================================================

import { Hono } from 'hono';
import { ok, err } from '../../../backend/middleware/auth';

const app = new Hono();

// Resolve backend base URL from CULINARYOS_HOST (bare hostname, no scheme)
// Render injects CULINARYOS_HOST via fromService; locally falls back to localhost.
const CULINARYOS_URL = process.env.CULINARYOS_HOST
  ? `https://${process.env.CULINARYOS_HOST}`
  : 'http://localhost:3000';

// POST /v1/pantry/deduct
// Called by event bus handler when an order is paid
// Body: { recipeId, quantity, soldAt, orderId? }
app.post('/deduct', async (c) => {
  const supabase = c.get('supabase');
  const tenantId = c.get('tenantId');
  const body     = await c.req.json();

  if (!body.recipeId) return err(c, 'VALIDATION_ERROR', 'recipeId is required', 422);
  if (!body.quantity) return err(c, 'VALIDATION_ERROR', 'quantity is required', 422);

  const qty = Number(body.quantity);
  if (isNaN(qty) || qty <= 0) return err(c, 'VALIDATION_ERROR', 'quantity must be a positive number', 422);

  // 1. Fetch recipe → ingredient links
  const { data: links, error: linksErr } = await supabase
    .from('recipe_ingredients')
    .select('ingredient_id, quantity, unit')
    .eq('recipe_id', body.recipeId);

  if (linksErr) return err(c, 'INTERNAL_ERROR', linksErr.message, 500);
  if (!links || links.length === 0) {
    // Recipe has no ingredient links — nothing to deduct, not an error
    return ok(c, { deducted: [], message: 'No ingredient links for this recipe' });
  }

  const deducted: { ingredientId: string; name: string; delta: number; newQty: number }[] = [];
  const lowStockAlerts: { ingredientId: string; name: string; currentQty: number; unit: string; reorderAt: number }[] = [];

  // 2. Deduct each ingredient
  for (const link of links) {
    const delta = -(link.quantity * qty); // negative = deduct

    // Fetch current ingredient
    const { data: ing, error: ingErr } = await supabase
      .from('ingredients')
      .select('id, name, current_qty, reorder_at, unit')
      .eq('id', link.ingredient_id)
      .eq('tenant_id', tenantId)
      .single();

    if (ingErr || !ing) {
      console.warn(`[RecipeOS] Ingredient ${link.ingredient_id} not found for tenant ${tenantId}, skipping`);
      continue;
    }

    const newQty = Math.max(0, ing.current_qty + delta); // floor at 0

    // Atomic update
    const { error: updateErr } = await supabase
      .from('ingredients')
      .update({ current_qty: newQty })
      .eq('id', ing.id)
      .eq('tenant_id', tenantId);

    if (updateErr) {
      console.error(`[RecipeOS] Failed to update ingredient ${ing.id}: ${updateErr.message}`);
      continue;
    }

    // Write to ledger
    await supabase.from('pantry_ledger').insert({
      tenant_id:    tenantId,
      ingredient_id: ing.id,
      delta,
      reason:       'sale',
      reference_id: body.orderId ?? body.recipeId,
      recorded_by:  c.get('callerService') ?? 'pos',
    });

    deducted.push({ ingredientId: ing.id, name: ing.name, delta, newQty });

    // 3. Low stock check
    if (newQty <= ing.reorder_at) {
      lowStockAlerts.push({
        ingredientId: ing.id,
        name:         ing.name,
        currentQty:   newQty,
        unit:         ing.unit,
        reorderAt:    ing.reorder_at,
      });
    }
  }

  // 4. Emit low-stock events for anything that dropped below threshold
  for (const alert of lowStockAlerts) {
    await emitLowStockEvent(tenantId, alert);
  }

  return ok(c, { deducted, lowStockAlerts });
});

// POST /v1/pantry/restock
app.post('/restock', async (c) => {
  const supabase = c.get('supabase');
  const tenantId = c.get('tenantId');
  const body     = await c.req.json();

  if (!body.ingredient_id) return err(c, 'VALIDATION_ERROR', 'ingredient_id is required', 422);
  if (!body.quantity)      return err(c, 'VALIDATION_ERROR', 'quantity is required', 422);

  const qty = Number(body.quantity);
  if (isNaN(qty) || qty <= 0) return err(c, 'VALIDATION_ERROR', 'quantity must be positive', 422);

  const { data: ing, error: ingErr } = await supabase
    .from('ingredients')
    .select('id, current_qty')
    .eq('id', body.ingredient_id)
    .eq('tenant_id', tenantId)
    .single();

  if (ingErr || !ing) return err(c, 'NOT_FOUND', `Ingredient ${body.ingredient_id} not found`, 404);

  const newQty = ing.current_qty + qty;

  await supabase.from('ingredients').update({ current_qty: newQty }).eq('id', ing.id);
  await supabase.from('pantry_ledger').insert({
    tenant_id:    tenantId,
    ingredient_id: ing.id,
    delta:        qty,
    reason:       body.reason ?? 'restock',
    reference_id: body.reference_id ?? null,
    recorded_by:  c.get('callerService') ?? 'manual',
  });

  return ok(c, { ingredientId: ing.id, previousQty: ing.current_qty, newQty, delta: qty });
});

// GET /v1/pantry/status
app.get('/status', async (c) => {
  const supabase = c.get('supabase');
  const tenantId = c.get('tenantId');

  const { data, error } = await supabase
    .from('pantry_status')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('name');

  if (error) return err(c, 'INTERNAL_ERROR', error.message, 500);
  return ok(c, data);
});

// GET /v1/pantry/low
app.get('/low', async (c) => {
  const supabase = c.get('supabase');
  const tenantId = c.get('tenantId');

  const { data, error } = await supabase
    .from('pantry_status')
    .select('*')
    .eq('tenant_id', tenantId)
    .in('stock_status', ['low_stock', 'out_of_stock'])
    .order('current_qty');

  if (error) return err(c, 'INTERNAL_ERROR', error.message, 500);
  return ok(c, data);
});

// GET /v1/pantry/ledger
app.get('/ledger', async (c) => {
  const supabase  = c.get('supabase');
  const tenantId  = c.get('tenantId');
  const ingId     = c.req.query('ingredient_id');
  const limit     = Math.min(parseInt(c.req.query('limit') ?? '50', 10), 200);

  let q = supabase
    .from('pantry_ledger')
    .select('*, ingredient:ingredients(id, name, unit)')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (ingId) q = q.eq('ingredient_id', ingId);

  const { data, error } = await q;
  if (error) return err(c, 'INTERNAL_ERROR', error.message, 500);
  return ok(c, data);
});

// ---- Low-stock event emitter ----

async function emitLowStockEvent(
  tenantId: string,
  alert: { ingredientId: string; name: string; currentQty: number; unit: string; reorderAt: number }
) {
  try {
    await fetch(`${CULINARYOS_URL}/internal/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.INTERNAL_API_KEY ?? ''}`,
        'X-Tenant-Id': tenantId,
        'X-Caller-Service': 'recipeos',
      },
      body: JSON.stringify({
        eventId:   crypto.randomUUID(),
        eventType: 'recipeos:pantry:low-stock',
        tenantId,
        source:    'recipeos',
        timestamp: new Date().toISOString(),
        version:   1,
        payload: {
          ingredientId:  alert.ingredientId,
          ingredientName: alert.name,
          currentQty:    alert.currentQty,
          unit:          alert.unit,
          reorderAt:     alert.reorderAt,
        },
      }),
    });
    console.warn(`[RecipeOS] Low stock emitted: ${alert.name} — ${alert.currentQty}${alert.unit}`);
  } catch {
    console.warn(`[RecipeOS] Failed to emit low-stock event for ${alert.name} (non-fatal)`);
  }
}

export { app as pantryRoutes };
