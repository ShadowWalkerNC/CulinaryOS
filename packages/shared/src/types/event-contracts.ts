import type {
  DomainEvent, OrderCreatedPayload, OrderCancelledPayload, TicketFiredPayload,
  TicketBumpedPayload, KdsCourseFiredPayload, LowStockPayload, MenuItemSoldPayload,
} from './events.js';

/** Additive contract surface. Existing broker routing is not changed by this module. */
export interface TableMergedPayloadV1 {
  targetTableId: string;
  sourceTableIds: string[];
  mergedOrderId: string;
}
export interface TableTransferredPayloadV1 {
  tableId: string;
  fromServerId: string;
  toServerId: string;
  toServerName: string;
  orderId?: string | undefined;
  managerId?: string | undefined;
}
export interface TableAssistancePayloadV1 {
  notificationId: string;
  tableId: string;
  tableNumber: string;
  type: 'server' | 'water' | 'bill' | 'help';
  note?: string | undefined;
}
export interface ReservationSeatedPayloadV1 {
  reservation_id: string;
  table_id: string | null;
  tenant_id: string;
}
export interface EventPayloadV1 {
  'pos:order:created': OrderCreatedPayload;
  'pos:order:cancelled': OrderCancelledPayload;
  'kds:ticket:fired': TicketFiredPayload;
  'kds:ticket:bumped': TicketBumpedPayload;
  'kds:course:fired': KdsCourseFiredPayload;
  'recipeos:pantry:low-stock': LowStockPayload;
  'pos:menu:item-sold': MenuItemSoldPayload;
  'pos:table:merged': TableMergedPayloadV1;
  'pos:table:transferred': TableTransferredPayloadV1;
  'pos:table:assistance': TableAssistancePayloadV1;
  'pos:reservation:seated': ReservationSeatedPayloadV1;
}
export type ContractEventType = keyof EventPayloadV1;
export type CulinaryEventV1<K extends ContractEventType = ContractEventType> = {
  [P in K]: Omit<DomainEvent<EventPayloadV1[P]>, 'eventType' | 'version'> & {
    eventType: P;
    version: 1;
  }
}[K];

export const EVENT_CONTRACT_VERSION = 1 as const;
export type EventContractError = 'INVALID_CONTEXT' | 'INVALID_ENVELOPE' | 'TENANT_MISMATCH'
  | 'UNSUPPORTED_VERSION' | 'UNSUPPORTED_EVENT' | 'INVALID_PAYLOAD';
export type EventContractResult = { ok: true; event: CulinaryEventV1 }
  | { ok: false; error: EventContractError };

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function own(value: Record<string, unknown>, key: string): unknown {
  return Object.hasOwn(value, key) ? value[key] : undefined;
}
function text(value: unknown): value is string { return typeof value === 'string'; }
function finite(value: unknown): value is number { return typeof value === 'number' && Number.isFinite(value); }
function arrayOf(value: unknown, guard: (item: unknown) => boolean): boolean {
  if (!Array.isArray(value)) return false;
  for (let index = 0; index < value.length; index++) if (!Object.hasOwn(value, index) || !guard(value[index])) return false;
  return true;
}
function texts(value: unknown): value is string[] { return arrayOf(value, text); }
function optional(value: Record<string, unknown>, key: string, guard: (item: unknown) => boolean): boolean {
  return Object.hasOwn(value, key) ? guard(value[key]) : !(key in value);
}
function fields(value: Record<string, unknown>, names: string[]): boolean { return names.every(name => text(own(value, name))); }
function stringsOptional(value: Record<string, unknown>, names: string[]): boolean { return names.every(name => optional(value, name, text)); }
function optionalUndefinedString(value: Record<string, unknown>, key: string): boolean {
  return optional(value, key, item => item === undefined || text(item));
}
function assistanceType(value: unknown): value is TableAssistancePayloadV1['type'] {
  return value === 'server' || value === 'water' || value === 'bill' || value === 'help';
}
function orderItem(value: unknown): boolean {
  return record(value) && fields(value, ['lineItemId', 'name', 'station'])
    && finite(own(value, 'quantity')) && texts(own(value, 'modifiers'))
    && stringsOptional(value, ['menuItemId', 'recipeId'])
    && optional(value, 'courseNumber', finite)
    && optional(value, 'notes', item => item === null || text(item));
}

function payloadValid(wire: ContractEventType, value: unknown): boolean {
  if (!record(value)) return false;
  switch (wire) {
    case 'pos:order:created': {
      const items = own(value, 'items');
      return fields(value, ['orderId', 'createdAt']) && stringsOptional(value, ['tableNumber', 'serverName'])
        && arrayOf(items, orderItem);
    }
    case 'pos:order:cancelled': return fields(value, ['orderId']) && stringsOptional(value, ['reason']);
    case 'kds:ticket:fired': return fields(value, ['ticketId', 'orderId', 'station'])
      && optional(value, 'courseNumber', finite) && stringsOptional(value, ['firedAt']);
    case 'kds:ticket:bumped': return fields(value, ['ticketId', 'orderId', 'bumpedAt'])
      && stringsOptional(value, ['station', 'bumpedBy']) && optional(value, 'cookTimeSeconds', finite);
    case 'kds:course:fired': return fields(value, ['orderId', 'firedBy'])
      && finite(own(value, 'courseNumber')) && texts(own(value, 'firedTicketIds')) && stringsOptional(value, ['firedAt']);
    case 'recipeos:pantry:low-stock': return fields(value, ['ingredientId', 'ingredientName', 'unit'])
      && finite(own(value, 'currentQty')) && finite(own(value, 'reorderAt'));
    case 'pos:menu:item-sold': return fields(value, ['menuItemId', 'soldAt'])
      && finite(own(value, 'quantity')) && stringsOptional(value, ['recipeId']);
    case 'pos:table:merged': return fields(value, ['targetTableId', 'mergedOrderId']) && texts(own(value, 'sourceTableIds'));
    case 'pos:table:transferred': return fields(value, ['tableId', 'fromServerId', 'toServerId', 'toServerName'])
      && optionalUndefinedString(value, 'orderId') && optionalUndefinedString(value, 'managerId');
    case 'pos:table:assistance': return fields(value, ['notificationId', 'tableId', 'tableNumber'])
      && assistanceType(own(value, 'type')) && optionalUndefinedString(value, 'note');
    case 'pos:reservation:seated': return fields(value, ['reservation_id', 'tenant_id'])
      && Object.hasOwn(value, 'table_id') && (own(value, 'table_id') === null || text(own(value, 'table_id')));
  }
}
function supported(value: unknown): value is ContractEventType {
  return value === 'pos:order:created' || value === 'pos:order:cancelled' || value === 'kds:ticket:fired'
    || value === 'kds:ticket:bumped' || value === 'kds:course:fired' || value === 'recipeos:pantry:low-stock'
    || value === 'pos:menu:item-sold' || value === 'pos:table:merged' || value === 'pos:table:transferred'
    || value === 'pos:table:assistance' || value === 'pos:reservation:seated';
}
function isValidEvent(value: Record<string, unknown>): value is Record<string, unknown> & CulinaryEventV1 {
  const wire = own(value, 'eventType');
  const payload = own(value, 'payload');
  return supported(wire) && own(value, 'version') === EVENT_CONTRACT_VERSION
    && fields(value, ['eventId', 'tenantId', 'source', 'timestamp']) && payloadValid(wire, payload)
    && (wire !== 'pos:reservation:seated' || (record(payload) && own(payload, 'tenant_id') === own(value, 'tenantId')));
}

/** Context must come from trusted caller authority; this check is not authentication. */
export function validateCulinaryEventV1(value: unknown, expectedTenantId: string): EventContractResult {
  if (typeof expectedTenantId !== 'string' || !expectedTenantId.trim()) return { ok: false, error: 'INVALID_CONTEXT' };
  if (!record(value) || !fields(value, ['eventId', 'tenantId', 'source', 'timestamp'])
    || ['eventId', 'tenantId', 'source', 'timestamp'].some(key => !String(own(value, key)).trim())
    || ['version', 'eventType', 'payload'].some(key => !Object.hasOwn(value, key))) return { ok: false, error: 'INVALID_ENVELOPE' };
  if (own(value, 'tenantId') !== expectedTenantId) return { ok: false, error: 'TENANT_MISMATCH' };
  if (own(value, 'version') !== EVENT_CONTRACT_VERSION) return { ok: false, error: 'UNSUPPORTED_VERSION' };
  if (!supported(own(value, 'eventType'))) return { ok: false, error: 'UNSUPPORTED_EVENT' };
  const payload = own(value, 'payload');
  if (own(value, 'eventType') === 'pos:reservation:seated' && record(payload)
    && text(own(payload, 'tenant_id')) && own(payload, 'tenant_id') !== expectedTenantId) return { ok: false, error: 'TENANT_MISMATCH' };
  if (!isValidEvent(value)) return { ok: false, error: 'INVALID_PAYLOAD' };
  return { ok: true, event: value };
}
