import { Pool } from 'pg';
import { pathToFileURL } from 'node:url';
import { applyMigrations, defaultMigrationsDir, listMigrationFiles } from './migrate.js';
import { assertRuntimeDatabaseRole } from './runtime-role.js';

/** Operator tooling; migration credentials never fall back to runtime credentials. */
export async function runDatabaseCli(args: string[]): Promise<void> {
  const command = args[0] ?? 'help';
  if (command === 'help' || command === '--help') {
    console.log('database migrate [--apply] | status | check-role');
    console.log('migrate plans by default; --apply requires DATABASE_MIGRATION_URL. status/check-role read DATABASE_URL.');
    return;
  }
  if (command !== 'migrate' && command !== 'status' && command !== 'check-role') throw new Error('Unknown database command');
  if (args.slice(1).some(arg => command !== 'migrate' || arg !== '--apply')) throw new Error('Unknown database option');
  const files = listMigrationFiles(defaultMigrationsDir());
  if (command === 'migrate' && !args.includes('--apply')) {
    console.log(JSON.stringify({ applied: false, migrations: files.map(({ version, name, checksum }) => ({ version, name, checksum })) }, null, 2));
    return;
  }
  const connectionString = command === 'migrate' ? process.env.DATABASE_MIGRATION_URL : process.env.DATABASE_URL;
  if (!connectionString) throw new Error(command === 'migrate' ? 'DATABASE_MIGRATION_URL is required; runtime credentials are never used for migrations' : `DATABASE_URL is required for ${command}`);
  const pool = new Pool({ connectionString, max: 1, connectionTimeoutMillis: 5000, statement_timeout: 30000 });
  try {
    if (command === 'migrate') {
      const applied = await applyMigrations(pool);
      console.log(JSON.stringify({ applied: true, versions: applied.map(row => row.version) }));
    } else if (command === 'status') {
      const result = await pool.query<{ version: string; name: string; checksum: string }>('SELECT version, name, checksum FROM public.schema_migrations ORDER BY version');
      const expected = new Map(files.map(file => [file.version, file]));
      const drift = result.rows.filter(row => !expected.has(row.version) || expected.get(row.version)?.checksum !== row.checksum).map(row => row.version);
      const actual = new Set(result.rows.map(row => row.version));
      const pending = files.filter(file => !actual.has(file.version)).map(file => file.version);
      console.log(JSON.stringify({ applied: result.rows.map(row => row.version), pending, drift, ready: pending.length === 0 && drift.length === 0 }));
      if (drift.length > 0) throw new Error('Applied migration checksum drift detected');
    } else if (command === 'check-role') {
      const info = await assertRuntimeDatabaseRole(pool);
      console.log(JSON.stringify({ ok: true, role: info }, null, 2));
    }
  } finally {
    await pool.end();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runDatabaseCli(process.argv.slice(2)).catch(error => {
    // PG/provider errors must never echo a connection URL or password.
    const message = error instanceof Error ? error.message : '';
    const safe = /^(Unknown database|DATABASE_|Applied migration checksum|Runtime database role rejected)/.test(message) ? message : 'Database command failed; inspect private database diagnostics';
    console.error(safe);
    process.exitCode = 1;
  });
}