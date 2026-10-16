import { Command } from 'commander';
import chalk from 'chalk';
import { table } from 'table';
import { apiGet, apiPatch } from '../lib/api-client';

export const settingsCommand = new Command('settings')
  .description('Inspect and update tenant restaurant settings, tax rates, and operational policies');

settingsCommand
  .command('get')
  .description('Fetch current tenant configuration and tax/tip settings')
  .option('--tenant <id>', 'Tenant ID')
  .action(async (opts) => {
    try {
      const res: any = await apiGet('/v1/settings', opts.tenant);
      const cfg = res?.data ?? res ?? {};
      const rows = [
        ['Setting', 'Value'],
        ...Object.entries(cfg).map(([k, v]) => [
          chalk.bold(k),
          typeof v === 'object' ? JSON.stringify(v) : String(v),
        ]),
      ];
      console.log(chalk.bold.hex('#F97316')('\n⚙️  Tenant Settings:'));
      console.log(table(rows));
    } catch (err: any) {
      console.error(chalk.red(`\n✖ Failed to fetch settings: ${err.message}\n`));
    }
  });

settingsCommand
  .command('set <key> <value>')
  .description('Update a tenant setting key')
  .option('--tenant <id>', 'Tenant ID')
  .action(async (key, value, opts) => {
    try {
      await apiPatch('/v1/settings', { [key]: value }, opts.tenant);
      console.log(chalk.green(`\n✔ Updated setting ${key} = ${value}\n`));
    } catch (err: any) {
      console.error(chalk.red(`\n✖ Failed to update setting: ${err.message}\n`));
    }
  });
