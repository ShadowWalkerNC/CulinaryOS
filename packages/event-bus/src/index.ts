// ============================================================
// @culinaryos/event-bus — Barrel Export
// ============================================================

export { handleIncomingEvent }     from './broker';
export type { EventHandler }       from './broker';
export { encodeBinaryEvent, decodeBinaryEvent } from './binary-protocol';

export {
  startRealtimeBridge,
  subscribeToTicketUpdates,
  subscribeToOrderUpdates,
}                                  from './realtime-bridge';

export type {
  DomainEvent,
  EventType,
  KitchenStation,
  OrderCreatedPayload,
  OrderCancelledPayload,
  OrderItem,
  TicketFiredPayload,
  TicketBumpedPayload,
  LowStockPayload,
  MenuItemSoldPayload,
  KdsCourseFiredPayload,
}                                  from './types';

export { handlers }                from './handlers/index';
