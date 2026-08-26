import { Outlet, NavLink } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const NAV = [
  { to: '/',          label: '⚡ Dashboard' },
  { to: '/labor',     label: '👥 Labor'     },
  { to: '/food-cost', label: '💰 Food Cost' },
  { to: '/vendor',    label: '🚚 Vendors'   },
  { to: '/waste',     label: '♻️ Waste'     },
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
          {NAV.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `block px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-amber-500/20 text-amber-400 font-medium'
                    : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="px-3 py-4 border-t border-zinc-800">
          <button
            onClick={() => supabase.auth.signOut()}
            className="w-full text-left px-3 py-2 text-sm text-zinc-500 hover:text-zinc-300 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto bg-zinc-950 p-8">
        <Outlet />
      </main>
    </div>
  );
}
