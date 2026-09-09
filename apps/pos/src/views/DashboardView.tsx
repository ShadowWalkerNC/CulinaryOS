import { useState, useRef } from 'react';
import { usePOSStore } from '../lib/store';
import { useCreateOrder, useOpenOrders } from '../lib/queries';
import { createCashDrawerReconciliationJournalEntry } from '@culinaryos/accounting-engine';
import { loadLocalSettings, calculateCumulativeShiftSavings } from '@culinaryos/shared';
import { getMockOrders } from '../lib/mockDb';
import {
  Sparkles,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  X,
  Lock,
  Unlock,
  Store,
  DollarSign,
  ChevronDown,
  Layers,
} from '@culinaryos/ui';

interface ToastNotice {
  id: string;
  title: string;
  description: string;
  type: 'success' | 'warning' | 'error';
  journalRef?: string;
}

export function DashboardView() {
  const {
    employee,
    setEmployee,
    setView,
    setActiveOrder,
    drawerBalance,
    setDrawerBalance,
    dayStatus,
    openDay,
    closeDay,
    activeDrawerId,
    drawers,
    openDrawer,
    closeDrawer,
    setActiveDrawerId,
    updateDrawerBalance,
  } = usePOSStore();

  const { mutate: createOrder } = useCreateOrder();
  const { data: openOrders = [] } = useOpenOrders();

  // Toast Notification State
  const [toast, setToast] = useState<ToastNotice | null>(null);

  // Day Management Modal State
  const [showDayModal, setShowDayModal] = useState(false);
  const [dayFloatInput, setDayFloatInput] = useState('150.00');

  // Multi-Drawer Switching & Management State
  const [showDrawerList, setShowDrawerList] = useState(false);

  // Cash Declaration Modal States
  const [showDeclare, setShowDeclare] = useState(false);
  const [bills1, setBills1] = useState<string>('');
  const [bills5, setBills5] = useState<string>('');
  const [bills10, setBills10] = useState<string>('');
  const [bills20, setBills20] = useState<string>('');

  const num1 = parseInt(bills1 || '0', 10);
  const num5 = parseInt(bills5 || '0', 10);
  const num10 = parseInt(bills10 || '0', 10);
  const num20 = parseInt(bills20 || '0', 10);

  const activeDrawer = drawers.find((d) => d.id === activeDrawerId) || drawers[0];
  const expectedTotal = activeDrawer.currentBalanceCents / 100;
  const declaredTotal = (num1 * 1) + (num5 * 5) + (num10 * 10) + (num20 * 20);
  const discrepancy = declaredTotal - expectedTotal;

  function handleOpenDeclareModal() {
    setBills1('');
    setBills5('');
    setBills10('');
    setBills20('');
    setShowDeclare(true);
  }

  function handleSaveDeclaration() {
    const declaredCents = Math.round(declaredTotal * 100);
    const discrepancyCents = Math.round(discrepancy * 100);
    const zRef = `CASH-DECL-${Date.now()}`;

    // 1. Generate balanced double-entry General Ledger audit journal entry
    const journalEntry = createCashDrawerReconciliationJournalEntry({
      date: new Date().toISOString().split('T')[0],
      referenceNumber: zRef,
      drawerName: activeDrawer.name,
      openingFloatCents: activeDrawer.openingFloatCents,
      expectedCents: activeDrawer.currentBalanceCents,
      declaredCents,
      discrepancyCents,
    });

    // 2. Save shift audit record locally
    try {
      const historyRaw = localStorage.getItem('culinaryos_shift_reconciliations');
      const history = historyRaw ? JSON.parse(historyRaw) : [];
      history.push({
        id: `recon-${Date.now()}`,
        drawerId: activeDrawer.id,
        drawerName: activeDrawer.name,
        employeeName: employee?.name ?? 'Staff',
        employeeRole: employee?.role ?? 'Server',
        declaredCents,
        expectedCents: activeDrawer.currentBalanceCents,
        discrepancyCents,
        journalEntry,
        timestamp: new Date().toISOString(),
      });
      localStorage.setItem('culinaryos_shift_reconciliations', JSON.stringify(history));
    } catch {
      // safe fallback
    }

    // 3. Update store balances
    updateDrawerBalance(activeDrawer.id, declaredCents);
    setDrawerBalance(declaredCents);
    setShowDeclare(false);

    // 4. Trigger clean, styled in-app Toast Notice (no native alert popups!)
    setToast({
      id: `toast-${Date.now()}`,
      title: 'Declaration Reconciled & Logged',
      description: `Drawer is currently $${Math.abs(discrepancy).toFixed(2)} ${discrepancy >= 0 ? 'OVER' : 'SHORT'}. Balanced GL Journal Entry #${journalEntry.reference} recorded to ledger.`,
      type: discrepancy === 0 ? 'success' : 'warning',
      journalRef: journalEntry.reference,
    });
  }

  function handleToggleDay() {
    if (dayStatus === 'open') {
      closeDay(employee?.name || 'Manager');
      setToast({
        id: `toast-${Date.now()}`,
        title: 'Business Day Closed',
        description: 'All drawers locked for end-of-day audit. Nightly reconciliation active.',
        type: 'warning',
      });
      setShowDayModal(false);
    } else {
      const floatCents = Math.round(parseFloat(dayFloatInput || '150') * 100);
      openDay(floatCents, employee?.name || 'Manager');
      setToast({
        id: `toast-${Date.now()}`,
        title: 'Business Day Opened',
        description: `Active business day initialized with $${(floatCents / 100).toFixed(2)} float across primary stations.`,
        type: 'success',
      });
      setShowDayModal(false);
    }
  }

  function startQuickOrder() {
    createOrder(
      { table_number: undefined, cover_count: 1, server_name: employee?.name ?? 'Server' },
      { onSuccess: (o: any) => { setActiveOrder(o.id); setView('menu'); } }
    );
  }

  return (
    <div className="flex h-full bg-[#f8f9fa] p-6 gap-6 animate-fadeIn relative">
      {/* Top Floating Toast Notification */}
      {toast && (
        <div className="fixed top-5 right-6 z-50 animate-slideIn flex items-start gap-3 bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-slate-700 max-w-md">
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 space-y-1">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-100">{toast.title}</h4>
            <p className="text-xs text-slate-300 font-medium leading-relaxed">{toast.description}</p>
            {toast.journalRef && (
              <span className="inline-block text-[10px] font-mono font-bold bg-slate-800 text-orange-300 px-2 py-0.5 rounded border border-slate-700">
                GL Ref: #{toast.journalRef}
              </span>
            )}
          </div>
          <button
            onClick={() => setToast(null)}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Left Sidebar: Session Info & Multi-Drawer Management */}
      <div className="w-80 bg-white border border-[#e5e7eb] rounded-2xl p-5 flex flex-col justify-between shadow-sm shrink-0">
        <div className="space-y-4">
          {/* Employee & Day Status Banner */}
          <div className="border-b border-[#e5e7eb] pb-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[#6b7280] font-black uppercase tracking-wider block">Staff & Station</span>
              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                dayStatus === 'open' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${dayStatus === 'open' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                <span>Day {dayStatus}</span>
              </span>
            </div>
            <h2 className="text-base font-black text-[#1f2937] mt-1">{employee?.name}</h2>
            <div className="flex items-center justify-between text-xs text-[#0f172a] font-bold mt-0.5">
              <span>{employee?.role}</span>
              <span className="font-mono text-slate-500 text-[11px] font-semibold">{employee?.clockedInAt}</span>
            </div>
          </div>

          {/* Active Drawer Selector Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider flex items-center gap-1">
                <Layers className="w-3 h-3 text-slate-600" />
                <span>Active Cash Drawer</span>
              </span>
              <button
                onClick={() => setShowDrawerList(!showDrawerList)}
                className="text-[10px] font-black uppercase text-blue-600 hover:text-blue-800 transition flex items-center gap-0.5"
              >
                <span>Switch</span>
                <ChevronDown className="w-3 h-3" />
              </button>
            </div>
            <div>
              <div className="text-xs font-black text-slate-900 truncate">{activeDrawer.name}</div>
              <div className="flex justify-between items-center text-[11px] text-slate-500 mt-0.5">
                <span>Expected Total</span>
                <span className="font-mono font-bold text-slate-900">${expectedTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Quick Drawer Switch Dropdown */}
            {showDrawerList && (
              <div className="pt-2 border-t border-slate-200 space-y-1.5">
                {drawers.map((dr) => (
                  <button
                    key={dr.id}
                    onClick={() => {
                      setActiveDrawerId(dr.id);
                      setShowDrawerList(false);
                    }}
                    className={`w-full text-left p-2 rounded-lg text-xs flex items-center justify-between transition ${
                      dr.id === activeDrawerId
                        ? 'bg-slate-900 text-white font-bold'
                        : 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-200'
                    }`}
                  >
                    <div>
                      <div className="font-bold">{dr.name}</div>
                      <div className={`text-[10px] ${dr.id === activeDrawerId ? 'text-slate-300' : 'text-slate-500'}`}>
                        {dr.status.toUpperCase()} • Float ${(dr.openingFloatCents / 100).toFixed(2)}
                      </div>
                    </div>
                    <span className="font-mono font-bold">${(dr.currentBalanceCents / 100).toFixed(2)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Real-Time Processing Fees Saved Ticker (Square/Toast Killer) */}
          {(() => {
            const settings = loadLocalSettings();
            const pricingConfig = settings.pricingProgram;
            const completedOrders = getMockOrders().filter((o: any) => o.status === 'paid');
            const savings = calculateCumulativeShiftSavings({
              orders: completedOrders.map((o: any) => ({
                totalCents: o.total || 0,
                paymentMethod: o.payment_method || 'card',
              })),
              config: pricingConfig,
            });

            return (
              <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border border-emerald-500/30 rounded-xl p-3.5 space-y-1.5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-emerald-600 animate-pulse" />
                    <span>Fees Kept Today</span>
                  </span>
                  <span className="text-[9px] font-mono font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-200">
                    vs Square (2.9%)
                  </span>
                </div>
                <div className="text-2xl font-black font-mono text-emerald-700">
                  ${(savings.totalSavedCents / 100).toFixed(2)}
                </div>
                <p className="text-[10px] text-emerald-900/80 font-medium leading-tight">
                  100% of ticket revenue retained via Dual Pricing & cash discount flow.
                </p>
              </div>
            );
          })()}
        </div>

        {/* Action Controls: Declare Drawer + Manager Day Controls */}
        <div className="space-y-2 pt-4 border-t border-[#e5e7eb]">
          <button
            onClick={handleOpenDeclareModal}
            className="w-full bg-[#f3f4f6] hover:bg-[#e5e7eb] text-[#1f2937] font-bold py-2.5 rounded-xl text-xs uppercase transition-colors border border-[#e5e7eb] flex items-center justify-center gap-1.5"
          >
            <DollarSign className="w-3.5 h-3.5 text-slate-700" />
            <span>Declare Cash Drawer</span>
          </button>

          <button
            onClick={() => setShowDayModal(true)}
            className={`w-full font-bold py-2.5 rounded-xl text-xs uppercase transition-colors border flex items-center justify-center gap-1.5 ${
              dayStatus === 'open'
                ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300'
                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            <span>{dayStatus === 'open' ? 'Manager: Close Day' : 'Manager: Open Day'}</span>
          </button>

          <button
            onClick={() => setEmployee(null)}
            className="w-full bg-red-50 hover:bg-red-100 text-red-600 font-bold py-2.5 rounded-xl text-xs uppercase transition-colors flex items-center justify-center gap-1.5"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Lock Screen</span>
          </button>
        </div>
      </div>

      {/* Right Area: Mode Selection Grid */}
      <div className="flex-1 flex flex-col justify-between">
        <div className="grid grid-cols-2 gap-5 flex-1">
          {/* Quick Order */}
          <button onClick={startQuickOrder}
            className="bg-white hover:border-orange-500/60 border-2 border-slate-200/90 rounded-2xl p-6 text-left flex flex-col justify-between transition-all shadow-md hover:shadow-xl active:scale-[0.98] group bg-gradient-to-br from-white via-white to-orange-50/20">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-orange-600 bg-orange-50 border border-orange-200 px-2.5 py-0.5 rounded-md uppercase tracking-wider">
                  Quick Service
                </span>
                <span className="material-symbols-outlined text-slate-400 group-hover:text-orange-500 transition-colors">
                  bolt
                </span>
              </div>
              <h3 className="text-xl font-black text-slate-900 group-hover:text-orange-600 transition-colors">Quick Order</h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">Start an instant counter ticket or takeaway check without dining table assignments.</p>
            </div>
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-black text-slate-900 uppercase tracking-wider group-hover:text-orange-600">
              <span>Start Counter Ticket</span>
              <span className="font-mono">→</span>
            </div>
          </button>

          {/* Table Service */}
          <button onClick={() => setView('tables')}
            className="bg-white hover:border-blue-500/60 border-2 border-slate-200/90 rounded-2xl p-6 text-left flex flex-col justify-between transition-all shadow-md hover:shadow-xl active:scale-[0.98] group bg-gradient-to-br from-white via-white to-blue-50/20">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-blue-600 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-md uppercase tracking-wider">
                  FOH Dining Floor
                </span>
                <span className="material-symbols-outlined text-slate-400 group-hover:text-blue-500 transition-colors">
                  table_restaurant
                </span>
              </div>
              <h3 className="text-xl font-black text-slate-900 group-hover:text-blue-600 transition-colors">Table Service</h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">Manage restaurant dining tables, active covers, multi-seat coursing, and real-time floor status.</p>
            </div>
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-black text-slate-900 uppercase tracking-wider group-hover:text-blue-600">
              <span>Open 2D/3D Floor Map</span>
              <span className="font-mono">→</span>
            </div>
          </button>

          {/* Bar Tabs */}
          <button onClick={() => setView('tabs')}
            className="bg-white hover:border-purple-500/60 border-2 border-slate-200/90 rounded-2xl p-6 text-left flex flex-col justify-between transition-all shadow-md hover:shadow-xl active:scale-[0.98] group bg-gradient-to-br from-white via-white to-purple-50/20">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-purple-600 bg-purple-50 border border-purple-200 px-2.5 py-0.5 rounded-md uppercase tracking-wider">
                  Pub & Lounge
                </span>
                <span className="material-symbols-outlined text-slate-400 group-hover:text-purple-500 transition-colors">
                  local_bar
                </span>
              </div>
              <h3 className="text-xl font-black text-slate-900 group-hover:text-purple-600 transition-colors">Bar Tabs</h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">List active bar cards, pre-authorize checkout limits, and manage open guest tabs.</p>
            </div>
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-black text-slate-900 uppercase tracking-wider group-hover:text-purple-600">
              <span>Manage Bar Tabs</span>
              <span className="font-mono">→</span>
            </div>
          </button>

          {/* Recall Checks */}
          <button onClick={() => setView('recall')}
            className="bg-white hover:border-slate-500/60 border-2 border-slate-200/90 rounded-2xl p-6 text-left flex flex-col justify-between transition-all shadow-md hover:shadow-xl active:scale-[0.98] group bg-gradient-to-br from-white via-white to-slate-50/30">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-md uppercase tracking-wider">
                  Audit History
                </span>
                <span className="material-symbols-outlined text-slate-400 group-hover:text-slate-600 transition-colors">
                  history
                </span>
              </div>
              <h3 className="text-xl font-black text-slate-900 group-hover:text-slate-700 transition-colors">Recall Checks</h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">Retrieve previously closed checks, handle partial refunds, or reprint thermal guest receipts.</p>
            </div>
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-black text-slate-900 uppercase tracking-wider group-hover:text-slate-700">
              <span>Search Shift History</span>
              <span className="font-mono">→</span>
            </div>
          </button>
        </div>

        {/* Bottom Setup & Reports Bar */}
        <div className="mt-5 flex gap-4">
          <button onClick={() => setView('settings')}
            className="flex-1 bg-white hover:bg-slate-50 border-2 border-slate-200 rounded-xl py-3.5 text-xs font-black uppercase tracking-wider text-slate-800 hover:border-slate-900 text-center transition-all shadow-xs flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-slate-600">settings</span>
            <span>Device Setup (Stripe / Thermal Printers)</span>
          </button>
          <button onClick={() => setView('reports')}
            className="flex-1 bg-white hover:bg-slate-50 border-2 border-slate-200 rounded-xl py-3.5 text-xs font-black uppercase tracking-wider text-slate-800 hover:border-slate-900 text-center transition-all shadow-xs flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-slate-600">bar_chart</span>
            <span>Business Reports & Shift PM Mix</span>
          </button>
        </div>
      </div>

      {/* Cash Drawer Declaration Modal Overlay */}
      {showDeclare && (
        <div className="absolute inset-0 bg-[#00000060] backdrop-blur-xs flex items-center justify-center p-6 z-50 animate-fadeIn">
          <div className="bg-white border-2 border-slate-200 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-5">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3.5">
              <div>
                <span className="text-[10px] text-orange-600 font-black tracking-wider uppercase block">Auditing & Double-Entry GL</span>
                <h3 className="text-lg font-black text-slate-900 mt-0.5 uppercase">Declare Cash Drawer</h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Physical bill count for <strong className="text-slate-800">{activeDrawer.name}</strong></p>
              </div>
              <button
                onClick={() => setShowDeclare(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Bill Inputs list with auto-select on click and zero placeholder */}
            <div className="space-y-3 bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
              <div className="flex justify-between items-center text-xs">
                <div>
                  <span className="font-extrabold text-slate-800 block">$1.00 Singles</span>
                  <span className="text-[10px] text-slate-400">Total: ${(num1 * 1).toFixed(2)}</span>
                </div>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={bills1}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setBills1(e.target.value.replace(/^0+(?=\d)/, ''))}
                  className="w-24 bg-white border-2 border-slate-200 focus:border-slate-900 rounded-xl py-2 px-3 text-center font-mono font-black text-sm text-slate-900 outline-hidden transition shadow-2xs"
                />
              </div>

              <div className="flex justify-between items-center text-xs">
                <div>
                  <span className="font-extrabold text-slate-800 block">$5.00 Fives</span>
                  <span className="text-[10px] text-slate-400">Total: ${(num5 * 5).toFixed(2)}</span>
                </div>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={bills5}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setBills5(e.target.value.replace(/^0+(?=\d)/, ''))}
                  className="w-24 bg-white border-2 border-slate-200 focus:border-slate-900 rounded-xl py-2 px-3 text-center font-mono font-black text-sm text-slate-900 outline-hidden transition shadow-2xs"
                />
              </div>

              <div className="flex justify-between items-center text-xs">
                <div>
                  <span className="font-extrabold text-slate-800 block">$10.00 Tens</span>
                  <span className="text-[10px] text-slate-400">Total: ${(num10 * 10).toFixed(2)}</span>
                </div>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={bills10}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setBills10(e.target.value.replace(/^0+(?=\d)/, ''))}
                  className="w-24 bg-white border-2 border-slate-200 focus:border-slate-900 rounded-xl py-2 px-3 text-center font-mono font-black text-sm text-slate-900 outline-hidden transition shadow-2xs"
                />
              </div>

              <div className="flex justify-between items-center text-xs">
                <div>
                  <span className="font-extrabold text-slate-800 block">$20.00 Twenties</span>
                  <span className="text-[10px] text-slate-400">Total: ${(num20 * 20).toFixed(2)}</span>
                </div>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={bills20}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setBills20(e.target.value.replace(/^0+(?=\d)/, ''))}
                  className="w-24 bg-white border-2 border-slate-200 focus:border-slate-900 rounded-xl py-2 px-3 text-center font-mono font-black text-sm text-slate-900 outline-hidden transition shadow-2xs"
                />
              </div>
            </div>

            {/* Reconciliation summary */}
            <div className="space-y-2 text-xs bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
              <div className="flex justify-between text-slate-500">
                <span>Declared Cash Total</span>
                <span className="font-mono text-slate-900 font-extrabold text-sm">${declaredTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Expected Drawer Total</span>
                <span className="font-mono text-slate-700 font-semibold text-sm">${expectedTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2 items-center">
                <span className="font-black text-slate-900 uppercase">Audit Variance</span>
                <span
                  className={`font-mono font-extrabold text-sm px-2.5 py-0.5 rounded-md border ${
                    discrepancy === 0
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : discrepancy > 0
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}
                >
                  {discrepancy === 0 ? 'Balanced ($0.00)' : `${discrepancy > 0 ? 'OVER' : 'SHORT'} $${Math.abs(discrepancy).toFixed(2)}`}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setShowDeclare(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl py-3 text-xs font-black uppercase transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveDeclaration}
                className="flex-1 bg-slate-900 hover:bg-black active:scale-[0.98] text-white rounded-xl py-3 text-xs font-black uppercase tracking-wider shadow-md transition"
              >
                Save Audit & Log GL
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manager Open / Close Day Modal */}
      {showDayModal && (
        <div className="absolute inset-0 bg-[#00000060] backdrop-blur-xs flex items-center justify-center p-6 z-50 animate-fadeIn">
          <div className="bg-white border-2 border-slate-200 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-5">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3.5">
              <div>
                <span className="text-[10px] text-slate-500 font-black tracking-wider uppercase block">Manager Shift Administration</span>
                <h3 className="text-lg font-black text-slate-900 mt-0.5 uppercase">
                  {dayStatus === 'open' ? 'Close Business Day' : 'Open Business Day'}
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Control daily register opening floats and station locking.</p>
              </div>
              <button
                onClick={() => setShowDayModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {dayStatus === 'open' ? (
              <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 space-y-1.5">
                  <div className="font-black flex items-center gap-1.5 uppercase">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    <span>Confirm End of Day Closeout</span>
                  </div>
                  <p className="text-amber-800 leading-relaxed font-medium">
                    Closing the day will lock all station drawers, verify outstanding checks, and flag open shift balances for nightly deposit reconciliation.
                  </p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1">
                  <div className="flex justify-between font-bold text-slate-700">
                    <span>Authorized Manager</span>
                    <span className="text-slate-950">{employee?.name}</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-700">
                    <span>Active Stations</span>
                    <span className="text-slate-950">{drawers.length} Terminals</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-xs text-emerald-900 space-y-1.5">
                  <div className="font-black flex items-center gap-1.5 uppercase">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Initialize Opening Shift Floats</span>
                  </div>
                  <p className="text-emerald-800 leading-relaxed font-medium">
                    Opening the business day configures starting cash floats across all configured POS drawers and unlocks order intake.
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-slate-700 block">Starting Float per Drawer ($)</label>
                  <input
                    type="number"
                    step="5.00"
                    min="50.00"
                    value={dayFloatInput}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setDayFloatInput(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-200 focus:border-slate-900 rounded-xl py-2.5 px-3 font-mono font-black text-base text-slate-900 outline-hidden transition"
                  />
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowDayModal(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl py-3 text-xs font-black uppercase transition"
              >
                Cancel
              </button>
              <button
                onClick={handleToggleDay}
                className={`flex-1 rounded-xl py-3 text-xs font-black uppercase tracking-wider text-white shadow-md transition active:scale-[0.98] ${
                  dayStatus === 'open' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {dayStatus === 'open' ? 'Confirm Close Day' : 'Confirm Open Day'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default DashboardView;
