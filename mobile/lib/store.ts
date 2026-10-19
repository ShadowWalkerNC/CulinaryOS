import { create } from 'zustand';
import {
  type StaffAuthResponse,
  type MobileOrder,
  type MobileMenuItem,
  type MobileInventoryItem,
  loginWithPin,
  fetchLiveOrders,
  fetchLiveMenu,
  fetchLiveInventory,
} from './api';

interface AppState {
  tenantId: string;
  user: StaffAuthResponse | null;
  isLoggedIn: boolean;
  orders: MobileOrder[];
  menu: MobileMenuItem[];
  inventory: MobileInventoryItem[];
  loading: boolean;
  error: string | null;

  setTenantId: (id: string) => void;
  login: (pin: string) => Promise<boolean>;
  logout: () => void;
  loadData: () => Promise<void>;
  bumpOrder: (orderId: string, status: MobileOrder['status']) => void;
  toggleMenuAvailability: (itemId: string) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  tenantId: '00000000-0000-0000-0000-000000000001',
  user: {
    token: 'demo_token_1234',
    role: 'server',
    name: 'Marcus Vance',
    tenant_id: '00000000-0000-0000-0000-000000000001',
    isManager: false,
  },
  isLoggedIn: true,
  orders: [],
  menu: [],
  inventory: [],
  loading: false,
  error: null,

  setTenantId: (id) => set({ tenantId: id }),

  login: async (pin: string) => {
    set({ loading: true, error: null });
    try {
      const user = await loginWithPin(pin, get().tenantId);
      set({ user, isLoggedIn: true, loading: false });
      await get().loadData();
      return true;
    } catch (err: any) {
      set({ error: err.message || 'Login failed', loading: false });
      return false;
    }
  },

  logout: () => {
    set({ user: null, isLoggedIn: false });
  },

  loadData: async () => {
    set({ loading: true });
    try {
      const [orders, menu, inventory] = await Promise.all([
        fetchLiveOrders(get().tenantId),
        fetchLiveMenu(get().tenantId),
        fetchLiveInventory(get().tenantId),
      ]);
      set({ orders, menu, inventory, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  bumpOrder: (orderId: string, status: MobileOrder['status']) => {
    set((state) => ({
      orders: state.orders.map((o) => (o.id === orderId ? { ...o, status } : o)),
    }));
  },

  toggleMenuAvailability: (itemId: string) => {
    set((state) => ({
      menu: state.menu.map((m) =>
        m.id === itemId ? { ...m, is_available: !m.is_available } : m
      ),
    }));
  },
}));
