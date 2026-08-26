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
