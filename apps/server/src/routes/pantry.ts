// ============================================================
// CulinaryOS — Pantry Routes
// GET    /v1/pantry                     — list all pantry items
// GET    /v1/pantry/purchase-orders     — list all purchase orders
// POST   /v1/pantry/purchase-orders     — create purchase order (or auto-generate)
// POST   /v1/pantry/purchase-orders/auto-generate — auto-generate PO for low stock items
// PATCH  /v1/pantry/purchase-orders/:id/approve — approve PO
// PATCH  /v1/pantry/purchase-orders/:id/send    — send PO
// DELETE /v1/pantry/purchase-orders/:id         — cancel PO
// GET    /v1/pantry/:id                 — get single item
// POST   /v1/pantry                     — create item
// PATCH  /v1/pantry/:id                 — update item
// DELETE /v1/pantry/:id                 — delete item
// POST   /v1/pantry/deduct              — deduct quantity (called by RecipeOS handler)
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

// Local Mock Purchase Orders State
let mockPurchaseOrders: Array<{
  id: string;
  po_number: string;
  status: 'draft' | 'approved' | 'sent' | 'received' | 'cancelled';
  supplier: string | null;
  total_cost: number;
  created_at: string;
  approved_at: string | null;
  sent_at: string | null;
  received_at: string | null;
  po_line_items: Array<{
    id: string;
    ingredient_name: string;
    unit: string;
    ordered_qty: number;
    received_qty: number;
    unit_cost: number;
  }>;
}> = [
  {
    id: 'po-1001',
    po_number: 'PO-2026-0001',
    status: 'draft',
    supplier: 'Grain & Mill Distributors',
    total_cost: 7500,
    created_at: new Date().toISOString(),
    approved_at: null,
    sent_at: null,
    received_at: null,
    po_line_items: [
      {
        id: 'poli-1',
        ingredient_name: 'Unbleached Bread Flour',
        unit: 'kg',
        ordered_qty: 37.5,
        received_qty: 0,
        unit_cost: 200,
      },
    ],
  },
];

// Helper: Generate Auto Purchase Order Object
function generateAutoPOFromItems(items: typeof mockPantry) {
  const lowStock = items.filter((i) => (i.stock_quantity ?? 0) <= (i.par_level ?? 0));
  const itemsToOrder = lowStock.length > 0 ? lowStock : items;

  const lineItems = itemsToOrder.map((item, idx) => {
    const needed = Math.max(10, Math.ceil((item.par_level ?? 50) - (item.stock_quantity ?? 0)));
    return {
      id: `poli-${Date.now()}-${idx}`,
      ingredient_name: item.name,
      unit: item.unit ?? 'pcs',
      ordered_qty: needed,
      received_qty: 0,
      unit_cost: item.cost_per_unit ?? 100,
    };
  });

  const totalCost = lineItems.reduce((sum, l) => sum + l.ordered_qty * l.unit_cost, 0);
  const poNumber = `PO-2026-${String(mockPurchaseOrders.length + 1).padStart(4, '0')}`;

  return {
    id: `po-${Date.now()}`,
    po_number: poNumber,
    status: 'draft' as const,
    supplier: 'Auto Restock Supplier',
    total_cost: totalCost,
    created_at: new Date().toISOString(),
    approved_at: null,
    sent_at: null,
    received_at: null,
    po_line_items: lineItems,
  };
}

// ------------------------------------------------------------
// Purchase Orders Endpoints
// ------------------------------------------------------------

// GET /v1/pantry/purchase-orders
pantryRoutes.get('/purchase-orders', async (c) => {
  const supabase = c.get('supabase');
  const tenantId = c.get('tenantId');

  if (!supabase) {
    return ok(c, mockPurchaseOrders);
  }

  const { data, error } = await supabase
    .from('restock_purchase_orders')
    .select('*, po_line_items(*)')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (error) return err(c, 'DB_ERROR', error.message, 500);
  return ok(c, data ?? []);
});

// POST /v1/pantry/purchase-orders/auto-generate
pantryRoutes.post('/purchase-orders/auto-generate', async (c) => {
  const supabase = c.get('supabase');
  const tenantId = c.get('tenantId');

  if (!supabase) {
    const newPO = generateAutoPOFromItems(mockPantry);
    mockPurchaseOrders.unshift(newPO);
    return ok(c, newPO, 201);
  }

  // Live DB auto PO generation
  const { data: items, error: itemsErr } = await supabase
    .from('pantry_items')
    .select('*')
    .eq('tenant_id', tenantId);

  if (itemsErr) return err(c, 'DB_ERROR', itemsErr.message, 500);

  const lowStock = (items ?? []).filter((i: any) => (i.stock_quantity ?? 0) <= (i.par_level ?? 0));
  const itemsToOrder = lowStock.length > 0 ? lowStock : (items ?? []);

  const poNumber = `PO-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
  const { data: po, error: poErr } = await supabase
    .from('restock_purchase_orders')
    .insert({
      tenant_id: tenantId,
      po_number: poNumber,
      status: 'draft',
      supplier: 'Auto Restock Supplier',
      created_by: 'system',
    })
    .select()
    .single();

  if (poErr || !po) return err(c, 'DB_ERROR', poErr?.message ?? 'Failed to create PO', 500);

  const lineItemsData = itemsToOrder.map((item: any) => ({
    po_id: po.id,
    ingredient_id: item.id,
    ingredient_name: item.name,
    unit: item.unit ?? 'pcs',
    ordered_qty: Math.max(10, Math.ceil((item.par_level ?? 50) - (item.stock_quantity ?? 0))),
    unit_cost: item.cost_per_unit ?? 0,
  }));

  const { data: lines, error: lineErr } = await supabase
    .from('po_line_items')
    .insert(lineItemsData)
    .select();

  if (lineErr) return err(c, 'DB_ERROR', lineErr.message, 500);

  return ok(c, { ...po, po_line_items: lines ?? [] }, 201);
});

// POST /v1/pantry/purchase-orders
pantryRoutes.post('/purchase-orders', async (c) => {
  const supabase = c.get('supabase');
  const tenantId = c.get('tenantId');
  let body: any = {};
  try {
    body = await c.req.json();
  } catch {}

  if (body?.auto) {
    if (!supabase) {
      const newPO = generateAutoPOFromItems(mockPantry);
      mockPurchaseOrders.unshift(newPO);
      return ok(c, newPO, 201);
    }

    const { data: items, error: itemsErr } = await supabase
      .from('pantry_items')
      .select('*')
      .eq('tenant_id', tenantId);

    if (itemsErr) return err(c, 'DB_ERROR', itemsErr.message, 500);

    const lowStock = (items ?? []).filter((i: any) => (i.stock_quantity ?? 0) <= (i.par_level ?? 0));
    const itemsToOrder = lowStock.length > 0 ? lowStock : (items ?? []);

    const poNumber = `PO-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
    const { data: po, error: poErr } = await supabase
      .from('restock_purchase_orders')
      .insert({
        tenant_id: tenantId,
        po_number: poNumber,
        status: 'draft',
        supplier: 'Auto Restock Supplier',
        created_by: 'system',
      })
      .select()
      .single();

    if (poErr || !po) return err(c, 'DB_ERROR', poErr?.message ?? 'Failed to create PO', 500);

    const lineItemsData = itemsToOrder.map((item: any) => ({
      po_id: po.id,
      ingredient_id: item.id,
      ingredient_name: item.name,
      unit: item.unit ?? 'pcs',
      ordered_qty: Math.max(10, Math.ceil((item.par_level ?? 50) - (item.stock_quantity ?? 0))),
      unit_cost: item.cost_per_unit ?? 0,
    }));

    const { data: lines, error: lineErr } = await supabase
      .from('po_line_items')
      .insert(lineItemsData)
      .select();

    if (lineErr) return err(c, 'DB_ERROR', lineErr.message, 500);

    return ok(c, { ...po, po_line_items: lines ?? [] }, 201);
  }

  if (!supabase) {
    const lineItems = (body.line_items ?? body.po_line_items ?? []).map((l: any, idx: number) => ({
      id: `poli-${Date.now()}-${idx}`,
      ingredient_name: l.ingredient_name ?? l.name ?? 'Item',
      unit: l.unit ?? 'pcs',
      ordered_qty: l.ordered_qty ?? l.quantity ?? 1,
      received_qty: 0,
      unit_cost: l.unit_cost ?? l.cost_per_unit ?? 0,
    }));

    const totalCost = lineItems.reduce((sum: number, l: any) => sum + l.ordered_qty * l.unit_cost, 0);
    const newPO = {
      id: `po-${Date.now()}`,
      po_number: body.po_number ?? `PO-2026-${String(mockPurchaseOrders.length + 1).padStart(4, '0')}`,
      status: 'draft' as const,
      supplier: body.supplier ?? null,
      total_cost: totalCost,
      created_at: new Date().toISOString(),
      approved_at: null,
      sent_at: null,
      received_at: null,
      po_line_items: lineItems,
    };
    mockPurchaseOrders.unshift(newPO);
    return ok(c, newPO, 201);
  }

  const poNumber = body.po_number ?? `PO-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
  const { data: po, error: poErr } = await supabase
    .from('restock_purchase_orders')
    .insert({
      tenant_id: tenantId,
      po_number: poNumber,
      status: 'draft',
      supplier: body.supplier ?? null,
      notes: body.notes ?? null,
      created_by: 'system',
    })
    .select()
    .single();

  if (poErr || !po) return err(c, 'DB_ERROR', poErr?.message ?? 'Failed to create PO', 500);

  const rawLines = body.line_items ?? body.po_line_items ?? [];
  if (rawLines.length > 0) {
    const lineItemsData = rawLines.map((l: any) => ({
      po_id: po.id,
      ingredient_id: l.ingredient_id ?? l.id,
      ingredient_name: l.ingredient_name ?? l.name,
      unit: l.unit ?? 'pcs',
      ordered_qty: l.ordered_qty ?? l.quantity ?? 1,
      unit_cost: l.unit_cost ?? 0,
    }));
    await supabase.from('po_line_items').insert(lineItemsData);
  }

  const { data: fullPO } = await supabase
    .from('restock_purchase_orders')
    .select('*, po_line_items(*)')
    .eq('id', po.id)
    .single();

  return ok(c, fullPO ?? po, 201);
});

// PATCH /v1/pantry/purchase-orders/:id/approve
pantryRoutes.patch('/purchase-orders/:id/approve', async (c) => {
  const supabase = c.get('supabase');
  const tenantId = c.get('tenantId');
  const { id } = c.req.param();

  if (!supabase) {
    const po = mockPurchaseOrders.find((p) => p.id === id);
    if (!po) return err(c, 'NOT_FOUND', `Purchase order ${id} not found`, 404);
    po.status = 'approved';
    po.approved_at = new Date().toISOString();
    return ok(c, po);
  }

  const { data, error } = await supabase
    .from('restock_purchase_orders')
    .update({
      status: 'approved',
      approved_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select('*, po_line_items(*)')
    .single();

  if (error || !data) return err(c, 'NOT_FOUND', `Purchase order ${id} not found`, 404);
  return ok(c, data);
});

// PATCH /v1/pantry/purchase-orders/:id/send
pantryRoutes.patch('/purchase-orders/:id/send', async (c) => {
  const supabase = c.get('supabase');
  const tenantId = c.get('tenantId');
  const { id } = c.req.param();

  if (!supabase) {
    const po = mockPurchaseOrders.find((p) => p.id === id);
    if (!po) return err(c, 'NOT_FOUND', `Purchase order ${id} not found`, 404);
    po.status = 'sent';
    po.sent_at = new Date().toISOString();
    return ok(c, po);
  }

  const { data, error } = await supabase
    .from('restock_purchase_orders')
    .update({
      status: 'sent',
      sent_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select('*, po_line_items(*)')
    .single();

  if (error || !data) return err(c, 'NOT_FOUND', `Purchase order ${id} not found`, 404);
  return ok(c, data);
});

// DELETE /v1/pantry/purchase-orders/:id
pantryRoutes.delete('/purchase-orders/:id', async (c) => {
  const supabase = c.get('supabase');
  const tenantId = c.get('tenantId');
  const { id } = c.req.param();

  if (!supabase) {
    const po = mockPurchaseOrders.find((p) => p.id === id);
    if (po) {
      po.status = 'cancelled';
    }
    mockPurchaseOrders = mockPurchaseOrders.filter((p) => p.id !== id);
    return ok(c, { success: true });
  }

  const { error } = await supabase
    .from('restock_purchase_orders')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenantId);

  if (error) return err(c, 'NOT_FOUND', `Purchase order ${id} not found`, 404);
  return ok(c, { success: true });
});

// ------------------------------------------------------------
// General Pantry Items Endpoints
// ------------------------------------------------------------

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

  if (error || !data) return err(c, 'NOT_FOUND', `Pantry item ${id} not found`, 404);
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
  const tenantId = c.get('tenantId');
  const body     = await c.req.json();

  if (!body.itemId) return err(c, 'VALIDATION_ERROR', 'itemId is required', 422);

  if (!supabase) {
    const item = mockPantry.find(p => p.id === body.itemId);
    if (item) {
      item.stock_quantity = Math.max(0, item.stock_quantity - (body.quantity ?? 0));
    }
    return ok(c, { success: true });
  }

  // Verify item belongs to tenant before decrement
  const { data: item, error: itemErr } = await supabase
    .from('pantry_items')
    .select('id')
    .eq('id', body.itemId)
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (itemErr || !item) {
    // Also try ingredients table (RecipeOS pantry)
    const { data: ingredient } = await supabase
      .from('ingredients')
      .select('id')
      .eq('id', body.itemId)
      .eq('tenant_id', tenantId)
      .maybeSingle();
    if (!ingredient) return err(c, 'NOT_FOUND', `Pantry item ${body.itemId} not found`, 404);
  }

  const { error } = await supabase.rpc('decrement_pantry_stock', {
    item_id: body.itemId,
    qty:     body.quantity,
    p_tenant_id: tenantId,
  });

  if (error) {
    // Fallback if RPC signature has no tenant arg yet
    const { error: err2 } = await supabase.rpc('decrement_pantry_stock', {
      item_id: body.itemId,
      qty:     body.quantity,
    });
    if (err2) return err(c, 'DB_ERROR', err2.message, 500);
  }
  return ok(c, { success: true });
});

export default pantryRoutes;
