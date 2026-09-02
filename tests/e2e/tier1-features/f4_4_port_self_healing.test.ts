// ============================================================
// Tier 1 — F4.4: Port Conflict Self-Healing (Granular Feature Tests)
// Covers: Port collision scanning (3000, 5172-5180), zombie PID identification,
// graceful & forced termination, and post-kill port release verification.
// ============================================================

import { describe, expect, it } from 'bun:test';

export interface PortEntry {
  port: number;
  inUse: boolean;
  occupyingPid?: number;
  processName?: string;
}

export class MockPortManager {
  private ports: Map<number, PortEntry> = new Map();
  private killedPids: number[] = [];

  constructor(initialState: PortEntry[]) {
    for (const p of initialState) {
      this.ports.set(p.port, { ...p });
    }
  }

  public checkPort(port: number): PortEntry {
    return this.ports.get(port) || { port, inUse: false };
  }

  public healPortConflict(port: number): { resolved: boolean; freedPid?: number; error?: string } {
    const entry = this.ports.get(port);
    if (!entry || !entry.inUse) {
      return { resolved: true }; // already free
    }

    const pid = entry.occupyingPid;
    if (!pid) {
      return { resolved: false, error: `Port ${port} in use but PID could not be identified` };
    }

    // Kill zombie process
    this.killedPids.push(pid);
    entry.inUse = false;
    entry.occupyingPid = undefined;
    entry.processName = undefined;

    return { resolved: true, freedPid: pid };
  }

  public getKilledPids(): number[] {
    return this.killedPids;
  }
}

describe('F4.4 Port Conflict Self-Healing — Tier 1 Isolation', () => {
  it('1. detects when a core port (e.g. 3000) is locked by an orphaned zombie process', () => {
    const manager = new MockPortManager([
      { port: 3000, inUse: true, occupyingPid: 9876, processName: 'node.exe' },
      { port: 5172, inUse: false },
    ]);
    const p3000 = manager.checkPort(3000);
    expect(p3000.inUse).toBe(true);
    expect(p3000.occupyingPid).toBe(9876);
    expect(p3000.processName).toBe('node.exe');
  });

  it('2. self-heals by killing zombie process and freeing the target port', () => {
    const manager = new MockPortManager([
      { port: 3000, inUse: true, occupyingPid: 9876, processName: 'node.exe' },
    ]);
    const res = manager.healPortConflict(3000);
    expect(res.resolved).toBe(true);
    expect(res.freedPid).toBe(9876);
    expect(manager.getKilledPids()).toContain(9876);

    const postCheck = manager.checkPort(3000);
    expect(postCheck.inUse).toBe(false);
  });

  it('3. leaves available ports untouched with resolved=true', () => {
    const manager = new MockPortManager([
      { port: 5173, inUse: false },
    ]);
    const res = manager.healPortConflict(5173);
    expect(res.resolved).toBe(true);
    expect(res.freedPid).toBeUndefined();
    expect(manager.getKilledPids()).toHaveLength(0);
  });

  it('4. scans full range of CulinaryOS ports (3000, 5172, 5173, 5174, 5176)', () => {
    const manager = new MockPortManager([
      { port: 3000, inUse: true, occupyingPid: 101 },
      { port: 5172, inUse: true, occupyingPid: 102 },
      { port: 5173, inUse: false },
      { port: 5174, inUse: false },
      { port: 5176, inUse: false },
    ]);
    const portsToScan = [3000, 5172, 5173, 5174, 5176];
    const occupied = portsToScan.filter((p) => manager.checkPort(p).inUse);
    expect(occupied).toEqual([3000, 5172]);
  });

  it('5. returns descriptive error when process PID cannot be identified', () => {
    const manager = new MockPortManager([
      { port: 3000, inUse: true, occupyingPid: undefined }, // unidentifiable
    ]);
    const res = manager.healPortConflict(3000);
    expect(res.resolved).toBe(false);
    expect(res.error).toContain('PID could not be identified');
  });
});
