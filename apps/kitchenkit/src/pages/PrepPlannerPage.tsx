import {
  ClipboardList, Plus, Loader2, Check, RefreshCw,
  Save, CheckCheck, Pencil, Printer, Scale, Tag,
} from 'lucide-react';
import { useState } from 'react';
import { useShiftPrep, useParLevels, type DBParLevel } from '@/hooks/useParLevels';
import { usePrepPlan, useSavePrepPlan, useTogglePrepItem, useCompletePrepPlan } from '@/hooks/usePrepPlans';
import ParLevelModal from '@/components/prep/ParLevelModal';
import StationExportModal from '@/components/prep/StationExportModal';
import RecipeScalingModal from '@/components/prep/RecipeScalingModal';
import AdhesiveLabelModal from '@/components/prep/AdhesiveLabelModal';
import type { PrepBatch } from '@culinaryos/prep-engine';

const SHIFTS = ['AM', 'PM', 'Brunch', 'Dinner'] as const;
type Shift = typeof SHIFTS[number];

export default function PrepPlannerPage() {
  const [shift, setShift]                   = useState<Shift>('AM');
  const [showAddItem, setShowAddItem]       = useState(false);
  const [editingParItem, setEditingParItem] = useState<DBParLevel | null>(null);
  const [showStationModal, setShowStationModal] = useState(false);
  const [showScalingModal, setShowScalingModal] = useState(false);
  const [scalingRecipeName, setScalingRecipeName] = useState('Sourdough Focaccia');
  const [showLabelModal, setShowLabelModal] = useState(false);
  const [labelBatch, setLabelBatch] = useState<Partial<PrepBatch> | undefined>(undefined);
  const today = new Date().toISOString().slice(0, 10);

  const { data: parItems = [], isLoading: parLoading, error: parError, refetch } = useShiftPrep(shift, today);
  const { data: allParLevels = [] } = useParLevels();
  const { data: savedPlan, isLoading: planLoading } = usePrepPlan(shift, today);

  const { mutateAsync: savePlan, isPending: isSaving }    = useSavePrepPlan();
  const { mutate: toggleItem, isPending: isToggling }     = useTogglePrepItem();
  const { mutate: completePlan, isPending: isCompleting } = useCompletePrepPlan();

  const isLoading = parLoading || planLoading;

  async function handleSavePlan() {
    await savePlan({
      shift,
      date: today,
      items: parItems.map((item, idx) => ({
        ingredient_name: item.ingredient_name,
        prep_amount:     item.prep_amount,
        unit:            item.unit,
        recipe_id:       item.recipe_id ?? null,
        sort_order:      idx,
      })),
    });
  }

  function openEditForIngredient(name: string) {
    const par = allParLevels.find((p) => p.ingredient_name === name);
    if (par) setEditingParItem(par);
  }

  function openScalingForIngredient(name: string) {
    setScalingRecipeName(name);
    setShowScalingModal(true);
  }

  function openLabelForIngredient(name: string, amount: number, unit: string) {
    setLabelBatch({
      recipeName: name,
      yieldQuantity: amount,
      yieldUnit: unit,
      shelfLifeHours: 72,
    });
    setShowLabelModal(true);
  }

  const hasSavedPlan  = !!savedPlan;
  const savedItems    = savedPlan?.items ?? [];
  const doneCount     = savedItems.filter((i) => i.is_done).length;
  const totalCount    = savedItems.length;
  const allDone       = totalCount > 0 && doneCount === totalCount;
  const planCompleted = savedPlan?.is_completed ?? false;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-zinc-100">Shift Prep Planner</h2>
          <p className="text-sm text-zinc-500 mt-0.5">{today}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowScalingModal(true)}
            className="btn-ghost flex items-center gap-1.5 text-sm"
            title="Batch Recipe Scaling & Baker's Math"
          >
            <Scale size={15} /> Scale Recipe
          </button>
          <button
            onClick={() => setShowStationModal(true)}
            className="btn-ghost flex items-center gap-1.5 text-sm"
            title="Print or view station prep sheet"
          >
            <Printer size={15} /> Station Sheet
          </button>
          <button
            onClick={() => refetch()}
            className="btn-ghost flex items-center gap-1.5 text-sm"
            title="Recalculate from current stock"
          >
            <RefreshCw size={13} /> Refresh
          </button>
          <button
            onClick={() => setShowAddItem(true)}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <Plus size={15} /> Add Item
          </button>
        </div>
      </div>

      {/* Shift selector */}
      <div className="flex gap-2">
        {SHIFTS.map((s) => (
          <button
            key={s}
            onClick={() => setShift(s)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              shift === s
                ? 'bg-brand-600 text-white'
                : 'bg-surface-card text-zinc-400 hover:text-zinc-100 border border-surface-border'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="animate-spin text-brand-500" size={24} />
        </div>
      )}

      {/* Error */}
      {parError && (
        <div className="card border-red-500/20 bg-red-500/5">
          <p className="text-sm text-red-400">Failed to load prep data: {(parError as Error).message}</p>
        </div>
      )}

      {!isLoading && !parError && (
        <>
          {/* ── SAVED PLAN VIEW ── */}
          {hasSavedPlan ? (
            <div className="space-y-4">
              {planCompleted ? (
                <div className="card border-emerald-500/30 bg-emerald-500/5 flex items-center gap-3">
                  <CheckCheck size={18} className="text-emerald-400 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-zinc-100">Prep complete! ✅</p>
                    <p className="text-xs text-zinc-500">
                      Completed{' '}
                      {savedPlan!.completed_at
                        ? new Date(savedPlan!.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : 'today'
                      }
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ClipboardList size={16} className="text-brand-400" />
                    <span className="text-sm font-medium text-zinc-300">
                      {doneCount} / {totalCount} done
                    </span>
                    {totalCount > 0 && (
                      <div className="h-1.5 w-24 bg-surface-border rounded-full overflow-hidden">
                        <div
                          className="h-full bg-brand-600 rounded-full transition-all"
                          style={{ width: `${(doneCount / totalCount) * 100}%` }}
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSavePlan}
                      disabled={isSaving}
                      className="btn-ghost flex items-center gap-1.5 text-sm"
                      title="Rebuild plan from current stock levels"
                    >
                      {isSaving ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                      Rebuild
                    </button>
                    {allDone && !planCompleted && (
                      <button
                        onClick={() => completePlan({ planId: savedPlan!.id, shift, date: today })}
                        disabled={isCompleting}
                        className="btn-primary flex items-center gap-1.5 text-sm"
                      >
                        {isCompleting ? <Loader2 size={13} className="animate-spin" /> : <CheckCheck size={13} />}
                        Complete Shift
                      </button>
                    )}
                  </div>
                </div>
              )}

              {savedItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-14 h-14 rounded-full bg-emerald-600/20 border border-emerald-600/30 flex items-center justify-center mb-4">
                    <Check size={24} className="text-emerald-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-zinc-300 mb-1">All at par ✅</h3>
                  <p className="text-sm text-zinc-500">Nothing to prep for the {shift} shift.</p>
                </div>
              ) : (
                <div className="card">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-zinc-100">{shift} Prep List</h3>
                    <span className="badge bg-brand-600/20 text-brand-300">
                      {totalCount} item{totalCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {savedItems.map((item) => (
                      <div
                        key={item.id}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-lg transition-colors group ${
                          item.is_done ? 'opacity-50 bg-surface/30' : 'hover:bg-surface/50'
                        }`}
                      >
                        <label className="flex items-center gap-3 flex-1 cursor-pointer min-w-0">
                          <input
                            type="checkbox"
                            checked={item.is_done}
                            disabled={isToggling || planCompleted}
                            onChange={() =>
                              toggleItem({
                                itemId: item.id,
                                isDone: !item.is_done,
                                shift,
                                date: today,
                              })
                            }
                            className="w-4 h-4 rounded accent-brand-600 shrink-0"
                          />
                          <span className={`flex-1 text-sm font-medium truncate ${
                            item.is_done ? 'line-through text-zinc-600' : 'text-zinc-200'
                          }`}>
                            {item.ingredient_name}
                          </span>
                          <span className={`text-sm tabular-nums shrink-0 ${
                            item.is_done ? 'text-zinc-700' : 'text-amber-300 font-semibold'
                          }`}>
                            +{item.prep_amount} {item.unit}
                          </span>
                        </label>
                        {!planCompleted && (
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                            <button
                              onClick={() => openScalingForIngredient(item.ingredient_name)}
                              className="text-zinc-500 hover:text-amber-400 p-1"
                              aria-label={`Scale recipe for ${item.ingredient_name}`}
                              title="Scale recipe"
                            >
                              <Scale size={13} />
                            </button>
                            <button
                              onClick={() => openLabelForIngredient(item.ingredient_name, item.prep_amount, item.unit)}
                              className="text-zinc-500 hover:text-amber-400 p-1"
                              aria-label={`Print label for ${item.ingredient_name}`}
                              title="Print adhesive expiration label"
                            >
                              <Tag size={13} />
                            </button>
                            <button
                              onClick={() => openEditForIngredient(item.ingredient_name)}
                              className="text-zinc-500 hover:text-brand-400 p-1"
                              aria-label={`Edit par level for ${item.ingredient_name}`}
                              title="Edit par level"
                            >
                              <Pencil size={13} />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ── UNSAVED / LIVE VIEW ── */
            <div className="space-y-4">
              {parItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-14 h-14 rounded-full bg-emerald-600/20 border border-emerald-600/30 flex items-center justify-center mb-4">
                    <Check size={24} className="text-emerald-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-zinc-300 mb-1">All at par ✅</h3>
                  <p className="text-sm text-zinc-500">Nothing to prep for the {shift} shift.</p>
                </div>
              ) : (
                <>
                  <div className="card border-brand-600/20 bg-brand-600/5 flex items-start gap-3">
                    <Pencil size={16} className="text-brand-400 mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-zinc-100 mb-0.5">Plan not saved yet</p>
                      <p className="text-xs text-zinc-500">
                        Save this prep list so you can track item completion during service.
                      </p>
                    </div>
                    <button
                      onClick={handleSavePlan}
                      disabled={isSaving}
                      className="btn-primary flex items-center gap-1.5 text-sm shrink-0"
                    >
                      {isSaving
                        ? <><Loader2 size={13} className="animate-spin" /> Saving…</>
                        : <><Save size={13} /> Save Plan</>
                      }
                    </button>
                  </div>

                  <div className="card">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-zinc-100">{shift} Prep Preview</h3>
                        <p className="text-xs text-zinc-600 mt-0.5">Click a row to edit its par level</p>
                      </div>
                      <span className="badge bg-brand-600/20 text-brand-300">
                        {parItems.length} item{parItems.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs text-zinc-500 uppercase tracking-wider border-b border-surface-border">
                          <th className="text-left pb-2">Item</th>
                          <th className="text-right pb-2">Stock</th>
                          <th className="text-right pb-2">Par</th>
                          <th className="text-right pb-2">Prep</th>
                          <th className="text-right pb-2">Unit</th>
                          <th className="pb-2 w-6" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-border">
                        {parItems.map((item) => (
                          <tr
                            key={item.ingredient_name}
                            onClick={() => openEditForIngredient(item.ingredient_name)}
                            className="hover:bg-surface/50 transition-colors cursor-pointer group"
                          >
                            <td className="py-3 font-medium text-zinc-200">{item.ingredient_name}</td>
                            <td className="py-3 text-right text-zinc-500 tabular-nums">{item.current_stock}</td>
                            <td className="py-3 text-right text-zinc-500 tabular-nums">{item.par_amount}</td>
                            <td className="py-3 text-right font-semibold text-amber-300 tabular-nums">+{item.prep_amount}</td>
                            <td className="py-3 text-right text-zinc-500">{item.unit}</td>
                            <td className="py-3 text-center">
                              <Pencil size={12} className="text-zinc-700 group-hover:text-brand-400 transition-colors mx-auto" />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}

      {/* Add Item modal */}
      {showAddItem && <ParLevelModal onClose={() => setShowAddItem(false)} />}

      {/* Edit par level modal */}
      {editingParItem && (
        <ParLevelModal
          existing={editingParItem}
          onClose={() => {
            setEditingParItem(null);
            refetch();
          }}
        />
      )}

      {/* Station Sheet export/print modal */}
      {showStationModal && (
        <StationExportModal
          shift={shift}
          date={today}
          items={
            hasSavedPlan
              ? savedItems.map((item) => ({
                  id: item.id,
                  ingredient_name: item.ingredient_name,
                  prep_amount: item.prep_amount,
                  unit: item.unit,
                  is_done: item.is_done,
                  note: item.note,
                }))
              : parItems.map((item) => ({
                  ingredient_name: item.ingredient_name,
                  prep_amount: item.prep_amount,
                  unit: item.unit,
                  is_done: false,
                }))
          }
          isSavedPlan={hasSavedPlan}
          planCompleted={planCompleted}
          completedAt={savedPlan?.completed_at}
          onClose={() => setShowStationModal(false)}
        />
      )}

      {/* Recipe Scaling modal */}
      {showScalingModal && (
        <RecipeScalingModal
          initialRecipeName={scalingRecipeName}
          onClose={() => setShowScalingModal(false)}
        />
      )}

      {/* Adhesive Expiration Label modal */}
      {showLabelModal && (
        <AdhesiveLabelModal
          initialBatch={labelBatch}
          onClose={() => {
            setShowLabelModal(false);
            setLabelBatch(undefined);
          }}
        />
      )}
    </div>
  );
}
