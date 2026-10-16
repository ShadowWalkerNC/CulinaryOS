import { Command } from 'commander';
import chalk from 'chalk';
import { table } from 'table';
import { apiGet, apiPost } from '../lib/api-client';

export const tablesCommand = new Command('tables')
  .description('Manage floor tables, merges, splits, and server transfers');

tablesCommand
  .command('list')
  .description('List dining room tables and current occupancy status')
  .option('--tenant <id>', 'Tenant ID')
  .action(async (opts) => {
    try {
      const res: any = await apiGet('/v1/tables', opts.tenant);
      const list = Array.isArray(res?.data ?? res) ? (res?.data ?? res) : [];
      const rows = [
        ['Table', 'Section', 'Seats', 'Status'],
        ...list.map((t: any) => [
          chalk.bold(String(t.table_number ?? t.name ?? t.id ?? '—')),
          String(t.section ?? 'Main'),
          String(t.seats ?? t.capacity ?? 4),
          String(t.status ?? 'available'),
        ]),
      ];
      console.log(chalk.bold.hex('#F97316')('\n🪑 Dining Room Floor Tables:'));
      console.log(table(rows));
    } catch (err: any) {
      console.error(chalk.red(`\n✖ Failed to fetch tables: ${err.message}\n`));
    }
  });

tablesCommand
  .command('transfer <orderId> <toServer>')
  .description('Transfer an active table order to another server')
  .option('--tenant <id>', 'Tenant ID')
  .action(async (orderId, toServer, opts) => {
    try {
      await apiPost(`/v1/tables/${orderId}/transfer`, { toServerName: toServer }, opts.tenant);
      console.log(chalk.green(`\n✔ Transferred order ${orderId} to ${toServer}.\n`));
    } catch (err: any) {
      console.error(chalk.red(`\n✖ Table transfer failed: ${err.message}\n`));
    }
  });
