import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

const DEV_SEED_USER_ID = '00000000-0000-0000-0000-000000000001';

async function getUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || DEV_SEED_USER_ID;
}

export interface DBInventoryBatch {
  id: string;
  user_id: string;
  ingredient_name: string;
  quantity: number;
  unit: string;
  received_date: string;
  expiration_date: string;
  storage_location: string;
  created_at: string;
}

export interface DBWasteLog {
  id: string;
  user_id: string;
  ingredient_name: string;
  quantity: number;
  unit: string;
  reason: string;
  cost: number;
  logged_at: string;
}

export interface AddInventoryBatchInput {
  ingredient_name: string;
  quantity: number;
  unit: string;
  received_date?: string;
  expiration_date: string;
  storage_location?: string;
}

export interface LogWasteInput {
  ingredient_name: string;
  quantity: number;
  unit: string;
  reason: string;
  cost?: number;
}

export function useInventoryBatches() {
  return useQuery<DBInventoryBatch[]>({
    queryKey: ['inventory_batches'],
    queryFn: async () => {
      const userId = await getUserId();
      const { data, error } = await supabase
        .from('inventory_batches')
        .select('*')
        .eq('user_id', userId)
        .order('expiration_date', { ascending: true });
      if (error) throw error;
      return data as DBInventoryBatch[];
    },
  });
}

export function useWasteLogs() {
  return useQuery<DBWasteLog[]>({
    queryKey: ['waste_logs'],
    queryFn: async () => {
      const userId = await getUserId();
      const { data, error } = await supabase
        .from('waste_logs')
        .select('*')
        .eq('user_id', userId)
        .order('logged_at', { ascending: false });
      if (error) throw error;
      return data as DBWasteLog[];
    },
  });
}

export function useAddInventoryBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: AddInventoryBatchInput) => {
      const userId = await getUserId();
      const { data, error } = await supabase
        .from('inventory_batches')
        .insert({
          user_id: userId,
          ingredient_name: payload.ingredient_name,
          quantity: payload.quantity,
          unit: payload.unit,
          received_date: payload.received_date || new Date().toISOString().split('T')[0],
          expiration_date: payload.expiration_date,
          storage_location: payload.storage_location || 'Walk-in Cooler',
        })
        .select()
        .single();
      if (error) throw error;
      return data as DBInventoryBatch;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['inventory_batches'] });
      toast.success(`Batch for "${data.ingredient_name}" logged`);
    },
    onError: (err: Error) => {
      toast.error(`Failed to add inventory batch: ${err.message}`);
    },
  });
}

export function useDeleteInventoryBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('inventory_batches').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory_batches'] });
      toast.success('Batch removed');
    },
    onError: (err: Error) => {
      toast.error(`Failed to delete batch: ${err.message}`);
    },
  });
}

export function useLogWaste() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: LogWasteInput) => {
      const userId = await getUserId();
      const { data, error } = await supabase
        .from('waste_logs')
        .insert({
          user_id: userId,
          ingredient_name: payload.ingredient_name,
          quantity: payload.quantity,
          unit: payload.unit,
          reason: payload.reason,
          cost: payload.cost || 0,
        })
        .select()
        .single();
      if (error) throw error;
      return data as DBWasteLog;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['waste_logs'] });
      toast.success(`Logged ${data.quantity}${data.unit} waste for "${data.ingredient_name}"`);
    },
    onError: (err: Error) => {
      toast.error(`Failed to log waste: ${err.message}`);
    },
  });
}
