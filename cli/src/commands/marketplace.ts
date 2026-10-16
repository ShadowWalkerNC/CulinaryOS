import { Command } from 'commander';
import chalk from 'chalk';
import { table } from 'table';
import { apiGet, apiPost } from '../lib/api-client';

export const marketplaceCommand = new Command('marketplace')
  .description('Browse and install CulinaryOS Marketplace templates, integrations, and presets');

marketplaceCommand
  .command('list')
  .description('List available marketplace modules and restaurant templates')
  .option('--tenant <id>', 'Tenant ID')
  .action(async (opts) => {
    try {
      const res: any = await apiGet('/v1/marketplace', opts.tenant);
      const items = Array.isArray(res?.data ?? res) ? (res?.data ?? res) : [];
      const rows = [
        ['ID', 'Name', 'Category', 'Status'],
        ...items.map((item: any) => [
          String(item.id ?? item.slug ?? '—'),
          chalk.bold(String(item.name ?? item.title ?? 'Module')),
          String(item.category ?? 'preset'),
          chalk.cyan(String(item.installed ? 'installed' : 'available')),
        ]),
      ];
      console.log(chalk.bold.hex('#F97316')('\n🏪 CulinaryOS Marketplace Catalog:'));
      console.log(table(rows));
    } catch (err: any) {
      console.error(chalk.red(`\n✖ Failed to list marketplace items: ${err.message}\n`));
    }
  });

marketplaceCommand
  .command('install <moduleId>')
  .description('Install or activate a marketplace preset for a tenant')
  .option('--tenant <id>', 'Tenant ID')
  .action(async (moduleId, opts) => {
    try {
      await apiPost('/v1/marketplace/install', { moduleId }, opts.tenant);
      console.log(chalk.green(`\n✔ Installed marketplace module "${moduleId}".\n`));
    } catch (err: any) {
      console.error(chalk.red(`\n✖ Failed to install module: ${err.message}\n`));
    }
  });
