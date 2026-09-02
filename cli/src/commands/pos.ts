import { Command } from 'commander';
import chalk from 'chalk';
import { table } from 'table';
import { apiGet, apiPost, apiPatch } from '../lib/api-client';

export const posCommand = new Command('pos')
  .description('Front-of-House POS Terminal Remote Control');

// 1. List Open Orders & Tables
posCommand
  .command('list')
  .description('List all active table orders')
  .option('--tenant <id>', 'Tenant ID')
  .action(async (opts) => {
    try {
      const data: any = await apiGet('/v1/orders', opts.tenant);
      const orders: any[] = Array.isArray(data) ? data : data.data ?? [];
      if (orders.length === 0) {
        console.log(chalk.yellow('\nNo active orders found in the dining room.\n'));
        return;
      }
      const rows = [
        ['Order ID', 'Table', 'Status', 'Items', 'Total', 'Server'],
        ...orders.map((o) => [
          o.id.slice(0, 8),
          o.tableNumber ? `Table ${o.tableNumber}` : o.tableLabel ?? 'Bar/Walk-in',
          o.status.toUpperCase(),
          o.items?.length ?? o.itemCount ?? 0,
          `$${((o.totalAmount ?? o.total_amount ?? 0) / 100).toFixed(2)}`,
          o.serverName ?? o.server_name ?? 'Server #1234',
        ]),
      ];
      console.log(chalk.bold.hex('#F97316')('\n🍽️ Active Dining Room Orders:'));
      console.log(table(rows));
    } catch (err: any) {
      console.error(chalk.red(`\n✖ Error fetching POS orders: ${err.message}\n`));
    }
  });

// 2. Seat a Table
posCommand
  .command('seat <tableId>')
  .description('Seat guests at a dining table')
  .option('--covers <number>', 'Number of guests', '2')
  .option('--server <name>', 'Assigned server name', 'Server #1234')
  .option('--tenant <id>', 'Tenant ID')
  .action(async (tableId, opts) => {
    try {
      const res: any = await apiPost('/v1/tables/seat', {
        tableId,
        covers: parseInt(opts.covers, 10),
        serverName: opts.server,
      }, opts.tenant);
      console.log(chalk.green(`✔ Table ${tableId} seated for ${opts.covers} covers (${opts.server})`));
    } catch (err: any) {
      console.error(chalk.red(`\n✖ Failed to seat table: ${err.message}\n`));
    }
  });

// 3. Fire Table Order
posCommand
  .command('fire <tableId> [items...]')
  .description('Ring up and fire order to kitchen')
  .option('--course <number>', 'Initial course to fire', '1')
  .option('--tenant <id>', 'Tenant ID')
  .action(async (tableId, items, opts) => {
    try {
      const itemList = items && items.length > 0 ? items : ['Prime Bistro Burger', 'Wood-Fired Margherita Pizza'];
      const res: any = await apiPost('/v1/orders', {
        tableNumber: tableId,
        items: itemList.map((name: string) => ({ name, quantity: 1, course: parseInt(opts.course, 10) })),
      }, opts.tenant);
      const orderId = res.order?.id ?? res.id ?? 'ord-demo';
      await apiPatch(`/v1/orders/${orderId}/send`, {}, opts.tenant);
      console.log(chalk.bold.green(`\n✔ Order fired to kitchen for Table ${tableId} (${itemList.length} items)!`));
      console.log(chalk.gray(`Order ID: ${orderId}\n`));
    } catch (err: any) {
      console.error(chalk.red(`\n✖ Failed to fire order: ${err.message}\n`));
    }
  });

// 4. Merge Tables
posCommand
  .command('merge <targetTableId> <sourceTableIds...>')
  .description('Merge multiple tables into a single master ticket')
  .option('--tenant <id>', 'Tenant ID')
  .action(async (targetTableId, sourceTableIds, opts) => {
    try {
      await apiPost('/v1/tables/merge', {
        targetTableId,
        sourceTableIds,
      }, opts.tenant);
      console.log(chalk.green(`✔ Tables [${sourceTableIds.join(', ')}] merged into Table ${targetTableId}`));
    } catch (err: any) {
      console.error(chalk.red(`\n✖ Table merge failed: ${err.message}\n`));
    }
  });

// 5. Transfer Table Server
posCommand
  .command('transfer <tableId> <serverPin>')
  .description('Transfer open table to another server')
  .option('--tenant <id>', 'Tenant ID')
  .action(async (tableId, serverPin, opts) => {
    try {
      await apiPost('/v1/tables/transfer', {
        tableId,
        newServerPin: serverPin,
      }, opts.tenant);
      console.log(chalk.green(`✔ Table ${tableId} transferred to server with PIN ${serverPin}`));
    } catch (err: any) {
      console.error(chalk.red(`\n✖ Table transfer failed: ${err.message}\n`));
    }
  });

// 6. Void Line Item with Manager PIN
posCommand
  .command('void <orderId> <itemId> <reason> <managerPin>')
  .description('Void a post-send cooked item with Manager PIN and reason code')
  .option('--tenant <id>', 'Tenant ID')
  .action(async (orderId, itemId, reason, managerPin, opts) => {
    try {
      await apiPost(`/v1/orders/${orderId}/items/${itemId}/void`, {
        reason,
        managerPin,
      }, opts.tenant);
      console.log(chalk.yellow(`✔ Item ${itemId} voided on Order ${orderId} (Reason: ${reason})`));
      console.log(chalk.gray('Waste logged into CulinaryOps ledger automatically.'));
    } catch (err: any) {
      console.error(chalk.red(`\n✖ Void failed: ${err.message}\n`));
    }
  });

// 7. Settle & Pay Bill
posCommand
  .command('pay <orderId>')
  .description('Settle and close out an order')
  .option('--method <method>', 'Payment method (card|tap|cash|qr)', 'card')
  .option('--tip <amount>', 'Tip amount in dollars', '5.00')
  .option('--tenant <id>', 'Tenant ID')
  .action(async (orderId, opts) => {
    try {
      await apiPost(`/v1/orders/${orderId}/pay`, {
        method: opts.method,
        tip: parseFloat(opts.tip) * 100,
      }, opts.tenant);
      console.log(chalk.green(`✔ Order ${orderId} settled via ${opts.method.toUpperCase()} (Tip: $${opts.tip})`));
    } catch (err: any) {
      console.error(chalk.red(`\n✖ Payment settlement failed: ${err.message}\n`));
    }
  });
