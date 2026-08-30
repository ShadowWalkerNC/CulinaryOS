import React, { useState } from 'react';
import { Routes, Route, Navigate, NavLink } from 'react-router-dom';
import { MenuPage } from './pages/Menu';
import { StaffPage } from './pages/Staff';
import { PantryPage } from './pages/Pantry';
import { ToolsPage } from './pages/Tools';
import { SettingsPage } from './pages/Settings';
import { IntegrationsPage } from './pages/Integrations';
import { Grid, X, ExternalLink, Tablet, Tv, Laptop, ChefHat, ShoppingBag, TrendingUp } from '@culinaryos/ui';

export function App() {
  const [showApps, setShowApps] = useState(false);

  const adminNav = [
    { to: '/menu', label: 'Menu Editor', icon: 'restaurant_menu' },
    { to: '/staff', label: 'Staff & Hiring', icon: 'badge' },
    { to: '/pantry', label: 'Pantry & Inventory', icon: 'inventory_2' },
    { to: '/tools', label: 'Tools & Addons', icon: 'extension' },
    { to: '/integrations', label: 'Integrations & Hub', icon: 'hub' },
    { to: '/settings', label: 'Settings & Routing', icon: 'tune' },
  ];

  const appModules = [
    { id: 'pos', label: 'POS Terminal', port: '5172', desc: 'Point of sale, 2D/3D floor map & checkout', icon: Tablet },
    { id: 'kds', label: 'KDS Kitchen', port: '5173', desc: 'Kitchen tickets, station filters & aging timers', icon: Tv },
    { id: 'admin', label: 'Back-Office Admin', port: '5174', desc: 'Menu editor, staff PINs, auto-PO & settings', icon: Laptop, active: true },
    { id: 'kitchenkit', label: 'KitchenKit', port: '5175', desc: 'Shift prep lists, recipe ratios & shelf life', icon: ChefHat },
    { id: 'web', label: 'Guest Storefront', port: '5176', desc: 'Online customer ordering & live order tracker', icon: ShoppingBag },
    { id: 'ops', label: 'CulinaryOps', port: '5177', desc: 'Theoretical vs actual food cost & waste ledger', icon: TrendingUp },
  ];

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-[#1f2937] font-sans flex flex-col antialiased select-none">
      {/* Single Unified Admin Navigation Bar */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-6 h-15 flex items-center justify-between shrink-0 shadow-xs gap-4 sticky top-0 z-30">
        {/* Left: Brand & Title */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-[#0f172a] text-white flex items-center justify-center shadow-xs">
            <span className="material-symbols-outlined filled text-[18px]">admin_panel_settings</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-xs sm:text-sm tracking-tight text-slate-950 uppercase">
                CulinaryOS Admin
              </span>
              <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200 hidden sm:inline">
                Back Office
              </span>
            </div>
            <p className="text-[10px] text-slate-500 font-medium hidden md:block">The Golden Fork</p>
          </div>
        </div>

        {/* Center: Admin Primary Navigation Tabs — Symbol & Icon Forward */}
        <nav className="hidden md:flex items-center gap-1.5 bg-slate-100/90 p-1.5 rounded-xl border border-slate-200/80 overflow-x-auto no-scrollbar">
          {adminNav.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                  isActive
                    ? 'bg-white text-slate-950 shadow-xs border border-slate-200/90'
                    : 'text-slate-600 hover:text-slate-950 hover:bg-white/60'
                }`
              }
            >
              <span className={`material-symbols-outlined text-[18px] ${tab.to === '/menu' ? 'text-amber-600' : tab.to === '/staff' ? 'text-blue-600' : tab.to === '/pantry' ? 'text-emerald-600' : tab.to === '/tools' ? 'text-purple-600' : tab.to === '/integrations' ? 'text-cyan-600' : 'text-slate-600'}`}>
                {tab.icon}
              </span>
              <span>{tab.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Right: App Switcher & Server Status */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setShowApps(!showApps)}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
              showApps
                ? 'bg-[#0f172a] text-white border-[#0f172a]'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
            }`}
            title="Switch Applications"
          >
            <Grid className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Apps</span>
          </button>

          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg text-[10px] font-semibold text-slate-600">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="hidden sm:inline">Connected</span>
          </div>
        </div>
      </header>

      {/* Mobile Sub-Navigation Bar */}
      <nav className="md:hidden flex items-center gap-1 bg-white border-b border-slate-200 p-2 overflow-x-auto no-scrollbar shrink-0">
        {adminNav.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              `px-2.5 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap flex items-center gap-1 ${
                isActive
                  ? 'bg-[#0f172a] text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`
            }
          >
            <span className="material-symbols-outlined text-[14px]">{tab.icon}</span>
            <span>{tab.label}</span>
          </NavLink>
        ))}
      </nav>

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

      {/* Main Workspace Router */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8">
        <Routes>
          <Route path="/menu" element={<MenuPage />} />
          <Route path="/staff" element={<StaffPage />} />
          <Route path="/pantry" element={<PantryPage />} />
          <Route path="/tools" element={<ToolsPage />} />
          <Route path="/integrations" element={<IntegrationsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/" element={<Navigate to="/menu" replace />} />
          <Route path="*" element={<Navigate to="/menu" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
