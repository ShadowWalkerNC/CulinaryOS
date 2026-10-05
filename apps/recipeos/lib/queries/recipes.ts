import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

const FALLBACK_RECIPES = [
  {
    id: 'rec-1',
    name: 'Cheezies Smash Burger',
    description: 'Double seared patty, caramelized onion jam, American cheddar, house burger sauce on brioche.',
    difficulty: 'Intermediate',
    base_servings: 4,
    category: { id: 'c1', name: 'Entrees', icon: '🍔' },
    tags: ['Beef', 'Grill', 'Burger', 'Fast Casual'],
  },
  {
    id: 'rec-2',
    name: 'Crispy Buffalo Wings',
    description: 'Jumbo double-crisped wings tossed in signature aged cayenne butter with blue cheese dip.',
    difficulty: 'Beginner',
    base_servings: 6,
    category: { id: 'c2', name: 'Appetizers', icon: '🍗' },
    tags: ['Wings', 'Poultry', 'Fry', 'Spicy'],
  },
  {
    id: 'rec-3',
    name: 'Craft Beer Cheese Dip',
    description: 'Sharp cheddar and smoked gruyere emulsion with regional IPA and whole grain mustard.',
    difficulty: 'Beginner',
    base_servings: 8,
    category: { id: 'c3', name: 'Sauces', icon: '🧀' },
    tags: ['Dip', 'Cheese', 'Sauce', 'Prep'],
  },
  {
    id: 'rec-4',
    name: 'Truffle Parmesan Hand-Cut Fries',
    description: 'Kennebec russet potatoes twice-fried in beef tallow, tossed with white truffle oil and reggiano.',
    difficulty: 'Intermediate',
    base_servings: 4,
    category: { id: 'c4', name: 'Sides', icon: '🍟' },
    tags: ['Sides', 'Potato', 'Truffle'],
  },
];

export function useRecipes(search?: string, categoryId?: string) {
  return useQuery({
    queryKey: ['recipes', search, categoryId],
    queryFn: async () => {
      try {
        const supabase = createClient();
        let q = supabase
          .from('recipes')
          .select('*, category:categories(id, name, icon)')
          .order('name');
        if (search) q = q.ilike('name', `%${search}%`);
        if (categoryId) q = q.eq('category_id', categoryId);
        const { data, error } = await q;
        if (error || !data || data.length === 0) return FALLBACK_RECIPES;
        return (data ?? []) as any[];
      } catch {
        return FALLBACK_RECIPES;
      }
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
