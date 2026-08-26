import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Scale, Loader2, AlertCircle, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useRecipe, toEngineRecipe, useDeleteRecipe } from '@/hooks/useRecipes';
import { scaleRecipe } from '@culinaryos/ratio-engine';
import EditRecipeModal from '@/components/recipes/EditRecipeModal';

export default function RecipeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: recipe, isLoading, error } = useRecipe(id);
  const { mutate: deleteRecipe, isPending: isDeleting } = useDeleteRecipe();

  const [baseWeight, setBaseWeight] = useState(500);
  const [showEdit, setShowEdit]     = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="animate-spin text-brand-500" size={28} />
      </div>
    );
  }

  if (error || !recipe) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <Link to="/recipes" className="btn-ghost inline-flex items-center gap-1.5 text-sm -ml-3">
          <ArrowLeft size={15} /> Recipes
        </Link>
        <div className="card border-red-500/20 bg-red-500/5 flex items-center gap-3">
          <AlertCircle size={18} className="text-red-400 shrink-0" />
          <p className="text-sm text-red-300">
            {error ? (error as Error).message : 'Recipe not found.'}
          </p>
        </div>
      </div>
    );
  }

  const engineRecipe = toEngineRecipe(recipe);
  const scaled = scaleRecipe(engineRecipe, baseWeight);

  function handleDelete() {
    if (!confirm(`Delete "${recipe!.name}"? This cannot be undone.`)) return;
    deleteRecipe(recipe!.id, {
      onSuccess: () => navigate('/recipes'),
    });
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back + action row */}
      <div className="flex items-center justify-between">
        <Link to="/recipes" className="btn-ghost inline-flex items-center gap-1.5 text-sm -ml-3">
          <ArrowLeft size={15} /> Recipes
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowEdit(true)}
            className="btn-ghost flex items-center gap-1.5 text-sm"
          >
            <Pencil size={14} /> Edit
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="btn-ghost flex items-center gap-1.5 text-sm text-zinc-500 hover:text-red-400 transition-colors disabled:opacity-50"
          >
            {isDeleting
              ? <Loader2 size={14} className="animate-spin" />
              : <Trash2 size={14} />
            }
            Delete
          </button>
        </div>
      </div>

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-xl font-bold text-zinc-100">{recipe.name}</h2>
          {recipe.is_public && (
            <span className="badge bg-emerald-600/20 text-emerald-400">public</span>
          )}
        </div>
        {recipe.description && (
          <p className="text-sm text-zinc-400 mt-1">{recipe.description}</p>
        )}
        <p className="text-sm text-zinc-500 mt-1">
          Base ingredient:{' '}
          <span className="text-brand-400 font-mono">{recipe.base_ingredient}</span>
          {' · '}
          <span className="text-zinc-500">yield unit: {recipe.yield_unit}</span>
        </p>
        {recipe.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {recipe.tags.map((tag) => (
              <span key={tag} className="badge bg-zinc-700 text-zinc-400">{tag}</span>
            ))}
          </div>
        )}
      </div>

      {/* Scale control */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Scale size={16} className="text-brand-400" />
          <h3 className="font-semibold text-zinc-100">Scale Recipe</h3>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm text-zinc-400 shrink-0">
            Base weight ({recipe.yield_unit})
          </label>
          <input
            type="number"
            min={1}
            value={baseWeight}
            onChange={(e) => setBaseWeight(Number(e.target.value))}
            className="input max-w-32"
          />
        </div>
      </div>

      {/* Ingredient table */}
      <div className="card">
        <h3 className="font-semibold text-zinc-100 mb-4">Ingredients</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-zinc-500 uppercase tracking-wider border-b border-surface-border">
              <th className="text-left pb-2">Ingredient</th>
              <th className="text-right pb-2">Ratio</th>
              <th className="text-right pb-2">Scaled Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {recipe.ingredients
              .slice()
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((ing) => (
                <tr key={ing.id} className="hover:bg-surface/50 transition-colors">
                  <td className="py-2.5 font-mono text-zinc-300">{ing.name}</td>
                  <td className="py-2.5 text-right text-zinc-500 tabular-nums">
                    {(Number(ing.ratio) * 100).toFixed(1)}%
                  </td>
                  <td className="py-2.5 text-right font-semibold text-zinc-100 tabular-nums">
                    {(scaled[ing.name] ?? 0).toFixed(1)}{ing.unit}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Edit modal */}
      {showEdit && (
        <EditRecipeModal
          recipe={recipe}
          onClose={() => setShowEdit(false)}
        />
      )}
    </div>
  );
}
