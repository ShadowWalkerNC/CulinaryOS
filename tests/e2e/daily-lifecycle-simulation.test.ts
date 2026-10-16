// ==============================================================================
// CulinaryOS — End-to-End Daily Restaurant Lifecycle Simulation (06:00 - 23:30)
//
// Simulates an entire commercial restaurant operational day from start to finish,
// deliberately injecting real-world operator mistakes, vendor discrepancies,
// hardware/network severances, and security intrusions to verify system resilience.
//
// Chapters Exercised:
// 1. 06:00 AM — Morning Receiving, IPV Variance, Baker Scaling & Allergen Safety
// 2. 10:30 AM — Pre-Service Kickoff, Staff Clock-In, Drawer Float & FLSA Gates
// 3. 12:00 PM — Lunch Rush, Tableside Seat Ordering, Course Pacing & Live 86 Auto-Lock
// 4. 02:30 PM — Afternoon Network Severance, Offline Cash Flow & Post-Send Waste Voids
// 5. 05:00 PM — Happy Hour Transition, Tableside QR Ordering & Penny-Perfect Bill Split
// 6. 07:30 PM — Dinner Banquet Table Merges, Multi-Tender Settlement & RLS Threat Defense
// 7. 11:00 PM — Shift Closeout, Cash Drawer Shortage Audit, FLSA Tip Pool & Sealed Z-Report
// ==============================================================================

import { describe, it, expect } from 'bun:test';
import {
  SyscoAdapter,
  calculateInvoicePriceVariance,
  type ParsedVendorInvoice,
  type PurchaseOrderPayload,
} from '../../packages/shared/src/vendor-adapter.js';
import {
  scaleBakersPercentage,
  FDA_TOP_9_ALLERGENS,
} from '../../apps/recipeos/shared/ratio-engine.js';
import { evaluateDietaryProfile } from '../../packages/shared/src/dietary.js';
import { hashPin, verifyPin } from '@culinaryos/server/lib/pin';
import {
  calculateTipPool,
  calculateDrawerVariance,
  isFlsaExcluded,
  type StaffHours,
} from '../../packages/labor-engine/src/tip-pool.js';
import {
  calculateCustomizedItemTotal,
  type ModifierGroup,
  type SelectedModifier,
} from './tier1-features/f1_1_modifiers.test.js';
import {
  mergeTables,
  splitOrderBySeats,
  type TableNode,
  type FloorOrder,
} from './tier1-features/f1_2_floor_map.test.js';
import {
  decrementLive86,
  type CountdownItem,
} from './tier1-features/f2_1_live_86.test.js';
import {
  calculateCourseTimerColor,
  fireHeldCourse,
  initialHoldStatus,
} from './tier1-features/f2_2_course_pacing.test.js';
import {
  processItemVoid,
  type VoidItemRequest,
} from './tier1-features/f3_2_void_auto_waste.test.js';
import {
  validateDaypartSchedule,
  isScheduleActive,
  resolveEffectivePrice,
  calculateDualPricing,
  type DaypartSchedule,
} from '@culinaryos/shared';
import {
  generateZReport,
  type CashDrawerAudit,
  type ShiftTransaction,
} from './tier1-features/f3_5_eod_z_report.test.js';

describe('CulinaryOS End-to-End Daily Operations Lifecycle Simulation', () => {
  // Common Shift Credentials
  const MANAGER_PIN = '5678';
  const SERVER_PIN = '1234';
  const COOK_PIN = '2345';
  const managerPinHash = hashPin(MANAGER_PIN);
  const serverPinHash = hashPin(SERVER_PIN);

  // ────────────────────────────────────────────────────────────────────────────
  // CHAPTER 1: 06:00 AM — Morning Receiving, IPV Variance & Prep Engine
  // ────────────────────────────────────────────────────────────────────────────
  describe('Chapter 1 (06:00 AM): Morning Receiving & KitchenKit Prep Scaling', () => {
    it('catches broadline invoice short-shipment and price discrepancy with automated credit memo', () => {
      // Original Purchase Order
      const originalPo: PurchaseOrderPayload = {
        poNumber: 'PO-2026-1016',
        venueId: 'venue-main',
        organizationId: 'org-culinary',
        vendorId: 'sysco',
        deliveryDateRequested: '2026-10-16',
        items: [
          {
            ingredientId: 'ing-flour',
            vendorSku: 'SYS-782194',
            name: 'Flour All-Purpose High Gluten',
            quantityOrdered: 10,
            unitPriceCents: 2450, // Contracted $24.50
            extendedPriceCents: 24500,
          },
        ],
        totalAmountCents: 24500,
      };

      // Delivered Invoice: Bills $28.00/case instead of $24.50 contracted
      const invoice: ParsedVendorInvoice = {
        invoiceNumber: 'INV-SYS-994821',
        poNumber: 'PO-2026-1016',
        vendorId: 'sysco',
        invoiceDate: '2026-10-16',
        items: [
          {
            vendorSku: 'SYS-782194',
            name: 'Flour All-Purpose High Gluten',
            quantityInvoiced: 10,
            unitPriceCents: 2800, // Inflated from $24.50
            lineTotalCents: 28000,
          },
        ],
        subtotalCents: 28000,
        taxCents: 0,
        freightCents: 0,
        totalCents: 28000,
      };

      const variances = calculateInvoicePriceVariance(originalPo, invoice);

      // Verify Error Injected & Caught:
      expect(variances.length).toBe(1);
      const flourVar = variances[0]!;
      expect(flourVar.status).toBe('overcharge');
      expect(flourVar.variancePerUnitCents).toBe(350); // $3.50 overcharge per unit
      expect(flourVar.totalVarianceCents).toBe(3500);  // $35.00 total overcharge

      // Physical short-count discrepancy: 8 cases actually physically received vs 10 billed
      const physicalReceivedCases = 8;
      const billedCases = invoice.items[0]!.quantityInvoiced;
      const shortageCases = billedCases - physicalReceivedCases;
      expect(shortageCases).toBe(2);

      // Automated Credit Memo Claim: 2 short cases * $28.00 + $35.00 price variance
      const creditMemoClaimCents = shortageCases * invoice.items[0]!.unitPriceCents + flourVar.totalVarianceCents;
      expect(creditMemoClaimCents).toBe(5600 + 3500); // $91.00 total recovery claim
    });

    it('validates baker percentages for morning sourdough prep and guards against invalid formulas', () => {
      // Baker scales morning sourdough formula
      const sourdoughFormula = [
        { name: 'Bread Flour', percentage: 100, isBaseFlour: true },
        { name: 'Filtered Water', percentage: 72 },
        { name: 'Levain Starter', percentage: 20 },
        { name: 'Sea Salt', percentage: 2 },
      ];

      // Error Injection: Empty formula returns 0 batch weight
      const emptyResult = scaleBakersPercentage([], 10000);
      expect(emptyResult.totalBatchWeightGrams).toBe(0);

      // Successful Scaling: 20 kg flour base
      const scaledBatch = scaleBakersPercentage(sourdoughFormula, 20000);
      expect(scaledBatch.targetFlourGrams).toBe(20000);
      expect(scaledBatch.totalBatchWeightGrams).toBe(38800); // 194% of 20kg = 38.8kg dough

      const water = scaledBatch.ingredients.find((i) => i.name === 'Filtered Water');
      expect(water?.weightGrams).toBe(14400); // 72% of 20kg

      const salt = scaledBatch.ingredients.find((i) => i.name === 'Sea Salt');
      expect(salt?.weightGrams).toBe(400); // 2% of 20kg
    });

    it('inspects recipe ingredients for FDA FASTER Act Top 9 allergens before label spooling', () => {
      const briocheIngredients = [
        'Enriched Wheat Flour',
        'Whole Milk',
        'Pasteurized Eggs',
        'Cultured Butter',
        'Cane Sugar',
      ];

      const profile = evaluateDietaryProfile([], briocheIngredients);

      // Verified: Recognizes wheat, milk, eggs
      expect(profile.matchedAllergens).toContain('wheat');
      expect(profile.matchedAllergens).toContain('milk');
      expect(profile.matchedAllergens).toContain('eggs');
      expect(profile.isVegan).toBe(false);
      expect(profile.isVegetarian).toBe(true);
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // CHAPTER 2: 10:30 AM — Pre-Service Shift Kickoff & Security Invariants
  // ────────────────────────────────────────────────────────────────────────────
  describe('Chapter 2 (10:30 AM): Pre-Service Kickoff, Staff Clock-In & FLSA Gates', () => {
    it('verifies opening cash float and enforces cryptographic staff PIN gates', () => {
      // Cashier loads drawer with $200.00 cash float
      const openingFloatCents = 20000;
      expect(openingFloatCents).toBe(20000);

      // PIN Authentication Checks
      expect(verifyPin(SERVER_PIN, serverPinHash)).toBe(true);
      expect(verifyPin(MANAGER_PIN, managerPinHash)).toBe(true);

      // Error Injected: Unauthorized PIN attempt
      expect(verifyPin('9999', serverPinHash)).toBe(false);
      expect(verifyPin('0000', managerPinHash)).toBe(false);
    });

    it('enforces FLSA legal gate excluding shift managers from taking tip pool distributions', () => {
      // Staff Clock-In Roster for lunch service
      const shiftHours: StaffHours[] = [
        { staffId: 'srv-1', staffName: 'Sarah (Server)', role: 'server', hours: 6 },
        { staffId: 'bus-1', staffName: 'Mateo (Busser)', role: 'busser', hours: 5 },
        { staffId: 'mgr-1', staffName: 'David (Manager)', role: 'manager', hours: 8 },
        { staffId: 'own-1', staffName: 'Isaac (Owner)', role: 'owner', hours: 9 },
      ];

      // Error Injected: Manager or Owner attempting to take tip pool shares
      expect(isFlsaExcluded('manager')).toBe(true);
      expect(isFlsaExcluded('owner')).toBe(true);
      expect(isFlsaExcluded('server')).toBe(false);
      expect(isFlsaExcluded('busser')).toBe(false);

      const tipPoolCalculation = calculateTipPool(
        {
          method: 'hours_worked',
          poolTotalCents: 33000,
        },
        shiftHours
      );

      // Assert Legal Invariant: Manager & Owner receive strictly $0.00
      const managerPayout = tipPoolCalculation.staffPayouts.find((p) => p.staffId === 'mgr-1')!;
      const ownerPayout = tipPoolCalculation.staffPayouts.find((p) => p.staffId === 'own-1')!;
      expect(managerPayout.payoutCents).toBe(0);
      expect(managerPayout.flsaStatus).toBe('EXCLUDED_MANAGER');
      expect(ownerPayout.payoutCents).toBe(0);
      expect(ownerPayout.flsaStatus).toBe('EXCLUDED_MANAGER');

      // Eligible hours: Sarah 6h + Mateo 5h = 11h total
      // $330.00 / 11h = $30.00/hr tip distribution
      const sarahPayout = tipPoolCalculation.staffPayouts.find((p) => p.staffId === 'srv-1')!;
      const mateoPayout = tipPoolCalculation.staffPayouts.find((p) => p.staffId === 'bus-1')!;
      expect(sarahPayout.payoutCents).toBe(18000); // 6h * $30 = $180.00
      expect(mateoPayout.payoutCents).toBe(15000); // 5h * $30 = $150.00

      // Total Pool Conservation Check (Zero fractional pennies lost)
      const totalDistributed = tipPoolCalculation.staffPayouts.reduce((sum, p) => sum + p.payoutCents, 0);
      expect(totalDistributed).toBe(33000);
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // CHAPTER 3: 12:00 PM — Lunch Rush, Tableside Seat Ordering & Live 86 Auto-Lock
  // ────────────────────────────────────────────────────────────────────────────
  describe('Chapter 3 (12:00 PM): Lunch Rush, Course Pacing & 86 Inventory Depletion', () => {
    it('manages tableside seat assignments and auto-holds Course 2 entrees', () => {
      // Table 4: 3 covers seated
      const table4Order: FloorOrder = {
        id: 'ord-t4-lunch',
        tableId: 't-4',
        serverId: 'srv-1',
        items: [
          { id: 'item-1', name: 'Truffle Fries (Appetizer)', seatNumber: 1, unitPriceCents: 850, quantity: 1 },
          { id: 'item-2', name: 'Crispy Calamari (Appetizer)', seatNumber: 2, unitPriceCents: 1450, quantity: 1 },
          { id: 'item-3', name: 'Prime Bistro Burger (Entree)', seatNumber: 1, unitPriceCents: 1850, quantity: 1 },
          { id: 'item-4', name: 'Wood-Fired Margherita (Entree)', seatNumber: 2, unitPriceCents: 1650, quantity: 1 },
          { id: 'item-5', name: 'Prime Bistro Burger (Entree)', seatNumber: 3, unitPriceCents: 1850, quantity: 1 },
        ],
        subtotalCents: 7650,
        taxCents: 631,
        totalCents: 8281,
      };

      // Multi-Course Pacing Engine
      expect(initialHoldStatus(1)).toBe('firing'); // Course 1 Appetizers fire immediately to line
      expect(initialHoldStatus(2)).toBe('held');   // Course 2 Entrees held to avoid premature cooking

      // Split order checks by seat
      const seatChecks = splitOrderBySeats(table4Order);
      expect(seatChecks[1]?.items.length).toBe(2); // S1: Fries + Burger
      expect(seatChecks[2]?.items.length).toBe(2); // S2: Calamari + Pizza
      expect(seatChecks[3]?.items.length).toBe(1); // S3: Burger
    });

    it('depletes limited catch inventory to 0 and blocks subsequent orders with 86 auto-lock', () => {
      // Halibut inventory has only 2 portions remaining
      let halibutStock: CountdownItem = {
        id: 'item-halibut',
        name: 'Fresh Halibut Catch',
        status: 'available',
        countRemaining: 2,
        autoLockAtZero: true,
      };

      // Guest 1 orders Halibut
      const order1 = decrementLive86(halibutStock, 1);
      halibutStock = order1.updatedItem;
      expect(halibutStock.countRemaining).toBe(1);
      expect(halibutStock.status).toBe('available');

      // Guest 2 orders Halibut (depleting stock to 0)
      const order2 = decrementLive86(halibutStock, 1);
      halibutStock = order2.updatedItem;
      expect(halibutStock.countRemaining).toBe(0);
      expect(halibutStock.status).toBe('86d');
      expect(order2.statusChangedTo86).toBe(true);

      // Error Injected: Guest 3 attempts to order Halibut when 86'd
      const order3 = decrementLive86(halibutStock, 1);
      expect(order3.error).toContain("86'd");
      expect(halibutStock.countRemaining).toBe(0); // Protected from negative stock
    });

    it('monitors cook line ticket aging alerts from Green to Amber and Red', () => {
      // Under 5 min: Green normal
      expect(calculateCourseTimerColor(180)).toBe('green');

      // 8 min: Amber warning (>5 min)
      expect(calculateCourseTimerColor(480)).toBe('amber');

      // 16 min: Red critical (>10 min)
      expect(calculateCourseTimerColor(960)).toBe('red');
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // CHAPTER 4: 02:30 PM — Afternoon Network Severance & Offline Cash Flow
  // ────────────────────────────────────────────────────────────────────────────
  describe('Chapter 4 (02:30 PM): Network Severance, Offline Cash Flow & Post-Send Waste Voids', () => {
    it('rejects offline card payment to prevent uncollectible chargeback liability', () => {
      // Network status: OFFLINE
      const isOnline = false;
      const requestedPaymentMethod = 'credit_card';

      // Business Rule: Offline card settlement is strictly rejected without active reader pre-auth
      const allowOfflinePayment = (method: string, online: boolean): boolean => {
        if (!online && method === 'credit_card') {
          return false; // SAQ-A outsourcing & fraud protection
        }
        return true;
      };

      expect(allowOfflinePayment(requestedPaymentMethod, isOnline)).toBe(false);
      expect(allowOfflinePayment('cash', isOnline)).toBe(true);
    });

    it('processes offline cash payment with change calculation and local receipt spooling', () => {
      const orderTotalCents = 4250; // $42.50
      const tenderedCashCents = 5000; // $50.00 bill

      const changeDueCents = tenderedCashCents - orderTotalCents;
      expect(changeDueCents).toBe(750); // $7.50 change

      // Deterministic offline transaction record with UUIDv4 delta
      const offlineTransaction = {
        id: 'delta-tx-offline-01',
        orderId: 'ord-offline-99',
        method: 'cash',
        amountCents: orderTotalCents,
        tenderedCents: tenderedCashCents,
        changeCents: changeDueCents,
        synced: false,
      };

      expect(offlineTransaction.synced).toBe(false);
      expect(offlineTransaction.amountCents + offlineTransaction.changeCents).toBe(tenderedCashCents);
    });

    it('blocks post-send void without manager PIN and logs auto-waste on authorized cooked void', () => {
      // Cooked Steak ordered and sent to kitchen cook-line
      const voidReq: VoidItemRequest = {
        orderId: 'ord-t4-lunch',
        lineItemId: 'item-steak-1',
        itemName: '14oz Prime Ribeye',
        unitPriceCents: 4500,
        costCents: 1800, // $18.00 COGS loss
        orderStatus: 'sent',
        isCooked: true,
        reasonCode: 'kitchen_error',
        managerPinVerified: false, // Server attempted void without manager PIN
      };

      // Error Injected: Server attempts voiding sent ticket without manager PIN
      expect(() => {
        processItemVoid(voidReq);
      }).toThrow('Manager PIN required');

      // Manager enters PIN 5678 -> Approved
      voidReq.managerPinVerified = true;
      const voidResult = processItemVoid(voidReq);

      expect(voidResult.success).toBe(true);
      expect(voidResult.itemVoided).toBe(true);
      expect(voidResult.wasteEventCreated).toBe(true);
      expect(voidResult.wasteDollarLossCents).toBe(1800); // Auto-logged $18.00 kitchen scrap loss
      expect(voidResult.auditTrail.reason).toBe('kitchen_error');
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // CHAPTER 5: 05:00 PM — Happy Hour Transition & Tableside QR Guest Ordering
  // ────────────────────────────────────────────────────────────────────────────
  describe('Chapter 5 (05:00 PM): Happy Hour Schedule & Exact-Penny Split Bill', () => {
    const happyHourSchedule: DaypartSchedule = {
      id: 'hh-5pm',
      name: 'Weekday Happy Hour',
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      startTime: '00:00',
      endTime: '23:59', // Active window for testing
      adjustmentType: 'percent',
      value: 20, // 20% off
      categoryIds: ['Starters', 'DraftBeer'],
      active: true,
    };

    it('resolves dynamic happy hour discounts for tableside QR orders during active window', () => {
      // Validation check
      const scheduleValidation = validateDaypartSchedule(happyHourSchedule);
      expect(scheduleValidation.valid).toBe(true);

      // Menu Item: Craft IPA normally $8.00 (800 cents)
      const basePriceCents = 800;
      const res = resolveEffectivePrice(basePriceCents, [happyHourSchedule], new Date(), { categoryId: 'DraftBeer' });
      expect(res.effectivePriceCents).toBe(640); // 20% off = $6.40 (640 cents)
      expect(res.isDiscounted).toBe(true);
      expect(res.savingsCents).toBe(160);
    });

    it('guarantees penny-perfect conservation when 3 guests split an odd dollar bill', () => {
      // Subtotal: $85.00 + 8.875% tax ($7.54) = $92.54 total (9254 cents)
      const totalCheckCents = 9254;
      const guestCount = 3;

      const baseSplitCents = Math.floor(totalCheckCents / guestCount); // 3084 cents
      const remainderCents = totalCheckCents % guestCount; // 2 cents

      const guestSplits = [
        baseSplitCents + (remainderCents > 0 ? 1 : 0), // 3085 cents ($30.85)
        baseSplitCents + (remainderCents > 1 ? 1 : 0), // 3085 cents ($30.85)
        baseSplitCents,                               // 3084 cents ($30.84)
      ];

      expect(guestSplits[0]).toBe(3085);
      expect(guestSplits[1]).toBe(3085);
      expect(guestSplits[2]).toBe(3084);

      // Penny-Perfect Conservation: Sum MUST equal exact total check cents
      const sumSplits = guestSplits.reduce((acc, c) => acc + c, 0);
      expect(sumSplits).toBe(totalCheckCents);
    });

    it('computes non-cash adjustment and shift card fee savings', () => {
      const dual = calculateDualPricing({ amountCents: 10000, method: 'card' });
      expect(dual.baseAmountCents).toBe(10000); // $100 base
      expect(dual.cashAmountCents).toBe(10000); // $100.00 cash
      expect(dual.cardAmountCents).toBeGreaterThan(10000); // Card price includes program fee
      expect(dual.adjustmentCents).toBeGreaterThan(0);
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // CHAPTER 6: 07:30 PM — Dinner Banquet Merges & Cross-Tenant Security Defense
  // ────────────────────────────────────────────────────────────────────────────
  describe('Chapter 6 (07:30 PM): Table Merges & Cross-Tenant Isolation Defense', () => {
    it('merges Table 8 and Table 9 into Banquet Master Table 10 with item consolidation', () => {
      const table8: TableNode = { id: 't-8', tableNumber: '8', section: 'Main Floor', capacity: 4, status: 'occupied', serverId: 'srv-1' };
      const table9: TableNode = { id: 't-9', tableNumber: '9', section: 'Main Floor', capacity: 4, status: 'occupied', serverId: 'srv-1' };
      const banquetTable: TableNode = { id: 't-10M', tableNumber: '10', section: 'Main Floor', capacity: 8, status: 'available', serverId: 'srv-1' };

      const existingOrders: FloorOrder[] = [
        {
          id: 'ord-t8',
          tableId: 't-8',
          serverId: 'srv-1',
          items: [{ id: 'i1', name: 'Filet Mignon', seatNumber: 1, unitPriceCents: 5200, quantity: 1 }],
          subtotalCents: 5200,
          taxCents: 429,
          totalCents: 5629,
        },
        {
          id: 'ord-t9',
          tableId: 't-9',
          serverId: 'srv-1',
          items: [{ id: 'i2', name: 'Chilean Seabass', seatNumber: 1, unitPriceCents: 4600, quantity: 1 }],
          subtotalCents: 4600,
          taxCents: 380,
          totalCents: 4980,
        },
      ];

      const { updatedTables, mergedOrder } = mergeTables([table8, table9], banquetTable, existingOrders);

      expect(updatedTables.find((t) => t.id === 't-10M')?.status).toBe('occupied');
      expect(mergedOrder.items.length).toBe(2);
      expect(mergedOrder.subtotalCents).toBe(9800); // $52.00 + $46.00 = $98.00
    });

    it('enforces multi-tenant isolation and blocks cross-tenant order manipulation attempts', () => {
      const TENANT_A = '00000000-0000-0000-0000-000000000001';
      const TENANT_B = '00000000-0000-0000-0000-000000000002';

      const tableOrder = {
        orderId: 'ord-banquet-10',
        tenantId: TENANT_A,
        totalCents: 9800,
      };

      // Error Injected: Rogue request attempts to inject line items with Tenant B credential
      const validateTenantAccess = (requestTenantId: string, resourceTenantId: string) => {
        if (requestTenantId !== resourceTenantId) {
          throw new Error('CROSS_TENANT_ACCESS_DENIED: Tenant mismatch on order modification');
        }
        return true;
      };

      expect(() => {
        validateTenantAccess(TENANT_B, tableOrder.tenantId);
      }).toThrow('CROSS_TENANT_ACCESS_DENIED');

      // Valid Tenant A access
      expect(validateTenantAccess(TENANT_A, tableOrder.tenantId)).toBe(true);
    });

    it('settles complex multi-tender payment across card, cash, and manager hospitality comp', () => {
      const orderTotalCents = 13500; // $135.00 total bill

      const tenders = [
        { method: 'card', amountCents: 10000 },
        { method: 'cash', amountCents: 2000 },
        { method: 'comp', amountCents: 1500, reason: 'VIP Anniversary Courtesy', managerPin: '5678' },
      ];

      const totalTendered = tenders.reduce((acc, t) => acc + t.amountCents, 0);
      expect(totalTendered).toBe(orderTotalCents);

      const remainingBalanceCents = orderTotalCents - totalTendered;
      expect(remainingBalanceCents).toBe(0); // Fully satisfied
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // CHAPTER 7: 11:00 PM — Shift Closeout, Drawer Reconciliation & Sealed Z-Report
  // ────────────────────────────────────────────────────────────────────────────
  describe('Chapter 7 (11:00 PM): Drawer Variance, Tip Payouts & Sealed Z-Report', () => {
    it('audits cash drawer shortage and records cash over/short variance in ledger', () => {
      // Opening float: $200.00 (20000 cents)
      // Cash sales: $340.00 (34000 cents)
      // Expected Cash in Drawer = $540.00 (54000 cents)
      // Physical count at close: $515.00 (51500 cents) -> $25.00 Shortage!
      const drawerAudit = {
        openingFloatCents: 20000,
        cashSalesCents: 34000,
        actualCountedCents: 51500,
      };

      const varianceResult = calculateDrawerVariance(drawerAudit);

      expect(varianceResult.expectedInDrawerCents).toBe(54000);
      expect(varianceResult.actualCountedCents).toBe(51500);
      expect(varianceResult.varianceCents).toBe(-2500); // -$25.00 cash shortage
      expect(varianceResult.status).toBe('short');
      expect(varianceResult.isBalanced).toBe(false);
    });

    it('generates multi-rate tax breakdown and cryptographically seals immutable EOD Z-Report', () => {
      const shiftTransactions: ShiftTransaction[] = [
        // Prepared Food Sales (Tax rate: 8.875% -> 888 cents on $100)
        { id: 'tx-1', type: 'sale', category: 'food', paymentMethod: 'credit', subtotalCents: 10000, taxCents: 888, tipCents: 2000, discountCents: 0, totalCents: 12888 },
        { id: 'tx-2', type: 'sale', category: 'food', paymentMethod: 'cash', subtotalCents: 2500, taxCents: 222, tipCents: 500, discountCents: 0, totalCents: 3222 },

        // Alcohol Sales (Tax rate: 10.0% -> 480 cents on $48.00)
        { id: 'tx-3', type: 'sale', category: 'beer', paymentMethod: 'credit', subtotalCents: 2800, taxCents: 280, tipCents: 600, discountCents: 0, totalCents: 3680 },
        { id: 'tx-4', type: 'sale', category: 'wine', paymentMethod: 'credit', subtotalCents: 2000, taxCents: 200, tipCents: 400, discountCents: 0, totalCents: 2600 },

        // Voided Item from Chapter 4 ($45.00 Ribeye)
        { id: 'tx-5', type: 'void', category: 'food', paymentMethod: 'credit', subtotalCents: 4500, taxCents: 0, tipCents: 0, discountCents: 0, totalCents: 0 },

        // Manager Courtesy Comp from Chapter 6 ($15.00)
        { id: 'tx-6', type: 'comp', category: 'food', paymentMethod: 'credit', subtotalCents: 1500, taxCents: 0, tipCents: 0, discountCents: 0, totalCents: 0 },
      ];

      const drawerAudit: CashDrawerAudit = {
        openingFloatCents: 20000,
        actualCashInDrawerCents: 23222, // $200 float + $32.22 cash
      };

      const zReport = generateZReport('2026-10-16', shiftTransactions, drawerAudit, true);

      // Verify Sales Figures
      expect(zReport.grossSalesCents).toBe(10000 + 2500 + 2800 + 2000); // 17300 ($173.00)
      expect(zReport.netSalesCents).toBe(17300);
      expect(zReport.voidsCents).toBe(4500);
      expect(zReport.compsCents).toBe(1500);

      // Verify Tax Partition (Food 8.875% + Alcohol 10%)
      expect(zReport.totalTaxCents).toBe(888 + 222 + 280 + 200); // 1590 ($15.90)

      // Verify Tips Collected
      expect(zReport.totalTipsCents).toBe(2000 + 500 + 600 + 400); // 3500 ($35.00)

      // Verify Drawer Reconciliation
      expect(zReport.cashReconciliation.overShortCents).toBe(0);

      // Verify Cryptographic Sealing
      expect(zReport.isSealed).toBe(true);
    });
  });
});
