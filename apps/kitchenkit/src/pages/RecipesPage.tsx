import { Search, Plus, BookOpen, Loader2, Tag, SlidersHorizontal } from 'lucide-react';
import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useRecipes } from '@/hooks/useRecipes';
import CreateRecipeModal from '@/components/recipes/CreateRecipeModal';

export type RecipeSortOption =
  | 'created-desc'
  | 'created-asc'
  | 'updated-desc'
  | 'updated-asc'
  | 'name-asc'
  | 'name-desc';

export default function RecipesPage() {
  const { data: recipes = [], isLoading, error } = useRecipes();
  const [query, setQuery]         = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [sortBy, setSortBy]       = useState<RecipeSortOption>('created-desc');
  const [showModal, setShowModal] = useState(false);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    recipes.forEach((r) => (r.tags || []).forEach((t) => set.add(t)));
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [recipes]);

  const tagCounts = useMemo(() => {
    const map = new Map<string, number>();
    recipes.forEach((r) => {
      (r.tags || []).forEach((t) => {
        const trimmed = t.trim();
        if (trimmed) {
          map.set(trimmed, (map.get(trimmed) || 0) + 1);
        }
      });
    });
    return map;
  }, [recipes]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    const matched = recipes.filter((r) => {
      const matchesText =
        !q ||
        r.name.toLowerCase().includes(q) ||
        (r.description ?? '').toLowerCase().includes(q) ||
        (r.base_ingredient ?? '').toLowerCase().includes(q) ||
        (r.tags || []).some((t) => t.toLowerCase().includes(q));
      const matchesTag = !activeTag || (r.tags || []).includes(activeTag);
      return matchesText && matchesTag;
    });

    return [...matched].sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':
          return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
        case 'name-desc':
          return b.name.localeCompare(a.name, undefined, { sensitivity: 'base' });
        case 'created-asc':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'created-desc':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'updated-asc':
          return (
            new Date(a.updated_at || a.created_at).getTime() -
            new Date(b.updated_at || b.created_at).getTime()
          );
        case 'updated-desc':
          return (
            new Date(b.updated_at || b.created_at).getTime() -
            new Date(a.updated_at || a.created_at).getTime()
          );
        default:
          return 0;
      }
    });
  }, [recipes, query, activeTag, sortBy]);

  if (error) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-red-400 text-sm">Failed to load recipes: {(error as Error).message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search recipes, base ingredients, or tags…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="input pl-9"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-surface-card border border-surface-border rounded-lg px-3 py-2 text-sm text-zinc-200">
            <SlidersHorizontal size={14} className="text-zinc-500 shrink-0" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as RecipeSortOption)}
              className="bg-transparent text-zinc-200 focus:outline-none cursor-pointer text-xs sm:text-sm"
              aria-label="Sort recipes"
            >
              <option value="created-desc" className="bg-zinc-900 text-zinc-200">Created (Newest)</option>
              <option value="created-asc" className="bg-zinc-900 text-zinc-200">Created (Oldest)</option>
              <option value="updated-desc" className="bg-zinc-900 text-zinc-200">Updated (Newest)</option>
              <option value="updated-asc" className="bg-zinc-900 text-zinc-200">Updated (Oldest)</option>
              <option value="name-asc" className="bg-zinc-900 text-zinc-200">Name (A – Z)</option>
              <option value="name-desc" className="bg-zinc-900 text-zinc-200">Name (Z – A)</option>
            </select>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="btn-primary flex items-center gap-2 text-sm shrink-0"
          >
            <Plus size={15} /> New Recipe
          </button>
        </div>
      </div>

      {/* Tag filter chips */}
      {recipes.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap pt-1">
          <Tag size={13} className="text-zinc-600 shrink-0" />
          <button
            onClick={() => setActiveTag(null)}
            className={[
              'badge transition-colors cursor-pointer select-none',
              activeTag === null
                ? 'bg-brand-600/30 text-brand-300 ring-1 ring-brand-600/60 font-medium'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-300',
            ].join(' ')}
          >
            All ({recipes.length})
          </button>
          {allTags.map((tag) => {
            const count = tagCounts.get(tag) ?? 0;
            const isActive = activeTag === tag;
            return (
              <button
                key={tag}
                onClick={() => setActiveTag(isActive ? null : tag)}
                className={[
                  'badge transition-colors cursor-pointer select-none',
                  isActive
                    ? 'bg-brand-600/30 text-brand-300 ring-1 ring-brand-600/60 font-medium'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-300',
                ].join(' ')}
              >
                {tag} ({count})
              </button>
            );
          })}
          {(activeTag !== null || query !== '') && (
            <button
              onClick={() => {
                setActiveTag(null);
                setQuery('');
              }}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors ml-1 underline cursor-pointer"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="animate-spin text-brand-500" size={28} />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <BookOpen size={40} className="text-zinc-700 mb-4" />
          <h3 className="text-lg font-semibold text-zinc-300 mb-1">
            {query || activeTag ? 'No recipes match that filter' : 'No recipes yet'}
          </h3>
          <p className="text-sm text-zinc-500 mb-6 max-w-xs">
            {query || activeTag
              ? 'Try clearing the search or selecting a different tag.'
              : 'Add your first recipe and let the Ratio Blueprint Engine handle the scaling.'}
          </p>
          {!query && !activeTag && (
            <button onClick={() => setShowModal(true)} className="btn-primary text-sm">
              + Add Recipe
            </button>
          )}
          {(query || activeTag) && (
            <button
              onClick={() => { setQuery(''); setActiveTag(null); }}
              className="btn-ghost text-sm"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Recipe grid */}
      {!isLoading && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((recipe) => {
            const visibleTags    = recipe.tags.slice(0, 2);
            const overflowCount  = recipe.tags.length - visibleTags.length;
            return (
              <Link
                key={recipe.id}
                to={`/recipes/${recipe.id}`}
                className="card hover:border-brand-600/50 transition-colors block"
              >
                <h3 className="font-semibold text-zinc-100 mb-1 truncate">{recipe.name}</h3>
                {recipe.description && (
                  <p className="text-xs text-zinc-500 mb-2 line-clamp-1">{recipe.description}</p>
                )}
                <p className="text-xs text-zinc-600 mb-3">
                  {recipe.ingredients?.length ?? 0} ingredient{(recipe.ingredients?.length ?? 0) !== 1 ? 's' : ''}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <span className="badge bg-brand-600/20 text-brand-300">
                    {recipe.base_ingredient}
                  </span>
                  {recipe.is_public && (
                    <span className="badge bg-emerald-600/20 text-emerald-400">public</span>
                  )}
                  {visibleTags.map((tag) => (
                    <span key={tag} className="badge bg-zinc-700 text-zinc-400">{tag}</span>
                  ))}
                  {overflowCount > 0 && (
                    <span className="badge bg-zinc-800 text-zinc-600">+{overflowCount}</span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {showModal && <CreateRecipeModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
