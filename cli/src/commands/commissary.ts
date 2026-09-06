import { Command } from 'commander';
import chalk from 'chalk';
import { table } from 'table';
import { apiGet, apiPost } from '../lib/api-client';

export const commissaryCommand = new Command('commissary')
  .description('Manage multi-unit commissary stock transfers, replenishment, and franchise royalty ledger');

// 1. List Stock Transfers
commissaryCommand
  .command('transfers')
  .description('List incoming and outgoing stock transfers for the location')
  .option('--tenant <id>', 'Tenant ID')
  .action(async (opts) => {
    try {
      const res: any = await apiGet('/v1/commissary/transfers', opts.tenant);
      const transfers = res.transfers ?? [];

      if (transfers.length === 0) {
        console.log(chalk.yellow('\nNo active commissary transfers found.\n'));
        return;
      }

      const rows = [
        ['Order #', 'Status', 'Items', 'Created', 'Shipped'],
        ...transfers.map((t: any) => [
          chalk.bold(t.orderNumber ?? t.id),
          t.status === 'shipped' ? chalk.cyan(t.status) : t.status === 'delivered' ? chalk.green(t.status) : chalk.yellow(t.status),
          (t.items ?? []).map((i: any) => `${i.quantityRequested} ${i.unit} ${i.itemName}`).join(', '),
          new Date(t.createdAt).toLocaleDateString(),
          t.shippedAt ? new Date(t.shippedAt).toLocaleDateString() : 'Pending',
        ]),
      ];

      console.log(chalk.bold.hex('#F97316')('\n📦 Multi-Unit Commissary Transfers:'));
      console.log(table(rows));
    } catch (err: any) {
      console.error(chalk.red(`\n✖ Failed to fetch transfers: ${err.message}\n`));
    }
  });

// 2. Request Stock Replenishment
commissaryCommand
  .command('request <item> <quantity>')
  .description('Request stock replenishment from central production commissary')
  .option('--unit <unit>', 'Unit of measure (e.g. kg, portions, packs)', 'portions')
  .option('--tenant <id>', 'Tenant ID')
  .action(async (itemName, quantity, opts) => {
    try {
      const payload = {
        items: [
          {
            itemName,
            quantityRequested: Number(quantity),
            unit: opts.unit,
          },
        ],
      };

      const res: any = await apiPost('/v1/commissary/transfers/request', payload, opts.tenant);
      console.log(chalk.bold.green('\n✔ Stock Transfer Request Dispatched:'));
      console.log(`  Order: ${chalk.bold(res.orderNumber ?? res.id)}`);
      console.log(`  Status: ${chalk.cyan(res.status)}`);
      console.log(`  Items: ${quantity} ${opts.unit} ${itemName}\n`);
    } catch (err: any) {
      console.error(chalk.red(`\n✖ Transfer request failed: ${err.message}\n`));
    }
  });

// 3. Franchise Royalty Ledger
commissaryCommand
  .command('royalty')
  .description('View brand-wide franchise royalty ledger across all units')
  .option('--from <date>', 'Start date (YYYY-MM-DD)', '2026-09-01')
  .option('--to <date>', 'End date (YYYY-MM-DD)', '2026-09-30')
  .option('--tenant <id>', 'Tenant ID')
  .action(async (opts) => {
    try {
      const ledger: any = await apiGet(`/v1/commissary/royalty-ledger?from=${opts.from}&to=${opts.to}`, opts.tenant);
      const rows = [
        ['Store Name', 'Gross Sales', 'Royalty %', 'Royalty Due'],
        ...(ledger.stores ?? ledger.storeLedgers ?? []).map((s: any) => [
          s.storeName,
          `$${(s.grossSalesCents / 100).toFixed(2)}`,
          `${s.royaltyRatePercent}%`,
          chalk.bold.green(`$${(s.royaltyDueCents / 100).toFixed(2)}`),
        ]),
      ];

      console.log(chalk.bold.hex('#F97316')('\n🏢 Multi-Unit Franchise Royalty Ledger:'));
      console.log(chalk.gray(`Period: ${opts.from} to ${opts.to}`));
      console.log(table(rows));
      if (ledger.totalRoyaltyDueCents) {
        console.log(chalk.bold(`Total Franchise Royalty: $${(ledger.totalRoyaltyDueCents / 100).toFixed(2)}\n`));
      }
    } catch (err: any) {
      console.error(chalk.red(`\n✖ Royalty ledger query failed: ${err.message}\n`));
    }
  });

// 4. Generate Auditable Transfer Packing Slip
commissaryCommand
  .command('packing-slip <transferOrderId>')
  .description('Generate an auditable distribution and logistics packing slip with lot tracking')
  .option('--tenant <id>', 'Tenant ID')
  .action(async (transferOrderId, opts) => {
    try {
      const slip: any = await apiGet(`/v1/commissary/transfers/${transferOrderId}/packing-slip`, opts.tenant);
      const rows = [
        ['Item Name', 'Qty Shipped', 'Unit', 'Lot Tracking Code'],
        ...(slip.items ?? []).map((i: any) => [
          i.name,
          String(i.quantityShipped),
          i.unit,
          chalk.cyan(i.lotCode),
        ]),
      ];

      console.log(chalk.bold.hex('#F97316')('\n📋 Commissary Transfer Logistics Packing Slip:'));
      console.log(`  Order:        ${chalk.bold(slip.transferOrderId)}`);
      console.log(`  Origin:       ${slip.sourceCommissaryName}`);
      console.log(`  Destination:  ${slip.destinationStoreName} (${slip.destinationStoreId})`);
      console.log(`  Dispatched:   ${new Date(slip.dispatchTimestamp).toLocaleString()}`);
      console.log(`  Status:       ${chalk.bold.green(slip.status.toUpperCase())}`);
      if (slip.driverNotes) {
        console.log(`  Notes:        ${chalk.yellow(slip.driverNotes)}`);
      }
      console.log(table(rows));
      console.log(`Total Units Dispatched: ${chalk.bold(slip.totalUnitsShipped)}\n`);
    } catch (err: any) {
      console.error(chalk.red(`\n✖ Failed to generate packing slip: ${err.message}\n`));
    }
  });

