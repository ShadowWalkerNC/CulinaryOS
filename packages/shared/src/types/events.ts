// ============================================================
// CulinaryOS — Inter-Service Event Bus Types
// All cross-service events are typed here.
// Pattern: {SOURCE_SERVICE}:{ENTITY}:{ACTION}
// ============================================================

import type { ServiceName } from './service';

export interface DomainEvent<T = unknown> {
  eventId: string;           // UUID
  eventType: EventType;
  tenantId: string;
  source: ServiceName | string;
  timestamp: string;         // ISO 8601
  version: number;           // schema version for this event type
  payload: T;
}

export type EventType =
  // POS → KDS
  | 'pos:order:created'
  | 'pos:order:updated'
  | 'pos:order:cancelled'
  | 'pos:order:paid'
  // KDS → POS
  | 'kds:ticket:fired'
  | 'kds:ticket:bumped'      // completed / sent to pass
  | 'kds:ticket:recalled'
  | 'kds:course:fired'
  // POS → RecipeOS
  | 'pos:menu:item-sold'
  // RecipeOS → CulinaryOS
  | 'recipeos:pantry:low-stock'
  | 'recipeos:recipe:created'
  | 'recipeos:recipe:updated'
  // CulinaryOS → all
  | 'culinaryos:tenant:created'
  | 'culinaryos:tenant:suspended'
  | 'culinaryos:service:registered'
  | 'culinaryos:service:deregistered';

// ---- EVENT PAYLOAD SHAPES ----

export interface OrderCreatedPayload {
  orderId: string;
  tableNumber?: string;
  serverName?: string;
  items: OrderItem[];
  createdAt: string;
}

export interface OrderCancelledPayload {
  orderId: string;
  reason?: string;
}

export interface OrderItem {
  lineItemId: string;
  menuItemId?: string;
  name: string;
  quantity: number;
  modifiers: string[];
  station: KitchenStation;   // where it routes in KDS
  courseNumber?: number;     // 1 = apps, 2 = mains, etc.
  recipeId?: string;         // links back to RecipeOS
}

export type KitchenStation =
  | 'hot'
  | 'cold'
  | 'pastry'
  | 'grill'
  | 'fry'
  | 'sauce'
  | 'pass'
  | 'expo'
  | 'bar'
  | (string & {});

export interface TicketFiredPayload {
  ticketId: string;
  orderId: string;
  station: KitchenStation;
  courseNumber?: number;
  firedAt?: string;
}

export interface TicketBumpedPayload {
  ticketId: string;
  orderId: string;
  station?: KitchenStation;
  bumpedBy?: string;
  bumpedAt: string;
  cookTimeSeconds?: number;
}

export interface KdsCourseFiredPayload {
  orderId: string;
  courseNumber: number;
  firedTicketIds: string[];
  firedBy: string;
  firedAt?: string;
}

export interface LowStockPayload {
  ingredientId: string;
  ingredientName: string;
  currentQty: number;
  unit: string;
  reorderAt: number;
}

export interface MenuItemSoldPayload {
  menuItemId: string;
  recipeId?: string;
  quantity: number;
  soldAt: string;
}
