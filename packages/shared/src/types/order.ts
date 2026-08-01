// ============================================================
// CulinaryOS — Canonical Order & Ticket Types
// Shared between POS (creates), KDS (displays), CulinaryOS (aggregates)
// ============================================================

import type { KitchenStation } from './events';

export type OrderStatus =
  | 'open'          // just placed, not yet sent to kitchen
  | 'sent'          // fired to KDS
  | 'in-progress'   // at least one ticket is cooking
  | 'ready'         // all tickets bumped, waiting at pass
  | 'served'        // delivered to table
  | 'paid'
  | 'voided';

export type TicketStatus =
  | 'queued'
  | 'fired'
  | 'cooking'
  | 'ready'
  | 'bumped'
  | 'recalled'
  | 'voided';

export type CourseHoldStatus = 'held' | 'firing' | 'fired';

export interface Order {
  id: string;
  tenantId: string;
  orderNumber: number;       // human-readable e.g. 42
  tableNumber?: string;
  tableLabel?: string;
  coverCount?: number;
  serverName?: string;
  status: OrderStatus;
  items: OrderLineItem[];
  notes?: string;
  totalAmount?: number;      // cents
  createdAt: string;
  updatedAt: string;
  firedAt?: string;
  paidAt?: string;
}

export interface OrderLineItem {
  id: string;
  orderId: string;
  menuItemId: string;
  name: string;
  quantity: number;
  unitPrice: number;         // cents
  modifiers: LineItemModifier[];
  station: KitchenStation;
  courseNumber: number;
  recipeId?: string;
  notes?: string;
}

export interface LineItemModifier {
  id: string;
  name: string;
  priceAdjustment: number;   // cents, can be negative
}

export interface KitchenTicket {
  id: string;
  tenantId?: string;
  orderId: string;
  orderNumber?: number;
  station?: KitchenStation;
  stationId?: string;
  stationName?: string;
  status: TicketStatus;
  items: TicketItem[];
  tableNumber?: string;
  tableLabel?: string;
  seatNumber?: number;
  coverCount?: number;
  courseNumber: number;
  courseHoldStatus?: CourseHoldStatus;
  priority?: 'normal' | 'rush' | 'allergy';
  notes?: string;
  firedAt?: string;
  bumpedAt?: string;
  cookTimeSeconds?: number;
  elapsedSeconds?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface TicketItem {
  lineItemId?: string;
  id?: string;
  name: string;
  quantity: number;
  modifiers?: string[];
  notes?: string;
  station?: KitchenStation;
}

export interface CourseFireEvent {
  orderId: string;
  courseNumber: number;
  firedTicketIds: string[];
  firedBy: string;
  firedAt: string;
}

export interface AnalyticsSummary {
  stationId:        string;
  periodMinutes:    number;
  avgTicketSeconds: number;
  bumpRate:         number; // bumps per hour
  queueDepth:       number; // currently queued
  heldCount:        number; // tickets held waiting for course fire
}
