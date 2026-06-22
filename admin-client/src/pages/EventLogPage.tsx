import { useState } from 'react';
import { useEventLog } from '../lib/queries';
import { formatDistanceToNow, format } from 'date-fns';

const EVENT_DOT: Record<string, string> = {
  'pos:order:created':         'bg-green-500',
  'pos:order:cancelled':       'bg-red-500',
  'kds:ticket:bumped':         'bg-blue-500',
  'pos:menu:item-sold':        'bg-purple-500',
  'recipeos:pantry:low-stock': 'bg-yellow-500',
};

export function EventLogPage() {
  const { data: events, isLoading } = useEventLog();
  const [search, setSearch]         = useState('');
  const [expanded, setExpanded]     = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState('all');

  const eventTypes = ['all', ...Array.from(new Set((events ?? []).map((e: any) => e.event_type)))];

  const filtered = (events ?? []).filter((e: any) => {
    const matchType   = typeFilter === 'all' || e.event_type === typeFilter;
    const matchSearch = !search || e.event_type.includes(search) || e.event_id.includes(search);
    return matchType && matchSearch;
  });

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Event Log</h1>
        <p className="text-[#555555] text-sm">{events?.length ?? 0} events</p>
      </div>

      <div className="flex gap-3 mb-4 flex-wrap">
        <input
          value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search event type or ID…"
          className="bg-[#111111] border border-[#222222] rounded-lg px-3 py-2 text-sm text-white placeholder-[#444444] focus:outline-none focus:border-[#444444] w-64"
        />
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
          className="bg-[#111111] border border-[#222222] rounded-lg px-3 py-2 text-sm text-white focus:outline-none">
          {eventTypes.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      <div className="card overflow-auto" style={{ maxHeight: 'calc(100vh - 220px)' }}>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[#444444] text-xs uppercase">
                <th className="text-left pb-3 w-4"></th>
                <th className="text-left pb-3">Type</th>
                <th className="text-left pb-3">Source</th>
                <th className="text-left pb-3">Status</th>
                <th className="text-left pb-3">When</th>
                <th className="text-left pb-3">ID</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((ev: any) => (
                <>
                  <tr key={ev.id}
                    onClick={() => setExpanded(expanded === ev.id ? null : ev.id)}
                    className="border-t border-[#1a1a1a] cursor-pointer hover:bg-[#161616] transition-colors">
                    <td className="py-2.5 pr-3">
                      <span className={`w-2 h-2 rounded-full inline-block ${EVENT_DOT[ev.event_type] ?? 'bg-[#444444]'}`} />
                    </td>
                    <td className="py-2.5 text-white font-mono text-xs">{ev.event_type}</td>
                    <td className="py-2.5 text-[#666666] text-xs">{ev.source}</td>
                    <td className="py-2.5">
                      {ev.error
                        ? <span className="badge-out">ERROR</span>
                        : ev.processed
                        ? <span className="badge-ok">OK</span>
                        : <span className="badge-info">PENDING</span>}
                    </td>
                    <td className="py-2.5 text-[#555555] text-xs whitespace-nowrap">
                      {formatDistanceToNow(new Date(ev.created_at), { addSuffix: true })}
                    </td>
                    <td className="py-2.5 text-[#333333] font-mono text-[10px]">
                      {ev.event_id.slice(0, 8)}…
                    </td>
                  </tr>
                  {expanded === ev.id && (
                    <tr key={ev.id + '-exp'} className="bg-[#0f0f0f]">
                      <td colSpan={6} className="px-4 py-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[#555555] text-[10px] uppercase mb-1">Payload</p>
                            <pre className="text-[#888888] text-[11px] overflow-auto max-h-48 bg-[#111111] rounded p-2">
                              {JSON.stringify(ev.payload, null, 2)}
                            </pre>
                          </div>
                          <div>
                            <p className="text-[#555555] text-[10px] uppercase mb-1">Metadata</p>
                            <div className="text-[11px] space-y-1">
                              <p><span className="text-[#555555]">event_id:</span> <span className="text-[#888888] font-mono">{ev.event_id}</span></p>
                              <p><span className="text-[#555555]">version:</span>  <span className="text-[#888888]">{ev.version}</span></p>
                              <p><span className="text-[#555555]">created:</span>  <span className="text-[#888888]">{format(new Date(ev.created_at), 'PPpp')}</span></p>
                              {ev.processed_at && <p><span className="text-[#555555]">processed:</span> <span className="text-[#888888]">{format(new Date(ev.processed_at), 'PPpp')}</span></p>}
                              {ev.error && <p><span className="text-[#555555]">error:</span> <span className="text-red-400">{ev.error}</span></p>}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}
        {!isLoading && filtered.length === 0 && (
          <p className="text-center text-[#444444] py-12">No events match your filter</p>
        )}
      </div>
    </div>
  );
}
