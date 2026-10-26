// ============================================================
// CulinaryOS CLI — Display Command Test Suite
// ============================================================

import { describe, it, expect } from 'bun:test';
import { displayCommand } from '../../cli/src/commands/display.js';

describe('CulinaryOS Display CLI Command Engine', () => {
  it('defines the display command and all required subcommands', () => {
    expect(displayCommand.name()).toBe('display');
    const subcommandNames = displayCommand.commands.map((c) => c.name());
    expect(subcommandNames).toContain('list');
    expect(subcommandNames).toContain('pair');
    expect(subcommandNames).toContain('switch');
    expect(subcommandNames).toContain('refresh');
    expect(subcommandNames).toContain('unpair');
    expect(subcommandNames).toContain('projection');
  });

  it('configures options for pairing with brand and station views', () => {
    const pairCmd = displayCommand.commands.find((c) => c.name() === 'pair');
    expect(pairCmd).toBeDefined();
    const optFlags = pairCmd?.options.map((o) => o.flags);
    expect(optFlags?.some((f) => f.includes('--name'))).toBe(true);
    expect(optFlags?.some((f) => f.includes('--mode'))).toBe(true);
    expect(optFlags?.some((f) => f.includes('--view'))).toBe(true);
    expect(optFlags?.some((f) => f.includes('--brand'))).toBe(true);
  });

  it('configures remote switch command with required mode parameter', () => {
    const switchCmd = displayCommand.commands.find((c) => c.name() === 'switch');
    expect(switchCmd).toBeDefined();
    const modeOpt = switchCmd?.options.find((o) => o.flags.includes('--mode'));
    expect(modeOpt?.mandatory).toBe(true);
  });
});
