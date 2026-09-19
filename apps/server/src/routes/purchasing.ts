// ============================================================
// CulinaryOS — Purchasing & Distributor Routes
// Parity with ShorelineOps purchasing architecture.
// Supports Dennis Food Service, Sysco, US Foods, Local Purveyors.
// Endpoints:
//   GET    /v1/purchasing/vendors
//   POST   /v1/purchasing/vendors
//   PUT    /v1/purchasing/vendors/:id
//   GET    /v1/purchasing/items
//   POST   /v1/purchasing/items
//   PUT    /v1/purchasing/items/:id
//   DELETE /v1/purchasing/items/:id
//   GET    /v1/purchasing/order-guide
//   POST   /v1/purchasing/order-guide
//   PUT    /v1/purchasing/order-guide/:id
//   DELETE /v1/purchasing/order-guide/:id
//   POST   /v1/purchasing/import-guide
//   POST   /v1/purchasing/suggested-order
//   POST   /v1/purchasing/split-mrp-optimizer
//   GET    /v1/purchasing/orders
//   POST   /v1/purchasing/orders
//   GET    /v1/purchasing/orders/:id
//   POST   /v1/purchasing/orders/:id/approve
//   POST   /v1/purchasing/orders/:id/submit
//   POST   /v1/purchasing/orders/:id/lines/:lineId/receive
// ============================================================

import { Hono } from 'hono';
import { randomUUID } from 'crypto';
import type { Env } from '../types.js';
import {
  calculateSuggestedOrder,
  optimizeLowestCostSplit,
  parseBroadlineCatalogCsv,
  type Vendor,
  type VendorItem,
  type OrderGuideEntry,
  type PurchaseOrder,
  type PurchaseOrderLine,
} from '@culinaryos/shared';

export const purchasingRoutes = new Hono<Env>();

// ── In-Memory Default / Demo State (Always available offline / local) ─────────

const initialVendors: Vendor[] = [
  {
    id: 'dennis-1',
    name: 'Dennis Food Service',
    code: 'dennis',
    phone: '1-800-439-2727',
    email: 'orders@dennisfoodservice.com',
    website: 'https://dennisfoodservice.com',
    notes: 'Primary Broadline Distributor — Maine & Northern New England',
    active: true,
  },
  {
    id: 'sysco-1',
    name: 'Sysco Foods',
    code: 'sysco',
    phone: '1-800-555-0199',
    email: 'orders@sysco.com',
    website: 'https://sysco.com',
    notes: 'Secondary Broadline Distributor — Dry Goods & Frozen',
    active: true,
  },
  {
    id: 'usfoods-1',
    name: 'US Foods',
    code: 'usfoods',
    phone: '1-800-555-0200',
    email: 'orders@usfoods.com',
    website: 'https://usfoods.com',
    notes: 'Specialty Produce & Imported Cheeses',
    active: true,
  },
  {
    id: 'local-1',
    name: 'Hillside Organic Farm',
    code: 'local',
    phone: '1-207-555-4321',
    email: 'orders@hillsidefarm.org',
    website: 'https://hillsidefarm.org',
    notes: 'Direct farm purveyor: Heirloom vegetables & herbs',
    active: true,
  },
];

let vendorsStore: Vendor[] = [...initialVendors];

let catalogStore: VendorItem[] = [
  {
    id: 'vi-1',
    vendor_id: 'dennis-1',
    vendor_sku: 'DNS-1001',
    name: 'Peaches Diced in 100% Juice',
    brand: 'Dennis Select',
    pack_size: '6/#10 cans',
    uom: 'case',
    category: 'Canned Fruits',
    unit_cost: 48.50,
    active: true,
    vendor_name: 'Dennis Food Service',
    vendor_code: 'dennis',
  },
  {
    id: 'vi-2',
    vendor_id: 'dennis-1',
    vendor_sku: 'DNS-1002',
    name: 'Orange Juice Thickened Nectar',
    brand: 'Thick & Easy',
    pack_size: '12/32oz',
    uom: 'case',
    category: 'Thickened Beverages',
    unit_cost: 32.75,
    active: true,
    vendor_name: 'Dennis Food Service',
    vendor_code: 'dennis',
  },
  {
    id: 'vi-3',
    vendor_id: 'dennis-1',
    vendor_sku: 'DNS-1003',
    name: 'Pureed Green Beans',
    brand: 'Puree Supreme',
    pack_size: '24/4oz',
    uom: 'case',
    category: 'Pureed Foods',
    unit_cost: 29.90,
    active: true,
    vendor_name: 'Dennis Food Service',
    vendor_code: 'dennis',
  },
  {
    id: 'vi-4',
    vendor_id: 'dennis-1',
    vendor_sku: 'DNS-1004',
    name: 'Chicken Breast Boneless Skinless 4oz',
    brand: 'Dennis Farms',
    pack_size: '40/4oz',
    uom: 'case',
    category: 'Poultry & Meat',
    unit_cost: 64.20,
    active: true,
    vendor_name: 'Dennis Food Service',
    vendor_code: 'dennis',
  },
  {
    id: 'vi-sys-1',
    vendor_id: 'sysco-1',
    vendor_sku: 'SYS-782194',
    name: 'Flour All-Purpose High Gluten 50lb',
    brand: 'Sysco Classic',
    pack_size: '50 LB BAG',
    uom: 'bag',
    category: 'Dry Goods',
    unit_cost: 24.50,
    active: true,
    vendor_name: 'Sysco Foods',
    vendor_code: 'sysco',
  },
  {
    id: 'vi-sys-2',
    vendor_id: 'sysco-1',
    vendor_sku: 'SYS-109283',
    name: 'Butter Unsalted Solid Grade AA 36lb',
    brand: 'Sysco Imperial',
    pack_size: '36/1 LB CS',
    uom: 'case',
    category: 'Dairy',
    unit_cost: 118.00,
    active: true,
    vendor_name: 'Sysco Foods',
    vendor_code: 'sysco',
  },
];

let orderGuideStore: OrderGuideEntry[] = [
  {
    id: 'og-1',
    vendor_id: 'dennis-1',
    vendor_item_id: 'vi-1',
    item_name: 'Peaches Diced in 100% Juice',
    vendor_sku: 'DNS-1001',
    pack_size: '6/#10 cans',
    uom: 'case',
    par_level: 5,
    on_hand: 2,
    unit_cost: 48.50,
    category: 'Canned Fruits',
    vendor_name: 'Dennis Food Service',
    vendor_code: 'dennis',
  },
  {
    id: 'og-2',
    vendor_id: 'dennis-1',
    vendor_item_id: 'vi-2',
    item_name: 'Orange Juice Thickened Nectar',
    vendor_sku: 'DNS-1002',
    pack_size: '12/32oz',
    uom: 'case',
    par_level: 4,
    on_hand: 2,
    unit_cost: 32.75,
    category: 'Thickened Beverages',
    vendor_name: 'Dennis Food Service',
    vendor_code: 'dennis',
  },
  {
    id: 'og-3',
    vendor_id: 'dennis-1',
    vendor_item_id: 'vi-3',
    item_name: 'Pureed Green Beans',
    vendor_sku: 'DNS-1003',
    pack_size: '24/4oz',
    uom: 'case',
    par_level: 3,
    on_hand: 1,
    unit_cost: 29.90,
    category: 'Pureed Foods',
    vendor_name: 'Dennis Food Service',
    vendor_code: 'dennis',
  },
  {
    id: 'og-4',
    vendor_id: 'sysco-1',
    vendor_item_id: 'vi-sys-1',
    item_name: 'Flour All-Purpose High Gluten 50lb',
    vendor_sku: 'SYS-782194',
    pack_size: '50 LB BAG',
    uom: 'bag',
    par_level: 8,
    on_hand: 3,
    unit_cost: 24.50,
    category: 'Dry Goods',
    vendor_name: 'Sysco Foods',
    vendor_code: 'sysco',
  },
];

let purchaseOrdersStore: PurchaseOrder[] = [
  {
    id: 'po-demo-01',
    vendor_id: 'dennis-1',
    vendor_name: 'Dennis Food Service',
    vendor_code: 'dennis',
    status: 'draft',
    order_date: new Date().toISOString().slice(0, 10),
    expected_date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
    notes: 'Weekly standard delivery from order guide',
    created_by: 'system',
    created_by_name: 'Kitchen Manager',
    created_at: new Date().toISOString(),
    lines: [
      {
        id: 'pol-1',
        purchase_order_id: 'po-demo-01',
        vendor_item_id: 'vi-1',
        item_name: 'Peaches Diced in 100% Juice',
        vendor_sku: 'DNS-1001',
        pack_size: '6/#10 cans',
        uom: 'case',
        qty_ordered: 3,
        qty_received: 0,
        unit_cost: 48.50,
      },
      {
        id: 'pol-2',
        purchase_order_id: 'po-demo-01',
        vendor_item_id: 'vi-2',
        item_name: 'Orange Juice Thickened Nectar',
        vendor_sku: 'DNS-1002',
        pack_size: '12/32oz',
        uom: 'case',
        qty_ordered: 2,
        qty_received: 0,
        unit_cost: 32.75,
      },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// 1. VENDORS
// ═══════════════════════════════════════════════════════════════════════════

purchasingRoutes.get('/vendors', (c) => {
  return c.json(vendorsStore);
});

purchasingRoutes.post('/vendors', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { name, code, phone = '', email = '', website = '', notes = '' } = body;
  if (!name || !code) {
    return c.json({ error: 'name and code are required' }, 400);
  }

  const newVendor: Vendor = {
    id: `vendor-${randomUUID().slice(0, 8)}`,
    name,
    code: code.toLowerCase().replace(/\s+/g, '-'),
    phone,
    email,
    website,
    notes,
    active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  vendorsStore.push(newVendor);
  return c.json(newVendor, 201);
});

purchasingRoutes.put('/vendors/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  const index = vendorsStore.findIndex(v => v.id === id);
  if (index === -1) {
    return c.json({ error: 'Vendor not found' }, 404);
  }

  vendorsStore[index] = {
    ...vendorsStore[index]!,
    ...body,
    updated_at: new Date().toISOString(),
  };

  return c.json(vendorsStore[index]);
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. VENDOR ITEMS (Catalog)
// ═══════════════════════════════════════════════════════════════════════════

purchasingRoutes.get('/items', (c) => {
  const vendorId = c.req.query('vendorId');
  let items = catalogStore.filter(i => i.active);
  if (vendorId) {
    items = items.filter(i => i.vendor_id === vendorId);
  }
  return c.json(items);
});

purchasingRoutes.post('/items', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { vendorId, vendorSku, name, brand = '', packSize = '', uom = 'case', category = '', unitCost = 0 } = body;
  if (!vendorId || !vendorSku || !name) {
    return c.json({ error: 'vendorId, vendorSku, and name are required' }, 400);
  }

  const vendor = vendorsStore.find(v => v.id === vendorId);
  const newItem: VendorItem = {
    id: `vi-${randomUUID().slice(0, 8)}`,
    vendor_id: vendorId,
    vendor_sku: vendorSku,
    name,
    brand,
    pack_size: packSize,
    uom,
    category,
    unit_cost: Number(unitCost) || 0,
    active: true,
    vendor_name: vendor?.name || 'Distributor',
    vendor_code: vendor?.code || 'dist',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  catalogStore.push(newItem);
  return c.json(newItem, 201);
});

purchasingRoutes.put('/items/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  const index = catalogStore.findIndex(i => i.id === id);
  if (index === -1) {
    return c.json({ error: 'Item not found' }, 404);
  }

  catalogStore[index] = {
    ...catalogStore[index]!,
    ...body,
    updated_at: new Date().toISOString(),
  };

  return c.json(catalogStore[index]);
});

purchasingRoutes.delete('/items/:id', (c) => {
  const id = c.req.param('id');
  const item = catalogStore.find(i => i.id === id);
  if (!item) return c.json({ error: 'Item not found' }, 404);
  item.active = false;
  return c.json({ ok: true });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. ORDER GUIDE (Standing Pars & On-Hand)
// ═══════════════════════════════════════════════════════════════════════════

purchasingRoutes.get('/order-guide', (c) => {
  const vendorId = c.req.query('vendorId');
  let entries = orderGuideStore;
  if (vendorId) {
    entries = entries.filter(e => e.vendor_id === vendorId);
  }
  return c.json(entries);
});

purchasingRoutes.post('/order-guide', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { vendorId, vendorItemId, parLevel = 5, onHand = 0, sortGroup = '' } = body;
  if (!vendorId || !vendorItemId) {
    return c.json({ error: 'vendorId and vendorItemId required' }, 400);
  }

  const vItem = catalogStore.find(i => i.id === vendorItemId);
  const vendor = vendorsStore.find(v => v.id === vendorId);

  // Check if entry already exists
  const existing = orderGuideStore.find(e => e.vendor_item_id === vendorItemId);
  if (existing) {
    existing.par_level = Number(parLevel);
    existing.on_hand = Number(onHand);
    existing.sort_group = sortGroup || existing.sort_group;
    return c.json(existing, 200);
  }

  const newEntry: OrderGuideEntry = {
    id: `og-${randomUUID().slice(0, 8)}`,
    vendor_id: vendorId,
    vendor_item_id: vendorItemId,
    par_level: Number(parLevel),
    on_hand: Number(onHand),
    sort_group: sortGroup,
    item_name: vItem?.name || 'Item',
    vendor_sku: vItem?.vendor_sku || '',
    pack_size: vItem?.pack_size || 'case',
    uom: vItem?.uom || 'case',
    unit_cost: vItem?.unit_cost || 0,
    category: vItem?.category || 'General',
    vendor_name: vendor?.name || vItem?.vendor_name || 'Vendor',
    vendor_code: vendor?.code || vItem?.vendor_code || 'vend',
  };

  orderGuideStore.push(newEntry);
  return c.json(newEntry, 201);
});

purchasingRoutes.put('/order-guide/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  const entry = orderGuideStore.find(e => e.id === id);
  if (!entry) {
    return c.json({ error: 'Order guide entry not found' }, 404);
  }

  if (body.parLevel !== undefined) entry.par_level = Number(body.parLevel);
  if (body.onHand !== undefined) entry.on_hand = Number(body.onHand);
  if (body.avgUsage !== undefined) entry.avg_usage = Number(body.avgUsage);
  if (body.sortGroup !== undefined) entry.sort_group = body.sortGroup;

  return c.json(entry);
});

purchasingRoutes.delete('/order-guide/:id', (c) => {
  const id = c.req.param('id');
  const index = orderGuideStore.findIndex(e => e.id === id);
  if (index === -1) return c.json({ error: 'Order guide entry not found' }, 404);
  orderGuideStore.splice(index, 1);
  return c.json({ ok: true });
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. BATCH CSV IMPORT (Dennis Food Service / Broadline Ingestion)
// ═══════════════════════════════════════════════════════════════════════════

purchasingRoutes.post('/import-guide', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { vendorId, items = [], csvText } = body;
  if (!vendorId) return c.json({ error: 'vendorId required' }, 400);

  let parsedItems = items;
  if (csvText && typeof csvText === 'string') {
    try {
      parsedItems = parseBroadlineCatalogCsv(csvText);
    } catch (err: any) {
      return c.json({ error: err.message }, 400);
    }
  }

  if (!Array.isArray(parsedItems) || parsedItems.length === 0) {
    return c.json({ error: 'items array or valid csvText required' }, 400);
  }

  const vendor = vendorsStore.find(v => v.id === vendorId);
  let importedCount = 0;

  for (const item of parsedItems) {
    if (!item.vendorSku || !item.name) continue;

    // 1. Upsert into catalog
    let vItem = catalogStore.find(i => i.vendor_id === vendorId && i.vendor_sku === item.vendorSku);
    if (!vItem) {
      vItem = {
        id: `vi-${randomUUID().slice(0, 8)}`,
        vendor_id: vendorId,
        vendor_sku: item.vendorSku,
        name: item.name,
        brand: item.brand || 'Dennis Select',
        pack_size: item.packSize || 'case',
        uom: item.uom || 'case',
        category: item.category || 'Broadline',
        unit_cost: Number(item.unitCost) || 0,
        active: true,
        vendor_name: vendor?.name || 'Distributor',
        vendor_code: vendor?.code || 'dist',
      };
      catalogStore.push(vItem);
    } else {
      vItem.name = item.name;
      vItem.unit_cost = Number(item.unitCost) || vItem.unit_cost || 0;
    }

    // 2. Upsert into order guide
    let guide = orderGuideStore.find(g => g.vendor_item_id === vItem!.id);
    if (!guide) {
      const newGuide: OrderGuideEntry = {
        id: `og-${randomUUID().slice(0, 8)}`,
        vendor_id: vendorId,
        vendor_item_id: vItem.id,
        par_level: Number(item.parLevel) ?? 5,
        on_hand: Number(item.onHand) ?? 0,
        sort_group: item.category || '',
        item_name: vItem.name,
        vendor_sku: vItem.vendor_sku,
        pack_size: vItem.pack_size || 'case',
        uom: vItem.uom || 'case',
        unit_cost: vItem.unit_cost || 0,
        category: vItem.category || 'Broadline',
        vendor_name: vendor?.name || vItem.vendor_name || 'Vendor',
        vendor_code: vendor?.code || vItem.vendor_code || 'vend',
      };
      orderGuideStore.push(newGuide);
    } else {
      guide.par_level = Number(item.parLevel) ?? guide.par_level;
      guide.on_hand = Number(item.onHand) ?? guide.on_hand;
    }

    importedCount++;
  }

  return c.json({ ok: true, importedCount });
});

// ═══════════════════════════════════════════════════════════════════════════
// 5. SUGGESTED ORDER GENERATOR & SPLIT MRP OPTIMIZER
// ═══════════════════════════════════════════════════════════════════════════

purchasingRoutes.post('/suggested-order', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { vendorId } = body;
  if (!vendorId) return c.json({ error: 'vendorId required' }, 400);

  const vendor = vendorsStore.find(v => v.id === vendorId);
  const vendorGuides = orderGuideStore.filter(g => g.vendor_id === vendorId);

  const summary = calculateSuggestedOrder(vendorGuides, vendor?.name || 'Dennis Food Service');
  summary.vendorId = vendorId;
  summary.vendorName = vendor?.name || 'Dennis Food Service';

  return c.json(summary);
});

purchasingRoutes.post('/split-mrp-optimizer', (c) => {
  // Build map of vendor catalogs
  const catalogs = new Map<string, { vendorId: string; vendorName: string; items: VendorItem[] }>();
  for (const v of vendorsStore) {
    const items = catalogStore.filter(i => i.vendor_id === v.id && i.active);
    catalogs.set(v.id, {
      vendorId: v.id,
      vendorName: v.name,
      items,
    });
  }

  const result = optimizeLowestCostSplit(orderGuideStore, catalogs);

  // Serialize ordersByVendor for JSON transmission
  const splitOrders: Array<{
    vendorId: string;
    vendorName: string;
    lines: any[];
    vendorTotalCost: number;
  }> = [];

  for (const [vId, order] of result.ordersByVendor.entries()) {
    splitOrders.push({
      vendorId: vId,
      vendorName: order.vendorName,
      lines: order.lines,
      vendorTotalCost: Math.round(order.vendorTotalCost * 100) / 100,
    });
  }

  return c.json({
    ok: true,
    totalSplitCost: result.totalSplitCost,
    singleVendorBenchmarkCost: result.singleVendorBenchmarkCost,
    projectedSavings: result.projectedSavings,
    splitOrders,
    generatedAt: new Date().toISOString(),
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 6. PURCHASE ORDERS & INTERACTIVE RECEIVING
// ═══════════════════════════════════════════════════════════════════════════

purchasingRoutes.get('/orders', (c) => {
  return c.json(purchaseOrdersStore);
});

purchasingRoutes.post('/orders', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { vendorId, orderDate, expectedDate, notes = '', lines = [] } = body;
  if (!vendorId) return c.json({ error: 'vendorId required' }, 400);

  const vendor = vendorsStore.find(v => v.id === vendorId);
  const poId = `po-${randomUUID().slice(0, 8)}`;

  const poLines: PurchaseOrderLine[] = (lines as any[]).map((l, idx) => {
    const vItem = catalogStore.find(i => i.id === l.vendorItemId);
    const guide = orderGuideStore.find(g => g.vendor_item_id === l.vendorItemId);
    return {
      id: `pol-${poId}-${idx + 1}`,
      purchase_order_id: poId,
      vendor_item_id: l.vendorItemId,
      qty_ordered: Number(l.qtyOrdered || l.qty_ordered || 0),
      qty_received: 0,
      unit_cost: Number(l.unitCost ?? vItem?.unit_cost ?? 0),
      notes: l.notes || '',
      item_name: vItem?.name || l.itemName || 'Item',
      vendor_sku: vItem?.vendor_sku || l.vendorSku || '',
      pack_size: vItem?.pack_size || l.packSize || 'case',
      uom: vItem?.uom || l.uom || 'case',
      guide_id: guide?.id || null,
      guide_on_hand: guide ? Number(guide.on_hand) : null,
    };
  });

  const newPO: PurchaseOrder = {
    id: poId,
    vendor_id: vendorId,
    vendor_name: vendor?.name || 'Dennis Food Service',
    vendor_code: vendor?.code || 'dennis',
    status: 'draft',
    order_date: orderDate || new Date().toISOString().slice(0, 10),
    expected_date: expectedDate || null,
    notes,
    created_by: 'staff',
    created_by_name: 'Store Manager',
    created_at: new Date().toISOString(),
    lines: poLines,
  };

  purchaseOrdersStore.unshift(newPO);
  return c.json(newPO, 201);
});

purchasingRoutes.get('/orders/:id', (c) => {
  const id = c.req.param('id');
  const po = purchaseOrdersStore.find(o => o.id === id);
  if (!po) return c.json({ error: 'Order not found' }, 404);

  // Join current order guide matching state for each line
  const enrichedLines = (po.lines || []).map(line => {
    const guide = orderGuideStore.find(g => g.vendor_item_id === line.vendor_item_id);
    return {
      ...line,
      guide_id: guide?.id || null,
      guide_on_hand: guide ? Number(guide.on_hand) : null,
    };
  });

  return c.json({ ...po, lines: enrichedLines });
});

purchasingRoutes.post('/orders/:id/approve', (c) => {
  const id = c.req.param('id');
  const po = purchaseOrdersStore.find(o => o.id === id);
  if (!po) return c.json({ error: 'Order not found' }, 404);

  if (po.status !== 'draft') {
    return c.json({ error: `Only draft orders can be approved (current status: ${po.status})` }, 409);
  }

  po.status = 'approved';
  return c.json(po);
});

purchasingRoutes.post('/orders/:id/submit', (c) => {
  const id = c.req.param('id');
  const po = purchaseOrdersStore.find(o => o.id === id);
  if (!po) return c.json({ error: 'Order not found' }, 404);

  if (po.status !== 'approved') {
    return c.json({ error: `Only approved orders can be submitted (current status: ${po.status})` }, 409);
  }

  po.status = 'submitted';
  return c.json(po);
});

// ── Per-line interactive receiving with on-hand update ───────────────────────
purchasingRoutes.post('/orders/:id/lines/:lineId/receive', async (c) => {
  const orderId = c.req.param('id');
  const lineId = c.req.param('lineId');
  const body = await c.req.json().catch(() => ({}));
  const { qtyReceived } = body;

  const total = Number(qtyReceived);
  if (!Number.isFinite(total) || total < 0) {
    return c.json({ error: 'qtyReceived must be a non-negative number' }, 400);
  }

  const po = purchaseOrdersStore.find(o => o.id === orderId);
  if (!po) return c.json({ error: 'Purchase order not found' }, 404);

  const line = (po.lines || []).find(l => l.id === lineId);
  if (!line) return c.json({ error: 'PO line not found' }, 404);

  const guide = orderGuideStore.find(g => g.vendor_item_id === line.vendor_item_id);
  if (!guide) {
    return c.json({
      code: 'GUIDE_UNMATCHED',
      error: 'Line is not matched to an order guide entry — assign it before receiving',
      lineId,
      vendorItemId: line.vendor_item_id,
      vendorSku: line.vendor_sku,
      itemName: line.item_name,
    }, 409);
  }

  const prior = Number(line.qty_received ?? 0);
  const delta = Math.round((total - prior) * 100) / 100;

  // Update line quantity received
  line.qty_received = total;

  // Atomically update on-hand in order guide
  const guideBefore = Number(guide.on_hand ?? 0);
  const guideAfter = Math.round((guideBefore + delta) * 100) / 100;
  guide.on_hand = guideAfter;

  // If all lines are now received, promote order to 'received' or 'partial'
  const ordered = Number(line.qty_ordered ?? 0);
  const allFulfilled = (po.lines || []).every(l => Number(l.qty_received ?? 0) >= Number(l.qty_ordered ?? 0));
  const someReceived = (po.lines || []).some(l => Number(l.qty_received ?? 0) > 0);

  if (allFulfilled) {
    po.status = 'received';
  } else if (someReceived && po.status !== 'received') {
    po.status = 'partial';
  }

  return c.json({
    ok: true,
    changed: delta !== 0,
    lineId,
    qtyReceived: total,
    guide: {
      id: guide.id,
      onHandBefore: guideBefore,
      onHandAfter: guideAfter,
      deltaInGuideUnits: delta,
      guideUnit: guide.uom || 'case',
    },
    flags: {
      overReceived: total > ordered,
      partial: total > 0 && total < ordered,
      complete: total === ordered,
    },
    orderStatus: po.status,
  });
});
