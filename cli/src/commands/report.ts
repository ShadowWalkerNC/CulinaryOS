import { Command } from 'commander';
import { table } from 'table';
import * as readline from 'readline';
import { apiGet, apiPost } from '../lib/api-client.js';

export const reportCommand = new Command('report')
  .description('Generate and view operational reports');

// ─── culinary report sales ────────────────────────────────────────────────────
reportCommand
  .command('sales')
  .description('Daily sales summary')
  .requiredOption('--tenant <id>', 'Tenant ID')
  .option('--date <date>', 'Date (YYYY-MM-DD)', new Date().toISOString().slice(0, 10))
  .action(async (opts) => {
    const r: any = await apiGet(`/v1/reports/sales-summary?date=${opts.date}`, opts.tenant);
    const rows = [
      ['Metric', 'Value'],
      ['Date', opts.date],
      ['Total Revenue', `$${((r.revenueCents ?? 0) / 100).toFixed(2)}`],
      ['Orders', r.orders ?? 0],
    ];
    console.log(`\nSales Report — ${opts.date}`);
    console.log(table(rows));
  });

// ─── culinary report depletion ────────────────────────────────────────────────
reportCommand
  .command('depletion')
  .description('Ingredient depletion report')
  .requiredOption('--tenant <id>', 'Tenant ID')
  .option('--date <date>', 'Date (YYYY-MM-DD)', new Date().toISOString().slice(0, 10))
  .action(async (opts) => {
    const r: any = await apiGet(`/v1/reports/pantry-usage`, opts.tenant);
    const items: any[] = r.items ?? [];
    const rows = [
      ['Ingredient', 'Status', 'Qty', 'Unit'],
      ...items.map((i) => [i.name, i.stock_status, i.current_qty ?? i.quantity, i.unit]),
    ];
    console.log(`\nDepletion Report — ${opts.date}`);
    console.log(table(rows));
  });

// ─── culinary report tips ─────────────────────────────────────────────────────
reportCommand
  .command('tips')
  .description('Calculate and display FLSA-compliant shift tip pool distribution')
  .requiredOption('--tenant <id>', 'Tenant ID')
  .option('--pool <cents>', 'Total tip pool in cents', '0')
  .option('--method <method>', 'Distribution method: hours_worked|role_weighted|keep_your_own|percent_of_sales', 'hours_worked')
  .option('--pays-tip-credit', 'Employer takes tip credit (excludes BOH)', false)
  .action(async (opts) => {
    const poolTotalCents = parseInt(opts.pool, 10) || 0;
    const r: any = await apiPost(
      `/v1/reports/tip-pool/calculate`,
      {
        method: opts.method,
        poolTotalCents,
        paysTipCredit: opts.paysTipCredit ?? false,
      },
      opts.tenant
    );

    const payouts: any[] = r.staffPayouts ?? [];
    console.log(`\n╔══════════════════════════════════════════════════════════════╗`);
    console.log(`  Tip Pool Distribution — ${opts.method.toUpperCase()}`);
    console.log(`  Total Pool: $${(poolTotalCents / 100).toFixed(2)} | Pays Tip Credit: ${opts.paysTipCredit ? 'YES (BOH excluded)' : 'NO'}`);
    console.log(`╚══════════════════════════════════════════════════════════════╝`);

    const rows = [
      ['Staff', 'Role', 'Hours', 'FLSA Status', 'Payout ($)', 'Tip/hr ($)'],
      ...payouts.map((p: any) => [
        p.staffName ?? p.staffId,
        p.role,
        p.hours,
        p.flsaStatus,
        (p.payoutCents / 100).toFixed(2),
        (p.effectiveHourlyTipRateCents / 100).toFixed(2),
      ]),
    ];
    console.log(table(rows));

    if (r.legalNotices && r.legalNotices.length > 0) {
      console.log('\n⚠  FLSA Legal Notices:');
      r.legalNotices.forEach((n: string) => console.log(`   • ${n}`));
      console.log('');
    }
  });

// ─── culinary report tips-export ─────────────────────────────────────────────
reportCommand
  .command('tips-export')
  .description('Export shift tip pool distribution as payroll CSV (standard, Gusto, or ADP format)')
  .requiredOption('--tenant <id>', 'Tenant ID')
  .option('--pool <cents>', 'Total tip pool in cents', '0')
  .option('--method <method>', 'Distribution method', 'hours_worked')
  .option('--format <fmt>', 'CSV format: standard|gusto|adp', 'standard')
  .option('--date <date>', 'Shift date (YYYY-MM-DD)', new Date().toISOString().slice(0, 10))
  .option('--pays-tip-credit', 'Employer takes tip credit (excludes BOH)', false)
  .option('--company-code <code>', 'ADP Company Code (for ADP format)', 'CULINARY')
  .action(async (opts) => {
    const poolTotalCents = parseInt(opts.pool, 10) || 0;
    const params = new URLSearchParams({
      method: opts.method,
      poolTotalCents: String(poolTotalCents),
      format: opts.format,
      date: opts.date,
      paysTipCredit: opts.paysTipCredit ? 'true' : 'false',
      companyCode: opts.companyCode ?? 'CULINARY',
    });

    // Direct CSV download — print to stdout for piping
    const res = await fetch(
      `${process.env.CULINARY_API_URL ?? 'http://localhost:3000'}/v1/reports/tips/export/csv?${params}`,
      {
        headers: {
          'X-Tenant-Id': opts.tenant,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error(`❌ Error exporting tips CSV: ${res.status} ${text}`);
      process.exit(1);
    }

    const csv = await res.text();
    process.stdout.write(csv);
    process.stderr.write(`\n✅ Tip payroll CSV exported (${opts.format.toUpperCase()} format, ${opts.date})\n`);
  });

// ─── culinary report z-report ────────────────────────────────────────────────
reportCommand
  .command('z-report')
  .description('Preview end-of-day Z-Report (shift financials, drawer float, tips)')
  .requiredOption('--tenant <id>', 'Tenant ID')
  .option('--date <date>', 'Shift date (YYYY-MM-DD)', new Date().toISOString().slice(0, 10))
  .option('--float <cents>', 'Opening float in cents', '20000')
  .option('--tip-method <method>', 'Tip pool distribution method', 'hours_worked')
  .action(async (opts) => {
    const params = new URLSearchParams({
      date: opts.date,
      openingFloatCents: opts.float,
      tipPoolMethod: opts.tipMethod ?? 'hours_worked',
    });
    const r: any = await apiGet(`/v1/reports/z-report?${params}`, opts.tenant);
    const f = r.financials ?? {};
    const cash = r.cashReconciliation ?? {};
    const tips = r.tipPoolSummary ?? {};

    console.log(`\n╔══════════════════════════════════════════════════════════════╗`);
    console.log(`  Z-REPORT PREVIEW — ${r.zReportNumber ?? '—'} | ${opts.date}`);
    console.log(`  Status: ${(r.status ?? '—').toUpperCase()}`);
    console.log(`╚══════════════════════════════════════════════════════════════╝`);

    const finRows = [
      ['Financial Metric', 'Amount'],
      ['Gross Sales', `$${((f.grossSalesCents ?? 0) / 100).toFixed(2)}`],
      ['Discounts / Comps', `-$${((f.discountsCompsCents ?? 0) / 100).toFixed(2)}`],
      ['Voids', `-$${((f.voidsTotalCents ?? 0) / 100).toFixed(2)}`],
      ['Net Sales', `$${((f.netSalesCents ?? 0) / 100).toFixed(2)}`],
      ['Tax', `$${((f.taxTotalCents ?? 0) / 100).toFixed(2)}`],
      ['Total Revenue', `$${((f.totalRevenueCents ?? 0) / 100).toFixed(2)}`],
      ['Orders', f.totalOrdersCount ?? 0],
      ['Covers', f.guestCoverCount ?? 0],
      ['Avg Check', `$${((f.averageCheckCents ?? 0) / 100).toFixed(2)}`],
    ];
    console.log('\n📊 FINANCIALS');
    console.log(table(finRows));

    const drawerRows = [
      ['Cash Drawer', 'Amount'],
      ['Opening Float', `$${((cash.openingFloatCents ?? 0) / 100).toFixed(2)}`],
      ['Cash Sales', `$${((cash.cashSalesCents ?? 0) / 100).toFixed(2)}`],
      ['Expected in Drawer', `$${((cash.expectedInDrawerCents ?? 0) / 100).toFixed(2)}`],
      ['Actual Counted', cash.actualCountedCents > 0 ? `$${(cash.actualCountedCents / 100).toFixed(2)}` : 'NOT YET COUNTED'],
      ['Over / Short', cash.overShortCents !== undefined ? `${cash.overShortCents >= 0 ? '+' : ''}$${(cash.overShortCents / 100).toFixed(2)}` : '—'],
    ];
    console.log('\n💵 CASH DRAWER');
    console.log(table(drawerRows));

    console.log(`\n🎯 TIP POOL — Total: $${((tips.poolTotalCents ?? 0) / 100).toFixed(2)} | Method: ${tips.method ?? '—'}`);
    console.log(`   ℹ  Run 'culinary report tips' to view full staff breakdown.\n`);
  });

// ─── culinary report z-close ─────────────────────────────────────────────────
reportCommand
  .command('z-close')
  .description('Seal shift with manager PIN — immutable Z-Report is stamped and cash over/short is locked')
  .requiredOption('--tenant <id>', 'Tenant ID')
  .requiredOption('--counted <cents>', 'Actual cash counted in drawer (cents)')
  .option('--date <date>', 'Shift date (YYYY-MM-DD)', new Date().toISOString().slice(0, 10))
  .option('--float <cents>', 'Opening float in cents', '20000')
  .option('--shift <id>', 'Shift ID', 'shift-main')
  .option('--tip-method <method>', 'Tip pool method', 'hours_worked')
  .option('--notes <text>', 'Optional manager closeout notes')
  .action(async (opts) => {
    // Prompt for PIN without echoing
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const pin = await new Promise<string>((resolve) => {
      process.stdout.write('🔐 Manager PIN: ');
      process.stdin.setRawMode?.(true);
      let input = '';
      process.stdin.on('data', (char) => {
        const c = char.toString();
        if (c === '\n' || c === '\r' || c === '\u0003') {
          process.stdin.setRawMode?.(false);
          process.stdout.write('\n');
          rl.close();
          resolve(input);
        } else if (c === '\u007f') {
          input = input.slice(0, -1);
          process.stdout.clearLine?.(0);
          process.stdout.cursorTo?.(0);
          process.stdout.write(`🔐 Manager PIN: ${'*'.repeat(input.length)}`);
        } else {
          input += c;
          process.stdout.write('*');
        }
      });
      process.stdin.resume();
    });

    if (!pin) {
      console.error('❌ Manager PIN is required to close shift.');
      process.exit(1);
    }

    try {
      const r: any = await apiPost(
        `/v1/reports/z-report/close`,
        {
          managerPin: pin,
          date: opts.date,
          shiftId: opts.shift,
          openingFloatCents: parseInt(opts.float, 10),
          actualCashCountedCents: parseInt(opts.counted, 10),
          tipPoolMethod: opts.tipMethod ?? 'hours_worked',
          notes: opts.notes,
        },
        opts.tenant
      );

      const cash = r.cashReconciliation ?? {};
      const overShort = cash.overShortCents ?? 0;
      const overShortLabel = overShort === 0
        ? '✅ BALANCED'
        : overShort > 0
          ? `✅ OVER by $${(overShort / 100).toFixed(2)}`
          : `❌ SHORT by $${(Math.abs(overShort) / 100).toFixed(2)}`;

      console.log(`\n╔══════════════════════════════════════════════════════════════╗`);
      console.log(`  SHIFT CLOSED — Z-Report ${r.zReportNumber ?? '—'}`);
      console.log(`  Date: ${opts.date} | Closed by: ${r.closedBy?.displayName ?? 'Manager'}`);
      console.log(`╚══════════════════════════════════════════════════════════════╝`);
      console.log(`\n  💵 Cash Drawer: ${overShortLabel}`);
      console.log(`  📊 Net Sales:   $${((r.financials?.netSalesCents ?? 0) / 100).toFixed(2)}`);
      console.log(`  💰 Total Collected: $${((r.financials?.totalRevenueCents ?? 0) / 100).toFixed(2)}`);
      console.log(`\n  ✅ Z-Report sealed and immutable. Ledger entry logged.\n`);
    } catch (e: any) {
      console.error(`❌ ${e.message}`);
      process.exit(1);
    }
  });
