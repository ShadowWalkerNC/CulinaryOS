import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
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
  LogOut,
} from '@culinaryos/ui';

export function TabletHeaderNav() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();
  const { session, logout } = useAuth();

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

  const activeProfile = typeof window !== 'undefined' ? (localStorage.getItem('culinaryos_active_profile') || 'cheezies') : 'cheezies';
  const brandTitle = activeProfile === 'cheezies' ? 'Cheezies Gourmet' : 'Alley Katz & Half Baked';

  return (
    <>
      <header className="bg-[#181c24] border-b border-slate-800 px-4 py-2.5 flex items-center justify-between sticky top-0 z-30 shadow-md">
        {/* Left: Brand & Floor Status */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="min-h-[48px] min-w-[48px] rounded-xl bg-[#262a33] hover:bg-[#323742] text-slate-200 border border-slate-700/60 flex items-center justify-center active:scale-[0.97] transition-all cursor-pointer"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5 text-amber-400" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm text-slate-100 tracking-tight">{brandTitle}</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                Tablet Console
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">Supervisor & Manager Floor Oversight</p>
          </div>
        </div>

        {/* Center: Segmented Primary Tabs (Touch targets >= 48px) */}
        <nav className="flex items-center gap-1.5 bg-[#0a0e16] p-1 rounded-xl border border-slate-800">
          {primaryTabletTabs.map((tab) => {
            const isActive = location.pathname === tab.to;
            return (
              <NavLink
                key={tab.to}
                to={tab.to}
                className={`min-h-[44px] px-3.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all active:scale-[0.97] ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 shadow-sm font-black'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#1f242d]'
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
          <div className="px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Floor: 84% Capacity</span>
          </div>
        </div>
      </header>

      {/* Slide-over Tablet Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex bg-slate-950/70 backdrop-blur-xs animate-fadeIn">
          <div className="absolute inset-0" onClick={() => setDrawerOpen(false)} />
          <div className="relative w-80 max-w-[85vw] bg-[#0a0e16] border-r border-slate-800 text-slate-200 h-full shadow-2xl flex flex-col z-10 animate-scaleUp">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-[#181c24]">
              <div className="flex items-center gap-2">
                <Store className="w-5 h-5 text-amber-400" />
                <span className="font-extrabold text-sm text-slate-100">All Admin Modules</span>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="w-9 h-9 rounded-xl bg-[#262a33] hover:bg-[#323742] text-slate-300 flex items-center justify-center active:scale-[0.97] cursor-pointer"
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
                        ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-[#181c24]'
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </div>

            <div className="p-4 border-t border-slate-800 bg-[#181c24] text-xs text-slate-400 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-200">CulinaryOS Tablet Console</p>
                  <p className="text-[11px] text-slate-500">
                    {session?.displayName || 'Manager'} ({session?.role || 'staff'})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setDrawerOpen(false);
                    logout();
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#262a33] hover:bg-red-500/20 text-slate-300 hover:text-red-400 border border-slate-700 hover:border-red-500/40 transition-all flex items-center gap-1.5 active:scale-[0.96] cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
