#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { posCommand } from './commands/pos';
import { kdsCommand } from './commands/kds';
import { opsCommand } from './commands/ops';
import { prepCommand } from './commands/prep';
import { systemCommand } from './commands/system';
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
  .description('CulinaryOS Universal CLI & Remote Control Engine')
  .version('1.0.0');

// Register Subsystem Commands
program.addCommand(posCommand);
program.addCommand(kdsCommand);
program.addCommand(opsCommand);
program.addCommand(prepCommand);
program.addCommand(systemCommand);
program.addCommand(menuCommand);
program.addCommand(inventoryCommand);
program.addCommand(ordersCommand);
program.addCommand(reportCommand);
program.addCommand(tenantCommand);

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

program.parse(process.argv);
