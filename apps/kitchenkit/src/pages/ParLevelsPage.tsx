import { Plus, Loader2, Pencil, Trash2, Scale } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@culinaryos/ui';
import { useParLevels, type DBParLevel } from '@/hooks/useParLevels';
import { useDeleteParLevel } from '@/hooks/useParLevels';
import ParLevelModal from '@/components/prep/ParLevelModal';

export default function ParLevelsPage() {
  const { data: parLevels = [], isLoading, error } = useParLevels();
  const { mutate: deleteParLevel, isPending: isDeleting } = useDeleteParLevel();

  const [showAdd, setShowAdd]             = useState(false);
  const [editing, setEditing]             = useState<DBParLevel | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<DBParLevel | null>(null);

  const sorted = [...parLevels].sort((a, b) =>
    a.ingredient_name.localeCompare(b.ingredient_name)
  );

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-zinc-100">Par Levels</h2>
          <p className="text-sm text-zinc-500 mt-0.5">
            Set target stock levels — the Prep Planner calculates what to make from these.
          </p>
        </div>
        <Button
          variant="brand"
          onClick={() => setShowAdd(true)}
          className="shrink-0 bg-brand-600 text-sm hover:bg-brand-700"
        >
          <Plus size={15} /> Add Item
        </Button>
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
          <p className="text-sm text-red-400">Failed to load par levels: {(error as Error).message}</p>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && sorted.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-14 h-14 rounded-full bg-brand-600/10 border border-brand-600/20 flex items-center justify-center mb-4">
            <Scale size={24} className="text-brand-400" />
          </div>
          <h3 className="text-lg font-semibold text-zinc-300 mb-1">No par levels set</h3>
          <p className="text-sm text-zinc-500 mb-6 max-w-xs">
            Add your first ingredient par level to start generating automatic prep plans.
          </p>
          <Button variant="brand" onClick={() => setShowAdd(true)} className="bg-brand-600 text-sm hover:bg-brand-700">
            + Add First Item
          </Button>
        </div>
      )}

      {/* Table */}
      {!isLoading && !error && sorted.length > 0 && (
        <div className="card">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-zinc-500 uppercase tracking-wider border-b border-surface-border">
                <th className="text-left pb-3">Ingredient</th>
                <th className="text-right pb-3">Current Stock</th>
                <th className="text-right pb-3">Par Amount</th>
                <th className="text-right pb-3">Unit</th>
                <th className="text-right pb-3">Shifts</th>
                <th className="pb-3 w-16" />
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {sorted.map((item) => (
                <tr key={item.id} className="group hover:bg-surface/40 transition-colors">
                  <td className="py-3 font-medium text-zinc-200">{item.ingredient_name}</td>
                  <td className="py-3 text-right tabular-nums text-zinc-400">{item.current_stock}</td>
                  <td className="py-3 text-right tabular-nums text-zinc-400">{item.par_amount}</td>
                  <td className="py-3 text-right text-zinc-500">{item.unit}</td>
                  <td className="py-3 text-right">
                    <div className="flex gap-1 justify-end flex-wrap">
                      {(item.shifts ?? []).length === 0 ? (
                        <span className="text-zinc-600 text-xs">all</span>
                      ) : (
                        (item.shifts ?? []).map((s: string) => (
                          <span key={s} className="badge bg-zinc-800 text-zinc-500 text-xs">{s}</span>
                        ))
                      )}
                    </div>
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditing(item)}
                        aria-label={`Edit ${item.ingredient_name}`}
                        title="Edit"
                        className="h-7 w-7 text-zinc-500 hover:bg-brand-600/10 hover:text-brand-400"
                      >
                        <Pencil size={13} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setConfirmDelete(item)}
                        aria-label={`Delete ${item.ingredient_name}`}
                        title="Delete"
                        className="h-7 w-7 text-zinc-500 hover:bg-red-500/10 hover:text-red-400"
                      >
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="card max-w-sm w-full space-y-4">
            <h3 className="font-semibold text-zinc-100">Delete par level?</h3>
            <p className="text-sm text-zinc-400">
              Remove <span className="font-medium text-zinc-200">{confirmDelete.ingredient_name}</span> from par levels.
              Any saved prep plans that reference this item will be unaffected.
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                variant="ghost"
                onClick={() => setConfirmDelete(null)}
                className="text-sm text-zinc-400 hover:bg-surface-card hover:text-zinc-100"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                isLoading={isDeleting}
                onClick={() => {
                  deleteParLevel(confirmDelete.id);
                  setConfirmDelete(null);
                }}
                className="text-sm"
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add modal */}
      {showAdd && <ParLevelModal onClose={() => setShowAdd(false)} />}

      {/* Edit modal */}
      {editing && (
        <ParLevelModal
          existing={editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
