import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

export function useRecipes(search?: string, categoryId?: string) {
  return useQuery({
    queryKey: ['recipes', search, categoryId],
    queryFn: async () => {
      const supabase = createClient();
      let q = supabase
        .from('recipes')
        .select('*, category:categories(id, name, icon)')
        .order('name');
      if (search) q = q.ilike('name', `%${search}%`);
      if (categoryId) q = q.eq('category_id', categoryId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}

export function useRecipe(id: string) {
  return useQuery<any>({
    queryKey: ['recipe', id],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('recipes')
        .select(`
          *,
          category:categories(id, name, icon),
          steps:recipe_steps(* order by step_number asc),
          ingredients:recipe_ingredients(
            *, ingredient:ingredients(id, name, default_unit, grams_per_cup)
            order by sort_order asc
          )
        `)
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as any;
    },
    enabled: !!id,
  });
}
