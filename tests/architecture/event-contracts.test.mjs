import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCulinaryEventV1 } from '../../packages/shared/src/types/event-contracts.ts';
const payloads = {
  'pos:order:created': { orderId: 'o1', createdAt: '2026-10-04T00:00:00Z', items: [{ lineItemId: 'l1', name: 'Soup', quantity: 1, modifiers: [], station: 'custom' }] },
  'pos:order:cancelled': { orderId: 'o1' },
  'kds:ticket:fired': { ticketId: 't1', orderId: 'o1', station: 'hot' },
  'kds:ticket:bumped': { ticketId: 't1', orderId: 'o1', bumpedAt: '2026-10-04T00:00:00Z' },
  'kds:course:fired': { orderId: 'o1', courseNumber: 2, firedTicketIds: ['t1'], firedBy: 'u1' },
  'recipeos:pantry:low-stock': { ingredientId: 'i1', ingredientName: 'Salt', unit: 'g', currentQty: 1, reorderAt: 5 },
  'pos:menu:item-sold': { menuItemId: 'm1', quantity: 1, soldAt: '2026-10-04T00:00:00Z' },
  'pos:table:merged': { targetTableId: 'table1', sourceTableIds: ['table2'], mergedOrderId: 'order1' },
  'pos:table:transferred': { tableId: 'table1', fromServerId: '', toServerId: 'server2', toServerName: 'Sam', managerId: undefined, orderId: undefined },
  'pos:table:assistance': { notificationId: 'n1', tableId: 'table1', tableNumber: '1', type: 'server', note: undefined },
  'pos:reservation:seated': { reservation_id: 'r1', table_id: null, tenant_id: 'tenant1' },
};
const event = (wire = 'pos:order:created') => ({ eventId: 'e1', eventType: wire, tenantId: 'tenant1', source: 'pos', timestamp: '2026-10-04T00:00:00Z', version: 1, payload: structuredClone(payloads[wire]) });
for (const wire of Object.keys(payloads)) test(`V1 accepts existing payload: ${wire}`, () => assert.equal(validateCulinaryEventV1(event(wire), 'tenant1').ok, true));
test('wrong tenant/version/unsupported wires cannot be accepted', () => {
  assert.deepEqual(validateCulinaryEventV1(event(), 'tenant2'), { ok: false, error: 'TENANT_MISMATCH' });
  assert.deepEqual(validateCulinaryEventV1({ ...event(), version: 2 }, 'tenant1'), { ok: false, error: 'UNSUPPORTED_VERSION' });
  assert.deepEqual(validateCulinaryEventV1({ ...event(), eventType: 'pos:order:paid' }, 'tenant1'), { ok: false, error: 'UNSUPPORTED_EVENT' });
});
test('nested payloads reject wrong shape, inherited fields and non-finite numbers', () => {
  const malformed = event(); malformed.payload.items[0].modifiers = [1];
  assert.equal(validateCulinaryEventV1(malformed, 'tenant1').ok, false);
  malformed.payload.items[0].modifiers = []; malformed.payload.items[0].quantity = NaN;
  assert.equal(validateCulinaryEventV1(malformed, 'tenant1').ok, false);
  const inherited = { ...event('pos:order:cancelled'), payload: Object.create({ orderId: 'o1' }) };
  assert.equal(validateCulinaryEventV1(inherited, 'tenant1').ok, false);
});
test('optional notes and custom station values remain compatible; no business values coerced', () => {
  const value = event(); value.payload.items[0].notes = null; value.payload.items[0].quantity = -1;
  assert.equal(validateCulinaryEventV1(value, 'tenant1').ok, true);
  value.payload.items[0].courseNumber = '2';
  assert.equal(validateCulinaryEventV1(value, 'tenant1').ok, false);
});
test('invalid context/envelope and wrong payload discriminate failures', () => {
  assert.equal(validateCulinaryEventV1(event(), '').error, 'INVALID_CONTEXT');
  assert.equal(validateCulinaryEventV1([], 'tenant1').error, 'INVALID_ENVELOPE');
  assert.equal(validateCulinaryEventV1(Object.create(event()), 'tenant1').error, 'INVALID_ENVELOPE');
  assert.equal(validateCulinaryEventV1({ ...event(), payload: { orderId: 'o1' } }, 'tenant1').error, 'INVALID_PAYLOAD');
});
test('sparse arrays cannot bypass element validation', () => {
  const value = event(); value.payload.items = new Array(2);
  assert.equal(validateCulinaryEventV1(value, 'tenant1').ok, false);
  value.payload.items = structuredClone(payloads['pos:order:created'].items);
  value.payload.items[0].modifiers = new Array(1);
  assert.equal(validateCulinaryEventV1(value, 'tenant1').ok, false);
});
test('missing headers are envelope errors; exact identifiers are not normalized', () => {
  for (const field of ['version', 'eventType', 'payload']) {
    const value = event(); delete value[field];
    assert.equal(validateCulinaryEventV1(value, 'tenant1').error, 'INVALID_ENVELOPE');
  }
  assert.equal(validateCulinaryEventV1(event(), 'tenant1 ').error, 'TENANT_MISMATCH');
  const value = event('pos:order:cancelled'); value.payload.reason = undefined;
  assert.equal(validateCulinaryEventV1(value, 'tenant1').error, 'INVALID_PAYLOAD');
});
test('route contracts preserve null/undefined and reject cross-tenant or malformed fields', () => {
  const seated = event('pos:reservation:seated'); seated.payload.tenant_id = 'tenant2';
  assert.equal(validateCulinaryEventV1(seated, 'tenant1').error, 'TENANT_MISMATCH');
  seated.payload.tenant_id = 'tenant1'; delete seated.payload.table_id;
  assert.equal(validateCulinaryEventV1(seated, 'tenant1').error, 'INVALID_PAYLOAD');
  const assistance = event('pos:table:assistance'); assistance.payload.type = 'admin';
  assert.equal(validateCulinaryEventV1(assistance, 'tenant1').error, 'INVALID_PAYLOAD');
  const transfer = event('pos:table:transferred'); transfer.payload.managerId = 5;
  assert.equal(validateCulinaryEventV1(transfer, 'tenant1').error, 'INVALID_PAYLOAD');
  const merge = event('pos:table:merged'); merge.payload.sourceTableIds = ['table2', 3];
  assert.equal(validateCulinaryEventV1(merge, 'tenant1').error, 'INVALID_PAYLOAD');
});
test('inherited optional fields cannot bypass the type guard', () => {
  const value = event('pos:table:assistance');
  delete value.payload.note;
  Object.setPrototypeOf(value.payload, { note: 7 });
  assert.equal(validateCulinaryEventV1(value, 'tenant1').error, 'INVALID_PAYLOAD');
});
