// ============================================================
// CulinaryOS — DB Row <-> Domain Entity Mappers
// Maps snake_case PostgreSQL/Supabase DB rows to camelCase TS domain types.
// Prevents runtime undefined property access in realtime payloads.
// ============================================================

import type { KitchenTicket, Order, TicketStatus, OrderStatus, KitchenStation, CourseHoldStatus } from './types';

function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

export function snakeToCamelKeys<T = any>(obj: any): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(snakeToCamelKeys) as unknown as T;

  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = snakeToCamel(key);
    result[camelKey] = typeof value === 'object' && value !== null ? snakeToCamelKeys(value) : value;
  }
  return result as T;
}

export function camelToSnakeKeys<T = any>(obj: any): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(camelToSnakeKeys) as unknown as T;

  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = camelToSnake(key);
    result[snakeKey] = typeof value === 'object' && value !== null ? camelToSnakeKeys(value) : value;
  }
  return result as T;
}

export function mapTicketRowToKitchenTicket(row: any): KitchenTicket {
  if (!row) return row;
  const mapped = snakeToCamelKeys(row);
  return {
    id: mapped.id,
    tenantId: mapped.tenantId ?? mapped.tenant_id,
    orderId: mapped.orderId ?? mapped.order_id ?? '',
    orderNumber: mapped.orderNumber ?? mapped.order_number,
    station: mapped.station ?? mapped.station_id,
    stationId: mapped.stationId ?? mapped.station_id,
    stationName: mapped.stationName ?? mapped.station_name,
    status: (mapped.status ?? 'queued') as TicketStatus,
    items: Array.isArray(mapped.items) ? mapped.items.map((item: any) => ({
      lineItemId: item.lineItemId ?? item.line_item_id,
      id: item.id ?? item.line_item_id,
      name: item.name ?? '',
      quantity: item.quantity ?? 1,
      modifiers: item.modifiers ?? [],
      notes: item.notes,
      station: item.station,
    })) : [],
    tableNumber: mapped.tableNumber ?? mapped.table_number,
    tableLabel: mapped.tableLabel ?? mapped.table_label ?? mapped.tableNumber,
    seatNumber: mapped.seatNumber ?? mapped.seat_number,
    coverCount: mapped.coverCount ?? mapped.cover_count,
    courseNumber: mapped.courseNumber ?? mapped.course_number ?? 1,
    courseHoldStatus: (mapped.courseHoldStatus ?? mapped.course_hold_status) as CourseHoldStatus,
    priority: mapped.priority ?? 'normal',
    notes: mapped.notes,
    firedAt: mapped.firedAt ?? mapped.fired_at,
    bumpedAt: mapped.bumpedAt ?? mapped.bumped_at,
    cookTimeSeconds: mapped.cookTimeSeconds ?? mapped.cook_time_seconds,
    elapsedSeconds: mapped.elapsedSeconds ?? mapped.elapsed_seconds ?? 0,
    createdAt: mapped.createdAt ?? mapped.created_at ?? new Date().toISOString(),
    updatedAt: mapped.updatedAt ?? mapped.updated_at,
  };
}

export function mapKitchenTicketToRow(ticket: Partial<KitchenTicket>): Record<string, any> {
  if (!ticket) return {};
  const row: Record<string, any> = {};
  if (ticket.id !== undefined) row.id = ticket.id;
  if (ticket.tenantId !== undefined) row.tenant_id = ticket.tenantId;
  if (ticket.orderId !== undefined) row.order_id = ticket.orderId;
  if (ticket.orderNumber !== undefined) row.order_number = ticket.orderNumber;
  if (ticket.station !== undefined) row.station = ticket.station;
  if (ticket.stationId !== undefined) row.station_id = ticket.stationId;
  if (ticket.stationName !== undefined) row.station_name = ticket.stationName;
  if (ticket.status !== undefined) row.status = ticket.status;
  if (ticket.items !== undefined) row.items = ticket.items;
  if (ticket.tableNumber !== undefined) row.table_number = ticket.tableNumber;
  if (ticket.tableLabel !== undefined) row.table_label = ticket.tableLabel;
  if (ticket.seatNumber !== undefined) row.seat_number = ticket.seatNumber;
  if (ticket.coverCount !== undefined) row.cover_count = ticket.coverCount;
  if (ticket.courseNumber !== undefined) row.course_number = ticket.courseNumber;
  if (ticket.courseHoldStatus !== undefined) row.course_hold_status = ticket.courseHoldStatus;
  if (ticket.priority !== undefined) row.priority = ticket.priority;
  if (ticket.notes !== undefined) row.notes = ticket.notes;
  if (ticket.firedAt !== undefined) row.fired_at = ticket.firedAt;
  if (ticket.bumpedAt !== undefined) row.bumped_at = ticket.bumpedAt;
  if (ticket.cookTimeSeconds !== undefined) row.cook_time_seconds = ticket.cookTimeSeconds;
  if (ticket.elapsedSeconds !== undefined) row.elapsed_seconds = ticket.elapsedSeconds;
  if (ticket.createdAt !== undefined) row.created_at = ticket.createdAt;
  if (ticket.updatedAt !== undefined) row.updated_at = ticket.updatedAt;
  return row;
}

export function mapOrderRowToOrder(row: any): Order {
  if (!row) return row;
  const mapped = snakeToCamelKeys(row);
  return {
    id: mapped.id,
    tenantId: mapped.tenantId ?? mapped.tenant_id ?? '',
    orderNumber: mapped.orderNumber ?? mapped.order_number ?? 0,
    tableNumber: mapped.tableNumber ?? mapped.table_number,
    tableLabel: mapped.tableLabel ?? mapped.table_label,
    coverCount: mapped.coverCount ?? mapped.cover_count,
    serverName: mapped.serverName ?? mapped.server_name,
    status: (mapped.status ?? 'open') as OrderStatus,
    items: Array.isArray(mapped.items) ? mapped.items.map((item: any) => ({
      id: item.id ?? item.line_item_id,
      orderId: item.orderId ?? item.order_id,
      menuItemId: item.menuItemId ?? item.menu_item_id,
      name: item.name ?? '',
      quantity: item.quantity ?? 1,
      unitPrice: item.unitPrice ?? item.unit_price ?? 0,
      modifiers: item.modifiers ?? [],
      station: item.station as KitchenStation,
      courseNumber: item.courseNumber ?? item.course_number ?? 1,
      recipeId: item.recipeId ?? item.recipe_id,
      notes: item.notes,
    })) : [],
    notes: mapped.notes,
    totalAmount: mapped.totalAmount ?? mapped.total_amount,
    createdAt: mapped.createdAt ?? mapped.created_at ?? new Date().toISOString(),
    updatedAt: mapped.updatedAt ?? mapped.updated_at ?? new Date().toISOString(),
    firedAt: mapped.firedAt ?? mapped.fired_at,
    paidAt: mapped.paidAt ?? mapped.paid_at,
  };
}

export function mapOrderToRow(order: Partial<Order>): Record<string, any> {
  if (!order) return {};
  const row: Record<string, any> = {};
  if (order.id !== undefined) row.id = order.id;
  if (order.tenantId !== undefined) row.tenant_id = order.tenantId;
  if (order.orderNumber !== undefined) row.order_number = order.orderNumber;
  if (order.tableNumber !== undefined) row.table_number = order.tableNumber;
  if (order.tableLabel !== undefined) row.table_label = order.tableLabel;
  if (order.coverCount !== undefined) row.cover_count = order.coverCount;
  if (order.serverName !== undefined) row.server_name = order.serverName;
  if (order.status !== undefined) row.status = order.status;
  if (order.items !== undefined) row.items = order.items;
  if (order.notes !== undefined) row.notes = order.notes;
  if (order.totalAmount !== undefined) row.total_amount = order.totalAmount;
  if (order.createdAt !== undefined) row.created_at = order.createdAt;
  if (order.updatedAt !== undefined) row.updated_at = order.updatedAt;
  if (order.firedAt !== undefined) row.fired_at = order.firedAt;
  if (order.paidAt !== undefined) row.paid_at = order.paidAt;
  return row;
}
