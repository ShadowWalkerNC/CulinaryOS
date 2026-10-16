import { Command } from 'commander';
import chalk from 'chalk';
import { table } from 'table';

export const diagnosticsCommand = new Command('diagnostics')
  .description('Run RestRevive-AI Prime Cost, Menu Engineering Matrix, and Waste Anomaly diagnostics');

diagnosticsCommand
  .command('prime-cost')
  .description('Evaluate Prime Cost (COGS + Labor) against 60% industry benchmark')
  .option('--revenue <cents>', 'Total revenue in integer cents', '1000000')
  .option('--cogs <cents>', 'Food & beverage COGS in integer cents', '290000')
  .option('--labor <cents>', 'Total labor cost in integer cents', '310000')
  .action((opts) => {
    const revenueCents = parseInt(opts.revenue, 10);
    const cogsCents = parseInt(opts.cogs, 10);
    const laborCents = parseInt(opts.labor, 10);
    const primeCents = cogsCents + laborCents;
    const primePct = revenueCents > 0 ? (primeCents / revenueCents) * 100 : 0;
    const cogsPct = revenueCents > 0 ? (cogsCents / revenueCents) * 100 : 0;
    const laborPct = revenueCents > 0 ? (laborCents / revenueCents) * 100 : 0;
    const status = primePct <= 60 ? chalk.bold.green('HEALTHY (<=60%)') : chalk.bold.red('ELEVATED (>60%)');

    const rows = [
      ['Metric', 'Amount', '% of Sales', 'Target'],
      ['Total Revenue', `$${(revenueCents / 100).toFixed(2)}`, '100.0%', '—'],
      ['COGS (Food & Bev)', `$${(cogsCents / 100).toFixed(2)}`, `${cogsPct.toFixed(1)}%`, '<= 28.0%'],
      ['Total Labor', `$${(laborCents / 100).toFixed(2)}`, `${laborPct.toFixed(1)}%`, '<= 32.0%'],
      ['Prime Cost Total', chalk.bold(`$${(primeCents / 100).toFixed(2)}`), chalk.bold(`${primePct.toFixed(1)}%`), status],
    ];

    console.log(chalk.bold.hex('#F97316')('\n📈 RestRevive-AI Prime Cost Diagnostic:'));
    console.log(table(rows));
  });
