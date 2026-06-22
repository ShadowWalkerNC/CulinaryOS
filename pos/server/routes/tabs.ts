// ============================================================
// POS — /v1/tabs routes
//
// GET   /v1/tabs         list tabs (filter by status)
// POST  /v1/tabs         open a new tab
// PATCH /v1/tabs/:id     update tab (close, transfer)
// GET   /v1/tabs/:id     get tab with orders
// ============================================================

import { Hono } from 'hono';
import { ok, err } from '../../../backend/middleware/auth';

const app = new Hono();

app.get('/', async (c) => {
  const supabase = c.get('supabase');
  const tenantId = c.get('tenantId');
  const status   = c.req.query('status') ?? 'open';

  const { data, error } = await supabase
    .from('tabs')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('status', status)
    .order('opened_at');

  if (error) return err(c, 'INTERNAL_ERROR', error.message, 500);
  return ok(c, data);
});

app.get('/:id', async (c) => {
  const supabase = c.get('supabase');
  const tenantId = c.get('tenantId');
  const { id }   = c.req.param();

  const { data: tab, error } = await supabase
    .from('tabs').select('*').eq('id', id).eq('tenant_id', tenantId).single();
  if (error) return err(c, 'NOT_FOUND', `Tab ${id} not found`, 404);

  const { data: orders } = await supabase
    .from('pos_orders').select('*').eq('tab_id', id).eq('tenant_id', tenantId);

  return ok(c, { ...tab, orders: orders ?? [] });
});

app.post('/', async (c) => {
  const supabase = c.get('supabase');
  const tenantId = c.get('tenantId');
  const body     = await c.req.json();

  const { data, error } = await supabase
    .from('tabs')
    .insert({ tenant_id: tenantId, table_number: body.table_number, cover_count: body.cover_count, server_name: body.server_name })
    .select().single();

  if (error) return err(c, 'INTERNAL_ERROR', error.message, 500);
  return ok(c, data, 201);
});

app.patch('/:id', async (c) => {
  const supabase = c.get('supabase');
  const tenantId = c.get('tenantId');
  const { id }   = c.req.param();
  const body     = await c.req.json();

  const allowed = ['status', 'server_name', 'cover_count', 'closed_at'];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) if (key in body) updates[key] = body[key];
  if (body.status === 'closed' && !updates.closed_at) updates.closed_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('tabs').update(updates).eq('id', id).eq('tenant_id', tenantId).select().single();

  if (error) return err(c, 'NOT_FOUND', `Tab ${id} not found`, 404);
  return ok(c, data);
});

export { app as tabRoutes };
