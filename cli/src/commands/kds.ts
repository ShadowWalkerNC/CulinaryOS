import { integerArgument, operationId } from '../lib/native-input';
import { Command } from 'commander';
import chalk from 'chalk';
import { table } from 'table';
import { apiGet, apiPost, apiPatch } from '../lib/api-client';

export const kdsCommand = new Command('kds')
  .description('Kitchen Display System (KDS) & Cook Line Remote Control');

// 1. List Live Kitchen Tickets
kdsCommand
  .command('list')
  .description('List active live kitchen tickets across stations')
  .option('--station <name>', 'Filter by station (grill|fryer|prep|bar|expo)', 'all')
  .option('--tenant <id>', 'Tenant ID')
  .action(async (opts) => {
    try {
      const data: any = await apiGet(`/v1/kds/tickets?station=${encodeURIComponent(opts.station)}`, opts.tenant);
      const tickets: any[] = Array.isArray(data) ? data : data.data ?? [];
      if (tickets.length === 0) {
        console.log(chalk.green('\nKitchen Rail Clean! All tickets bumped.\n'));
        return;
      }
      const rows = [
        ['Ticket ID', 'Table', 'Station', 'Course', 'Items', 'Aging'],
        ...tickets.map((t) => [
          t.id.slice(0, 8),
          (t.tableNumber ?? t.table_number) ? `Table ${t.tableNumber ?? t.table_number}` : t.tableLabel ?? 'Walk-in',
          (t.station ?? 'GRILL').toUpperCase(),
          `Course ${t.course ?? t.course_number ?? 1}`,
          (t.items ?? t.ticket_items)?.map((i: any) => `${i.quantity}x ${i.menu_item_name ?? i.name}`).join(', ') ?? 'Items',
          `${Math.floor((Date.now() - new Date(t.createdAt ?? t.created_at ?? Date.now()).getTime()) / 60000)}m`,
        ]),
      ];
      console.log(chalk.bold.hex('#F97316')('\nLive Kitchen Display Tickets:'));
      console.log(table(rows));
    } catch (err: any) {
      process.exitCode = 1;
      console.error(chalk.red(`\n✖ Error fetching KDS tickets: ${err.message}\n`));
    }
  });

// 2. Bump Ticket Complete
kdsCommand
  .command('bump <ticketId>')
  .option('--operation-id <id>', 'Idempotency key (generated when omitted)')
  .description('Mark kitchen ticket as prepared and bumped')
  .option('--station <name>', 'Station name', 'expo')
  .option('--tenant <id>', 'Tenant ID')
  .action(async (ticketId, opts) => {
    try {
      await apiPatch(`/v1/kds/tickets/${ticketId}/bump`, {
        station: opts.station,
        operationId: operationId(opts.operationId),
      }, opts.tenant);
      console.log(chalk.bold.green(`✔ Ticket ${ticketId} bumped on ${opts.station.toUpperCase()}!`));
    } catch (err: any) {
      process.exitCode = 1;
      console.error(chalk.red(`\n✖ Bump failed: ${err.message}\n`));
    }
  });

// 3. Fire Specific Course
kdsCommand
  .command('fire-course <orderId> <course>')
  .option('--operation-id <id>', 'Idempotency key (generated when omitted)')
  .description('Fire a held course (e.g. Course 2 Entrees or Course 3 Desserts)')
  .option('--tenant <id>', 'Tenant ID')
  .action(async (orderId, course, opts) => {
    try {
      await apiPost(`/v1/orders/${orderId}/fire-course`, {
        courseNumber: integerArgument(course),
        operationId: operationId(opts.operationId),
      }, opts.tenant);
      console.log(chalk.bold.green(`✔ Course ${course} fired for Order ${orderId}!`));
    } catch (err: any) {
      process.exitCode = 1;
      console.error(chalk.red(`\n✖ Fire course failed: ${err.message}\n`));
    }
  });

// 3b. Hold Ticket
kdsCommand
  .command('hold <ticketId>')
  .description('Hold a kitchen ticket (course pacing)')
  .option('--tenant <id>', 'Tenant ID')
  .option('--operation-id <id>', 'Idempotency key (generated when omitted)')
  .action(async (ticketId, opts) => {
    try {
      await apiPatch(`/v1/kds/tickets/${ticketId}/hold`, {
        operationId: operationId(opts.operationId),
      }, opts.tenant);
      console.log(chalk.bold.yellow(`✔ Ticket ${ticketId} held!`));
    } catch (err: any) {
      process.exitCode = 1;
      console.error(chalk.red(`\n✖ Hold failed: ${err.message}\n`));
    }
  });

// 3c. Fire Ticket
kdsCommand
  .command('fire <ticketId>')
  .description('Fire a held kitchen ticket')
  .option('--tenant <id>', 'Tenant ID')
  .option('--operation-id <id>', 'Idempotency key (generated when omitted)')
  .action(async (ticketId, opts) => {
    try {
      await apiPatch(`/v1/kds/tickets/${ticketId}/fire`, {
        operationId: operationId(opts.operationId),
      }, opts.tenant);
      console.log(chalk.bold.green(`✔ Ticket ${ticketId} fired!`));
    } catch (err: any) {
      process.exitCode = 1;
      console.error(chalk.red(`\n✖ Fire failed: ${err.message}\n`));
    }
  });

// 4. Live 86 Countdowns & Out-of-Stock
kdsCommand
  .command('86 <itemId> [countRemaining]')
  .description('Set 86 countdown or immediately 86 an item across all terminals')
  .option('--tenant <id>', 'Tenant ID')
  .action(async (itemId, countRemaining, opts) => {
    try {
      const count = countRemaining !== undefined ? parseInt(countRemaining, 10) : 0;
      await apiPost(`/v1/kds/86`, {
        itemId,
        countRemaining: count,
        status: count === 0 ? '86d' : 'active',
      }, opts.tenant);
      if (count === 0) {
        console.log(chalk.bold.red(`✔ Item ${itemId} is now 86'd across POS, KDS & Storefront!`));
      } else {
        console.log(chalk.bold.yellow(`✔ Item ${itemId} countdown set to ${count} portions remaining.`));
      }
    } catch (err: any) {
      process.exitCode = 1;
      console.error(chalk.red(`\n✖ 86 command failed: ${err.message}\n`));
    }
  });

// 5. Course Pacing & Staging Monitor
kdsCommand
  .command('pacing')
  .description('Monitor kitchen course pacing and Course 2 fire alerts across tables')
  .option('--tenant <id>', 'Tenant ID')
  .action(async (opts) => {
    try {
      const res: any = await apiGet('/v1/kds/pacing', opts.tenant);
      const orders: any[] = Array.isArray(res) ? res : res.data ?? [];
      if (orders.length === 0) {
        console.log(chalk.green('\nNo active multi-course orders on the line.\n'));
        return;
      }
      const rows = [
        ['Order ID', 'Table', 'Course 1', 'C1 Elapsed', 'Course 2 Status', 'Pacing Alert'],
        ...orders.map((o) => {
          const alertChalk =
            o.pacingAlert === 'urgent'
              ? chalk.bold.red('URGENT (15m+)')
              : o.pacingAlert === 'warning'
                ? chalk.bold.yellow('WARNING (12m+)')
                : chalk.green('NORMAL');
          return [
            o.orderId.slice(0, 8),
            o.tableNumber ? `Table ${o.tableNumber}` : 'Walk-in',
            o.c1Status.toUpperCase(),
            `${Math.floor(o.c1ElapsedSeconds / 60)}m ${o.c1ElapsedSeconds % 60}s`,
            o.c2Status.toUpperCase(),
            alertChalk,
          ];
        }),
      ];
      console.log(chalk.bold.hex('#F97316')('\n⏱️ Kitchen Course Pacing & Running Monitor:'));
      console.log(table(rows));
    } catch (err: any) {
      process.exitCode = 1;
      console.error(chalk.red(`\n✖ Error fetching course pacing: ${err.message}\n`));
    }
  });
