import { Command } from 'commander';
import chalk from 'chalk';
import { table } from 'table';
import { apiGet } from '../lib/api-client';

export const daypartsCommand = new Command('dayparts')
  .description('Manage dynamic daypart and happy hour pricing schedules and live price resolution');

// 1. List All Daypart Schedules
daypartsCommand
  .command('list')
  .description('List all configured daypart and happy hour pricing schedules')
  .option('--tenant <id>', 'Tenant ID')
  .action(async (opts) => {
    try {
      const schedules: any = await apiGet('/v1/dayparts', opts.tenant);

      if (!Array.isArray(schedules) || schedules.length === 0) {
        console.log(chalk.yellow('\nNo daypart schedules configured.\n'));
        return;
      }

      const rows = [
        ['ID', 'Name', 'Time Window', 'Adjustment', 'Priority', 'Status'],
        ...schedules.map((s: any) => [
          s.id,
          chalk.bold(s.name),
          s.timeWindowLabel ?? `${s.startTime} - ${s.endTime}`,
          s.adjustmentType === 'percent' ? `${s.value}% off` : `$${(s.value / 100).toFixed(2)} off`,
          String(s.priority ?? 0),
          s.active ? chalk.green('Active') : chalk.gray('Disabled'),
        ]),
      ];

      console.log(chalk.bold.hex('#F97316')('\n⏰ Scheduled Daypart & Happy Hour Pricing:'));
      console.log(table(rows));
    } catch (err: any) {
      console.error(chalk.red(`\n✖ Failed to fetch daypart schedules: ${err.message}\n`));
    }
  });

// 2. View Active Schedule
daypartsCommand
  .command('active')
  .description('Check currently active pricing schedule for the current time and day')
  .option('--tenant <id>', 'Tenant ID')
  .action(async (opts) => {
    try {
      const active: any = await apiGet('/v1/dayparts/active', opts.tenant);

      if (!active || !active.id) {
        console.log(chalk.cyan('\nℹ Standard Pricing Active (No special daypart or happy hour rule in effect right now).\n'));
        return;
      }

      const rows = [
        ['Field', 'Current Rule Value'],
        ['Rule Name', chalk.bold.green(active.name)],
        ['Window', `${active.startTime} - ${active.endTime}`],
        ['Adjustment', active.adjustmentType === 'percent' ? `${active.value}% off` : `$${(active.value / 100).toFixed(2)} off`],
        ['Priority', String(active.priority)],
        ['Applies To Categories', (active.categoryIds ?? []).join(', ') || 'All categories'],
      ];

      console.log(chalk.bold.hex('#F97316')('\n🎉 Currently Active Daypart Rule:'));
      console.log(table(rows));
    } catch (err: any) {
      console.error(chalk.red(`\n✖ Failed to fetch active schedule: ${err.message}\n`));
    }
  });
