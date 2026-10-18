import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { shiftHours, shiftCost, summarizeLabor, laborCostPct, type Shift } from './index.js';

describe('Labor Engine: Shift Costing and Roster Summary', () => {
  it('calculates shift hours and labor cost accurately', () => {
    const shift: Shift = {
      employeeId: 'emp-101',
      role: 'Line Cook',
      startTime: new Date('2026-10-17T08:00:00Z'),
      endTime: new Date('2026-10-17T16:30:00Z'), // 8.5 hours
      hourlyRate: 20.00,
    };

    assert.equal(shiftHours(shift), 8.5);
    assert.equal(shiftCost(shift), 170.00);
  });

  it('summarizes multiple shifts across kitchen roles', () => {
    const shifts: Shift[] = [
      {
        employeeId: 'emp-101',
        role: 'Line Cook',
        startTime: new Date('2026-10-17T08:00:00Z'),
        endTime: new Date('2026-10-17T16:00:00Z'), // 8h * 20 = 160
        hourlyRate: 20.00,
      },
      {
        employeeId: 'emp-102',
        role: 'Dishwasher',
        startTime: new Date('2026-10-17T10:00:00Z'),
        endTime: new Date('2026-10-17T16:00:00Z'), // 6h * 15 = 90
        hourlyRate: 15.00,
      },
    ];

    const summary = summarizeLabor(shifts);

    assert.equal(summary.totalHours, 14);
    assert.equal(summary.totalCost, 250);
    assert.equal(summary.coverageByRole['Line Cook'], 8);
    assert.equal(summary.coverageByRole['Dishwasher'], 6);
  });

  it('calculates labor cost percentage against revenue', () => {
    assert.equal(laborCostPct(250, 1000), 25.0);
    assert.equal(laborCostPct(0, 1000), 0);
    assert.equal(laborCostPct(250, 0), 0);
  });
});
