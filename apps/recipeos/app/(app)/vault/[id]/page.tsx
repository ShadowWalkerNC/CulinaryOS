'use client';

import { useParams, useRouter } from 'next/navigation';
import { useRecipe } from '@/lib/queries/recipes';
import { useState, useMemo } from 'react';
import { evaluateDietaryAndAllergens } from '@shared/ratio-engine';

export default function RecipeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: recipe, isLoading, error } = useRecipe(id);
  const [servings, setServings] = useState<number | null>(null);

  if (isLoading) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <div className="h-8 w-48 rounded-lg bg-gray-100 animate-pulse mb-4" />
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-5 rounded bg-gray-100 animate-pulse" style={{ width: `${70 + Math.random() * 25}%` }} />
          ))}
        </div>
      </div>
    );
  }

  if (error || !recipe) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-900 mb-6">
          ← Back
        </button>
        <p className="text-red-500">Recipe not found or failed to load.</p>
      </div>
    );
  }

  const scale = servings && recipe.base_servings
    ? servings / recipe.base_servings
    : 1;

  const ingredientNames = useMemo(() => {
    return (recipe?.ingredients ?? []).map(
      (i: any) => i.ingredient?.name ?? i.name_override ?? ''
    );
  }, [recipe?.ingredients]);

  const dietaryProfile = useMemo(() => {
    return evaluateDietaryAndAllergens(ingredientNames);
  }, [ingredientNames]);

  const difficultyColor: Record<string, string> = {
    Beginner: 'bg-green-100 text-green-700',
    Intermediate: 'bg-yellow-100 text-yellow-700',
    Advanced: 'bg-red-100 text-red-700',
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="text-sm text-gray-500 hover:text-gray-900 mb-6 flex items-center gap-1"
      >
        ← Back to Vault
      </button>

      {/* Header */}
      <div className="mb-6 space-y-3">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-3xl font-bold leading-tight">{recipe.name}</h1>
          {recipe.difficulty && (
            <span className={`shrink-0 text-xs font-semibold px-3 py-1 rounded-full ${
              difficultyColor[recipe.difficulty] ?? 'bg-gray-100 text-gray-600'
            }`}>
              {recipe.difficulty}
            </span>
          )}
        </div>
        {recipe.description && (
          <p className="text-gray-500 text-sm leading-relaxed">{recipe.description}</p>
        )}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {recipe.category && <span className="capitalize text-gray-500 bg-gray-100 rounded px-2 py-0.5">{recipe.category.name}</span>}
          {recipe.tags?.map((t) => (
            <span key={t} className="bg-gray-100 text-gray-600 rounded px-2 py-0.5">{t}</span>
          ))}
          {dietaryProfile.isVegan && (
            <span className="bg-green-100 text-green-800 font-semibold rounded px-2 py-0.5">🌱 Vegan</span>
          )}
          {dietaryProfile.isVegetarian && !dietaryProfile.isVegan && (
            <span className="bg-emerald-100 text-emerald-800 font-semibold rounded px-2 py-0.5">🥗 Vegetarian</span>
          )}
          {dietaryProfile.isGlutenFree && (
            <span className="bg-amber-100 text-amber-800 font-semibold rounded px-2 py-0.5">🌾 Gluten-Free</span>
          )}
          {dietaryProfile.isDairyFree && (
            <span className="bg-blue-100 text-blue-800 font-semibold rounded px-2 py-0.5">🥛 Dairy-Free</span>
          )}
        </div>

        {/* FDA Top 9 Allergen Warning Banner */}
        {dietaryProfile.matchedAllergens.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap pt-2">
            <span className="text-xs font-bold text-gray-700">FDA Top 9 Allergens:</span>
            {dietaryProfile.matchedAllergens.map((alg) => (
              <span
                key={alg.id}
                className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 bg-red-50 text-red-700 rounded-md border border-red-200"
              >
                <span>{alg.emoji}</span>
                <span>{alg.name}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Servings scaler */}
      <div className="flex items-center gap-3 mb-8 p-4 rounded-xl bg-gray-50 border border-gray-200">
        <span className="text-sm font-medium text-gray-700">Servings</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setServings(Math.max(1, (servings ?? recipe.base_servings) - 1))}
            className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 text-sm font-bold"
          >−</button>
          <span className="w-8 text-center font-semibold text-sm">
            {servings ?? recipe.base_servings}
          </span>
          <button
            onClick={() => setServings((servings ?? recipe.base_servings) + 1)}
            className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 text-sm font-bold"
          >+</button>
        </div>
        {scale !== 1 && (
          <span className="ml-2 text-xs text-gray-400">
            {scale.toFixed(2)}× scale
          </span>
        )}
        {servings && servings !== recipe.base_servings && (
          <button
            onClick={() => setServings(null)}
            className="ml-auto text-xs text-gray-400 hover:text-gray-700"
          >Reset</button>
        )}
      </div>

      <div className="grid md:grid-cols-5 gap-8">
        {/* Ingredients */}
        <div className="md:col-span-2">
          <h2 className="text-lg font-semibold mb-3">Ingredients</h2>
          {!recipe.ingredients || recipe.ingredients.length === 0 ? (
            <p className="text-sm text-gray-400">No ingredients listed.</p>
          ) : (
            <ul className="space-y-2">
              {recipe.ingredients.map((ing) => {
                const scaled = (ing.amount * scale);
                const display = Number.isInteger(scaled) ? scaled : parseFloat(scaled.toFixed(2));
                return (
                  <li key={ing.id} className="flex items-baseline gap-2 text-sm">
                    <span className="font-medium tabular-nums w-10 shrink-0 text-right">{display}</span>
                    <span className="text-gray-500 shrink-0">{ing.unit ?? ''}</span>
                    <span>{ing.ingredient?.name ?? ing.name_override ?? ''}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Steps */}
        <div className="md:col-span-3">
          <h2 className="text-lg font-semibold mb-3">Instructions</h2>
          {!recipe.steps || recipe.steps.length === 0 ? (
            <p className="text-sm text-gray-400">No instructions listed.</p>
          ) : (
            <ol className="space-y-4">
              {recipe.steps.map((step) => (
                <li key={step.id} className="flex gap-3">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-gray-900 text-white text-xs font-bold flex items-center justify-center mt-0.5">
                    {step.step_number}
                  </span>
                  <p className="text-sm text-gray-700 leading-relaxed">{step.instruction}</p>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
