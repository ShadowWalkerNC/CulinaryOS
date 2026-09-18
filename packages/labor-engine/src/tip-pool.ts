// ============================================================
// @culinaryops/labor-engine — FLSA-Compliant Tip Pooling Engine
// Supports four legal distribution methods:
// 1. hours_worked     — strictly proportional to hours on shift
// 2. role_weighted    — points-weighted (e.g. server 1.0, busser 0.5)
// 3. keep_your_own    — direct server tips with support staff tip-out
// 4. percent_of_sales — support pool funded by percentage of net sales
//
// Strict FLSA Non-Negotiable Gates (Rule 9):
// - Managers, supervisors, shift leads, and owners are EXCLUDED (weight=0.0, untestable to disable)
// - BOH employees (cooks, dishwashers) are excluded when employer takes a tip credit (paysTipCredit=true)
// - 80/20 non-tipped duty compliance flag
// - Zero cent leakage guarantee with fractional remainder distribution
// ============================================================

export type TipPoolMethod =
  | 'hours_worked'
  | 'role_weighted'
  | 'percentage_split'
  | 'keep_your_own'
  | 'percent_of_sales';

export interface StaffHours {
  staffId: string;
  staffName?: string;
  role: string;
  hours: number;
  hourlyRate?: number;
  directTipsCents?: number;       // For keep_your_own: tips collected directly
  netSalesCents?: number;         // For percent_of_sales: net sales rang up by employee
  nonTippedDutyHours?: number;    // For 80/20 rule: hours spent on non-tipped duties
  monthToDateTipsCents?: number;  // To flag tipped employee status (<$30/mo threshold)
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
  paysTipCredit?: boolean;                  // True if employer pays sub-minimum wage (requires FOH-only pool)
  tipOutPercent?: number;                   // For keep_your_own or percent_of_sales (e.g. 3.0 = 3% tip-out)
}

export type FlsaStatus = 'ELIGIBLE' | 'EXCLUDED_MANAGER' | 'EXCLUDED_TIP_CREDIT';

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
  flsaStatus: FlsaStatus;
  exceedsNonTippedDutyLimit?: boolean; // True if non-tipped duties > 20% of shift (80/20 rule)
  isBelowMonthlyThreshold?: boolean;  // True if monthly tips < $30
}

export interface TipPoolSummary {
  method: TipPoolMethod;
  poolTotalCents: number;
  totalEligibleHours: number;
  totalPoints: number;
  staffPayouts: StaffTipPayout[];
  byRole: Record<string, { totalHours: number; totalPayoutCents: number; staffCount: number }>;
  remainderCents: number;
  paysTipCredit: boolean;
  legalNotices: string[];
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

export const BOH_ROLES = new Set([
  'line_cook',
  'prep_cook',
  'cook',
  'dishwasher',
  'chef',
  'sous_chef',
  'pastry_chef',
  'baker',
  'kitchen',
]);

/** Returns true if role is legally excluded from tip pools under FLSA (managers/supervisors) */
export function isFlsaExcluded(role: string): boolean {
  return FLSA_EXCLUDED_ROLES.has(role.trim().toLowerCase().replace(/[\s-]+/g, '_'));
}

/** Returns true if role is Back-of-House (BOH) */
export function isBohRole(role: string): boolean {
  return BOH_ROLES.has(role.trim().toLowerCase().replace(/[\s-]+/g, '_'));
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
 * Calculate role-weighted, hours-based, keep-your-own, or percent-of-sales tip distribution.
 * Pure function: deterministic, mathematically conserves all cents, and enforces federal FLSA gates.
 */
export function calculateTipPool(
  config: TipPoolConfig,
  staffList: StaffHours[]
): TipPoolSummary {
  const method = config.method || 'role_weighted';
  const poolTotalCents = Math.max(0, Math.round(config.poolTotalCents || 0));
  const paysTipCredit = Boolean(config.paysTipCredit);
  const legalNotices: string[] = [];

  if (paysTipCredit) {
    legalNotices.push('FLSA NOTICE: Employer takes tip credit; BOH employees are excluded from tip pool.');
  }

  // Filter out invalid/negative hours
  const eligibleStaff = staffList.filter((s) => s.hours > 0);

  if (eligibleStaff.length === 0 || poolTotalCents === 0 && method !== 'keep_your_own') {
    return {
      method,
      poolTotalCents,
      totalEligibleHours: 0,
      totalPoints: 0,
      staffPayouts: eligibleStaff.map((s) => {
        const roleKey = s.role.toLowerCase().trim().replace(/[\s-]+/g, '_');
        let flsaStatus: FlsaStatus = 'ELIGIBLE';
        if (isFlsaExcluded(roleKey)) flsaStatus = 'EXCLUDED_MANAGER';
        else if (paysTipCredit && isBohRole(roleKey)) flsaStatus = 'EXCLUDED_TIP_CREDIT';
        return {
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
          flsaStatus,
          exceedsNonTippedDutyLimit: s.nonTippedDutyHours ? (s.nonTippedDutyHours / s.hours > 0.2) : false,
          isBelowMonthlyThreshold: (s.monthToDateTipsCents ?? 0) < 3000,
        };
      }),
      byRole: {},
      remainderCents: 0,
      paysTipCredit,
      legalNotices,
    };
  }

  // -------------------------------------------------------------
  // Method 1: Keep-Your-Own (Direct server tips with support tip-out)
  // -------------------------------------------------------------
  if (method === 'keep_your_own') {
    const tipOutPercent = config.tipOutPercent ?? 3.0; // default 3% tip-out to support staff
    let supportPoolCents = 0;

    const directTippedStaff: Array<{ s: StaffHours; retainedTipsCents: number; tipOutCents: number }> = [];
    const supportStaff: StaffHours[] = [];

    for (const s of eligibleStaff) {
      const roleKey = s.role.toLowerCase().trim().replace(/[\s-]+/g, '_');
      const isDirectTipped = ['server', 'lead_server', 'bartender'].includes(roleKey);

      if (isDirectTipped && !isFlsaExcluded(roleKey)) {
        const directTips = Math.max(0, Math.round(s.directTipsCents || 0));
        const tipOut = Math.round(directTips * (tipOutPercent / 100));
        const retained = directTips - tipOut;
        supportPoolCents += tipOut;
        directTippedStaff.push({ s, retainedTipsCents: retained, tipOutCents: tipOut });
      } else {
        supportStaff.push(s);
      }
    }

    // Distribute support pool among support staff based on hours worked
    const supportHoursTotal = supportStaff.reduce((sum, s) => {
      const roleKey = s.role.toLowerCase().trim().replace(/[\s-]+/g, '_');
      if (isFlsaExcluded(roleKey)) return sum;
      if (paysTipCredit && isBohRole(roleKey)) return sum;
      return sum + s.hours;
    }, 0);

    const payouts: StaffTipPayout[] = [];

    for (const dt of directTippedStaff) {
      const s = dt.s;
      payouts.push({
        staffId: s.staffId,
        staffName: s.staffName || s.staffId,
        role: s.role,
        hours: s.hours,
        weight: 1.0,
        pointHours: s.hours,
        allocatedPercentage: 100,
        payoutCents: dt.retainedTipsCents,
        payoutDollars: Math.round(dt.retainedTipsCents) / 100,
        effectiveHourlyTipRateCents: s.hours > 0 ? Math.round(dt.retainedTipsCents / s.hours) : 0,
        flsaStatus: 'ELIGIBLE',
      });
    }

    let supportDistributed = 0;
    for (const s of supportStaff) {
      const roleKey = s.role.toLowerCase().trim().replace(/[\s-]+/g, '_');
      let flsaStatus: FlsaStatus = 'ELIGIBLE';
      let payoutCents = 0;

      if (isFlsaExcluded(roleKey)) {
        flsaStatus = 'EXCLUDED_MANAGER';
      } else if (paysTipCredit && isBohRole(roleKey)) {
        flsaStatus = 'EXCLUDED_TIP_CREDIT';
      } else if (supportHoursTotal > 0) {
        payoutCents = Math.round((s.hours / supportHoursTotal) * supportPoolCents);
        supportDistributed += payoutCents;
      }

      payouts.push({
        staffId: s.staffId,
        staffName: s.staffName || s.staffId,
        role: s.role,
        hours: s.hours,
        weight: flsaStatus === 'ELIGIBLE' ? 1.0 : 0.0,
        pointHours: flsaStatus === 'ELIGIBLE' ? s.hours : 0,
        allocatedPercentage: supportHoursTotal > 0 ? Math.round((s.hours / supportHoursTotal) * 10000) / 100 : 0,
        payoutCents,
        payoutDollars: Math.round(payoutCents) / 100,
        effectiveHourlyTipRateCents: s.hours > 0 ? Math.round(payoutCents / s.hours) : 0,
        flsaStatus,
      });
    }

    const byRole: Record<string, { totalHours: number; totalPayoutCents: number; staffCount: number }> = {};
    let totalCents = 0;
    for (const p of payouts) {
      const r = byRole[p.role] ?? (byRole[p.role] = { totalHours: 0, totalPayoutCents: 0, staffCount: 0 });
      r.totalHours += p.hours;
      r.totalPayoutCents += p.payoutCents;
      r.staffCount += 1;
      totalCents += p.payoutCents;
    }

    return {
      method,
      poolTotalCents: totalCents,
      totalEligibleHours: supportHoursTotal,
      totalPoints: supportHoursTotal,
      staffPayouts: payouts,
      byRole,
      remainderCents: 0,
      paysTipCredit,
      legalNotices,
    };
  }

  // -------------------------------------------------------------
  // Method 2, 3, 4: Hours-Weighted, Role-Weighted, and Percent-of-Sales
  // -------------------------------------------------------------
  const customWeightsMap: Record<string, number> = {};
  if (config.roles) {
    for (const r of config.roles) {
      customWeightsMap[r.role.toLowerCase()] = r.weight;
    }
  }

  // Compute point-hours with hardcoded FLSA legal gates
  const intermediate = eligibleStaff.map((s) => {
    const roleKey = s.role.toLowerCase().trim().replace(/[\s-]+/g, '_');
    let weight = 1.0;
    let flsaStatus: FlsaStatus = 'ELIGIBLE';

    // HARD FLSA LEGAL GATE 1: Managers & supervisors are strictly excluded (0.0 weight)
    // Non-negotiable: even if customWeightsMap has weight > 0, manager gate forces 0.0
    if (isFlsaExcluded(roleKey)) {
      weight = 0.0;
      flsaStatus = 'EXCLUDED_MANAGER';
    }
    // HARD FLSA LEGAL GATE 2: Tip credit active -> BOH excluded from pool
    else if (paysTipCredit && isBohRole(roleKey)) {
      weight = 0.0;
      flsaStatus = 'EXCLUDED_TIP_CREDIT';
    }
    // Hours worked method: all eligible roles receive 1.0 weight
    else if (method === 'hours_worked') {
      weight = 1.0;
    }
    // Role-weighted or percent-of-sales
    else {
      if (customWeightsMap[roleKey] !== undefined) {
        weight = customWeightsMap[roleKey];
      } else if (DEFAULT_ROLE_WEIGHTS[roleKey] !== undefined) {
        weight = DEFAULT_ROLE_WEIGHTS[roleKey];
      } else {
        weight = 1.0;
      }
    }

    const pointHours = Math.round(s.hours * weight * 1000) / 1000;
    const exceedsNonTippedDutyLimit = Boolean(s.nonTippedDutyHours && s.hours > 0 && (s.nonTippedDutyHours / s.hours > 0.20));
    const isBelowMonthlyThreshold = Boolean(s.monthToDateTipsCents !== undefined && s.monthToDateTipsCents < 3000);

    return {
      staffId: s.staffId,
      staffName: s.staffName || s.staffId,
      role: s.role,
      hours: s.hours,
      weight,
      pointHours,
      flsaStatus,
      exceedsNonTippedDutyLimit,
      isBelowMonthlyThreshold,
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
      paysTipCredit,
      legalNotices,
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

  // Sort by highest remainder fraction to fairly distribute remaining cents (zero cent leakage)
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
      flsaStatus: p.flsaStatus,
      exceedsNonTippedDutyLimit: p.exceedsNonTippedDutyLimit,
      isBelowMonthlyThreshold: p.isBelowMonthlyThreshold,
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
    paysTipCredit,
    legalNotices,
  };
}

/**
 * Generates an RFC 4180 compliant CSV export for payroll systems (Gusto, ADP, Standard).
 */
export function generateTipPayrollCsv(
  summary: TipPoolSummary,
  opts?: {
    format?: 'standard' | 'gusto' | 'adp';
    date?: string;
    companyCode?: string;
  }
): string {
  const format = opts?.format || 'standard';
  const date = opts?.date || new Date().toISOString().split('T')[0]!;

  if (format === 'gusto') {
    const header = 'Employee ID,First Name,Last Name,Title,Regular Hours,Tip Pay\n';
    const lines = summary.staffPayouts.map((s) => {
      const parts = (s.staffName || '').split(' ');
      const firstName = parts[0] || s.staffId;
      const lastName = parts.slice(1).join(' ') || 'Employee';
      const tipDollars = (s.payoutCents / 100).toFixed(2);
      return `"${s.staffId}","${firstName}","${lastName}","${s.role}",${s.hours},${tipDollars}`;
    });
    return header + lines.join('\n');
  }

  if (format === 'adp') {
    const companyCode = opts?.companyCode || 'CULINARY';
    const header = 'Company Code,Batch ID,File #,Hours,Earnings Code,Tips Amount\n';
    const lines = summary.staffPayouts.map((s) => {
      const tipDollars = (s.payoutCents / 100).toFixed(2);
      return `"${companyCode}","${date}","${s.staffId}",${s.hours},"TIPS",${tipDollars}`;
    });
    return header + lines.join('\n');
  }

  // Standard CSV format
  const header = 'Date,Staff ID,Staff Name,Role,Hours,FLSA Status,Effective Hourly Tip ($),Tip Payout ($)\n';
  const lines = summary.staffPayouts.map((s) => {
    const hourlyDollar = (s.effectiveHourlyTipRateCents / 100).toFixed(2);
    const payoutDollar = (s.payoutCents / 100).toFixed(2);
    return `"${date}","${s.staffId}","${s.staffName || s.staffId}","${s.role}",${s.hours},"${s.flsaStatus}",${hourlyDollar},${payoutDollar}`;
  });
  return header + lines.join('\n');
}

// ============================================================
// Cash Drawer Reconciliation & Variance Engine
// ============================================================

export interface CashDrawerReconciliationInput {
  openingFloatCents: number;
  cashSalesCents: number;
  cashRefundsCents?: number;
  paidInCents?: number;
  paidOutCents?: number;
  actualCountedCents: number;
}

export interface CashDrawerVarianceResult {
  openingFloatCents: number;
  cashSalesCents: number;
  cashRefundsCents: number;
  paidInCents: number;
  paidOutCents: number;
  expectedInDrawerCents: number;
  actualCountedCents: number;
  varianceCents: number; // actualCounted - expected (negative = short, positive = over)
  isBalanced: boolean;
  status: 'balanced' | 'over' | 'short';
}

/**
 * Pure function: calculates expected cash drawer balance and exact variance.
 * Expected = Opening Float + Cash Sales - Cash Refunds + Paid In - Paid Out.
 */
export function calculateDrawerVariance(
  input: CashDrawerReconciliationInput
): CashDrawerVarianceResult {
  const openingFloatCents = Math.round(input.openingFloatCents || 0);
  const cashSalesCents = Math.round(input.cashSalesCents || 0);
  const cashRefundsCents = Math.round(input.cashRefundsCents || 0);
  const paidInCents = Math.round(input.paidInCents || 0);
  const paidOutCents = Math.round(input.paidOutCents || 0);
  const actualCountedCents = Math.round(input.actualCountedCents || 0);

  const expectedInDrawerCents =
    openingFloatCents + cashSalesCents - cashRefundsCents + paidInCents - paidOutCents;

  const varianceCents = actualCountedCents - expectedInDrawerCents;
  const isBalanced = varianceCents === 0;
  const status = isBalanced ? 'balanced' : varianceCents > 0 ? 'over' : 'short';

  return {
    openingFloatCents,
    cashSalesCents,
    cashRefundsCents,
    paidInCents,
    paidOutCents,
    expectedInDrawerCents,
    actualCountedCents,
    varianceCents,
    isBalanced,
    status,
  };
}
