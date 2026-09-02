// ============================================================
// Tier 2 — F4.4: Port Conflict Self-Healing (Boundary & Corner Cases)
// Covers: Port 65535 upper limit, checking uninitialized port,
// sequential killing of multiple conflicts, and already-free ports.
// ============================================================

import { describe, expect, it } from 'bun:test';
import { MockPortManager } from '../tier1-features/f4_4_port_self_healing.test.js';

describe('F4.4 Port Conflict Self-Healing — Tier 2 Boundaries', () => {
  it('1. checks uninitialized port number returning inUse=false default', () => {
    const manager = new MockPortManager([]);
    const entry = manager.checkPort(8080);
    expect(entry.inUse).toBe(false);
    expect(entry.port).toBe(8080);
  });

  it('2. heals multiple sequential port conflicts across consecutive services', () => {
    const manager = new MockPortManager([
      { port: 3000, inUse: true, occupyingPid: 1001, processName: 'zombie-node' },
      { port: 5172, inUse: true, occupyingPid: 1002, processName: 'zombie-vite' },
      { port: 5173, inUse: true, occupyingPid: 1003, processName: 'zombie-kds' },
    ]);

    expect(manager.healPortConflict(3000).resolved).toBe(true);
    expect(manager.healPortConflict(5172).resolved).toBe(true);
    expect(manager.healPortConflict(5173).resolved).toBe(true);

    expect(manager.getKilledPids()).toEqual([1001, 1002, 1003]);
    expect(manager.checkPort(3000).inUse).toBe(false);
    expect(manager.checkPort(5172).inUse).toBe(false);
    expect(manager.checkPort(5173).inUse).toBe(false);
  });

  it('3. handles repeated self-healing calls on the same port idempotently', () => {
    const manager = new MockPortManager([
      { port: 3000, inUse: true, occupyingPid: 2001 },
    ]);
    const first = manager.healPortConflict(3000);
    expect(first.resolved).toBe(true);
    expect(first.freedPid).toBe(2001);

    // Second heal call on now-freed port
    const second = manager.healPortConflict(3000);
    expect(second.resolved).toBe(true);
    expect(second.freedPid).toBeUndefined();
  });

  it('4. checks highest possible valid port number 65535', () => {
    const manager = new MockPortManager([
      { port: 65535, inUse: true, occupyingPid: 65535 },
    ]);
    const res = manager.healPortConflict(65535);
    expect(res.resolved).toBe(true);
    expect(res.freedPid).toBe(65535);
  });

  it('5. returns error when attempting to heal port with undefined occupying PID', () => {
    const manager = new MockPortManager([
      { port: 5174, inUse: true, occupyingPid: undefined },
    ]);
    const res = manager.healPortConflict(5174);
    expect(res.resolved).toBe(false);
    expect(res.error).toContain('PID could not be identified');
  });
});
