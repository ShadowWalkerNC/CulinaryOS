// Re-export shared types so the backend only needs one import path
export type {
  DomainEvent,
  EventType,
  OrderCreatedPayload,
  OrderItem,
  TicketFiredPayload,
  TicketBumpedPayload,
  LowStockPayload,
  MenuItemSoldPayload,
} from '../../shared/types/events';

export type { KitchenStation } from '../../shared/types/events';
