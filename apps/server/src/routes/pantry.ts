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
import { requireTenant, ok, err } from '../middleware/auth.js';
import type { Env } from '../types.js';

export const pantryRoutes = new Hono<Env>();

pantryRoutes.use('*', requireTenant);

// Local Mock Pantry State
let mockPantry = [
  { id: "i1", name: "Unbleached Bread Flour", stock_quantity: 12.5, par_level: 50.0, unit: "kg", cost_per_unit: 200 },
  { id: "i2", name: "Active Starter Culture", stock_quantity: 2.2, par_level: 5.0, unit: "kg", cost_per_unit: 150 }
];

// GET /v1/pantry
pantryRoutes.get('/', async (c) => {
  const supabase = c.get('supabase');
  const tenantId = c.get('tenantId');

  if (!supabase) {
    return ok(c, mockPantry);
  }

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

  if (!supabase) {
    const item = mockPantry.find(p => p.id === id);
    if (!item) return err(c, 'NOT_FOUND', `Pantry item ${id} not found`, 404);
    return ok(c, item);
  }

  const { data, error } = await supabase
    .from('pantry_items')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single();

  if (error || !data) return err(c, 'NOT_FOUND', `Pantry item ${id} not found`, 404);
  return ok(c, data);
});

// POST /v1/pantry
pantryRoutes.post('/', async (c) => {
  const supabase = c.get('supabase');
  const tenantId = c.get('tenantId');
  const body     = await c.req.json();

  if (!supabase) {
    const newItem = {
      id: `i-${Math.floor(1000 + Math.random() * 9000)}`,
      name: body.name,
      stock_quantity: body.stockQuantity ?? 0,
      par_level: body.parLevel ?? 0,
      unit: body.unit ?? 'pcs',
      cost_per_unit: body.costPerUnit ?? 0
    };
    mockPantry.push(newItem);
    return ok(c, newItem, 201);
  }

  const { data, error } = await supabase
    .from('pantry_items')
    .insert({
      tenant_id:      tenantId,
      name:           body.name,
      stock_quantity: body.stockQuantity ?? 0,
      par_level:      body.parLevel ?? 0,
      unit:           body.unit ?? 'pcs',
      cost_per_unit:  body.costPerUnit ?? 0,
    })
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
  const body     = await c.req.json();

  if (!supabase) {
    const item = mockPantry.find(p => p.id === id);
    if (!item) return err(c, 'NOT_FOUND', `Pantry item ${id} not found`, 404);
    if (body.name !== undefined) item.name = body.name;
    if (body.stockQuantity !== undefined) item.stock_quantity = body.stockQuantity;
    if (body.parLevel !== undefined) item.par_level = body.parLevel;
    if (body.unit !== undefined) item.unit = body.unit;
    if (body.costPerUnit !== undefined) item.cost_per_unit = body.costPerUnit;
    return ok(c, item);
  }

  const { data, error } = await supabase
    .from('pantry_items')
    .update({
      name:           body.name,
      stock_quantity: body.stockQuantity,
      par_level:      body.parLevel,
      unit:           body.unit,
      cost_per_unit:  body.costPerUnit,
    })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single();

  if (error) return err(c, 'NOT_FOUND', `Pantry item ${id} not found`, 404);
  return ok(c, data);
});

// DELETE /v1/pantry/:id
pantryRoutes.delete('/:id', async (c) => {
  const supabase = c.get('supabase');
  const tenantId = c.get('tenantId');
  const { id }   = c.req.param();

  if (!supabase) {
    mockPantry = mockPantry.filter(p => p.id !== id);
    return ok(c, { success: true });
  }

  const { error } = await supabase
    .from('pantry_items')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenantId);

  if (error) return err(c, 'NOT_FOUND', `Pantry item ${id} not found`, 404);
  return ok(c, { success: true });
});

// POST /v1/pantry/deduct
pantryRoutes.post('/deduct', async (c) => {
  const supabase = c.get('supabase');
  const body     = await c.req.json();

  if (!supabase) {
    const item = mockPantry.find(p => p.id === body.itemId);
    if (item) {
      item.stock_quantity = Math.max(0, item.stock_quantity - (body.quantity ?? 0));
    }
    return ok(c, { success: true });
  }

  // Live DB decrement logic
  const { error } = await supabase.rpc('decrement_pantry_stock', {
    item_id: body.itemId,
    qty:     body.quantity,
  });

  if (error) return err(c, 'DB_ERROR', error.message, 500);
  return ok(c, { success: true });
});

export default pantryRoutes;
