import { useState } from 'react';
import { X, Plus, Trash2, Loader2 } from 'lucide-react';
import { useCreateRecipe, type CreateRecipeInput } from '@/hooks/useRecipes';

interface IngredientRow {
  name: string;
  ratio: string;
  unit: string;
}

const DEFAULT_INGREDIENT: IngredientRow = { name: '', ratio: '', unit: 'g' };

interface Props {
  onClose: () => void;
}

export default function CreateRecipeModal({ onClose }: Props) {
  const { mutateAsync: createRecipe, isPending } = useCreateRecipe();

  const [name, setName]           = useState('');
  const [desc, setDesc]           = useState('');
  const [baseIng, setBaseIng]     = useState('');
  const [yieldUnit, setYieldUnit] = useState('g');
  const [rows, setRows]           = useState<IngredientRow[]>([{ ...DEFAULT_INGREDIENT }]);
  const [error, setError]         = useState('');

  function addRow() {
    setRows((r) => [...r, { ...DEFAULT_INGREDIENT }]);
  }

  function removeRow(i: number) {
    setRows((r) => r.filter((_, idx) => idx !== i));
  }

  function updateRow(i: number, field: keyof IngredientRow, value: string) {
    setRows((r) => r.map((row, idx) => idx === i ? { ...row, [field]: value } : row));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const validRows = rows.filter((r) => r.name.trim() && r.ratio.trim());
    if (!validRows.length) {
      setError('Add at least one ingredient with a name and ratio.');
      return;
    }
    if (!baseIng.trim()) {
      setError('Base ingredient is required.');
      return;
    }

    const input: CreateRecipeInput = {
      name:           name.trim(),
      description:    desc.trim() || undefined,
      base_ingredient: baseIng.trim(),
      yield_unit:     yieldUnit,
      ingredients: validRows.map((r, idx) => ({
        name:       r.name.trim(),
        ratio:      parseFloat(r.ratio),
        unit:       r.unit,
        sort_order: idx,
      })),
    };

    try {
      await createRecipe(input);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create recipe.');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-surface-card border border-surface-border rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border shrink-0">
          <h2 className="font-semibold text-zinc-100">New Recipe</h2>
          <button onClick={onClose} className="btn-ghost p-1.5">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="overflow-y-auto px-6 py-4 space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">Recipe name *</label>
              <input required value={name} onChange={(e) => setName(e.target.value)}
                className="input" placeholder="Brioche Dough" />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">Description</label>
              <input value={desc} onChange={(e) => setDesc(e.target.value)}
                className="input" placeholder="Optional notes about this recipe" />
            </div>

            {/* Base ingredient + yield unit */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Base ingredient *</label>
                <input required value={baseIng} onChange={(e) => setBaseIng(e.target.value)}
                  className="input" placeholder="bread_flour" />
                <p className="text-xs text-zinc-600 mt-1">All ratios are relative to this ingredient (= 1.0)</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Yield unit</label>
                <input value={yieldUnit} onChange={(e) => setYieldUnit(e.target.value)}
                  className="input" placeholder="g" />
              </div>
            </div>

            {/* Ingredients */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-zinc-300">Ingredients *</label>
                <button type="button" onClick={addRow}
                  className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1">
                  <Plus size={13} /> Add row
                </button>
              </div>

              <div className="space-y-2">
                {/* Column headers */}
                <div className="grid grid-cols-[1fr_100px_70px_32px] gap-2 text-xs text-zinc-600 px-1">
                  <span>Name</span><span>Ratio</span><span>Unit</span><span />
                </div>
                {rows.map((row, i) => (
                  <div key={i} className="grid grid-cols-[1fr_100px_70px_32px] gap-2">
                    <input value={row.name} onChange={(e) => updateRow(i, 'name', e.target.value)}
                      className="input text-sm" placeholder="bread_flour" />
                    <input value={row.ratio} onChange={(e) => updateRow(i, 'ratio', e.target.value)}
                      className="input text-sm" placeholder="1.0" type="number" step="any" min="0" />
                    <input value={row.unit} onChange={(e) => updateRow(i, 'unit', e.target.value)}
                      className="input text-sm" placeholder="g" />
                    <button type="button" onClick={() => removeRow(i)}
                      className="flex items-center justify-center text-zinc-600 hover:text-red-400 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-surface-border shrink-0 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="btn-ghost text-sm">Cancel</button>
            <button type="submit" disabled={isPending}
              className="btn-primary text-sm flex items-center gap-2 disabled:opacity-50">
              {isPending ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : 'Create Recipe'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
