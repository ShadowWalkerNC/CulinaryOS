import { Command } from 'commander';
import chalk from 'chalk';
import { table } from 'table';
import { apiGet, apiPost } from '../lib/api-client';

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

      console.log(chalk.bold.hex('#F97316')('\nAI Kitchen Autopilot Status:'));
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

      console.log(chalk.bold.hex('#F97316')('\nTenant AI Token & Cost Dashboard:'));
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

      console.log(chalk.bold.hex('#F97316')('\nKitchen Autopilot Demand Forecast:'));
      console.log(table(rows));
    } catch (err: any) {
      console.error(chalk.red(`\n✖ Demand forecast failed: ${err.message}\n`));
    }
  });

// 4. Chef's Intelligence Skills Catalog
autopilotCommand
  .command('skills')
  .description('List absorbed Chef\'s Intelligence skills with Free Core vs SaaS Pro classification')
  .option('--tenant <id>', 'Tenant ID')
  .action(async (opts) => {
    try {
      const res: any = await apiGet('/v1/intelligence/skills', opts.tenant);
      const list = Array.isArray(res) ? res : res?.data || [];
      const rows = [
        ['Skill ID', 'Name', 'Zone / Category', 'Tier', 'Deterministic Fallback'],
        ...list.map((s: any) => [
          s.id,
          s.name,
          s.zone || s.category || 'Kitchen Operations',
          s.tier || 'free_core',
          s.deterministic !== false ? 'YES (Local Math)' : 'SaaS AI',
        ]),
      ];
      console.log(chalk.bold.hex('#F97316')('\nChef\'s Intelligence Absorbed Skills Catalog:'));
      console.log(table(rows));
    } catch (err: any) {
      console.error(chalk.red(`\n✖ Failed to list skills: ${err.message}\n`));
    }
  });

// 5. Open-Source vs SaaS Tiers & Entitlements
autopilotCommand
  .command('tiers')
  .description('Inspect Free Open-Source Core vs Paid SaaS Subscription Tiers & Active Entitlements')
  .option('--tenant <id>', 'Tenant ID')
  .action(async (opts) => {
    try {
      const res: any = await apiGet('/v1/intelligence/tiers', opts.tenant);
      const data = res?.data || res;
      const tiers = Object.values(data?.tiers || {}) as any[];
      const rows = [
        ['Tier ID', 'Name', 'Monthly Price', 'Per-Terminal Fee', 'License', 'Offline Capable'],
        ...tiers.map((t: any) => [
          t.id,
          t.name,
          `$${((t.monthlyPriceCents ?? 0) / 100).toFixed(2)}/mo`,
          '$0.00',
          t.license,
          t.offlineCapable ? 'YES (100%)' : 'No',
        ]),
      ];
      console.log(chalk.bold.hex('#F97316')('\nCulinaryOS Open-Source vs. Paid SaaS Tier Matrix:'));
      console.log(table(rows));
    } catch (err: any) {
      console.error(chalk.red(`\n✖ Failed to inspect tiers: ${err.message}\n`));
    }
  });

// 6. Deterministic 72% GP Dish Costing Calculator
autopilotCommand
  .command('cost-dish')
  .description('Run deterministic Chef\'s Intelligence 72% Gross Profit (28% Food Cost) dish costing calculator')
  .option('--name <dish>', 'Dish name', 'Scottish Halibut with Brown Shrimp Butter')
  .option('--gp <percent>', 'Target Gross Profit percentage', '72')
  .option('--tenant <id>', 'Tenant ID')
  .action(async (opts) => {
    try {
      const res: any = await apiPost(
        '/v1/intelligence/chefs-intelligence/cost-dish',
        {
          name: opts.name,
          targetGpPct: Number(opts.gp),
          ingredients: [
            { name: 'Primary Protein', weightGrams: 180, bulkPricePerKg: 28.0, trimYieldPct: 52 },
            { name: 'Garnish / Shellfish', weightGrams: 30, bulkPricePerKg: 32.0, trimYieldPct: 100 },
            { name: 'Unsalted Butter & Aromatics', weightGrams: 60, bulkPricePerKg: 7.2, trimYieldPct: 100 },
          ],
        },
        opts.tenant
      );
      const data = res?.data || res;
      const rows = [
        ['Metric', 'Calculated Value'],
        ['Dish', data.dish],
        ['Target Gross Profit', data.targetGp],
        ['Total Raw Food Cost', `$${Number(data.totalRawFoodCost).toFixed(2)}`],
        ['Minimum Net Sell Price', `$${Number(data.minNetPrice).toFixed(2)}`],
        ['Suggested Menu Price', chalk.bold.green(`$${Number(data.suggestedMenuPrice).toFixed(2)}`)],
      ];
      console.log(chalk.bold.hex('#F97316')('\nChef\'s Intelligence 72% GP Dish Costing Calculator:'));
      console.log(table(rows));
    } catch (err: any) {
      console.error(chalk.red(`\n✖ Dish costing failed: ${err.message}\n`));
    }
  });

// 7. System Resilience & Failure-Mode Fallback Posture
autopilotCommand
  .command('resilience')
  .description('Verify active failure-mode fallbacks (WAN drop, printer jam, payment retry, SaaS grace, AI fallback)')
  .option('--tenant <id>', 'Tenant ID')
  .action(async (opts) => {
    try {
      const res: any = await apiGet('/v1/system/resilience', opts.tenant);
      const data = res?.data || res;
      const fb = data?.fallbacks || {};
      const rows = [
        ['Failure Mode', 'Active', 'Deterministic Fallback Strategy'],
        ...Object.entries(fb).map(([k, v]: [string, any]) => [
          k,
          v.active ? chalk.green('ACTIVE') : chalk.red('INACTIVE'),
          v.strategy,
        ]),
      ];
      console.log(chalk.bold.hex('#F97316')('\nCulinaryOS Failure-Mode & Resilience Fallback Matrix:'));
      console.log(table(rows));
    } catch (err: any) {
      console.error(chalk.red(`\n✖ Failed to inspect resilience posture: ${err.message}\n`));
    }
  });
