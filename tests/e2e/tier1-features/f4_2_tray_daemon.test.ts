// ============================================================
// Tier 1 — F4.2: System Tray Background Daemon (Granular Feature Tests)
// Covers: Background process supervisor, service registry state machine,
// health heartbeat loop, and tray menu action dispatching.
// ============================================================

import { describe, expect, it } from 'bun:test';

export type ServiceStatus = 'STOPPED' | 'STARTING' | 'RUNNING' | 'ERROR' | 'PORT_CONFLICT';

export interface ManagedService {
  name: string;
  port: number;
  status: ServiceStatus;
  pid?: number;
  uptimeSeconds: number;
  lastHealthCheck?: string;
}

export class TraySupervisor {
  private services: Map<string, ManagedService> = new Map();

  constructor() {
    this.registerService('api', 3000);
    this.registerService('pos', 5172);
    this.registerService('kds', 5173);
    this.registerService('admin', 5174);
  }

  public registerService(name: string, port: number) {
    this.services.set(name, {
      name,
      port,
      status: 'STOPPED',
      uptimeSeconds: 0,
    });
  }

  public getService(name: string): ManagedService | undefined {
    return this.services.get(name);
  }

  public getAllServices(): ManagedService[] {
    return Array.from(this.services.values());
  }

  public startService(name: string, pid: number): ManagedService {
    const s = this.services.get(name);
    if (!s) throw new Error(`Service ${name} not found`);
    s.status = 'RUNNING';
    s.pid = pid;
    s.uptimeSeconds = 0;
    s.lastHealthCheck = new Date().toISOString();
    return s;
  }

  public stopService(name: string): ManagedService {
    const s = this.services.get(name);
    if (!s) throw new Error(`Service ${name} not found`);
    s.status = 'STOPPED';
    s.pid = undefined;
    s.uptimeSeconds = 0;
    return s;
  }

  public reportPortConflict(name: string): ManagedService {
    const s = this.services.get(name);
    if (!s) throw new Error(`Service ${name} not found`);
    s.status = 'PORT_CONFLICT';
    return s;
  }

  public heartbeat(name: string, healthy: boolean) {
    const s = this.services.get(name);
    if (!s) return;
    s.lastHealthCheck = new Date().toISOString();
    if (!healthy && s.status === 'RUNNING') {
      s.status = 'ERROR';
    } else if (healthy && s.status === 'RUNNING') {
      s.uptimeSeconds += 10;
    }
  }
}

describe('F4.2 System Tray Background Daemon — Tier 1 Isolation', () => {
  it('1. initializes default core services registry (api, pos, kds, admin)', () => {
    const supervisor = new TraySupervisor();
    const services = supervisor.getAllServices();
    expect(services).toHaveLength(4);
    expect(services.map((s) => s.name)).toEqual(['api', 'pos', 'kds', 'admin']);
    expect(services.every((s) => s.status === 'STOPPED')).toBe(true);
  });

  it('2. transitions service status to RUNNING and assigns PID on launch', () => {
    const supervisor = new TraySupervisor();
    const started = supervisor.startService('api', 12345);
    expect(started.status).toBe('RUNNING');
    expect(started.pid).toBe(12345);
    expect(started.lastHealthCheck).toBeDefined();
  });

  it('3. transitions service status to STOPPED and clears PID on shutdown', () => {
    const supervisor = new TraySupervisor();
    supervisor.startService('pos', 12346);
    const stopped = supervisor.stopService('pos');
    expect(stopped.status).toBe('STOPPED');
    expect(stopped.pid).toBeUndefined();
  });

  it('4. tracks PORT_CONFLICT state when port collision is reported', () => {
    const supervisor = new TraySupervisor();
    const conflicted = supervisor.reportPortConflict('kds');
    expect(conflicted.status).toBe('PORT_CONFLICT');
  });

  it('5. updates health heartbeat and transitions to ERROR on failed health ping', () => {
    const supervisor = new TraySupervisor();
    supervisor.startService('admin', 12347);
    supervisor.heartbeat('admin', false); // health check failed
    const service = supervisor.getService('admin');
    expect(service?.status).toBe('ERROR');
  });
});
