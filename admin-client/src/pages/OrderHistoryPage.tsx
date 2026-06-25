import { useState } from 'react';
import { useOrderHistory } from '../lib/queries';
import { formatDistanceToNow, format } from 'date-fns';

const STATUS_BADGE: Record<string, string> = {
  open:        'badge-info',
  sent:        'badge-ok',
  'in-progress': 'badge-ok',
  ready:       'badge-ok',
  paid:        'badge-ok',
  voided:      'badge-out',
};

export function OrderHistoryPage() {
  const { data: orders, isLoading } = useOrderHistory();
  const [expanded, setExpanded]     = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch]             = useState('');

  const filtered = (orders ?? []).filter((o: any) => {
    const matchStatus = statusFilter === 'all' || o.status === statusFilter;
    const matchSearch = !search ||
      o.id.includes(search) ||
      (o.table_number && String(o.table_number).includes(search)) ||
      (o.server_name  && o.server_name.toLowerCase().includes(search.toLowerCase()));
    return matchStatus && matchSearch;
  });

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Order History</h1>
        <p className="text-[#555555] text-sm">{orders?.length ?? 0} orders</p>
      </div>

      <div className="flex gap-3 mb-4 flex-wrap">
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search table, server, ID…"
          className="bg-[#111111] border border-[#222222] rounded-lg px-3 py-2 text-sm text-white placeholder-[#444444] focus:outline-none focus:border-[#444444] w-64" />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-[#111111] border border-[#222222] rounded-lg px-3 py-2 text-sm text-white focus:outline-none">
          {['all','open','sent','in-progress','ready','paid','voided'].map((s) => (
            <option key={s} value={s}>{s}</option>
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
                <th className="text-left pb-3">Table</th>
                <th className="text-left pb-3">Server</th>
                <th className="text-left pb-3">Items</th>
                <th className="text-right pb-3">Total</th>
                <th className="text-left pb-3">Status</th>
                <th className="text-left pb-3">When</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((order: any) => (
                <>
                  <tr key={order.id}
                    onClick={() => setExpanded(expanded === order.id ? null : order.id)}
                    className="border-t border-[#1a1a1a] cursor-pointer hover:bg-[#161616] transition-colors">
                    <td className="py-2.5 text-white font-bold">
                      {order.table_number ? `T${order.table_number}` : 'T/A'}
                    </td>
                    <td className="py-2.5 text-[#888888]">{order.server_name ?? '—'}</td>
                    <td className="py-2.5 text-[#888888]">{order.items?.filter((i:any) => !i.is_voided).length ?? 0}</td>
                    <td className="py-2.5 text-right text-white font-semibold">
                      ${((order.total ?? 0) / 100).toFixed(2)}
                    </td>
                    <td className="py-2.5">
                      <span className={STATUS_BADGE[order.status] ?? 'badge-info'}>
                        {order.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-2.5 text-[#555555] text-xs">
                      {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
                    </td>
                  </tr>
                  {expanded === order.id && (
                    <tr key={order.id + '-exp'} className="bg-[#0f0f0f]">
                      <td colSpan={6} className="px-4 py-3">
                        <div className="grid grid-cols-2 gap-6">
                          <div>
                            <p className="text-[#555555] text-[10px] uppercase mb-2">Line Items</p>
                            {order.items?.map((item: any) => (
                              <div key={item.id} className={`flex justify-between py-1 text-xs border-b border-[#1a1a1a] ${
                                item.is_voided ? 'opacity-30 line-through' : ''
                              }`}>
                                <span className="text-white">{item.quantity}x {item.name}</span>
                                <span className="text-[#888888]">${(item.line_total / 100).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                          <div>
                            <p className="text-[#555555] text-[10px] uppercase mb-2">Details</p>
                            <div className="text-xs space-y-1">
                              <p><span className="text-[#555555]">ID:</span> <span className="text-[#888888] font-mono">{order.id.slice(0, 16)}…</span></p>
                              <p><span className="text-[#555555]">Covers:</span> <span className="text-[#888888]">{order.cover_count ?? '—'}</span></p>
                              <p><span className="text-[#555555]">Subtotal:</span> <span className="text-[#888888]">${((order.subtotal ?? 0)/100).toFixed(2)}</span></p>
                              <p><span className="text-[#555555]">Tax:</span> <span className="text-[#888888]">${((order.tax ?? 0)/100).toFixed(2)}</span></p>
                              <p><span className="text-[#555555]">Total:</span> <span className="text-white font-bold">${((order.total ?? 0)/100).toFixed(2)}</span></p>
                              {order.paid_at && <p><span className="text-[#555555]">Paid:</span> <span className="text-green-400">{format(new Date(order.paid_at), 'PPpp')}</span></p>}
                              {order.void_reason && <p><span className="text-[#555555]">Void reason:</span> <span className="text-red-400">{order.void_reason}</span></p>}
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
          <p className="text-center text-[#444444] py-12">No orders match your filter</p>
        )}
      </div>
    </div>
  );
}
