import { DomainError, integer, taxCents, text, uuid } from './domain.js';
import { defaultTaxRateBps } from './config.js';
import type { NativeExecutor } from './executor.js';

export interface MenuItemRow {
  id: string;
  tenant_id: string;
  name: string;
  price: number;
  status: string;
  station: string;
  recipe_id: string | null;
}

export interface ModifierRow {
  id: string;
  tenant_id: string;
  modifier_group_id: string;
  name: string;
  price_adjustment: number;
}

export interface OrderRow {
  id: string;
  tenant_id: string;
  tab_id: string | null;
  order_number: number | null;
  table_number: string | null;
  cover_count: number | null;
  server_name: string | null;
  status: string;
  notes: string | null;
  subtotal: number;
  tax: number;
  total: number;
  covers: number;
  fired_at: string | null;
  paid_at: string | null;
  voided_at: string | null;
  void_reason: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface LineItemRow {
  id: string;
  order_id: string;
  tenant_id: string;
  menu_item_id: string;
  name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  station: string;
  course_number: number;
  recipe_id: string | null;
  notes: string | null;
  void_reason: string | null;
  is_voided: boolean;
  sort_order: number;
  created_at: string;
}

const STATIONS = new Set(['hot', 'cold', 'grill', 'fry', 'sauce', 'pastry', 'pass', 'bar']);

function station(value: unknown): string {
  const name = text(value, 'station', 32);
  if (!STATIONS.has(name)) throw new DomainError('VALIDATION_ERROR', `Unknown station: ${name}`, 422);
  return name;
}

export async function listActiveMenuItems(tx: NativeExecutor, tenantId: string): Promise<MenuItemRow[]> {
  const result = await tx.query<MenuItemRow>(
    `SELECT id, tenant_id, name, price, status, station, recipe_id
     FROM public.menu_items WHERE tenant_id = $1 AND status = 'available' ORDER BY name`,
    [tenantId],
  );
  return result.rows;
}

export async function getMenuItem(tx: NativeExecutor, tenantId: string, menuItemId: string): Promise<MenuItemRow> {
  const id = uuid(menuItemId, 'menu item');
  const result = await tx.query<MenuItemRow>(
    'SELECT id, tenant_id, name, price, status, station, recipe_id FROM public.menu_items WHERE tenant_id = $1 AND id = $2',
    [tenantId, id],
  );
  const row = result.rows[0];
  if (!row) throw new DomainError('NOT_FOUND', 'Menu item not found', 404);
  if (row.status !== 'available') throw new DomainError('CONFLICT', 'Menu item is not available', 409);
  integer(row.price, 'menu price');
  return row;
}

export async function createOrder(
  tx: NativeExecutor,
  tenantId: string,
  input: { tableNumber?: string | null; takeaway?: boolean; coverCount?: number; serverName?: string | null; notes?: string | null },
): Promise<OrderRow> {
  const takeaway = input.takeaway === true;
  const tableNumber = input.tableNumber === undefined || input.tableNumber === null
    ? null
    : text(input.tableNumber, 'table', 32);
  if (!tableNumber && !takeaway) {
    throw new DomainError('VALIDATION_ERROR', 'tableNumber or takeaway:true is required', 422);
  }
  const coverCount = input.coverCount === undefined ? null : integer(input.coverCount, 'covers', 1, 99);
  const serverName = input.serverName === undefined || input.serverName === null
    ? null
    : text(input.serverName, 'server', 120);
  const notes = input.notes === undefined || input.notes === null ? null : text(input.notes, 'notes', 2000, true);
  const result = await tx.query<OrderRow>(
    `INSERT INTO public.pos_orders (tenant_id, table_number, cover_count, server_name, status, notes, subtotal, tax, total)
     VALUES ($1, $2, $3, $4, 'open', $5, 0, 0, 0) RETURNING *`,
    [tenantId, tableNumber, coverCount, serverName, notes],
  );
  const row = result.rows[0];
  if (!row) throw new DomainError('INTERNAL_ERROR', 'Order create failed', 500);
  return row;
}

export async function getOrder(tx: NativeExecutor, tenantId: string, orderId: string): Promise<OrderRow> {
  const id = uuid(orderId, 'order');
  const result = await tx.query<OrderRow>('SELECT * FROM public.pos_orders WHERE tenant_id = $1 AND id = $2', [tenantId, id]);
  const row = result.rows[0];
  if (!row) throw new DomainError('NOT_FOUND', 'Order not found', 404);
  return row;
}

export async function listLineItems(tx: NativeExecutor, tenantId: string, orderId: string): Promise<LineItemRow[]> {
  const id = uuid(orderId, 'order');
  const result = await tx.query<LineItemRow>(
    'SELECT * FROM public.pos_order_line_items WHERE tenant_id = $1 AND order_id = $2 ORDER BY sort_order, created_at',
    [tenantId, id],
  );
  return result.rows;
}

async function resolveModifiers(
  tx: NativeExecutor,
  tenantId: string,
  modifierIds: unknown,
): Promise<ModifierRow[]> {
  if (modifierIds === undefined) return [];
  if (!Array.isArray(modifierIds)) throw new DomainError('VALIDATION_ERROR', 'modifiers must be an array of IDs', 422);
  if (modifierIds.length > 25) throw new DomainError('VALIDATION_ERROR', 'Too many modifiers', 422);
  const ids = modifierIds.map((entry) => uuid(entry, 'modifier'));
  if (ids.length === 0) return [];
  const result = await tx.query<ModifierRow>(
    'SELECT id, tenant_id, modifier_group_id, name, price_adjustment FROM public.modifiers WHERE tenant_id = $1 AND id = ANY($2::uuid[])',
    [tenantId, ids],
  );
  if (result.rows.length !== ids.length) {
    throw new DomainError('VALIDATION_ERROR', 'Unknown modifier for this tenant', 422);
  }
  for (const row of result.rows) integer(row.price_adjustment, 'modifier adjustment', -2_147_483_647, 2_147_483_647);
  return result.rows;
}

async function recalculateOrderTotals(tx: NativeExecutor, tenantId: string, orderId: string, taxRateBps?: number): Promise<OrderRow> {
  const rate = taxRateBps === undefined ? defaultTaxRateBps() : integer(taxRateBps, 'tax rate', 0, 10_000);
  const items = await listLineItems(tx, tenantId, orderId);
  const subtotal = items.filter((item) => !item.is_voided).reduce((sum, item) => sum + item.line_total, 0);
  integer(subtotal, 'subtotal');
  const tax = taxCents(subtotal, rate);
  const total = integer(subtotal + tax, 'total');
  const updated = await tx.query<OrderRow>(
    'UPDATE public.pos_orders SET subtotal = $3, tax = $4, total = $5 WHERE tenant_id = $1 AND id = $2 RETURNING *',
    [tenantId, orderId, subtotal, tax, total],
  );
  const row = updated.rows[0];
  if (!row) throw new DomainError('NOT_FOUND', 'Order not found', 404);
  return row;
}

export async function addLineItem(
  tx: NativeExecutor,
  tenantId: string,
  orderId: string,
  input: {
    menuItemId: string;
    quantity?: number;
    unitPrice?: number;
    modifiers?: string[];
    station?: string;
    courseNumber?: number;
    notes?: string | null;
    taxRateBps?: number;
  },
): Promise<{ item: LineItemRow; order: OrderRow }> {
  const order = await getOrder(tx, tenantId, orderId);
  if (order.status !== 'open') {
    throw new DomainError('CONFLICT', `Order is ${order.status}; post-send changes require a production revision`, 409);
  }
  const menuItem = await getMenuItem(tx, tenantId, input.menuItemId);
  const quantity = input.quantity === undefined ? 1 : integer(input.quantity, 'quantity', 1, 99);
  const modifiers = await resolveModifiers(tx, tenantId, input.modifiers);
  const expectedUnit = integer(menuItem.price + modifiers.reduce((sum, mod) => sum + mod.price_adjustment, 0), 'unit price');
  if (input.unitPrice !== undefined && input.unitPrice !== expectedUnit) {
    throw new DomainError('VALIDATION_ERROR', 'unitPrice does not match server price authority', 422);
  }
  const itemStation = input.station === undefined ? menuItem.station : station(input.station);
  const courseNumber = input.courseNumber === undefined ? 1 : integer(input.courseNumber, 'course', 1, 25);
  const notes = input.notes === undefined || input.notes === null ? null : text(input.notes, 'notes', 2000, true);
  const lineTotal = integer(expectedUnit * quantity, 'line total');
  const inserted = await tx.query<LineItemRow>(
    `INSERT INTO public.pos_order_line_items
      (tenant_id, order_id, menu_item_id, name, quantity, unit_price, line_total, station, course_number, recipe_id, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
    [tenantId, order.id, menuItem.id, menuItem.name, quantity, expectedUnit, lineTotal, itemStation, courseNumber, menuItem.recipe_id, notes],
  );
  const item = inserted.rows[0];
  if (!item) throw new DomainError('INTERNAL_ERROR', 'Line item insert failed', 500);
  for (const mod of modifiers) {
    await tx.query(
      `INSERT INTO public.line_item_modifiers (tenant_id, line_item_id, modifier_id, name, price_adjustment)
       VALUES ($1, $2, $3, $4, $5)`,
      [tenantId, item.id, mod.id, mod.name, mod.price_adjustment],
    );
  }
  const updatedOrder = await recalculateOrderTotals(tx, tenantId, order.id, input.taxRateBps);
  return { item, order: updatedOrder };
}

export async function voidLineItem(
  tx: NativeExecutor,
  tenantId: string,
  orderId: string,
  lineItemId: string,
  input: { reason: string; taxRateBps?: number },
): Promise<{ item: LineItemRow; order: OrderRow }> {
  const order = await getOrder(tx, tenantId, orderId);
  if (order.status !== 'open') {
    throw new DomainError('CONFLICT', `Order is ${order.status}; post-send voids require a production revision`, 409);
  }
  const id = uuid(lineItemId, 'line item');
  const reason = text(input.reason, 'reason', 500);
  const existing = await tx.query<LineItemRow>(
    'SELECT * FROM public.pos_order_line_items WHERE tenant_id = $1 AND order_id = $2 AND id = $3',
    [tenantId, order.id, id],
  );
  const row = existing.rows[0];
  if (!row) throw new DomainError('NOT_FOUND', 'Line item not found', 404);
  if (row.is_voided) return { item: row, order };
  const updated = await tx.query<LineItemRow>(
    `UPDATE public.pos_order_line_items SET is_voided = true, void_reason = $4
     WHERE tenant_id = $1 AND order_id = $2 AND id = $3 RETURNING *`,
    [tenantId, order.id, id, reason],
  );
  const item = updated.rows[0];
  if (!item) throw new DomainError('INTERNAL_ERROR', 'Line item void failed', 500);
  const updatedOrder = await recalculateOrderTotals(tx, tenantId, order.id, input.taxRateBps);
  return { item, order: updatedOrder };
}
