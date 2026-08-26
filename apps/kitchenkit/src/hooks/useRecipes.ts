import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import type { Recipe } from '@culinaryos/ratio-engine';

export interface DBIngredient {
  id: string;
  recipe_id: string;
  name: string;
  ratio: number;
  unit: string;
  sort_order: number;
  sub_recipe_id?: string | null;
  sub_recipe?: DBRecipe | null;
}

export interface DBRecipe {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  base_ingredient: string;
  yield_unit: string;
  base_yield_portions?: number;
  station?: string | null;
  is_public: boolean;
  tags: string[];
  created_at: string;
  updated_at: string;
  ingredients: DBIngredient[];
}

export interface CreateRecipeIngredientInput {
  name: string;
  ratio: number;
  unit: string;
  sort_order: number;
  sub_recipe_id?: string | null;
}

export interface CreateRecipeInput {
  name: string;
  description?: string;
  base_ingredient: string;
  yield_unit: string;
  base_yield_portions?: number;
  station?: string;
  tags?: string[];
  ingredients: CreateRecipeIngredientInput[];
}

export interface UpdateRecipeInput {
  id: string;
  name: string;
  description?: string;
  base_ingredient: string;
  yield_unit: string;
  base_yield_portions?: number;
  station?: string;
  tags?: string[];
  is_public?: boolean;
  ingredients: CreateRecipeIngredientInput[];
}

export function toEngineRecipe(r: DBRecipe): Recipe {
  return {
    id: r.id,
    name: r.name,
    baseIngredient: r.base_ingredient,
    baseYieldPortions: Number(r.base_yield_portions || 1),
    station: r.station || undefined,
    yieldUnit: r.yield_unit,
    ingredients: (r.ingredients || []).map((ing) => ({
      name: ing.name,
      ratio: Number(ing.ratio),
      unit: ing.unit,
      subRecipeId: ing.sub_recipe_id || undefined,
      subRecipe: ing.sub_recipe ? toEngineRecipe(ing.sub_recipe) : undefined,
      sortOrder: ing.sort_order,
    })),
  };
}

const DEV_SEED_USER_ID = '00000000-0000-0000-0000-000000000001';

async function getUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || DEV_SEED_USER_ID;
}

// ---------------------------------------------------------------------------
// useRecipes
// ---------------------------------------------------------------------------
export function useRecipes() {
  return useQuery<DBRecipe[]>({
    queryKey: ['recipes'],
    queryFn: async () => {
      const userId = await getUserId();
      const { data, error } = await supabase
        .from('recipes')
        .select('*, ingredients:ingredients(*, sub_recipe:recipes(*, ingredients:ingredients(*)))')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as DBRecipe[];
    },
  });
}

// ---------------------------------------------------------------------------
// useRecipe
// ---------------------------------------------------------------------------
export function useRecipe(id: string | undefined) {
  return useQuery<DBRecipe>({
    queryKey: ['recipe', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recipes')
        .select('*, ingredients:ingredients(*, sub_recipe:recipes(*, ingredients:ingredients(*)))')
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data as DBRecipe;
    },
    enabled: Boolean(id),
  });
}

// ---------------------------------------------------------------------------
// useCreateRecipe
// ---------------------------------------------------------------------------
export function useCreateRecipe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateRecipeInput) => {
      const userId = await getUserId();

      const { data: recipe, error: recipeErr } = await supabase
        .from('recipes')
        .insert({
          user_id:             userId,
          name:                payload.name,
          description:         payload.description ?? null,
          base_ingredient:     payload.base_ingredient,
          yield_unit:          payload.yield_unit,
          base_yield_portions: payload.base_yield_portions ?? 1,
          station:             payload.station ?? null,
          tags:                payload.tags ?? [],
        })
        .select()
        .single();
      if (recipeErr) throw recipeErr;

      if (payload.ingredients.length > 0) {
        const { error: ingErr } = await supabase
          .from('ingredients')
          .insert(payload.ingredients.map(ing => ({
            recipe_id: recipe.id,
            name: ing.name,
            ratio: ing.ratio,
            unit: ing.unit,
            sort_order: ing.sort_order,
            sub_recipe_id: ing.sub_recipe_id ?? null,
          })));
        if (ingErr) throw ingErr;
      }

      return recipe;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['recipes'] });
      toast.success(`Recipe "${data.name}" created`);
    },
    onError: (err: Error) => {
      toast.error(`Failed to create recipe: ${err.message}`);
    },
  });
}

// ---------------------------------------------------------------------------
// useUpdateRecipe
// ---------------------------------------------------------------------------
export function useUpdateRecipe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: UpdateRecipeInput) => {
      const { error: recipeErr } = await supabase
        .from('recipes')
        .update({
          name:                payload.name,
          description:         payload.description ?? null,
          base_ingredient:     payload.base_ingredient,
          yield_unit:          payload.yield_unit,
          base_yield_portions: payload.base_yield_portions ?? 1,
          station:             payload.station ?? null,
          tags:                payload.tags ?? [],
          ...(payload.is_public !== undefined ? { is_public: payload.is_public } : {}),
        })
        .eq('id', payload.id);
      if (recipeErr) throw recipeErr;

      await supabase.from('ingredients').delete().eq('recipe_id', payload.id);

      if (payload.ingredients.length > 0) {
        const { error: ingErr } = await supabase
          .from('ingredients')
          .insert(payload.ingredients.map(ing => ({
            recipe_id: payload.id,
            name: ing.name,
            ratio: ing.ratio,
            unit: ing.unit,
            sort_order: ing.sort_order,
            sub_recipe_id: ing.sub_recipe_id ?? null,
          })));
        if (ingErr) throw ingErr;
      }
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['recipes'] });
      qc.invalidateQueries({ queryKey: ['recipe', variables.id] });
      toast.success('Recipe updated');
    },
    onError: (err: Error) => {
      toast.error(`Failed to update recipe: ${err.message}`);
    },
  });
}

// ---------------------------------------------------------------------------
// useDeleteRecipe
// ---------------------------------------------------------------------------
export function useDeleteRecipe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('recipes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recipes'] });
      toast.success('Recipe deleted');
    },
    onError: (err: Error) => {
      toast.error(`Failed to delete recipe: ${err.message}`);
    },
  });
}
