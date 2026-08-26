import { useDashboard } from '../hooks/useDashboard';

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent: string;
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <p className="text-xs text-zinc-500 uppercase tracking-wide mb-2">{label}</p>
      <p className={`text-3xl font-bold ${accent}`}>{value}</p>
      {sub && <p className="text-xs text-zinc-500 mt-1">{sub}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const { data, isLoading, error } = useDashboard();

  if (isLoading)
    return (
      <div className="flex h-64 items-center justify-center text-zinc-400 text-sm">
        Loading operations data…
      </div>
    );

  if (error)
    return (
      <div className="bg-red-950 border border-red-800 rounded-xl p-6 text-red-300 text-sm">
        Failed to load dashboard. {String(error)}
      </div>
    );

  const fmt = (n: number | null, suffix = '%') =>
    n == null ? '—' : `${n.toFixed(1)}${suffix}`;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Dashboard</h1>
      <p className="text-zinc-400 text-sm mb-8">Operations overview · last 7 days</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Labor Cost %"
          value={fmt(data?.laborPct ?? null)}
          sub="of estimated revenue"
          accent="text-amber-400"
        />
        <StatCard
          label="Avg Food Cost %"
          value={fmt(data?.avgFoodCostPct ?? null)}
          sub="across active menu items"
          accent="text-amber-400"
        />
        <StatCard
          label="Waste This Week"
          value={fmt(data?.wasteCost ?? null, '')}
          sub={data?.wasteGrams != null ? `${data.wasteGrams.toFixed(0)} g` : undefined}
          accent="text-red-400"
        />
        <StatCard
          label="Open POs"
          value={String(data?.openPOs ?? '—')}
          sub="draft + sent"
          accent="text-zinc-100"
        />
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <p className="text-zinc-400 text-sm">
          Data refreshes every 60 seconds. Use the sidebar to drill into each module.
        </p>
      </div>
    </div>
  );
}
