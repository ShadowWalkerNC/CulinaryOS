import { Command } from 'commander';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

function runDatabase(args: string[]): Promise<void> {
  const root = path.resolve(__dirname, '../../..');
  const entry = path.join(root, 'packages/db/src/cli.ts');
  if (!fs.existsSync(entry)) throw new Error('Database operator tooling requires the CulinaryOS workspace checkout');
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--import', 'tsx', entry, ...args], { cwd: root, stdio: 'inherit', windowsHide: true });
    child.once('error', reject);
    child.once('exit', code => code === 0 ? resolve() : reject(new Error('Database operator command failed')));
  });
}

export const databaseCommand = new Command('database').description('Native PostgreSQL operator tooling');
databaseCommand.command('migrate').description('Plan migrations; apply only with explicit --apply and migration credential').option('--apply', 'Apply pending migrations using DATABASE_MIGRATION_URL').action(async options => {
  try { await runDatabase(options.apply ? ['migrate', '--apply'] : ['migrate']); }
  catch (error) { console.error(error instanceof Error ? error.message : 'Database command failed'); process.exitCode = 1; }
});
databaseCommand.command('status').description('Read applied versions and checksum drift with DATABASE_URL').action(async () => {
  try { await runDatabase(['status']); }
  catch (error) { console.error(error instanceof Error ? error.message : 'Database command failed'); process.exitCode = 1; }
});
databaseCommand.command('check-role').description('Verify the authenticating runtime login attributes and permissions with DATABASE_URL').action(async () => {
  try { await runDatabase(['check-role']); }
  catch (error) { console.error(error instanceof Error ? error.message : 'Database command failed'); process.exitCode = 1; }
});