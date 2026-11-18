import { Command } from 'commander';
import chalk from 'chalk';
import { table } from 'table';
import { apiGet, apiPost } from '../lib/api-client';

export const cloudCommand = new Command('cloud')
  .description('SaaS Cloud Bridge Enrollment, Cryptographic Entitlement Grants, Outbox Sync & Server Resilience');

// 1. Inspect Cloud Bridge Status
cloudCommand
  .command('status')
  .description('Inspect installed Rust workstation site ID, Cloud Bridge connection, active SaaS grant & pending outbox')
  .option('--tenant <id>', 'Tenant ID')
  .action(async (opts) => {
    try {
      const res: any = await apiGet('/v1/cloud/status', opts.tenant);
      const data = res?.data || res;
      const grant = data.entitlement?.payload || data.entitlement || null;
      const rows = [
        ['Field', 'Workstation Cloud Bridge Value'],
        ['Installed Local Workstation', data.installedApp ? chalk.green('YES (Native Rust)') : 'Node Server'],
        ['Site / Tenant ID', String(data.siteId || '00000000-0000-0000-0000-000000000001')],
        ['SaaS Cloud Connected', data.cloudConnected ? chalk.bold.green('CONNECTED (Active Grant)') : chalk.yellow('OFFLINE / FREE OPEN-SOURCE CORE')],
        ['Active SaaS Plan', grant ? String(grant.planTier || 'pro').toUpperCase() : 'FREE_OPENSOURCE ($0)'],
        ['Subscribed Add-Ons', grant && Array.isArray(grant.addons) ? grant.addons.join(', ') : 'None (Local Core Active)'],
        ['Pending Offline Outbox Events', String(data.pendingOutboxEvents ?? 0)],
      ];
      console.log(chalk.bold.hex('#F97316')('\nCulinaryOS Installed App & SaaS Cloud Bridge Status:'));
      console.log(table(rows));
    } catch (err: any) {
      console.error(chalk.red(`\n✖ Failed to inspect cloud status: ${err.message}\n`));
    }
  });

// 2. Enroll Demo SaaS Cloud Grant
cloudCommand
  .command('enroll-demo')
  .description('Issue and connect an HMAC-SHA256 SignedSaasGrant unlocking Cloud Pro & Enterprise add-ons locally')
  .option('--tenant <id>', 'Tenant ID')
  .action(async (opts) => {
    try {
      const res: any = await apiPost('/v1/cloud/demo-enroll', {}, opts.tenant);
      const data = res?.data || res;
      const payload = data.entitlement?.payload || {};
      console.log(chalk.bold.green('\n✔ Signed SaaS Cloud Bridge Entitlement Enrolled!'));
      console.log(`  Plan Tier:  ${chalk.cyan(String(payload.planTier || 'pro').toUpperCase())}`);
      console.log(`  Add-Ons:    ${chalk.white((payload.addons || []).join(', '))}`);
      console.log(`  Expires At: ${chalk.gray(String(payload.expiresAtEpochSeconds || 'active'))}\n`);
    } catch (err: any) {
      console.error(chalk.red(`\n✖ Cloud demo enrollment failed: ${err.message}\n`));
    }
  });

// 3. Flush Offline Outbox to Cloud Storage Bridge
cloudCommand
  .command('sync')
  .description('Flush pending local offline outbox events to the encrypted Cloud Storage Bridge')
  .option('--tenant <id>', 'Tenant ID')
  .action(async (opts) => {
    try {
      const res: any = await apiPost('/v1/cloud/sync', {}, opts.tenant);
      const data = res?.data || res;
      console.log(chalk.bold.green(`\n✔ Cloud Storage Sync Completed — Flushed Events: ${data.flushedEvents ?? 0}`));
      console.log(chalk.gray(`  State SHA-256 Digest: ${data.stateSha256 || 'verified'}\n`));
    } catch (err: any) {
      console.error(chalk.red(`\n✖ Cloud sync failed: ${err.message}\n`));
    }
  });
