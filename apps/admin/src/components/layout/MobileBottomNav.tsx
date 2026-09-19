import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Activity,
  ClipboardList,
  Plus,
  Users,
  UtensilsCrossed,
} from '@culinaryos/ui';

interface MobileBottomNavProps {
  onOpenQuickActions: () => void;
  pendingApprovalsCount?: number;
}

export function MobileBottomNav({
  onOpenQuickActions,
  pendingApprovalsCount = 3,
}: MobileBottomNavProps) {
  const location = useLocation();

  const navItems = [
    {
      to: '/dashboard',
      label: 'Pulse',
      icon: <Activity className="w-5 h-5" />,
    },
    {
      to: '/operations',
      label: 'Tasks',
      icon: <ClipboardList className="w-5 h-5" />,
      badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : undefined,
    },
    {
      to: '/scheduling',
      label: 'Roster',
      icon: <Users className="w-5 h-5" />,
    },
    {
      to: '/menu',
      label: 'Menu',
      icon: <UtensilsCrossed className="w-5 h-5" />,
    },
  ];

  return (
    <nav
      aria-label="Mobile Bottom Navigation"
      className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-slate-200 z-40 shadow-lg px-2 pb-safe select-none"
    >
      <div className="flex items-center justify-around h-16 max-w-md mx-auto">
        {/* Left Two Tabs */}
        {navItems.slice(0, 2).map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`flex-1 flex flex-col items-center justify-center min-h-[48px] py-1 transition-transform active:scale-[0.97] duration-75 relative ${
                isActive ? 'text-orange-600 font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <div className="relative">
                {item.icon}
                {item.badge && (
                  <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[9px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-white">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight">{item.label}</span>
              {isActive && (
                <span className="absolute bottom-1 w-1 h-1 rounded-full bg-orange-600" />
              )}
            </NavLink>
          );
        })}

        {/* Center Thumb-Zone Quick Action Trigger */}
        <div className="flex-1 flex justify-center -mt-5">
          <button
            type="button"
            onClick={onOpenQuickActions}
            aria-label="Open Quick Operational Actions"
            className="w-13 h-13 min-h-[48px] min-w-[48px] rounded-full bg-slate-950 hover:bg-slate-800 text-white shadow-xl flex items-center justify-center border-3 border-white active:scale-[0.93] transition-transform duration-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
          >
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </button>
        </div>

        {/* Right Two Tabs */}
        {navItems.slice(2, 4).map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`flex-1 flex flex-col items-center justify-center min-h-[48px] py-1 transition-transform active:scale-[0.97] duration-75 relative ${
                isActive ? 'text-orange-600 font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <div>{item.icon}</div>
              <span className="text-[10px] mt-0.5 tracking-tight">{item.label}</span>
              {isActive && (
                <span className="absolute bottom-1 w-1 h-1 rounded-full bg-orange-600" />
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
