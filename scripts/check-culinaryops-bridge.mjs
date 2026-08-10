#!/usr/bin/env node
/**
 * Guards that the CulinaryOps hub bridge in this repo stays in sync with the
 * canonical source shipped by the satellite (ShadowWalkerNC/CulinaryOps →
 * bridges/culinaryos/). If the satellite updates its drop-in patch, this fails
 * so the hub copy gets re-applied.
 *
 * .ts files are compared as normalized text; .json as parsed (formatting-agnostic).
 * Network/fetch failures are treated as a soft skip (won't flake CI).
 */
import { readFileSync } from 'node:fs';

const RAW = 'https://raw.githubusercontent.com/ShadowWalkerNC/CulinaryOps/main/bridges/culinaryos';

const PAIRS = [
  { local: 'mcp/src/culinaryops-server.ts', remote: `${RAW}/mcp/src/culinaryops-server.ts`, kind: 'text' },
  { local: 'extensions/culinaryops/culinaryos_extension.json', remote: `${RAW}/extensions/culinaryops/culinaryos_extension.json`, kind: 'json' },
];

const normText = (s) => s.replace(/\r\n/g, '\n').replace(/[ \t]+$/gm, '').replace(/\s+$/, '');
const canonJson = (s) => JSON.stringify(sortKeys(JSON.parse(s)));
function sortKeys(v) {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v && typeof v === 'object') {
    return Object.keys(v).sort().reduce((o, k) => ((o[k] = sortKeys(v[k])), o), {});
  }
  return v;
}

let drift = 0;
let checked = 0;

for (const { local, remote, kind } of PAIRS) {
  let remoteText;
  try {
    const res = await fetch(remote);
    if (!res.ok) {
      console.warn(`⚠ skip ${local}: satellite fetch ${res.status} (not failing CI)`);
      continue;
    }
    remoteText = await res.text();
  } catch (e) {
    console.warn(`⚠ skip ${local}: satellite unreachable (${e.message}) — not failing CI`);
    continue;
  }

  const localText = readFileSync(local, 'utf8');
  const same = kind === 'json'
    ? canonJson(localText) === canonJson(remoteText)
    : normText(localText) === normText(remoteText);

  checked++;
  if (same) {
    console.log(`✓ in sync: ${local}`);
  } else {
    console.error(`✗ DRIFT: ${local} differs from CulinaryOps canonical (bridges/culinaryos/…)`);
    drift++;
  }
}

if (drift > 0) {
  console.error(
    `\n${drift} bridge file(s) drifted from the CulinaryOps satellite.\n` +
    `Re-apply from ShadowWalkerNC/CulinaryOps → bridges/culinaryos/ (see mcp/README.md).`,
  );
  process.exit(1);
}

console.log(checked > 0 ? '\nCulinaryOps bridge in sync ✓' : '\nNo files verified (satellite unreachable) — skipped.');
