import { Command } from 'commander';
import chalk from 'chalk';
import { table } from 'table';
import { apiGet, apiPost, apiPatch } from '../lib/api-client';

export const menuCommand = new Command('menu')
  .description('Manage menus and menu items');

menuCommand
  .command('list')
  .description('List all menus for a tenant')
  .requiredOption('--tenant <id>', 'Tenant ID')
  .action(async (opts) => {
    const menus: any[] = await apiGet(`/api/tenants/${opts.tenant}/menus`);
    const rows = [['ID', 'Name', 'Status', 'Items'], ...menus.map((m) => [m.id, m.name, m.status, m.itemCount ?? '—'])];
    console.log(table(rows));
  });

menuCommand
  .command('create')
  .description('Create a new menu')
  .requiredOption('--tenant <id>', 'Tenant ID')
  .requiredOption('--name <name>', 'Menu name')
  .action(async (opts) => {
    const menu: any = await apiPost(`/api/tenants/${opts.tenant}/menus`, { name: opts.name });
    console.log(chalk.green(`✔ Menu created: ${menu.id} — ${menu.name}`));
  });

menuCommand
  .command('publish')
  .description('Publish a menu (set status to active)')
  .requiredOption('--tenant <id>', 'Tenant ID')
  .requiredOption('--menu <id>', 'Menu ID')
  .action(async (opts) => {
    await apiPatch(`/api/tenants/${opts.tenant}/menus/${opts.menu}`, { status: 'active' });
    console.log(chalk.green(`✔ Menu ${opts.menu} is now live`));
  });
