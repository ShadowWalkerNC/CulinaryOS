import { BookOpen, ClipboardList, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useAuth } from '@/context/AuthContext';

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: stats, isLoading } = useDashboardStats();

  const displayName = user?.email?.split('@')[0] ?? 'Chef';

  const cards = [
    {
      label: 'Recipes',
      value: stats?.recipeCount ?? 0,
      icon: BookOpen,
      href: '/recipes',
      color: 'text-brand-400',
    },
    {
      label: 'Active Plans',
      value: stats?.activePlansCount ?? 0,
      icon: ClipboardList,
      href: '/prep',
      color: 'text-emerald-400',
    },
    {
      label: 'Completed Today',
      value: stats?.completedToday ?? 0,
      icon: CheckCircle2,
      href: '/prep',
      color: (stats?.completedToday ?? 0) > 0 ? 'text-emerald-400' : 'text-zinc-600',
    },
    {
      label: 'Below Par',
      value: stats?.belowParCount ?? 0,
      icon: AlertTriangle,
      href: '/prep',
      color: (stats?.belowParCount ?? 0) > 0 ? 'text-amber-400' : 'text-zinc-600',
    },
  ];

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h2 className="text-xl font-bold text-zinc-100">
          {isLoading ? 'Loading...' : `Welcome back, ${displayName} 👋`}
        </h2>
        <p className="mt-1 text-sm text-zinc-400">Here’s what’s on deck for today.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(({ label, value, icon: Icon, href, color }) => (
          <Link key={label} to={href} className="card hover:border-brand-600/50 transition-colors group">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{label}</span>
              <Icon size={16} className={`${color} transition-colors`} />
            </div>
            <p className="text-xl font-bold tabular-nums text-zinc-100">
              {isLoading ? <span className="text-zinc-600 text-lg">…</span> : value}
            </p>
          </Link>
        ))}
      </div>

      {/* Below-par alert */}
      {(stats?.belowParCount ?? 0) > 0 && (
        <div className="card border-amber-500/30 bg-amber-500/5">
          <div className="flex items-center gap-3">
            <AlertTriangle size={18} className="text-amber-400 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-zinc-100">
                {stats!.belowParCount} ingredient{stats!.belowParCount !== 1 ? 's' : ''} below par level
              </p>
              <p className="text-xs text-zinc-500 mt-0.5">
                Build a prep plan to calculate what needs to be prepped today.
              </p>
              <Link to="/prep" className="text-xs text-amber-400 hover:text-amber-300 transition-colors mt-1 inline-block">
                Open prep planner →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div>
        <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          <Link to="/recipes" className="btn-primary text-sm">+ New Recipe</Link>
          <Link to="/prep" className="btn-primary text-sm">+ Build Prep Plan</Link>
        </div>
      </div>

      {/* Ratio engine callout */}
      <div className="card border-brand-600/30 bg-brand-600/5">
        <div className="flex items-start gap-3">
          <span className="text-xl">🧠</span>
          <div>
            <h3 className="font-semibold text-zinc-100 mb-1">Ratio Blueprint Engine</h3>
            <p className="text-sm text-zinc-400">
              KitchenKit stores recipes as{' '}
              <span className="text-brand-400 font-mono">ratios</span>, not absolute weights.
              Scale any recipe to any batch size with zero rounding drift.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
