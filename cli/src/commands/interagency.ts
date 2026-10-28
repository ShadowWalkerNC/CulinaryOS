// ============================================================
// CulinaryOS CLI — Interagency Read Bridge Management
// ============================================================

import { Command } from 'commander';
import chalk from 'chalk';
import { table } from 'table';
import { apiGet, apiPost } from '../lib/api-client';

export const interagencyCommand = new Command('interagency')
  .description('Manage Interagency Read Bridge connections, grants, and snapshots');

// 1. Status Command
interagencyCommand
  .command('status')
  .description('Check Interagency Read Bridge availability and configuration')
  .option('--tenant <id>', 'Tenant ID')
  .action(async (opts) => {
    try {
      console.log(chalk.bold.hex('#6366F1')('\n🔗 CulinaryOS Interagency Read Bridge Status:'));

      const isEnabled = process.env.INTERAGENCY_READ_ENABLED === 'true';
      console.log(`  Engine Status:       ${isEnabled ? chalk.green('● ENABLED (Read-Only)') : chalk.yellow('○ DISABLED (Set INTERAGENCY_READ_ENABLED=true)')}`);
      console.log(`  Protocol:            ${chalk.cyan('OAuth 2.0 PKCE (S256, 127.0.0.1 Loopback Only)')}`);
      console.log(`  Permitted Scopes:    ${chalk.white('recipes, menus, purchases, inventory, sales_summary')}`);
      console.log(`  Privacy Boundaries:  ${chalk.green('Cardholder data, customer PII, and payroll strictly excluded')}`);
      console.log(`  Token TTL:           ${chalk.white('Access: 15m | Refresh Rotation: 30d | Auth Code: 5m')}\n`);
    } catch (err: any) {
      console.error(chalk.red(`\n✖ Error checking status: ${err.message}\n`));
    }
  });

// 2. List Active Grants
interagencyCommand
  .command('grants')
  .alias('list')
  .description('List all active authorized third-party read grants')
  .option('--tenant <id>', 'Tenant ID')
  .action(async (opts) => {
    try {
      const res: any = await apiGet('/v1/interagency/grants', opts.tenant);
      const grants: any[] = res.grants || [];

      if (grants.length === 0) {
        console.log(chalk.yellow('\n🔗 No active third-party read grants found for this tenant.\n'));
        return;
      }

      const rows = [
        ['Grant ID', 'Audience', 'Scopes', 'Created At', 'Expires At'],
        ...grants.map((g) => [
          g.id.slice(0, 10),
          g.audience,
          g.scopes.join(', '),
          g.createdAt ? new Date(g.createdAt).toLocaleDateString() : 'Unknown',
          g.expiresAt ? new Date(g.expiresAt).toLocaleDateString() : 'Unknown',
        ]),
      ];

      console.log(chalk.bold.hex('#6366F1')('\n🔗 Active Third-Party Read Grants:'));
      console.log(table(rows));
    } catch (err: any) {
      console.error(chalk.red(`\n✖ Error listing grants: ${err.message}\n`));
    }
  });

// 3. Revoke Grant
interagencyCommand
  .command('revoke <id>')
  .description('Revoke an authorized third-party read grant by ID')
  .option('--tenant <id>', 'Tenant ID')
  .action(async (id, opts) => {
    try {
      console.log(chalk.gray(`Revoking grant ${id}...`));
      const res: any = await apiPost(`/v1/interagency/grants/${id}/revoke`, {}, opts.tenant);

      if (res.revoked) {
        console.log(chalk.green(`\n✔ Grant ${id} has been revoked successfully.\n`));
      } else {
        console.log(chalk.yellow(`\n⚠ Grant ${id} could not be revoked.\n`));
      }
    } catch (err: any) {
      console.error(chalk.red(`\n✖ Error revoking grant: ${err.message}\n`));
    }
  });

// 4. Snapshot Inspect
interagencyCommand
  .command('snapshot <resource>')
  .description('Inspect read-only projection snapshot (recipes, menus, purchases, inventory, sales_summary)')
  .option('--token <token>', 'Scoped access token')
  .option('--limit <limit>', 'Records limit (1-200)', '10')
  .option('--tenant <id>', 'Tenant ID')
  .action(async (resource, opts) => {
    try {
      const validResources = ['recipes', 'menus', 'purchases', 'inventory', 'sales_summary'];
      if (!validResources.includes(resource)) {
        console.log(chalk.red(`\n✖ Invalid resource: ${resource}. Permitted: ${validResources.join(', ')}\n`));
        return;
      }

      console.log(chalk.bold.hex('#6366F1')(`\n📦 Fetching snapshot for resource: ${resource}...`));

      const query = new URLSearchParams({
        resource,
        limit: opts.limit || '10',
      });

      const baseUrl = process.env.CULINARY_API_URL ?? process.env.VITE_API_URL ?? 'http://localhost:3000';
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Tenant-Id': opts.tenant || process.env.VITE_TENANT_ID || '00000000-0000-0000-0000-000000000001',
      };
      if (opts.token) {
        headers['Authorization'] = `Bearer ${opts.token}`;
      } else if (process.env.CULINARY_API_KEY) {
        headers['Authorization'] = `Bearer ${process.env.CULINARY_API_KEY}`;
      }

      const rawRes = await fetch(`${baseUrl}/v1/interagency/snapshots?${query.toString()}`, { headers });
      if (!rawRes.ok) {
        const text = await rawRes.text().catch(() => '');
        throw new Error(`GET /v1/interagency/snapshots failed: ${rawRes.status} ${rawRes.statusText} ${text}`);
      }
      const res: any = await rawRes.json();
      console.log(chalk.cyan(`Tenant ID:     ${res.tenantId}`));
      console.log(chalk.cyan(`Captured At:   ${res.capturedAt}`));
      console.log(chalk.cyan(`Data Version:  ${res.dataVersion} (Read-Only: ${res.readOnly})`));
      console.log(chalk.cyan(`Records Count: ${res.records?.length || 0}`));
      if (res.nextCursor) {
        console.log(chalk.gray(`Next Cursor:   ${res.nextCursor}`));
      }
      console.log('\n', JSON.stringify(res.records, null, 2), '\n');
    } catch (err: any) {
      console.error(chalk.red(`\n✖ Error fetching snapshot: ${err.message}\n`));
    }
  });
