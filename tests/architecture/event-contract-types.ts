import type { CulinaryEventV1, EventPayloadV1, ReservationSeatedPayloadV1, TableTransferredPayloadV1 } from '../../packages/shared/src/types/event-contracts.js';
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
type Assert<T extends true> = T;
type VersionIsLiteral = Assert<Equal<CulinaryEventV1['version'], 1>>;
type CreatedMatchesExisting = Assert<Equal<Extract<CulinaryEventV1, { eventType: 'pos:order:created' }>['payload'], EventPayloadV1['pos:order:created']>>;
function narrow(event: CulinaryEventV1) {
  if (event.eventType === 'kds:ticket:bumped') {
    const time: string = event.payload.bumpedAt;
    // @ts-expect-error Correct discriminator must not expose recipe inventory payload.
    event.payload.currentQty;
    return time;
  }
  return event.eventId;
}
export type ContractTypeAssertions = [VersionIsLiteral, CreatedMatchesExisting];
export { narrow };
const nullableReservation: ReservationSeatedPayloadV1 = { reservation_id: 'r1', tenant_id: 't1', table_id: null };
const transferUndefined: TableTransferredPayloadV1 = { tableId: 't1', fromServerId: '', toServerId: 's1', toServerName: 'Sam', orderId: undefined, managerId: undefined };
// @ts-expect-error Reservation table must be explicitly nullable, not omitted.
const missingTable: ReservationSeatedPayloadV1 = { reservation_id: 'r1', tenant_id: 't1' };
export { nullableReservation, transferUndefined, missingTable };
