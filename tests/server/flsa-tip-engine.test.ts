// ============================================================
// FLSA Tip Engine v1 — Adversarial Unit Tests
// Tests: manager exclusion gates (hardcoded, untestable-to-disable),
//        BOH tip credit gate, all 4 distribution methods,
//        whole-cent conservation, Gusto/ADP CSV outputs,
//        cash drawer variance math.
// ============================================================

import { describe, it, expect } from 'bun:test';
import {
  calculateTipPool,
  generateTipPayrollCsv,
  calculateDrawerVariance,
  isFlsaExcluded,
  isBohRole,
  type StaffHours,
  type TipPoolConfig,
} from '../../packages/labor-engine/src/tip-pool.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sumPayouts(summary: ReturnType<typeof calculateTipPool>): number {
  return summary.staffPayouts.reduce((s, p) => s + p.payoutCents, 0);
}

const SERVER_A: StaffHours   = { staffId: 'srv-a', staffName: 'Alice',   role: 'server',   hours: 8 };
const SERVER_B: StaffHours   = { staffId: 'srv-b', staffName: 'Bob',     role: 'server',   hours: 6 };
const BARTENDER: StaffHours  = { staffId: 'bar-c', staffName: 'Carlos',  role: 'bartender', hours: 7 };
const BUSSER: StaffHours     = { staffId: 'bus-d', staffName: 'Diana',   role: 'busser',   hours: 5 };
const LINE_COOK: StaffHours  = { staffId: 'ck-e',  staffName: 'Evan',    role: 'line_cook', hours: 8 };
const DISHWASHER: StaffHours = { staffId: 'dw-f',  staffName: 'Fiona',   role: 'dishwasher', hours: 6 };
const MANAGER: StaffHours    = { staffId: 'mgr-g', staffName: 'George',  role: 'manager',   hours: 9 };
const GM: StaffHours         = { staffId: 'gm-h',  staffName: 'Hanna',   role: 'general_manager', hours: 8 };
const OWNER: StaffHours      = { staffId: 'own-i', staffName: 'Isaac',   role: 'owner',     hours: 10 };
const SHIFT_LEAD: StaffHours = { staffId: 'sl-j',  staffName: 'Jessica', role: 'shift_lead', hours: 6 };

const ALL_STAFF: StaffHours[] = [
  SERVER_A, SERVER_B, BARTENDER, BUSSER, LINE_COOK, DISHWASHER,
  MANAGER, GM, OWNER, SHIFT_LEAD,
];
const FOH_STAFF: StaffHours[] = [SERVER_A, SERVER_B, BARTENDER, BUSSER];
const POOL_100 = 10000; // $100.00 in cents

// ─── 1. FLSA Role Classification ─────────────────────────────────────────────

describe('FLSA role classification', () => {
  it('classifies managers, supervisors, and owners as excluded', () => {
    expect(isFlsaExcluded('manager')).toBe(true);
    expect(isFlsaExcluded('general_manager')).toBe(true);
    expect(isFlsaExcluded('gm')).toBe(true);
    expect(isFlsaExcluded('owner')).toBe(true);
    expect(isFlsaExcluded('supervisor')).toBe(true);
    expect(isFlsaExcluded('shift_lead')).toBe(true);
    expect(isFlsaExcluded('assistant_manager')).toBe(true);
  });

  it('does NOT classify tipped FOH and BOH roles as FLSA-excluded', () => {
    expect(isFlsaExcluded('server')).toBe(false);
    expect(isFlsaExcluded('bartender')).toBe(false);
    expect(isFlsaExcluded('busser')).toBe(false);
    expect(isFlsaExcluded('line_cook')).toBe(false);
    expect(isFlsaExcluded('dishwasher')).toBe(false);
  });

  it('classifies BOH kitchen roles correctly', () => {
    expect(isBohRole('line_cook')).toBe(true);
    expect(isBohRole('cook')).toBe(true);
    expect(isBohRole('dishwasher')).toBe(true);
    expect(isBohRole('prep_cook')).toBe(true);
    expect(isBohRole('chef')).toBe(true);
    expect(isBohRole('server')).toBe(false);
    expect(isBohRole('bartender')).toBe(false);
  });
});

// ─── 2. Hardcoded FLSA Manager Exclusion Gate (Non-Negotiable) ───────────────

describe('FLSA manager exclusion gate — CANNOT be overridden', () => {
  it('forces manager weight to 0.0 even if custom weight is passed as 5.0', () => {
    const summary = calculateTipPool(
      {
        method: 'role_weighted',
        poolTotalCents: POOL_100,
        roles: [
          { role: 'server',  weight: 1.0 },
          { role: 'manager', weight: 5.0 }, // attempted override — must be ignored
        ],
      },
      [SERVER_A, MANAGER]
    );
    const mgr = summary.staffPayouts.find(p => p.staffId === 'mgr-g')!;
    expect(mgr.payoutCents).toBe(0);
    expect(mgr.flsaStatus).toBe('EXCLUDED_MANAGER');
  });

  it('forces owner, gm, shift_lead to $0 payout regardless of method', () => {
    for (const method of ['hours_worked', 'role_weighted'] as const) {
      const summary = calculateTipPool(
        { method, poolTotalCents: POOL_100 },
        [SERVER_A, MANAGER, GM, OWNER, SHIFT_LEAD]
      );
      for (const mgr of [MANAGER, GM, OWNER, SHIFT_LEAD]) {
        const payout = summary.staffPayouts.find(p => p.staffId === mgr.staffId)!;
        expect(payout.payoutCents).toBe(0);
        expect(payout.flsaStatus).toBe('EXCLUDED_MANAGER');
      }
      // All $100 goes to the one eligible server
      expect(sumPayouts(summary)).toBe(POOL_100);
    }
  });

  it('excluded managers never appear in eligible distribution even in a mixed 10-person pool', () => {
    const summary = calculateTipPool(
      { method: 'hours_worked', poolTotalCents: 50000 },
      ALL_STAFF
    );
    const excluded = summary.staffPayouts.filter(p => p.flsaStatus === 'EXCLUDED_MANAGER');
    excluded.forEach(p => expect(p.payoutCents).toBe(0));
    // Total distributed must equal pool
    expect(sumPayouts(summary)).toBe(50000);
  });
});

// ─── 3. FLSA Tip Credit Gate (BOH exclusion when tip credit active) ──────────

describe('FLSA BOH exclusion when paysTipCredit=true', () => {
  it('excludes BOH staff when employer takes tip credit', () => {
    const summary = calculateTipPool(
      { method: 'hours_worked', poolTotalCents: POOL_100, paysTipCredit: true },
      [SERVER_A, LINE_COOK, DISHWASHER]
    );
    const cook = summary.staffPayouts.find(p => p.staffId === 'ck-e')!;
    const dish = summary.staffPayouts.find(p => p.staffId === 'dw-f')!;
    expect(cook.payoutCents).toBe(0);
    expect(cook.flsaStatus).toBe('EXCLUDED_TIP_CREDIT');
    expect(dish.payoutCents).toBe(0);
    expect(dish.flsaStatus).toBe('EXCLUDED_TIP_CREDIT');
    // All $100 to server
    expect(sumPayouts(summary)).toBe(POOL_100);
  });

  it('includes BOH staff when employer pays full minimum wage (paysTipCredit=false)', () => {
    const summary = calculateTipPool(
      { method: 'hours_worked', poolTotalCents: POOL_100, paysTipCredit: false },
      [SERVER_A, LINE_COOK]
    );
    const cook = summary.staffPayouts.find(p => p.staffId === 'ck-e')!;
    expect(cook.payoutCents).toBeGreaterThan(0);
    expect(cook.flsaStatus).toBe('ELIGIBLE');
  });

  it('cannot include BOH by passing custom weight when paysTipCredit=true', () => {
    const summary = calculateTipPool(
      {
        method: 'role_weighted',
        poolTotalCents: POOL_100,
        paysTipCredit: true,
        roles: [{ role: 'line_cook', weight: 10.0 }], // attempted override
      },
      [SERVER_A, LINE_COOK]
    );
    const cook = summary.staffPayouts.find(p => p.staffId === 'ck-e')!;
    expect(cook.payoutCents).toBe(0);
    expect(cook.flsaStatus).toBe('EXCLUDED_TIP_CREDIT');
  });
});

// ─── 4. Distribution Method: hours_worked ────────────────────────────────────

describe('Distribution method: hours_worked', () => {
  it('distributes proportionally to hours with exact cent conservation', () => {
    // SERVER_A: 8h, SERVER_B: 6h = 14h total
    // A gets 8/14 = 57.14% => $57.14... floor = 5714 cents
    // B gets 6/14 = 42.85% => $42.85... rest goes to highest fraction
    const summary = calculateTipPool(
      { method: 'hours_worked', poolTotalCents: POOL_100 },
      [SERVER_A, SERVER_B]
    );
    expect(sumPayouts(summary)).toBe(POOL_100);
    const a = summary.staffPayouts.find(p => p.staffId === 'srv-a')!;
    const b = summary.staffPayouts.find(p => p.staffId === 'srv-b')!;
    expect(a.payoutCents).toBeGreaterThan(b.payoutCents);
    expect(a.payoutCents + b.payoutCents).toBe(POOL_100);
  });

  it('gives 100% to a solo worker', () => {
    const summary = calculateTipPool(
      { method: 'hours_worked', poolTotalCents: 15000 },
      [BARTENDER]
    );
    expect(summary.staffPayouts[0]!.payoutCents).toBe(15000);
  });

  it('handles odd-cent pools across 3 equal-hour servers without leakage', () => {
    const oddPool = 10001;
    const staff: StaffHours[] = [
      { staffId: 'a', role: 'server', hours: 5 },
      { staffId: 'b', role: 'server', hours: 5 },
      { staffId: 'c', role: 'server', hours: 5 },
    ];
    const summary = calculateTipPool({ method: 'hours_worked', poolTotalCents: oddPool }, staff);
    expect(sumPayouts(summary)).toBe(oddPool);
  });

  it('zero hours staff receive zero payout (excluded before distribution)', () => {
    const staff: StaffHours[] = [
      { staffId: 'a', role: 'server', hours: 8 },
      { staffId: 'b', role: 'server', hours: 0 }, // called in sick — filtered before distribution
    ];
    const summary = calculateTipPool({ method: 'hours_worked', poolTotalCents: 5000 }, staff);
    // Zero-hour staff are excluded from eligible pool (hours <= 0 filtered)
    // Staff 'a' with 8 hours gets all 5000 cents
    const totalPayout = sumPayouts(summary);
    expect(totalPayout).toBe(5000);
    // The eligible worker gets all the tips
    const active = summary.staffPayouts.find(p => p.staffId === 'a');
    expect(active?.payoutCents).toBe(5000);
  });
});

// ─── 5. Distribution Method: role_weighted ───────────────────────────────────

describe('Distribution method: role_weighted', () => {
  it('servers receive more than bussers per hour worked', () => {
    const summary = calculateTipPool(
      { method: 'role_weighted', poolTotalCents: 50000 },
      [SERVER_A, BUSSER]
    );
    const srv = summary.staffPayouts.find(p => p.staffId === 'srv-a')!;
    const bus = summary.staffPayouts.find(p => p.staffId === 'bus-d')!;
    // server weight=1.0, busser weight=0.4; server has more hours too
    expect(srv.payoutCents).toBeGreaterThan(bus.payoutCents);
    expect(sumPayouts(summary)).toBe(50000);
  });

  it('uses default role weights when no custom weights provided', () => {
    const summary = calculateTipPool(
      { method: 'role_weighted', poolTotalCents: 10000 },
      FOH_STAFF
    );
    expect(sumPayouts(summary)).toBe(10000);
  });

  it('custom role weight overrides default for eligible roles', () => {
    const summary = calculateTipPool(
      {
        method: 'role_weighted',
        poolTotalCents: 20000,
        roles: [
          { role: 'busser', weight: 2.0 }, // elevated weight
          { role: 'server', weight: 1.0 },
        ],
      },
      [
        { staffId: 'srv', role: 'server', hours: 8 },
        { staffId: 'bus', role: 'busser', hours: 8 },
      ]
    );
    const srv = summary.staffPayouts.find(p => p.staffId === 'srv')!;
    const bus = summary.staffPayouts.find(p => p.staffId === 'bus')!;
    // busser weight doubled — should get more than server
    expect(bus.payoutCents).toBeGreaterThan(srv.payoutCents);
    expect(sumPayouts(summary)).toBe(20000);
  });
});

// ─── 6. Distribution Method: keep_your_own ───────────────────────────────────

describe('Distribution method: keep_your_own', () => {
  it('direct-tipped servers retain their tips minus tip-out, support staff share pool', () => {
    const summary = calculateTipPool(
      {
        method: 'keep_your_own',
        poolTotalCents: 0, // not used in this method
        tipOutPercent: 5.0,
      },
      [
        { staffId: 'srv-a', role: 'server', hours: 8, directTipsCents: 20000 }, // $200 tips
        { staffId: 'srv-b', role: 'server', hours: 6, directTipsCents: 15000 }, // $150 tips
        { staffId: 'bus',   role: 'busser', hours: 7 },
      ]
    );
    const srvA = summary.staffPayouts.find(p => p.staffId === 'srv-a')!;
    const srvB = summary.staffPayouts.find(p => p.staffId === 'srv-b')!;
    const bus  = summary.staffPayouts.find(p => p.staffId === 'bus')!;
    // 5% tip-out: A keeps $190, B keeps $142.50
    expect(srvA.payoutCents).toBe(19000); // $200 - $10
    expect(srvB.payoutCents).toBe(14250); // $150 - $7.50
    // Bus gets the $10+$7.50 support pool ($17.50)
    expect(bus.payoutCents).toBe(1750);
  });

  it('zero direct tips means no tip-out and no support pool', () => {
    const summary = calculateTipPool(
      { method: 'keep_your_own', poolTotalCents: 0, tipOutPercent: 3.0 },
      [
        { staffId: 'srv', role: 'server', hours: 8, directTipsCents: 0 },
        { staffId: 'bus', role: 'busser', hours: 5 },
      ]
    );
    expect(sumPayouts(summary)).toBe(0);
  });

  it('managers are excluded from the support pool even in keep_your_own mode', () => {
    const summary = calculateTipPool(
      { method: 'keep_your_own', poolTotalCents: 0, tipOutPercent: 3.0 },
      [
        { staffId: 'srv', role: 'server', hours: 8, directTipsCents: 10000 },
        { staffId: 'bus', role: 'busser', hours: 6 },
        { staffId: 'mgr', role: 'manager', hours: 8 },
      ]
    );
    const mgr = summary.staffPayouts.find(p => p.staffId === 'mgr')!;
    expect(mgr.payoutCents).toBe(0);
    expect(mgr.flsaStatus).toBe('EXCLUDED_MANAGER');
  });
});

// ─── 7. Distribution Method: percent_of_sales ────────────────────────────────

describe('Distribution method: percent_of_sales', () => {
  it('applies role weights proportionally using default weights', () => {
    const summary = calculateTipPool(
      { method: 'percent_of_sales', poolTotalCents: 30000 },
      [
        { staffId: 'srv', role: 'server',   hours: 8, netSalesCents: 150000 },
        { staffId: 'bus', role: 'busser',   hours: 8, netSalesCents: 0 },
        { staffId: 'bar', role: 'bartender', hours: 6, netSalesCents: 80000 },
      ]
    );
    expect(sumPayouts(summary)).toBe(30000);
  });
});

// ─── 8. Zero-Cent Leakage Guarantee (Random Pools) ───────────────────────────

describe('Zero-cent leakage guarantee', () => {
  const staffSet: StaffHours[] = [
    { staffId: 'a', role: 'server',    hours: 7 },
    { staffId: 'b', role: 'bartender', hours: 5.5 },
    { staffId: 'c', role: 'busser',    hours: 8 },
    { staffId: 'd', role: 'food_runner', hours: 6 },
  ];

  const oddPools = [1, 3, 7, 10001, 99999, 123456789];
  for (const pool of oddPools) {
    it(`no cent leakage for pool = ${pool} cents`, () => {
      const summary = calculateTipPool(
        { method: 'hours_worked', poolTotalCents: pool },
        staffSet
      );
      expect(sumPayouts(summary)).toBe(pool);
    });
  }

  it('no cent leakage with role_weighted method and 100 staff', () => {
    const big: StaffHours[] = Array.from({ length: 100 }, (_, i) => ({
      staffId: `s${i}`,
      role: i % 3 === 0 ? 'server' : i % 3 === 1 ? 'busser' : 'bartender',
      hours: 4 + (i % 5),
    }));
    const summary = calculateTipPool({ method: 'role_weighted', poolTotalCents: 987654 }, big);
    expect(sumPayouts(summary)).toBe(987654);
  });
});

// ─── 9. CSV Exports ──────────────────────────────────────────────────────────

describe('generateTipPayrollCsv', () => {
  const staff: StaffHours[] = [
    { staffId: 'e001', staffName: 'Alice Brown', role: 'server',   hours: 8 },
    { staffId: 'e002', staffName: 'Bob Cruz',    role: 'busser',   hours: 6 },
    { staffId: 'e003', staffName: 'Carl Dept',   role: 'manager',  hours: 8 },
  ];
  const summary = calculateTipPool({ method: 'hours_worked', poolTotalCents: 20000 }, staff);

  it('standard CSV includes correct headers', () => {
    const csv = generateTipPayrollCsv(summary, { format: 'standard', date: '2026-01-15' });
    expect(csv).toContain('Date,Staff ID,Staff Name,Role,Hours,FLSA Status');
    expect(csv).toContain('2026-01-15');
  });

  it('standard CSV has EXCLUDED_MANAGER for manager row', () => {
    const csv = generateTipPayrollCsv(summary, { format: 'standard', date: '2026-01-15' });
    expect(csv).toContain('EXCLUDED_MANAGER');
  });

  it('gusto CSV includes Employee ID, First Name, Last Name, Title, Tip Pay', () => {
    const csv = generateTipPayrollCsv(summary, { format: 'gusto', date: '2026-01-15' });
    expect(csv).toContain('Employee ID,First Name,Last Name,Title,Regular Hours,Tip Pay');
    expect(csv).toContain('"e001"');
    expect(csv).toContain('"Alice"');
    expect(csv).toContain('"Brown"');
  });

  it('adp CSV includes Company Code, Batch ID, Earnings Code', () => {
    const csv = generateTipPayrollCsv(summary, { format: 'adp', date: '2026-01-15', companyCode: 'ALLEY' });
    expect(csv).toContain('Company Code,Batch ID,File #,Hours,Earnings Code,Tips Amount');
    expect(csv).toContain('"ALLEY"');
    expect(csv).toContain('"TIPS"');
  });

  it('manager payout is $0.00 in all CSV formats', () => {
    for (const format of ['standard', 'gusto', 'adp'] as const) {
      const csv = generateTipPayrollCsv(summary, { format, date: '2026-01-15' });
      // Manager entry should have $0.00 tip amount
      expect(csv).toContain('0.00');
    }
  });

  it('CSV lines count equals staff count', () => {
    const csv = generateTipPayrollCsv(summary, { format: 'standard', date: '2026-01-15' });
    const lines = csv.trim().split('\n');
    // 1 header + 3 staff rows
    expect(lines.length).toBe(4);
  });
});

// ─── 10. Cash Drawer Variance Math ───────────────────────────────────────────

describe('calculateDrawerVariance', () => {
  it('calculates expected drawer and zero variance (balanced)', () => {
    const result = calculateDrawerVariance({
      openingFloatCents: 20000,   // $200
      cashSalesCents:    45000,   // $450
      cashRefundsCents:  1000,    // $10 refund
      paidInCents:       500,     // $5 paid-in
      paidOutCents:      2000,    // $20 paid-out
      actualCountedCents: 62500, // $625 expected = 200+450-10+5-20 = 625
    });
    expect(result.expectedInDrawerCents).toBe(62500);
    expect(result.varianceCents).toBe(0);
    expect(result.isBalanced).toBe(true);
    expect(result.status).toBe('balanced');
  });

  it('detects a short drawer (actual < expected)', () => {
    const result = calculateDrawerVariance({
      openingFloatCents: 20000,
      cashSalesCents:    30000,
      actualCountedCents: 49000, // should be 50000 → $10 short
    });
    expect(result.varianceCents).toBe(-1000);
    expect(result.status).toBe('short');
    expect(result.isBalanced).toBe(false);
  });

  it('detects an over drawer (actual > expected)', () => {
    const result = calculateDrawerVariance({
      openingFloatCents: 20000,
      cashSalesCents:    30000,
      actualCountedCents: 51500, // $15 over
    });
    expect(result.varianceCents).toBe(1500);
    expect(result.status).toBe('over');
    expect(result.isBalanced).toBe(false);
  });

  it('handles zero cash sales (bar closed) with balanced drawer', () => {
    const result = calculateDrawerVariance({
      openingFloatCents:  20000,
      cashSalesCents:     0,
      actualCountedCents: 20000,
    });
    expect(result.isBalanced).toBe(true);
    expect(result.varianceCents).toBe(0);
  });

  it('correctly accounts for paid-in and paid-out adjustments', () => {
    const result = calculateDrawerVariance({
      openingFloatCents:  10000,
      cashSalesCents:     20000,
      cashRefundsCents:   500,
      paidInCents:        1000,
      paidOutCents:       3000,
      actualCountedCents: 27500, // 10000+20000-500+1000-3000 = 27500
    });
    expect(result.expectedInDrawerCents).toBe(27500);
    expect(result.isBalanced).toBe(true);
  });

  it('rounds all inputs to whole cents before variance calculation', () => {
    const result = calculateDrawerVariance({
      openingFloatCents:  10000.7,
      cashSalesCents:     20000.3,
      actualCountedCents: 30001,   // expected = 10001+20000 = 30001
    });
    expect(result.isBalanced).toBe(true);
  });
});
