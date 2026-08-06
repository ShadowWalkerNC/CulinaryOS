// ============================================================
// Public online ordering — resolves tenant slug server-side
// POST /v1/online-orders
// ============================================================

import { Hono } from 'hono';
import { ok, err } from '../middleware/auth.js';
import type { Env } from '../types.js';

export const onlineOrdersRoutes = new Hono<Env>();

onlineOrdersRoutes.post('/', async (c) => {
  const supabase = c.get('supabase');
  const body = await c.req.json().catch(() => null);
  if (!body) return err(c, 'VALIDATION_ERROR', 'Invalid JSON', 422);

  const slug = body.tenantSlug ?? body.tenant_slug;
  if (!slug || typeof slug !== 'string') {
    return err(c, 'VALIDATION_ERROR', 'tenantSlug is required', 422);
  }

  if (!supabase) {
    // Demo mode
    return ok(c, {
      id: body.id ?? `o-${Math.floor(1000 + Math.random() * 9000)}`,
      tenant_slug: slug,
      status: 'open',
      total: body.total ?? 0,
      created_at: new Date().toISOString(),
    }, 201);
  }

  const { data: tenant, error: tenantErr } = await supabase
    .from('tenants')
    .select('id, slug, name')
    .eq('slug', slug)
    .eq('status', 'active')
    .single();

  if (tenantErr || !tenant) return err(c, 'NOT_FOUND', 'Restaurant not found', 404);

  const { data: order, error: orderErr } = await supabase
    .from('pos_orders')
    .insert({
      tenant_id: tenant.id,
      table_number: null,
      cover_count: 1,
      server_name: 'Online',
      status: 'open',
      subtotal: body.subtotal ?? 0,
      tax: body.tax ?? 0,
      total: body.total ?? 0,
      notes: body.customer
        ? `Online ${body.mode ?? 'pickup'}: ${body.customer.name ?? ''} ${body.customer.phone ?? ''}`
        : `Online ${body.mode ?? 'pickup'}`,
    })
    .select()
    .single();

  if (orderErr || !order) return err(c, 'DB_ERROR', orderErr?.message ?? 'Failed to create order', 500);

  const items = Array.isArray(body.items) ? body.items : [];
  if (items.length > 0) {
    await supabase.from('pos_order_line_items').insert(
      items.map((item: any, idx: number) => ({
        tenant_id: tenant.id,
        order_id: order.id,
        menu_item_id: item.menu_item_id ?? item.menuItemId ?? null,
        name: item.name ?? 'Item',
        quantity: item.quantity ?? 1,
        unit_price: item.unit_price ?? item.unitPrice ?? 0,
        line_total: (item.unit_price ?? item.unitPrice ?? 0) * (item.quantity ?? 1),
        station: item.station ?? 'hot',
        course_number: item.course_number ?? 1,
        sort_order: idx,
        notes: item.notes ?? null,
      }))
    );
  }

  return ok(c, { ...order, tenant_slug: tenant.slug }, 201);
});

export default onlineOrdersRoutes;
