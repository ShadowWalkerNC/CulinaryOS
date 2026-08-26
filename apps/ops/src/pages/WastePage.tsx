import { useState } from 'react';
import { useWasteLogs, useLogWaste, useDeleteWasteLog } from '../hooks/useWaste';
import { summarizeWaste } from '@culinaryos/waste-engine';
import type { WasteReason } from '../hooks/useWaste';

const REASONS: WasteReason[] = ['spoilage', 'trim', 'overcook', 'drop', 'expired', 'other'];

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

export default function WastePage() {
  const [days, setDays] = useState(30);
  const { data: logs = [], isLoading } = useWasteLogs(days);
  const logWaste = useLogWaste();
  const deleteLog = useDeleteWasteLog();

  const [form, setForm] = useState({
    ingredient: '',
    quantity_grams: '',
    reason: 'spoilage' as WasteReason,
    cost_per_gram: '',
    log_date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.ingredient || !form.quantity_grams) return;
    logWaste.mutate({
      ingredient: form.ingredient,
      quantity_grams: parseFloat(form.quantity_grams),
      reason: form.reason,
      cost_per_gram: parseFloat(form.cost_per_gram || '0'),
      log_date: form.log_date,
      notes: form.notes || null,
    });
    setForm(f => ({ ...f, ingredient: '', quantity_grams: '', cost_per_gram: '', notes: '' }));
  }

  const summary = summarizeWaste(
    logs.map(l => ({
      date: l.log_date,
      ingredient: l.ingredient,
      quantity: l.quantity_grams,
      reason: l.reason,
      costPerGram: l.cost_per_gram,
    }))
  );

  const inputCls = 'bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 w-full focus:outline-none focus:border-amber-500';
  const btnCls = 'bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-sm px-4 py-2 rounded-lg transition-colors';

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-1">Waste</h1>
        <p className="text-zinc-400 text-sm">Waste logging · Trend analysis · Reduction score</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Total Cost</p>
          <p className="text-2xl font-bold text-red-400">{fmt(summary.totalCost)}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Total Grams</p>
          <p className="text-2xl font-bold text-zinc-100">{summary.totalGrams.toFixed(0)}g</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Entries</p>
          <p className="text-2xl font-bold text-zinc-100">{logs.length}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Top Offender</p>
          <p className="text-lg font-semibold text-amber-400 truncate">
            {summary.topWastedIngredients[0]?.ingredient ?? '—'}
          </p>
        </div>
      </div>


      {/* Log Waste */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-zinc-300 mb-4 uppercase tracking-wide">Log Waste</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input className={inputCls} placeholder="Ingredient" value={form.ingredient} onChange={e => setForm(f => ({ ...f, ingredient: e.target.value }))} />
          <input className={inputCls} type="number" placeholder="Grams" value={form.quantity_grams} onChange={e => setForm(f => ({ ...f, quantity_grams: e.target.value }))} />
          <select className={inputCls} value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value as WasteReason }))}>
            {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <input className={inputCls} type="number" placeholder="Cost per gram ($)" value={form.cost_per_gram} onChange={e => setForm(f => ({ ...f, cost_per_gram: e.target.value }))} />
          <input className={inputCls} type="date" value={form.log_date} onChange={e => setForm(f => ({ ...f, log_date: e.target.value }))} />
          <input className={inputCls} placeholder="Notes (optional)" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          <button type="submit" className={`${btnCls} sm:col-span-3`} disabled={logWaste.isPending}>
            {logWaste.isPending ? 'Logging…' : 'Log Waste'}
          </button>
        </form>
      </section>

      {/* Waste Log Table */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wide">Waste Log</h2>
          <select
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1 text-sm text-zinc-300"
            value={days}
            onChange={e => setDays(Number(e.target.value))}
          >
            {[7, 14, 30, 90].map(d => <option key={d} value={d}>Last {d} days</option>)}
          </select>
        </div>
        {isLoading ? <p className="text-zinc-500 text-sm">Loading…</p> : logs.length === 0 ? (
          <p className="text-zinc-500 text-sm">No waste logs in this period.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-zinc-500 text-xs uppercase border-b border-zinc-800">
                <th className="text-left pb-2">Date</th>
                <th className="text-left pb-2">Ingredient</th>
                <th className="text-left pb-2">Reason</th>
                <th className="text-right pb-2">Grams</th>
                <th className="text-right pb-2">Cost</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {logs.map(l => (
                <tr key={l.id} className="border-b border-zinc-800 hover:bg-zinc-800/40">
                  <td className="py-2">{l.log_date}</td>
                  <td className="py-2">{l.ingredient}</td>
                  <td className="py-2 text-zinc-400">{l.reason}</td>
                  <td className="py-2 text-right">{l.quantity_grams.toFixed(0)}g</td>
                  <td className="py-2 text-right text-red-400">{fmt(l.quantity_grams * l.cost_per_gram)}</td>
                  <td className="py-2 text-right">
                    <button onClick={() => deleteLog.mutate(l.id)} className="text-zinc-600 hover:text-red-400 text-xs ml-4">✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
