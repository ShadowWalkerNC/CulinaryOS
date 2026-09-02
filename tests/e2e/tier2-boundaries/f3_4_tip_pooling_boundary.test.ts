// ============================================================
// Tier 2 — F3.4: Role-Weighted Tip Pooling (Boundary & Corner Cases)
// Covers: 0 hours worked for individual staff, $0.01 micro pool,
// 100 staff splitting odd remainder cents, and single staff shift.
// ============================================================

import { describe, expect, it } from 'bun:test';
import {
  distributeTipPool,
  type StaffShift,
} from '../tier1-features/f3_4_tip_pooling.test.js';

describe('F3.4 Tip Pooling — Tier 2 Boundaries', () => {
  it('1. awards $0 tips to staff members with 0 hours worked', () => {
    const shifts: StaffShift[] = [
      { staffId: '1', name: 'Active Server', role: 'server', hoursWorked: 8 },
      { staffId: '2', name: 'Sick Server', role: 'server', hoursWorked: 0 },
    ];
    const res = distributeTipPool(10000, shifts, 'hours_worked');
    expect(res.payouts.find((p) => p.staffId === '1')?.payoutCents).toBe(10000);
    expect(res.payouts.find((p) => p.staffId === '2')?.payoutCents).toBe(0);
    expect(res.poolConservationCheck).toBe(true);
  });

  it('2. allocates 100% of pool to a single staff member on a solo shift', () => {
    const soloShift: StaffShift[] = [
      { staffId: 'solo-1', name: 'Solo Bartender', role: 'bartender', hoursWorked: 6 },
    ];
    const res = distributeTipPool(15750, soloShift, 'role_weighted');
    expect(res.payouts[0].payoutCents).toBe(15750);
    expect(res.poolConservationCheck).toBe(true);
  });

  it('3. distributes micro-pool of exactly $0.01 without losing the cent', () => {
    const shifts: StaffShift[] = [
      { staffId: '1', name: 'Alice', role: 'server', hoursWorked: 4 },
      { staffId: '2', name: 'Bob', role: 'server', hoursWorked: 4 },
    ];
    const res = distributeTipPool(1, shifts, 'hours_worked'); // 1 cent pool
    expect(res.totalDistributedCents).toBe(1);
    expect(res.poolConservationCheck).toBe(true);
    // One person gets 1 cent, the other gets 0 cents
    const sum = res.payouts.reduce((acc, p) => acc + p.payoutCents, 0);
    expect(sum).toBe(1);
  });

  it('4. splits odd pool ($100.03) across 10 staff members with exact cent conservation', () => {
    const shifts: StaffShift[] = Array.from({ length: 10 }, (_, i) => ({
      staffId: `staff-${i + 1}`,
      name: `Staff Member ${i + 1}`,
      role: 'server' as const,
      hoursWorked: 5,
    }));
    const res = distributeTipPool(10003, shifts, 'hours_worked');
    expect(res.totalDistributedCents).toBe(10003);
    expect(res.poolConservationCheck).toBe(true);
  });

  it('5. handles 0 total hours across all staff returning 0 distributed cents safely', () => {
    const zeroShifts: StaffShift[] = [
      { staffId: '1', name: 'A', role: 'server', hoursWorked: 0 },
      { staffId: '2', name: 'B', role: 'server', hoursWorked: 0 },
    ];
    const res = distributeTipPool(5000, zeroShifts, 'hours_worked');
    expect(res.totalDistributedCents).toBe(0);
    expect(res.poolConservationCheck).toBe(true);
  });
});
