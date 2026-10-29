import { create } from 'zustand';
import {
  type StaffAuthResponse,
  type MobileOrder,
  type MobileMenuItem,
  type MobileInventoryItem,
  type MobileDisplayDevice,
  DEFAULT_API_URL,
  setApiBaseUrl,
  loginWithPin,
  fetchLiveOrders,
  fetchLiveMenu,
  fetchLiveInventory,
  fetchPairedDisplays,
  bumpOrderRemote,
  updateMenuAvailabilityRemote,
  adjustInventoryStockRemote,
  pairTvDisplayRemote,
  switchTvDisplayModeRemote,
} from './api';

interface AppState {
  apiBaseUrl: string;
  tenantId: string;
  user: StaffAuthResponse | null;
  isLoggedIn: boolean;
  orders: MobileOrder[];
  menu: MobileMenuItem[];
  inventory: MobileInventoryItem[];
  displays: MobileDisplayDevice[];
  loading: boolean;
  error: string | null;

  setServerUrl: (url: string) => void;
  setTenantId: (id: string) => void;
  login: (pin: string) => Promise<boolean>;
  logout: () => void;
  loadData: () => Promise<void>;
  bumpOrder: (orderId: string, status: MobileOrder['status']) => void;
  toggleMenuAvailability: (itemId: string) => void;
  adjustInventoryStock: (itemId: string, delta: number) => void;
  pairDisplay: (
    code: string,
    name: string,
    mode: MobileDisplayDevice['assignedMode'],
    view?: string,
    brand?: 'culinaryos' | 'cheezies'
  ) => Promise<MobileDisplayDevice>;
  switchDisplayMode: (
    displayId: string,
    mode: MobileDisplayDevice['assignedMode'],
    view?: string
  ) => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  apiBaseUrl: DEFAULT_API_URL,
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
  displays: [],
  loading: false,
  error: null,

  setServerUrl: (url: string) => {
    setApiBaseUrl(url);
    set({ apiBaseUrl: url });
  },

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
      const tenant = get().tenantId;
      const [orders, menu, inventory, displays] = await Promise.all([
        fetchLiveOrders(tenant),
        fetchLiveMenu(tenant),
        fetchLiveInventory(tenant),
        fetchPairedDisplays(tenant),
      ]);
      set({ orders, menu, inventory, displays, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  bumpOrder: (orderId: string, status: MobileOrder['status']) => {
    set((state) => ({
      orders: state.orders.map((o) => (o.id === orderId ? { ...o, status } : o)),
    }));
    bumpOrderRemote(orderId, status, get().tenantId);
  },

  toggleMenuAvailability: (itemId: string) => {
    const target = get().menu.find((m) => m.id === itemId);
    const nextAvailable = target ? !target.is_available : false;
    set((state) => ({
      menu: state.menu.map((m) =>
        m.id === itemId ? { ...m, is_available: nextAvailable } : m
      ),
    }));
    updateMenuAvailabilityRemote(itemId, nextAvailable, get().tenantId);
  },

  adjustInventoryStock: (itemId: string, delta: number) => {
    let updatedQty = 0;
    set((state) => ({
      inventory: state.inventory.map((item) => {
        if (item.id !== itemId) return item;
        updatedQty = Math.max(0, Number((item.quantity + delta).toFixed(2)));
        return {
          ...item,
          quantity: updatedQty,
          is_low_stock: updatedQty <= item.par_level,
        };
      }),
    }));
    adjustInventoryStockRemote(itemId, updatedQty, get().tenantId);
  },

  pairDisplay: async (code, name, mode, view = 'all', brand = 'culinaryos') => {
    const paired = await pairTvDisplayRemote(code, name, mode, view, brand, get().tenantId);
    set((state) => ({
      displays: [paired, ...state.displays.filter((d) => d.id !== paired.id)],
    }));
    return paired;
  },

  switchDisplayMode: async (displayId, mode, view = 'all') => {
    set((state) => ({
      displays: state.displays.map((d) =>
        d.id === displayId ? { ...d, assignedMode: mode, assignedView: view } : d
      ),
    }));
    await switchTvDisplayModeRemote(displayId, mode, view, get().tenantId);
  },
}));
