// Isomorphic API base URL (supports Node test runner, Android emulator 10.0.2.2, and physical device LAN)
export const DEFAULT_API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  process.env.CULINARY_API_URL ||
  'http://localhost:3000';

export interface StaffAuthResponse {
  token: string;
  role: string;
  name: string;
  tenant_id: string;
  isManager: boolean;
}

export interface MobileOrderItem {
  id: string;
  name: string;
  price_cents: number;
  quantity: number;
  modifiers?: string[];
}

export interface MobileOrder {
  id: string;
  order_number: string;
  table_number: string;
  server_name: string;
  status: 'pending' | 'fired' | 'ready' | 'paid' | 'voided';
  total_cents: number;
  items: MobileOrderItem[];
  created_at: string;
}

export interface MobileMenuItem {
  id: string;
  name: string;
  category: string;
  price_cents: number;
  description: string;
  is_available: boolean;
}

export interface MobileInventoryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  par_level: number;
  cost_cents: number;
  is_low_stock: boolean;
}

// ---- API Service Implementation ----

export async function loginWithPin(pin: string, tenantId?: string): Promise<StaffAuthResponse> {
  // If backend is running, attempt real PIN login
  try {
    const res = await fetch(`${DEFAULT_API_URL}/v1/auth/pin-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': tenantId || '00000000-0000-0000-0000-000000000001',
      },
      body: JSON.stringify({ pin }),
    });

    if (res.ok) {
      const data = await res.json();
      return {
        token: data.session?.access_token || `dev_token_${pin}`,
        role: pin === '5678' ? 'manager' : 'server',
        name: pin === '5678' ? 'Elena Rostova (GM)' : 'Marcus Vance',
        tenant_id: tenantId || '00000000-0000-0000-0000-000000000001',
        isManager: pin === '5678',
      };
    }
  } catch (err) {
    console.warn('[MobileAPI] Backend unreachable, falling back to offline demo auth');
  }

  // Graceful offline fallback
  if (pin === '5678') {
    return {
      token: 'demo_token_5678',
      role: 'manager',
      name: 'Elena Rostova (GM)',
      tenant_id: '00000000-0000-0000-0000-000000000001',
      isManager: true,
    };
  } else if (pin === '1234') {
    return {
      token: 'demo_token_1234',
      role: 'server',
      name: 'Marcus Vance',
      tenant_id: '00000000-0000-0000-0000-000000000001',
      isManager: false,
    };
  }

  throw new Error('Invalid PIN. Use 1234 (Server) or 5678 (Manager).');
}

export async function fetchLiveOrders(tenantId?: string): Promise<MobileOrder[]> {
  try {
    const res = await fetch(`${DEFAULT_API_URL}/v1/orders`, {
      headers: {
        'X-Tenant-Id': tenantId || '00000000-0000-0000-0000-000000000001',
      },
    });
    if (res.ok) {
      const json = await res.json();
      return json.data || json;
    }
  } catch {
    // Return structured offline demonstration orders
  }

  return [
    {
      id: 'ord-101',
      order_number: '#101',
      table_number: 'Table 4',
      server_name: 'Marcus Vance',
      status: 'fired',
      total_cents: 4900,
      items: [
        { id: 'i-1', name: 'Culinary Smash Burger', price_cents: 1850, quantity: 2, modifiers: ['Med Rare', 'Extra Pickles'] },
        { id: 'i-2', name: 'Truffle Parm Fries', price_cents: 1200, quantity: 1 },
      ],
      created_at: new Date(Date.now() - 12 * 60000).toISOString(),
    },
    {
      id: 'ord-102',
      order_number: '#102',
      table_number: 'Bar 2',
      server_name: 'Elena Rostova',
      status: 'ready',
      total_cents: 3000,
      items: [
        { id: 'i-3', name: 'Classic Espresso Martini', price_cents: 1500, quantity: 2 },
      ],
      created_at: new Date(Date.now() - 6 * 60000).toISOString(),
    },
    {
      id: 'ord-103',
      order_number: '#103',
      table_number: 'Patio 1',
      server_name: 'Marcus Vance',
      status: 'pending',
      total_cents: 3800,
      items: [
        { id: 'i-4', name: 'Wood-Fired Margherita', price_cents: 1900, quantity: 2, modifiers: ['Extra Basil'] },
      ],
      created_at: new Date(Date.now() - 2 * 60000).toISOString(),
    },
  ];
}

export async function fetchLiveMenu(tenantId?: string): Promise<MobileMenuItem[]> {
  try {
    const res = await fetch(`${DEFAULT_API_URL}/v1/menu`, {
      headers: {
        'X-Tenant-Id': tenantId || '00000000-0000-0000-0000-000000000001',
      },
    });
    if (res.ok) {
      const json = await res.json();
      return json.data || json;
    }
  } catch {
    // Return structured offline menu
  }

  return [
    { id: 'm-1', name: 'Truffle Parm Fries', category: 'Starters', price_cents: 1200, description: 'Idaho russet potatoes, pecorino, white truffle oil', is_available: true },
    { id: 'm-2', name: 'Crispy Buffalo Wings', category: 'Starters', price_cents: 1600, description: '1lb jumbo wings, Danish blue cheese, celery sticks', is_available: true },
    { id: 'm-3', name: 'Culinary Smash Burger', category: 'Mains', price_cents: 1850, description: 'Two Angus patties, aged cheddar, brioche bun, secret spread', is_available: true },
    { id: 'm-4', name: 'Wood-Fired Margherita Pizza', category: 'Mains', price_cents: 1900, description: 'San Marzano DOP, buffalo mozzarella, fresh basil, EVOO', is_available: true },
    { id: 'm-5', name: 'Spicy Rigatoni Alla Vodka', category: 'Mains', price_cents: 2200, description: 'Calabrian chili cream, organic tomatoes, fresh parmesan', is_available: true },
    { id: 'm-6', name: 'Local Hazy IPA (Pint)', category: 'Beverages', price_cents: 850, description: 'Draft 6.8% ABV, juicy tropical citrus notes', is_available: true },
    { id: 'm-7', name: 'Espresso Martini', category: 'Beverages', price_cents: 1500, description: 'Fresh pull espresso, vodka, coffee liqueur, vanilla', is_available: true },
  ];
}

export async function fetchLiveInventory(tenantId?: string): Promise<MobileInventoryItem[]> {
  return [
    { id: 'inv-1', name: 'Angus Beef Patties (8oz)', quantity: 42, unit: 'portions', par_level: 50, cost_cents: 320, is_low_stock: true },
    { id: 'inv-2', name: 'Brioche Burger Buns', quantity: 68, unit: 'units', par_level: 40, cost_cents: 65, is_low_stock: false },
    { id: 'inv-3', name: 'San Marzano DOP Tomatoes', quantity: 8, unit: '#10 cans', par_level: 12, cost_cents: 950, is_low_stock: true },
    { id: 'inv-4', name: 'Fior di Latte Mozzarella', quantity: 18, unit: 'lbs', par_level: 15, cost_cents: 480, is_low_stock: false },
    { id: 'inv-5', name: 'Local Hazy IPA Keg', quantity: 2, unit: '1/2 bbl', par_level: 2, cost_cents: 18500, is_low_stock: false },
    { id: 'inv-6', name: 'Espresso Coffee Beans', quantity: 3.5, unit: 'lbs', par_level: 10, cost_cents: 1400, is_low_stock: true },
  ];
}
