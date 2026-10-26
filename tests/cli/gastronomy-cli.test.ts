import assert from 'node:assert/strict';
import { describe, it } from 'bun:test';
import { gastronomyCommand } from '../../cli/src/commands/gastronomy.ts';

describe('Gastronomy CLI Command Suite', () => {
  it('registers all modernist gastronomy commands and aliases', () => {
    assert.equal(gastronomyCommand.name(), 'gastronomy');
    assert.equal(gastronomyCommand.alias(), 'science');

    const subcommands = gastronomyCommand.commands.map((cmd) => cmd.name());
    assert.ok(subcommands.includes('bloom'), 'Should include bloom conversion command');
    assert.ok(subcommands.includes('spherify'), 'Should include spherification command');
    assert.ok(subcommands.includes('sous-vide'), 'Should include sous-vide pasteurization command');
    assert.ok(subcommands.includes('egg'), 'Should include egg precision rheology command');
    assert.ok(subcommands.includes('brine'), 'Should include equilibrium brining command');
    assert.ok(subcommands.includes('pair'), 'Should include molecular flavor pairing command');
  });

  it('provides comprehensive help and parameter options', () => {
    const bloomCmd = gastronomyCommand.commands.find((c) => c.name() === 'bloom');
    assert.ok(bloomCmd);
    const optionFlags = bloomCmd.options.map((opt) => opt.flags);
    assert.ok(optionFlags.some((f) => f.includes('--from')));
    assert.ok(optionFlags.some((f) => f.includes('--to')));

    const sousVideCmd = gastronomyCommand.commands.find((c) => c.name() === 'sous-vide');
    assert.ok(sousVideCmd);
    const svFlags = sousVideCmd.options.map((opt) => opt.flags);
    assert.ok(svFlags.some((f) => f.includes('--initial')));
    assert.ok(svFlags.some((f) => f.includes('--geometry')));
  });
});
