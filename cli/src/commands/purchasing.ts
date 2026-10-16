import { Command } from 'commander';
import chalk from 'chalk';
import { table } from 'table';
import { apiGet, apiPost } from '../lib/api-client';

export const purchasingCommand = new Command('purchasing')
  .description('Manage vendors, purchase orders, receiving, and supplier price variances');

purchasingCommand
  .command('vendors')
  .description('List approved suppliers and vendor contacts')
  .option('--tenant <id>', 'Tenant ID')
  .action(async (opts) => {
    try {
      const res: any = await apiGet('/v1/purchasing/vendors', opts.tenant);
      const vendors = Array.isArray(res?.data ?? res) ? (res?.data ?? res) : [];
      const rows = [
        ['ID', 'Vendor Name', 'Contact', 'Status'],
        ...vendors.map((v: any) => [
          String(v.id ?? '—'),
          chalk.bold(String(v.name ?? 'Vendor')),
          String(v.contact_email ?? v.phone ?? '—'),
          chalk.green(String(v.status ?? 'active')),
        ]),
      ];
      console.log(chalk.bold.hex('#F97316')('\n🚚 Approved Vendors:'));
      console.log(table(rows));
    } catch (err: any) {
      console.error(chalk.red(`\n✖ Failed to list vendors: ${err.message}\n`));
    }
  });

purchasingCommand
  .command('orders')
  .description('List purchase orders')
  .option('--tenant <id>', 'Tenant ID')
  .action(async (opts) => {
    try {
      const res: any = await apiGet('/v1/purchasing/purchase-orders', opts.tenant);
      const pos = Array.isArray(res?.data ?? res) ? (res?.data ?? res) : [];
      const rows = [
        ['PO ID', 'Vendor', 'Total', 'Status'],
        ...pos.map((po: any) => [
          String(po.id ?? '—'),
          String(po.vendor_name ?? po.vendor_id ?? '—'),
          `$${((po.total_cents ?? 0) / 100).toFixed(2)}`,
          String(po.status ?? 'draft'),
        ]),
      ];
      console.log(chalk.bold.hex('#F97316')('\n📦 Purchase Orders:'));
      console.log(table(rows));
    } catch (err: any) {
      console.error(chalk.red(`\n✖ Failed to list purchase orders: ${err.message}\n`));
    }
  });

purchasingCommand
  .command('receive <poId>')
  .description('Receive a purchase order into inventory')
  .option('--tenant <id>', 'Tenant ID')
  .action(async (poId, opts) => {
    try {
      const res: any = await apiPost(`/v1/purchasing/purchase-orders/${poId}/receive`, {}, opts.tenant);
      console.log(chalk.green(`\n✔ Purchase order ${poId} received (${res?.data?.status ?? 'received'}).\n`));
    } catch (err: any) {
      console.error(chalk.red(`\n✖ Failed to receive purchase order: ${err.message}\n`));
    }
  });
