// ============================================================
// CulinaryOS — Event Handler Registry
// Migrated from backend/event-bus/handlers/index.ts
// kds-course-fired added (was missing from original registry)
// ============================================================

import type { EventType } from '../types';
import type { EventHandler } from '../broker';

import { handleOrderCreated }   from './pos-order-created';
import { handleOrderCancelled } from './pos-order-cancelled';
import { handleTicketBumped }   from './kds-ticket-bumped';
import { handleMenuItemSold }   from './pos-menu-item-sold';
import { handleLowStock }       from './recipeos-pantry-low-stock';
import { handleCourseFired }    from './kds-course-fired';

export interface HandlerRegistration {
  name:      string;
  eventType: EventType;
  handle:    EventHandler<any>;
}

export const handlers: HandlerRegistration[] = [
  { name: 'pos-order-created',          eventType: 'pos:order:created',          handle: handleOrderCreated },
  { name: 'pos-order-cancelled',        eventType: 'pos:order:cancelled',        handle: handleOrderCancelled },
  { name: 'kds-ticket-bumped',          eventType: 'kds:ticket:bumped',          handle: handleTicketBumped },
  { name: 'pos-menu-item-sold',         eventType: 'pos:menu:item-sold',         handle: handleMenuItemSold },
  { name: 'recipeos-pantry-low-stock',  eventType: 'recipeos:pantry:low-stock',  handle: handleLowStock },
  { name: 'kds-course-fired',           eventType: 'kds:course:fired',           handle: handleCourseFired },
];
