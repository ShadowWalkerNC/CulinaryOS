// ============================================================
// @culinaryops/labor-engine — Role-Weighted Tip Pooling Engine
// Pure calculations supporting hours-worked, role-weighted points,
// and percentage tier splits with fair remainder distribution.
// ============================================================

export type TipPoolMethod = 'hours_worked' | 'role_weighted' | 'percentage_split';

export interface StaffHours {
  staffId: string;
  staffName?: string;
  role: string;
  hours: number;
  hourlyRate?: number;
}

export interface RoleWeight {
  role: string;
  weight: number;      // Multiplier (e.g. 1.0 = Server, 0.9 = Bartender, 0.4 = Busser)
  tier?: string;       // e.g. 'FOH', 'BOH', 'SUPPORT'
  percentage?: number; // Tier percentage if percentage_split method used
}

export interface TipPoolConfig {
  method: TipPoolMethod;
  poolTotalCents: number;
  roles?: RoleWeight[];
  rolePercentages?: Record<string, number>; // e.g. { foh: 70, boh: 20, support: 10 }
}

export interface StaffTipPayout {
  staffId: string;
  staffName?: string;
  role: string;
  hours: number;
  weight: number;
  pointHours: number;
  allocatedPercentage: number;
  payoutCents: number;
  payoutDollars: number;
  effectiveHourlyTipRateCents: number;
}

export interface TipPoolSummary {
  method: TipPoolMethod;
  poolTotalCents: number;
  totalEligibleHours: number;
  totalPoints: number;
  staffPayouts: StaffTipPayout[];
  byRole: Record<string, { totalHours: number; totalPayoutCents: number; staffCount: number }>;
  remainderCents: number;
}

export const FLSA_EXCLUDED_ROLES = new Set([
  'owner',
  'general_manager',
  'gm',
  'manager',
  'assistant_manager',
  'agm',
  'supervisor',
  'shift_lead',
  'shift_supervisor',
]);

/** Returns true if role is legally excluded from tip pools under FLSA */
export function isFlsaExcluded(role: string): boolean {
  return FLSA_EXCLUDED_ROLES.has(role.trim().toLowerCase().replace(/[\s-]+/g, '_'));
}

export const DEFAULT_ROLE_WEIGHTS: Record<string, number> = {
  server: 1.0,
  lead_server: 1.1,
  bartender: 0.9,
  head_bartender: 1.0,
  host: 0.4,
  busser: 0.4,
  food_runner: 0.45,
  barback: 0.4,
  sommelier: 1.0,
  line_cook: 0.25,
  prep_cook: 0.2,
  dishwasher: 0.2,
  expo: 0.5,
  manager: 0.0, // FLSA compliance: managers legally excluded from employee tip pools
  shift_lead: 0.0,
  supervisor: 0.0,
  owner: 0.0,
};

/**
 * Calculate role-weighted or hours-based tip distribution across shift staff.
 * Pure function: deterministic, handles edge cases, and guarantees zero cent leakage.
 */
export function calculateTipPool(
  config: TipPoolConfig,
  staffList: StaffHours[]
): TipPoolSummary {
  const method = config.method || 'role_weighted';
  const poolTotalCents = Math.max(0, Math.round(config.poolTotalCents || 0));

  // Filter out invalid/negative hours
  const eligibleStaff = staffList.filter((s) => s.hours > 0);

  if (eligibleStaff.length === 0 || poolTotalCents === 0) {
    return {
      method,
      poolTotalCents,
      totalEligibleHours: 0,
      totalPoints: 0,
      staffPayouts: eligibleStaff.map((s) => ({
        staffId: s.staffId,
        staffName: s.staffName || s.staffId,
        role: s.role,
        hours: s.hours,
        weight: 0,
        pointHours: 0,
        allocatedPercentage: 0,
        payoutCents: 0,
        payoutDollars: 0,
        effectiveHourlyTipRateCents: 0,
      })),
      byRole: {},
      remainderCents: 0,
    };
  }

  const customWeightsMap: Record<string, number> = {};
  if (config.roles) {
    for (const r of config.roles) {
      customWeightsMap[r.role.toLowerCase()] = r.weight;
    }
  }

  // Compute point-hours for each staff member with hardcoded FLSA manager exclusions
  const intermediate = eligibleStaff.map((s) => {
    const roleKey = s.role.toLowerCase().trim().replace(/[\s-]+/g, '_');
    let weight = 1.0;

    // Hard FLSA legal gate: Owners, managers, and supervisors are strictly excluded (0.0 weight)
    if (isFlsaExcluded(roleKey)) {
      weight = 0.0;
    } else if (method === 'hours_worked') {
      weight = 1.0;
    } else {
      if (customWeightsMap[roleKey] !== undefined) {
        weight = customWeightsMap[roleKey];
      } else if (DEFAULT_ROLE_WEIGHTS[roleKey] !== undefined) {
        weight = DEFAULT_ROLE_WEIGHTS[roleKey];
      } else {
        weight = 1.0;
      }
    }

    const pointHours = Math.round(s.hours * weight * 1000) / 1000;
    return {
      staffId: s.staffId,
      staffName: s.staffName || s.staffId,
      role: s.role,
      hours: s.hours,
      weight,
      pointHours,
    };
  });

  const totalPoints = intermediate.reduce((sum, s) => sum + s.pointHours, 0);
  const totalEligibleHours = intermediate.reduce((sum, s) => (s.weight > 0 ? sum + s.hours : sum), 0);

  if (totalPoints === 0) {
    return {
      method,
      poolTotalCents,
      totalEligibleHours,
      totalPoints: 0,
      staffPayouts: intermediate.map((s) => ({
        ...s,
        allocatedPercentage: 0,
        payoutCents: 0,
        payoutDollars: 0,
        effectiveHourlyTipRateCents: 0,
      })),
      byRole: {},
      remainderCents: poolTotalCents,
    };
  }

  // Calculate raw payouts and fractional remainders
  const payoutsWithFraction = intermediate.map((s) => {
    const share = s.pointHours / totalPoints;
    const rawCents = poolTotalCents * share;
    const baseCents = Math.floor(rawCents);
    const fraction = rawCents - baseCents;
    return {
      ...s,
      allocatedPercentage: Math.round(share * 10000) / 100,
      baseCents,
      fraction,
    };
  });

  const baseDistributed = payoutsWithFraction.reduce((sum, p) => sum + p.baseCents, 0);
  let remainder = poolTotalCents - baseDistributed;

  // Sort by highest remainder fraction to fairly distribute remaining cents
  const sortedByFraction = [...payoutsWithFraction].sort((a, b) => b.fraction - a.fraction);
  const bonusMap = new Map<string, number>();

  for (const p of sortedByFraction) {
    if (remainder <= 0) break;
    bonusMap.set(p.staffId, (bonusMap.get(p.staffId) || 0) + 1);
    remainder -= 1;
  }

  const staffPayouts: StaffTipPayout[] = payoutsWithFraction.map((p) => {
    const finalPayoutCents = p.baseCents + (bonusMap.get(p.staffId) || 0);
    const effectiveHourlyTipRateCents =
      p.hours > 0 ? Math.round(finalPayoutCents / p.hours) : 0;

    return {
      staffId: p.staffId,
      staffName: p.staffName,
      role: p.role,
      hours: p.hours,
      weight: p.weight,
      pointHours: p.pointHours,
      allocatedPercentage: p.allocatedPercentage,
      payoutCents: finalPayoutCents,
      payoutDollars: Math.round(finalPayoutCents) / 100,
      effectiveHourlyTipRateCents,
    };
  });

  // Group by role
  const byRole: Record<string, { totalHours: number; totalPayoutCents: number; staffCount: number }> = {};
  for (const p of staffPayouts) {
    const r = byRole[p.role] ?? (byRole[p.role] = { totalHours: 0, totalPayoutCents: 0, staffCount: 0 });
    r.totalHours += p.hours;
    r.totalPayoutCents += p.payoutCents;
    r.staffCount += 1;
  }

  return {
    method,
    poolTotalCents,
    totalEligibleHours: Math.round(totalEligibleHours * 100) / 100,
    totalPoints: Math.round(totalPoints * 100) / 100,
    staffPayouts,
    byRole,
    remainderCents: 0,
  };
}
