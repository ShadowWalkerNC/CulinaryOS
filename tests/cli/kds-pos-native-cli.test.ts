// ============================================================
// CulinaryOS CLI — 104 native KDS/cash command structure
// ============================================================

import { describe, it, expect } from 'bun:test';
import { kdsCommand } from '../../cli/src/commands/kds.js';
import { posCommand } from '../../cli/src/commands/pos.js';

describe('KDS native ticket commands (104)', () => {
  it('defines list, bump, hold, fire and fire-course subcommands', () => {
    expect(kdsCommand.name()).toBe('kds');
    const names = kdsCommand.commands.map((c) => c.name());
    for (const want of ['list', 'bump', 'hold', 'fire', 'fire-course']) {
      expect(names).toContain(want);
    }
  });

  it('offers an idempotency option on every mutating ticket command', () => {
    for (const name of ['bump', 'hold', 'fire', 'fire-course']) {
      const cmd = kdsCommand.commands.find((c) => c.name() === name);
      expect(cmd).toBeDefined();
      expect(cmd?.options.map((o) => o.flags).some((f) => f.includes('--operation-id'))).toBe(true);
    }
  });
});

describe('POS native cash/drawer commands (104)', () => {
  it('defines cash-comp, refund and drawer open/movement/close/show subcommands', () => {
    expect(posCommand.name()).toBe('pos');
    const names = posCommand.commands.map((c) => c.name());
    for (const want of ['cash-comp', 'refund', 'drawer-open', 'drawer-movement', 'drawer-close', 'drawer-show']) {
      expect(names).toContain(want);
    }
  });

  it('requires amount and reason arguments on refund', () => {
    const cmd = posCommand.commands.find((c) => c.name() === 'refund');
    expect(cmd).toBeDefined();
    expect((cmd as unknown as { _args: unknown[] })._args.length).toBe(3);
  });

  it('defaults drawer commands to the main drawer', () => {
    for (const name of ['drawer-open', 'drawer-movement', 'drawer-close', 'drawer-show']) {
      const cmd = posCommand.commands.find((c) => c.name() === name);
      const drawer = cmd?.options.find((o) => o.flags.includes('--drawer'));
      expect(drawer?.defaultValue).toBe('main');
    }
  });
});
