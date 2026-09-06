// ==============================================================================
// Unit Test Suite: Labor Engine Scheduling, Overtime & Shift Swapping (Stage C)
// Verifies:
// 1. Shift duration & cost calculation
// 2. Weekly & daily FLSA overtime audit (1.5x time-and-a-half)
// 3. Manager-gated shift swap authorization
// 4. Labor-as-a-percentage-of-sales calculation
// ==============================================================================

import { describe, it, expect } from 'bun:test';
import {
  shiftHours,
  shiftCost,
  summarizeLabor,
  laborCostPct,
  auditEmployeeOvertime,
  evaluateShiftSwap,
  type Shift,
  type ShiftSwapRequest,
} from '../../packages/labor-engine/src/index.js';

describe('Labor Engine Scheduling & Overtime Optimization', () => {
  it('calculates shift hours and labor cost accurately', () => {
    const shift: Shift = {
      employeeId: 'emp-01',
      role: 'cook',
      startTime: new Date('2026-09-06T10:00:00Z'),
      endTime: new Date('2026-09-06T18:30:00Z'), // 8.5 hours
      hourlyRate: 20.0,
    };

    expect(shiftHours(shift)).toBe(8.5);
    expect(shiftCost(shift)).toBe(170.0);
  });

  it('audits FLSA overtime with 1.5x multiplier for hours over 40', () => {
    const shifts: Shift[] = [
      {
        employeeId: 'emp-01',
        role: 'server',
        startTime: new Date('2026-09-01T10:00:00Z'),
        endTime: new Date('2026-09-01T20:00:00Z'), // 10 hrs (2 daily OT)
        hourlyRate: 15.0,
      },
      {
        employeeId: 'emp-01',
        role: 'server',
        startTime: new Date('2026-09-02T10:00:00Z'),
        endTime: new Date('2026-09-02T20:00:00Z'), // 10 hrs (2 daily OT)
        hourlyRate: 15.0,
      },
      {
        employeeId: 'emp-01',
        role: 'server',
        startTime: new Date('2026-09-03T10:00:00Z'),
        endTime: new Date('2026-09-03T20:00:00Z'), // 10 hrs (2 daily OT)
        hourlyRate: 15.0,
      },
      {
        employeeId: 'emp-01',
        role: 'server',
        startTime: new Date('2026-09-04T10:00:00Z'),
        endTime: new Date('2026-09-04T20:00:00Z'), // 10 hrs (2 daily OT)
        hourlyRate: 15.0,
      },
      {
        employeeId: 'emp-01',
        role: 'server',
        startTime: new Date('2026-09-05T10:00:00Z'),
        endTime: new Date('2026-09-05T15:00:00Z'), // 5 hrs (total 45 hrs)
        hourlyRate: 15.0,
      },
    ];

    const audit = auditEmployeeOvertime({
      employeeId: 'emp-01',
      hourlyRateCents: 1500, // $15.00/hr
      shifts,
    });

    expect(audit.hasOvertime).toBe(true);
    expect(audit.regularHours).toBe(37); // 45 total - 8 daily OT = 37 regular
    expect(audit.overtimeHours).toBe(8);
    // Regular: 37 * 1500 = 55,500 cents ($555.00)
    // Overtime: 8 * 1500 * 1.5 = 18,000 cents ($180.00)
    expect(audit.regularCostCents).toBe(55500);
    expect(audit.overtimeCostCents).toBe(18000);
    expect(audit.totalLaborCostCents).toBe(73500);
  });

  it('enforces manager PIN authorization for shift swaps', () => {
    const swapReq: ShiftSwapRequest = {
      id: 'swap-01',
      tenantId: 'tenant-001',
      fromEmployeeId: 'emp-sarah',
      toEmployeeId: 'emp-alex',
      shiftId: 'shift-friday-dinner',
      requestedAt: new Date().toISOString(),
      status: 'pending_manager_approval',
    };

    // 1. Swap attempt without manager PIN is blocked
    const unauthAttempt = evaluateShiftSwap(swapReq);
    expect(unauthAttempt.success).toBe(false);
    expect(unauthAttempt.error).toContain('Manager PIN authorization required');
    expect(unauthAttempt.updatedRequest.status).toBe('pending_manager_approval');

    // 2. Swap attempt with manager PIN succeeds
    const authAttempt = evaluateShiftSwap(swapReq, '1234', 'Manager Dave');
    expect(authAttempt.success).toBe(true);
    expect(authAttempt.updatedRequest.status).toBe('approved');
    expect(authAttempt.updatedRequest.approvedBy).toBe('Manager Dave');
    expect(authAttempt.updatedRequest.approvedAt).toBeDefined();
  });

  it('calculates labor cost percentage against net sales', () => {
    // $1,200 labor on $4,000 revenue = 30.0%
    expect(laborCostPct(1200, 4000)).toBe(30);
    // Zero revenue edge case
    expect(laborCostPct(500, 0)).toBe(0);
  });
});

