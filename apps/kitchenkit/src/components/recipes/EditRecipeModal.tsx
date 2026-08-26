import { useState } from 'react';
import { X, Plus, Trash2, Loader2 } from 'lucide-react';
import { useUpdateRecipe, type DBRecipe, type UpdateRecipeInput } from '@/hooks/useRecipes';

interface IngredientRow {
  name: string;
  ratio: string;
  unit: string;
}

interface Props {
  recipe: DBRecipe;
  onClose: () => void;
}

export default function EditRecipeModal({ recipe, onClose }: Props) {
  const { mutateAsync: updateRecipe, isPending } = useUpdateRecipe();

  // Pre-fill all fields from the existing recipe
  const [name, setName]           = useState(recipe.name);
  const [desc, setDesc]           = useState(recipe.description ?? '');
  const [baseIng, setBaseIng]     = useState(recipe.base_ingredient);
  const [yieldUnit, setYieldUnit] = useState(recipe.yield_unit);
  const [isPublic, setIsPublic]   = useState(recipe.is_public);
  const [tagInput, setTagInput]   = useState(recipe.tags.join(', '));
  const [rows, setRows]           = useState<IngredientRow[]>(
    recipe.ingredients
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((i) => ({ name: i.name, ratio: String(i.ratio), unit: i.unit }))
  );
  const [error, setError] = useState('');

  function addRow() {
    setRows((r) => [...r, { name: '', ratio: '', unit: 'g' }]);
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

    const tags = tagInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const input: UpdateRecipeInput = {
      id:              recipe.id,
      name:            name.trim(),
      description:     desc.trim() || undefined,
      base_ingredient: baseIng.trim(),
      yield_unit:      yieldUnit,
      tags,
      is_public:       isPublic,
      ingredients: validRows.map((r, idx) => ({
        name:       r.name.trim(),
        ratio:      parseFloat(r.ratio),
        unit:       r.unit,
        sort_order: idx,
      })),
    };

    try {
      await updateRecipe(input);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update recipe.');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-surface-card border border-surface-border rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border shrink-0">
          <div>
            <h2 className="font-semibold text-zinc-100">Edit Recipe</h2>
            <p className="text-xs text-zinc-500 mt-0.5">Changes replace all ingredients.</p>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5" aria-label="Close">
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
                <p className="text-xs text-zinc-600 mt-1">All ratios are relative to this (= 1.0)</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Yield unit</label>
                <input value={yieldUnit} onChange={(e) => setYieldUnit(e.target.value)}
                  className="input" placeholder="g" />
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">Tags</label>
              <input value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                className="input" placeholder="bread, sourdough, fermented" />
              <p className="text-xs text-zinc-600 mt-1">Comma-separated</p>
            </div>

            {/* Public toggle */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="w-4 h-4 rounded accent-brand-600"
              />
              <span className="text-sm text-zinc-300">Make recipe public</span>
              <span className="text-xs text-zinc-600">(visible to all users)</span>
            </label>

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
                      className="flex items-center justify-center text-zinc-600 hover:text-red-400 transition-colors"
                      aria-label="Remove ingredient">
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
              {isPending
                ? <><Loader2 size={14} className="animate-spin" /> Saving...</>
                : 'Save Changes'
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
