/**
 * CulinaryOS local seed helper.
 *
 * Applies supabase/seeds/base_tenant.sql then demo.sql against DATABASE_URL
 * when available. Safe to re-run.
 *
 * Usage:
 *   pnpm seed
 *   DATABASE_URL=postgresql://... pnpm seed
 */

import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const databaseUrl = process.env.DATABASE_URL;

async function main() {
  const base = resolve(root, 'supabase/seeds/base_tenant.sql');
  const demo = resolve(root, 'supabase/seeds/demo.sql');

  if (!existsSync(base)) {
    console.error('Missing supabase/seeds/base_tenant.sql');
    process.exit(1);
  }

  if (!databaseUrl || databaseUrl.includes('localhost') === false && !process.env.FORCE_SEED) {
    // Still allow localhost; warn when placeholder
  }

  if (!databaseUrl) {
    console.log(`
[seed] No DATABASE_URL set.

For a full single-tenant demo:
  1. Create a Supabase project (or run \`supabase start\` with config.toml)
  2. Copy .env.example → .env and fill SUPABASE_* + DATABASE_URL
  3. pnpm db:migrate
  4. pnpm seed

Without Supabase, POS → KDS still works in demo mode via the API mock kitchen store
(start apps/server, then fire an order from POS).
`);
    process.exit(0);
  }

  let pg: typeof import('pg') | null = null;
  try {
    pg = await import('pg');
  } catch {
    console.error('[seed] Install pg to run SQL seeds: pnpm add -Dw pg');
    process.exit(1);
  }

  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    for (const file of [base, demo]) {
      if (!existsSync(file)) continue;
      const sql = readFileSync(file, 'utf8');
      console.log(`[seed] Applying ${file.replace(root + '/', '')}...`);
      await client.query(sql);
    }
    console.log('[seed] Done.');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('[seed] Failed:', err.message ?? err);
  process.exit(1);
});
