// ============================================================
// CulinaryOS — Event Handler Registry
// Add new handlers here. Order doesn't matter.
// ============================================================

import type { EventType } from '../types';
import type { EventHandler } from '../broker';
import type { DomainEvent } from '../types';
import { createClient } from '@supabase/supabase-js';

import { handleOrderCreated }     from './pos-order-created';
import { handleOrderCancelled }   from './pos-order-cancelled';
import { handleTicketBumped }     from './kds-ticket-bumped';
import { handleMenuItemSold }     from './pos-menu-item-sold';
import { handleLowStock }         from './recipeos-pantry-low-stock';

export interface HandlerRegistration {
  name:      string;
  eventType: EventType;
  handle:    EventHandler<any>;
}

export const handlers: HandlerRegistration[] = [
  { name: 'pos-order-created',         eventType: 'pos:order:created',         handle: handleOrderCreated },
  { name: 'pos-order-cancelled',       eventType: 'pos:order:cancelled',       handle: handleOrderCancelled },
  { name: 'kds-ticket-bumped',         eventType: 'kds:ticket:bumped',         handle: handleTicketBumped },
  { name: 'pos-menu-item-sold',        eventType: 'pos:menu:item-sold',        handle: handleMenuItemSold },
  { name: 'recipeos-pantry-low-stock', eventType: 'recipeos:pantry:low-stock', handle: handleLowStock },
];
