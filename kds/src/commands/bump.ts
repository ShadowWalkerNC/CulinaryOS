import { Command } from 'commander';
import chalk from 'chalk';
import { kdsPatch } from '../lib/api';

export const bumpCommand = new Command('bump')
  .description('Bump (complete) a kitchen ticket')
  .argument('<ticketId>', 'Ticket ID to bump')
  .action(async (ticketId) => {
    await kdsPatch(`/v1/tickets/${ticketId}`, { status: 'bumped', bumped_at: new Date().toISOString() });
    console.log(chalk.green(`✔ Ticket ${ticketId} bumped`));
  });
