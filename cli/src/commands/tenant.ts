import { Command } from 'commander';
import chalk from 'chalk';
import { table } from 'table';
import { apiGet, apiPost } from '../lib/api-client';

export const tenantCommand = new Command('tenant')
  .description('Manage tenants (restaurants/locations)');

tenantCommand
  .command('list')
  .description('List all tenants')
  .action(async () => {
    const tenants: any[] = await apiGet('/api/tenants');
    const rows = [['ID', 'Name', 'Plan', 'Status', 'Created'],
      ...tenants.map((t) => [t.id.slice(0, 8), t.name, t.plan, t.status, new Date(t.createdAt).toLocaleDateString()])];
    console.log(table(rows));
  });

tenantCommand
  .command('create')
  .description('Onboard a new tenant')
  .requiredOption('--name <name>', 'Restaurant name')
  .requiredOption('--email <email>', 'Owner email')
  .option('--plan <plan>', 'Subscription plan (starter|pro|enterprise)', 'starter')
  .action(async (opts) => {
    const tenant: any = await apiPost('/api/tenants', { name: opts.name, email: opts.email, plan: opts.plan });
    console.log(chalk.green(`✔ Tenant created: ${tenant.id} — ${tenant.name} (${tenant.plan})`));
  });

tenantCommand
  .command('template <type>')
  .description('Apply business template preset (food-truck | full-service)')
  .option('--tenant <id>', 'Tenant ID')
  .action(async (type, opts) => {
    try {
      const res: any = await apiPost('/v1/settings/apply-template', { template: type }, opts.tenant);
      console.log(chalk.bold.green(`\n✔ Applied "${type}" business template preset successfully!`));
      console.log(chalk.gray(`  Zero schema branching: custom stations, tax rates, and touch target UI applied.\n`));
    } catch (err: any) {
      console.error(chalk.red(`\n✖ Failed to apply template: ${err.message}\n`));
    }
  });
