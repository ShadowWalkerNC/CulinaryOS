#!/usr/bin/env node
import { Command } from 'commander';
import { ordersCommand } from './commands/orders';
import { menuCommand } from './commands/menu';
import { tabsCommand } from './commands/tabs';
import { paymentsCommand } from './commands/payments';

const program = new Command();
program.name('pos').description('CulinaryOS POS — orders, menus, and payments from the terminal').version('1.0.0');
program.addCommand(ordersCommand);
program.addCommand(menuCommand);
program.addCommand(tabsCommand);
program.addCommand(paymentsCommand);
program.parse(process.argv);
