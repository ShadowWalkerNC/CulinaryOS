// ============================================================
// POS — /v1/menu routes
//
// GET   /v1/menu              active menu with sections + items
// GET   /v1/menu/items        flat list of all items
// GET   /v1/menu/items/:id    single item with modifier groups
// PATCH /v1/menu/items/:id    update item status (86, restore)
// ============================================================

import { Hono } from 'hono';
import { ok, err } from '../../../backend/middleware/auth';

const app = new Hono();

// GET /v1/menu — active menu tree
app.get('/', async (c) => {
  const supabase = c.get('supabase');
  const tenantId = c.get('tenantId');

  const { data, error } = await supabase
    .from('menus')
    .select(`
      id, name, description, status, published_at,
      sections:menu_sections(
        id, name, sort_order,
        items:menu_items(
          id, name, description, price, status, station, allergens, image_url, sort_order, recipe_id,
          modifier_groups(
            id, name, required, min_selections, max_selections, sort_order,
            modifiers(id, name, price_adjustment, is_default)
          )
        )
      )
    `)
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .order('sort_order', { referencedTable: 'menu_sections' })
    .single();

  if (error) return err(c, 'NOT_FOUND', 'No active menu found', 404);
  return ok(c, data);
});

// GET /v1/menu/items — flat list
app.get('/items', async (c) => {
  const supabase = c.get('supabase');
  const tenantId = c.get('tenantId');
  const status   = c.req.query('status');
  const station  = c.req.query('station');
  const search   = c.req.query('q');

  let q = supabase
    .from('menu_items')
    .select('*, section:menu_sections(id, name, menu_id)')
    .eq('tenant_id', tenantId)
    .order('sort_order');

  if (status)  q = q.eq('status', status);
  if (station) q = q.eq('station', station);
  if (search)  q = q.ilike('name', `%${search}%`);

  const { data, error } = await q;
  if (error) return err(c, 'INTERNAL_ERROR', error.message, 500);
  return ok(c, data);
});

// GET /v1/menu/items/:id
app.get('/items/:id', async (c) => {
  const supabase = c.get('supabase');
  const tenantId = c.get('tenantId');
  const { id }   = c.req.param();

  const { data, error } = await supabase
    .from('menu_items')
    .select('*, modifier_groups(*, modifiers(*))')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single();

  if (error) return err(c, 'NOT_FOUND', `Menu item ${id} not found`, 404);
  return ok(c, data);
});

// PATCH /v1/menu/items/:id
app.patch('/items/:id', async (c) => {
  const supabase = c.get('supabase');
  const tenantId = c.get('tenantId');
  const { id }   = c.req.param();
  const body     = await c.req.json();

  const allowed = ['status', 'price', 'description', 'image_url', 'sort_order'];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) if (key in body) updates[key] = body[key];

  if (Object.keys(updates).length === 0) return err(c, 'VALIDATION_ERROR', 'No valid fields to update', 422);

  const { data, error } = await supabase
    .from('menu_items')
    .update(updates)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single();

  if (error) return err(c, 'NOT_FOUND', `Menu item ${id} not found`, 404);
  return ok(c, data);
});

export { app as menuRoutes };
