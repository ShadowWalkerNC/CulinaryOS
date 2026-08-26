import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useUpsertParLevel, type DBParLevel } from '@/hooks/useParLevels';

const UNITS = ['g', 'kg', 'oz', 'lb', 'ml', 'L', 'cup', 'tbsp', 'tsp', 'unit', 'bunch', 'portion'];

interface Props {
  /** Pass an existing item to pre-fill for editing; undefined = new item */
  existing?: DBParLevel;
  onClose: () => void;
}

export default function ParLevelModal({ existing, onClose }: Props) {
  const { mutateAsync: upsert, isPending } = useUpsertParLevel();

  const [ingredientName, setIngredientName] = useState(existing?.ingredient_name ?? '');
  const [parAmount, setParAmount]           = useState(String(existing?.par_amount ?? ''));
  const [currentStock, setCurrentStock]     = useState(String(existing?.current_stock ?? '0'));
  const [unit, setUnit]                     = useState(existing?.unit ?? 'g');
  const [error, setError]                   = useState('');

  const isEdit = !!existing;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const parsedPar   = parseFloat(parAmount);
    const parsedStock = parseFloat(currentStock);

    if (!ingredientName.trim()) { setError('Ingredient name is required.'); return; }
    if (isNaN(parsedPar) || parsedPar <= 0) { setError('Par amount must be a positive number.'); return; }
    if (isNaN(parsedStock) || parsedStock < 0) { setError('Current stock cannot be negative.'); return; }

    try {
      await upsert({
        ingredient_name: ingredientName.trim(),
        par_amount:      parsedPar,
        current_stock:   parsedStock,
        unit,
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save par level.');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-surface-card border border-surface-border rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border">
          <h2 className="font-semibold text-zinc-100">{isEdit ? 'Edit Par Level' : 'Add Par Item'}</h2>
          <button onClick={onClose} className="btn-ghost p-1.5" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {/* Ingredient name */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Ingredient *</label>
            <input
              required
              value={ingredientName}
              onChange={(e) => setIngredientName(e.target.value)}
              disabled={isEdit}
              className="input disabled:opacity-60 disabled:cursor-not-allowed"
              placeholder="e.g. brioche dough"
            />
            {isEdit && (
              <p className="text-xs text-zinc-600 mt-1">Name cannot be changed — it's used as the unique key.</p>
            )}
          </div>

          {/* Par + unit */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">Par level *</label>
              <input
                required
                type="number"
                min="0.01"
                step="any"
                value={parAmount}
                onChange={(e) => setParAmount(e.target.value)}
                className="input"
                placeholder="500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">Unit</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="input"
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Current stock */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Current stock</label>
            <input
              type="number"
              min="0"
              step="any"
              value={currentStock}
              onChange={(e) => setCurrentStock(e.target.value)}
              className="input"
              placeholder="0"
            />
            <p className="text-xs text-zinc-600 mt-1">How much is on hand right now.</p>
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-ghost text-sm">Cancel</button>
            <button
              type="submit"
              disabled={isPending}
              className="btn-primary text-sm flex items-center gap-2 disabled:opacity-50"
            >
              {isPending
                ? <><Loader2 size={14} className="animate-spin" /> Saving...</>
                : isEdit ? 'Update' : 'Add Item'
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
