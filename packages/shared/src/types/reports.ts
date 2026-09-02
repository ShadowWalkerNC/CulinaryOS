// ============================================================
// CulinaryOS — Reports, Z-Report, and Accounting Ledger Types
// ============================================================

import type { TaxCalculationResult, TaxCategorySummary } from '../tax.js';

export type ZReportStatus = 'preview' | 'closed';

export interface CategorySalesSummary {
  category: string;
  itemCount: number;
  grossSalesCents: number;
  netSalesCents: number;
  percentageOfSales: number;
}

export interface TenderBreakdown {
  cash: { transactionCount: number; totalCents: number; tipCents: number };
  creditCard: { transactionCount: number; totalCents: number; tipCents: number };
  giftCard: { transactionCount: number; totalCents: number; tipCents: number };
  comp: { transactionCount: number; totalCents: number; tipCents: number };
  totalCollectedCents: number;
  totalTipsCents: number;
}

export interface CashDrawerReconciliation {
  openingFloatCents: number;
  cashSalesCents: number;
  paidInCents: number;
  paidOutCents: number;
  expectedInDrawerCents: number;
  actualCountedCents: number;
  overShortCents: number; // positive = over, negative = short, 0 = exact
  notes?: string;
}

export interface VoidCompSummary {
  voidCount: number;
  voidTotalCents: number;
  voidsByReason: Record<string, { count: number; totalCents: number }>;
  compCount: number;
  compTotalCents: number;
  compsByReason: Record<string, { count: number; totalCents: number }>;
}

export interface TipPoolStaffDistribution {
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

export type TipPoolMethod = 'hours_worked' | 'role_weighted' | 'percentage_split';

export interface TipPoolReportSummary {
  method: TipPoolMethod;
  poolTotalCents: number;
  totalEligibleHours: number;
  staffPayouts: TipPoolStaffDistribution[];
  byRole: Record<string, { totalHours: number; totalPayoutCents: number; staffCount: number }>;
}

export interface ZReport {
  id: string;
  zReportNumber: string; // e.g. "Z-20260901-0001"
  tenantId: string;
  date: string; // YYYY-MM-DD
  shiftId?: string;
  status: ZReportStatus;
  openedAt: string;
  closedAt?: string;
  closedBy?: {
    userId: string;
    displayName: string;
    role: string;
  };
  financials: {
    grossSalesCents: number;
    discountsCompsCents: number;
    voidsTotalCents: number;
    netSalesCents: number;
    taxTotalCents: number;
    totalRevenueCents: number;
    totalOrdersCount: number;
    guestCoverCount: number;
    averageCheckCents: number;
    revenuePerCoverCents: number;
  };
  taxBreakdown: TaxCalculationResult;
  tenderBreakdown: TenderBreakdown;
  cashReconciliation: CashDrawerReconciliation;
  tipPoolSummary: TipPoolReportSummary;
  categorySales: CategorySalesSummary[];
  voidCompSummary: VoidCompSummary;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  tenantId: string;
  timestamp: string;
  managerId: string;
  managerName?: string;
  action: 'post_send_void' | 'item_void' | 'high_comp' | 'drawer_open' | 'z_report_close' | 'table_transfer' | string;
  targetType: 'order' | 'line_item' | 'drawer' | 'report' | 'table' | string;
  targetId?: string;
  reasonCode?: string;
  reasonDescription?: string;
  amountCents?: number;
  notes?: string;
  metadata?: Record<string, any>;
}
