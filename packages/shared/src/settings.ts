// ============================================================
// CulinaryOS — Unified Settings & Customization Engine
// Company Info, Tax & Gratuity, Station Routing, Display/A11y
// ============================================================

export interface RestaurantAddress {
  street: string;
  unit?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export interface RestaurantCompanyInfo {
  name: string;
  legalName: string;
  taxId: string;
  phone: string;
  email: string;
  website: string;
  address: RestaurantAddress;
  logoUrl?: string;
  currencyCode: string;
  currencySymbol: string;
  currencyPosition: 'prefix' | 'suffix';
  taxRatePercent: number;
  preparedFoodTaxRatePercent?: number;
  alcoholTaxRatePercent?: number;
  taxRates?: {
    preparedFoodRatePercent: number;
    alcoholRatePercent: number;
    taxExemptRatePercent: 0;
    defaultRatePercent?: number;
  };
  gratuityPresets: number[];
  autoGratuityPartySize: number;
  autoGratuityPercent: number;
  receiptHeader: string;
  receiptFooter: string;
  guestWifiSsid: string;
  guestWifiPassword?: string;
}

export type KitchenStationId =
  | 'grill'
  | 'fry'
  | 'cold'
  | 'pizza'
  | 'bar'
  | 'pastry'
  | 'pass'
  | string;

export interface KitchenStationConfig {
  id: KitchenStationId;
  name: string;
  code: string;
  color: string;
  description: string;
  printerIp?: string;
  printerPort?: number;
  isExpoPass?: boolean;
  sortOrder: number;
}

export interface ItemRoutingRule {
  itemId: string;
  itemName: string;
  primaryStation: KitchenStationId;
  backupStation?: KitchenStationId | undefined;
  course: 'drinks' | 'starters' | 'mains' | 'desserts';
  targetPrepMinutes: number;
  printToStationPrinter: boolean;
  notes?: string | undefined;
}

export interface DisplayAccessibilitySettings {
  textSize: 'compact' | 'standard' | 'large' | 'xlarge';
  textScalePercent: number; // 100, 110, 125, 140
  touchTargetPadding: 'compact' | 'standard' | 'expanded';
  contrastMode: 'standard' | 'high-contrast-oled';
  theme: 'light' | 'dark' | 'system';
  kdsAlertSounds: boolean;
  kdsWarningMinutes: number; // e.g. 10 mins (amber)
  kdsCriticalMinutes: number; // e.g. 20 mins (red)
  receiptFontSize: 'normal' | 'large' | 'condensed';
  table3dGraphicsFidelity: 'low' | 'medium' | 'high';
  tableStatusGlowHalos: boolean;
}

export interface CulinaryOSSettings {
  tenantId: string;
  company: RestaurantCompanyInfo;
  stations: KitchenStationConfig[];
  routingRules: ItemRoutingRule[];
  display: DisplayAccessibilitySettings;
  updatedAt: string;
}

export const DEFAULT_KITCHEN_STATIONS: KitchenStationConfig[] = [
  {
    id: 'pass',
    name: 'Expo Master Pass',
    code: 'EXPO',
    color: '#0f172a',
    description: 'All tickets aggregate here for quality check and runner dispatch',
    isExpoPass: true,
    sortOrder: 1,
  },
  {
    id: 'grill',
    name: 'Hot Grill Station',
    code: 'GRILL',
    color: '#ef4444',
    description: 'Dry-aged steaks, smashburgers, chops, and wood-grilled proteins',
    sortOrder: 2,
  },
  {
    id: 'fry',
    name: 'Fryer & Sauté Station',
    code: 'FRY',
    color: '#f59e0b',
    description: 'Crispy calamari, french fries, tempura, pasta, and pan sauces',
    sortOrder: 3,
  },
  {
    id: 'cold',
    name: 'Cold Prep & Raw Bar',
    code: 'COLD',
    color: '#06b6d4',
    description: 'Truffle hummus, salads, carpaccio, oysters, and cold appetizers',
    sortOrder: 4,
  },
  {
    id: 'pizza',
    name: 'Wood-Fired Pizza Oven',
    code: 'PIZZA',
    color: '#ea580c',
    description: 'Neapolitan pizzas, flatbreads, calzones, and oven-baked dishes',
    sortOrder: 5,
  },
  {
    id: 'bar',
    name: 'Cocktail & Beverage Bar',
    code: 'BAR',
    color: '#8b5cf6',
    description: 'Handcrafted cocktails, draft beer, wine, mocktails, and coffees',
    sortOrder: 6,
  },
  {
    id: 'pastry',
    name: 'Pastry & Dessert Station',
    code: 'PASTRY',
    color: '#ec4899',
    description: 'Tiramisu, molten lava cakes, sorbets, and dessert finishing',
    sortOrder: 7,
  },
];

export const DEFAULT_ITEM_ROUTING_RULES: ItemRoutingRule[] = [
  {
    itemId: '00000000-0000-0000-0000-0000000000c1',
    itemName: 'Truffle Hummus & Pita',
    primaryStation: 'cold',
    course: 'starters',
    targetPrepMinutes: 6,
    printToStationPrinter: false,
  },
  {
    itemId: '00000000-0000-0000-0000-0000000000c2',
    itemName: 'Crispy Calamari',
    primaryStation: 'fry',
    course: 'starters',
    targetPrepMinutes: 8,
    printToStationPrinter: true,
  },
  {
    itemId: '00000000-0000-0000-0000-0000000000c3',
    itemName: 'Wood-Fired Margherita Pizza',
    primaryStation: 'pizza',
    backupStation: 'pass',
    course: 'mains',
    targetPrepMinutes: 12,
    printToStationPrinter: true,
  },
  {
    itemId: '00000000-0000-0000-0000-0000000000c4',
    itemName: 'Prime Bistro Burger',
    primaryStation: 'grill',
    backupStation: 'fry',
    course: 'mains',
    targetPrepMinutes: 14,
    printToStationPrinter: true,
  },
];

export const DEFAULT_SETTINGS: CulinaryOSSettings = {
  tenantId: '00000000-0000-0000-0000-000000000001',
  company: {
    name: 'The Golden Fork',
    legalName: 'Golden Fork Hospitality Group LLC',
    taxId: 'XX-XXXXXXX',
    phone: '(555) 234-5678',
    email: 'contact@thegoldenfork.restaurant',
    website: 'https://thegoldenfork.restaurant',
    address: {
      street: '742 Evergreen Terrace',
      city: 'Springfield',
      state: 'OR',
      zip: '97477',
      country: 'USA',
    },
    currencyCode: 'USD',
    currencySymbol: '$',
    currencyPosition: 'prefix',
    taxRatePercent: 8.25,
    preparedFoodTaxRatePercent: 8.25,
    alcoholTaxRatePercent: 10.0,
    taxRates: {
      preparedFoodRatePercent: 8.25,
      alcoholRatePercent: 10.0,
      taxExemptRatePercent: 0,
      defaultRatePercent: 8.25,
    },
    gratuityPresets: [15, 18, 20, 25],
    autoGratuityPartySize: 6,
    autoGratuityPercent: 18,
    receiptHeader: 'Welcome to The Golden Fork · Organic & Wood-Fired',
    receiptFooter: 'Thank you for dining with us! Tag @goldenfork on Instagram.',
    guestWifiSsid: 'GoldenFork-Guest',
    guestWifiPassword: 'truffleandwine',
  },
  stations: DEFAULT_KITCHEN_STATIONS,
  routingRules: DEFAULT_ITEM_ROUTING_RULES,
  display: {
    textSize: 'standard',
    textScalePercent: 100,
    touchTargetPadding: 'standard',
    contrastMode: 'standard',
    theme: 'light',
    kdsAlertSounds: true,
    kdsWarningMinutes: 10,
    kdsCriticalMinutes: 20,
    receiptFontSize: 'normal',
    table3dGraphicsFidelity: 'high',
    tableStatusGlowHalos: true,
  },
  updatedAt: new Date().toISOString(),
};

const STORAGE_KEY = 'culinaryos_settings_v1';

export function loadLocalSettings(): CulinaryOSSettings {
  if (typeof window === 'undefined' || !window.localStorage) {
    return DEFAULT_SETTINGS;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      company: { ...DEFAULT_SETTINGS.company, ...(parsed.company || {}) },
      display: { ...DEFAULT_SETTINGS.display, ...(parsed.display || {}) },
      stations: parsed.stations || DEFAULT_SETTINGS.stations,
      routingRules: parsed.routingRules || DEFAULT_SETTINGS.routingRules,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveLocalSettings(settings: Partial<CulinaryOSSettings>): CulinaryOSSettings {
  const current = loadLocalSettings();
  const merged: CulinaryOSSettings = {
    ...current,
    ...settings,
    company: { ...current.company, ...(settings.company || {}) },
    display: { ...current.display, ...(settings.display || {}) },
    stations: settings.stations || current.stations,
    routingRules: settings.routingRules || current.routingRules,
    updatedAt: new Date().toISOString(),
  };
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    } catch {
      // ignore
    }
  }
  return merged;
}

/**
 * Apply runtime display and text-scaling settings to the document root
 */
export function applyDisplaySettingsToDOM(display: DisplayAccessibilitySettings) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  // Text Scaling
  root.style.setProperty('--culinary-text-scale', `${display.textScalePercent / 100}`);
  root.setAttribute('data-text-size', display.textSize);

  // Touch Target Padding
  root.setAttribute('data-touch-size', display.touchTargetPadding);

  // Contrast Mode
  root.setAttribute('data-contrast', display.contrastMode);

  // Theme
  if (display.theme === 'dark') {
    root.classList.add('dark');
  } else if (display.theme === 'light') {
    root.classList.remove('dark');
  }
}
