import { create } from 'zustand';
import { setSession } from '@culinaryos/auth';

export type POSView = 'dashboard' | 'tables' | 'menu' | 'checkout' | 'tabs' | 'staff' | 'recall' | 'settings' | 'reports';

interface Employee {
  name: string;
  role: string;
  userId?: string;
  accessToken?: string;
  clockedInAt?: string;
}

interface POSStore {
  view: POSView;
  setView: (v: POSView) => void;
  activeOrderId: string | null;
  setActiveOrder: (id: string | null) => void;
  tenantId: string;

  // Operator & Session State
  employee: Employee | null;
  setEmployee: (emp: Employee | null) => void;
  drawerBalance: number; // in cents
  setDrawerBalance: (bal: number) => void;
}

export const usePOSStore = create<POSStore>((set, get) => ({
  view: 'staff', // force staff login/clock-in screen on launch!
  setView: (v) => set({ view: v }),
  activeOrderId: null,
  setActiveOrder: (id) => set(() => {
    const nextView = id ? 'menu' : 'tables';
    return { activeOrderId: id, view: nextView };
  }),
  tenantId: import.meta.env.VITE_TENANT_ID ?? '00000000-0000-0000-0000-000000000001',

  employee: null,
  setEmployee: (emp) => {
    if (!emp) {
      setSession(null);
    } else if (emp.accessToken && emp.userId) {
      setSession({
        userId: emp.userId,
        tenantId: get().tenantId,
        role: (emp.role as any) || 'server',
        displayName: emp.name,
        accessToken: emp.accessToken,
      });
    }
    set({ employee: emp, view: emp ? 'dashboard' : 'staff' });
  },
  drawerBalance: 15000, // default $150.00 float
  setDrawerBalance: (bal) => set({ drawerBalance: bal }),
}));
