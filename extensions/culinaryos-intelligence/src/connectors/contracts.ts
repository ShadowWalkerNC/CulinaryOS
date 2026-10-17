/**
 * Connector contracts: the ONLY data interface skills may use.
 * Implementations: mock (demo/tests), file (manual-context mode),
 * api (CulinaryOS API-connected mode). Never direct DB coupling.
 */

// --- Record types ---

export interface InventoryItem {
  id: string;
  name: string;
  unit: string;
  onHand: number;
  par: number;
  unitCost: number;
  supplier?: string;
}

export interface SalesSummary {
  period: string;
  covers: number;
  revenue: number;
  topItems: Array<{ name: string; qty: number; revenue: number }>;
}

export interface RecipeIngredient {
  itemId?: string;
  name: string;
  qty: number;
  unit: string;
  unitCost?: number;
}

export interface Recipe {
  id: string;
  name: string;
  yieldQty: number;
  yieldUnit: string;
  menuPrice?: number;
  ingredients: RecipeIngredient[];
}

export interface PrepTask {
  id?: string;
  item: string;
  qty: number;
  unit: string;
  station?: string;
  priority?: 'low' | 'normal' | 'high';
}

export interface WasteEntry {
  id?: string;
  item: string;
  qty: number;
  unit: string;
  reason: string;
  cost?: number;
  recordedAt?: string;
}

export interface ScheduleEntry {
  employee: string;
  role: string;
  date: string;
  start: string;
  end: string;
  hours: number;
  hourlyRate?: number;
}

export interface PurchaseOrderLine {
  itemId: string;
  name: string;
  qty: number;
  unit: string;
  estCost: number;
}

export interface PurchaseOrderDraft {
  id?: string;
  supplier?: string;
  lines: PurchaseOrderLine[];
  totalEst: number;
  status?: string;
}

export interface TempReading {
  unit: string;
  location: string;
  tempC: number;
  takenAt: string;
  takenBy?: string;
}

export interface HaccpEntry {
  id?: string;
  check: string;
  result: 'pass' | 'fail' | 'corrective';
  note?: string;
  loggedAt?: string;
}

export interface MenuCostLine {
  recipeId: string;
  name: string;
  portionCost: number;
  menuPrice?: number;
  marginPct?: number;
}

export interface EventInfo {
  id: string;
  name: string;
  date: string;
  guests: number;
  menu?: string[];
  notes?: string;
}

// --- Connector interface: one method per contract ---

export interface CulinaryOSConnector {
  readonly mode: 'mock' | 'file' | 'api';
  'inventory.get'(params?: { ids?: string[] }): Promise<InventoryItem[]>;
  'sales.summary'(params?: { period?: string }): Promise<SalesSummary>;
  'recipes.search'(params?: { query?: string; ids?: string[] }): Promise<Recipe[]>;
  'prep.create'(params: { date: string; tasks: PrepTask[] }): Promise<{ id: string; tasks: PrepTask[] }>;
  'waste.record'(params: { entries: WasteEntry[] }): Promise<{ recorded: number }>;
  'schedule.read'(params?: { date?: string; weekOf?: string }): Promise<ScheduleEntry[]>;
  'purchase_order.draft'(params: { lines: PurchaseOrderLine[]; supplier?: string }): Promise<PurchaseOrderDraft>;
  'temps.read'(params?: { date?: string }): Promise<TempReading[]>;
  'haccp.log'(params: { entries: HaccpEntry[] }): Promise<{ logged: number }>;
  'menu.cost'(params?: { recipeIds?: string[] }): Promise<MenuCostLine[]>;
  'events.read'(params?: { from?: string; to?: string }): Promise<EventInfo[]>;
}

/** All contract names, for discovery and permission checks. */
export const CONTRACT_NAMES = [
  'inventory.get',
  'sales.summary',
  'recipes.search',
  'prep.create',
  'waste.record',
  'schedule.read',
  'purchase_order.draft',
  'temps.read',
  'haccp.log',
  'menu.cost',
  'events.read',
] as const;
