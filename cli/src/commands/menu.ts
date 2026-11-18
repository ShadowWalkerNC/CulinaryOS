import { Command } from 'commander';
import chalk from 'chalk';
import { table } from 'table';
import { apiGet, apiPost, apiPatch } from '../lib/api-client';

export const menuCommand = new Command('menu')
  .description('Manage active restaurant menu catalog, item prices, and real-time 86 board');

menuCommand
  .command('list')
  .description('List all active menu items, categories, stations, and prices in integer cents')
  .option('--category <cat>', 'Filter by category (Starters|Pizza|Entrees|Sides|Cocktails|Desserts)')
  .option('--tenant <id>', 'Tenant ID')
  .action(async (opts) => {
    try {
      const res: any = await apiGet('/v1/menu', opts.tenant);
      let items: any[] = Array.isArray(res) ? res : res?.data || [];
      if (opts.category) {
        const c = opts.category.toLowerCase();
        items = items.filter((m) => String(m.category || '').toLowerCase().includes(c));
      }
      const rows = [
        ['Item ID', 'Dish Name', 'Category', 'Station', 'Price', 'Availability'],
        ...items.map((m) => {
          const priceCents = Number(m.priceCents ?? m.price_cents ?? m.price ?? 0);
          const avail = m.available !== false && m.is_available !== false && m.status !== '86d';
          return [
            m.id,
            m.name,
            m.category || 'Mains',
            String(m.station || 'hot').toUpperCase(),
            `$${(priceCents / 100).toFixed(2)}`,
            avail ? chalk.green('AVAILABLE') : chalk.red('86\'D (OUT)'),
          ];
        }),
      ];
      console.log(chalk.bold.hex('#F97316')('\nCulinaryOS Active Menu Catalog:'));
      console.log(table(rows));
    } catch (err: any) {
      console.error(chalk.red(`\n✖ Failed to list menu: ${err.message}\n`));
    }
  });

menuCommand
  .command('toggle-86 <itemId>')
  .description('Toggle 86 (out-of-stock) availability for a menu item across POS, KDS & Online Storefront')
  .option('--tenant <id>', 'Tenant ID')
  .action(async (itemId, opts) => {
    try {
      const res: any = await apiPost(`/v1/kds/86-items/${encodeURIComponent(itemId)}/toggle-86`, {}, opts.tenant);
      const item = res?.data?.data || res?.data || res;
      const avail = item.available !== false && item.is_available !== false;
      console.log(
        chalk.bold.green(
          `\n✔ Menu Item ${item.name || itemId} is now ${avail ? chalk.green('AVAILABLE') : chalk.red("86'D (OUT OF STOCK)")}\n`,
        ),
      );
    } catch (err: any) {
      console.error(chalk.red(`\n✖ Failed to toggle 86 status: ${err.message}\n`));
    }
  });

menuCommand
  .command('set-price <itemId> <priceCents>')
  .description('Update a menu item price in integer cents (e.g. 1850 for $18.50)')
  .option('--tenant <id>', 'Tenant ID')
  .action(async (itemId, priceCents, opts) => {
    try {
      const cents = parseInt(priceCents, 10);
      const res: any = await apiPatch(
        `/v1/admin/menu/items/${encodeURIComponent(itemId)}`,
        { price_cents: cents },
        opts.tenant,
      );
      const item = res?.data?.data || res?.data || res;
      console.log(
        chalk.bold.green(`\n✔ Updated ${item.name || itemId} price to $${(cents / 100).toFixed(2)} (${cents} cents)\n`),
      );
    } catch (err: any) {
      console.error(chalk.red(`\n✖ Failed to update price: ${err.message}\n`));
    }
  });
