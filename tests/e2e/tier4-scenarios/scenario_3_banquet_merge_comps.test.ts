// ============================================================
// Tier 4 — Scenario 3: Large Banquet Table Merge, Split Bill & Manager Comps
// Features Exercised: F1.2 (Floor Operations / Merge & Split),
// F3.1 (Manager PIN Gatekeeper), F3.2 (Post-Send Void Auto-Waste),
// F3.3 (Multi-Rate Tax Engine), F3.4 (Role-Weighted Tip Pooling).
// ============================================================

import { describe, expect, it } from 'bun:test';
import { mergeTables, splitOrderBySeats, type TableNode, type FloorOrder } from '../tier1-features/f1_2_floor_map.test.js';
import { hashPin, verifyPin } from '@culinaryos/server/lib/pin';
import { processItemVoid } from '../tier1-features/f3_2_void_auto_waste.test.js';
import { computeMultiRateTax, type TaxRatesConfig } from '../tier1-features/f3_3_multi_rate_tax.test.js';
import { distributeTipPool, type StaffShift } from '../tier1-features/f3_4_tip_pooling.test.js';

describe('Tier 4 — Scenario 3: Large Banquet Table Merge, Split Bill & Comps', () => {
  const managerPinHash = hashPin('5678');
  const taxConfig: TaxRatesConfig = { preparedFoodRatePct: 8.25, alcoholRatePct: 15.00, taxExemptRatePct: 0.00 };

  it('manages 16-guest banquet table merge, split bills, manager comp, and banquet tip pooling', () => {
    // 1. Merge 4 tables into Banquet Table B1
    const t1: TableNode = { id: 't1', tableNumber: '1', section: 'Private', capacity: 4, status: 'occupied' };
    const t2: TableNode = { id: 't2', tableNumber: '2', section: 'Private', capacity: 4, status: 'occupied' };
    const t3: TableNode = { id: 't3', tableNumber: '3', section: 'Private', capacity: 4, status: 'occupied' };
    const t4: TableNode = { id: 't4', tableNumber: '4', section: 'Private', capacity: 4, status: 'occupied' };
    const banquetMaster: TableNode = { id: 'b1', tableNumber: 'BANQUET-1', section: 'Private', capacity: 16, status: 'available' };

    const { updatedTables, mergedOrder } = mergeTables([t1, t2, t3, t4], banquetMaster, []);
    expect(updatedTables.find((t) => t.id === 'b1')?.status).toBe('occupied');

    // 2. Add Seat-Itemized Courses to Banquet Order
    const banquetItems = [
      { id: '1', name: 'Filet Mignon', seatNumber: 1, unitPriceCents: 5500, quantity: 1 },
      { id: '2', name: 'Pinot Noir Bottle', seatNumber: 1, unitPriceCents: 9000, quantity: 1 },
      { id: '3', name: 'Halibut', seatNumber: 2, unitPriceCents: 4500, quantity: 1 },
      { id: '4', name: 'Chardonnay Glass', seatNumber: 2, unitPriceCents: 1800, quantity: 1 },
      { id: '5', name: 'Rack of Lamb (Cooked - Spilled)', seatNumber: 3, unitPriceCents: 6000, quantity: 1 },
    ];
    mergedOrder.items = banquetItems;

    // 3. Manager PIN Authorization for Voiding Spilled Lamb
    const isManagerAuth = verifyPin('5678', managerPinHash);
    expect(isManagerAuth).toBe(true);

    const voidRes = processItemVoid({
      orderId: mergedOrder.id,
      lineItemId: '5',
      itemName: 'Rack of Lamb',
      unitPriceCents: 6000,
      costCents: 2100, // $21.00 food cost loss
      orderStatus: 'sent',
      isCooked: true,
      reasonCode: 'spill',
      managerPinVerified: isManagerAuth,
    });
    expect(voidRes.wasteEventCreated).toBe(true);
    expect(voidRes.wasteDollarLossCents).toBe(2100);

    // Remove voided item from active bill
    mergedOrder.items = mergedOrder.items.filter((i) => i.id !== '5');

    // 4. Split Check by Seat
    const seatSplits = splitOrderBySeats(mergedOrder);
    expect(seatSplits[1].subtotalCents).toBe(5500 + 9000); // Seat 1: $145.00
    expect(seatSplits[2].subtotalCents).toBe(4500 + 1800); // Seat 2: $63.00

    // 5. Compute Taxes on Seat 1 (Food 8.25% vs Alcohol 15%)
    const seat1Tax = computeMultiRateTax([
      { id: '1', name: 'Filet Mignon', category: 'prepared_food', quantity: 1, unitPriceCents: 5500 },
      { id: '2', name: 'Pinot Noir Bottle', category: 'alcohol', quantity: 1, unitPriceCents: 9000 },
    ], taxConfig);

    // Food tax: 5500 * 0.0825 = 454
    // Alcohol tax: 9000 * 0.15 = 1350
    // Total Tax = 1804 ($18.04); Total = 14500 + 1804 = 16304 ($163.04)
    expect(seat1Tax.totalTaxCents).toBe(1804);
    expect(seat1Tax.grandTotalCents).toBe(16304);

    // 6. 20% Gratuity Banquet Pool Distributed Across Banquet Service Crew
    const banquetTipPool = 120000; // $1,200.00 banquet tip
    const banquetCrew: StaffShift[] = [
      { staffId: 'srv-1', name: 'Lead Server', role: 'server', hoursWorked: 8 },
      { staffId: 'srv-2', name: 'Assistant Server', role: 'server', hoursWorked: 8 },
      { staffId: 'bar-1', name: 'Banquet Bartender', role: 'bartender', hoursWorked: 8 },
      { staffId: 'bus-1', name: 'Back Server / Busser', role: 'busser', hoursWorked: 8 },
    ];

    const distribution = distributeTipPool(banquetTipPool, banquetCrew, 'role_weighted', {
      server: 1.0,
      bartender: 0.8,
      busser: 0.5,
      kitchen: 0.2,
    });

    expect(distribution.poolConservationCheck).toBe(true);
    expect(distribution.totalDistributedCents).toBe(120000);
    const lead = distribution.payouts.find((p) => p.staffId === 'srv-1');
    const busser = distribution.payouts.find((p) => p.staffId === 'bus-1');
    expect(lead!.payoutCents).toBeGreaterThan(busser!.payoutCents);
  });
});
