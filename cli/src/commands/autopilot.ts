import { Command } from 'commander';
import chalk from 'chalk';
import { table } from 'table';
import { apiGet } from '../lib/api-client';

export const autopilotCommand = new Command('autopilot')
  .description('Inspect AI Kitchen Autopilot, predictive rush demand, and per-tenant token dashboard');

// 1. Autopilot Status & Feature Flag
autopilotCommand
  .command('status')
  .description('Check AI Kitchen Autopilot enablement and feature flag state')
  .option('--tenant <id>', 'Tenant ID')
  .action(async (opts) => {
    try {
      const res: any = await apiGet('/v1/autopilot/status', opts.tenant);
      const rows = [
        ['Field', 'Value'],
        ['Feature Flag', chalk.bold(res.featureFlag ?? 'ENABLE_AI_AUTOPILOT')],
        ['Status', res.enabled ? chalk.bold.green('ACTIVE / ENABLED') : chalk.bold.yellow('OFF BY DEFAULT (Rule 6 compliant)')],
        ['Description', res.description ?? 'Predictive prep, dynamic 86-ing, par suggestions'],
      ];

      console.log(chalk.bold.hex('#F97316')('\n🤖 AI Kitchen Autopilot Status:'));
      console.log(table(rows));
      if (!res.enabled) {
        console.log(chalk.gray('Tip: Set ENABLE_AI_AUTOPILOT=true in .env to activate predictive forecasting.\n'));
      }
    } catch (err: any) {
      console.error(chalk.red(`\n✖ Failed to fetch autopilot status: ${err.message}\n`));
    }
  });

// 2. Token Audit & Cost Dashboard
autopilotCommand
  .command('tokens')
  .description('Audit tenant AI token burn and estimated cost from ai_prompt_log')
  .option('--tenant <id>', 'Tenant ID')
  .action(async (opts) => {
    try {
      const dash: any = await apiGet('/v1/autopilot/token-dashboard', opts.tenant);
      const summaryRows = [
        ['Metric', 'Value'],
        ['Total Queries Logged', String(dash.totalQueries ?? 0)],
        ['Total Tokens Consumed', String(dash.totalTokens ?? 0)],
        ['Estimated Cost', chalk.bold.green(`$${((dash.totalCostEstimateCents ?? 0) / 100).toFixed(2)}`)],
      ];

      console.log(chalk.bold.hex('#F97316')('\n📊 Tenant AI Token & Cost Dashboard:'));
      console.log(table(summaryRows));

      if (dash.recentLogs && dash.recentLogs.length > 0) {
        const logRows = [
          ['Feature', 'Total Tokens', 'Cost (Cents)', 'Timestamp'],
          ...dash.recentLogs.map((l: any) => [
            l.feature,
            String(l.total_tokens),
            `${l.cost_estimate_cents}¢`,
            new Date(l.created_at).toLocaleTimeString(),
          ]),
        ];
        console.log(chalk.bold('Recent Prompt Logs:'));
        console.log(table(logRows));
      }
    } catch (err: any) {
      console.error(chalk.red(`\n✖ Failed to fetch token dashboard: ${err.message}\n`));
    }
  });

// 3. Demand Forecast
autopilotCommand
  .command('forecast')
  .description('Generate predictive covers and revenue forecast for a daypart')
  .option('--day <num>', 'Day of week (0-6)', String(new Date().getDay()))
  .option('--daypart <name>', 'Daypart (breakfast, lunch, dinner, late_night)', 'dinner')
  .option('--weather <multiplier>', 'Weather surge multiplier (e.g. 1.15)', '1.0')
  .option('--tenant <id>', 'Tenant ID')
  .action(async (opts) => {
    try {
      const res: any = await apiGet(
        `/v1/autopilot/forecast?day_of_week=${opts.day}&daypart=${opts.daypart}&weather_multiplier=${opts.weather}`,
        opts.tenant
      );

      const f = res.forecast;
      const rows = [
        ['Forecast Metric', 'Predicted Value'],
        ['Daypart', res.daypart.toUpperCase()],
        ['Projected Orders', chalk.bold(String(f.predictedOrderCount ?? f.projectedOrders ?? 0))],
        ['Projected Revenue', chalk.bold.green(`$${(f.projectedRevenueCents / 100).toFixed(2)}`)],
        ['Confidence Score', `${Math.round(f.confidenceScorePercent ?? f.confidenceScore ?? 0)}%`],
      ];

      console.log(chalk.bold.hex('#F97316')('\n🔮 Kitchen Autopilot Demand Forecast:'));
      console.log(table(rows));
    } catch (err: any) {
      console.error(chalk.red(`\n✖ Demand forecast failed: ${err.message}\n`));
    }
  });
