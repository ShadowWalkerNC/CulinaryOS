import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export interface Vendor {
  id: string;
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  active: boolean;
}

export interface PurchaseOrder {
  id: string;
  vendor_id: string;
  status: 'draft' | 'sent' | 'received' | 'invoiced';
  order_date: string;
  vendors?: { name: string };
}

export interface POLineItem {
  id: string;
  po_id: string;
  name: string;
  quantity: number;
  unit: string;
  unit_cost: number | null;
  received_qty: number | null;
}

export function useVendors() {
  return useQuery({
    queryKey: ['vendors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .eq('active', true)
        .order('name');
      if (error) throw error;
      return data as Vendor[];
    },
  });
}

export function useAddVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: Omit<Vendor, 'id' | 'active'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('vendors').insert({ ...v, user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vendors'] }),
  });
}

export function usePurchaseOrders() {
  return useQuery({
    queryKey: ['purchase_orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_orders')
        .select('*, vendors(name)')
        .order('order_date', { ascending: false });
      if (error) throw error;
      return data as PurchaseOrder[];
    },
  });
}

export function useCreatePO() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      po,
      lines,
    }: {
      po: { vendor_id: string; order_date: string };
      lines: Omit<POLineItem, 'id' | 'po_id'>[];
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: inserted, error: poe } = await supabase
        .from('purchase_orders')
        .insert({ ...po, user_id: user!.id, status: 'draft' })
        .select('id')
        .single();
      if (poe) throw poe;
      if (lines.length) {
        const rows = lines.map(l => ({ ...l, po_id: inserted.id }));
        const { error: le } = await supabase.from('po_line_items').insert(rows);
        if (le) throw le;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchase_orders'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdatePOStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: PurchaseOrder['status'] }) => {
      const { error } = await supabase.from('purchase_orders').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchase_orders'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
