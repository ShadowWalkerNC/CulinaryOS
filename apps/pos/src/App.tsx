import { useEffect, useState } from 'react';
import { usePOSStore } from './lib/store';
import { useOrder } from './lib/queries';
import { TablesView }   from './views/TablesView';
import { OrderView }    from './views/OrderView';
import { MenuView }     from './views/MenuView';
import { CheckoutView } from './views/CheckoutView';
import { DashboardView } from './views/DashboardView';
import { StaffView }     from './views/StaffView';
import { RecallView }    from './views/RecallView';
import { SettingsView }  from './views/SettingsView';
import { TabsView }      from './views/TabsView';
import { ReportsView }   from './views/ReportsView';
import { CFDView }       from './views/CFDView';
import { ConnectionStatus } from './components/ConnectionStatus';
import {
  X,
  Lock,
  ShoppingCart,
  Sheet,
  SheetContent,
  CompactNavigation,
  CulinaryAppLauncher,
  type CompactNavigationItem,
} from '@culinaryos/ui';

export function App() {
  const { view, setView, activeOrderId, setActiveOrder, employee, setEmployee } = usePOSStore();

  const { data: currentOrder } = useOrder(activeOrderId);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);

  // A ticket sheet is contextual to the current view. Moving to Menu, Pay,
  // Tables, Home, or another section must release the sheet and its focus trap
  // without clearing the active check.
  useEffect(() => {
    setMobileCartOpen(false);
  }, [view]);

  // 1. Force Lock Screen if no employee session is active
  if (!employee) {
    return (
      <div className="h-screen w-screen bg-[#f8f9fa] text-[#1f2937] font-sans flex flex-col overflow-hidden animate-fadeIn select-none">
        <header className="bg-slate-900 border-b border-slate-800 px-6 h-16 flex items-center justify-between shadow-md shrink-0 text-white">
          <div className="flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-orange-600 text-white flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined filled text-[20px]">skillet</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-sm text-white uppercase tracking-wider">
                  The Golden Fork Bistro
                </span>
                <span className="text-[10px] font-mono bg-slate-800 text-orange-400 font-bold px-2 py-0.5 rounded border border-slate-700">
                  Station #1 (Main FOH)
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                CulinaryOS POS v1.2.1 • {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-slate-300 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Register Online</span>
            </div>
            <ConnectionStatus />
          </div>
        </header>
        <div className="flex-1 overflow-hidden">
          <StaffView />
        </div>
      </div>
    );
  }

  const activeItems = (currentOrder?.items || []).filter((i: any) => !i.is_voided);
  const itemCount = activeItems.reduce((sum: number, i: any) => sum + (i.quantity || 1), 0);
  const orderSubtotal = activeItems.reduce((sum: number, i: any) => sum + (i.line_total || 0), 0);
  const posNavigation: CompactNavigationItem[] = [
    { id: 'dashboard', label: 'Home', primary: true, icon: <span className="material-symbols-outlined text-[17px]">home</span> },
    { id: 'tables', label: 'Floor Map', primary: true, icon: <span className="material-symbols-outlined text-[17px]">table_restaurant</span> },
    { id: 'menu', label: 'Ticket', primary: true, disabled: !activeOrderId, icon: <span className="material-symbols-outlined text-[17px]">receipt_long</span> },
    { id: 'checkout', label: 'Pay', primary: true, disabled: !activeOrderId, icon: <span className="material-symbols-outlined text-[17px]">payments</span> },
    { id: 'tabs', label: 'Tabs', icon: <span className="material-symbols-outlined text-[17px]">local_bar</span> },
    { id: 'recall', label: 'Recall', icon: <span className="material-symbols-outlined text-[17px]">history</span> },
    { id: 'reports', label: 'Reports', icon: <span className="material-symbols-outlined text-[17px]">bar_chart</span> },
    { id: 'cfd', label: 'CFD Screen', icon: <span className="material-symbols-outlined text-[17px]">devices</span> },
    { id: 'settings', label: 'Settings', icon: <span className="material-symbols-outlined text-[17px]">settings</span> },
  ];

  const selectPOSSection = (id: string) => {
    if (id === 'tables') {
      setActiveOrder(null);
      setView('tables');
      return;
    }
    setView(id as typeof view);
  };

  return (
    <div className="h-screen w-screen bg-[#f8f9fa] text-[#1f2937] font-sans flex flex-col overflow-hidden animate-fadeIn select-none">
      {/* Single Unified POS Terminal Navigation Bar (Industrial Tablet Grade) */}
      <header className="bg-slate-900 border-b border-slate-800 px-3 sm:px-5 min-h-16 py-2 flex items-center justify-between shrink-0 shadow-md gap-2 text-white">
        <div className="flex items-center gap-2 sm:gap-3.5 shrink-0">
          <button
            type="button"
            onClick={() => setView('dashboard')}
            className="min-h-[48px] flex items-center gap-2.5 rounded-xl text-left hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
          >
            <div className="w-9 h-9 rounded-xl bg-orange-600 text-white flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined filled text-[20px]">skillet</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-xs text-white uppercase tracking-wider hidden sm:inline">
                  The Golden Fork
                </span>
                <span className="text-[10px] font-mono bg-slate-800 text-orange-400 font-bold px-1.5 py-0.5 rounded border border-slate-700">
                  Station #1
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium block">
                CulinaryOS POS
              </span>
            </div>
          </button>

          <div className="hidden xl:block h-6 w-px bg-slate-800 shrink-0" />

          <span className="hidden xl:flex text-xs font-bold text-slate-200 bg-slate-800 border border-slate-700 px-3 py-1 rounded-xl items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{employee.name}</span>
            <span className="text-slate-400 font-medium hidden md:inline">({employee.role})</span>
          </span>
        </div>

        {/* Quick rail on wide workstations; a labeled sheet trigger on compact devices. */}
        <div className="min-w-0 flex-1 flex justify-center">
          <CompactNavigation
            items={posNavigation}
            activeId={view}
            onSelect={selectPOSSection}
            label="POS sections"
            tone="dark"
          />
        </div>

        {/* Right: Connection, Apps & Lock */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-slate-300 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Online</span>
          </div>

          <div className="hidden sm:block"><ConnectionStatus /></div>

          <CulinaryAppLauncher activeApp="pos" tone="dark" />

          <button
            type="button"
            onClick={() => setEmployee(null)}
            className="min-h-[48px] bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800/70 font-bold px-3 py-1.5 rounded-xl text-xs uppercase tracking-wider flex items-center gap-1.5 transition-colors transition-transform duration-75 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 active:scale-[0.97]"
            title="Lock Terminal"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Lock</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Layout — Dual-Pane on >=1024px, Single Canvas on <1024px */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Side: Desktop Dual-Pane Receipt Panel (Hidden on screens < 1024px and when in focused checkout) */}
        {activeOrderId && view === 'menu' && (
          <div className="hidden lg:flex w-80 xl:w-96 border-r border-[#e5e7eb] bg-white flex-col h-full shrink-0">
            <OrderView />
          </div>
        )}

        {/* Right Side: Active Workspace panel */}
        <div className="flex-1 h-full overflow-hidden bg-[#f8f9fa] pb-16 lg:pb-0">
          {view === 'dashboard' && <DashboardView />}
          {view === 'tables' && <TablesView />}
          {view === 'menu' && <MenuView />}
          {view === 'checkout' && <CheckoutView />}
          {view === 'tabs' && <TabsView />}
          {view === 'recall' && <RecallView />}
          {view === 'settings' && <SettingsView />}
          {view === 'reports' && <ReportsView />}
          {view === 'cfd' && <CFDView />}
        </div>

        {/* Mobile/Tablet Ergonomic Thumb-Zone Floating Cart Bar (< 1024px) */}
        {activeOrderId && (view === 'menu' || view === 'checkout' || view === 'tables') && (
          <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-2.5 shadow-2xl flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setMobileCartOpen(true)}
              className="justify-start gap-2.5 text-left h-auto px-2 py-1.5"
            >
              <div className="relative w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
                <ShoppingCart className="w-5 h-5" />
                {itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-amber-500 text-slate-950 font-black text-[10px] w-4.5 h-4.5 rounded-full flex items-center justify-center">
                    {itemCount}
                  </span>
                )}
              </div>
              <div>
                <div className="text-xs font-black text-slate-900">
                  {currentOrder?.table_number ? `Table ${currentOrder.table_number}` : 'Current Tab'}
                </div>
                <div className="text-[11px] text-slate-500 font-semibold font-mono">
                  {itemCount} items • ${(orderSubtotal / 100).toFixed(2)}
                </div>
              </div>
            </Button>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setMobileCartOpen(true)}
                className="h-11 px-4 uppercase tracking-wider"
              >
                View Ticket
              </Button>
              <Button
                type="button"
                variant="success"
                onClick={() => setView('checkout')}
                className="h-11 px-5 uppercase tracking-wider gap-1.5"
              >
                <span>Pay</span>
                <span className="font-mono">${(orderSubtotal / 100).toFixed(2)}</span>
              </Button>
            </div>
          </div>
        )}

        {/* Mobile Slide-Over Ticket Drawer */}
        <Sheet open={mobileCartOpen} onOpenChange={setMobileCartOpen}>
          <SheetContent side="bottom" className="p-0 h-[85vh] max-h-[85vh] flex flex-col rounded-t-3xl border-t border-slate-200 shadow-2xl">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 rounded-t-3xl">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center">
                  <ShoppingCart className="w-4 h-4" />
                </div>
                <span className="font-black text-xs text-slate-950 uppercase tracking-wider">
                  Live Ticket ({currentOrder?.table_number ? `Table ${currentOrder.table_number}` : 'Open Tab'})
                </span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setMobileCartOpen(false)}
                className="h-8 w-8 rounded-full"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <OrderView />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}

export default App;
