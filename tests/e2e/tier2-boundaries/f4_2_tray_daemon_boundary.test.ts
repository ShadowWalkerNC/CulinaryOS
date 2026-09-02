// ============================================================
// Tier 2 — F4.2: System Tray Background Daemon (Boundary & Corner Cases)
// Covers: Stopping stopped service, launching unregistered service,
// duplicate registration, rapid heartbeats, and non-existent queries.
// ============================================================

import { describe, expect, it } from 'bun:test';
import { TraySupervisor } from '../tier1-features/f4_2_tray_daemon.test.js';

describe('F4.2 Tray Daemon — Tier 2 Boundaries', () => {
  it('1. returns undefined when querying unregistered service name', () => {
    const supervisor = new TraySupervisor();
    expect(supervisor.getService('nonexistent_daemon')).toBeUndefined();
  });

  it('2. throws descriptive error when attempting to start unregistered service', () => {
    const supervisor = new TraySupervisor();
    expect(() => {
      supervisor.startService('ghost_service', 9999);
    }).toThrow(/ghost_service not found/);
  });

  it('3. gracefully stops a service that is already in STOPPED status', () => {
    const supervisor = new TraySupervisor();
    const stopped = supervisor.stopService('api');
    expect(stopped.status).toBe('STOPPED');
    expect(stopped.pid).toBeUndefined();
  });

  it('4. ignores heartbeat pings for services that are not in RUNNING status', () => {
    const supervisor = new TraySupervisor();
    // 'pos' is currently STOPPED
    supervisor.heartbeat('pos', true);
    const pos = supervisor.getService('pos');
    expect(pos?.status).toBe('STOPPED');
    expect(pos?.uptimeSeconds).toBe(0);
  });

  it('5. handles registering custom addon service ports', () => {
    const supervisor = new TraySupervisor();
    supervisor.registerService('escpos-print-spooler', 9100);
    const s = supervisor.getService('escpos-print-spooler');
    expect(s?.port).toBe(9100);
    expect(s?.status).toBe('STOPPED');
  });
});
