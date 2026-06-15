export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  ingredients: { name: string; requiredQty: number; unit: string }[];
}

export interface OrderItem {
  id: string;
  productName: string;
  quantity: number;
  price: number;
  modifiers?: string[];
}

export type OrderStatus = 'queued' | 'prep' | 'ready' | 'bumped';

export interface KDSTicket {
  id: string;
  orderId: string;
  tableNumber?: string;
  status: OrderStatus;
  elapsedSeconds: number;
  items: OrderItem[];
  priority: 'low' | 'medium' | 'high';
}

export interface InventoryItem {
  id: string;
  name: string;
  stockQty: number;
  parLevel: number;
  unit: string;
  costPerUnit: number;
}

export interface StaffShift {
  id: string;
  staffName: string;
  role: 'Chef' | 'Sous Chef' | 'Line Cook' | 'Server';
  startTime: string;
  endTime: string;
  hourlyRate: number;
}

export interface CRMCustomer {
  id: string;
  name: string;
  email: string;
  tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  points: number;
  totalSpent: number;
}
