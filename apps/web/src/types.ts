export interface Modifier {
  id:               string;
  name:             string;
  price_adjustment: number;  // cents — can be negative
  is_default:       boolean;
}

export interface ModifierGroup {
  id:             string;
  name:           string;
  required:       boolean;
  min_selections: number;
  max_selections: number;
  sort_order:     number;
  modifiers:      Modifier[];
}

export interface MenuItem {
  id:              string;
  name:            string;
  description:     string | null;
  price:           number;        // cents
  status:          'available' | 'unavailable' | '86d';
  station:         string;
  allergens:       string[];
  image_url:       string | null;
  sort_order:      number;
  modifier_groups: ModifierGroup[];
  tags?:           string[];      // e.g. ['popular', 'chef_special', 'spicy', 'vegan', 'gluten_free']
  calories?:       number;
}

export interface MenuSection {
  id:         string;
  name:       string;
  description?: string;
  sort_order: number;
  menu_items: MenuItem[];
}

export interface MenuData {
  restaurant: {
    id: string;
    name: string;
    slug: string;
    tagline?: string;
    address?: string;
    phone?: string;
    hours?: string;
    rating?: number;
    reviewCount?: number;
  };
  menu: {
    id: string;
    name: string;
    description: string | null;
  };
  sections: MenuSection[];
}

// Cart
export interface CartModifier {
  modifier_id:      string;
  name:             string;
  price_adjustment: number;
}

export interface CartItem {
  id:          string;   // unique per cart line (uuid)
  menu_item_id: string;
  name:         string;
  unit_price:   number;  // cents (base + selected modifiers)
  quantity:     number;
  modifiers:    CartModifier[];
  notes?:       string;
}

export type CartState = {
  items:     CartItem[];
  total:     number;     // cents
  itemCount: number;
};

// Online Order & Checkout
export type OrderMode = 'pickup' | 'delivery';
export type OnlineOrderStatus = 'received' | 'preparing' | 'ready' | 'out_for_delivery' | 'completed';
export type PaymentMethod = 'card' | 'apple_pay' | 'pay_at_counter';

export interface CustomerInfo {
  name:          string;
  phone:         string;
  email:         string;
  address?:      string;
  aptSuite?:     string;
  deliveryNotes?: string;
  pickupTime?:   string;
}

export interface OnlineOrder {
  id:            string;
  tenantSlug:    string;
  orderNumber:   number;
  mode:          OrderMode;
  paymentMethod?: PaymentMethod;
  customer:      CustomerInfo;
  items:         CartItem[];
  subtotal:      number;      // cents
  tax:           number;      // cents
  deliveryFee:   number;      // cents
  tip:           number;      // cents
  total:         number;      // cents
  status:        OnlineOrderStatus;
  createdAt:     string;      // ISO timestamp
  estimatedTime: string;
}
