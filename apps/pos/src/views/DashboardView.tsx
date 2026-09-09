import { useState, useRef } from 'react';
import { usePOSStore } from '../lib/store';
import { useCreateOrder, useOpenOrders } from '../lib/queries';
import { Button } from '@culinaryos/ui';
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
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setToast(null)}
            className="text-slate-400 hover:text-white hover:bg-slate-800 h-8 w-8"
            aria-label="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </Button>
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
              <Button
                variant="ghost"
                onClick={() => setShowDrawerList(!showDrawerList)}
                className="text-[10px] font-black uppercase text-blue-600 hover:text-blue-800 hover:bg-transparent h-auto px-1 py-0.5 gap-0.5"
              >
                <span>Switch</span>
                <ChevronDown className="w-3 h-3" />
              </Button>
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
                  <Button
                    variant="ghost"
                    key={dr.id}
                    onClick={() => {
                      setActiveDrawerId(dr.id);
                      setShowDrawerList(false);
                    }}
                    className={`w-full h-auto text-left p-2 rounded-lg text-xs justify-start gap-2 [&>span]:w-full [&>span]:justify-between ${
                      dr.id === activeDrawerId
                        ? 'bg-slate-900 text-white hover:bg-slate-900 hover:text-white font-bold'
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
                  </Button>
                ))}
              </div>
            )}
          </div>

          {/* Staff Shift Info & Performance Panel (Toast-style Server Hub) */}
          {(() => {
            const openServerOrders = (openOrders as any[]).filter(
              (o: any) => o.server_name?.toLowerCase() === employee?.name?.toLowerCase()
            );
            const myOpenCovers = openServerOrders.reduce((sum: number, o: any) => sum + (o.cover_count || 1), 0);
            const paidOrders = getMockOrders().filter(
              (o: any) => o.status === 'paid' && o.server_name?.toLowerCase() === employee?.name?.toLowerCase()
            );
            const mySalesCents = paidOrders.reduce((sum: number, o: any) => sum + (o.total || 0), 0);
            const myTipsCents = paidOrders.reduce((sum: number, o: any) => sum + (o.tip || 0), 0);

            return (
              <div className="bg-slate-50 border-2 border-slate-300 rounded-xl p-3.5 space-y-2 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-slate-900" />
                    <span>My Shift Hub</span>
                  </span>
                  <span className="text-[9px] font-mono font-bold bg-slate-200 text-slate-800 px-1.5 py-0.5 rounded">
                    #104 • Alex M.
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-0.5">
                  <div className="bg-white border border-slate-200 p-2 rounded-lg">
                    <span className="text-[9px] font-black text-slate-500 uppercase block">Open Tables</span>
                    <span className="text-sm font-black text-slate-900">{openServerOrders.length} <span className="text-[10px] text-slate-500 font-normal">({myOpenCovers} covers)</span></span>
                  </div>
                  <div className="bg-white border border-slate-200 p-2 rounded-lg">
                    <span className="text-[9px] font-black text-slate-500 uppercase block">Shift Sales</span>
                    <span className="text-sm font-black font-mono text-slate-900">${(mySalesCents / 100).toFixed(2)}</span>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 p-2 rounded-lg flex justify-between items-center">
                  <span className="text-[10px] font-black text-slate-600 uppercase">My Shift Tips</span>
                  <span className="text-sm font-black font-mono text-emerald-700">${(myTipsCents / 100).toFixed(2)}</span>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Action Controls: Declare Drawer + Manager Day Controls */}
        <div className="space-y-2 pt-4 border-t border-[#e5e7eb]">
          <Button
            variant="secondary"
            onClick={handleOpenDeclareModal}
            className="w-full uppercase"
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>Declare Cash Drawer</span>
          </Button>

          <Button
            variant="outline"
            onClick={() => setShowDayModal(true)}
            className={`w-full uppercase gap-1.5 ${
              dayStatus === 'open'
                ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 hover:text-amber-800 border-amber-300'
                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 hover:text-emerald-800 border-emerald-300'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            <span>{dayStatus === 'open' ? 'Manager: Close Day' : 'Manager: Open Day'}</span>
          </Button>

          <Button
            variant="outline"
            onClick={() => setEmployee(null)}
            className="w-full uppercase bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-600 border-red-200"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Lock Screen</span>
          </Button>
        </div>
      </div>

      {/* Right Area: Mode Selection Grid */}
      <div className="flex-1 flex flex-col justify-between">
        <div className="grid grid-cols-2 gap-5 flex-1">
          {/* Quick Order */}
            <Button variant="ghost" onClick={startQuickOrder}
              className="bg-white hover:bg-white hover:border-orange-500/60 border-2 border-slate-200/90 rounded-2xl p-6 h-auto text-left shadow-md hover:shadow-xl active:scale-[0.98] group bg-gradient-to-br from-white via-white to-orange-50/20 [&>span]:w-full [&>span]:flex-col [&>span]:items-stretch [&>span]:justify-between">
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
            </Button>

            {/* Table Service */}
            <Button variant="ghost" onClick={() => setView('tables')}
              className="bg-white hover:bg-white hover:border-blue-500/60 border-2 border-slate-200/90 rounded-2xl p-6 h-auto text-left shadow-md hover:shadow-xl active:scale-[0.98] group bg-gradient-to-br from-white via-white to-blue-50/20 [&>span]:w-full [&>span]:flex-col [&>span]:items-stretch [&>span]:justify-between">
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
            </Button>

            {/* Bar Tabs */}
            <Button variant="ghost" onClick={() => setView('tabs')}
              className="bg-white hover:bg-white hover:border-purple-500/60 border-2 border-slate-200/90 rounded-2xl p-6 h-auto text-left shadow-md hover:shadow-xl active:scale-[0.98] group bg-gradient-to-br from-white via-white to-purple-50/20 [&>span]:w-full [&>span]:flex-col [&>span]:items-stretch [&>span]:justify-between">
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
            </Button>

            {/* Recall Checks */}
            <Button variant="ghost" onClick={() => setView('recall')}
              className="bg-white hover:bg-white hover:border-slate-500/60 border-2 border-slate-200/90 rounded-2xl p-6 h-auto text-left shadow-md hover:shadow-xl active:scale-[0.98] group bg-gradient-to-br from-white via-white to-slate-50/30 [&>span]:w-full [&>span]:flex-col [&>span]:items-stretch [&>span]:justify-between">
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
            </Button>
          </div>

          {/* Bottom Setup & Reports Bar */}
          <div className="mt-5 flex gap-4">
            <Button variant="outline" onClick={() => setView('settings')}
              className="flex-1 py-3.5 h-auto text-xs font-black uppercase tracking-wider text-slate-800 hover:text-slate-800 hover:bg-slate-50 hover:border-slate-900">
              <span className="material-symbols-outlined text-[18px] text-slate-600">settings</span>
              <span>Device Setup (Stripe / Thermal Printers)</span>
            </Button>
            <Button variant="outline" onClick={() => setView('reports')}
              className="flex-1 py-3.5 h-auto text-xs font-black uppercase tracking-wider text-slate-800 hover:text-slate-800 hover:bg-slate-50 hover:border-slate-900">
              <span className="material-symbols-outlined text-[18px] text-slate-600">bar_chart</span>
              <span>Business Reports & Shift PM Mix</span>
            </Button>
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
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowDeclare(false)}
                className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 h-9 w-9"
                aria-label="Close declare drawer modal"
              >
                <X className="w-5 h-5" />
              </Button>
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
              <Button variant="secondary" onClick={() => setShowDeclare(false)}
                className="flex-1 uppercase">Cancel</Button>
              <Button variant="brand" onClick={handleSaveDeclaration}
                className="flex-1 uppercase tracking-wider">Save Audit & Log GL</Button>
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
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowDayModal(false)}
                className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 h-9 w-9"
                aria-label="Close day modal"
              >
                <X className="w-5 h-5" />
              </Button>
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
              <Button variant="secondary" onClick={() => setShowDayModal(false)}
                className="flex-1 uppercase">Cancel</Button>
              <Button
                variant={dayStatus === 'open' ? 'warning' : 'success'}
                onClick={handleToggleDay}
                className="flex-1 uppercase tracking-wider"
              >
                {dayStatus === 'open' ? 'Confirm Close Day' : 'Confirm Open Day'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default DashboardView;
