import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  BookOpen,
  ClipboardList,
  Scale,
  History,
  ChefHat,
  Menu,
  X,
  LogOut,
  Store,
  Clock,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

const NAV_ITEMS = [
  { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard',    end: true  },
  { to: '/recipes',      icon: BookOpen,         label: 'Recipes',      end: false },
  { to: '/prep',         icon: ClipboardList,    label: 'Prep Planner', end: true  },
  { to: '/prep/history', icon: History,          label: 'Prep History', end: false },
  { to: '/par-levels',   icon: Scale,            label: 'Par Levels',   end: false },
  { to: '/vendors',      icon: Store,            label: 'Vendors',      end: false },
  { to: '/shelf-life',   icon: Clock,            label: 'Shelf Life',   end: false },
];

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
    isActive
      ? 'bg-[var(--color-primary-highlight)] text-[var(--color-primary)]'
      : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-offset)] hover:text-[var(--color-text)]'
  }`;

export function Sidebar() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setOpen(false); }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  const handleSignOut = async () => { await supabase.auth.signOut(); };

  const NavContent = () => (
    <>
      <div className="flex items-center gap-2 px-3 py-4 border-b border-[var(--color-divider)]">
        <ChefHat className="w-6 h-6 text-[var(--color-primary)]" />
        <span className="font-semibold text-[var(--color-text)] text-base">KitchenKit</span>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
        {NAV_ITEMS.map(({ to, icon: Icon, label, end }) => (
          <NavLink key={to} to={to} end={end} className={linkClass}>
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="px-2 py-3 border-t border-[var(--color-divider)]">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-surface-offset)] hover:text-[var(--color-text)] transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Sign out
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 shrink-0 h-screen sticky top-0 bg-[var(--color-surface)] border-r border-[var(--color-divider)]">
        <NavContent />
      </aside>

      {/* Mobile top bar */}
      <header className="md:hidden flex items-center justify-between px-4 h-14 bg-[var(--color-surface)] border-b border-[var(--color-divider)] sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <ChefHat className="w-5 h-5 text-[var(--color-primary)]" />
          <span className="font-semibold text-[var(--color-text)] text-sm">KitchenKit</span>
        </div>
        <button
          onClick={() => setOpen(true)}
          aria-label="Open navigation"
          className="p-2 rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-surface-offset)] transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
      </header>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden fixed inset-0 z-40 flex" role="dialog" aria-modal="true" aria-label="Navigation menu">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div ref={drawerRef} className="relative flex flex-col w-64 h-full bg-[var(--color-surface)] shadow-xl z-50">
            <button
              onClick={() => setOpen(false)}
              aria-label="Close navigation"
              className="absolute top-3 right-3 p-2 rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-surface-offset)] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <NavContent />
          </div>
        </div>
      )}
    </>
  );
}

export default Sidebar;
