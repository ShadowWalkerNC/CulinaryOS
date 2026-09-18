// ==============================================================================
// Test Suite: Universal CLI Doctor Security & UI Diagnostics
// Non-Negotiable Rule 8: CLI parity.
// Exit Criteria Stage 1: culinary doctor security command ships and verifies posture.
// ==============================================================================

import { describe, it, expect } from 'bun:test';
import { runDoctor } from '../../cli/src/commands/system.ts';

describe('Universal CLI: culinary doctor diagnostics', () => {
  it('1. Executes culinary doctor security and passes all isolation gates', async () => {
    const passed = await runDoctor('security');
    expect(passed).toBe(true);
  });

  it('2. Executes culinary doctor ui and passes all ergonomics gates', async () => {
    const passed = await runDoctor('ui');
    expect(passed).toBe(true);
  });

  it('3. Executes general system doctor and checks port readiness', async () => {
    const passed = await runDoctor();
    expect(passed).toBe(true);
  });
});
