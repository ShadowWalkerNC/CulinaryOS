#!/usr/bin/env node
import { Command } from 'commander';
import { ticketsCommand } from './commands/tickets';
import { stationsCommand } from './commands/stations';
import { bumpCommand } from './commands/bump';

const program = new Command();
program
  .name('kds')
  .description('CulinaryOS KDS — kitchen display management from the terminal')
  .version('1.0.0');

program.addCommand(ticketsCommand);
program.addCommand(stationsCommand);
program.addCommand(bumpCommand);

program.parse(process.argv);
