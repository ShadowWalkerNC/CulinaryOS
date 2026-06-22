import { Command } from 'commander';
import chalk from 'chalk';
import { table } from 'table';
import { posGet, posPost } from '../lib/api';

export const paymentsCommand = new Command('payments').description('Process and view payments');

paymentsCommand.command('charge <orderId>').description('Charge an order')
  .option('--method <m>', 'Payment method (cash|card|comp|split)', 'card')
  .option('--tip <t>', 'Tip amount in dollars', parseFloat)
  .action(async (id, o) => {
    const p: any = await posPost('/v1/payments', { order_id: id, method: o.method, tip_amount: Math.round((o.tip??0)*100) });
    console.log(chalk.green(`✔ Payment processed: ${p.id} — $${(p.amount/100).toFixed(2)} via ${p.method}`));
  });

paymentsCommand.command('history <orderId>').action(async (id) => {
  const payments: any[] = await posGet(`/v1/orders/${id}/payments`);
  const rows = [['ID','Amount','Method','Tip','Status'],
    ...payments.map((p) => [p.id.slice(0,8), `$${(p.amount/100).toFixed(2)}`, p.method, `$${(p.tip_amount/100).toFixed(2)}`, p.status])];
  console.log(table(rows));
});
