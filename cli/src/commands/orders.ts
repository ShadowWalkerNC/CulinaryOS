import { Command } from 'commander';
import chalk from 'chalk';
import { table } from 'table';
import { apiGet, apiPost } from '../lib/api-client';

export const ordersCommand = new Command('orders')
  .description('View and manage kitchen orders');

ordersCommand
  .command('list')
  .description('List open orders')
  .requiredOption('--tenant <id>', 'Tenant ID')
  .option('--status <status>', 'Filter by status (open|fired|completed)', 'open')
  .action(async (opts) => {
    const orders: any[] = await apiGet(`/api/tenants/${opts.tenant}/orders?status=${opts.status}`);
    const rows = [['Order ID', 'Table', 'Items', 'Status', 'Created'],
      ...orders.map((o) => [o.id.slice(0, 8), o.tableLabel ?? '—', o.itemCount, o.status, new Date(o.createdAt).toLocaleTimeString()])];
    console.log(table(rows));
  });

ordersCommand
  .command('fire')
  .description('Fire an order to the kitchen')
  .requiredOption('--tenant <id>', 'Tenant ID')
  .requiredOption('--order <id>', 'Order ID')
  .action(async (opts) => {
    await apiPost(`/api/tenants/${opts.tenant}/orders/${opts.order}/fire`, {});
    console.log(chalk.green(`✔ Order ${opts.order} fired to kitchen`));
  });

ordersCommand
  .command('void')
  .description('Void an order')
  .requiredOption('--tenant <id>', 'Tenant ID')
  .requiredOption('--order <id>', 'Order ID')
  .requiredOption('--reason <reason>', 'Void reason')
  .action(async (opts) => {
    await apiPost(`/api/tenants/${opts.tenant}/orders/${opts.order}/void`, { reason: opts.reason });
    console.log(chalk.yellow(`✔ Order ${opts.order} voided`));
  });
