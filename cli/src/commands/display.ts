// ============================================================
// CulinaryOS CLI — Display Platform & Android TV Remote Control
// ============================================================

import { Command } from 'commander';
import chalk from 'chalk';
import { table } from 'table';
import { apiGet, apiPost, apiPatch, apiDelete } from '../lib/api-client';

export const displayCommand = new Command('display')
  .alias('displays')
  .description('Manage Android TV Screens, Digital Menus, KDS & Wallboards');

// 1. List All Display Devices
displayCommand
  .command('list')
  .description('List all registered and paired Android TV displays')
  .option('--tenant <id>', 'Tenant ID')
  .action(async (opts) => {
    try {
      const res: any = await apiGet('/v1/displays', opts.tenant);
      const displays: any[] = Array.isArray(res) ? res : res.data ?? [];

      if (displays.length === 0) {
        console.log(chalk.yellow('\n📺 No displays paired yet. Open Display App or onn. TV to generate a code.\n'));
        return;
      }

      const rows = [
        ['ID', 'Name', 'Platform', 'Mode', 'View / Station', 'Status', 'Last Ping'],
        ...displays.map((d) => [
          d.id.slice(0, 10),
          d.name || 'Android TV',
          `${d.platform || 'android_tv'} (v${d.appVersion || '1.0'})`,
          (d.assignedMode || 'kitchen').toUpperCase(),
          (d.assignedView || 'all').toUpperCase(),
          d.online ? chalk.green('● ONLINE') : chalk.red('○ OFFLINE'),
          d.lastSeenAt ? new Date(d.lastSeenAt).toLocaleTimeString() : 'Never',
        ]),
      ];

      console.log(chalk.bold.hex('#F59E0B')('\n📺 CulinaryOS & Cheezies Display Matrix:'));
      console.log(table(rows));
    } catch (err: any) {
      console.error(chalk.red(`\n✖ Error fetching displays: ${err.message}\n`));
    }
  });

// 2. Pair New Display
displayCommand
  .command('pair <code>')
  .description('Pair a television using the 6-digit code shown on screen')
  .option('--name <name>', 'Display Name (e.g. "Main Kitchen KDS")', 'Android TV Display')
  .option('--mode <mode>', 'Display Mode: kitchen|manager|staff|guest|pickup|marketing', 'kitchen')
  .option('--view <view>', 'Assigned Station or Subview (e.g. all, hot, expo, customer_menu)', 'all')
  .option('--brand <brand>', 'Brand: culinaryos|cheezies', 'culinaryos')
  .option('--tenant <id>', 'Tenant ID')
  .action(async (code, opts) => {
    try {
      const cleanCode = code.replace(/\s+/g, '');
      const res: any = await apiPost(
        '/v1/displays/pair',
        {
          pairingCode: cleanCode,
          name: opts.name,
          assignedMode: opts.mode,
          assignedView: opts.view,
          configuration: {
            brand: opts.brand,
            stationId: opts.view,
            theme: opts.brand === 'cheezies' ? 'cheezies-gold' : 'kitchen-oled',
          },
        },
        opts.tenant
      );

      const device = res.data ?? res;
      console.log(chalk.bold.green(`\n✔ Display "${device.name}" successfully paired!`));
      console.log(chalk.white(`  Mode: ${device.assignedMode.toUpperCase()} | View: ${device.assignedView}`));
      console.log(chalk.gray(`  Device Token: ${device.deviceToken ? 'Bound' : 'Authenticated'}\n`));
    } catch (err: any) {
      console.error(chalk.red(`\n✖ Pairing failed: ${err.message}\n`));
    }
  });

// 3. Remotely Switch Display View
displayCommand
  .command('switch <displayId>')
  .description('Remotely change the mode or station of an active television')
  .requiredOption('--mode <mode>', 'Target Mode: kitchen|manager|staff|guest|pickup|marketing')
  .option('--view <view>', 'Target View/Station', 'all')
  .option('--tenant <id>', 'Tenant ID')
  .action(async (displayId, opts) => {
    try {
      await apiPatch(
        `/v1/displays/${displayId}`,
        {
          assignedMode: opts.mode,
          assignedView: opts.view,
          remoteCommand: {
            type: 'navigate',
            mode: opts.mode,
            view: opts.view,
          },
        },
        opts.tenant
      );

      console.log(
        chalk.bold.green(
          `\n✔ Display ${displayId} remotely switched to ${opts.mode.toUpperCase()} (${opts.view.toUpperCase()})!\n`
        )
      );
    } catch (err: any) {
      console.error(chalk.red(`\n✖ Switch command failed: ${err.message}\n`));
    }
  });

// 4. Remote Refresh Display
displayCommand
  .command('refresh <displayId>')
  .description('Send a remote reload command to a television screen')
  .option('--tenant <id>', 'Tenant ID')
  .action(async (displayId, opts) => {
    try {
      await apiPatch(
        `/v1/displays/${displayId}`,
        {
          remoteCommand: {
            type: 'refresh',
          },
        },
        opts.tenant
      );
      console.log(chalk.bold.green(`\n✔ Remote refresh signal dispatched to ${displayId}!\n`));
    } catch (err: any) {
      console.error(chalk.red(`\n✖ Refresh failed: ${err.message}\n`));
    }
  });

// 5. Unpair Display
displayCommand
  .command('unpair <displayId>')
  .description('Uncouple and revoke a television display')
  .option('--tenant <id>', 'Tenant ID')
  .action(async (displayId, opts) => {
    try {
      await apiDelete(`/v1/displays/${displayId}`, opts.tenant);
      console.log(chalk.bold.green(`\n✔ Display ${displayId} unpaired.\n`));
    } catch (err: any) {
      console.error(chalk.red(`\n✖ Unpair failed: ${err.message}\n`));
    }
  });

// 6. Preview Live Projection
displayCommand
  .command('projection')
  .description('Inspect the projection payload for a display mode')
  .option('--mode <mode>', 'Mode: kitchen|manager|staff|guest|pickup|marketing', 'kitchen')
  .option('--view <view>', 'View/Station', 'all')
  .option('--brand <brand>', 'Brand: culinaryos|cheezies', 'culinaryos')
  .option('--tenant <id>', 'Tenant ID')
  .action(async (opts) => {
    try {
      const data: any = await apiGet(
        `/v1/displays/projection?mode=${opts.mode}&view=${encodeURIComponent(
          opts.view
        )}&brand=${opts.brand}`,
        opts.tenant
      );
      console.log(chalk.bold.hex('#F59E0B')(`\n📺 Projection Payload for [${opts.brand.toUpperCase()}] ${opts.mode.toUpperCase()}:`));
      console.log(JSON.stringify(data.data ?? data, null, 2));
    } catch (err: any) {
      console.error(chalk.red(`\n✖ Projection fetch failed: ${err.message}\n`));
    }
  });
