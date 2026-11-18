import { Command } from 'commander';
import chalk from 'chalk';
import { table } from 'table';
import { apiGet, apiPost } from '../lib/api-client';

export const authCommand = new Command('auth')
  .description('Authentication, PIN Login, Manager Override, RBAC Roles, Device Tokens & Security Audit Logs');

// 1. Staff PIN Login
authCommand
  .command('login <pin>')
  .description('Authenticate a staff PIN against /v1/auth/pin-login and display session credentials')
  .option('--tenant <id>', 'Tenant ID')
  .action(async (pin, opts) => {
    try {
      const res: any = await apiPost('/v1/auth/pin-login', { pin }, opts.tenant);
      const data = res?.data || res;
      const role = data.staff?.role || data.role || 'server';
      const name = data.staff?.displayName || data.displayName || 'Staff Member';
      const isMgr = role === 'owner' || role === 'manager' || Boolean(data.staff?.hasHiringFiringAuthority);
      const rows = [
        ['Field', 'Session Value'],
        ['Display Name', chalk.bold.white(name)],
        ['Role', chalk.cyan(String(role).toUpperCase())],
        ['Manager / Owner Authority', isMgr ? chalk.green('YES (Elevated)') : chalk.gray('No (Standard FOH/BOH)')],
        ['FLSA Tip Pool Eligible', isMgr ? chalk.yellow('EXCLUDED (29 U.S.C. 203(m)(2)(B))') : chalk.green('ELIGIBLE')],
        ['Auth Mode', String(data.mode || 'native_rust')],
        ['Access / Device Token', String(data.accessToken || data.token || 'session-verified').slice(0, 36)],
      ];
      console.log(chalk.bold.hex('#F97316')('\nCulinaryOS Authenticated Session:'));
      console.log(table(rows));
    } catch (err: any) {
      console.error(chalk.red(`\n✖ PIN login failed: ${err.message}\n`));
    }
  });

// 2. Verify Manager Override PIN
authCommand
  .command('verify-manager <pin>')
  .description('Verify Manager or Owner PIN authority for voids, comps, drawer kicks & token minting')
  .option('--tenant <id>', 'Tenant ID')
  .action(async (pin, opts) => {
    try {
      const res: any = await apiPost('/v1/auth/verify-manager-pin', { pin }, opts.tenant);
      const data = res?.data || res;
      if (data.authorized || data.valid) {
        console.log(chalk.bold.green(`\n✔ Manager PIN Verified — Role: ${(data.role || 'manager').toUpperCase()} (${data.managerName || 'Authorized Manager'})\n`));
      } else {
        console.log(chalk.bold.red(`\n✖ Manager PIN Denied: ${data.error || 'Insufficient privilege or invalid PIN'}\n`));
      }
    } catch (err: any) {
      console.error(chalk.red(`\n✖ Manager verification failed: ${err.message}\n`));
    }
  });

// 3. Inspect Current Session (whoami)
authCommand
  .command('whoami')
  .description('Inspect active session identity, tenant binding, role capabilities & FLSA posture')
  .option('--tenant <id>', 'Tenant ID')
  .action(async (opts) => {
    try {
      const res: any = await apiGet('/v1/auth/session', opts.tenant);
      const data = res?.data || res;
      const rows = [
        ['Attribute', 'Value'],
        ['Tenant / Site ID', String(data.tenantId || '00000000-0000-0000-0000-000000000001')],
        ['User ID', String(data.userId || 'operator')],
        ['Role', `${String(data.role || 'manager').toUpperCase()} (${data.title || 'General Manager'})`],
        ['Auth Mode', String(data.authMode || 'rust_embedded_local')],
        ['FLSA Tip Pool Eligible', data.flsaTipPoolEligible ? 'YES' : 'NO (Excluded per 29 U.S.C. 203(m)(2)(B))'],
        ['Capabilities', Array.isArray(data.capabilities) ? data.capabilities.join(', ') : '*'],
      ];
      console.log(chalk.bold.hex('#F97316')('\nCulinaryOS Active Session Identity:'));
      console.log(table(rows));
    } catch (err: any) {
      console.error(chalk.red(`\n✖ Session check failed: ${err.message}\n`));
    }
  });

// 4. RBAC Roles & FLSA Legal Matrix
authCommand
  .command('roles')
  .description('Display the complete RBAC role permission matrix and FLSA tip pool eligibility rules')
  .option('--tenant <id>', 'Tenant ID')
  .action(async (opts) => {
    try {
      const res: any = await apiGet('/v1/auth/roles', opts.tenant);
      const list = Array.isArray(res) ? res : res?.data || [];
      const rows = [
        ['Role ID', 'Title', 'Hiring/Firing Auth', 'FLSA Tip Pool', 'Statutory Rule / Capabilities'],
        ...list.map((r: any) => [
          r.role,
          r.title,
          r.hasHiringFiringAuthority ? 'YES' : 'No',
          r.flsaTipPoolEligible ? chalk.green('ELIGIBLE') : chalk.yellow('EXCLUDED ($0)'),
          r.flsaCitation,
        ]),
      ];
      console.log(chalk.bold.hex('#F97316')('\nCulinaryOS RBAC Role & FLSA Compliance Matrix:'));
      console.log(table(rows));
    } catch (err: any) {
      console.error(chalk.red(`\n✖ Failed to load roles matrix: ${err.message}\n`));
    }
  });

// 5. List Registered Staff Members
authCommand
  .command('staff')
  .description('List all registered venue staff members, roles, and FLSA tip pool status')
  .option('--tenant <id>', 'Tenant ID')
  .action(async (opts) => {
    try {
      const res: any = await apiGet('/v1/admin/staff', opts.tenant);
      const list = Array.isArray(res) ? res : res?.data || [];
      const rows = [
        ['Staff ID', 'Display Name', 'Role', 'Hiring/Firing Auth', 'FLSA Tip Pool'],
        ...list.map((s: any) => {
          const isMgr = ['owner', 'manager'].includes(String(s.role).toLowerCase()) || Boolean(s.hasHiringFiringAuthority);
          return [
            String(s.id).slice(0, 12),
            s.displayName || s.display_name || s.name || 'Staff',
            String(s.role).toUpperCase(),
            isMgr ? 'YES' : 'No',
            isMgr ? chalk.yellow('EXCLUDED ($0)') : chalk.green('ELIGIBLE'),
          ];
        }),
      ];
      console.log(chalk.bold.hex('#F97316')('\nRegistered Venue Staff & PIN Roster:'));
      console.log(table(rows));
    } catch (err: any) {
      console.error(chalk.red(`\n✖ Failed to list staff: ${err.message}\n`));
    }
  });

// 6. Provision New Staff Member & Salted PIN
authCommand
  .command('create-staff')
  .description('Provision a new staff member with role and salted SHA-256 PIN digest')
  .requiredOption('--name <name>', 'Staff full display name')
  .requiredOption('--role <role>', 'Role (owner|manager|server|bartender|cook|cashier)')
  .requiredOption('--pin <pin>', '4-8 digit terminal login PIN')
  .option('--tenant <id>', 'Tenant ID')
  .action(async (opts) => {
    try {
      const res: any = await apiPost(
        '/v1/admin/staff',
        {
          displayName: opts.name,
          role: opts.role.toLowerCase(),
          pin: opts.pin,
        },
        opts.tenant,
      );
      const data = res?.data || res;
      console.log(chalk.bold.green(`\n✔ Staff Member Provisioned: ${data.displayName || opts.name} (${String(data.role || opts.role).toUpperCase()})`));
      console.log(chalk.gray(`  Staff ID: ${data.id || 'provisioned'}\n`));
    } catch (err: any) {
      console.error(chalk.red(`\n✖ Failed to create staff member: ${err.message}\n`));
    }
  });

// 7. Mint Scoped Hardware Device Bearer Token
authCommand
  .command('mint-device-token')
  .description('Mint a tenant-scoped hardware bearer token for POS, KDS, Display, or Handheld (requires Manager PIN)')
  .option('--label <label>', 'Device label', 'POS Terminal #1')
  .option('--role <role>', 'Device role (pos|kds|display|handheld)', 'pos')
  .option('--station <station>', 'KDS station binding (hot|cold|grill|fry|pastry|bar|expo)')
  .option('--manager-pin <pin>', 'Authorizing Manager or Owner PIN', '1234')
  .option('--tenant <id>', 'Tenant ID')
  .action(async (opts) => {
    try {
      const res: any = await apiPost(
        '/v1/auth/device-token',
        {
          label: opts.label,
          deviceRole: opts.role,
          station: opts.station,
          managerPin: opts.managerPin,
        },
        opts.tenant,
      );
      const data = res?.data || res;
      const rows = [
        ['Field', 'Provisioned Device Value'],
        ['Device ID', String(data.deviceId)],
        ['Label', String(data.label)],
        ['Device Role', String(data.deviceRole).toUpperCase()],
        ['Station Scope', String(data.station || 'all')],
        ['Bearer Token', chalk.bold.green(String(data.token))],
        ['Capabilities', Array.isArray(data.capabilities) ? data.capabilities.join(', ') : 'pos:*'],
      ];
      console.log(chalk.bold.hex('#F97316')('\nMinted Scoped Hardware Device Token:'));
      console.log(table(rows));
    } catch (err: any) {
      console.error(chalk.red(`\n✖ Failed to mint device token: ${err.message}\n`));
    }
  });

// 8. Security & Manager Override Audit Logs
authCommand
  .command('audit-logs')
  .description('Inspect chronological security, PIN login, and manager override audit logs')
  .option('--tenant <id>', 'Tenant ID')
  .action(async (opts) => {
    try {
      const res: any = await apiGet('/v1/auth/audit-logs', opts.tenant);
      const list = Array.isArray(res) ? res : res?.data || [];
      const rows = [
        ['Audit ID', 'Action', 'Actor', 'Role', 'Status', 'Timestamp'],
        ...list.map((a: any) => [
          String(a.id || 'audit').slice(0, 12),
          String(a.action || a.event_type || 'security.event'),
          String(a.actor || a.user_id || 'operator'),
          String(a.role || 'manager').toUpperCase(),
          String(a.status || 'authorized'),
          String(a.timestamp || a.created_at || new Date().toISOString()),
        ]),
      ];
      console.log(chalk.bold.hex('#F97316')('\nCulinaryOS Security & Manager Override Audit Trail:'));
      console.log(table(rows));
    } catch (err: any) {
      console.error(chalk.red(`\n✖ Failed to fetch audit logs: ${err.message}\n`));
    }
  });
