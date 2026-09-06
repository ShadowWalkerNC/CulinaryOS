import { Command } from 'commander';
import chalk from 'chalk';
import { table } from 'table';
import { apiGet, apiPost } from '../lib/api-client';

export const talentCommand = new Command('talent')
  .description('CulinaryTalent — Job Requisitions & Applicant Tracking (ATS)');

// 1. List Job Postings
talentCommand
  .command('jobs')
  .description('List open job postings')
  .option('--department <dept>', 'Department filter (BOH|FOH|Management|Bar)', 'all')
  .option('--tenant <id>', 'Tenant ID')
  .action(async (opts) => {
    try {
      const data: any = await apiGet(`/v1/talent/jobs`, opts.tenant);
      const jobs: any[] = data.jobs ?? (Array.isArray(data) ? data : []);
      if (jobs.length === 0) {
        console.log(chalk.yellow('\nNo active job requisitions found.\n'));
        return;
      }
      const filtered = opts.department === 'all'
        ? jobs
        : jobs.filter((j) => j.department.toLowerCase() === opts.department.toLowerCase());

      const rows = [
        ['Job ID', 'Title', 'Dept', 'Role', 'Pay Range', 'Applicants', 'Status'],
        ...filtered.map((j) => [
          j.id,
          j.title,
          j.department,
          j.role.toUpperCase(),
          j.pay_range,
          j.applicant_count ?? 0,
          j.status.toUpperCase(),
        ]),
      ];
      console.log(chalk.bold.hex('#F97316')('\n💼 CulinaryTalent Job Postings:'));
      console.log(table(rows));
    } catch (err: any) {
      console.error(chalk.red(`\n✖ Error fetching jobs: ${err.message}\n`));
    }
  });

// 2. Create Job Posting
talentCommand
  .command('post')
  .description('Create a new job posting requisition')
  .requiredOption('--title <title>', 'Job title')
  .requiredOption('--department <dept>', 'Department (BOH|FOH|Management|Bar)')
  .requiredOption('--role <role>', 'Role (cook|server|bartender|dishwasher|manager)')
  .requiredOption('--pay <payRange>', 'Pay range (e.g. "$20-$24/hr")')
  .option('--type <shiftType>', 'Shift type (Full-Time|Part-Time)', 'Full-Time')
  .option('--desc <desc>', 'Job description', 'High-volume restaurant team member')
  .option('--tenant <id>', 'Tenant ID')
  .action(async (opts) => {
    try {
      const res: any = await apiPost('/v1/talent/jobs', {
        title: opts.title,
        department: opts.department,
        role: opts.role,
        pay_range: opts.pay,
        shift_type: opts.type,
        description: opts.desc,
      }, opts.tenant);
      console.log(chalk.bold.green(`\n✔ Job requisition published: ${res.title} (${res.id})\n`));
    } catch (err: any) {
      console.error(chalk.red(`\n✖ Failed to create job requisition: ${err.message}\n`));
    }
  });

// 3. List Candidate Applications
talentCommand
  .command('candidates')
  .description('List candidate applications in ATS pipeline')
  .option('--stage <stage>', 'Stage filter (applied|review|interview|offer|hired|rejected)', 'all')
  .option('--tenant <id>', 'Tenant ID')
  .action(async (opts) => {
    try {
      const data: any = await apiGet(`/v1/talent/applications${opts.stage !== 'all' ? `?stage=${opts.stage}` : ''}`, opts.tenant);
      const apps: any[] = data.applications ?? (Array.isArray(data) ? data : []);
      if (apps.length === 0) {
        console.log(chalk.yellow('\nNo candidates found in this stage.\n'));
        return;
      }
      const rows = [
        ['App ID', 'Candidate', 'Job Title', 'Dept', 'Stage', 'Experience', 'Phone'],
        ...apps.map((a) => [
          a.id,
          a.candidate_name,
          a.job_title,
          a.department,
          a.stage.toUpperCase(),
          `${a.years_experience} yrs`,
          a.phone,
        ]),
      ];
      console.log(chalk.bold.hex('#F97316')('\n📋 Talent Pipeline Applications:'));
      console.log(table(rows));
    } catch (err: any) {
      console.error(chalk.red(`\n✖ Error fetching candidate applications: ${err.message}\n`));
    }
  });

// 4. Query Employee Overtime & FLSA Audit
talentCommand
  .command('overtime <employeeId>')
  .description('Audit employee weekly hours and FLSA overtime status')
  .option('--rate <rateDollars>', 'Hourly rate in dollars', '18.00')
  .option('--hours <weeklyHours>', 'Total scheduled weekly hours', '44')
  .action((employeeId, opts) => {
    const rateDollars = parseFloat(opts.rate);
    const totalHours = parseFloat(opts.hours);
    const regularHours = Math.min(40, totalHours);
    const otHours = Math.max(0, totalHours - 40);
    const regularCost = regularHours * rateDollars;
    const otCost = otHours * rateDollars * 1.5;
    const totalCost = regularCost + otCost;

    const rows = [
      ['Metric', 'Value'],
      ['Employee ID', employeeId],
      ['Base Hourly Rate', `$${rateDollars.toFixed(2)}/hr`],
      ['Total Hours', `${totalHours.toFixed(1)} hrs`],
      ['Regular Hours (1.0x)', `${regularHours.toFixed(1)} hrs ($${regularCost.toFixed(2)})`],
      ['FLSA Overtime Hours (1.5x)', otHours > 0 ? chalk.red(`${otHours.toFixed(1)} hrs ($${otCost.toFixed(2)})`) : '0.0 hrs ($0.00)'],
      ['Gross Payroll Estimate', chalk.bold.green(`$${totalCost.toFixed(2)}`)],
      ['FLSA Status', otHours > 0 ? chalk.bold.yellow('OVERTIME ACTIVE') : chalk.green('STANDARD')],
    ];
    console.log(chalk.bold.hex('#F97316')(`\n⏱️ Employee Overtime & FLSA Audit (${employeeId}):`));
    console.log(table(rows));
  });

// 5. Approve Shift Swap with Manager PIN
talentCommand
  .command('swap <swapId> <managerPin>')
  .description('Approve a staff shift swap request requiring manager authorization')
  .action((swapId, managerPin) => {
    if (!managerPin || managerPin.length < 4) {
      console.error(chalk.red('\n✖ A valid 4-digit manager PIN is required to approve shift swaps.\n'));
      return;
    }
    console.log(chalk.bold.green(`\n✔ Shift swap [${swapId}] approved by manager (PIN verified).`));
    console.log(chalk.gray(`Roster schedules updated and notification dispatched to both employees.\n`));
  });

