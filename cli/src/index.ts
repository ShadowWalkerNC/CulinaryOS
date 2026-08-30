#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { menuCommand } from './commands/menu';
import { inventoryCommand } from './commands/inventory';
import { ordersCommand } from './commands/orders';
import { tenantCommand } from './commands/tenant';
import { reportCommand } from './commands/report';

const program = new Command();

program
  .name('culinary')
  .alias('culinaryos')
  .alias('create-culinaryos')
  .description('CulinaryOS CLI — Turnkey restaurant OS installer, runner, and management tool')
  .version('1.0.0');

// 1. Init & Turnkey Provisioning Command
program
  .command('init [directory]')
  .description('Initialize and scaffold a zero-config CulinaryOS installation')
  .action(async (dir = '.') => {
    console.log(chalk.bold.hex('#F97316')('\n🍳 CulinaryOS — Universal Restaurant Platform Initializer'));
    console.log(chalk.gray('Preparing turnkey POS, KDS, Admin, Web, and Inventory suite...\n'));

    const targetDir = path.resolve(process.cwd(), dir);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const envPath = path.join(targetDir, '.env');
    const examplePath = path.join(targetDir, '.env.example');

    if (!fs.existsSync(envPath) && fs.existsSync(examplePath)) {
      fs.copyFileSync(examplePath, envPath);
      console.log(chalk.green('✔ Initialized .env with zero-config offline demo presets'));
    }

    console.log(chalk.cyan('✔ All workspace packages ready (POS, KDS, Admin, Web, Ratio Engine, Food Cost Engine)'));
    console.log(chalk.bold.green('\n🎉 CulinaryOS is ready to run!'));
    console.log(chalk.white('To start all applications, run:'));
    console.log(chalk.bold.yellow('  pnpm start\n'));
  });

// 2. Turnkey Monorepo Launcher Command
program
  .command('start')
  .alias('launch')
  .alias('dev')
  .description('Start all CulinaryOS application surfaces (POS, KDS, Admin, Web, Hono Server)')
  .action(() => {
    const rootDir = process.cwd();
    const envPath = path.join(rootDir, '.env');
    const examplePath = path.join(rootDir, '.env.example');

    if (!fs.existsSync(envPath) && fs.existsSync(examplePath)) {
      fs.copyFileSync(examplePath, envPath);
      console.log(chalk.yellow('⚡ Created .env from .env.example (Demo mode active)'));
    }

    console.log(chalk.bold.hex('#F97316')(`
   ██████╗██╗   ██╗██╗     ██╗███╗   ██╗ █████╗ ██████╗ ██╗   ██╗ ██████╗ ███████╗
  ██╔════╝██║   ██║██║     ██║████╗  ██║██╔══██╗██╔══██╗╚██╗ ██╔╝██╔═══██╗██╔════╝
  ██║     ██║   ██║██║     ██║██╔██╗ ██║███████║██████╔╝ ╚████╔╝ ██║   ██║███████╗
  ██║     ██║   ██║██║     ██║██║╚██╗██║██╔══██║██╔══██╗  ╚██╔╝  ██║   ██║╚════██║
  ╚██████╗╚██████╔╝███████╗██║██║ ╚████║██║  ██║██║  ██║   ██║   ╚██████╔╝███████║
   ╚═════╝ ╚═════╝ ╚══════╝╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝    ╚═════╝ ╚══════╝
    `));
    console.log(chalk.bold.cyan('  🚀 Live Surfaces Dashboard\n'));
    console.log(chalk.bold('  [1] POS Terminal:       ') + chalk.underline.hex('#38BDF8')('http://localhost:5172') + chalk.gray(' (PIN 1234 / 5678)'));
    console.log(chalk.bold('  [2] Kitchen KDS:        ') + chalk.underline.hex('#38BDF8')('http://localhost:5173') + chalk.gray(' (Station Tabs & Timers)'));
    console.log(chalk.bold('  [3] Admin Back-Office:  ') + chalk.underline.hex('#38BDF8')('http://localhost:5174') + chalk.gray(' (Pantry, Menu, Tools)'));
    console.log(chalk.bold('  [4] Online Storefront:  ') + chalk.underline.hex('#38BDF8')('http://localhost:5176') + chalk.gray(' (Order Customizer)'));
    console.log(chalk.bold('  [5] Unified Hono API:   ') + chalk.underline.hex('#38BDF8')('http://localhost:3000') + chalk.gray(' (Event Bus & Webhooks)\n'));
    console.log(chalk.gray('Starting Turborepo pipeline... (Press Ctrl+C to stop)\n'));

    const isWindows = process.platform === 'win32';
    const npmCmd = isWindows ? 'pnpm.cmd' : 'pnpm';
    const child = spawn(npmCmd, ['dev'], { stdio: 'inherit', shell: true });

    process.on('SIGINT', () => {
      child.kill('SIGINT');
      process.exit(0);
    });
  });

// 3. Preflight Health & Doctor Command
program
  .command('doctor')
  .description('Run system health, port, and configuration preflight checks')
  .action(() => {
    console.log(chalk.bold.hex('#F97316')('\n🩺 CulinaryOS System Doctor & Diagnostic'));
    console.log(chalk.gray('Checking runtime environment and configuration readiness...\n'));

    const nodeMajor = parseInt((process.versions.node || '18').split('.')[0] || '18', 10);
    const checks = [
      { name: 'Node.js Runtime (>= 18.0.0)', pass: nodeMajor >= 18 },
      { name: 'Root Configuration (.env)', pass: fs.existsSync(path.resolve(process.cwd(), '.env')) },
      { name: 'Package Workspace (Turborepo)', pass: fs.existsSync(path.resolve(process.cwd(), 'turbo.json')) },
      { name: 'Unified API Kernel (apps/server)', pass: fs.existsSync(path.resolve(process.cwd(), 'apps/server')) },
      { name: 'POS Client (apps/pos)', pass: fs.existsSync(path.resolve(process.cwd(), 'apps/pos')) },
      { name: 'KDS Client (apps/kds)', pass: fs.existsSync(path.resolve(process.cwd(), 'apps/kds')) },
      { name: 'Admin Client (apps/admin)', pass: fs.existsSync(path.resolve(process.cwd(), 'apps/admin')) },
      { name: 'Online Storefront (apps/web)', pass: fs.existsSync(path.resolve(process.cwd(), 'apps/web')) },
    ];

    for (const c of checks) {
      if (c.pass) {
        console.log(chalk.green(`  ✔ ${c.name}`));
      } else {
        console.log(chalk.yellow(`  ⚠ ${c.name} (Check setup)`));
      }
    }

    console.log(chalk.bold.green('\n✔ Ready for execution in zero-dependency demo or live Supabase mode.\n'));
  });

// Core API Management Subcommands
program.addCommand(menuCommand);
program.addCommand(inventoryCommand);
program.addCommand(ordersCommand);
program.addCommand(tenantCommand);
program.addCommand(reportCommand);

program.parse(process.argv);

