import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

// ---------- types ----------
export interface Employee {
  id: string;
  name: string;
  role: string;
  hourly_rate: number;
  active: boolean;
}

export interface Shift {
  id: string;
  employee_id: string;
  shift_date: string;
  shift_name: string;
  start_time: string;
  end_time: string;
  actual_hours: number | null;
  employees?: { name: string; hourly_rate: number };
}

// ---------- employees ----------
export function useEmployees() {
  return useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('active', true)
        .order('name');
      if (error) throw error;
      return data as Employee[];
    },
  });
}

export function useAddEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (emp: Omit<Employee, 'id' | 'active'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('employees').insert({ ...emp, user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employees'] }),
  });
}

// ---------- shifts ----------
export function useShifts(date?: string) {
  return useQuery({
    queryKey: ['shifts', date],
    queryFn: async () => {
      let q = supabase
        .from('shifts')
        .select('*, employees(name, hourly_rate)')
        .order('shift_date', { ascending: false });
      if (date) q = q.eq('shift_date', date);
      const { data, error } = await q;
      if (error) throw error;
      return data as Shift[];
    },
  });
}

export function useAddShift() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (shift: Omit<Shift, 'id' | 'employees'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('shifts').insert({ ...shift, user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shifts'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteShift() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('shifts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shifts'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
