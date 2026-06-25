import { useState } from 'react';
import { usePantryStatus, usePantryLedger } from '../lib/queries';
import { formatDistanceToNow } from 'date-fns';

const STATUS_BADGE: Record<string, string> = {
  ok:           'badge-ok',
  low_stock:    'badge-low',
  out_of_stock: 'badge-out',
};

const STATUS_LABEL: Record<string, string> = {
  ok:           'OK',
  low_stock:    'LOW',
  out_of_stock: 'OUT',
};

export function PantryPage() {
  const { data: pantry, isLoading } = usePantryStatus();
  const [selected, setSelected]     = useState<string | undefined>(undefined);
  const { data: ledger }            = usePantryLedger(selected);
  const [filter, setFilter]         = useState<'all' | 'low_stock' | 'out_of_stock'>('all');

  const filtered = (pantry ?? []).filter((item: any) =>
    filter === 'all' ? true : item.stock_status === filter
  );

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Pantry</h1>
        <div className="flex gap-2">
          {(['all','low_stock','out_of_stock'] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded text-xs font-bold transition-colors ${
                filter === f ? 'bg-[#222222] text-white' : 'text-[#555555] hover:text-white'
              }`}>
              {f === 'all' ? 'All' : f === 'low_stock' ? 'Low' : 'Out'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ingredient list */}
        <div className="card overflow-auto" style={{ maxHeight: '70vh' }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[#444444] text-xs uppercase">
                <th className="text-left pb-3">Ingredient</th>
                <th className="text-right pb-3">Qty</th>
                <th className="text-right pb-3">Reorder At</th>
                <th className="text-right pb-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item: any) => (
                <tr key={item.id}
                  onClick={() => setSelected(selected === item.id ? undefined : item.id)}
                  className={`border-t border-[#1a1a1a] cursor-pointer hover:bg-[#161616] transition-colors ${
                    selected === item.id ? 'bg-[#161616]' : ''
                  }`}>
                  <td className="py-2.5 text-white">{item.name}</td>
                  <td className="py-2.5 text-right text-[#888888]">
                    <span className={item.stock_status !== 'ok' ? 'text-red-400 font-semibold' : ''}>
                      {item.current_qty}
                    </span>
                    <span className="text-[#555555] text-xs ml-1">{item.unit}</span>
                  </td>
                  <td className="py-2.5 text-right text-[#555555] text-xs">{item.reorder_at}{item.unit}</td>
                  <td className="py-2.5 text-right">
                    <span className={STATUS_BADGE[item.stock_status]}>
                      {STATUS_LABEL[item.stock_status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="text-center text-[#444444] text-sm py-8">No items match this filter</p>
          )}
        </div>

        {/* Ledger */}
        <div className="card overflow-auto" style={{ maxHeight: '70vh' }}>
          <p className="text-[#888888] text-xs font-semibold tracking-wide uppercase mb-3">
            {selected
              ? `Ledger — ${(pantry ?? []).find((i: any) => i.id === selected)?.name ?? ''}`
              : 'Ledger — All Ingredients'}
          </p>
          {selected && (
            <button onClick={() => setSelected(undefined)}
              className="text-xs text-[#555555] hover:text-white mb-3">
              ← Show all
            </button>
          )}
          <div className="space-y-1.5">
            {(ledger ?? []).map((entry: any) => (
              <div key={entry.id} className="flex items-center justify-between py-1 border-b border-[#1a1a1a] last:border-0">
                <div>
                  <p className="text-white text-xs font-medium">{entry.ingredient?.name}</p>
                  <p className="text-[#555555] text-[11px]">{entry.reason} • {entry.recorded_by}</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold ${
                    entry.delta < 0 ? 'text-red-400' : 'text-green-400'
                  }`}>
                    {entry.delta > 0 ? '+' : ''}{entry.delta} {entry.ingredient?.unit}
                  </p>
                  <p className="text-[#444444] text-[10px]">
                    {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
            {(!ledger || ledger.length === 0) && (
              <p className="text-[#444444] text-sm text-center py-6">No ledger entries yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
