// ============================================================
// CulinaryOS — Pantry Routes
// GET    /v1/pantry              — list all pantry items
// GET    /v1/pantry/:id          — get single item
// POST   /v1/pantry              — create item
// PATCH  /v1/pantry/:id          — update item
// DELETE /v1/pantry/:id          — delete item
// POST   /v1/pantry/deduct       — deduct quantity (called by RecipeOS handler)
// ============================================================

import { Hono } from 'hono';
import { requireTenant, ok, err } from '../middleware/auth';

export const pantryRoutes = new Hono();

pantryRoutes.use('*', requireTenant);

// GET /v1/pantry
pantryRoutes.get('/', async (c) => {
  const supabase = c.get('supabase');
  const tenantId = c.get('tenantId');

  const { data, error } = await supabase
    .from('pantry_items')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('name', { ascending: true });

  if (error) return err(c, 'DB_ERROR', error.message, 500);
  return ok(c, data);
});

// GET /v1/pantry/:id
pantryRoutes.get('/:id', async (c) => {
  const supabase = c.get('supabase');
  const tenantId = c.get('tenantId');
  const { id }   = c.req.param();

  const { data, error } = await supabase
    .from('pantry_items')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single();

  if (error) return err(c, 'NOT_FOUND', 'Pantry item not found', 404);
  return ok(c, data);
});

// POST /v1/pantry
pantryRoutes.post('/', async (c) => {
  const supabase = c.get('supabase');
  const tenantId = c.get('tenantId');
  const body     = await c.req.json().catch(() => null);

  if (!body?.name) return err(c, 'VALIDATION_ERROR', 'name is required', 422);

  const { data, error } = await supabase
    .from('pantry_items')
    .insert({ ...body, tenant_id: tenantId })
    .select()
    .single();

  if (error) return err(c, 'DB_ERROR', error.message, 500);
  return ok(c, data, 201);
});

// PATCH /v1/pantry/:id
pantryRoutes.patch('/:id', async (c) => {
  const supabase = c.get('supabase');
  const tenantId = c.get('tenantId');
  const { id }   = c.req.param();
  const body     = await c.req.json().catch(() => null);

  if (!body) return err(c, 'VALIDATION_ERROR', 'Invalid JSON', 422);

  const { data, error } = await supabase
    .from('pantry_items')
    .update(body)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single();

  if (error) return err(c, 'DB_ERROR', error.message, 500);
  return ok(c, data);
});

// DELETE /v1/pantry/:id
pantryRoutes.delete('/:id', async (c) => {
  const supabase = c.get('supabase');
  const tenantId = c.get('tenantId');
  const { id }   = c.req.param();

  const { error } = await supabase
    .from('pantry_items')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenantId);

  if (error) return err(c, 'DB_ERROR', error.message, 500);
  return ok(c, { deleted: id });
});

// POST /v1/pantry/deduct
pantryRoutes.post('/deduct', async (c) => {
  const supabase = c.get('supabase');
  const tenantId = c.get('tenantId');
  const body     = await c.req.json().catch(() => null);

  if (!body?.recipeId || !body?.quantity) {
    return err(c, 'VALIDATION_ERROR', 'recipeId and quantity are required', 422);
  }

  // Find pantry items linked to this recipe and decrement
  const { data: items, error: fetchErr } = await supabase
    .from('pantry_items')
    .select('id, quantity')
    .eq('recipe_id', body.recipeId)
    .eq('tenant_id', tenantId);

  if (fetchErr) return err(c, 'DB_ERROR', fetchErr.message, 500);
  if (!items || items.length === 0) return ok(c, { deducted: false, reason: 'No pantry items linked to recipe' });

  for (const item of items) {
    await supabase
      .from('pantry_items')
      .update({ quantity: Math.max(0, item.quantity - body.quantity) })
      .eq('id', item.id);
  }

  return ok(c, { deducted: true, recipeId: body.recipeId, quantity: body.quantity });
});
