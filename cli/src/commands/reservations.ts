import { Command } from 'commander';
import chalk from 'chalk';
import { table } from 'table';
import { apiGet, apiPost, apiDelete, apiPatch } from '../lib/api-client';

export const reservationsCommand = new Command('reservations')
  .alias('res')
  .description('Manage table reservations, party sizes, and seating status');

// 1. List Reservations
reservationsCommand
  .command('list')
  .description('List reservations for a date')
  .option('--date <YYYY-MM-DD>', 'Date filter', new Date().toISOString().slice(0, 10))
  .option('--tenant <id>', 'Tenant ID')
  .action(async (opts) => {
    try {
      const data: any = await apiGet(`/v1/reservations?date=${opts.date}`, opts.tenant);
      const list: any[] = Array.isArray(data) ? data : data.data ?? [];
      if (list.length === 0) {
        console.log(chalk.yellow(`\nNo reservations found for ${opts.date}.\n`));
        return;
      }
      const rows = [
        ['ID', 'Guest Name', 'Party', 'Time', 'Status', 'Table', 'Notes'],
        ...list.map((r) => [
          r.id.slice(0, 8),
          r.guest_name ?? r.guestName ?? 'Guest',
          r.party_size ?? r.partySize ?? 2,
          r.reservation_time ? new Date(r.reservation_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (r.time ?? '—'),
          (r.status ?? 'confirmed').toUpperCase(),
          r.table_id ?? r.tableNumber ?? 'Unassigned',
          r.notes ?? '—',
        ]),
      ];
      console.log(chalk.bold.hex('#F97316')(`\n📅 Reservations for ${opts.date}:`));
      console.log(table(rows));
    } catch (err: any) {
      console.error(chalk.red(`\n✖ Error fetching reservations: ${err.message}\n`));
    }
  });

// 2. Create Reservation
reservationsCommand
  .command('create')
  .description('Book a new dining reservation')
  .requiredOption('--name <name>', 'Guest name')
  .requiredOption('--party <size>', 'Party size', (v) => parseInt(v, 10))
  .requiredOption('--time <time>', 'Reservation time (e.g. 2026-09-05T19:00:00Z)')
  .option('--phone <phone>', 'Guest phone number', '(555) 000-0000')
  .option('--email <email>', 'Guest email', 'guest@example.com')
  .option('--notes <notes>', 'Special requests or dietary restrictions')
  .option('--tenant <id>', 'Tenant ID')
  .action(async (opts) => {
    try {
      const res: any = await apiPost('/v1/reservations', {
        guest_name: opts.name,
        party_size: opts.party,
        reservation_time: opts.time,
        guest_phone: opts.phone,
        guest_email: opts.email,
        notes: opts.notes,
      }, opts.tenant);
      const booked = res.data ?? res;
      console.log(chalk.bold.green(`\n✔ Reservation confirmed for ${opts.name} (Party of ${opts.party}) at ${opts.time}`));
      console.log(chalk.gray(`Reservation ID: ${booked.id}\n`));
    } catch (err: any) {
      console.error(chalk.red(`\n✖ Booking failed: ${err.message}\n`));
    }
  });

// 3. Cancel Reservation
reservationsCommand
  .command('cancel <reservationId>')
  .description('Cancel a reservation')
  .option('--tenant <id>', 'Tenant ID')
  .action(async (reservationId, opts) => {
    try {
      await apiDelete(`/v1/reservations/${reservationId}`, opts.tenant);
      console.log(chalk.bold.yellow(`\n✔ Reservation ${reservationId} cancelled.\n`));
    } catch (err: any) {
      console.error(chalk.red(`\n✖ Failed to cancel reservation: ${err.message}\n`));
    }
  });

// 4. Update Reservation Status
reservationsCommand
  .command('status <reservationId> <status>')
  .description('Update reservation status (confirmed|seated|completed|cancelled|no_show)')
  .option('--table <tableId>', 'Assigned table ID if seating')
  .option('--tenant <id>', 'Tenant ID')
  .action(async (reservationId, status, opts) => {
    try {
      await apiPatch(`/v1/reservations/${reservationId}/status`, {
        status,
        table_id: opts.table,
      }, opts.tenant);
      console.log(chalk.bold.green(`\n✔ Reservation ${reservationId} updated to status: ${status.toUpperCase()}\n`));
    } catch (err: any) {
      console.error(chalk.red(`\n✖ Status update failed: ${err.message}\n`));
    }
  });
