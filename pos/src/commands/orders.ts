import { Command } from 'commander';
import chalk from 'chalk';
import { table } from 'table';
import { posGet, posPost, posPatch } from '../lib/api';

export const ordersCommand = new Command('orders').description('Manage POS orders');

ordersCommand.command('list').description('List open orders')
  .option('--status <s>', 'Filter by status', 'open')
  .action(async (o) => {
    const orders: any[] = await posGet(`/v1/orders?status=${o.status}`);
    if (!orders.length) { console.log(chalk.green('\n✓ No orders\n')); return; }
    const rows = [['#','Table','Server','Items','Total','Status'],
      ...orders.map((r) => [r.order_number, r.table_number??'T/A', r.server_name??'—', r.items?.length??0, `$${(r.total/100).toFixed(2)}`, r.status])];
    console.log(table(rows));
  });

ordersCommand.command('fire <orderId>').description('Fire order to kitchen')
  .action(async (id) => { await posPatch(`/v1/orders/${id}`, { status:'sent', fired_at: new Date().toISOString() }); console.log(chalk.green(`✔ Order ${id} fired`)); });

ordersCommand.command('void <orderId>').description('Void an order')
  .option('--reason <r>', 'Void reason')
  .action(async (id, o) => { await posPatch(`/v1/orders/${id}`, { status:'voided', void_reason: o.reason }); console.log(chalk.red(`✘ Order ${id} voided`)); });

ordersCommand.command('new').description('Create a new order')
  .option('--table <t>', 'Table number')
  .option('--covers <n>', 'Cover count', parseInt)
  .option('--server <s>', 'Server name')
  .action(async (o) => {
    const order: any = await posPost('/v1/orders', { table_number: o.table, cover_count: o.covers, server_name: o.server });
    console.log(chalk.green(`✔ Order created: #${order.order_number} (${order.id})`));
  });
