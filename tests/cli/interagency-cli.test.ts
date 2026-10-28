// ============================================================
// CulinaryOS CLI — Interagency Command Test Suite
// ============================================================

import { describe, it, expect } from 'bun:test';
import { interagencyCommand } from '../../cli/src/commands/interagency.js';

describe('CulinaryOS Interagency CLI Command Engine', () => {
  it('defines the interagency command and all required subcommands', () => {
    expect(interagencyCommand.name()).toBe('interagency');
    const subcommandNames = interagencyCommand.commands.map((c) => c.name());
    expect(subcommandNames).toContain('status');
    expect(subcommandNames).toContain('grants');
    expect(subcommandNames).toContain('revoke');
    expect(subcommandNames).toContain('snapshot');
  });

  it('configures options for status and grant commands', () => {
    const statusCmd = interagencyCommand.commands.find((c) => c.name() === 'status');
    expect(statusCmd).toBeDefined();
    expect(statusCmd?.options.some((o) => o.flags.includes('--tenant'))).toBe(true);

    const grantsCmd = interagencyCommand.commands.find((c) => c.name() === 'grants');
    expect(grantsCmd).toBeDefined();
    expect(grantsCmd?.aliases()).toContain('list');
    expect(grantsCmd?.options.some((o) => o.flags.includes('--tenant'))).toBe(true);
  });

  it('configures snapshot command with resource argument and token option', () => {
    const snapCmd = interagencyCommand.commands.find((c) => c.name() === 'snapshot');
    expect(snapCmd).toBeDefined();
    expect(snapCmd?.options.some((o) => o.flags.includes('--token'))).toBe(true);
    expect(snapCmd?.options.some((o) => o.flags.includes('--limit'))).toBe(true);
  });
});
