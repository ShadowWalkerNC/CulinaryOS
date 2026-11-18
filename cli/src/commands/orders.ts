import { Command } from 'commander';
import chalk from 'chalk';
import { table } from 'table';
import { apiGet, apiPost, apiPatch } from '../lib/api-client';

export const ordersCommand = new Command('orders')
  .description('Create, inspect, fire, settle, and void dining room & takeout orders (/v1/orders)');

ordersCommand
  .command('list')
  .description('List orders from /v1/orders with integer-cent subtotals, tax, and status')
  .option('--status <status>', 'Filter by status (open|sent|paid|voided)')
  .option('--tenant <id>', 'Tenant ID')
  .action(async (opts) => {
    try {
      const res: any = await apiGet('/v1/orders', opts.tenant);
      let orders: any[] = Array.isArray(res) ? res : res?.data || [];
      if (opts.status) {
        const st = opts.status.toLowerCase();
        orders = orders.filter((o) => String(o.status || '').toLowerCase() === st);
      }
      if (orders.length === 0) {
        console.log(chalk.yellow('\nNo matching orders found.\n'));
        return;
      }
      const rows = [
        ['Order ID', 'Table / Label', 'Items', 'Subtotal', 'Tax', 'Total', 'Status'],
        ...orders.map((o) => [
          o.id,
          o.tableNumber || o.table_number || 'Counter',
          Array.isArray(o.items) ? String(o.items.length) : String(o.itemCount ?? 0),
          `$${((o.subtotalCents ?? o.subtotal_cents ?? 0) / 100).toFixed(2)}`,
          `$${((o.taxCents ?? o.tax_cents ?? 0) / 100).toFixed(2)}`,
          chalk.bold.white(`$${((o.totalCents ?? o.total_cents ?? o.total ?? 0) / 100).toFixed(2)}`),
          String(o.status || 'open').toUpperCase(),
        ]),
      ];
      console.log(chalk.bold.hex('#F97316')('\nCulinaryOS Orders Ledger:'));
      console.log(table(rows));
    } catch (err: any) {
      console.error(chalk.red(`\n✖ Failed to list orders: ${err.message}\n`));
    }
  });

ordersCommand
  .command('create')
  .description('Create a new order with menu items (/v1/orders)')
  .option('--table <label>', 'Table number or label', 'Table 5')
  .option('--item <menuItemId>', 'Menu item ID', 'item-burrata')
  .option('--qty <n>', 'Quantity', '1')
  .option('--seat <n>', 'Seat number', '1')
  .option('--course <n>', 'Course number', '1')
  .option('--tenant <id>', 'Tenant ID')
  .action(async (opts) => {
    try {
      const res: any = await apiPost(
        '/v1/orders',
        {
          table_number: opts.table,
          items: [
            {
              menu_item_id: opts.item,
              quantity: parseInt(opts.qty, 10) || 1,
              seat: parseInt(opts.seat, 10) || 1,
              course: parseInt(opts.course, 10) || 1,
            },
          ],
        },
        opts.tenant,
      );
      const ord = res?.data || res;
      console.log(
        chalk.bold.green(
          `\n✔ Created Order ${ord.id} for ${ord.tableNumber || opts.table} — Total: $${((ord.totalCents ?? ord.total_cents ?? 0) / 100).toFixed(2)}\n`,
        ),
      );
    } catch (err: any) {
      console.error(chalk.red(`\n✖ Failed to create order: ${err.message}\n`));
    }
  });

ordersCommand
  .command('fire <orderId>')
  .description('Send an open order to KDS kitchen station rails (PATCH /v1/orders/:id/send)')
  .option('--tenant <id>', 'Tenant ID')
  .action(async (orderId, opts) => {
    try {
      const res: any = await apiPatch(`/v1/orders/${encodeURIComponent(orderId)}/send`, {}, opts.tenant);
      const data = res?.data || res;
      const count = Array.isArray(data.tickets) ? data.tickets.length : 1;
      console.log(chalk.bold.green(`\n✔ Fired Order ${orderId} to KDS (${count} station tickets generated)\n`));
    } catch (err: any) {
      console.error(chalk.red(`\n✖ Failed to fire order: ${err.message}\n`));
    }
  });

ordersCommand
  .command('void <orderId>')
  .description('Void an order with Manager PIN verification (/v1/orders/:id/void)')
  .option('--reason <reason>', 'Void reason', 'Manager comp / guest change')
  .option('--pin <managerPin>', 'Manager PIN', '1234')
  .option('--tenant <id>', 'Tenant ID')
  .action(async (orderId, opts) => {
    try {
      await apiPost(
        `/v1/orders/${encodeURIComponent(orderId)}/void`,
        { reason: opts.reason, manager_pin: opts.pin },
        opts.tenant,
      );
      console.log(chalk.bold.yellow(`\n✔ Order ${orderId} voided (${opts.reason})\n`));
    } catch (err: any) {
      console.error(chalk.red(`\n✖ Failed to void order: ${err.message}\n`));
    }
  });
