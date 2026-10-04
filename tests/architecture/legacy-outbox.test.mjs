import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { validateLegacyHeldOutbox } from '../../packages/shared/src/types/legacy-outbox-contract.ts';
import { validateCulinaryEventV1 } from '../../packages/shared/src/types/event-contracts.ts';
if (!process.env.FOUNDATION_TYPESCRIPT) throw new Error('Existing TypeScript parser required');
const ts = createRequire(import.meta.url)(process.env.FOUNDATION_TYPESCRIPT);
const fixture = () => ({ tenant_id: 'tenant1', station_id: 'hot', event_type: 'kds:ticket:held', payload: { ticketId: 'ticket1', orderId: 'order1', station: 'hot', courseNumber: 2, status: 'queued' } });
test('legacy held profile validates with out-of-band revision, not an added wire version', () => {
  const row = fixture(); const result = validateLegacyHeldOutbox(row, 'tenant1');
  assert.equal(result.ok, true); assert.equal(result.contract, 'culinaryos-held-outbox-v1');
  assert.equal(Object.hasOwn(row, 'version'), false);
  assert.equal(validateCulinaryEventV1(row, 'tenant1').ok, false);
});
test('tenant/station/status/malformed payload and version confusion fail', () => {
  assert.equal(validateLegacyHeldOutbox(fixture(), 'tenant2').error, 'TENANT_MISMATCH');
  assert.equal(validateLegacyHeldOutbox(fixture(), '').error, 'INVALID_CONTEXT');
  for (const change of [row => row.payload.station = 'cold', row => row.payload.status = 'fired', row => row.payload.courseNumber = NaN, row => row.station_id = null, row => row.version = 1, row => delete row.payload.ticketId]) {
    const row = fixture(); change(row); assert.equal(validateLegacyHeldOutbox(row, 'tenant1').error, 'INVALID_TRANSPORT');
  }
  const row = fixture(); row.payload = Object.create(row.payload);
  assert.equal(validateLegacyHeldOutbox(row, 'tenant1').ok, false);
});
test('held fixture is extracted from unchanged producer without executing it', async () => {
  const text = await readFile(new URL('../../packages/event-bus/src/handlers/pos-order-created.ts', import.meta.url), 'utf8');
  const source = ts.createSourceFile('producer.ts', text, ts.ScriptTarget.Latest, true);
  const context = { tenantId: 'tenant1', station: 'hot', ticketId: 'ticket1', orderId: 'order1', courseNumber: 2, isFirstCourse: false };
  function evaluate(node) {
    if (ts.isStringLiteral(node)) return node.text;
    if (ts.isIdentifier(node)) { assert.ok(Object.hasOwn(context, node.text)); return context[node.text]; }
    if (ts.isConditionalExpression(node)) return evaluate(evaluate(node.condition) ? node.whenTrue : node.whenFalse);
    if (ts.isObjectLiteralExpression(node)) {
      const result = {};
      for (const member of node.properties) {
        if (ts.isShorthandPropertyAssignment(member)) result[member.name.text] = evaluate(member.name);
        else if (ts.isPropertyAssignment(member) && ts.isIdentifier(member.name)) result[member.name.text] = evaluate(member.initializer);
        else throw new Error('Unsupported outbox fixture property');
      }
      return result;
    }
    throw new Error('Executable/unsupported outbox fixture expression');
  }
  let matches = 0;
  function visit(node) {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === 'insert') {
      const from = node.expression.expression;
      if (ts.isCallExpression(from) && ts.isPropertyAccessExpression(from.expression) && from.expression.name.text === 'from'
        && ts.isStringLiteral(from.arguments[0]) && from.arguments[0].text === 'pending_push') {
        const row = evaluate(node.arguments[0]); matches++;
        assert.deepEqual(row, fixture()); assert.equal(validateLegacyHeldOutbox(row, 'tenant1').ok, true);
      }
    }
    ts.forEachChild(node, visit);
  }
  assert.equal(source.parseDiagnostics.length, 0); visit(source); assert.equal(matches, 1);
});
