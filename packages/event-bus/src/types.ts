// ============================================================
// CulinaryOS — Domain Event Types
// Migrated from backend/event-bus/types.ts
// Source of truth for all event shapes across the platform.
// Re-exports canonical contracts from @culinaryos/shared.
// ============================================================

export type {
  KitchenStation,
  EventType,
  DomainEvent,
  OrderItem,
  OrderCreatedPayload,
  OrderCancelledPayload,
  TicketFiredPayload,
  TicketBumpedPayload,
  KdsCourseFiredPayload,
  LowStockPayload,
  MenuItemSoldPayload,
} from '@culinaryos/shared';
