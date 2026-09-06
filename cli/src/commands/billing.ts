import { Command } from 'commander';
import chalk from 'chalk';
import { table } from 'table';
import { apiGet, apiPost } from '../lib/api-client';

export const billingCommand = new Command('billing')
  .description('Manage CulinaryOS SaaS subscription, payment methods, and customer portal');

// 1. Subscription Status
billingCommand
  .command('status')
  .description('View current SaaS subscription and plan details')
  .option('--tenant <id>', 'Tenant ID')
  .action(async (opts) => {
    try {
      const sub: any = await apiGet('/v1/billing/subscription', opts.tenant);
      const rows = [
        ['Field', 'Value'],
        ['Plan', chalk.bold.green((sub.plan ?? 'PRO (Bring-Your-Own-Stripe)').toUpperCase())],
        ['Status', (sub.status ?? 'active').toUpperCase()],
        ['Period End', sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString() : 'Active — Auto-renews'],
        ['Platform Fee', '0.50% per transaction (Standard Connect SAQ-A)'],
      ];
      console.log(chalk.bold.hex('#F97316')('\n💳 CulinaryOS SaaS Billing & Account Status:'));
      console.log(table(rows));
    } catch (err: any) {
      console.error(chalk.red(`\n✖ Error fetching billing status: ${err.message}\n`));
    }
  });

// 2. Open Stripe Customer Portal
billingCommand
  .command('portal')
  .description('Generate a Stripe Customer Portal link to update payment method / invoices')
  .option('--tenant <id>', 'Tenant ID')
  .action(async (opts) => {
    try {
      const res: any = await apiPost('/v1/billing/portal', {
        return_url: 'http://localhost:5174/admin/billing',
      }, opts.tenant);
      console.log(chalk.bold.green('\n✔ Stripe Customer Portal Session Created:'));
      console.log(chalk.cyan(`  ${res.url ?? 'https://billing.stripe.com/session/demo'}\n`));
    } catch (err: any) {
      console.error(chalk.red(`\n✖ Portal session generation failed: ${err.message}\n`));
    }
  });
