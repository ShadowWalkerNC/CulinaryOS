// ============================================================
// Tier 1 — F4.3: Automated Diagnostics Preflight (Granular Feature Tests)
// Covers: 1-click health check matrix, Node version check, bundle outputs,
// Supabase credentials, payment keys, AI configuration, and pass/warn/fail exit code.
// ============================================================

import { describe, expect, it } from 'bun:test';

export interface PreflightCheckItem {
  category: 'Builds' | 'Database' | 'Payments' | 'AI Layer' | 'System';
  name: string;
  condition: boolean;
  passMsg: string;
  failMsg: string;
  isWarnOnly?: boolean;
}

export interface PreflightResult {
  category: string;
  name: string;
  status: 'PASS' | 'WARN' | 'FAIL';
  message: string;
}

export function runPreflightDiagnostics(checks: PreflightCheckItem[]): {
  results: PreflightResult[];
  passCount: number;
  warnCount: number;
  failCount: number;
  isProductionReady: boolean;
} {
  const results: PreflightResult[] = checks.map((c) => {
    let status: 'PASS' | 'WARN' | 'FAIL';
    if (c.condition) {
      status = 'PASS';
    } else if (c.isWarnOnly) {
      status = 'WARN';
    } else {
      status = 'FAIL';
    }
    return {
      category: c.category,
      name: c.name,
      status,
      message: c.condition ? c.passMsg : c.failMsg,
    };
  });

  const passCount = results.filter((r) => r.status === 'PASS').length;
  const warnCount = results.filter((r) => r.status === 'WARN').length;
  const failCount = results.filter((r) => r.status === 'FAIL').length;

  return {
    results,
    passCount,
    warnCount,
    failCount,
    isProductionReady: failCount === 0,
  };
}

describe('F4.3 Automated Diagnostics Preflight — Tier 1 Isolation', () => {
  it('1. passes when all critical and warning checks evaluate to true', () => {
    const checks: PreflightCheckItem[] = [
      { category: 'Builds', name: 'POS Client Bundle', condition: true, passMsg: 'OK', failMsg: 'Missing dist' },
      { category: 'Database', name: 'Supabase URL', condition: true, passMsg: 'Live Supabase', failMsg: 'Offline' },
    ];
    const report = runPreflightDiagnostics(checks);
    expect(report.passCount).toBe(2);
    expect(report.failCount).toBe(0);
    expect(report.isProductionReady).toBe(true);
  });

  it('2. tolerates non-critical warning checks (e.g. AI key missing) without blocking readiness', () => {
    const checks: PreflightCheckItem[] = [
      { category: 'Builds', name: 'POS Client Bundle', condition: true, passMsg: 'OK', failMsg: 'Missing dist' },
      { category: 'AI Layer', name: 'Anthropic Key', condition: false, passMsg: 'Active', failMsg: 'Degraded mode', isWarnOnly: true },
    ];
    const report = runPreflightDiagnostics(checks);
    expect(report.passCount).toBe(1);
    expect(report.warnCount).toBe(1);
    expect(report.failCount).toBe(0);
    expect(report.isProductionReady).toBe(true);
  });

  it('3. fails production readiness if any critical check fails', () => {
    const checks: PreflightCheckItem[] = [
      { category: 'Builds', name: 'POS Client Bundle', condition: false, passMsg: 'OK', failMsg: 'Missing dist' }, // critical
    ];
    const report = runPreflightDiagnostics(checks);
    expect(report.failCount).toBe(1);
    expect(report.isProductionReady).toBe(false);
  });

  it('4. aggregates category results cleanly (Builds, Database, Payments, AI Layer)', () => {
    const checks: PreflightCheckItem[] = [
      { category: 'Builds', name: 'KDS', condition: true, passMsg: 'KDS dist ready', failMsg: 'KDS missing' },
      { category: 'Database', name: 'Postgres', condition: true, passMsg: 'DB ready', failMsg: 'DB down' },
      { category: 'Payments', name: 'Stripe', condition: true, passMsg: 'Stripe key valid', failMsg: 'Stripe unset' },
      { category: 'AI Layer', name: 'Claude', condition: true, passMsg: 'Claude enabled', failMsg: 'Claude off', isWarnOnly: true },
    ];
    const report = runPreflightDiagnostics(checks);
    expect(report.results).toHaveLength(4);
    expect(report.results.map((r) => r.category)).toEqual(['Builds', 'Database', 'Payments', 'AI Layer']);
  });

  it('5. provides detailed pass/fail messages for each checked component', () => {
    const checks: PreflightCheckItem[] = [
      { category: 'Builds', name: 'Admin Portal', condition: false, passMsg: 'Compiled in apps/admin/dist', failMsg: 'Missing dist. Run pnpm build' },
    ];
    const report = runPreflightDiagnostics(checks);
    expect(report.results[0].message).toBe('Missing dist. Run pnpm build');
  });
});
