import { readFile, realpath } from 'node:fs/promises';
import { resolve, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

export function eventEvidence(ts, text, path) {
  const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true);
  const declared = new Set();
  const observations = [];
  const payloadTypes = new Map();
  const interfaces = new Set();
  const constants = new Map();
  function visit(node) {
    if (ts.isInterfaceDeclaration(node)) interfaces.add(node.name.text);
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
      let value = node.initializer;
      while (ts.isAsExpression(value)) value = value.expression;
      if (ts.isStringLiteral(value)) constants.set(node.name.text, value.text);
    }
    if (ts.isInterfaceDeclaration(node) && node.name.text === 'EventPayloadV1') {
      for (const member of node.members) if (ts.isPropertySignature(member) && member.type && ts.isStringLiteral(member.name)) payloadTypes.set(member.name.text, member.type.getText(source));
    }
    if (ts.isTypeAliasDeclaration(node) && node.name.text === 'EventType') {
      function literals(child) {
        if (ts.isLiteralTypeNode(child) && ts.isStringLiteral(child.literal)) declared.add(child.literal.text);
        ts.forEachChild(child, literals);
      }
      literals(node.type);
    }
    if (ts.isPropertyAssignment(node) && ['eventType', 'event_type'].includes(node.name.getText(source).replace(/^['"]|['"]$/g, ''))) {
      function values(child) {
        if (ts.isStringLiteralLike(child)) observations.push({ wireName: child.text, line: source.getLineAndCharacterOfPosition(child.getStart(source)).line + 1 });
        ts.forEachChild(child, values);
      }
      values(node.initializer);
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return { declared, observations, payloadTypes, interfaces, constants };
}

export async function validateFoundation(data, root, ts) {
  if (!ts) throw new Error('Existing TypeScript parser required');
  const errors = [];
  if (data.schemaVersion !== 1 || data.phase !== 'P05') errors.push('Unsupported foundation contract');
  const expected = {
    Core: ['orders', 'payments', 'restaurant_configuration', 'inventory'],
    Prep: ['recipes', 'prep_tasks'], Ops: ['labor', 'vendors', 'purchasing', 'waste'],
    Marketing: ['campaigns', 'social_publishing'], Web: ['website_content', 'website_themes'],
    Intelligence: ['recommendations'], ShorelineOps: ['resident_clinical_dining'],
  };
  const seen = new Set();
  for (const item of data.dataOwnership ?? []) {
    if (seen.has(item.domain)) errors.push(`Duplicate domain: ${item.domain}`);
    seen.add(item.domain);
    if (!expected[item.owner]?.includes(item.domain)) errors.push(`Invalid owner: ${item.domain}`);
    if (item.status !== 'target-not-runtime-enforced') errors.push('Ownership evidence overclaim');
  }
  for (const domain of Object.values(expected).flat()) if (!seen.has(domain)) errors.push(`Missing domain: ${domain}`);
  const realRoot = await realpath(root);
  async function source(path) {
    try {
      if (typeof path !== 'string' || isAbsolute(path)) throw new Error();
      const actual = await realpath(resolve(root, path));
      const rel = relative(realRoot, actual);
      if (rel === '..' || rel.startsWith('..\\') || rel.startsWith('../') || isAbsolute(rel)) throw new Error();
      return await readFile(actual, 'utf8');
    } catch { errors.push(`Missing or escaping source: ${path}`); return ''; }
  }
  const contractHomes = { events: 'packages/shared/src/types/events.ts', eventBus: 'packages/event-bus/src/types.ts', sdk: 'packages/sdk/src/index.ts', mcp: 'mcp/src/api-headers.ts' };
  for (const [name, path] of Object.entries(contractHomes)) {
    if (data.contracts?.[name] !== path) errors.push(`Invalid contract home: ${name}`);
    await source(data.contracts?.[name]);
  }
  const canonical = await source(data.contracts?.events);
  const declared = eventEvidence(ts, canonical, data.contracts.events).declared;
  if (!declared.size) errors.push('Canonical event union missing');
  const baselineExtras = ['kds:ticket:held', 'pos:reservation:seated', 'pos:table:merged', 'pos:table:transferred', 'pos:table:assistance'];
  const contractPath = 'packages/shared/src/types/event-contracts.ts';
  const payloadTypes = eventEvidence(ts, await source(contractPath), contractPath).payloadTypes;
  const legacyPath = 'packages/shared/src/types/legacy-outbox-contract.ts';
  const legacy = eventEvidence(ts, await source(legacyPath), legacyPath);
  const wires = new Set();
  for (const event of data.events ?? []) {
    if (typeof event.wireName !== 'string' || !/^[a-z][a-z0-9-]*:[a-z][a-z0-9-]*:[a-z][a-z0-9-]*$/.test(event.wireName)) errors.push('Invalid event wire name');
    if (wires.has(event.wireName)) errors.push(`Duplicate event: ${event.wireName}`);
    wires.add(event.wireName);
    if (event.observedCanonicalTypeMember !== declared.has(event.wireName)) errors.push(`Declaration mismatch: ${event.wireName}`);
    if (event.ownershipStatus !== 'proposed-not-runtime-enforced') errors.push('Event ownership evidence overclaim');
    const expectedOwner = ['recipeos:recipe:created', 'recipeos:recipe:updated'].includes(event.wireName) ? 'CulinaryOS Prep' : 'CulinaryOS Core';
    if (event.proposedCanonicalOwner !== expectedOwner) errors.push(`Invalid event owner: ${event.wireName}`);
    if (!declared.has(event.wireName) && !baselineExtras.includes(event.wireName)) errors.push(`Event outside P05 baseline: ${event.wireName}`);
    const contract = event.versionedContract;
    if (contract?.runtimeConsumerAdoption !== 'NOT RUN') errors.push(`Runtime adoption evidence overclaim: ${event.wireName}`);
    if (payloadTypes.has(event.wireName)) {
      if (contract?.status !== 'additive-contract-tested' || contract.version !== 1 || contract.source !== contractPath || contract.payloadType !== payloadTypes.get(event.wireName)) errors.push(`Versioned contract mismatch: ${event.wireName}`);
    } else if (event.wireName === 'kds:ticket:held') {
      if (contract?.status !== 'legacy-unversioned-profile-tested' || contract.wireVersion !== 'absent'
        || contract.contractRevision !== 1 || Object.hasOwn(contract, 'version') || contract.source !== legacyPath
        || contract.payloadType !== 'LegacyHeldTicketOutbox' || !legacy.interfaces.has(contract.payloadType)
        || contract.contractIdentifier !== legacy.constants.get('LEGACY_HELD_OUTBOX_CONTRACT')) errors.push('Legacy outbox contract mismatch');
    } else {
      if (contract?.status !== 'payload-contract-pending') errors.push(`Unspecified payload evidence overclaim: ${event.wireName}`);
      if (event.disposition?.state !== 'declaration-only' || event.disposition.specification !== 'pending') errors.push(`Declared-only disposition mismatch: ${event.wireName}`);
    }
    let observed = false;
    for (const proof of event.sources ?? []) {
      if (typeof proof.path !== 'string' || !/^(packages\/(shared|event-bus)\/src\/|apps\/server\/src\/routes\/).+\.ts$/.test(proof.path)) {
        errors.push(`Invalid event proof source: ${proof.path}`); continue;
      }
      const evidence = eventEvidence(ts, await source(proof.path), proof.path);
      if (proof.path === contractHomes.events && evidence.declared.has(event.wireName)) observed = true;
      if (evidence.observations.some(item => item.wireName === event.wireName && item.line === proof.line)) observed = true;
    }
    if (!observed) errors.push(`Unobserved event: ${event.wireName}`);
  }
  for (const wire of declared) if (!wires.has(wire)) errors.push(`Missing canonical event: ${wire}`);
  for (const wire of baselineExtras) if (!wires.has(wire)) errors.push(`Missing baseline event: ${wire}`);
  if (data.eventEnvelope?.schemaVersionField?.literalVersionEnforced !== false) errors.push('Version enforcement overclaim');
  if (data.dependencyEnforcement !== 'NOT RUN') errors.push('Dependency enforcement overclaim');
  if (JSON.stringify(data.dependencyDirection) !== JSON.stringify(['Apps', 'Modules', 'Domain / Contracts', 'Infrastructure'])) errors.push('Invalid dependency direction');
  return errors;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = resolve(fileURLToPath(new URL('../', import.meta.url)));
  const data = JSON.parse((await readFile(resolve(root, 'docs/architecture/culinary-foundation.json'), 'utf8')).replace(/^\uFEFF/, ''));
  const parserPath = process.argv[process.argv.indexOf('--typescript') + 1];
  if (!process.argv.includes('--typescript') || !parserPath) throw new Error('Supply --typescript <existing TypeScript module>; no installation performed.');
  const ts = createRequire(import.meta.url)(resolve(parserPath));
  const errors = await validateFoundation(data, root, ts);
  if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
  else console.log(`PASS: ${data.dataOwnership.length} data domains; ${data.events.length} observed event names. Metadata validation only.`);
}
