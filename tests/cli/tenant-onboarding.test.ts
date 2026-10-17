import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { tenantCommand } from '../../cli/src/commands/tenant.js';

describe('Phase 2: Closed Beta / Operator Onboarding CLI', () => {
  it('registers all required tenant management subcommands', () => {
    const subcommands = tenantCommand.commands.map((c) => c.name());
    assert.ok(subcommands.includes('list'), 'Must have tenant list');
    assert.ok(subcommands.includes('create'), 'Must have tenant create');
    assert.ok(subcommands.includes('bootstrap'), 'Must have tenant bootstrap');
    assert.ok(subcommands.includes('invite'), 'Must have tenant invite');
    assert.ok(subcommands.includes('stripe-connect'), 'Must have tenant stripe-connect');
    assert.ok(subcommands.includes('statement'), 'Must have tenant statement');
    assert.ok(subcommands.includes('template'), 'Must have tenant template');
  });

  it('validates options for tenant bootstrap command', () => {
    const bootstrapCmd = tenantCommand.commands.find((c) => c.name() === 'bootstrap');
    assert.ok(bootstrapCmd);

    const optionNames = bootstrapCmd.options.map((o) => o.name());
    assert.ok(optionNames.includes('name'), 'Bootstrap requires restaurant name');
    assert.ok(optionNames.includes('email'), 'Bootstrap requires owner email');
    assert.ok(optionNames.includes('plan'), 'Bootstrap accepts plan tier');
    assert.ok(optionNames.includes('template'), 'Bootstrap accepts business template');
  });

  it('validates options for tenant invite command', () => {
    const inviteCmd = tenantCommand.commands.find((c) => c.name() === 'invite');
    assert.ok(inviteCmd);

    const optionNames = inviteCmd.options.map((o) => o.name());
    assert.ok(optionNames.includes('email'), 'Invite requires staff email');
    assert.ok(optionNames.includes('role'), 'Invite requires staff role');
  });

  it('validates options for stripe-connect command', () => {
    const stripeCmd = tenantCommand.commands.find((c) => c.name() === 'stripe-connect');
    assert.ok(stripeCmd);

    const optionNames = stripeCmd.options.map((o) => o.name());
    assert.ok(optionNames.includes('tenant'), 'Stripe Connect accepts tenant ID');
  });
});
