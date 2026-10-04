import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { validateFoundation as validate, eventEvidence } from '../../scripts/validate-portfolio-foundation.mjs';
if (!process.env.FOUNDATION_TYPESCRIPT) throw new Error('Set FOUNDATION_TYPESCRIPT to an existing TypeScript module.');
const ts = createRequire(import.meta.url)(process.env.FOUNDATION_TYPESCRIPT);
const validateFoundation = (data, root) => validate(data, root, ts);
const root = fileURLToPath(new URL('../../', import.meta.url));
const baseline = JSON.parse((await readFile(new URL('../../docs/architecture/culinary-foundation.json', import.meta.url), 'utf8')).replace(/^\uFEFF/, ''));
test('source-backed foundation validates', async () => assert.deepEqual(await validateFoundation(baseline, root), []));
test('clinical ownership cannot move silently to Core', async () => {
  const data = structuredClone(baseline);
  data.dataOwnership.find(item => item.domain === 'resident_clinical_dining').owner = 'Core';
  assert.ok((await validateFoundation(data, root)).includes('Invalid owner: resident_clinical_dining'));
});
test('missing and duplicate domains fail', async () => {
  const data = structuredClone(baseline); data.dataOwnership.shift(); data.dataOwnership.push(data.dataOwnership[0]);
  const errors = await validateFoundation(data, root);
  assert.ok(errors.some(error => error.startsWith('Missing domain:')));
  assert.ok(errors.some(error => error.startsWith('Duplicate domain:')));
});
test('escaping source and invented event fail', async () => {
  const data = structuredClone(baseline);
  data.contracts.sdk = '../outside.ts'; data.events[0].wireName = 'invented:event';
  const errors = await validateFoundation(data, root);
  assert.ok(errors.some(error => error.startsWith('Missing or escaping source:')));
  assert.ok(errors.includes('Unobserved event: invented:event'));
});
test('enforcement claims require new evidence', async () => {
  const data = structuredClone(baseline); data.dependencyEnforcement = 'PASS'; data.eventEnvelope.schemaVersionField.literalVersionEnforced = true;
  const errors = await validateFoundation(data, root);
  assert.ok(errors.includes('Dependency enforcement overclaim'));
  assert.ok(errors.includes('Version enforcement overclaim'));
});
test('event provenance rejects circular proof, partial identifiers and removed baseline events', async () => {
  const data = structuredClone(baseline);
  const event = data.events.find(item => item.wireName === 'kds:ticket:held');
  event.sources = [{ path: 'docs/architecture/culinary-foundation.json', line: 1 }];
  event.wireName = 'kds:ticket';
  const errors = await validateFoundation(data, root);
  assert.ok(errors.some(error => error.startsWith('Invalid event proof source:')));
  assert.ok(errors.includes('Unobserved event: kds:ticket'));
  assert.ok(errors.includes('Missing baseline event: kds:ticket:held'));
});
test('event owner and missing contract homes are rejected', async () => {
  const data = structuredClone(baseline); delete data.contracts.sdk; data.events[0].proposedCanonicalOwner = 'ShorelineOps';
  const errors = await validateFoundation(data, root);
  assert.ok(errors.includes('Invalid contract home: sdk'));
  assert.ok(errors.some(error => error.startsWith('Invalid event owner:')));
});
test('AST canonical union tolerates formatting and ignores comments/other type literals', () => {
  const evidence = eventEvidence(ts, `export type EventType\n= "pos:order:created" // comment; 'fake'\n | 'pos:order:paid'\nexport type Other = 'unrelated';\n// eventType: 'fake'\nconst obj={eventType:'pos:order:paid'};`, 'events.ts');
  assert.deepEqual([...evidence.declared], ['pos:order:created', 'pos:order:paid']);
  assert.deepEqual(evidence.observations.map(item => item.wireName), ['pos:order:paid']);
});
test('unmapped payloads and runtime adoption cannot silently become verified', async () => {
  const data = structuredClone(baseline);
  data.events.find(item => item.wireName === 'pos:order:paid').versionedContract.status = 'additive-contract-tested';
  data.events.find(item => item.wireName === 'pos:order:created').versionedContract.runtimeConsumerAdoption = 'PASS';
  const errors = await validateFoundation(data, root);
  assert.ok(errors.includes('Unspecified payload evidence overclaim: pos:order:paid'));
  assert.ok(errors.includes('Runtime adoption evidence overclaim: pos:order:created'));
});
test('legacy transport cannot claim a wire version or lose pending declaration evidence', async () => {
  const data = structuredClone(baseline);
  data.events.find(item => item.wireName === 'kds:ticket:held').versionedContract.version = 1;
  data.events.find(item => item.wireName === 'pos:order:paid').disposition.specification = 'complete';
  const errors = await validateFoundation(data, root);
  assert.ok(errors.includes('Legacy outbox contract mismatch'));
  assert.ok(errors.includes('Declared-only disposition mismatch: pos:order:paid'));
});
