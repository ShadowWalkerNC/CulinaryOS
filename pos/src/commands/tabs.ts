import { Command } from 'commander';
import chalk from 'chalk';
import { table } from 'table';
import { posGet, posPost } from '../lib/api';

export const tabsCommand = new Command('tabs').description('Manage guest tabs');

tabsCommand.command('list').action(async () => {
  const tabs: any[] = await posGet('/v1/tabs?status=open');
  if (!tabs.length) { console.log(chalk.green('\n✓ No open tabs\n')); return; }
  const rows = [['Table','Server','Covers','Opened'],
    ...tabs.map((t) => [t.table_number??'T/A', t.server_name??'—', t.cover_count??'—', new Date(t.opened_at).toLocaleTimeString()])];
  console.log(table(rows));
});

tabsCommand.command('open').description('Open a new tab')
  .option('--table <t>')
  .option('--covers <n>', '', parseInt)
  .option('--server <s>')
  .action(async (o) => {
    const tab: any = await posPost('/v1/tabs', { table_number: o.table, cover_count: o.covers, server_name: o.server });
    console.log(chalk.green(`✔ Tab opened: ${tab.id}`));
  });
