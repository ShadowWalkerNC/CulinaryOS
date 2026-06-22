#!/usr/bin/env node
import { Command } from 'commander';
import { menuCommand } from './commands/menu';
import { inventoryCommand } from './commands/inventory';
import { ordersCommand } from './commands/orders';
import { tenantCommand } from './commands/tenant';
import { reportCommand } from './commands/report';

const program = new Command();

program
  .name('culinary')
  .description('CulinaryOS CLI — manage your restaurant platform from the terminal')
  .version('1.0.0');

program.addCommand(menuCommand);
program.addCommand(inventoryCommand);
program.addCommand(ordersCommand);
program.addCommand(tenantCommand);
program.addCommand(reportCommand);

program.parse(process.argv);
