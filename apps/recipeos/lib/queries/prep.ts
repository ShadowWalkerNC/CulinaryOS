import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { PrepList, PrepTask } from '@shared/types';

export function usePrepLists() {
  return useQuery<PrepList[]>({
    queryKey: ['prep-lists'],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('prep_lists')
        .select('*, tasks:prep_tasks(*)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as PrepList[];
    },
  });
}

export function useTogglePrepTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_done }: { id: string; is_done: boolean }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from('prep_tasks')
        .update({ is_done, completed_at: is_done ? new Date().toISOString() : null } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['prep-lists'] }),
  });
}
