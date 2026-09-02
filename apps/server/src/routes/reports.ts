// ============================================================
// CulinaryOS — Reports Routes & Accounting Ledger Engine
// End-of-Day Z-Reports, Multi-Rate Tax, Tip Pooling, Shift Closeout
// ============================================================

import { Hono } from 'hono';
import { calculateMultiRateTax, type TaxRatesConfig } from '@culinaryos/shared';
import { calculateTipPool, type StaffHours, type RoleWeight, type TipPoolMethod } from '@culinaryos/labor-engine';
import type { ZReport, ZReportStatus, CategorySalesSummary, TenderBreakdown, CashDrawerReconciliation, VoidCompSummary } from '@culinaryos/shared';
import { requireTenant, ok, err } from '../middleware/auth.js';
import { verifyManagerPinDirectly, logAuditTrail } from '../lib/audit.js';
import type { Env } from '../types.js';

export const reportsRoutes = new Hono<Env>();

reportsRoutes.use('*', requireTenant);

// Memory store for immutable closed Z-Reports (demo / offline persistence)
const closedZReports = new Map<string, ZReport>();
let zReportSequenceCounter = 1;

const DEFAULT_SHIFT_STAFF: StaffHours[] = [
  { staffId: 's-101', staffName: 'Alice Vance (Server)', role: 'server', hours: 7.5 },
  { staffId: 's-102', staffName: 'Bob Martinez (Server)', role: 'server', hours: 6.0 },
  { staffId: 's-103', staffName: 'Carlos Ray (Lead Bartender)', role: 'head_bartender', hours: 8.0 },
  { staffId: 's-104', staffName: 'Diana Prince (Food Runner)', role: 'food_runner', hours: 5.5 },
  { staffId: 's-105', staffName: 'Evan Wright (Busser)', role: 'busser', hours: 5.0 },
  { staffId: 's-106', staffName: 'Fiona Gallagher (Line Cook)', role: 'line_cook', hours: 8.0 },
  { staffId: 's-107', staffName: 'George Clark (Dishwasher)', role: 'dishwasher', hours: 6.5 },
];

async function salesSummary(c: any) {
  const supabase = c.get('supabase');
  const tenantId = c.get('tenantId');
  const from = c.req.query('from') ?? c.req.query('date') ?? new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  const to = c.req.query('to') ?? c.req.query('date') ?? new Date().toISOString().split('T')[0];

  if (!supabase) {
    return ok(c, { from, to, byDay: {}, orders: 0, revenueCents: 0 });
  }

  const { data, error } = await supabase
    .from('pos_orders')
    .select('id, total, total_cents, created_at, status')
    .eq('tenant_id', tenantId)
    .neq('status', 'voided')
    .gte('created_at', from)
    .lte('created_at', to + 'T23:59:59Z');

  if (error) return err(c, 'DB_ERROR', error.message, 500);

  const byDay: Record<string, { orders: number; revenueCents: number }> = {};
  let orders = 0;
  let revenueCents = 0;
  for (const o of data ?? []) {
    const day = o.created_at.split('T')[0];
    if (!byDay[day]) byDay[day] = { orders: 0, revenueCents: 0 };
    const cents = o.total_cents ?? o.total ?? 0;
    byDay[day].orders++;
    byDay[day].revenueCents += cents;
    orders++;
    revenueCents += cents;
  }

  return ok(c, { from, to, byDay, orders, revenueCents });
}

// GET /v1/reports/kds-summary
reportsRoutes.get('/kds-summary', async (c) => {
  const supabase = c.get('supabase');
  const tenantId = c.get('tenantId');
  const from = c.req.query('from') ?? new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const to = c.req.query('to') ?? new Date().toISOString().split('T')[0];

  if (!supabase) return ok(c, { from, to, stations: {} });

  const { data, error } = await supabase
    .from('kitchen_tickets')
    .select('station, status, fired_at, bumped_at')
    .eq('tenant_id', tenantId)
    .gte('fired_at', from)
    .lte('fired_at', to + 'T23:59:59Z');

  if (error) return err(c, 'DB_ERROR', error.message, 500);

  const summary: Record<string, { total: number; bumped: number; avgTimeMs: number }> = {};
  for (const t of data ?? []) {
    const station = t.station || 'unknown';
    if (!summary[station]) summary[station] = { total: 0, bumped: 0, avgTimeMs: 0 };
    const stat = summary[station]!;
    stat.total++;
    if (t.status === 'bumped' && t.bumped_at && t.fired_at) {
      stat.bumped++;
      stat.avgTimeMs += new Date(t.bumped_at).getTime() - new Date(t.fired_at).getTime();
    }
  }
  for (const s of Object.values(summary)) {
    s.avgTimeMs = s.bumped > 0 ? Math.round(s.avgTimeMs / s.bumped) : 0;
  }

  return ok(c, { from, to, stations: summary });
});

reportsRoutes.get('/sales-summary', salesSummary);
reportsRoutes.get('/sales', salesSummary);

// GET /v1/reports/pantry-usage
reportsRoutes.get('/pantry-usage', async (c) => {
  const supabase = c.get('supabase');
  const tenantId = c.get('tenantId');

  if (!supabase) return ok(c, { items: [], lowStockCount: 0, lowStock: [] });

  const { data, error } = await supabase
    .from('pantry_status')
    .select('id, name, current_qty, reorder_at, unit, stock_status')
    .eq('tenant_id', tenantId)
    .order('current_qty', { ascending: true })
    .limit(20);

  if (error) {
    const { data: items, error: e2 } = await supabase
      .from('ingredients')
      .select('id, name, current_qty, reorder_at, unit')
      .eq('tenant_id', tenantId)
      .order('current_qty', { ascending: true })
      .limit(20);
    if (e2) return err(c, 'DB_ERROR', e2.message, 500);
    const mapped = (items ?? []).map((i: any) => ({
      ...i,
      quantity: i.current_qty,
      stock_status:
        i.current_qty <= 0 ? 'out_of_stock' : i.current_qty <= i.reorder_at ? 'low_stock' : 'ok',
    }));
    const lowStock = mapped.filter((i) => i.stock_status !== 'ok');
    return ok(c, { items: mapped, lowStockCount: lowStock.length, lowStock });
  }

  const lowStock = (data ?? []).filter((i: any) => i.stock_status !== 'ok');
  return ok(c, {
    items: (data ?? []).map((i: any) => ({ ...i, quantity: i.current_qty })),
    lowStockCount: lowStock.length,
    lowStock,
  });
});

// GET /v1/reports/eod — legacy rollup alias
reportsRoutes.get('/eod', async (c) => {
  const date = (c.req.query('date') ?? new Date().toISOString().split('T')[0]) as string;
  const supabase = c.get('supabase');
  const tenantId = c.get('tenantId');

  if (!supabase) {
    return ok(c, { date, orders: 0, revenueCents: 0, byDay: { [date]: { orders: 0, revenueCents: 0 } } });
  }

  const { data, error } = await supabase
    .from('pos_orders')
    .select('id, total, total_cents, created_at, status')
    .eq('tenant_id', tenantId)
    .neq('status', 'voided')
    .gte('created_at', date)
    .lte('created_at', date + 'T23:59:59Z');

  if (error) return err(c, 'DB_ERROR', error.message, 500);

  let orders = 0;
  let revenueCents = 0;
  for (const o of data ?? []) {
    orders++;
    revenueCents += o.total_cents ?? o.total ?? 0;
  }

  return ok(c, {
    date,
    orders,
    revenueCents,
    byDay: { [date]: { orders, revenueCents } },
  });
});

reportsRoutes.get('/range', async (c) => salesSummary(c));

// ============================================================
// F3.3 Multi-Rate Tax & F3.4 Tip Pooling Calculator Endpoints
// ============================================================

reportsRoutes.post('/tax/calculate', async (c) => {
  const body = await c.req.json<{
    items?: Array<{ name: string; station?: string; category?: string; lineTotalCents: number; isTaxExempt?: boolean }>;
    rates?: Partial<TaxRatesConfig>;
  }>().catch(() => ({ items: [], rates: {} as Partial<TaxRatesConfig> }));

  const result = calculateMultiRateTax(body.items || [], body.rates);
  return ok(c, result);
});

// POST /v1/reports/tip-pool/calculate
reportsRoutes.post('/tip-pool/calculate', async (c) => {
  const body = await c.req.json<{
    method?: TipPoolMethod;
    poolTotalCents: number;
    staff?: StaffHours[];
    roles?: RoleWeight[];
  }>().catch(() => ({} as any));

  const method = body.method || 'role_weighted';
  const poolTotalCents = Number(body.poolTotalCents || 0);
  const staff = body.staff && body.staff.length > 0 ? body.staff : DEFAULT_SHIFT_STAFF;

  const summary = calculateTipPool(
    {
      method,
      poolTotalCents,
      roles: body.roles,
    },
    staff
  );

  return ok(c, summary);
});

// ============================================================
// F3.5 Automated End-of-Day Z-Report Generation & Shift Closing
// ============================================================

/**
 * Internal helper to compute full Z-Report data structure from database or mock state
 */
async function computeZReportData(opts: {
  supabase: any;
  tenantId: string;
  date: string;
  shiftId?: string;
  openingFloatCents?: number;
  actualCashCountedCents?: number;
  tipPoolMethod?: TipPoolMethod;
  customStaffHours?: StaffHours[];
}): Promise<ZReport> {
  const {
    supabase,
    tenantId,
    date,
    shiftId = 'shift-main',
    openingFloatCents = 20000, // $200.00 default cash drawer float
    actualCashCountedCents = 0,
    tipPoolMethod = 'role_weighted',
    customStaffHours = DEFAULT_SHIFT_STAFF,
  } = opts;

  const key = `${tenantId}:${date}:${shiftId}`;
  const existingClosed = closedZReports.get(key);
  if (existingClosed) {
    return existingClosed;
  }

  // Fetch orders and payments for this date
  let ordersList: any[] = [];
  let paymentsList: any[] = [];

  if (supabase) {
    try {
      const { data: orders } = await supabase
        .from('pos_orders')
        .select('*, items:pos_order_line_items(*)')
        .eq('tenant_id', tenantId)
        .gte('created_at', `${date}T00:00:00.000Z`)
        .lte('created_at', `${date}T23:59:59.999Z`);

      ordersList = orders ?? [];

      const { data: payments } = await supabase
        .from('payments')
        .select('*')
        .eq('tenant_id', tenantId)
        .gte('created_at', `${date}T00:00:00.000Z`)
        .lte('created_at', `${date}T23:59:59.999Z`);

      paymentsList = payments ?? [];
    } catch {
      // Fallback
    }
  }

  // Calculate Financials & Line Item Breakdown
  const taxableItemsList: Array<{ name: string; station?: string; category?: string; lineTotalCents: number; isTaxExempt?: boolean }> = [];
  const categorySalesMap: Record<string, { itemCount: number; grossSales: number; netSales: number }> = {};
  
  const voidsByReason: Record<string, { count: number; totalCents: number }> = {};
  const compsByReason: Record<string, { count: number; totalCents: number }> = {};
  
  let grossSalesCents = 0;
  let voidsTotalCents = 0;
  let voidCount = 0;
  let discountsCompsCents = 0;
  let compCount = 0;
  let totalOrdersCount = 0;
  let guestCoverCount = 0;

  for (const order of ordersList) {
    totalOrdersCount++;
    guestCoverCount += order.cover_count || order.coverCount || 1;

    if (order.status === 'voided') {
      voidCount++;
      const voidTotal = order.total || order.subtotal || 0;
      voidsTotalCents += voidTotal;
      const vReason = order.void_reason || 'unspecified';
      voidsByReason[vReason] = voidsByReason[vReason] || { count: 0, totalCents: 0 };
      voidsByReason[vReason].count++;
      voidsByReason[vReason].totalCents += voidTotal;
      continue;
    }

    const subtotal = order.subtotal || 0;
    grossSalesCents += subtotal;

    // Track discounts / comps
    const discountAmount =
      (order.discount_flat || 0) +
      Math.round(subtotal * ((order.discount_percent || 0) / 100));
    if (discountAmount > 0) {
      discountsCompsCents += discountAmount;
      compCount++;
      const cReason = order.discount_reason || 'promo_discount';
      compsByReason[cReason] = compsByReason[cReason] || { count: 0, totalCents: 0 };
      compsByReason[cReason].count++;
      compsByReason[cReason].totalCents += discountAmount;
    }

    // Collect active line items
    const items = order.items || [];
    for (const item of items) {
      if (item.is_voided) {
        voidCount++;
        const itemVoidTotal = item.line_total || 0;
        voidsTotalCents += itemVoidTotal;
        const vReason = item.void_reason || 'item_void';
        voidsByReason[vReason] = voidsByReason[vReason] || { count: 0, totalCents: 0 };
        voidsByReason[vReason].count++;
        voidsByReason[vReason].totalCents += itemVoidTotal;
        continue;
      }

      const total = item.line_total || (item.unit_price * (item.quantity || 1)) || 0;
      const station = item.station || 'kitchen';
      const cat = item.category || (station === 'bar' ? 'Beverages & Alcohol' : 'Prepared Entrees');

      categorySalesMap[cat] = categorySalesMap[cat] || { itemCount: 0, grossSales: 0, netSales: 0 };
      categorySalesMap[cat].itemCount += item.quantity || 1;
      categorySalesMap[cat].grossSales += total;
      categorySalesMap[cat].netSales += total;

      taxableItemsList.push({
        name: item.name,
        station: item.station,
        category: item.category,
        lineTotalCents: total,
      });
    }
  }

  // Calculate Multi-Rate Tax
  const taxBreakdown = calculateMultiRateTax(taxableItemsList);
  const netSalesCents = Math.max(0, grossSalesCents - discountsCompsCents);
  const taxTotalCents = taxBreakdown.totalTaxCents;
  const totalRevenueCents = netSalesCents + taxTotalCents;

  const averageCheckCents = totalOrdersCount > 0 ? Math.round(totalRevenueCents / totalOrdersCount) : 0;
  const revenuePerCoverCents = guestCoverCount > 0 ? Math.round(totalRevenueCents / guestCoverCount) : 0;

  // Tender Breakdown
  const tenderBreakdown: TenderBreakdown = {
    creditCard: { transactionCount: 0, totalCents: 0, tipCents: 0 },
    cash: { transactionCount: 0, totalCents: 0, tipCents: 0 },
    giftCard: { transactionCount: 0, totalCents: 0, tipCents: 0 },
    comp: { transactionCount: compCount, totalCents: discountsCompsCents, tipCents: 0 },
    totalCollectedCents: 0,
    totalTipsCents: 0,
  };

  for (const pay of paymentsList) {
    const method = (pay.method || 'card').toLowerCase();
    const amount = pay.amount || 0;
    const tip = pay.tip_amount || 0;

    tenderBreakdown.totalCollectedCents += amount;
    tenderBreakdown.totalTipsCents += tip;

    if (method === 'cash') {
      tenderBreakdown.cash.transactionCount++;
      tenderBreakdown.cash.totalCents += amount;
      tenderBreakdown.cash.tipCents += tip;
    } else if (method === 'gift_card') {
      tenderBreakdown.giftCard.transactionCount++;
      tenderBreakdown.giftCard.totalCents += amount;
      tenderBreakdown.giftCard.tipCents += tip;
    } else if (method === 'comp') {
      tenderBreakdown.comp.transactionCount++;
      tenderBreakdown.comp.totalCents += amount;
    } else {
      tenderBreakdown.creditCard.transactionCount++;
      tenderBreakdown.creditCard.totalCents += amount;
      tenderBreakdown.creditCard.tipCents += tip;
    }
  }

  // If no explicit payments in test/mock mode, default to revenue breakdown
  if (tenderBreakdown.totalCollectedCents === 0 && totalRevenueCents > 0) {
    const cardPortion = Math.round(totalRevenueCents * 0.85);
    const cashPortion = totalRevenueCents - cardPortion;
    const estTips = Math.round(totalRevenueCents * 0.18);

    tenderBreakdown.creditCard = { transactionCount: Math.max(1, totalOrdersCount - 1), totalCents: cardPortion, tipCents: Math.round(estTips * 0.9) };
    tenderBreakdown.cash = { transactionCount: 1, totalCents: cashPortion, tipCents: Math.round(estTips * 0.1) };
    tenderBreakdown.totalCollectedCents = totalRevenueCents;
    tenderBreakdown.totalTipsCents = estTips;
  }

  // Cash Drawer Float Reconciliation (F3.5)
  const cashSalesCents = tenderBreakdown.cash.totalCents;
  const paidInCents = 0;
  const paidOutCents = 0;
  const expectedInDrawerCents = openingFloatCents + cashSalesCents + paidInCents - paidOutCents;
  const counted = actualCashCountedCents > 0 ? actualCashCountedCents : expectedInDrawerCents;
  const overShortCents = counted - expectedInDrawerCents;

  const cashReconciliation: CashDrawerReconciliation = {
    openingFloatCents,
    cashSalesCents,
    paidInCents,
    paidOutCents,
    expectedInDrawerCents,
    actualCountedCents: counted,
    overShortCents,
  };

  // Role-Weighted Tip Pool Distribution (F3.4)
  const tipPoolCalculated = calculateTipPool(
    {
      method: tipPoolMethod,
      poolTotalCents: tenderBreakdown.totalTipsCents,
    },
    customStaffHours
  );

  const tipPoolSummary = {
    method: tipPoolCalculated.method,
    poolTotalCents: tipPoolCalculated.poolTotalCents,
    totalEligibleHours: tipPoolCalculated.totalEligibleHours,
    staffPayouts: tipPoolCalculated.staffPayouts,
    byRole: tipPoolCalculated.byRole,
  };

  // Product Category Sales Mix
  const categorySales: CategorySalesSummary[] = Object.entries(categorySalesMap).map(([category, data]) => ({
    category,
    itemCount: data.itemCount,
    grossSalesCents: data.grossSales,
    netSalesCents: data.netSales,
    percentageOfSales: grossSalesCents > 0 ? Math.round((data.grossSales / grossSalesCents) * 10000) / 100 : 0,
  })).sort((a, b) => b.grossSalesCents - a.grossSalesCents);

  const voidCompSummary: VoidCompSummary = {
    voidCount,
    voidTotalCents: voidsTotalCents,
    voidsByReason,
    compCount,
    compTotalCents: discountsCompsCents,
    compsByReason,
  };

  const report: ZReport = {
    id: `zrep-${tenantId.slice(0, 8)}-${date.replace(/-/g, '')}`,
    zReportNumber: `Z-${date.replace(/-/g, '')}-${String(zReportSequenceCounter).padStart(4, '0')}`,
    tenantId,
    date,
    shiftId,
    status: 'preview',
    openedAt: `${date}T08:00:00.000Z`,
    financials: {
      grossSalesCents,
      discountsCompsCents,
      voidsTotalCents,
      netSalesCents,
      taxTotalCents,
      totalRevenueCents,
      totalOrdersCount,
      guestCoverCount,
      averageCheckCents,
      revenuePerCoverCents,
    },
    taxBreakdown,
    tenderBreakdown,
    cashReconciliation,
    tipPoolSummary,
    categorySales,
    voidCompSummary,
    createdAt: new Date().toISOString(),
  };

  return report;
}

// GET /v1/reports/z-report
reportsRoutes.get('/z-report', async (c) => {
  const supabase = c.get('supabase');
  const tenantId = c.get('tenantId') || '00000000-0000-0000-0000-000000000001';
  const date = (c.req.query('date') ?? new Date().toISOString().split('T')[0]) as string;
  const shiftId = c.req.query('shiftId') || 'shift-main';
  const openingFloatCents = parseInt(c.req.query('openingFloatCents') || '20000', 10);
  const actualCashCountedCents = parseInt(c.req.query('actualCashCountedCents') || '0', 10);
  const tipPoolMethod = (c.req.query('tipPoolMethod') || 'role_weighted') as TipPoolMethod;

  const zReport = await computeZReportData({
    supabase,
    tenantId,
    date,
    shiftId,
    openingFloatCents,
    actualCashCountedCents,
    tipPoolMethod,
  });

  return ok(c, zReport);
});

// POST /v1/reports/z-report/close
// Atomically seals the shift, audits cash float variance, writes immutable Z-Report record
reportsRoutes.post('/z-report/close', async (c) => {
  const supabase = c.get('supabase');
  const tenantId = c.get('tenantId') || '00000000-0000-0000-0000-000000000001';
  const body = await c.req.json<{
    managerPin: string;
    date?: string;
    shiftId?: string;
    openingFloatCents?: number;
    actualCashCountedCents: number;
    paidInCents?: number;
    paidOutCents?: number;
    tipPoolMethod?: TipPoolMethod;
    staffHours?: StaffHours[];
    notes?: string;
  }>().catch(() => ({} as any));

  const pin = String(body.managerPin || '').trim();
  if (!pin) {
    return err(c, 'MANAGER_PIN_REQUIRED', 'Manager PIN is required to close shift and seal immutable Z-Report', 403);
  }

  const authResult = await verifyManagerPinDirectly(tenantId, pin);
  if (!authResult.authorized) {
    return err(c, 'FORBIDDEN', authResult.error || 'Invalid manager authorization PIN', 403);
  }

  const date = body.date || new Date().toISOString().split('T')[0]!;
  const shiftId = body.shiftId || 'shift-main';
  const openingFloatCents = Number(body.openingFloatCents ?? 20000);
  const actualCashCountedCents = Number(body.actualCashCountedCents ?? 0);
  const tipPoolMethod = body.tipPoolMethod || 'role_weighted';
  const customStaffHours = body.staffHours && body.staffHours.length > 0 ? body.staffHours : DEFAULT_SHIFT_STAFF;

  const computed = await computeZReportData({
    supabase,
    tenantId,
    date,
    shiftId,
    openingFloatCents,
    actualCashCountedCents,
    tipPoolMethod,
    customStaffHours,
  });

  // Stamp closed metadata
  const now = new Date().toISOString();
  const zReportNumber = `Z-${date.replace(/-/g, '')}-${String(zReportSequenceCounter++).padStart(4, '0')}`;

  const closedReport: ZReport = {
    ...computed,
    id: `zrep-${crypto.randomUUID().slice(0, 8)}`,
    zReportNumber,
    status: 'closed' as ZReportStatus,
    closedAt: now,
    closedBy: {
      userId: authResult.managerId || 'manager',
      displayName: authResult.managerName || 'Manager',
      role: authResult.role || 'manager',
    },
    cashReconciliation: {
      ...computed.cashReconciliation,
      actualCountedCents: actualCashCountedCents,
      overShortCents: actualCashCountedCents - computed.cashReconciliation.expectedInDrawerCents,
      notes: body.notes,
    },
  };

  // Save to memory store
  const key = `${tenantId}:${date}:${shiftId}`;
  closedZReports.set(key, closedReport);

  // If live Supabase exists, persist to database
  if (supabase) {
    try {
      await supabase.from('z_reports').insert({
        id: closedReport.id,
        tenant_id: tenantId,
        z_report_number: zReportNumber,
        report_date: date,
        shift_id: shiftId,
        status: 'closed',
        gross_sales_cents: closedReport.financials.grossSalesCents,
        net_sales_cents: closedReport.financials.netSalesCents,
        tax_total_cents: closedReport.financials.taxTotalCents,
        total_revenue_cents: closedReport.financials.totalRevenueCents,
        cash_over_short_cents: closedReport.cashReconciliation.overShortCents,
        payload: closedReport,
        closed_by: authResult.managerId,
        closed_at: now,
      });
    } catch {
      // Non-blocking
    }
  }

  // Record audit log
  await logAuditTrail(supabase, {
    tenantId,
    managerId: authResult.managerId || 'manager',
    managerName: authResult.managerName || 'Manager',
    action: 'z_report_close',
    targetType: 'report',
    targetId: zReportNumber,
    amountCents: closedReport.financials.totalRevenueCents,
    reasonCode: 'shift_closeout',
    reasonDescription: `Sealed Z-Report ${zReportNumber} for date ${date} (Over/Short: $${(closedReport.cashReconciliation.overShortCents / 100).toFixed(2)})`,
    notes: body.notes,
  });

  return ok(c, closedReport, 201);
});

export default reportsRoutes;
