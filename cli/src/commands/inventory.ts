import { Command } from 'commander';
import chalk from 'chalk';
import { table } from 'table';
import { apiGet, apiPost } from '../lib/api-client';

export const inventoryCommand = new Command('inventory')
  .description('Manage ingredient inventory, par levels, and automated purchase orders (/v1/pantry)');

inventoryCommand
  .command('check')
  .description('Show current pantry stock levels and par deficit alerts (/v1/pantry)')
  .option('--low', 'Show only low-stock items at or below par level')
  .option('--tenant <id>', 'Tenant ID')
  .action(async (opts) => {
    try {
      const res: any = await apiGet('/v1/pantry', opts.tenant);
      let items: any[] = Array.isArray(res)
        ? res
        : Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res?.data?.data)
        ? res.data.data
        : [];
      if (opts.low) {
        items = items.filter((i) => {
          const qty = Number(i.currentQty ?? i.stockQuantity ?? i.stock_quantity ?? i.current_qty ?? i.quantity ?? 0);
          const par = Number(i.parLevel ?? i.par_level ?? i.reorder_at ?? 0);
          return qty <= par;
        });
      }
      const rows = [
        ['ID', 'Ingredient', 'On Hand', 'Unit', 'Par Level', 'Unit Cost', 'Status'],
        ...items.map((i) => {
          const qty = Number(i.currentQty ?? i.stockQuantity ?? i.stock_quantity ?? i.current_qty ?? i.quantity ?? 0);
          const par = Number(i.parLevel ?? i.par_level ?? i.reorder_at ?? 0);
          const costCents = Number(i.costPerUnitCents ?? i.cost_per_unit_cents ?? i.cost_cents ?? 0);
          return [
            i.id,
            i.name,
            String(qty),
            i.unit || 'units',
            String(par),
            `$${(costCents / 100).toFixed(2)}`,
            qty <= par ? chalk.red('LOW (REORDER)') : chalk.green('OK'),
          ];
        }),
      ];
      console.log(chalk.bold.hex('#F97316')('\nCulinaryOS Pantry Inventory & Par Status:'));
      console.log(table(rows));
    } catch (err: any) {
      console.error(chalk.red(`\n✖ Failed to inspect inventory: ${err.message}\n`));
    }
  });

inventoryCommand
  .command('reorder')
  .description('Generate an automated purchase order for items below par level (/v1/purchasing/suggested-order)')
  .option('--tenant <id>', 'Tenant ID')
  .action(async (opts) => {
    try {
      const res: any = await apiPost('/v1/purchasing/suggested-order', {}, opts.tenant);
      const data = res?.data?.data || res?.data || res;
      const lines = data.lines || data.items || [];
      console.log(chalk.bold.green(`\n✔ Suggested Purchase Order Generated (${lines.length} below-par line items)\n`));
    } catch (err: any) {
      console.error(chalk.red(`\n✖ Reorder generation failed: ${err.message}\n`));
    }
  });
