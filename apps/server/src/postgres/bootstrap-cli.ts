import { Pool } from 'pg';
import { bootstrapNativeInstallation, NativeBootstrapError } from './bootstrap.js';

async function readInput(): Promise<unknown> {
  if (process.stdin.isTTY) throw new NativeBootstrapError('Pipe the private bootstrap JSON to stdin.');
  let raw = '';
  for await (const chunk of process.stdin.setEncoding('utf8')) {
    raw += chunk;
    if (Buffer.byteLength(raw) > 16_384) throw new NativeBootstrapError('Bootstrap input exceeds 16 KiB.');
  }
  try { return JSON.parse(raw.replace(/^\uFEFF/u, '')); }
  catch { throw new NativeBootstrapError('Bootstrap input must be valid JSON.'); }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.length === 0 || (args.length === 1 && args[0] === '--help')) {
    console.log('Native PostgreSQL first-owner bootstrap (no changes without --apply).');
    console.log('Use DATABASE_MIGRATION_URL and private JSON on stdin; see docs/acceptance/NATIVE_BOOTSTRAP.md.');
    return;
  }
  if (args.length !== 1 || args[0] !== '--apply') throw new NativeBootstrapError('Only --apply is supported; provide configuration on stdin.');
  const connectionString = process.env.DATABASE_MIGRATION_URL;
  if (!connectionString) throw new NativeBootstrapError('DATABASE_MIGRATION_URL is required; runtime credentials are never used.');
  const input = await readInput();
  const pool = new Pool({ connectionString, max: 1, connectionTimeoutMillis: 5000, statement_timeout: 30000 });
  try {
    const result = await bootstrapNativeInstallation(pool, input);
    console.log(JSON.stringify({ ok: true, ...result }));
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof NativeBootstrapError ? error.message : 'Native bootstrap failed. Inspect private database diagnostics.');
  process.exitCode = 1;
});
