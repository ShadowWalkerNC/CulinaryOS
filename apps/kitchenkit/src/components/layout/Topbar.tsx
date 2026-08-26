import { useLocation } from 'react-router-dom';
import { LogOut, User } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { signOut } from '@/lib/auth';

const titles: Record<string, string> = {
  '/dashboard':  'Dashboard',
  '/recipes':    'Recipes',
  '/prep':       'Prep Planner',
  '/par-levels': 'Par Levels',
};

export default function Topbar() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const base = '/' + pathname.split('/')[1];
  const title = titles[base] ?? 'KitchenKit';

  return (
    <header className="h-14 shrink-0 flex items-center justify-between px-6 border-b border-surface-border bg-surface-card">
      <h1 className="text-base font-semibold text-zinc-100">{title}</h1>

      {user && (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-sm text-zinc-400">
            <User size={14} />
            <span className="hidden sm:inline">{user.email}</span>
          </div>
          <button
            onClick={() => signOut()}
            className="btn-ghost flex items-center gap-1.5 text-xs"
            title="Sign out"
          >
            <LogOut size={13} />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      )}
    </header>
  );
}
