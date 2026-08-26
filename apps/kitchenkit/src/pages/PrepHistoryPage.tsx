import { History, ChevronDown, ChevronUp, Loader2, CheckCircle2, Circle } from 'lucide-react';
import { useState } from 'react';
import { usePrepHistory } from '@/hooks/usePrepHistory';

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });
}

function formatTime(isoStr: string | null) {
  if (!isoStr) return '—';
  return new Date(isoStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function PrepHistoryPage() {
  const { data, isLoading, error, page, nextPage, prevPage } = usePrepHistory();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-zinc-100">Prep History</h2>
        <p className="text-sm text-zinc-500 mt-0.5">Completed prep plans, most recent first.</p>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="animate-spin text-brand-500" size={24} />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="card border-red-500/20 bg-red-500/5">
          <p className="text-sm text-red-400">Failed to load history: {(error as Error).message}</p>
        </div>
      )}

      {/* Empty */}
      {!isLoading && !error && data?.plans.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-14 h-14 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center mb-4">
            <History size={24} className="text-zinc-600" />
          </div>
          <h3 className="text-lg font-semibold text-zinc-300 mb-1">No completed plans yet</h3>
          <p className="text-sm text-zinc-500 max-w-xs">
            Completed prep plans will appear here after you hit "Complete Shift" in the Prep Planner.
          </p>
        </div>
      )}

      {/* Plan list */}
      {!isLoading && !error && data && data.plans.length > 0 && (
        <div className="space-y-2">
          {data.plans.map((plan) => {
            const isOpen    = expanded.has(plan.id);
            const doneCount = plan.items.filter((i) => i.is_done).length;
            return (
              <div key={plan.id} className="card p-0 overflow-hidden">
                {/* Row header */}
                <button
                  onClick={() => toggle(plan.id)}
                  className="w-full flex items-center gap-4 px-4 py-3.5 text-left hover:bg-surface/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-zinc-200">{formatDate(plan.plan_date)}</span>
                      <span className="badge bg-brand-600/20 text-brand-300">{plan.shift}</span>
                    </div>
                    <p className="text-xs text-zinc-600 mt-0.5">
                      Completed {formatTime(plan.completed_at)}
                      {' · '}
                      {doneCount} / {plan.items.length} items done
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="badge bg-emerald-600/20 text-emerald-400">✓ Complete</span>
                    {isOpen
                      ? <ChevronUp size={15} className="text-zinc-500" />
                      : <ChevronDown size={15} className="text-zinc-500" />
                    }
                  </div>
                </button>

                {/* Expanded item list */}
                {isOpen && (
                  <div className="border-t border-surface-border px-4 py-3 space-y-1">
                    {plan.items.length === 0 ? (
                      <p className="text-sm text-zinc-600">No items recorded.</p>
                    ) : (
                      plan.items.map((item) => (
                        <div key={item.id} className="flex items-center gap-2.5 py-1.5">
                          {item.is_done
                            ? <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                            : <Circle       size={14} className="text-zinc-700 shrink-0" />
                          }
                          <span className={`flex-1 text-sm ${
                            item.is_done ? 'text-zinc-500 line-through' : 'text-zinc-300'
                          }`}>
                            {item.ingredient_name}
                          </span>
                          <span className="text-sm tabular-nums text-zinc-500">
                            {item.prep_amount} {item.unit}
                          </span>
                          {item.done_at && (
                            <span className="text-xs text-zinc-700">{formatTime(item.done_at)}</span>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {!isLoading && data && (
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={prevPage}
            disabled={page === 0}
            className="btn-ghost text-sm disabled:opacity-30"
          >
            ← Newer
          </button>
          <span className="text-xs text-zinc-600">Page {page + 1}</span>
          <button
            onClick={nextPage}
            disabled={!data.hasMore}
            className="btn-ghost text-sm disabled:opacity-30"
          >
            Older →
          </button>
        </div>
      )}
    </div>
  );
}
