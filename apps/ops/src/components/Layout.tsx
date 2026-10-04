import { Outlet, NavLink } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Button, LayoutGrid, Users, DollarSign, Package, Trash2, CulinaryAppLauncher } from '@culinaryos/ui';

const NAV = [
  { to: '/',          label: 'Dashboard',  Icon: LayoutGrid },
  { to: '/labor',     label: 'Labor',      Icon: Users      },
  { to: '/food-cost', label: 'Food Cost',  Icon: DollarSign },
  { to: '/vendor',    label: 'Vendors',    Icon: Package    },
  { to: '/waste',     label: 'Waste',      Icon: Trash2     },
];

export default function Layout() {
  return (
    <div className="dark flex flex-col md:flex-row h-dvh">
      {/* Sidebar */}
      <aside className="hidden md:flex w-56 shrink-0 bg-zinc-900 border-r border-zinc-800 flex-col">
        <div className="px-5 py-5 border-b border-zinc-800">
          <span className="text-lg font-bold tracking-tight">CulinaryOps</span>
          <p className="text-xs text-zinc-500 mt-0.5">Operations Platform</p>
        </div>
        <nav aria-label="Operations navigation" className="flex-1 px-3 py-4 space-y-2">
          {NAV.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `min-h-[48px] flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400 ${
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
      <header className="md:hidden flex items-center justify-between gap-2 px-4 py-2 bg-zinc-900 border-b border-zinc-800 shrink-0">
        <span className="font-bold">CulinaryOps</span>
        <CulinaryAppLauncher activeApp="ops" tone="dark" />
        <Button variant="ghost" onClick={() => supabase.auth.signOut()} className="text-zinc-200">Sign out</Button>
      </header>
      <main className="flex-1 min-w-0 min-h-0 overflow-auto bg-zinc-950 p-4 md:p-8 pb-24 md:pb-8">
        <Outlet />
      </main>
      <nav aria-label="Operations navigation" className="md:hidden fixed bottom-0 inset-x-0 z-30 grid grid-cols-5 gap-2 border-t border-zinc-800 bg-zinc-900 px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {NAV.map(({ to, label, Icon }) => (
          <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `min-h-[48px] min-w-0 flex flex-col items-center justify-center gap-1 rounded-lg text-[10px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400 ${isActive ? 'bg-amber-500/20 text-amber-400' : 'text-zinc-300 hover:bg-zinc-800'}`}>
            <Icon className="h-5 w-5" aria-hidden="true" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
