// ============================================================
// Public online ordering — resolves tenant slug server-side
// POST /v1/online-orders
// ============================================================

import { Hono } from 'hono';
import { ok, err } from '../middleware/auth.js';
import { calculateMultiRateTax } from '@culinaryos/shared';
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

  // ---- Money integrity: this is a PUBLIC endpoint, so the server reprices
  // everything from the menu. Client-supplied unit prices, modifier prices,
  // subtotals, and tax are ignored — only quantity, modifier CHOICES, tip,
  // and delivery fee are accepted from the client.
  const rawItems = Array.isArray(body.items) ? body.items : [];
  const pricedItems: Array<{
    menu_item_id: string;
    name: string;
    quantity: number;
    unit_price: number;
    line_total: number;
    station: string;
    course_number: number;
    sort_order: number;
    notes: string | null;
  }> = [];

  for (const [idx, item] of rawItems.entries()) {
    const menuItemId = item.menu_item_id ?? item.menuItemId;
    const quantity = Math.max(1, Math.floor(Number(item.quantity) || 1));
    if (typeof menuItemId !== 'string' || !menuItemId.trim()) {
      return err(c, 'VALIDATION_ERROR', `Item ${idx + 1}: menu_item_id is required`, 422);
    }

    const { data: menuItem, error: menuErr } = await supabase
      .from('menu_items')
      .select('id, name, price')
      .eq('id', menuItemId)
      .eq('tenant_id', tenant.id)
      .single();
    if (menuErr || !menuItem) {
      return err(c, 'NOT_FOUND', `Item ${idx + 1}: menu item not found`, 404);
    }

    // Modifier pricing comes from the DB, never the client. Each modifier
    // must belong to one of this item's modifier groups.
    const rawMods = Array.isArray(item.modifiers) ? item.modifiers : [];
    const modifierIds = rawMods
      .map((m: any) => m?.modifier_id ?? m?.modifierId)
      .filter((id: any) => typeof id === 'string' && id.length > 0);
    let modTotal = 0;
    if (modifierIds.length > 0) {
      const { data: modRows, error: modErr } = await supabase
        .from('modifiers')
        .select('id, price_adjustment, modifier_groups!inner(menu_item_id)')
        .in('id', modifierIds);
      if (modErr || !modRows || modRows.length !== modifierIds.length) {
        return err(c, 'VALIDATION_ERROR', `Item ${idx + 1}: invalid modifier selection`, 422);
      }
      for (const row of modRows as any[]) {
        const group = Array.isArray(row.modifier_groups) ? row.modifier_groups[0] : row.modifier_groups;
        if (!group || group.menu_item_id !== menuItemId) {
          return err(c, 'VALIDATION_ERROR', `Item ${idx + 1}: modifier does not belong to this menu item`, 422);
        }
        modTotal += Math.floor(Number(row.price_adjustment) || 0);
      }
    }

    const unitPrice = Math.max(0, Math.floor(Number(menuItem.price) || 0) + modTotal);
    pricedItems.push({
      menu_item_id: menuItemId,
      name: item.name ?? menuItem.name ?? 'Item',
      quantity,
      unit_price: unitPrice,
      line_total: unitPrice * quantity,
      station: item.station ?? 'hot',
      course_number: item.course_number ?? 1,
      sort_order: idx,
      notes: item.notes ?? null,
    });
  }

  const subtotal = pricedItems.reduce((sum, i) => sum + i.line_total, 0);
  const taxResult = calculateMultiRateTax(
    pricedItems.map((i) => ({ name: i.name, station: i.station, lineTotalCents: i.line_total }))
  );
  const deliveryFee = Math.max(0, Math.floor(Number(body.deliveryFee) || 0));
  const tip = Math.max(0, Math.floor(Number(body.tip) || 0));
  const total = taxResult.totalCents + deliveryFee + tip;

  const { data: order, error: orderErr } = await supabase
    .from('pos_orders')
    .insert({
      tenant_id: tenant.id,
      table_number: null,
      cover_count: 1,
      server_name: 'Online',
      status: 'open',
      subtotal,
      tax: taxResult.totalTaxCents,
      total,
      notes: body.customer
        ? `Online ${body.mode ?? 'pickup'}: ${body.customer.name ?? ''} ${body.customer.phone ?? ''}`
        : `Online ${body.mode ?? 'pickup'}`,
    })
    .select()
    .single();

  if (orderErr || !order) return err(c, 'DB_ERROR', orderErr?.message ?? 'Failed to create order', 500);

  if (pricedItems.length > 0) {
    const { error: itemsErr } = await supabase
      .from('pos_order_line_items')
      .insert(pricedItems.map((i) => ({ ...i, tenant_id: tenant.id, order_id: order.id })));
    if (itemsErr) return err(c, 'DB_ERROR', itemsErr.message, 500);
  }

  return ok(c, { ...order, tenant_slug: tenant.slug }, 201);
});

export default onlineOrdersRoutes;
