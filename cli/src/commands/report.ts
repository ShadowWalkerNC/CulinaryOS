import { Command } from 'commander';
import { table } from 'table';
import { apiGet } from '../lib/api-client';

export const reportCommand = new Command('report')
  .description('Generate and view operational reports');

reportCommand
  .command('sales')
  .description('Daily sales summary')
  .requiredOption('--tenant <id>', 'Tenant ID')
  .option('--date <date>', 'Date (YYYY-MM-DD)', new Date().toISOString().slice(0, 10))
  .action(async (opts) => {
    const r: any = await apiGet(`/api/tenants/${opts.tenant}/reports/sales?date=${opts.date}`);
    const rows = [
      ['Metric', 'Value'],
      ['Total Revenue', `$${r.totalRevenue?.toFixed(2) ?? '0.00'}`],
      ['Orders', r.orderCount ?? 0],
      ['Avg Ticket', `$${r.avgTicket?.toFixed(2) ?? '0.00'}`],
      ['Voids', r.voidCount ?? 0],
      ['Top Item', r.topItem ?? '—'],
    ];
    console.log(`\nSales Report — ${opts.date}`);
    console.log(table(rows));
  });

reportCommand
  .command('depletion')
  .description('Ingredient depletion report')
  .requiredOption('--tenant <id>', 'Tenant ID')
  .option('--date <date>', 'Date (YYYY-MM-DD)', new Date().toISOString().slice(0, 10))
  .action(async (opts) => {
    const items: any[] = await apiGet(`/api/tenants/${opts.tenant}/reports/depletion?date=${opts.date}`);
    const rows = [['Ingredient', 'Used', 'Unit', 'Remaining'],
      ...items.map((i) => [i.name, i.used, i.unit, i.remaining])];
    console.log(`\nDepletion Report — ${opts.date}`);
    console.log(table(rows));
  });
