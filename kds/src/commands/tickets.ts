import { Command } from 'commander';
import chalk from 'chalk';
import { table } from 'table';
import { kdsGet } from '../lib/api';
import type { KitchenTicket } from '../../../shared/types';

export const ticketsCommand = new Command('tickets')
  .description('List and inspect kitchen tickets');

tickets Command
  .command('list')
  .description('List active tickets')
  .option('--station <station>', 'Filter by station (hot, cold, grill, fry, sauce, pastry, pass, bar)')
  .option('--status <status>', 'Filter by status (queued, fired, cooking, bumped)', 'fired')
  .action(async (opts) => {
    const qs = new URLSearchParams();
    if (opts.station) qs.set('station', opts.station);
    if (opts.status)  qs.set('status', opts.status);
    const tickets: KitchenTicket[] = await kdsGet(`/v1/tickets?${qs}`);
    if (tickets.length === 0) { console.log(chalk.green('\n✓ All clear — no active tickets\n')); return; }
    const rows = [
      ['#', 'Order', 'Station', 'Table', 'Items', 'Priority', 'Status', 'Elapsed'],
      ...tickets.map((t) => [
        chalk.white.bold(t.orderNumber.toString()),
        t.id.slice(0, 8),
        chalk.cyan(t.station.toUpperCase()),
        t.tableNumber ?? '—',
        t.items.map((i) => `${i.quantity}x ${i.name}`).join(', '),
        t.priority === 'rush' ? chalk.red('RUSH') : t.priority === 'allergy' ? chalk.yellow('ALLERGY') : chalk.dim('normal'),
        t.status,
        t.firedAt ? `${Math.floor((Date.now() - new Date(t.firedAt).getTime()) / 60000)}m` : '—',
      ]),
    ];
    console.log(table(rows));
  });

tickets Command
  .command('get <ticketId>')
  .description('Show full ticket details')
  .action(async (ticketId) => {
    const t: KitchenTicket = await kdsGet(`/v1/tickets/${ticketId}`);
    console.log(chalk.white.bold(`\nTicket #${t.orderNumber} — ${t.station.toUpperCase()}\n`));
    t.items.forEach((item) => {
      console.log(`  ${chalk.green(item.quantity + 'x')} ${item.name}`);
      item.modifiers.forEach((m) => console.log(chalk.dim(`    — ${m}`)));
      if (item.notes) console.log(chalk.yellow(`    ! ${item.notes}`));
    });
    console.log();
  });
