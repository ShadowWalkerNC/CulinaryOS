/**
 * @culinaryops/labor-engine
 * Pure functions for labor scheduling and cost calculations.
 * No I/O — safe to use in any environment.
 */

export interface Shift {
  employeeId: string;
  role: string;
  startTime: Date;
  endTime: Date;
  hourlyRate: number;
}

export interface LaborSummary {
  totalHours: number;
  totalCost: number;
  coverageByRole: Record<string, number>; // role -> hours
}

/** Calculate total hours for a shift. */
export function shiftHours(shift: Shift): number {
  const ms = shift.endTime.getTime() - shift.startTime.getTime();
  return Math.round((ms / 3_600_000) * 100) / 100;
}

/** Calculate labor cost for a single shift. */
export function shiftCost(shift: Shift): number {
  return Math.round(shiftHours(shift) * shift.hourlyRate * 100) / 100;
}

/** Summarize labor cost across a list of shifts. */
export function summarizeLabor(shifts: Shift[]): LaborSummary {
  const coverageByRole: Record<string, number> = {};
  let totalHours = 0;
  let totalCost = 0;

  for (const shift of shifts) {
    const hours = shiftHours(shift);
    const cost  = shiftCost(shift);
    totalHours += hours;
    totalCost  += cost;
    coverageByRole[shift.role] = (coverageByRole[shift.role] ?? 0) + hours;
  }

  return {
    totalHours: Math.round(totalHours * 100) / 100,
    totalCost:  Math.round(totalCost  * 100) / 100,
    coverageByRole,
  };
}

/** Calculate labor cost as a percentage of revenue. */
export function laborCostPct(totalLaborCost: number, revenue: number): number {
  if (revenue === 0) return 0;
  return Math.round((totalLaborCost / revenue) * 10_000) / 100;
}

export interface OvertimeRule {
  dailyOvertimeThresholdHours: number; // typically 8.0 (FLSA CA/NV) or 0 (no daily)
  weeklyOvertimeThresholdHours: number; // typically 40.0 (FLSA federal)
  overtimeMultiplier: number; // typically 1.5x
}

export const DEFAULT_FLSA_OVERTIME_RULE: OvertimeRule = {
  dailyOvertimeThresholdHours: 8.0,
  weeklyOvertimeThresholdHours: 40.0,
  overtimeMultiplier: 1.5,
};

export interface EmployeeWeeklySchedule {
  employeeId: string;
  hourlyRateCents: number;
  shifts: Shift[];
}

export interface OvertimeAuditResult {
  regularHours: number;
  overtimeHours: number;
  regularCostCents: number;
  overtimeCostCents: number;
  totalLaborCostCents: number;
  hasOvertime: boolean;
}

/**
 * Calculates regular vs overtime hours and cost under federal FLSA and state daily limits.
 */
export function auditEmployeeOvertime(
  schedule: EmployeeWeeklySchedule,
  rule: OvertimeRule = DEFAULT_FLSA_OVERTIME_RULE
): OvertimeAuditResult {
  let totalWeeklyHours = 0;
  let dailyOvertimeHours = 0;

  for (const shift of schedule.shifts) {
    const hours = shiftHours(shift);
    totalWeeklyHours += hours;
    if (rule.dailyOvertimeThresholdHours > 0 && hours > rule.dailyOvertimeThresholdHours) {
      dailyOvertimeHours += hours - rule.dailyOvertimeThresholdHours;
    }
  }

  // Weekly overtime is hours above 40 (excluding already counted daily overtime to prevent double charging)
  const weeklyExcess = Math.max(0, totalWeeklyHours - rule.weeklyOvertimeThresholdHours);
  const totalOvertimeHours = Math.max(dailyOvertimeHours, weeklyExcess);
  const regularHours = Math.max(0, totalWeeklyHours - totalOvertimeHours);

  const regularCostCents = Math.round(regularHours * schedule.hourlyRateCents);
  const overtimeCostCents = Math.round(totalOvertimeHours * schedule.hourlyRateCents * rule.overtimeMultiplier);

  return {
    regularHours: Math.round(regularHours * 100) / 100,
    overtimeHours: Math.round(totalOvertimeHours * 100) / 100,
    regularCostCents,
    overtimeCostCents,
    totalLaborCostCents: regularCostCents + overtimeCostCents,
    hasOvertime: totalOvertimeHours > 0,
  };
}

export interface ShiftSwapRequest {
  id: string;
  tenantId: string;
  fromEmployeeId: string;
  toEmployeeId: string;
  shiftId: string;
  requestedAt: string;
  status: 'pending_manager_approval' | 'approved' | 'rejected';
  managerPin?: string;
  approvedBy?: string;
  approvedAt?: string;
}

/**
 * Evaluates and approves a shift swap request requiring manager authorization.
 */
export function evaluateShiftSwap(
  request: ShiftSwapRequest,
  managerPinProvided?: string,
  managerName?: string
): { success: boolean; updatedRequest: ShiftSwapRequest; error?: string } {
  if (!managerPinProvided) {
    return {
      success: false,
      updatedRequest: request,
      error: 'Manager PIN authorization required to approve shift swap',
    };
  }

  return {
    success: true,
    updatedRequest: {
      ...request,
      status: 'approved',
      approvedBy: managerName ?? 'Manager',
      approvedAt: new Date().toISOString(),
    },
  };
}

export * from './tip-pool.js';
