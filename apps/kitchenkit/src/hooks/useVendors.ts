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

export const DEFAULT_DENNIS_VENDOR: DBVendor = {
  id: 'vendor-dennis-001',
  user_id: DEV_SEED_USER_ID,
  name: 'Dennis Food Service',
  contact_name: 'Dennis Account Specialist (Pepr)',
  email: 'orders@dennisfoodservice.com',
  phone: '(800) 439-2711',
  order_days: ['Monday', 'Wednesday', 'Friday'],
  min_order_amount: 350,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export const DEFAULT_DENNIS_ITEMS: DBVendorItem[] = [
  {
    id: 'd-item-1',
    vendor_id: 'vendor-dennis-001',
    user_id: DEV_SEED_USER_ID,
    ingredient_name: 'BACON 10-12 APPLEWOOD',
    sku: '20231',
    package_size: '4 X 5 LB (North Country)',
    unit_cost: 74.50,
    is_preferred: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'd-item-2',
    vendor_id: 'vendor-dennis-001',
    user_id: DEV_SEED_USER_ID,
    ingredient_name: 'BACON 10-12 SLAB FRESH',
    sku: '16454',
    package_size: '1 X 15 LB (Hatfield)',
    unit_cost: 58.20,
    is_preferred: false,
    created_at: new Date().toISOString(),
  },
  {
    id: 'd-item-3',
    vendor_id: 'vendor-dennis-001',
    user_id: DEV_SEED_USER_ID,
    ingredient_name: 'BACON 10-14 BULK CNTRY BRND',
    sku: '4541',
    package_size: '3 X 10 LB (Hormel)',
    unit_cost: 92.40,
    is_preferred: false,
    created_at: new Date().toISOString(),
  },
  {
    id: 'd-item-4',
    vendor_id: 'vendor-dennis-001',
    user_id: DEV_SEED_USER_ID,
    ingredient_name: 'BACON 10-14 SHNGLE HVY SMOKE',
    sku: '25318',
    package_size: '1 X 15 LB (Country Brand)',
    unit_cost: 61.50,
    is_preferred: false,
    created_at: new Date().toISOString(),
  },
  {
    id: 'd-item-5',
    vendor_id: 'vendor-dennis-001',
    user_id: DEV_SEED_USER_ID,
    ingredient_name: 'GROUND CHUCK 80/20 FRESH',
    sku: '11204',
    package_size: '2 X 10 LB (Dennis Choice)',
    unit_cost: 68.00,
    is_preferred: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'd-item-6',
    vendor_id: 'vendor-dennis-001',
    user_id: DEV_SEED_USER_ID,
    ingredient_name: 'MOZZARELLA WHOLE MILK SHRED',
    sku: '30412',
    package_size: '6 X 5 LB (Dennis Select)',
    unit_cost: 89.50,
    is_preferred: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'd-item-7',
    vendor_id: 'vendor-dennis-001',
    user_id: DEV_SEED_USER_ID,
    ingredient_name: 'EXTRA VIRGIN OLIVE OIL',
    sku: '55201',
    package_size: '4 X 3 L TIN (Import)',
    unit_cost: 112.00,
    is_preferred: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'd-item-8',
    vendor_id: 'vendor-dennis-001',
    user_id: DEV_SEED_USER_ID,
    ingredient_name: 'SAN MARZANO STYLE PLUM TOMATOES',
    sku: '28841',
    package_size: '6 X #10 CANS (Stanislaus)',
    unit_cost: 46.50,
    is_preferred: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'd-item-9',
    vendor_id: 'vendor-dennis-001',
    user_id: DEV_SEED_USER_ID,
    ingredient_name: 'HIGH GLUTEN BREAD FLOUR',
    sku: '44109',
    package_size: '1 X 50 LB (King Arthur)',
    unit_cost: 28.75,
    is_preferred: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'd-item-10',
    vendor_id: 'vendor-dennis-001',
    user_id: DEV_SEED_USER_ID,
    ingredient_name: 'HEAVY CREAM 36% GRADE A',
    sku: '18420',
    package_size: '12 X 1 QT (Oakhurst)',
    unit_cost: 42.00,
    is_preferred: true,
    created_at: new Date().toISOString(),
  },
];

export function useVendors() {
  return useQuery<DBVendor[]>({
    queryKey: ['vendors'],
    queryFn: async () => {
      try {
        const userId = await getUserId();
        const { data, error } = await supabase
          .from('vendors')
          .select('*')
          .eq('user_id', userId)
          .order('name', { ascending: true });
        if (error || !data || data.length === 0) {
          return [DEFAULT_DENNIS_VENDOR];
        }
        return data as DBVendor[];
      } catch {
        return [DEFAULT_DENNIS_VENDOR];
      }
    },
  });
}

export function useVendorItems(vendorId?: string) {
  return useQuery<DBVendorItem[]>({
    queryKey: ['vendor_items', vendorId],
    queryFn: async () => {
      try {
        const userId = await getUserId();
        let query = supabase.from('vendor_items').select('*').eq('user_id', userId);
        if (vendorId) {
          query = query.eq('vendor_id', vendorId);
        }
        const { data, error } = await query.order('ingredient_name', { ascending: true });
        if (error || !data || data.length === 0) {
          if (!vendorId || vendorId === DEFAULT_DENNIS_VENDOR.id) {
            return DEFAULT_DENNIS_ITEMS;
          }
          return [];
        }
        return data as DBVendorItem[];
      } catch {
        if (!vendorId || vendorId === DEFAULT_DENNIS_VENDOR.id) {
          return DEFAULT_DENNIS_ITEMS;
        }
        return [];
      }
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
