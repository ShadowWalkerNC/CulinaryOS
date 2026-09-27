import { Outlet, NavLink } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Button, LayoutGrid, Users, DollarSign, Package, Trash2 } from '@culinaryos/ui';

const NAV = [
  { to: '/',          label: 'Dashboard',  Icon: LayoutGrid },
  { to: '/labor',     label: 'Labor',      Icon: Users      },
  { to: '/food-cost', label: 'Food Cost',  Icon: DollarSign },
  { to: '/vendor',    label: 'Vendors',    Icon: Package    },
  { to: '/waste',     label: 'Waste',      Icon: Trash2     },
];

export default function Layout() {
  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-56 bg-zinc-900 border-r border-zinc-800 flex flex-col">
        <div className="px-5 py-5 border-b border-zinc-800">
          <span className="text-lg font-bold tracking-tight">CulinaryOps</span>
          <p className="text-xs text-zinc-500 mt-0.5">Operations Platform</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-amber-500/20 text-amber-400 font-medium'
                    : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="px-3 py-4 border-t border-zinc-800">
          <Button
            onClick={() => supabase.auth.signOut()}
            variant="ghost"
            className="w-full justify-start rounded-lg px-3 py-2 text-sm font-normal text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
          >
            Sign out
          </Button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto bg-zinc-950 p-8">
        <Outlet />
      </main>
    </div>
  );
}
