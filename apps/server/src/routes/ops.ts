// ============================================================
// CulinaryOS — Ops routes (CulinaryOps MCP live bridge)
// Waste, food-cost, plate economics — tenant-scoped.
// ============================================================

import { Hono } from 'hono';
import type { Env } from '../types.js';
import { requireTenant, ok, err } from '../middleware/auth.js';

export const opsRoutes = new Hono<Env>();
opsRoutes.use('*', requireTenant);

const WASTE_REASONS = new Set([
  'spoilage',
  'trim',
  'overcook',
  'drop',
  'expired',
  'other',
  'sale',
]);

// POST /v1/ops/waste
opsRoutes.post('/waste', async (c) => {
  const tenantId = c.get('tenantId');
  const supabase = c.get('supabase');
  const body = await c.req.json<{
    ingredient: string;
    quantity_grams: number;
    cost_per_gram?: number;
    reason: string;
    log_date?: string;
    notes?: string;
  }>();

  if (!body.ingredient || body.quantity_grams == null || !body.reason) {
    return err(c, 'VALIDATION_ERROR', 'ingredient, quantity_grams, reason required', 422);
  }
  if (!WASTE_REASONS.has(body.reason)) {
    return err(c, 'VALIDATION_ERROR', `reason must be one of ${[...WASTE_REASONS].join(', ')}`, 422);
  }

  const costPerGram = Number(body.cost_per_gram ?? 0);
  const qty = Number(body.quantity_grams);
  const wasteCost = Math.round(qty * costPerGram * 100) / 100;

  if (!supabase) {
    return ok(
      c,
      {
        demo: true,
        id: crypto.randomUUID(),
        tenant_id: tenantId,
        ingredient: body.ingredient,
        quantity_grams: qty,
        cost_per_gram: costPerGram,
        waste_cost: wasteCost,
        reason: body.reason,
        notes: body.notes ?? null,
        log_date: body.log_date ?? new Date().toISOString().slice(0, 10),
      },
      201
    );
  }

  const { data, error } = await supabase
    .from('waste_events')
    .insert({
      tenant_id: tenantId,
      ingredient: body.ingredient,
      quantity_grams: qty,
      cost_per_gram: costPerGram,
      waste_cost: wasteCost,
      reason: body.reason,
      notes: body.notes ?? null,
      log_date: body.log_date ?? new Date().toISOString().slice(0, 10),
      created_by: c.get('userId') ?? null,
    })
    .select()
    .single();

  if (error) return err(c, 'DB_ERROR', error.message, 500);

  // Best-effort pantry ledger when ingredient name matches
  const { data: ing } = await supabase
    .from('ingredients')
    .select('id, cost_per_unit')
    .eq('tenant_id', tenantId)
    .ilike('name', body.ingredient)
    .maybeSingle();

  if (ing?.id) {
    try {
      await supabase.from('pantry_ledger').insert({
        tenant_id: tenantId,
        ingredient_id: ing.id,
        delta: -(qty / 1000), // grams → kg-ish unit; ledger units vary by ingredient
        reason: 'waste',
        reference_id: data.id,
      });
    } catch {
      // best-effort
    }
  }

  return ok(c, data, 201);
});

// GET /v1/ops/waste/summary?from=&to=
opsRoutes.get('/waste/summary', async (c) => {
  const tenantId = c.get('tenantId');
  const supabase = c.get('supabase');
  const dateFrom = c.req.query('from') ?? c.req.query('date_from');
  const dateTo = c.req.query('to') ?? c.req.query('date_to');

  if (!supabase) {
    return ok(c, {
      demo: true,
      date_from: dateFrom,
      date_to: dateTo,
      log_count: 0,
      total_cost: 0,
      total_grams: 0,
      top_offenders: [],
    });
  }

  let q = supabase.from('waste_events').select('*').eq('tenant_id', tenantId);
  if (dateFrom) q = q.gte('log_date', dateFrom);
  if (dateTo) q = q.lte('log_date', dateTo);
  const { data, error } = await q;
  if (error) return err(c, 'DB_ERROR', error.message, 500);

  const rows = data ?? [];
  const byIng = new Map<string, { name: string; total_cost: number; grams: number }>();
  let totalCost = 0;
  let totalGrams = 0;
  for (const r of rows) {
    totalCost += Number(r.waste_cost) || 0;
    totalGrams += Number(r.quantity_grams) || 0;
    const cur = byIng.get(r.ingredient) ?? { name: r.ingredient, total_cost: 0, grams: 0 };
    cur.total_cost += Number(r.waste_cost) || 0;
    cur.grams += Number(r.quantity_grams) || 0;
    byIng.set(r.ingredient, cur);
  }
  const top = [...byIng.values()].sort((a, b) => b.total_cost - a.total_cost).slice(0, 5);

  return ok(c, {
    date_from: dateFrom,
    date_to: dateTo,
    log_count: rows.length,
    total_cost: Math.round(totalCost * 100) / 100,
    total_grams: totalGrams,
    top_offenders: top,
  });
});

// GET /v1/ops/food-cost/:itemId
opsRoutes.get('/food-cost/:itemId', async (c) => {
  const tenantId = c.get('tenantId');
  const supabase = c.get('supabase');
  const itemId = c.req.param('itemId');

  if (!supabase) {
    return ok(c, {
      demo: true,
      item_id: itemId,
      name: 'Demo item',
      sale_price: 14,
      ingredient_cost: 4.15,
      food_cost_pct: 29.64,
      status: 'good',
    });
  }

  const { data: item } = await supabase
    .from('menu_items')
    .select('id, name, price')
    .eq('id', itemId)
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (!item) return err(c, 'NOT_FOUND', 'Menu item not found', 404);

  const { data: link } = await supabase
    .from('menu_item_recipes')
    .select('recipe_id')
    .eq('tenant_id', tenantId)
    .eq('menu_item_id', itemId)
    .maybeSingle();

  let ingredientCost = 0;
  if (link?.recipe_id) {
    const { data: ris } = await supabase
      .from('recipe_ingredients')
      .select('quantity, ingredient_id, ingredients(cost_per_unit, name)')
      .eq('recipe_id', link.recipe_id);

    for (const ri of ris ?? []) {
      const cost = Number((ri as any).ingredients?.cost_per_unit ?? 0);
      ingredientCost += Number(ri.quantity) * cost;
    }
  }

  // Fallback: average theoretical cost from recent plate_economics
  if (!ingredientCost) {
    const { data: econ } = await supabase
      .from('plate_economics')
      .select('theoretical_cost_cents')
      .eq('tenant_id', tenantId)
      .eq('menu_item_id', itemId)
      .order('created_at', { ascending: false })
      .limit(20);
    if (econ?.length) {
      const avg =
        econ.reduce((s, e) => s + (e.theoretical_cost_cents ?? 0), 0) / econ.length;
      ingredientCost = avg / 100;
    }
  }

  const salePrice = (item.price ?? 0) / 100;
  const pct = salePrice > 0 ? Math.round((ingredientCost / salePrice) * 10000) / 100 : 0;
  const status = pct === 0 ? 'unknown' : pct <= 30 ? 'good' : pct <= 35 ? 'watch' : 'high';

  return ok(c, {
    item_id: itemId,
    name: item.name,
    sale_price: salePrice,
    ingredient_cost: Math.round(ingredientCost * 100) / 100,
    food_cost_pct: pct,
    status,
  });
});

// GET /v1/ops/plate-economics?order_id=
opsRoutes.get('/plate-economics', async (c) => {
  const tenantId = c.get('tenantId');
  const supabase = c.get('supabase');
  const orderId = c.req.query('order_id');

  if (!supabase) return ok(c, { demo: true, rows: [] });

  let q = supabase.from('plate_economics').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(100);
  if (orderId) q = q.eq('order_id', orderId);
  const { data, error } = await q;
  if (error) return err(c, 'DB_ERROR', error.message, 500);
  return ok(c, { rows: data ?? [] });
});

// In-memory loyalty mock store for demo mode
const mockLoyaltyPoints = new Map<string, number>();

// POST /v1/ops/loyalty/adjust-points
opsRoutes.post('/loyalty/adjust-points', async (c) => {
  const tenantId = c.get('tenantId');
  const supabase = c.get('supabase');
  const body = await c.req.json<{
    customerId: string;
    pointsDelta: number;
    reason: string;
  }>();

  if (!body.customerId || body.pointsDelta == null) {
    return err(c, 'VALIDATION_ERROR', 'customerId and pointsDelta are required', 422);
  }

  const current = mockLoyaltyPoints.get(body.customerId) ?? 100;
  const newBalance = Math.max(0, current + Number(body.pointsDelta));
  mockLoyaltyPoints.set(body.customerId, newBalance);

  if (!supabase) {
    return ok(c, {
      demo: true,
      customerId: body.customerId,
      pointsDelta: Number(body.pointsDelta),
      newBalance,
      reason: body.reason ?? 'manual_adjustment',
    });
  }

  // Live Supabase update if customer_loyalty table is available
  try {
    const { data: existing } = await supabase
      .from('customers')
      .select('id, loyalty_points')
      .eq('id', body.customerId)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (existing) {
      const balance = (existing.loyalty_points ?? 0) + Number(body.pointsDelta);
      await supabase
        .from('customers')
        .update({ loyalty_points: balance })
        .eq('id', body.customerId)
        .eq('tenant_id', tenantId);

      return ok(c, {
        customerId: body.customerId,
        pointsDelta: Number(body.pointsDelta),
        newBalance: balance,
        reason: body.reason ?? 'manual_adjustment',
      });
    }
  } catch {
    // Fallback to in-memory calculation
  }

  return ok(c, {
    customerId: body.customerId,
    pointsDelta: Number(body.pointsDelta),
    newBalance,
    reason: body.reason ?? 'manual_adjustment',
  });
});

// POST /v1/ops/loyalty/postcard
opsRoutes.post('/loyalty/postcard', async (c) => {
  const body = await c.req.json<{
    customerName: string;
    address: string;
    discountPercent: number;
    couponMessage?: string;
  }>();

  if (!body.customerName || !body.address || body.discountPercent == null) {
    return err(c, 'VALIDATION_ERROR', 'customerName, address, and discountPercent are required', 422);
  }

  const couponCode = `SAVE${Math.round(body.discountPercent)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  const postcardId = `post-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  return ok(c, {
    postcardId,
    couponCode,
    customerName: body.customerName,
    address: body.address,
    discountPercent: body.discountPercent,
    couponMessage: body.couponMessage ?? `Enjoy ${body.discountPercent}% off your next visit!`,
    status: 'queued',
    createdAt: new Date().toISOString(),
  }, 201);
});
