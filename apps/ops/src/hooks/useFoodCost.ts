import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export interface MenuItem {
  id: string;
  name: string;
  menu_price: number;
  category: string | null;
  active: boolean;
}

export interface Ingredient {
  id: string;
  menu_item_id: string;
  name: string;
  quantity: number;
  unit: string;
  cost_per_unit: number;
}

export function useMenuItems() {
  return useQuery({
    queryKey: ['menu_items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*, menu_item_ingredients(*)')
        .eq('active', true)
        .order('name');
      if (error) throw error;
      return data as (MenuItem & { menu_item_ingredients: Ingredient[] })[];
    },
  });
}

export function useAddMenuItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      item,
      ingredients,
    }: {
      item: Omit<MenuItem, 'id' | 'active'>;
      ingredients: Omit<Ingredient, 'id' | 'menu_item_id'>[];
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: inserted, error: ie } = await supabase
        .from('menu_items')
        .insert({ ...item, user_id: user!.id })
        .select('id')
        .single();
      if (ie) throw ie;
      if (ingredients.length) {
        const rows = ingredients.map(ing => ({ ...ing, menu_item_id: inserted.id }));
        const { error: inge } = await supabase.from('menu_item_ingredients').insert(rows);
        if (inge) throw inge;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['menu_items'] }),
  });
}

export function useDeleteMenuItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('menu_item_ingredients').delete().eq('menu_item_id', id);
      const { error } = await supabase.from('menu_items').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['menu_items'] }),
  });
}
