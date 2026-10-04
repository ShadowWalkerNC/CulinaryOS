/** Contract revision is out-of-band; the existing pending_push wire has no version. */
export const LEGACY_HELD_OUTBOX_CONTRACT = 'culinaryos-held-outbox-v1' as const;
export interface LegacyHeldTicketOutbox {
  tenant_id: string;
  station_id: string;
  event_type: 'kds:ticket:held';
  payload: {
    ticketId: string;
    orderId: string;
    station: string;
    courseNumber: number;
    status: 'queued';
  };
}
export type LegacyHeldOutboxResult = {
  ok: true;
  contract: typeof LEGACY_HELD_OUTBOX_CONTRACT;
  row: LegacyHeldTicketOutbox;
} | { ok: false; error: 'INVALID_CONTEXT' | 'INVALID_TRANSPORT' | 'TENANT_MISMATCH' };
function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function own(value: Record<string, unknown>, key: string): unknown {
  return Object.hasOwn(value, key) ? value[key] : undefined;
}
function strings(value: Record<string, unknown>, keys: string[]): boolean {
  return keys.every(key => typeof own(value, key) === 'string');
}
function held(value: unknown): value is LegacyHeldTicketOutbox {
  if (!record(value) || 'version' in value || !strings(value, ['tenant_id', 'station_id'])
    || own(value, 'event_type') !== 'kds:ticket:held') return false;
  const payload = own(value, 'payload');
  if (!record(payload) || !strings(payload, ['ticketId', 'orderId', 'station'])
    || own(payload, 'status') !== 'queued' || own(payload, 'station') !== own(value, 'station_id')) return false;
  const course = own(payload, 'courseNumber');
  return typeof course === 'number' && Number.isFinite(course);
}
/** Validates the known producer profile, not all pending_push rows or actor authority. */
export function validateLegacyHeldOutbox(value: unknown, expectedTenantId: string): LegacyHeldOutboxResult {
  if (typeof expectedTenantId !== 'string' || !expectedTenantId.trim()) return { ok: false, error: 'INVALID_CONTEXT' };
  if (!held(value)) return { ok: false, error: 'INVALID_TRANSPORT' };
  if (value.tenant_id !== expectedTenantId) return { ok: false, error: 'TENANT_MISMATCH' };
  return { ok: true, contract: LEGACY_HELD_OUTBOX_CONTRACT, row: value };
}
