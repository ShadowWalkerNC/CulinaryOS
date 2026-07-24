import type { OnlineOrder, OnlineOrderStatus } from '../types';

const API = import.meta.env.VITE_API_URL ?? '';
const STORAGE_KEY = 'culinaryos_online_orders';

function loadStoredOrders(): Record<string, OnlineOrder> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveStoredOrders(orders: Record<string, OnlineOrder>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
  } catch (err) {
    console.error('Failed to save order to localStorage:', err);
  }
}

export async function saveOrder(order: OnlineOrder): Promise<OnlineOrder> {
  // 1. Always save in localStorage for local persistence & offline support
  const orders = loadStoredOrders();
  orders[order.id] = order;
  saveStoredOrders(orders);

  // 2. Sync to backend API if available
  try {
    const res = await fetch(`${API}/v1/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': order.tenantSlug || 'demo',
      },
      body: JSON.stringify({
        id: order.id,
        takeaway: order.mode === 'pickup',
        delivery: order.mode === 'delivery',
        customer: order.customer,
        items: order.items,
        subtotal: order.subtotal,
        tax: order.tax,
        deliveryFee: order.deliveryFee,
        tip: order.tip,
        total: order.total,
        mode: order.mode,
        status: order.status,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.ok && data.data?.id) {
        order.id = data.data.id;
        orders[order.id] = order;
        saveStoredOrders(orders);
      }
    }
  } catch {
    // API not reachable or offline - fallback to local storage order
  }

  return order;
}

export function getOrder(orderId: string): OnlineOrder | null {
  const orders = loadStoredOrders();
  if (orders[orderId]) {
    return orders[orderId];
  }

  // Fallback mock generator for demonstration/testing if orderId matches or is generic
  if (orderId.startsWith('ord_') || orderId === 'demo' || orderId === 'sample') {
    const mockOrder: OnlineOrder = {
      id: orderId,
      tenantSlug: 'demo',
      orderNumber: 1042,
      mode: 'delivery',
      customer: {
        name: 'Alex Morgan',
        phone: '(555) 234-5678',
        email: 'alex@example.com',
        address: '742 Evergreen Terrace, Apt 4B',
        deliveryNotes: 'Ring bell upon arrival',
      },
      items: [
        {
          id: 'item-demo-1',
          menu_item_id: 'item-3',
          name: 'Wood-Fired Margherita Pizza',
          unit_price: 2050,
          quantity: 1,
          modifiers: [{ modifier_id: 'mod-top-1', name: 'Prosciutto di Parma', price_adjustment: 400 }],
        },
        {
          id: 'item-demo-2',
          menu_item_id: 'item-1',
          name: 'Truffle Hummus & Pita',
          unit_price: 950,
          quantity: 1,
          modifiers: [],
        },
      ],
      subtotal: 3000,
      tax: 266,
      deliveryFee: 399,
      tip: 600,
      total: 4265,
      status: 'preparing',
      createdAt: new Date().toISOString(),
      estimatedTime: '25-35 mins',
    };
    orders[orderId] = mockOrder;
    saveStoredOrders(orders);
    return mockOrder;
  }

  return null;
}

export function updateOrderStatus(orderId: string, status: OnlineOrderStatus): OnlineOrder | null {
  const orders = loadStoredOrders();
  if (orders[orderId]) {
    orders[orderId] = {
      ...orders[orderId],
      status,
    };
    saveStoredOrders(orders);
    return orders[orderId];
  }
  return null;
}
