import { useState } from 'react';
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
  Button,
  Grid,
  X,
  ExternalLink,
  Tablet,
  Tv,
  Laptop,
  ChefHat,
  ShoppingBag,
  TrendingUp,
  Lock,
  ShoppingCart,
  Sheet,
  SheetContent,
} from '@culinaryos/ui';

export function App() {
  const { view, setView, activeOrderId, setActiveOrder, employee, setEmployee } = usePOSStore();
  const [showApps, setShowApps] = useState(false);

  const appModules = [
    { id: 'pos', label: 'POS Terminal', port: '5172', desc: 'Point of sale, 2D/3D floor map & checkout', icon: Tablet, active: true },
    { id: 'kds', label: 'KDS Kitchen', port: '5173', desc: 'Kitchen tickets, station filters & aging timers', icon: Tv },
    { id: 'admin', label: 'Back-Office Admin', port: '5174', desc: 'Menu editor, staff PINs, auto-PO & settings', icon: Laptop },
    { id: 'kitchenkit', label: 'KitchenKit', port: '5175', desc: 'Shift prep lists, recipe ratios & shelf life', icon: ChefHat },
    { id: 'web', label: 'Guest Storefront', port: '5176', desc: 'Online customer ordering & live order tracker', icon: ShoppingBag },
    { id: 'ops', label: 'CulinaryOps', port: '5177', desc: 'Theoretical vs actual food cost & waste ledger', icon: TrendingUp },
    { id: 'marketing', label: 'Marketing Hub', port: '5179', desc: 'SaaS portal, pricing, self-serve signup & docs', icon: Laptop },
  ];

  // 1. Force Lock Screen if no employee session is active
  if (!employee) {
    return (
      <div className="h-screen w-screen bg-[#f8f9fa] text-[#1f2937] font-sans flex flex-col overflow-hidden animate-fadeIn select-none">
        <header className="bg-white border-b border-slate-200 px-4 h-13 flex items-center justify-between shadow-xs shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#0f172a] text-white flex items-center justify-center shadow-xs">
              <span className="material-symbols-outlined filled text-[16px]">skillet</span>
            </div>
            <span className="font-black text-xs text-slate-950 uppercase tracking-wider">
              CulinaryOS POS Terminal
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ConnectionStatus />
          </div>
        </header>
        <div className="flex-1 overflow-hidden">
          <StaffView />
        </div>
      </div>
    );
  }

  const { data: currentOrder } = useOrder(activeOrderId);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);

  const activeItems = (currentOrder?.items || []).filter((i: any) => !i.is_voided);
  const itemCount = activeItems.reduce((sum: number, i: any) => sum + (i.quantity || 1), 0);
  const orderSubtotal = activeItems.reduce((sum: number, i: any) => sum + (i.line_total || 0), 0);

  return (
    <div className="h-screen w-screen bg-[#f8f9fa] text-[#1f2937] font-sans flex flex-col overflow-hidden animate-fadeIn select-none">
      {/* Single Unified POS Terminal Navigation Bar */}
      <header className="bg-white border-b border-slate-200 px-4 h-13 flex items-center justify-between shrink-0 shadow-xs gap-3">
        {/* Left: Brand Identity & Active Staff */}
        <div className="flex items-center gap-3 shrink-0">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setView('dashboard')}
            className="justify-start gap-2 text-left hover:opacity-80 h-auto px-2 py-1"
          >
            <div className="w-7 h-7 rounded-lg bg-[#0f172a] text-white flex items-center justify-center shadow-xs">
              <span className="material-symbols-outlined filled text-[16px]">skillet</span>
            </div>
            <span className="font-black text-xs text-slate-950 uppercase tracking-wider hidden sm:inline">
              POS Terminal
            </span>
          </Button>

          <div className="h-4 w-px bg-slate-200 shrink-0" />

          <span className="text-[11px] font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-lg flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>{employee.name}</span>
            <span className="text-slate-400 font-medium hidden md:inline">({employee.role})</span>
          </span>
        </div>

        {/* Center: Quick Navigation View Buttons with Visual Symbols */}
        <nav className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/80 overflow-x-auto no-scrollbar">
          <Button
            variant="ghost"
            onClick={() => setView('dashboard')}
            className={`px-3 py-1.5 h-auto rounded-lg text-xs font-bold whitespace-nowrap gap-1.5 ${
              view === 'dashboard'
                ? 'bg-[#0f172a] text-white shadow-xs hover:bg-[#0f172a] hover:text-white'
                : 'text-slate-600 hover:text-slate-950 hover:bg-white/50'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">home</span>
            <span>Home</span>
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setView('tables');
              setActiveOrder(null);
            }}
            className={`px-3 py-1.5 h-auto rounded-lg text-xs font-bold whitespace-nowrap gap-1.5 ${
              view === 'tables' && !activeOrderId
                ? 'bg-[#0f172a] text-white shadow-xs hover:bg-[#0f172a] hover:text-white'
                : 'text-slate-600 hover:text-slate-950 hover:bg-white/50'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">table_restaurant</span>
            <span>Floor Map</span>
          </Button>

          {activeOrderId && (
            <>
              <Button
                variant="ghost"
                onClick={() => setView('menu')}
                className={`px-3 py-1.5 h-auto rounded-lg text-xs font-bold whitespace-nowrap gap-1.5 ${
                  view === 'menu'
                    ? 'bg-[#0f172a] text-white shadow-xs hover:bg-[#0f172a] hover:text-white'
                    : 'text-slate-600 hover:text-slate-950 hover:bg-white/50'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">receipt_long</span>
                <span>Ticket</span>
              </Button>
              <Button
                variant="ghost"
                onClick={() => setView('checkout')}
                className={`px-3 py-1.5 h-auto rounded-lg text-xs font-bold whitespace-nowrap gap-1.5 ${
                  view === 'checkout'
                    ? 'bg-emerald-600 text-white shadow-xs hover:bg-emerald-600 hover:text-white'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 hover:text-emerald-800'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">payments</span>
                <span>Pay</span>
              </Button>
            </>
          )}

          <Button
            variant="ghost"
            onClick={() => setView('tabs')}
            className={`px-3 py-1.5 h-auto rounded-lg text-xs font-bold whitespace-nowrap gap-1.5 ${
              view === 'tabs'
                ? 'bg-[#0f172a] text-white shadow-xs hover:bg-[#0f172a] hover:text-white'
                : 'text-slate-600 hover:text-slate-950 hover:bg-white/50'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">local_bar</span>
            <span>Tabs</span>
          </Button>
          <Button
            variant="ghost"
            onClick={() => setView('recall')}
            className={`px-3 py-1.5 h-auto rounded-lg text-xs font-bold whitespace-nowrap gap-1.5 ${
              view === 'recall'
                ? 'bg-[#0f172a] text-white shadow-xs hover:bg-[#0f172a] hover:text-white'
                : 'text-slate-600 hover:text-slate-950 hover:bg-white/50'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">history</span>
            <span>Recall</span>
          </Button>
          <Button
            variant="ghost"
            onClick={() => setView('reports')}
            className={`px-3 py-1.5 h-auto rounded-lg text-xs font-bold whitespace-nowrap gap-1.5 ${
              view === 'reports'
                ? 'bg-[#0f172a] text-white shadow-xs hover:bg-[#0f172a] hover:text-white'
                : 'text-slate-600 hover:text-slate-950 hover:bg-white/50'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">bar_chart</span>
            <span>Reports</span>
          </Button>
          <Button
            variant="ghost"
            onClick={() => setView('cfd')}
            className={`px-3 py-1.5 h-auto rounded-lg text-xs font-bold whitespace-nowrap gap-1.5 ${
              view === 'cfd'
                ? 'bg-[#0f172a] text-white shadow-xs hover:bg-[#0f172a] hover:text-white'
                : 'text-slate-600 hover:text-slate-950 hover:bg-white/50'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">devices</span>
            <span>CFD Guest Screen</span>
          </Button>
          <Button
            variant="ghost"
            onClick={() => setView('settings')}
            className={`px-3 py-1.5 h-auto rounded-lg text-xs font-bold whitespace-nowrap gap-1.5 ${
              view === 'settings'
                ? 'bg-[#0f172a] text-white shadow-xs hover:bg-[#0f172a] hover:text-white'
                : 'text-slate-600 hover:text-slate-950 hover:bg-white/50'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">settings</span>
            <span>Settings</span>
          </Button>
        </nav>

        {/* Right: Connection, Apps & Lock */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <ConnectionStatus />

          <Button
            type="button"
            variant="outline"
            onClick={() => setShowApps(!showApps)}
            className={`px-2 py-1 h-auto rounded-lg text-xs font-bold gap-1 ${
              showApps
                ? 'bg-[#0f172a] text-white border-[#0f172a] hover:bg-[#1e293b] hover:text-white'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
            }`}
            title="Switch Applications"
          >
            <Grid className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Apps</span>
          </Button>

          <Button
            variant="outline"
            onClick={() => setEmployee(null)}
            className="bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200 font-bold px-2.5 py-1 h-auto rounded-lg text-[11px] uppercase tracking-wider gap-1"
            title="Lock Terminal"
          >
            <Lock className="w-3 h-3" />
            <span>Lock</span>
          </Button>
        </div>
      </header>

      {/* App Switcher Modal */}
      {showApps && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setShowApps(false)}
        >
          <div
            className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-md w-full p-5 space-y-4 text-slate-900 animate-slideIn"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#0f172a] text-white flex items-center justify-center">
                  <Grid className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                    CulinaryOS Applications
                  </h3>
                  <p className="text-[10px] text-slate-500 font-medium">Switch between restaurant surfaces</p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setShowApps(false)}
                className="h-7 w-7 rounded-full"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-2 max-h-[60vh] overflow-y-auto pr-1">
              {appModules.map((m) => {
                const Icon = m.icon;
                return (
                  <a
                    key={m.id}
                    href={`http://localhost:${m.port}/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-start gap-3 p-2.5 rounded-xl border transition-all ${
                      m.active
                        ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                        : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        m.active ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black leading-tight">{m.label}</span>
                        <span
                          className={`text-[9px] font-mono px-1 rounded ${
                            m.active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          :{m.port}
                        </span>
                      </div>
                      <p
                        className={`text-[11px] leading-tight truncate mt-0.5 ${
                          m.active ? 'text-slate-300' : 'text-slate-500'
                        }`}
                      >
                        {m.desc}
                      </p>
                    </div>
                  </a>
                );
              })}
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <a
                href="http://localhost:5176/"
                className="font-bold text-slate-600 hover:text-slate-950 flex items-center gap-1"
              >
                <span>Platform Home</span>
              </a>
              <a
                href="https://github.com/ShadowWalkerNC/CulinaryOS"
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1"
              >
                <span>GitHub Monorepo</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Main Workspace Layout — Dual-Pane on >=1024px, Single Canvas on <1024px */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Side: Desktop Dual-Pane Receipt Panel (Hidden on screens < 1024px) */}
        {activeOrderId && (view === 'menu' || view === 'checkout') && (
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
