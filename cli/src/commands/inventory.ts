import { Command } from 'commander';
import chalk from 'chalk';
import { table } from 'table';
import { apiGet, apiPost, apiPatch } from '../lib/api-client';

export const inventoryCommand = new Command('inventory')
  .description('Manage ingredient inventory and stock levels');

inventoryCommand
  .command('check')
  .description('Show current stock levels')
  .requiredOption('--tenant <id>', 'Tenant ID')
  .option('--low', 'Show only low-stock items')
  .action(async (opts) => {
    const items: any[] = await apiGet(`/api/tenants/${opts.tenant}/inventory${opts.low ? '?filter=low' : ''}`);
    const rows = [['Ingredient', 'Qty', 'Unit', 'Reorder At', 'Status'],
      ...items.map((i) => [
        i.name, i.quantity, i.unit, i.reorderThreshold,
        i.quantity <= i.reorderThreshold ? chalk.red('LOW') : chalk.green('OK'),
      ])];
    console.log(table(rows));
  });

inventoryCommand
  .command('update')
  .description('Update stock quantity for an ingredient')
  .requiredOption('--tenant <id>', 'Tenant ID')
  .requiredOption('--item <id>', 'Ingredient ID')
  .requiredOption('--qty <number>', 'New quantity', parseFloat)
  .action(async (opts) => {
    await apiPatch(`/api/tenants/${opts.tenant}/inventory/${opts.item}`, { quantity: opts.qty });
    console.log(chalk.green(`✔ Stock updated for item ${opts.item}: ${opts.qty}`));
  });

inventoryCommand
  .command('reorder')
  .description('Create a purchase order for low-stock items')
  .requiredOption('--tenant <id>', 'Tenant ID')
  .action(async (opts) => {
    const po: any = await apiPost(`/api/tenants/${opts.tenant}/purchase-orders/auto`, {});
    console.log(chalk.green(`✔ Purchase order created: ${po.id} — ${po.lineItems?.length ?? 0} items`));
  });
