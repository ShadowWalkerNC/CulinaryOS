// ============================================================
// CulinaryOS — Domain Event Types
// Migrated from backend/event-bus/types.ts
// Source of truth for all event shapes across the platform.
// ============================================================

export type KitchenStation = 'hot' | 'cold' | 'grill' | 'pastry' | 'expo' | 'bar' | string;

export type EventType =
  | 'pos:order:created'
  | 'pos:order:cancelled'
  | 'pos:menu:item-sold'
  | 'kds:ticket:bumped'
  | 'kds:course:fired'
  | 'recipeos:pantry:low-stock';

export interface DomainEvent<T = unknown> {
  eventId:   string;
  eventType: EventType;
  tenantId:  string;
  source:    string;
  timestamp: string;
  version:   number;
  payload:   T;
}

export interface OrderItem {
  lineItemId:    string;
  name:          string;
  quantity:      number;
  station:       KitchenStation;
  courseNumber?: number;
  modifiers:     string[];
  recipeId?:     string;
}

export interface OrderCreatedPayload {
  orderId:      string;
  tableNumber?: string;
  serverName?:  string;
  items:        OrderItem[];
  createdAt:    string;
}

export interface OrderCancelledPayload {
  orderId: string;
  reason?: string;
}

export interface TicketFiredPayload {
  ticketId:     string;
  orderId:      string;
  station:      KitchenStation;
  courseNumber: number;
}

export interface TicketBumpedPayload {
  ticketId: string;
  orderId:  string;
  bumpedBy: string;
  bumpedAt: string;
}

export interface LowStockPayload {
  ingredientId:   string;
  ingredientName: string;
  currentQty:     number;
  reorderAt:      number;
  unit:           string;
}

export interface MenuItemSoldPayload {
  menuItemId: string;
  recipeId?:  string;
  quantity:   number;
  soldAt:     string;
}

export interface KdsCourseFiredPayload {
  orderId:        string;
  courseNumber:   number;
  firedTicketIds: string[];
  firedBy:        string;
}
