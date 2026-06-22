import { Command } from 'commander';
import chalk from 'chalk';
import { table } from 'table';
import { posGet, posPatch } from '../lib/api';

export const menuCommand = new Command('menu').description('Manage menu items');

menuCommand.command('list').description('List all menu items')
  .option('--section <s>', 'Filter by section name')
  .option('--status <s>', 'Filter by status (available|unavailable|86d)')
  .action(async (o) => {
    const items: any[] = await posGet(`/v1/menu/items${o.section ? `?section=${o.section}` : ''}`);
    const filtered = o.status ? items.filter((i) => i.status === o.status) : items;
    const rows = [['Name','Section','Price','Station','Status'],
      ...filtered.map((i) => [
        i.name, i.section_name??'—', `$${(i.price/100).toFixed(2)}`, i.station,
        i.status==='86d' ? chalk.red('86d') : i.status==='unavailable' ? chalk.yellow('unavail') : chalk.green('avail'),
      ])];
    console.log(table(rows));
  });

menuCommand.command('86 <itemId>').description('86 a menu item (mark as unavailable)').action(async (id) => {
  await posPatch(`/v1/menu/items/${id}`, { status: '86d' });
  console.log(chalk.red(`86'd item ${id}`));
});

menuCommand.command('restore <itemId>').description('Restore an 86d item').action(async (id) => {
  await posPatch(`/v1/menu/items/${id}`, { status: 'available' });
  console.log(chalk.green(`✔ Restored item ${id}`));
});
