import { integerArgument, operationId } from '../lib/native-input';
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
      console.log(chalk.bold.hex('#F97316')('\nActive Dining Room Orders:'));
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

// 8. Record Cash/Comp Payment (native)
posCommand
  .command('cash-comp <orderId> <amountCents>')
  .description('Record a native cash/comp payment for the exact order total')
  .option('--method <method>', 'Payment method (cash|comp)', 'cash')
  .option('--tip-cents <cents>', 'Tip in integer cents', '0')
  .option('--tenant <id>', 'Tenant ID')
  .option('--operation-id <id>', 'Idempotency key (generated when omitted)')
  .action(async (orderId, amountCents, opts) => {
    try {
      await apiPost(`/v1/payments/cash-comp`, {
        orderId,
        method: opts.method,
        amount: integerArgument(amountCents),
        tipCents: integerArgument(opts.tipCents),
        operationId: operationId(opts.operationId),
      }, opts.tenant);
      console.log(chalk.green(`✔ Order ${orderId} paid via ${String(opts.method).toUpperCase()} (${amountCents}c)`));
    } catch (err: any) {
      process.exitCode = 1;
      console.error(chalk.red(`\n✖ Cash/comp payment failed: ${err.message}\n`));
    }
  });

// 9. Refund Payment (native, manager session required)
posCommand
  .command('refund <paymentId> <amountCents> <reason>')
  .description('Record a native partial/full refund against a completed payment')
  .option('--tenant <id>', 'Tenant ID')
  .option('--operation-id <id>', 'Idempotency key (generated when omitted)')
  .action(async (paymentId, amountCents, reason, opts) => {
    try {
      await apiPost(`/v1/payments/refund`, {
        paymentId,
        amountCents: integerArgument(amountCents),
        reason,
        operationId: operationId(opts.operationId),
      }, opts.tenant);
      console.log(chalk.green(`✔ Refund of ${amountCents}c recorded on payment ${paymentId}`));
    } catch (err: any) {
      process.exitCode = 1;
      console.error(chalk.red(`\n✖ Refund failed: ${err.message}\n`));
    }
  });

// 10. Open Cash Drawer (native, manager session required)
posCommand
  .command('drawer-open')
  .description('Open a native cash drawer session with an opening float')
  .option('--drawer <name>', 'Drawer name', 'main')
  .option('--float-cents <cents>', 'Opening float in integer cents', '0')
  .option('--tenant <id>', 'Tenant ID')
  .action(async (opts) => {
    try {
      await apiPost(`/v1/drawers/open`, {
        drawerName: opts.drawer,
        openingFloatCents: integerArgument(opts.floatCents),
      }, opts.tenant);
      console.log(chalk.green(`✔ Drawer ${opts.drawer} opened (float ${opts.floatCents}c)`));
    } catch (err: any) {
      process.exitCode = 1;
      console.error(chalk.red(`\n✖ Drawer open failed: ${err.message}\n`));
    }
  });

// 11. Record Drawer Movement (native, manager session required)
posCommand
  .command('drawer-movement <kind> <amountCents>')
  .description('Record a native drawer movement (paid_in|paid_out|cash_sale)')
  .option('--drawer <name>', 'Drawer name', 'main')
  .option('--tenant <id>', 'Tenant ID')
  .option('--operation-id <id>', 'Idempotency key (generated when omitted)')
  .action(async (kind, amountCents, opts) => {
    try {
      await apiPost(`/v1/drawers/movement`, {
        drawerName: opts.drawer,
        kind,
        amountCents: integerArgument(amountCents),
        operationId: operationId(opts.operationId),
      }, opts.tenant);
      console.log(chalk.green(`✔ Drawer ${opts.drawer} ${kind} ${amountCents}c recorded`));
    } catch (err: any) {
      process.exitCode = 1;
      console.error(chalk.red(`\n✖ Drawer movement failed: ${err.message}\n`));
    }
  });

// 12. Close Cash Drawer (native, manager session required)
posCommand
  .command('drawer-close <countedCents>')
  .description('Close a native drawer session with a counted total; reports expected/variance')
  .option('--drawer <name>', 'Drawer name', 'main')
  .option('--tenant <id>', 'Tenant ID')
  .action(async (countedCents, opts) => {
    try {
      const res: any = await apiPost(`/v1/drawers/close`, {
        drawerName: opts.drawer,
        countedCents: integerArgument(countedCents),
      }, opts.tenant);
      const data = res?.data ?? {};
      console.log(chalk.green(`✔ Drawer ${opts.drawer} closed (expected ${data.expectedCents}c, variance ${data.varianceCents}c)`));
    } catch (err: any) {
      process.exitCode = 1;
      console.error(chalk.red(`\n✖ Drawer close failed: ${err.message}\n`));
    }
  });

// 13. Show Cash Drawer (native)
posCommand
  .command('drawer-show')
  .description('Show the latest native drawer session for a drawer')
  .option('--drawer <name>', 'Drawer name', 'main')
  .option('--tenant <id>', 'Tenant ID')
  .action(async (opts) => {
    try {
      const res: any = await apiGet(`/v1/drawers/${opts.drawer}`, opts.tenant);
      const s = res?.data ?? res;
      console.log(chalk.bold(`\nDrawer ${s.drawer_name} (${s.status})`));
      console.log(table([
        ['Float', 'Cash sales', 'Paid in', 'Paid out', 'Counted'],
        [s.opening_float_cents, s.cash_sales_cents, s.paid_in_cents, s.paid_out_cents, s.counted_cents ?? '-'],
      ]));
    } catch (err: any) {
      process.exitCode = 1;
      console.error(chalk.red(`\n✖ Drawer show failed: ${err.message}\n`));
    }
  });
