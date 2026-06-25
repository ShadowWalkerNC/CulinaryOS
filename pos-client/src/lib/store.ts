import { create } from 'zustand';

type POSView = 'tables' | 'order' | 'menu' | 'checkout';

interface POSStore {
  view: POSView;
  setView: (v: POSView) => void;
  activeOrderId: string | null;
  setActiveOrder: (id: string | null) => void;
  tenantId: string;
}

export const usePOSStore = create<POSStore>((set) => ({
  view: 'tables',
  setView: (v) => set({ view: v }),
  activeOrderId: null,
  setActiveOrder: (id) => set({ activeOrderId: id, view: id ? 'order' : 'tables' }),
  tenantId: import.meta.env.VITE_TENANT_ID ?? 'demo',
}));
