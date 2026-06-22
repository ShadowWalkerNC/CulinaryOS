import { Command } from 'commander';
import chalk from 'chalk';
import { table } from 'table';
import { kdsGet } from '../lib/api';

const STATIONS = ['hot','cold','grill','fry','sauce','pastry','pass','bar'] as const;

export const stationsCommand = new Command('stations')
  .description('Show ticket counts per station');

stationsCommand
  .command('summary')
  .description('Ticket count per active station')
  .action(async () => {
    const counts: Record<string, number> = await kdsGet('/v1/stations/summary');
    const rows = [['Station', 'Active Tickets'],
      ...STATIONS.map((s) => [
        chalk.cyan(s.toUpperCase()),
        counts[s] ? chalk.white.bold(counts[s].toString()) : chalk.dim('0'),
      ])];
    console.log(table(rows));
  });
