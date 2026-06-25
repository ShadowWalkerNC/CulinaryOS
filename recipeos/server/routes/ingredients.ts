// ============================================================
// RecipeOS — /v1/ingredients routes
//
// GET    /v1/ingredients          list all
// GET    /v1/ingredients/:id      single ingredient
// POST   /v1/ingredients          create
// PATCH  /v1/ingredients/:id      update (name, unit, reorder levels)
// DELETE /v1/ingredients/:id      delete
// GET    /v1/ingredients/:id/links  recipe links for this ingredient
// POST   /v1/ingredients/link     link recipe → ingredient
// DELETE /v1/ingredients/link/:id remove link
// ============================================================

import { Hono } from 'hono';
import { ok, err } from '../../../backend/middleware/auth';

const app = new Hono();

app.get('/', async (c) => {
  const supabase  = c.get('supabase');
  const tenantId  = c.get('tenantId');
  const search    = c.req.query('q');
  const lowStock  = c.req.query('low_stock');

  let q = supabase
    .from('ingredients')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('name');

  if (search)   q = q.ilike('name', `%${search}%`);
  if (lowStock === 'true') q = q.lte('current_qty', supabase.rpc('coalesce_reorder_at'));

  const { data, error } = await q;
  if (error) return err(c, 'INTERNAL_ERROR', error.message, 500);
  return ok(c, data);
});

app.get('/:id', async (c) => {
  const supabase = c.get('supabase');
  const tenantId = c.get('tenantId');
  const { id }   = c.req.param();

  const { data, error } = await supabase
    .from('ingredients').select('*').eq('id', id).eq('tenant_id', tenantId).single();

  if (error) return err(c, 'NOT_FOUND', `Ingredient ${id} not found`, 404);
  return ok(c, data);
});

app.post('/', async (c) => {
  const supabase = c.get('supabase');
  const tenantId = c.get('tenantId');
  const body     = await c.req.json();

  if (!body.name) return err(c, 'VALIDATION_ERROR', 'name is required', 422);
  if (!body.unit) return err(c, 'VALIDATION_ERROR', 'unit is required', 422);

  const { data, error } = await supabase
    .from('ingredients')
    .insert({
      tenant_id:    tenantId,
      name:         body.name,
      unit:         body.unit,
      current_qty:  body.current_qty ?? 0,
      reorder_at:   body.reorder_at  ?? 0,
      reorder_qty:  body.reorder_qty ?? 0,
      cost_per_unit: body.cost_per_unit ?? 0,
      supplier:     body.supplier ?? null,
      notes:        body.notes    ?? null,
    })
    .select().single();

  if (error) return err(c, 'INTERNAL_ERROR', error.message, 500);
  return ok(c, data, 201);
});

app.patch('/:id', async (c) => {
  const supabase = c.get('supabase');
  const tenantId = c.get('tenantId');
  const { id }   = c.req.param();
  const body     = await c.req.json();

  const allowed = ['name','unit','current_qty','reorder_at','reorder_qty','cost_per_unit','supplier','notes'];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) if (key in body) updates[key] = body[key];

  if (!Object.keys(updates).length) return err(c, 'VALIDATION_ERROR', 'No valid fields to update', 422);

  const { data, error } = await supabase
    .from('ingredients').update(updates).eq('id', id).eq('tenant_id', tenantId).select().single();

  if (error) return err(c, 'NOT_FOUND', `Ingredient ${id} not found`, 404);
  return ok(c, data);
});

app.delete('/:id', async (c) => {
  const supabase = c.get('supabase');
  const tenantId = c.get('tenantId');
  const { id }   = c.req.param();

  const { error } = await supabase
    .from('ingredients').delete().eq('id', id).eq('tenant_id', tenantId);

  if (error) return err(c, 'NOT_FOUND', `Ingredient ${id} not found`, 404);
  return ok(c, { deleted: id });
});

// GET /v1/ingredients/:id/links
app.get('/:id/links', async (c) => {
  const supabase = c.get('supabase');
  const { id }   = c.req.param();

  const { data, error } = await supabase
    .from('recipe_ingredients')
    .select('*')
    .eq('ingredient_id', id);

  if (error) return err(c, 'INTERNAL_ERROR', error.message, 500);
  return ok(c, data);
});

// POST /v1/ingredients/link
app.post('/link', async (c) => {
  const supabase = c.get('supabase');
  const body     = await c.req.json();

  if (!body.recipe_id)     return err(c, 'VALIDATION_ERROR', 'recipe_id is required', 422);
  if (!body.ingredient_id) return err(c, 'VALIDATION_ERROR', 'ingredient_id is required', 422);
  if (!body.quantity)      return err(c, 'VALIDATION_ERROR', 'quantity is required', 422);
  if (!body.unit)          return err(c, 'VALIDATION_ERROR', 'unit is required', 422);

  const { data, error } = await supabase
    .from('recipe_ingredients')
    .insert({ recipe_id: body.recipe_id, ingredient_id: body.ingredient_id, quantity: body.quantity, unit: body.unit, notes: body.notes ?? null })
    .select().single();

  if (error) return err(c, 'INTERNAL_ERROR', error.message, 500);
  return ok(c, data, 201);
});

// DELETE /v1/ingredients/link/:id
app.delete('/link/:id', async (c) => {
  const supabase = c.get('supabase');
  const { id }   = c.req.param();

  const { error } = await supabase.from('recipe_ingredients').delete().eq('id', id);
  if (error) return err(c, 'NOT_FOUND', `Link ${id} not found`, 404);
  return ok(c, { deleted: id });
});

export { app as ingredientRoutes };
