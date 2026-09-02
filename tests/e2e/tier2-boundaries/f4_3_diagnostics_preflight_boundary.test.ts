// ============================================================
// Tier 2 — F4.3: Automated Diagnostics Preflight (Boundary & Corner Cases)
// Covers: 0 checks array, 100% failure rate, 100% warning rate (all non-critical),
// and single check pass/fail edge cases.
// ============================================================

import { describe, expect, it } from 'bun:test';
import {
  runPreflightDiagnostics,
  type PreflightCheckItem,
} from '../tier1-features/f4_3_diagnostics_preflight.test.js';

describe('F4.3 Diagnostics Preflight — Tier 2 Boundaries', () => {
  it('1. returns 0 counts and isProductionReady=true on empty checks list', () => {
    const report = runPreflightDiagnostics([]);
    expect(report.results).toHaveLength(0);
    expect(report.passCount).toBe(0);
    expect(report.failCount).toBe(0);
    expect(report.isProductionReady).toBe(true);
  });

  it('2. evaluates 100% failures as NOT production ready', () => {
    const allFail: PreflightCheckItem[] = [
      { category: 'Builds', name: 'POS', condition: false, passMsg: 'OK', failMsg: 'Missing dist' },
      { category: 'Builds', name: 'KDS', condition: false, passMsg: 'OK', failMsg: 'Missing dist' },
      { category: 'Database', name: 'DB', condition: false, passMsg: 'OK', failMsg: 'Offline' },
    ];
    const report = runPreflightDiagnostics(allFail);
    expect(report.passCount).toBe(0);
    expect(report.failCount).toBe(3);
    expect(report.isProductionReady).toBe(false);
  });

  it('3. evaluates 100% warnings as production ready (degraded operational mode)', () => {
    const allWarn: PreflightCheckItem[] = [
      { category: 'AI Layer', name: 'Claude Key', condition: false, passMsg: 'OK', failMsg: 'AI Off', isWarnOnly: true },
      { category: 'Payments', name: 'Stripe Webhook', condition: false, passMsg: 'OK', failMsg: 'Manual settle', isWarnOnly: true },
    ];
    const report = runPreflightDiagnostics(allWarn);
    expect(report.warnCount).toBe(2);
    expect(report.failCount).toBe(0);
    expect(report.isProductionReady).toBe(true);
  });

  it('4. checks single failing critical check amidst multiple passing checks', () => {
    const mixed: PreflightCheckItem[] = [
      { category: 'Builds', name: 'POS', condition: true, passMsg: 'OK', failMsg: 'Fail' },
      { category: 'Builds', name: 'KDS', condition: true, passMsg: 'OK', failMsg: 'Fail' },
      { category: 'Builds', name: 'Admin', condition: false, passMsg: 'OK', failMsg: 'Admin Missing' },
    ];
    const report = runPreflightDiagnostics(mixed);
    expect(report.passCount).toBe(2);
    expect(report.failCount).toBe(1);
    expect(report.isProductionReady).toBe(false);
  });

  it('5. preserves check metadata names and custom failure messages', () => {
    const custom: PreflightCheckItem[] = [
      { category: 'System', name: 'Firewall Port 3000', condition: false, passMsg: 'Port open', failMsg: 'Port 3000 blocked by Windows Defender' },
    ];
    const report = runPreflightDiagnostics(custom);
    expect(report.results[0].message).toBe('Port 3000 blocked by Windows Defender');
  });
});
