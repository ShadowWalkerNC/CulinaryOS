import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { PantryItem } from '@shared/types';

export function usePantryItems() {
  return useQuery<PantryItem[]>({
    queryKey: ['pantry'],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('pantry_items')
        .select('*')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map((item) => ({
        ...item,
        displayName: item.name_override ?? item.ingredient_id ?? 'Unknown',
        isLow: item.reorder_at != null && item.quantity <= item.reorder_at,
      }));
    },
  });
}

export function useAddPantryItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (item: { name_override: string; quantity: number; unit: string }) => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase.from('pantry_items').insert({
        ...item,
        user_id: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pantry'] }),
  });
}

export function useDeletePantryItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from('pantry_items').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pantry'] }),
  });
}
