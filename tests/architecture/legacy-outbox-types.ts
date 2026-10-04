import type { LegacyHeldTicketOutbox } from '../../packages/shared/src/types/legacy-outbox-contract.js';
const held: LegacyHeldTicketOutbox = { tenant_id: 't', station_id: 'hot', event_type: 'kds:ticket:held', payload: { ticketId: 'ticket', orderId: 'order', station: 'hot', courseNumber: 2, status: 'queued' } };
// @ts-expect-error Held profile cannot claim fired status.
const fired: LegacyHeldTicketOutbox['payload']['status'] = 'fired';
// @ts-expect-error DomainEvent version is not part of this producer profile.
const version: LegacyHeldTicketOutbox['version'] = 1;
export { held, fired, version };
