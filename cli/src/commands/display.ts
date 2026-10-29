// ============================================================
// CulinaryOS CLI — Display Platform & Android TV Remote Control
// ============================================================

import { Command } from 'commander';
import chalk from 'chalk';
import { table } from 'table';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, copyFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
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

// 6b. Zero-Config LAN & mDNS Discovery
displayCommand
  .command('discover')
  .description('Discover local LAN IPv4 addresses, mDNS host, and surface ports for mobile & TV pairing')
  .option('--tenant <id>', 'Tenant ID')
  .action(async (opts) => {
    try {
      const res: any = await apiGet('/v1/displays/discover', opts.tenant);
      const info = res.data ?? res;
      console.log(chalk.bold.hex('#F59E0B')('\n📡 CulinaryOS Zero-Config LAN Discovery:'));
      console.log(chalk.white(`  Host:       ${info.hostname} (${info.mdnsHost})`));
      console.log(chalk.white(`  Primary IP: ${info.primaryIp}`));
      console.log(chalk.white(`  API URL:    ${info.surfaces?.api}`));
      console.log(chalk.white(`  Display TV: ${info.surfaces?.display}`));
      console.log(chalk.white(`  Cloud Demo: ${info.surfaces?.cloudDemo}\n`));
    } catch (err: any) {
      console.error(chalk.red(`\n✖ Discovery failed: ${err.message}\n`));
    }
  });

// 7. Generate CleanMyTV Launcher Engine v1 Config
displayCommand
  .command('launcher-config')
  .description('Generate CleanMyTV Launcher Engine v1 JSON config for com.cleanmytv.launcher.culinaryos')
  .option('--mode <mode>', 'Mode: kitchen|manager|staff|guest|pickup|marketing', 'kitchen')
  .option('--view <view>', 'View/Station', 'all')
  .option('--brand <brand>', 'Brand: culinaryos|cheezies', 'culinaryos')
  .option('--out <file>', 'Optional output file path')
  .option('--tenant <id>', 'Tenant ID')
  .action(async (opts) => {
    try {
      const res: any = await apiGet(
        `/v1/displays/launcher-config?mode=${opts.mode}&view=${encodeURIComponent(opts.view)}&brand=${opts.brand}`,
        opts.tenant
      );
      const payload = res.data ?? res;
      const jsonStr = JSON.stringify(payload, null, 2);
      if (opts.out) {
        writeFileSync(resolve(opts.out), jsonStr, 'utf8');
        console.log(chalk.bold.green(`\n✔ Wrote CleanMyTV launcher config to ${resolve(opts.out)}\n`));
      } else {
        console.log(jsonStr);
      }
    } catch (err: any) {
      console.error(chalk.red(`\n✖ Launcher config fetch failed: ${err.message}\n`));
    }
  });

// 8. Sideload APK & Launcher Config via CleanMyTV ADB Toolchain
displayCommand
  .command('sideload')
  .description('Build/stage CulinaryOS Android TV APK into CleanMyTV library and sideload via ADB')
  .option('--device <serial>', 'ADB device serial or IP:5555')
  .option('--url <displayUrl>', 'Display Web App URL (e.g. http://192.168.40.10:5181 or https://culinaryos-demo.up.railway.app)')
  .option('--api <apiUrl>', 'Backend Hono API URL (e.g. http://192.168.40.10:3000)')
  .option('--push-launcher', 'Also push launcher-config.json to com.cleanmytv.launcher.culinaryos and trigger hot reload', false)
  .option('--brand <brand>', 'Brand for launcher config: culinaryos|cheezies', 'culinaryos')
  .action(async (opts) => {
    try {
      const appData = process.env.APPDATA || '';
      const adbCandidates = [
        join(appData, 'cleanmytv', 'tools', 'platform-tools', 'adb.exe'),
        'C:\\Users\\white\\Desktop\\CleanMyTV\\.cytv-build\\tools\\platform-tools\\adb.exe',
        'adb',
      ];
      const adbBin = adbCandidates.find((p) => p === 'adb' || existsSync(p)) || 'adb';
      const repoRoot = resolve(__dirname, '..', '..', '..');
      const builtApk = join(repoRoot, 'apps', 'android-tv', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');

      if (!existsSync(builtApk)) {
        console.log(chalk.yellow(`\n⚠ APK not found at ${builtApk}. Run: powershell -File ./scripts/build-android-tv.ps1\n`));
        return;
      }

      if (appData) {
        const cytvApksDir = join(appData, 'cleanmytv', 'apks');
        mkdirSync(cytvApksDir, { recursive: true });
        const stagedApk = join(cytvApksDir, 'culinaryos-display.apk');
        copyFileSync(builtApk, stagedApk);
        console.log(chalk.green(`✔ Staged APK in CleanMyTV library: ${stagedApk}`));
      }

      const baseArgs = opts.device ? ['-s', opts.device] : [];
      console.log(chalk.cyan(`▶ Installing com.culinaryos.display via ${adbBin}...`));
      execFileSync(adbBin, [...baseArgs, 'install', '-r', builtApk], { stdio: 'inherit' });

      const launchArgs = [
        ...baseArgs,
        'shell',
        'am',
        'start',
        '-n',
        'com.culinaryos.display/.MainActivity',
      ];
      if (opts.url) launchArgs.push('--es', 'DISPLAY_URL', opts.url);
      if (opts.api) launchArgs.push('--es', 'API_URL', opts.api);
      execFileSync(adbBin, launchArgs, { stdio: 'inherit' });
      console.log(chalk.bold.green('✔ Launched CulinaryOS Display on Android TV!'));

      if (opts.pushLauncher) {
        const res: any = await apiGet(`/v1/displays/launcher-config?brand=${opts.brand}`).catch(() => null);
        if (res) {
          const payload = res.data ?? res;
          const tmpFile = join(repoRoot, 'apps', 'android-tv', 'build', 'launcher-config.json');
          mkdirSync(join(repoRoot, 'apps', 'android-tv', 'build'), { recursive: true });
          writeFileSync(tmpFile, JSON.stringify(payload, null, 2), 'utf8');
          const remotePath = '/sdcard/Android/data/com.cleanmytv.launcher.culinaryos/files/launcher-config.json';
          execFileSync(adbBin, [...baseArgs, 'push', tmpFile, remotePath], { stdio: 'inherit' });
          execFileSync(adbBin, [...baseArgs, 'shell', 'am', 'broadcast', '-a', 'com.cleanmytv.launcher.RELOAD_CONFIG'], {
            stdio: 'inherit',
          });
          console.log(chalk.bold.green('✔ Hot-reloaded com.cleanmytv.launcher.culinaryos layout!'));
        }
      }
    } catch (err: any) {
      console.error(chalk.red(`\n✖ Sideload failed: ${err.message}\n`));
    }
  });
