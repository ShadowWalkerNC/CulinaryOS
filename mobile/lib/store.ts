import { create } from 'zustand';

interface AppState {
  tenantId: string | null;
  setTenantId: (id: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  tenantId: null,
  setTenantId: (id) => set({ tenantId: id }),
}));
