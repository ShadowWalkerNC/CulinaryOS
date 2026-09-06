import { Command } from 'commander';
import chalk from 'chalk';
import { table } from 'table';
import { apiGet, apiPost, apiPatch } from '../lib/api-client';

export const tabsCommand = new Command('tabs')
  .description('Bar tabs and preauthorized guest ledger');

// 1. List Open Bar Tabs
tabsCommand
  .command('list')
  .description('List open bar tabs')
  .option('--tenant <id>', 'Tenant ID')
  .action(async (opts) => {
    try {
      const data: any = await apiGet('/v1/tabs', opts.tenant);
      const list: any[] = Array.isArray(data) ? data : data.data ?? [];
      if (list.length === 0) {
        console.log(chalk.yellow('\nNo open bar tabs currently active.\n'));
        return;
      }
      const rows = [
        ['Tab ID', 'Guest Name', 'Card Last 4', 'Preauth Limit', 'Status'],
        ...list.map((t) => [
          t.id,
          t.guest_name ?? t.guestName ?? 'Guest',
          `**** ${t.card_last4 ?? '4242'}`,
          `$${((t.preauth_amount ?? 5000) / 100).toFixed(2)}`,
          (t.status ?? 'open').toUpperCase(),
        ]),
      ];
      console.log(chalk.bold.hex('#F97316')('\n🍸 Active Bar Tabs:'));
      console.log(table(rows));
    } catch (err: any) {
      console.error(chalk.red(`\n✖ Error fetching tabs: ${err.message}\n`));
    }
  });

// 2. Open Bar Tab
tabsCommand
  .command('open <guestName>')
  .description('Open a new bar tab with preauth limit')
  .option('--last4 <digits>', 'Card last 4 digits', '4242')
  .option('--preauth <cents>', 'Preauth amount in integer cents', '5000')
  .option('--tenant <id>', 'Tenant ID')
  .action(async (guestName, opts) => {
    try {
      const res: any = await apiPost('/v1/tabs', {
        guestName,
        cardLast4: opts.last4,
        preauthAmount: parseInt(opts.preauth, 10),
      }, opts.tenant);
      const tab = res.data ?? res;
      console.log(chalk.bold.green(`\n✔ Bar tab opened for ${guestName} (${tab.id})`));
      console.log(chalk.gray(`  Preauth limit: $${(parseInt(opts.preauth, 10) / 100).toFixed(2)}\n`));
    } catch (err: any) {
      console.error(chalk.red(`\n✖ Failed to open tab: ${err.message}\n`));
    }
  });

// 3. Close Bar Tab
tabsCommand
  .command('close <tabId>')
  .description('Close out and settle a bar tab')
  .option('--tenant <id>', 'Tenant ID')
  .action(async (tabId, opts) => {
    try {
      await apiPatch(`/v1/tabs/${tabId}`, { status: 'closed' }, opts.tenant);
      console.log(chalk.bold.green(`\n✔ Tab ${tabId} closed successfully.\n`));
    } catch (err: any) {
      console.error(chalk.red(`\n✖ Failed to close tab: ${err.message}\n`));
    }
  });
