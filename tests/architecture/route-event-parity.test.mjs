import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { validateCulinaryEventV1 } from '../../packages/shared/src/types/event-contracts.ts';
if (!process.env.FOUNDATION_TYPESCRIPT) throw new Error('Existing TypeScript parser required');
const ts = createRequire(import.meta.url)(process.env.FOUNDATION_TYPESCRIPT);
const wires = new Set(['pos:table:merged', 'pos:table:transferred', 'pos:table:assistance', 'pos:reservation:seated']);
// Evaluate data expressions only. Never import/execute routes or provider clients.
function evaluate(node, context) {
  if (ts.isIdentifier(node)) {
    if (node.text === 'undefined') return undefined;
    if (!Object.hasOwn(context, node.text)) throw new Error(`Unknown fixture identifier: ${node.text}`);
    return context[node.text];
  }
  if (node.kind === ts.SyntaxKind.NullKeyword) return null;
  if (ts.isStringLiteral(node)) return node.text;
  if (ts.isNumericLiteral(node)) return Number(node.text);
  if (ts.isPropertyAccessExpression(node)) {
    const object = evaluate(node.expression, context);
    if (node.questionDotToken && (object === null || object === undefined)) return undefined;
    if (object === null || object === undefined) throw new Error('Invalid fixture property access');
    return Object.hasOwn(object, node.name.text) ? object[node.name.text] : undefined;
  }
  if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken) return evaluate(node.left, context) ?? evaluate(node.right, context);
  if (ts.isObjectLiteralExpression(node)) {
    const object = {};
    for (const member of node.properties) {
      if (ts.isShorthandPropertyAssignment(member)) object[member.name.text] = evaluate(member.name, context);
      else if (ts.isPropertyAssignment(member) && (ts.isIdentifier(member.name) || ts.isStringLiteral(member.name))) object[member.name.text] = evaluate(member.initializer, context);
      else throw new Error('Unsupported fixture property expression');
    }
    return object;
  }
  throw new Error(`Unsupported producer expression: ${ts.SyntaxKind[node.kind]}`);
}
const contexts = [
  { targetTableId: 'table1', sourceTableIds: ['table2'], mergedOrderId: 'mock1', targetOrder: { id: 'db1' }, tableId: 'table1', orderId: undefined, fromServerId: '', toServerId: 's1', toServerName: 'Sam', pinAuth: { managerId: undefined }, notificationId: 'n1', id: 'r1', tableNumber: '1', type: 'server', body: {}, updated: null, tenantId: 'tenant1' },
  { targetTableId: 'table1', sourceTableIds: ['table2'], mergedOrderId: 'mock1', targetOrder: { id: 'db1' }, tableId: 'table1', orderId: 'o1', fromServerId: 's0', toServerId: 's1', toServerName: 'Sam', pinAuth: { managerId: 'm1' }, notificationId: 'n1', id: 'r1', tableNumber: '1', type: 'bill', body: { note: 'please', table_id: 'table1' }, updated: { table_id: 'table2' }, tenantId: 'tenant1' },
];
contexts.push({ ...contexts[0], updated: { table_id: 'existing-table' } });
test('seven source-declared producer payloads satisfy simulated V1 fixtures', async () => {
  const produced = [];
  for (const path of ['tables.ts', 'reservations.ts']) {
    const source = ts.createSourceFile(path, await readFile(new URL(`../../apps/server/src/routes/${path}`, import.meta.url), 'utf8'), ts.ScriptTarget.Latest, true);
    assert.equal(source.parseDiagnostics.length, 0, `${path}: producer source must parse`);
    function visit(node) {
      if (ts.isObjectLiteralExpression(node)) {
        const properties = node.properties.filter(ts.isPropertyAssignment);
        const wire = properties.find(property => property.name.getText(source) === 'eventType')?.initializer;
        const payload = properties.find(property => property.name.getText(source) === 'payload')?.initializer;
        if (wire && ts.isStringLiteral(wire) && wires.has(wire.text)) {
          assert.ok(payload, `${path}: missing producer payload`);
          produced.push(wire.text);
          for (const context of contexts) {
            function envelopeField(name) {
              const property = node.properties.find(member => member.name?.getText(source) === name);
              assert.ok(property, `${path}:${wire.text}: missing ${name}`);
              return evaluate(ts.isShorthandPropertyAssignment(property) ? property.name : property.initializer, context);
            }
            const value = { eventId: 'e1', eventType: wire.text, tenantId: envelopeField('tenantId'), source: envelopeField('source'), timestamp: '2026-10-04T00:00:00Z', version: envelopeField('version'), payload: evaluate(payload, context) };
            assert.equal(validateCulinaryEventV1(value, context.tenantId).ok, true, `${path}:${wire.text}: in-memory parity`);
            assert.equal(validateCulinaryEventV1(JSON.parse(JSON.stringify(value)), context.tenantId).ok, true, `${path}:${wire.text}: JSON parity`);
          }
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
  assert.equal(produced.length, 7);
  assert.deepEqual([...new Set(produced)].sort(), [...wires].sort());
});
test('producer expression evaluator refuses executable calls', () => {
  const source = ts.createSourceFile('data.ts', 'dangerous()', ts.ScriptTarget.Latest, true);
  assert.throws(() => evaluate(source.statements[0].expression, {}), /Unsupported producer expression/);
});
