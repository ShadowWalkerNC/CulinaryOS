// ============================================================
// CulinaryOS — Canonical Order Type
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
  | 'bumped'
  | 'recalled';

export interface Order {
  id: string;
  tenantId: string;
  orderNumber: number;       // human-readable e.g. 42
  tableNumber?: string;
  coverCount?: number;
  serverName?: string;
  status: OrderStatus;
  items: OrderLineItem[];
  notes?: string;
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
  tenantId: string;
  orderId: string;
  orderNumber: number;
  station: KitchenStation;
  status: TicketStatus;
  items: TicketItem[];
  tableNumber?: string;
  coverCount?: number;
  courseNumber: number;
  priority: 'normal' | 'rush' | 'allergy';
  notes?: string;
  firedAt?: string;
  bumpedAt?: string;
  cookTimeSeconds?: number;
  createdAt: string;
}

export interface TicketItem {
  lineItemId: string;
  name: string;
  quantity: number;
  modifiers: string[];
  notes?: string;
}
