import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Activity,
  TrendingUp,
  Clock,
  ClipboardList,
  LayoutGrid,
  UtensilsCrossed,
  Package,
  ShoppingCart,
  SlidersHorizontal,
  Users,
  ShieldCheck,
  Radio,
  Settings,
  ChevronLeft,
  ChevronRight,
  Store,
  Sparkles,
} from '@culinaryos/ui';

interface NavGroup {
  groupName: string;
  items: {
    to: string;
    label: string;
    icon: React.ReactNode;
    badge?: string;
  }[];
}

export function DesktopSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  const navGroups: NavGroup[] = [
    {
      groupName: 'Intelligence & Performance',
      items: [
        { to: '/dashboard', label: 'Executive Dashboard', icon: <Activity className="w-4 h-4" /> },
        { to: '/reports', label: 'Financials & P&L', icon: <TrendingUp className="w-4 h-4" /> },
      ],
    },
    {
      groupName: 'Operations & Floor',
      items: [
        { to: '/scheduling', label: 'Shift Roster & Labor', icon: <Clock className="w-4 h-4" /> },
        { to: '/operations', label: 'Checklists & Approvals', icon: <ClipboardList className="w-4 h-4" />, badge: '3' },
        { to: '/tools', label: 'Floor Map & Hardware', icon: <LayoutGrid className="w-4 h-4" /> },
      ],
    },
    {
      groupName: 'Catalog & Supply',
      items: [
        { to: '/menu', label: 'Menu & Recipes', icon: <UtensilsCrossed className="w-4 h-4" /> },
        { to: '/pantry', label: 'Pantry & Par Levels', icon: <Package className="w-4 h-4" /> },
        { to: '/purchasing', label: 'Purchasing & Vendors', icon: <ShoppingCart className="w-4 h-4" /> },
        { to: '/data', label: 'Bulk Data Actions', icon: <SlidersHorizontal className="w-4 h-4" /> },
      ],
    },
    {
      groupName: 'Administration & System',
      items: [
        { to: '/staff', label: 'Staff & Talent ATS', icon: <Users className="w-4 h-4" /> },
        { to: '/roles', label: 'RBAC Roles & Matrix', icon: <ShieldCheck className="w-4 h-4" /> },
        { to: '/health', label: 'System Health & Repair', icon: <Activity className="w-4 h-4" /> },
        { to: '/integrations', label: 'Integrations Hub', icon: <Radio className="w-4 h-4" /> },
        { to: '/settings', label: 'Settings & Tax Routing', icon: <Settings className="w-4 h-4" /> },
      ],
    },
  ];

  return (
    <aside
      className={`bg-slate-950 text-slate-300 border-r border-slate-800 flex flex-col shrink-0 transition-all duration-200 select-none h-full ${
        collapsed ? 'w-18' : 'w-64'
      }`}
    >
      {/* Brand & Multi-Unit Header */}
      <div className="p-4 border-b border-slate-800/80 flex items-center justify-between shrink-0 bg-[#0a0e16]">
        {!collapsed ? (
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] shrink-0">
              <Store className="w-5 h-5 text-slate-950" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-sm text-slate-100 tracking-tight truncate">
                  CulinaryOS
                </span>
              </div>
              <p className="text-[10px] text-amber-400/90 font-bold uppercase tracking-wider">
                Kitchen Intelligence
              </p>
            </div>
          </div>
        ) : (
          <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black mx-auto shadow-md">
            <Store className="w-5 h-5 text-slate-950" />
          </div>
        )}

        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className={`p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer ${
            collapsed ? 'mx-auto mt-2' : ''
          }`}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Links by Group */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5 scrollbar-thin scrollbar-thumb-slate-800">
        {navGroups.map((group) => (
          <div key={group.groupName} className="space-y-1">
            {!collapsed && (
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-1.5">
                {group.groupName}
              </p>
            )}
            {group.items.map((item) => {
              const isActive = location.pathname === item.to;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-100 ${
                    isActive
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900'
                  } ${collapsed ? 'justify-center px-0' : ''}`}
                  title={collapsed ? item.label : undefined}
                >
                  <span className={`shrink-0 ${isActive ? 'text-slate-950' : 'text-slate-400'}`}>
                    {item.icon}
                  </span>
                  {!collapsed && <span className="truncate flex-1">{item.label}</span>}
                  {!collapsed && item.badge && (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isActive ? 'bg-slate-950 text-amber-400' : 'bg-amber-500 text-slate-950'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </div>

      {/* Footer System Telemetry Status (PRD Live Link) */}
      <div className="p-3 border-t border-slate-800/80 bg-[#0a0e16] shrink-0">
        {!collapsed ? (
          <div className="bg-[#181c24] rounded-xl p-2.5 border border-slate-800 text-[11px] flex items-center justify-between shadow-inner">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <div>
                <p className="font-semibold text-slate-200">Telemetry Sync</p>
                <p className="text-[10px] text-slate-400 font-mono">0.4s • Live link</p>
              </div>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              Online
            </span>
          </div>
        ) : (
          <div className="flex justify-center" title="0.4s • Live link">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>
        )}
      </div>
    </aside>
  );
}
