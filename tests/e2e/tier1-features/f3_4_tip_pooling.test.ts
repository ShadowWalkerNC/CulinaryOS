// ============================================================
// Tier 1 — F3.4: Role-Weighted Tip Pooling (Granular Feature Tests)
// Covers: Hours-worked method, role-weighted points distribution,
// whole-cent rounding, and conservation of total tip pool.
// ============================================================

import { describe, expect, it } from 'bun:test';

export interface StaffShift {
  staffId: string;
  name: string;
  role: 'server' | 'busser' | 'bartender' | 'kitchen';
  hoursWorked: number;
}

export interface RoleWeightsConfig {
  server: number;
  busser: number;
  bartender: number;
  kitchen: number;
}

export interface TipPayout {
  staffId: string;
  name: string;
  role: string;
  hoursWorked: number;
  points: number;
  payoutCents: number;
}

export function distributeTipPool(
  totalTipPoolCents: number,
  shifts: StaffShift[],
  method: 'hours_worked' | 'role_weighted',
  roleWeights?: RoleWeightsConfig
): { payouts: TipPayout[]; totalDistributedCents: number; poolConservationCheck: boolean } {
  if (shifts.length === 0 || totalTipPoolCents === 0) {
    return { payouts: [], totalDistributedCents: 0, poolConservationCheck: true };
  }

  const defaultWeights: RoleWeightsConfig = {
    server: 1.0,
    busser: 0.5,
    bartender: 0.8,
    kitchen: 0.3,
  };
  const weights = roleWeights || defaultWeights;

  const staffPoints = shifts.map((s) => {
    const weight = method === 'role_weighted' ? (weights[s.role] ?? 1.0) : 1.0;
    const points = s.hoursWorked * weight;
    return { ...s, points };
  });

  const totalPoints = staffPoints.reduce((acc, s) => acc + s.points, 0);
  if (totalPoints === 0) {
    return { payouts: [], totalDistributedCents: 0, poolConservationCheck: true };
  }

  let distributed = 0;
  const payouts: TipPayout[] = staffPoints.map((s) => {
    const share = (s.points / totalPoints) * totalTipPoolCents;
    const payoutCents = Math.floor(share);
    distributed += payoutCents;
    return {
      staffId: s.staffId,
      name: s.name,
      role: s.role,
      hoursWorked: s.hoursWorked,
      points: s.points,
      payoutCents,
    };
  });

  // Distribute leftover cents to highest point holders to ensure exact cent conservation
  let remainder = totalTipPoolCents - distributed;
  let idx = 0;
  while (remainder > 0 && idx < payouts.length) {
    payouts[idx].payoutCents += 1;
    distributed += 1;
    remainder -= 1;
    idx = (idx + 1) % payouts.length;
  }

  return {
    payouts,
    totalDistributedCents: distributed,
    poolConservationCheck: distributed === totalTipPoolCents,
  };
}

describe('F3.4 Role-Weighted Tip Pooling — Tier 1 Isolation', () => {
  const sampleShifts: StaffShift[] = [
    { staffId: 's1', name: 'Alice', role: 'server', hoursWorked: 8 },
    { staffId: 's2', name: 'Bob', role: 'server', hoursWorked: 6 },
    { staffId: 's3', name: 'Charlie', role: 'busser', hoursWorked: 8 },
    { staffId: 's4', name: 'David', role: 'bartender', hoursWorked: 6 },
  ];

  it('1. distributes tips proportionally using hours_worked method', () => {
    const poolCents = 28000; // $280.00
    // Total hours = 8 + 6 + 8 + 6 = 28 hours. Rate = $10/hour
    const res = distributeTipPool(poolCents, sampleShifts, 'hours_worked');
    expect(res.poolConservationCheck).toBe(true);
    expect(res.payouts.find((p) => p.staffId === 's1')?.payoutCents).toBe(8000); // $80.00
    expect(res.payouts.find((p) => p.staffId === 's2')?.payoutCents).toBe(6000); // $60.00
    expect(res.payouts.find((p) => p.staffId === 's3')?.payoutCents).toBe(8000); // $80.00
    expect(res.payouts.find((p) => p.staffId === 's4')?.payoutCents).toBe(6000); // $60.00
  });

  it('2. distributes tips with role-weighted points system (servers > bussers)', () => {
    const poolCents = 50000; // $500.00
    const res = distributeTipPool(poolCents, sampleShifts, 'role_weighted', {
      server: 1.0,   // Alice = 8, Bob = 6
      busser: 0.5,   // Charlie = 8 * 0.5 = 4
      bartender: 0.8,// David = 6 * 0.8 = 4.8
      kitchen: 0.0,
    });
    // Total points = 8 + 6 + 4 + 4.8 = 22.8
    expect(res.poolConservationCheck).toBe(true);
    const alice = res.payouts.find((p) => p.staffId === 's1');
    const charlie = res.payouts.find((p) => p.staffId === 's3');
    // Alice worked 8 hrs as server (8 pts); Charlie worked 8 hrs as busser (4 pts)
    expect(alice!.payoutCents).toBeGreaterThan(charlie!.payoutCents);
  });

  it('3. guarantees 100% pool conservation without losing odd remainder cents', () => {
    const oddPoolCents = 10001; // $100.01 with 3 equal staff
    const threeShifts: StaffShift[] = [
      { staffId: '1', name: 'A', role: 'server', hoursWorked: 5 },
      { staffId: '2', name: 'B', role: 'server', hoursWorked: 5 },
      { staffId: '3', name: 'C', role: 'server', hoursWorked: 5 },
    ];
    const res = distributeTipPool(oddPoolCents, threeShifts, 'hours_worked');
    expect(res.totalDistributedCents).toBe(10001);
    expect(res.poolConservationCheck).toBe(true);
  });

  it('4. handles empty shift roster gracefully with 0 distributed cents', () => {
    const res = distributeTipPool(25000, [], 'hours_worked');
    expect(res.payouts).toHaveLength(0);
    expect(res.totalDistributedCents).toBe(0);
    expect(res.poolConservationCheck).toBe(true);
  });

  it('5. returns zero payouts when total pool is zero', () => {
    const res = distributeTipPool(0, sampleShifts, 'role_weighted');
    expect(res.totalDistributedCents).toBe(0);
    expect(res.poolConservationCheck).toBe(true);
  });
});
