'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRecipes } from '@/lib/queries/recipes';

export default function VaultPage() {
  const [search, setSearch] = useState('');
  const { data: recipes, isLoading, error } = useRecipes(search || undefined);

  const difficultyColor: Record<string, string> = {
    Beginner: 'bg-green-100 text-green-700',
    Intermediate: 'bg-yellow-100 text-yellow-700',
    Advanced: 'bg-red-100 text-red-700',
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Recipe Vault</h1>
        <span className="text-sm text-gray-400">{recipes?.length ?? 0} recipes</span>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <input
          type="search"
          placeholder="Search recipes…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 pl-10 text-sm outline-none focus:border-gray-400 transition-colors"
        />
        <svg className="absolute left-3 top-3 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
        </svg>
      </div>

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-32 rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      )}

      {error && <p className="text-red-500">Failed to load recipes. Please refresh.</p>}

      {!isLoading && !error && recipes?.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="text-5xl mb-4">🍳</div>
          <h2 className="text-lg font-semibold">No recipes yet</h2>
          <p className="mt-2 text-sm text-gray-500">Your vault is empty. Add your first recipe to get started.</p>
        </div>
      )}

      {!isLoading && !error && recipes && recipes.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recipes.map((recipe) => (
            <Link
              key={recipe.id}
              href={`/vault/${recipe.id}`}
              className="group rounded-xl border border-gray-200 p-5 hover:border-gray-400 hover:shadow-sm transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-semibold text-base leading-snug group-hover:text-gray-700">{recipe.name}</h2>
                {recipe.difficulty && (
                  <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${
                    difficultyColor[recipe.difficulty] ?? 'bg-gray-100 text-gray-600'
                  }`}>
                    {recipe.difficulty}
                  </span>
                )}
              </div>
              {recipe.description && (
                <p className="mt-2 text-sm text-gray-500 line-clamp-2">{recipe.description}</p>
              )}
              <div className="mt-4 flex items-center gap-3 text-xs text-gray-400">
                {recipe.base_servings && (
                  <span>{recipe.base_servings} serving{recipe.base_servings !== 1 ? 's' : ''}</span>
                )}
                {recipe.category && <span className="capitalize">{recipe.category.name}</span>}
                {recipe.tags?.length > 0 && <span>{recipe.tags.slice(0, 2).join(', ')}</span>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
