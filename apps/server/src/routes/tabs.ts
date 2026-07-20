// ============================================================
// POS — /v1/tabs routes
//
// GET   /v1/tabs         list tabs (filter by status)
// POST  /v1/tabs         open a new tab
// PATCH /v1/tabs/:id     update tab (close, transfer)
// GET   /v1/tabs/:id     get tab with orders
// ============================================================

import { Hono } from 'hono';
import { requireTenant, ok, err } from '../middleware/auth.js';
import type { Env } from '../types.js';

export const tabsRoutes = new Hono<Env>();

tabsRoutes.use('*', requireTenant);

// Local Mock Tabs State
let mockTabs: any[] = [
  { id: "tab-1", tenant_id: "00000000-0000-0000-0000-000000000001", guest_name: "Michael Scott", status: "open", card_last4: "4242", preauth_amount: 5000 }
];

tabsRoutes.get('/', async (c) => {
  const supabase = c.get('supabase');
  const tenantId = c.get('tenantId');
  const status   = c.req.query('status') ?? 'open';

  if (!supabase) {
    const list = mockTabs.filter(t => t.tenant_id === tenantId && t.status === status);
    return ok(c, list);
  }

  const { data, error } = await supabase
    .from('tabs')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('status', status);

  if (error) return err(c, 'DB_ERROR', error.message, 500);
  return ok(c, data);
});

tabsRoutes.post('/', async (c) => {
  const supabase = c.get('supabase');
  const tenantId = c.get('tenantId');
  const body     = await c.req.json();

  if (!body.guestName) {
    return err(c, 'VALIDATION_ERROR', 'guestName is required', 422);
  }

  if (!supabase) {
    const newTab = {
      id: `tab-${Math.floor(1000 + Math.random() * 9000)}`,
      tenant_id: tenantId,
      guest_name: body.guestName,
      status: 'open',
      card_last4: body.cardLast4 ?? '4242',
      preauth_amount: body.preauthAmount ?? 5000,
      created_at: new Date().toISOString()
    };
    mockTabs.push(newTab);
    return ok(c, newTab, 201);
  }

  const { data, error } = await supabase
    .from('tabs')
    .insert({
      tenant_id:      tenantId,
      guest_name:     body.guestName,
      card_last4:     body.cardLast4 ?? null,
      preauth_amount: body.preauthAmount ?? 0,
      status:         'open',
    })
    .select()
    .single();

  if (error) return err(c, 'DB_ERROR', error.message, 500);
  return ok(c, data, 201);
});

tabsRoutes.patch('/:id', async (c) => {
  const supabase = c.get('supabase');
  const tenantId = c.get('tenantId');
  const { id }   = c.req.param();
  const body     = await c.req.json();

  if (!supabase) {
    const tab = mockTabs.find(t => t.id === id && t.tenant_id === tenantId);
    if (!tab) return err(c, 'NOT_FOUND', `Tab ${id} not found`, 404);
    if (body.status !== undefined) tab.status = body.status;
    return ok(c, tab);
  }

  const { data, error } = await supabase
    .from('tabs')
    .update({
      status: body.status,
    })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single();

  if (error) return err(c, 'NOT_FOUND', `Tab ${id} not found`, 404);
  return ok(c, data);
});

tabsRoutes.get('/:id', async (c) => {
  const supabase = c.get('supabase');
  const tenantId = c.get('tenantId');
  const { id }   = c.req.param();

  if (!supabase) {
    const tab = mockTabs.find(t => t.id === id && t.tenant_id === tenantId);
    if (!tab) return err(c, 'NOT_FOUND', `Tab ${id} not found`, 404);
    return ok(c, tab);
  }

  const { data, error } = await supabase
    .from('tabs')
    .select('*, orders:pos_orders(*)')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single();

  if (error || !data) return err(c, 'NOT_FOUND', `Tab ${id} not found`, 404);
  return ok(c, data);
});

export default tabsRoutes;
