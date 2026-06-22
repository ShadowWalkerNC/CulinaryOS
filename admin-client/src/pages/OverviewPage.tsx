import { StatCard }       from '../components/StatCard';
import { useOverviewStats, useRevenueChart } from '../lib/queries';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { formatDistanceToNow } from 'date-fns';

const EVENT_COLORS: Record<string, string> = {
  'pos:order:created':         '#22c55e',
  'pos:order:cancelled':       '#ef4444',
  'kds:ticket:bumped':         '#3b82f6',
  'pos:menu:item-sold':        '#a855f7',
  'recipeos:pantry:low-stock': '#f59e0b',
};

export function OverviewPage() {
  const { data: stats, isLoading } = useOverviewStats();
  const { data: chart }            = useRevenueChart();

  if (isLoading || !stats) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-white mb-6">Overview</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Today’s Revenue"
          value={`$${(stats.revenue / 100).toFixed(2)}`}
          sub={`${stats.paidCount} paid orders`}
          accent="#22c55e"
        />
        <StatCard
          label="Total Orders"
          value={stats.orderCount}
          sub="last 24 hours"
        />
        <StatCard
          label="Active Tickets"
          value={stats.activeTickets}
          sub={`${stats.bumpedTickets} bumped`}
          accent={stats.activeTickets > 10 ? '#ef4444' : '#ffffff'}
        />
        <StatCard
          label="Low Stock Items"
          value={stats.lowStockItems.length}
          sub={stats.lowStockItems.length > 0 ? 'Needs attention' : 'All good'}
          accent={stats.lowStockItems.length > 0 ? '#f59e0b' : '#22c55e'}
        />
      </div>

      {/* Revenue chart */}
      <div className="card mb-8">
        <p className="text-[#888888] text-xs font-semibold tracking-wide uppercase mb-4">Revenue — Last 7 Days</p>
        {chart && chart.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chart} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="date" tick={{ fill: '#555555', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#555555', fontSize: 11 }} axisLine={false} tickLine={false}
                tickFormatter={(v) => `$${(v / 100).toFixed(0)}`} />
              <Tooltip
                contentStyle={{ background: '#111111', border: '1px solid #333333', borderRadius: 8, fontSize: 12 }}
                formatter={(v: number) => [`$${(v / 100).toFixed(2)}`, 'Revenue']}
                labelStyle={{ color: '#888888' }}
              />
              <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                {(chart ?? []).map((_, i) => <Cell key={i} fill="#22c55e" />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-[#444444] text-sm">No paid orders in the last 7 days</p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low stock */}
        {stats.lowStockItems.length > 0 && (
          <div className="card">
            <p className="text-[#888888] text-xs font-semibold tracking-wide uppercase mb-3">Low Stock Alerts</p>
            <div className="space-y-2">
              {stats.lowStockItems.map((item: any) => (
                <div key={item.id} className="flex items-center justify-between py-1">
                  <span className="text-white text-sm">{item.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[#888888] text-xs">{item.current_qty}{item.unit}</span>
                    <span className={item.stock_status === 'out_of_stock' ? 'badge-out' : 'badge-low'}>
                      {item.stock_status === 'out_of_stock' ? 'OUT' : 'LOW'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent events */}
        <div className="card">
          <p className="text-[#888888] text-xs font-semibold tracking-wide uppercase mb-3">Recent Events</p>
          <div className="space-y-1.5">
            {stats.recentEvents.map((ev: any) => (
              <div key={ev.id} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: EVENT_COLORS[ev.event_type] ?? '#555555' }} />
                  <span className="text-xs text-[#888888] truncate">{ev.event_type}</span>
                  {ev.error && <span className="badge-out text-[10px]">ERR</span>}
                </div>
                <span className="text-[#444444] text-[10px] flex-shrink-0">
                  {formatDistanceToNow(new Date(ev.created_at), { addSuffix: true })}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
