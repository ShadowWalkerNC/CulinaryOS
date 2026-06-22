import { create } from 'zustand';
import type { KitchenStation } from '../../../shared/types';

interface KDSStore {
  activeStation: KitchenStation | 'all';
  setStation: (s: KitchenStation | 'all') => void;
  tenantId: string;
  setTenantId: (id: string) => void;
}

export const useKDSStore = create<KDSStore>((set) => ({
  activeStation: 'all',
  setStation: (s) => set({ activeStation: s }),
  tenantId: import.meta.env.VITE_TENANT_ID ?? 'demo',
  setTenantId: (id) => set({ tenantId: id }),
}));
