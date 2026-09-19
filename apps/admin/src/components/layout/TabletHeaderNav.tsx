import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Activity,
  ClipboardList,
  UtensilsCrossed,
  Package,
  Users,
  Settings,
  Store,
  Menu,
  X,
  TrendingUp,
  Clock,
  LayoutGrid,
  ShoppingCart,
  SlidersHorizontal,
  ShieldCheck,
  Radio,
} from '@culinaryos/ui';

export function TabletHeaderNav() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();

  const primaryTabletTabs = [
    { to: '/dashboard', label: 'Dashboard', icon: <Activity className="w-4 h-4" /> },
    { to: '/operations', label: 'Floor Tasks', icon: <ClipboardList className="w-4 h-4" /> },
    { to: '/scheduling', label: 'Roster', icon: <Clock className="w-4 h-4" /> },
    { to: '/menu', label: 'Menu', icon: <UtensilsCrossed className="w-4 h-4" /> },
    { to: '/pantry', label: 'Pantry', icon: <Package className="w-4 h-4" /> },
    { to: '/staff', label: 'Staff', icon: <Users className="w-4 h-4" /> },
  ];

  const allDrawerItems = [
    { to: '/dashboard', label: 'Executive Dashboard', icon: <Activity className="w-5 h-5" /> },
    { to: '/reports', label: 'Financials & P&L', icon: <TrendingUp className="w-5 h-5" /> },
    { to: '/operations', label: 'Shift Checklists & Approvals', icon: <ClipboardList className="w-5 h-5" /> },
    { to: '/scheduling', label: 'Roster & Scheduling', icon: <Clock className="w-5 h-5" /> },
    { to: '/tools', label: 'Floor Map & Hardware Routing', icon: <LayoutGrid className="w-5 h-5" /> },
    { to: '/menu', label: 'Menu & Recipes', icon: <UtensilsCrossed className="w-5 h-5" /> },
    { to: '/pantry', label: 'Pantry & Par Levels', icon: <Package className="w-5 h-5" /> },
    { to: '/purchasing', label: 'Purchasing & Vendors', icon: <ShoppingCart className="w-5 h-5" /> },
    { to: '/data', label: 'Bulk Data Actions', icon: <SlidersHorizontal className="w-5 h-5" /> },
    { to: '/staff', label: 'Staff & Talent ATS', icon: <Users className="w-5 h-5" /> },
    { to: '/roles', label: 'RBAC Roles & Matrix', icon: <ShieldCheck className="w-5 h-5" /> },
    { to: '/health', label: 'System Health & Repair', icon: <Activity className="w-5 h-5" /> },
    { to: '/integrations', label: 'Integrations Hub', icon: <Radio className="w-5 h-5" /> },
    { to: '/settings', label: 'Settings & Tax Routing', icon: <Settings className="w-5 h-5" /> },
  ];

  return (
    <>
      <header className="bg-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        {/* Left: Brand & Floor Status */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="min-h-[48px] min-w-[48px] rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center active:scale-[0.97] transition-all"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm text-slate-900 tracking-tight">The Golden Fork</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 border border-orange-200">
                Tablet Console
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">Supervisor & Manager Floor Oversight</p>
          </div>
        </div>

        {/* Center: Segmented Primary Tabs (Touch targets >= 48px) */}
        <nav className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
          {primaryTabletTabs.map((tab) => {
            const isActive = location.pathname === tab.to;
            return (
              <NavLink
                key={tab.to}
                to={tab.to}
                className={`min-h-[44px] px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all active:scale-[0.97] ${
                  isActive
                    ? 'bg-white text-slate-950 shadow-xs border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Right: Quick Floor Status Pill */}
        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Floor: 84% Capacity</span>
          </div>
        </div>
      </header>

      {/* Slide-over Tablet Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex bg-slate-950/50 backdrop-blur-xs animate-fadeIn">
          <div className="absolute inset-0" onClick={() => setDrawerOpen(false)} />
          <div className="relative w-80 max-w-[85vw] bg-white h-full shadow-2xl flex flex-col z-10 animate-scaleUp">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Store className="w-5 h-5 text-orange-600" />
                <span className="font-extrabold text-sm text-slate-900">All Admin Modules</span>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="w-9 h-9 rounded-xl bg-slate-200/70 hover:bg-slate-300 text-slate-700 flex items-center justify-center active:scale-[0.97]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {allDrawerItems.map((item) => {
                const isActive = location.pathname === item.to;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setDrawerOpen(false)}
                    className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold transition-all min-h-[48px] active:scale-[0.97] ${
                      isActive
                        ? 'bg-orange-600 text-white shadow-xs'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 text-xs text-slate-500">
              <p className="font-bold text-slate-700">CulinaryOS Tablet Console</p>
              <p>Optimized for on-the-floor manager oversight</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
