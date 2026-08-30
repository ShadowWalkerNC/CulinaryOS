import { useState } from 'react';
import { usePOSStore } from './lib/store';
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
import { ConnectionStatus } from './components/ConnectionStatus';
import { Grid, X, ExternalLink, Tablet, Tv, Laptop, ChefHat, ShoppingBag, TrendingUp, Lock } from '@culinaryos/ui';

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

  return (
    <div className="h-screen w-screen bg-[#f8f9fa] text-[#1f2937] font-sans flex flex-col overflow-hidden animate-fadeIn select-none">
      {/* Single Unified POS Terminal Navigation Bar */}
      <header className="bg-white border-b border-slate-200 px-4 h-13 flex items-center justify-between shrink-0 shadow-xs gap-3">
        {/* Left: Brand Identity & Active Staff */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setView('dashboard')}
            className="flex items-center gap-2 text-left hover:opacity-80 transition-opacity"
          >
            <div className="w-7 h-7 rounded-lg bg-[#0f172a] text-white flex items-center justify-center shadow-xs">
              <span className="material-symbols-outlined filled text-[16px]">skillet</span>
            </div>
            <span className="font-black text-xs text-slate-950 uppercase tracking-wider hidden sm:inline">
              POS Terminal
            </span>
          </button>

          <div className="h-4 w-px bg-slate-200 shrink-0" />

          <span className="text-[11px] font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-lg flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>{employee.name}</span>
            <span className="text-slate-400 font-medium hidden md:inline">({employee.role})</span>
          </span>
        </div>

        {/* Center: Quick Navigation View Buttons with Visual Symbols */}
        <nav className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/80 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setView('dashboard')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              view === 'dashboard'
                ? 'bg-[#0f172a] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-950 hover:bg-white/50'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">home</span>
            <span>Home</span>
          </button>
          <button
            onClick={() => {
              setView('tables');
              setActiveOrder(null);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              view === 'tables' && !activeOrderId
                ? 'bg-[#0f172a] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-950 hover:bg-white/50'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">table_restaurant</span>
            <span>Floor Map</span>
          </button>

          {activeOrderId && (
            <>
              <button
                onClick={() => setView('menu')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  view === 'menu'
                    ? 'bg-[#0f172a] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-950 hover:bg-white/50'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">receipt_long</span>
                <span>Ticket</span>
              </button>
              <button
                onClick={() => setView('checkout')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  view === 'checkout'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">payments</span>
                <span>Pay</span>
              </button>
            </>
          )}

          <button
            onClick={() => setView('tabs')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              view === 'tabs'
                ? 'bg-[#0f172a] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-950 hover:bg-white/50'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">local_bar</span>
            <span>Tabs</span>
          </button>
          <button
            onClick={() => setView('recall')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              view === 'recall'
                ? 'bg-[#0f172a] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-950 hover:bg-white/50'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">history</span>
            <span>Recall</span>
          </button>
          <button
            onClick={() => setView('reports')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              view === 'reports'
                ? 'bg-[#0f172a] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-950 hover:bg-white/50'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">monitoring</span>
            <span>Reports</span>
          </button>
          <button
            onClick={() => setView('settings')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              view === 'settings'
                ? 'bg-[#0f172a] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-950 hover:bg-white/50'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">settings</span>
            <span>Settings</span>
          </button>
        </nav>

        {/* Right: Connection, Apps & Lock */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <ConnectionStatus />

          <button
            type="button"
            onClick={() => setShowApps(!showApps)}
            className={`px-2 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 border ${
              showApps
                ? 'bg-[#0f172a] text-white border-[#0f172a]'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
            }`}
            title="Switch Applications"
          >
            <Grid className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Apps</span>
          </button>

          <button
            onClick={() => setEmployee(null)}
            className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold px-2.5 py-1 rounded-lg text-[11px] uppercase tracking-wider flex items-center gap-1 transition-colors"
            title="Lock Terminal"
          >
            <Lock className="w-3 h-3" />
            <span>Lock</span>
          </button>
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
              <button
                type="button"
                onClick={() => setShowApps(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {appModules.map((m) => {
                const Icon = m.icon;
                return (
                  <a
                    key={m.id}
                    href={`http://localhost:${m.port}`}
                    onClick={() => setShowApps(false)}
                    className={`p-3 rounded-xl border text-left transition-all flex items-start gap-2.5 ${
                      m.active
                        ? 'bg-[#0f172a] text-white border-[#0f172a] shadow-xs'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200/80 text-slate-800'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        m.active ? 'bg-white/20 text-white' : 'bg-white text-slate-700 shadow-xs'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <p className={`text-xs font-bold truncate ${m.active ? 'text-white' : 'text-slate-950'}`}>
                          {m.label}
                        </p>
                        {m.active && (
                          <span className="text-[9px] bg-white/20 px-1.5 py-0.2 rounded font-black uppercase">
                            Active
                          </span>
                        )}
                      </div>
                      <p className={`text-[10px] line-clamp-1 mt-0.5 ${m.active ? 'text-slate-200' : 'text-slate-500'}`}>
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

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Persistent Receipt Panel (Only visible in Ticket Views: Menu, Checkout, Floor Map with Active Order) */}
        {activeOrderId && (view === 'menu' || view === 'checkout') && (
          <div className="w-80 border-r border-[#e5e7eb] bg-white flex flex-col h-full shrink-0">
            <OrderView />
          </div>
        )}

        {/* Right Side: Active Workspace panel */}
        <div className="flex-1 h-full overflow-hidden bg-[#f8f9fa]">
          {view === 'dashboard' && <DashboardView />}
          {view === 'tables' && <TablesView />}
          {view === 'menu' && <MenuView />}
          {view === 'checkout' && <CheckoutView />}
          {view === 'tabs' && <TabsView />}
          {view === 'recall' && <RecallView />}
          {view === 'settings' && <SettingsView />}
          {view === 'reports' && <ReportsView />}
        </div>
      </div>
    </div>
  );
}

export default App;
