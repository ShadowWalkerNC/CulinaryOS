import { create } from 'zustand';
import { setSession } from '@culinaryos/auth';

export type POSView = 'dashboard' | 'tables' | 'menu' | 'checkout' | 'tabs' | 'staff' | 'recall' | 'settings' | 'reports' | 'cfd';

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
  drawerBalance: number; // in cents (legacy compatibility)
  setDrawerBalance: (bal: number) => void;

  // Day & Multi-Drawer Session Management
  dayStatus: 'open' | 'closed';
  openDay: (openingFloatCents: number, managerName: string) => void;
  closeDay: (managerName: string) => void;
  activeDrawerId: string;
  drawers: {
    id: string;
    name: string;
    station: string;
    status: 'open' | 'closed';
    openingFloatCents: number;
    currentBalanceCents: number;
    openedAt?: string;
  }[];
  openDrawer: (drawerId: string, floatCents: number) => void;
  closeDrawer: (drawerId: string) => void;
  setActiveDrawerId: (drawerId: string) => void;
  updateDrawerBalance: (drawerId: string, balanceCents: number) => void;
}

const DEFAULT_DRAWERS = [
  { id: 'drawer-1', name: 'Station #1 (Main FOH Terminal)', station: 'FOH Front Counter', status: 'open' as const, openingFloatCents: 15000, currentBalanceCents: 15000, openedAt: '08:00 AM' },
  { id: 'drawer-2', name: 'Station #2 (Bar / Patio Terminal)', station: 'Bar / Lounge', status: 'closed' as const, openingFloatCents: 15000, currentBalanceCents: 15000 },
  { id: 'drawer-3', name: 'Station #3 (Drive-Thru / Takeout)', station: 'Takeout Counter', status: 'closed' as const, openingFloatCents: 15000, currentBalanceCents: 15000 },
];

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
  setDrawerBalance: (bal) => {
    const { activeDrawerId, drawers } = get();
    const updatedDrawers = drawers.map(d => d.id === activeDrawerId ? { ...d, currentBalanceCents: bal } : d);
    set({ drawerBalance: bal, drawers: updatedDrawers });
  },

  dayStatus: 'open',
  openDay: (openingFloatCents: number, managerName: string) => {
    set((state) => ({
      dayStatus: 'open',
      drawerBalance: openingFloatCents,
      drawers: state.drawers.map((d) =>
        d.id === state.activeDrawerId
          ? { ...d, status: 'open', openingFloatCents, currentBalanceCents: openingFloatCents, openedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
          : d
      ),
    }));
  },
  closeDay: (_managerName: string) => {
    set((state) => ({
      dayStatus: 'closed',
      drawers: state.drawers.map((d) => ({ ...d, status: 'closed' })),
    }));
  },
  activeDrawerId: 'drawer-1',
  drawers: DEFAULT_DRAWERS,
  openDrawer: (drawerId: string, floatCents: number) => {
    set((state) => ({
      drawers: state.drawers.map((d) =>
        d.id === drawerId
          ? {
              ...d,
              status: 'open',
              openingFloatCents: floatCents,
              currentBalanceCents: floatCents,
              openedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            }
          : d
      ),
      activeDrawerId: drawerId,
      drawerBalance: floatCents,
    }));
  },
  closeDrawer: (drawerId: string) => {
    set((state) => ({
      drawers: state.drawers.map((d) => (d.id === drawerId ? { ...d, status: 'closed' } : d)),
    }));
  },
  setActiveDrawerId: (drawerId: string) => {
    const target = get().drawers.find((d) => d.id === drawerId);
    if (target) {
      set({ activeDrawerId: drawerId, drawerBalance: target.currentBalanceCents });
    }
  },
  updateDrawerBalance: (drawerId: string, balanceCents: number) => {
    set((state) => ({
      drawerBalance: state.activeDrawerId === drawerId ? balanceCents : state.drawerBalance,
      drawers: state.drawers.map((d) => (d.id === drawerId ? { ...d, currentBalanceCents: balanceCents } : d)),
    }));
  },
}));
