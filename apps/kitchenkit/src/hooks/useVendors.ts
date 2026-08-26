import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

const DEV_SEED_USER_ID = '00000000-0000-0000-0000-000000000001';

async function getUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || DEV_SEED_USER_ID;
}

export interface DBVendor {
  id: string;
  user_id: string;
  name: string;
  contact_name?: string | null;
  email?: string | null;
  phone?: string | null;
  order_days: string[];
  min_order_amount: number;
  created_at: string;
  updated_at: string;
}

export interface DBVendorItem {
  id: string;
  vendor_id: string;
  user_id: string;
  ingredient_name: string;
  sku?: string | null;
  package_size?: string | null;
  unit_cost: number;
  is_preferred: boolean;
  created_at: string;
}

export interface CreateVendorInput {
  name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  order_days?: string[];
  min_order_amount?: number;
}

export interface UpsertVendorItemInput {
  id?: string;
  vendor_id: string;
  ingredient_name: string;
  sku?: string;
  package_size?: string;
  unit_cost?: number;
  is_preferred?: boolean;
}

export function useVendors() {
  return useQuery<DBVendor[]>({
    queryKey: ['vendors'],
    queryFn: async () => {
      const userId = await getUserId();
      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .eq('user_id', userId)
        .order('name', { ascending: true });
      if (error) throw error;
      return data as DBVendor[];
    },
  });
}

export function useVendorItems(vendorId?: string) {
  return useQuery<DBVendorItem[]>({
    queryKey: ['vendor_items', vendorId],
    queryFn: async () => {
      const userId = await getUserId();
      let query = supabase.from('vendor_items').select('*').eq('user_id', userId);
      if (vendorId) {
        query = query.eq('vendor_id', vendorId);
      }
      const { data, error } = await query.order('ingredient_name', { ascending: true });
      if (error) throw error;
      return data as DBVendorItem[];
    },
  });
}

export function useCreateVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateVendorInput) => {
      const userId = await getUserId();
      const { data, error } = await supabase
        .from('vendors')
        .insert({
          user_id: userId,
          name: payload.name,
          contact_name: payload.contact_name ?? null,
          email: payload.email ?? null,
          phone: payload.phone ?? null,
          order_days: payload.order_days ?? [],
          min_order_amount: payload.min_order_amount ?? 0,
        })
        .select()
        .single();
      if (error) throw error;
      return data as DBVendor;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['vendors'] });
      toast.success(`Vendor "${data.name}" added`);
    },
    onError: (err: Error) => {
      toast.error(`Failed to add vendor: ${err.message}`);
    },
  });
}

export function useUpdateVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<CreateVendorInput> & { id: string }) => {
      const { error } = await supabase
        .from('vendors')
        .update({
          name: payload.name,
          contact_name: payload.contact_name,
          email: payload.email,
          phone: payload.phone,
          order_days: payload.order_days,
          min_order_amount: payload.min_order_amount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', payload.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vendors'] });
      toast.success('Vendor updated');
    },
    onError: (err: Error) => {
      toast.error(`Failed to update vendor: ${err.message}`);
    },
  });
}

export function useDeleteVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('vendors').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vendors'] });
      toast.success('Vendor deleted');
    },
    onError: (err: Error) => {
      toast.error(`Failed to delete vendor: ${err.message}`);
    },
  });
}

export function useUpsertVendorItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: UpsertVendorItemInput) => {
      const userId = await getUserId();
      const { data, error } = await supabase
        .from('vendor_items')
        .upsert(
          {
            ...(payload.id ? { id: payload.id } : {}),
            vendor_id: payload.vendor_id,
            user_id: userId,
            ingredient_name: payload.ingredient_name,
            sku: payload.sku ?? null,
            package_size: payload.package_size ?? null,
            unit_cost: payload.unit_cost ?? 0,
            is_preferred: payload.is_preferred ?? false,
          },
          { onConflict: payload.id ? 'id' : undefined }
        )
        .select()
        .single();
      if (error) throw error;
      return data as DBVendorItem;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['vendor_items'] });
      toast.success(`Mapped "${variables.ingredient_name}"`);
    },
    onError: (err: Error) => {
      toast.error(`Failed to map vendor item: ${err.message}`);
    },
  });
}

export function useDeleteVendorItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('vendor_items').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vendor_items'] });
      toast.success('Mapped item deleted');
    },
    onError: (err: Error) => {
      toast.error(`Failed to delete item: ${err.message}`);
    },
  });
}
