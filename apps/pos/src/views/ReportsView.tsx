import { useState, useEffect } from 'react';
import { usePOSStore } from '../lib/store';
import { getApiBase, apiHeaders } from '@culinaryos/shared';
import type { ZReport, TipPoolMethod } from '@culinaryos/shared';
import {
  FileText,
  DollarSign,
  TrendingUp,
  ShieldCheck,
  Lock,
  Printer,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Users,
  Coins,
  Receipt,
  Scale,
  X,
} from '@culinaryos/ui';

export function ReportsView() {
  const { setView, tenantId } = usePOSStore();

  const [date, setDate] = useState<string>(() => new Date().toISOString().split('T')[0]!);
  const [openingFloatDollars, setOpeningFloatDollars] = useState<string>('200.00');
  const [countedCashDollars, setCountedCashDollars] = useState<string>('');
  const [tipMethod, setTipMethod] = useState<TipPoolMethod>('role_weighted');
  const [notes, setNotes] = useState<string>('');

  const [zReport, setZReport] = useState<ZReport | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Close shift modal state
  const [showCloseModal, setShowCloseModal] = useState<boolean>(false);
  const [managerPin, setManagerPin] = useState<string>('');
  const [closeError, setCloseError] = useState<string | null>(null);
  const [closing, setClosing] = useState<boolean>(false);
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);

  async function fetchZReport() {
    setLoading(true);
    setError(null);
    try {
      const API = getApiBase();
      const floatCents = Math.round(parseFloat(openingFloatDollars || '0') * 100);
      const countedCents = Math.round(parseFloat(countedCashDollars || '0') * 100);

      const params = new URLSearchParams({
        date,
        openingFloatCents: String(floatCents),
        actualCashCountedCents: String(countedCents),
        tipPoolMethod: tipMethod,
      });

      const res = await fetch(`${API}/v1/reports/z-report?${params.toString()}`, {
        headers: apiHeaders(tenantId),
      });

      if (!res.ok) {
        throw new Error(`Failed to load Z-Report (${res.status})`);
      }

      const body = await res.json();
      setZReport(body.data || body);
    } catch (e: any) {
      setError(e.message || 'Error loading report');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchZReport();
  }, [date, tipMethod]);

  // Recalculate over/short in real-time
  const expectedDrawerCents = zReport?.cashReconciliation?.expectedInDrawerCents ?? 20000;
  const countedCentsInput = parseFloat(countedCashDollars || '0') * 100;
  const liveOverShortCents = isNaN(countedCentsInput) || !countedCashDollars
    ? (zReport?.cashReconciliation?.overShortCents ?? 0)
    : Math.round(countedCentsInput - expectedDrawerCents);

  async function handleCloseShift() {
    if (!managerPin.trim()) {
      setCloseError('Manager PIN is required');
      return;
    }

    setClosing(true);
    setCloseError(null);

    try {
      const API = getApiBase();
      const floatCents = Math.round(parseFloat(openingFloatDollars || '0') * 100);
      const countedCents = countedCashDollars ? Math.round(parseFloat(countedCashDollars) * 100) : expectedDrawerCents;

      const res = await fetch(`${API}/v1/reports/z-report/close`, {
        method: 'POST',
        headers: apiHeaders(tenantId),
        body: JSON.stringify({
          managerPin: managerPin.trim(),
          date,
          openingFloatCents: floatCents,
          actualCashCountedCents: countedCents,
          tipPoolMethod: tipMethod,
          notes,
        }),
      });

      const body = await res.json();
      if (!res.ok) {
        throw new Error(body?.error?.message || 'Shift closing failed');
      }

      setZReport(body.data || body);
      setShowCloseModal(false);
      setShowPrintModal(true);
    } catch (e: any) {
      setCloseError(e.message || 'Failed to seal shift');
    } finally {
      setClosing(false);
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] overflow-y-auto animate-fadeIn p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#e2e8f0]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-[#0f172a] uppercase tracking-wider">
              End-of-Day Z-Report & Accounting Ledger
            </h1>
            {zReport && (
              <span
                className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                  zReport.status === 'closed'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                }`}
              >
                {zReport.status === 'closed' ? `SEALED: ${zReport.zReportNumber}` : 'LIVE PREVIEW'}
              </span>
            )}
          </div>
          <p className="text-xs text-[#64748b]">
            Multi-rate tax reconciliation, cash float audit, role-weighted tip pooling, and immutable closeout.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="bg-white border border-[#cbd5e1] rounded-xl px-3 py-2 text-xs font-mono font-bold text-[#1e293b] shadow-2xs"
          />

          <button
            onClick={fetchZReport}
            className="bg-white hover:bg-slate-100 text-[#0f172a] p-2.5 rounded-xl border border-[#cbd5e1] transition-colors shadow-2xs"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {zReport && (
            <button
              onClick={() => setShowPrintModal(true)}
              className="bg-white hover:bg-slate-100 text-[#0f172a] font-black px-3.5 py-2.5 rounded-xl text-xs uppercase tracking-wider border border-[#cbd5e1] flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <Printer className="w-4 h-4 text-[#475569]" />
              <span>Print Z-Chit</span>
            </button>
          )}

          {zReport?.status !== 'closed' ? (
            <button
              onClick={() => {
                setManagerPin('');
                setCloseError(null);
                setShowCloseModal(true);
              }}
              className="bg-rose-600 hover:bg-rose-700 text-white font-black px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider flex items-center gap-1.5 transition-colors shadow-md active:scale-95"
            >
              <Lock className="w-4 h-4" />
              <span>Close Shift (Z-Report)</span>
            </button>
          ) : (
            <div className="bg-emerald-50 text-emerald-800 font-bold px-3 py-2 rounded-xl text-xs border border-emerald-200 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Shift Closed by {zReport.closedBy?.displayName || 'Manager'}</span>
            </div>
          )}

          <button
            onClick={() => setView('dashboard')}
            className="bg-[#0f172a] hover:bg-[#1e293b] text-white font-black px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider transition-colors shadow-2xs"
          >
            Home
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-24">
          <div className="w-8 h-8 border-4 border-[#0f172a] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error || !zReport ? (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-6 rounded-2xl text-center">
          <p className="font-bold text-sm">Failed to load reports: {error}</p>
          <button
            onClick={fetchZReport}
            className="mt-3 bg-rose-600 text-white px-4 py-2 rounded-xl text-xs font-black uppercase"
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white border border-[#e2e8f0] p-4 rounded-2xl shadow-2xs space-y-1">
              <span className="text-[10px] font-black text-[#64748b] uppercase tracking-wider">Gross Sales</span>
              <p className="text-xl font-mono font-black text-[#0f172a]">
                ${(zReport.financials.grossSalesCents / 100).toFixed(2)}
              </p>
              <p className="text-[10px] text-[#94a3b8]">{zReport.financials.totalOrdersCount} checks processed</p>
            </div>

            <div className="bg-white border border-[#e2e8f0] p-4 rounded-2xl shadow-2xs space-y-1">
              <span className="text-[10px] font-black text-[#64748b] uppercase tracking-wider">Discounts & Comps</span>
              <p className="text-xl font-mono font-black text-rose-600">
                -${(zReport.financials.discountsCompsCents / 100).toFixed(2)}
              </p>
              <p className="text-[10px] text-[#94a3b8]">{zReport.voidCompSummary?.compCount || 0} courtesy comps</p>
            </div>

            <div className="bg-white border border-[#e2e8f0] p-4 rounded-2xl shadow-2xs space-y-1">
              <span className="text-[10px] font-black text-[#64748b] uppercase tracking-wider">Multi-Rate Taxes</span>
              <p className="text-xl font-mono font-black text-amber-700">
                ${(zReport.financials.taxTotalCents / 100).toFixed(2)}
              </p>
              <p className="text-[10px] text-[#94a3b8]">
                Effective: {zReport.taxBreakdown.effectiveTaxRatePercent.toFixed(2)}%
              </p>
            </div>

            <div className="bg-white border border-[#e2e8f0] p-4 rounded-2xl shadow-2xs space-y-1 bg-gradient-to-br from-white to-emerald-50/40">
              <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider">Total Net Revenue</span>
              <p className="text-xl font-mono font-black text-emerald-700">
                ${(zReport.financials.totalRevenueCents / 100).toFixed(2)}
              </p>
              <p className="text-[10px] text-emerald-700 font-medium">
                Avg Check: ${(zReport.financials.averageCheckCents / 100).toFixed(2)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Section 1: Multi-Rate Tax Table (F3.3) */}
            <div className="bg-white border border-[#e2e8f0] rounded-2xl p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#f1f5f9] pb-3">
                <div className="flex items-center gap-2">
                  <Scale className="w-4 h-4 text-[#0f172a]" />
                  <h2 className="text-xs font-black text-[#0f172a] uppercase tracking-wider">
                    Multi-Rate Tax Engine
                  </h2>
                </div>
                <span className="text-[10px] font-bold text-[#64748b]">F3.3 Standard</span>
              </div>

              <div className="space-y-3">
                <div className="bg-[#f8fafc] p-3 rounded-xl border border-[#e2e8f0] space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-bold text-[#1e293b]">Prepared Food & Soft Drinks</p>
                      <p className="text-[10px] text-[#64748b]">Standard prepared food tax (8.25%)</p>
                    </div>
                    <div className="text-right font-mono font-bold">
                      <p className="text-[#0f172a]">
                        ${(zReport.taxBreakdown.breakdown.preparedFood.taxAmountCents / 100).toFixed(2)}
                      </p>
                      <p className="text-[10px] text-[#94a3b8]">
                        on ${(zReport.taxBreakdown.breakdown.preparedFood.taxableSalesCents / 100).toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-[#e2e8f0] pt-2 flex justify-between items-center">
                    <div>
                      <p className="font-bold text-[#1e293b]">Alcoholic Beverages</p>
                      <p className="text-[10px] text-[#64748b]">Bar & spirit excise tax (10.0%)</p>
                    </div>
                    <div className="text-right font-mono font-bold">
                      <p className="text-[#0f172a]">
                        ${(zReport.taxBreakdown.breakdown.alcohol.taxAmountCents / 100).toFixed(2)}
                      </p>
                      <p className="text-[10px] text-[#94a3b8]">
                        on ${(zReport.taxBreakdown.breakdown.alcohol.taxableSalesCents / 100).toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-[#e2e8f0] pt-2 flex justify-between items-center">
                    <div>
                      <p className="font-bold text-[#1e293b]">Tax-Exempt Items</p>
                      <p className="text-[10px] text-[#64748b]">Groceries / raw items (0.0%)</p>
                    </div>
                    <div className="text-right font-mono font-bold">
                      <p className="text-[#0f172a]">$0.00</p>
                      <p className="text-[10px] text-[#94a3b8]">
                        on ${(zReport.taxBreakdown.breakdown.exempt.taxableSalesCents / 100).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-slate-900 text-white rounded-xl flex justify-between items-center text-xs">
                  <span className="font-black uppercase tracking-wider">Total Tax Collected</span>
                  <span className="font-mono font-bold text-sm">
                    ${(zReport.taxBreakdown.totalTaxCents / 100).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Section 2: Cash Drawer Float Audit & Over/Short (F3.5) */}
            <div className="bg-white border border-[#e2e8f0] rounded-2xl p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#f1f5f9] pb-3">
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-amber-600" />
                  <h2 className="text-xs font-black text-[#0f172a] uppercase tracking-wider">
                    Cash Float Audit
                  </h2>
                </div>
                <span className="text-[10px] font-bold text-[#64748b]">F3.5 Reconciliation</span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-black text-[#64748b] uppercase block">Starting Float ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={openingFloatDollars}
                      onChange={(e) => setOpeningFloatDollars(e.target.value)}
                      className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-lg p-2 font-mono font-bold mt-0.5"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-[#64748b] uppercase block">Counted Cash ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder={`e.g. ${(expectedDrawerCents / 100).toFixed(2)}`}
                      value={countedCashDollars}
                      onChange={(e) => setCountedCashDollars(e.target.value)}
                      className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-lg p-2 font-mono font-bold mt-0.5"
                    />
                  </div>
                </div>

                <div className="bg-[#f8fafc] p-3 rounded-xl border border-[#e2e8f0] space-y-2">
                  <div className="flex justify-between text-[#64748b]">
                    <span>Opening Float:</span>
                    <span className="font-mono font-bold text-[#1e293b]">
                      ${(parseFloat(openingFloatDollars || '0')).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-[#64748b]">
                    <span>Cash Sales Collected:</span>
                    <span className="font-mono font-bold text-[#1e293b]">
                      ${(zReport.cashReconciliation.cashSalesCents / 100).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold text-[#0f172a] border-t border-[#e2e8f0] pt-2">
                    <span>Expected In Drawer:</span>
                    <span className="font-mono">${(expectedDrawerCents / 100).toFixed(2)}</span>
                  </div>
                </div>

                {/* Over / Short Badge */}
                <div
                  className={`p-3 rounded-xl border flex items-center justify-between font-bold text-xs ${
                    liveOverShortCents === 0
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : liveOverShortCents > 0
                      ? 'bg-blue-50 border-blue-200 text-blue-800'
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}
                >
                  <span className="uppercase tracking-wider text-[10px]">Over / Short Variance</span>
                  <span className="font-mono text-sm font-black">
                    {liveOverShortCents === 0
                      ? '$0.00 (EXACT)'
                      : liveOverShortCents > 0
                      ? `+$${(liveOverShortCents / 100).toFixed(2)} (OVER)`
                      : `-$${(Math.abs(liveOverShortCents) / 100).toFixed(2)} (SHORT)`}
                  </span>
                </div>
              </div>
            </div>

            {/* Section 3: Payment Tender Breakdown */}
            <div className="bg-white border border-[#e2e8f0] rounded-2xl p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#f1f5f9] pb-3">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  <h2 className="text-xs font-black text-[#0f172a] uppercase tracking-wider">
                    Tender Breakdown
                  </h2>
                </div>
                <span className="text-[10px] font-bold text-[#64748b]">Settlement</span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between p-2 rounded-lg bg-[#f8fafc] border border-[#f1f5f9]">
                  <span className="font-medium text-[#475569]">
                    Credit Cards ({zReport.tenderBreakdown.creditCard.transactionCount})
                  </span>
                  <span className="font-mono font-bold text-[#0f172a]">
                    ${(zReport.tenderBreakdown.creditCard.totalCents / 100).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between p-2 rounded-lg bg-[#f8fafc] border border-[#f1f5f9]">
                  <span className="font-medium text-[#475569]">
                    Cash Drawer ({zReport.tenderBreakdown.cash.transactionCount})
                  </span>
                  <span className="font-mono font-bold text-[#0f172a]">
                    ${(zReport.tenderBreakdown.cash.totalCents / 100).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between p-2 rounded-lg bg-[#f8fafc] border border-[#f1f5f9]">
                  <span className="font-medium text-[#475569]">
                    Courtesy Comps ({zReport.tenderBreakdown.comp.transactionCount})
                  </span>
                  <span className="font-mono font-bold text-rose-600">
                    ${(zReport.tenderBreakdown.comp.totalCents / 100).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between p-2 rounded-lg bg-emerald-50 border border-emerald-200">
                  <span className="font-bold text-emerald-900">Total Tips Collected</span>
                  <span className="font-mono font-black text-emerald-800">
                    ${(zReport.tenderBreakdown.totalTipsCents / 100).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Role-Weighted Tip Pooling Engine (F3.4) */}
          <div className="bg-white border border-[#e2e8f0] rounded-2xl p-5 shadow-2xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#f1f5f9] pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                <div>
                  <h2 className="text-sm font-black text-[#0f172a] uppercase tracking-wider">
                    Role-Weighted Tip Distribution Engine
                  </h2>
                  <p className="text-[10px] text-[#64748b]">
                    Pool Total: ${(zReport.tipPoolSummary.poolTotalCents / 100).toFixed(2)} | Total Shift Hours:{' '}
                    {zReport.tipPoolSummary.totalEligibleHours}h
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 bg-[#f1f5f9] p-1 rounded-xl">
                <button
                  onClick={() => setTipMethod('role_weighted')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all ${
                    tipMethod === 'role_weighted'
                      ? 'bg-white text-[#0f172a] shadow-xs'
                      : 'text-[#64748b] hover:text-[#0f172a]'
                  }`}
                >
                  Role-Weighted (Points)
                </button>
                <button
                  onClick={() => setTipMethod('hours_worked')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all ${
                    tipMethod === 'hours_worked'
                      ? 'bg-white text-[#0f172a] shadow-xs'
                      : 'text-[#64748b] hover:text-[#0f172a]'
                  }`}
                >
                  Hours-Worked Split
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#e2e8f0] text-[#64748b] uppercase tracking-wider text-[10px] font-black">
                    <th className="py-2.5">Staff Member</th>
                    <th className="py-2.5">Role</th>
                    <th className="py-2.5 text-center">Hours</th>
                    <th className="py-2.5 text-center">Weight</th>
                    <th className="py-2.5 text-center">Point-Hours</th>
                    <th className="py-2.5 text-center">Share %</th>
                    <th className="py-2.5 text-right">Tip Payout</th>
                    <th className="py-2.5 text-right">Effective $/hr</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f5f9]">
                  {zReport.tipPoolSummary.staffPayouts.map((sp) => (
                    <tr key={sp.staffId} className="hover:bg-slate-50/50">
                      <td className="py-3 font-semibold text-[#0f172a]">{sp.staffName || sp.staffId}</td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-slate-100 text-slate-700">
                          {sp.role}
                        </span>
                      </td>
                      <td className="py-3 text-center font-mono">{sp.hours}h</td>
                      <td className="py-3 text-center font-mono font-bold text-indigo-600">{sp.weight}x</td>
                      <td className="py-3 text-center font-mono">{sp.pointHours}</td>
                      <td className="py-3 text-center font-mono font-bold">{sp.allocatedPercentage}%</td>
                      <td className="py-3 text-right font-mono font-black text-emerald-700 text-sm">
                        ${(sp.payoutCents / 100).toFixed(2)}
                      </td>
                      <td className="py-3 text-right font-mono text-[#64748b]">
                        ${(sp.effectiveHourlyTipRateCents / 100).toFixed(2)}/h
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 5: Product Mix (PM Mix) & Void Summary Table */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-[#e2e8f0] rounded-2xl p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-[#f1f5f9] pb-3">
                <h2 className="text-xs font-black text-[#0f172a] uppercase tracking-wider">Product Mix Sales</h2>
                <span className="text-[10px] text-[#64748b] font-bold">Category Distribution</span>
              </div>

              <div className="space-y-2 text-xs">
                {zReport.categorySales.length === 0 ? (
                  <p className="text-center py-6 text-[#94a3b8] font-bold">No product sales recorded</p>
                ) : (
                  zReport.categorySales.map((cat, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center p-2.5 rounded-xl bg-[#f8fafc] border border-[#f1f5f9]"
                    >
                      <div>
                        <p className="font-bold text-[#1e293b]">{cat.category}</p>
                        <p className="text-[10px] text-[#64748b]">{cat.itemCount} items sold</p>
                      </div>
                      <div className="text-right font-mono">
                        <p className="font-bold text-[#0f172a]">${(cat.grossSalesCents / 100).toFixed(2)}</p>
                        <p className="text-[10px] text-indigo-600 font-bold">{cat.percentageOfSales}% of sales</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-white border border-[#e2e8f0] rounded-2xl p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-[#f1f5f9] pb-3">
                <h2 className="text-xs font-black text-[#0f172a] uppercase tracking-wider">Void & Comp Ledger</h2>
                <span className="text-[10px] text-[#64748b] font-bold">Manager Overrides</span>
              </div>

              <div className="space-y-2 text-xs">
                {zReport.voidCompSummary.voidCount === 0 && zReport.voidCompSummary.compCount === 0 ? (
                  <p className="text-center py-6 text-emerald-600 font-bold">Clean Shift — Zero Voids or Comps</p>
                ) : (
                  <>
                    {Object.entries(zReport.voidCompSummary.voidsByReason || {}).map(([reason, d], i) => {
                      const data = d as { count: number; totalCents: number };
                      return (
                        <div
                          key={i}
                          className="flex justify-between items-center p-2.5 rounded-xl bg-rose-50/50 border border-rose-100 text-xs"
                        >
                          <div>
                            <p className="font-bold text-rose-900 uppercase text-[10px]">Void: {reason}</p>
                            <p className="text-[10px] text-rose-700">{data?.count ?? 0} incident(s)</p>
                          </div>
                          <span className="font-mono font-black text-rose-700">
                            -${((data?.totalCents ?? 0) / 100).toFixed(2)}
                          </span>
                        </div>
                      );
                    })}
                    {Object.entries(zReport.voidCompSummary.compsByReason || {}).map(([reason, d], i) => {
                      const data = d as { count: number; totalCents: number };
                      return (
                        <div
                          key={i}
                          className="flex justify-between items-center p-2.5 rounded-xl bg-amber-50/50 border border-amber-100 text-xs"
                        >
                          <div>
                            <p className="font-bold text-amber-900 uppercase text-[10px]">Comp: {reason}</p>
                            <p className="text-[10px] text-amber-700">{data?.count ?? 0} courtesy discount(s)</p>
                          </div>
                          <span className="font-mono font-black text-amber-700">
                            -${((data?.totalCents ?? 0) / 100).toFixed(2)}
                          </span>
                        </div>
                      );
                    })}

                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* Shift Closeout Modal (Manager Authorization) */}
      {/* ============================================================ */}
      {showCloseModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white border-2 border-slate-900 rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div className="border-b border-[#e2e8f0] pb-3 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-rose-100 rounded-xl">
                  <Lock className="w-5 h-5 text-rose-700" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-[#0f172a] uppercase">Close & Seal Shift</h3>
                  <p className="text-[10px] text-[#64748b]">Generates immutable Z-Report</p>
                </div>
              </div>
              <button
                onClick={() => setShowCloseModal(false)}
                className="text-xs font-bold text-gray-400 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            {closeError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-2.5 rounded-xl font-bold">
                {closeError}
              </div>
            )}

            <div className="space-y-2 text-xs">
              <div className="bg-[#f8fafc] p-3 rounded-xl border border-[#e2e8f0] space-y-1">
                <div className="flex justify-between">
                  <span>Net Revenue:</span>
                  <span className="font-mono font-bold">${((zReport?.financials.totalRevenueCents ?? 0) / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Expected Cash:</span>
                  <span className="font-mono font-bold">${(expectedDrawerCents / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-indigo-700 font-bold">
                  <span>Tip Pool:</span>
                  <span className="font-mono">${((zReport?.tipPoolSummary.poolTotalCents ?? 0) / 100).toFixed(2)}</span>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-[#475569] uppercase block mb-1">
                  Manager Security PIN (Demo: 5678)
                </label>
                <input
                  type="password"
                  maxLength={8}
                  autoFocus
                  placeholder="Manager PIN"
                  value={managerPin}
                  onChange={(e) => {
                    setManagerPin(e.target.value);
                    setCloseError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCloseShift();
                  }}
                  className="w-full bg-[#f8fafc] border-2 border-[#cbd5e1] focus:border-[#0f172a] rounded-xl p-3 text-center text-base tracking-widest font-mono font-bold"
                />
              </div>

              <div>
                <input
                  type="text"
                  placeholder="Closeout notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-[#f8fafc] border border-[#cbd5e1] rounded-xl p-2 text-xs font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCloseModal(false)}
                className="w-full bg-[#f1f5f9] hover:bg-[#e2e8f0] text-[#334155] font-black rounded-xl py-3 text-xs uppercase"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCloseShift}
                disabled={closing}
                className="w-full bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl py-3 text-xs uppercase tracking-wider shadow-md"
              >
                {closing ? 'Sealing...' : 'Seal & Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* Thermal Z-Report Receipt Chit Preview Modal */}
      {/* ============================================================ */}
      {showPrintModal && zReport && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white border-2 border-slate-900 rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="border-b border-[#e2e8f0] pb-2 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-black text-[#0f172a] uppercase">Thermal Z-Report Chit</h3>
              </div>
              <button
                onClick={() => setShowPrintModal(false)}
                className="text-xs font-bold text-gray-400 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            {/* Thermal Print Preview Stream */}
            <div className="flex-1 overflow-y-auto bg-slate-900 text-emerald-400 p-4 rounded-xl font-mono text-[11px] leading-tight space-y-1">
              <p className="text-center font-bold text-white">END OF DAY Z-REPORT</p>
              <p className="text-center text-white">THE GOLDEN FORK</p>
              <p className="text-center text-slate-400">REPORT NO: {zReport.zReportNumber}</p>
              <p className="text-center text-slate-400">DATE: {zReport.date} | STATUS: {zReport.status.toUpperCase()}</p>
              <p className="text-slate-600">================================</p>
              <p className="text-white font-bold">FINANCIAL RECONCILIATION</p>
              <p className="text-slate-600">--------------------------------</p>
              <div className="flex justify-between"><span>Gross Sales:</span><span>${(zReport.financials.grossSalesCents / 100).toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Comps/Discounts:</span><span>-${(zReport.financials.discountsCompsCents / 100).toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Voids:</span><span>-${(zReport.financials.voidsTotalCents / 100).toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Net Sales:</span><span>${(zReport.financials.netSalesCents / 100).toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Tax Collected:</span><span>${(zReport.financials.taxTotalCents / 100).toFixed(2)}</span></div>
              <div className="flex justify-between font-bold text-white"><span>TOTAL REVENUE:</span><span>${(zReport.financials.totalRevenueCents / 100).toFixed(2)}</span></div>
              <p className="text-slate-600">================================</p>
              <p className="text-white font-bold">TAX BREAKDOWN (MULTI-RATE)</p>
              <div className="flex justify-between"><span>Prep Food (8.25%):</span><span>${(zReport.taxBreakdown.breakdown.preparedFood.taxAmountCents / 100).toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Alcohol (10.0%):</span><span>${(zReport.taxBreakdown.breakdown.alcohol.taxAmountCents / 100).toFixed(2)}</span></div>
              <p className="text-slate-600">================================</p>
              <p className="text-white font-bold">CASH DRAWER AUDIT</p>
              <div className="flex justify-between"><span>Opening Float:</span><span>${(zReport.cashReconciliation.openingFloatCents / 100).toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Cash Collected:</span><span>${(zReport.cashReconciliation.cashSalesCents / 100).toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Expected Cash:</span><span>${(zReport.cashReconciliation.expectedInDrawerCents / 100).toFixed(2)}</span></div>
              <div className="flex justify-between font-bold text-white">
                <span>Over/Short:</span>
                <span>${(zReport.cashReconciliation.overShortCents / 100).toFixed(2)}</span>
              </div>
              <p className="text-slate-600">================================</p>
              <p className="text-center text-[10px] text-slate-400">IMMUTABLE ACCOUNTING LEDGER SEALED</p>
            </div>

            <div className="shrink-0">
              <button
                onClick={() => {
                  window.print();
                  setShowPrintModal(false);
                }}
                className="w-full bg-[#0f172a] hover:bg-[#1e293b] text-white font-black rounded-xl py-3 text-xs uppercase tracking-wider flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" />
                <span>Send to ESC/POS Thermal Printer</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ReportsView;
