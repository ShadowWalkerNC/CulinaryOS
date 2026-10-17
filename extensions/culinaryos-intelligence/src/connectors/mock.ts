/**
 * Mock connector: deterministic seed data for tests, demos, and
 * offline development. No network, no filesystem.
 */
import type {
  CulinaryOSConnector,
  EventInfo,
  HaccpEntry,
  InventoryItem,
  MenuCostLine,
  PrepTask,
  PurchaseOrderDraft,
  PurchaseOrderLine,
  Recipe,
  SalesSummary,
  ScheduleEntry,
  TempReading,
  WasteEntry,
} from './contracts.ts';

const INVENTORY: InventoryItem[] = [
  { id: 'flour-00', name: 'Flour 00', unit: 'kg', onHand: 18, par: 25, unitCost: 1.9, supplier: 'Sysco' },
  { id: 'tomato-sanmarzano', name: 'San Marzano tomatoes', unit: 'kg', onHand: 6, par: 12, unitCost: 2.4, supplier: 'Sysco' },
  { id: 'mozz-fior', name: 'Fior di latte', unit: 'kg', onHand: 4, par: 8, unitCost: 9.5, supplier: 'Local Dairy' },
  { id: 'basil', name: 'Basil', unit: 'bunch', onHand: 20, par: 15, unitCost: 0.8, supplier: 'Local Farm' },
  { id: 'olive-oil', name: 'Olive oil', unit: 'L', onHand: 9, par: 6, unitCost: 8.0, supplier: 'Sysco' },
  { id: 'chicken-breast', name: 'Chicken breast', unit: 'kg', onHand: 3, par: 10, unitCost: 7.2, supplier: 'Poultry Co' },
  { id: 'arborio', name: 'Arborio rice', unit: 'kg', onHand: 11, par: 8, unitCost: 3.1, supplier: 'Sysco' },
  { id: 'parmesan', name: 'Parmigiano', unit: 'kg', onHand: 2.5, par: 4, unitCost: 21.0, supplier: 'Cheese House' },
];

const RECIPES: Recipe[] = [
  {
    id: 'margherita',
    name: 'Pizza Margherita',
    yieldQty: 1,
    yieldUnit: 'pizza',
    menuPrice: 14.5,
    ingredients: [
      { itemId: 'flour-00', name: 'Flour 00', qty: 0.28, unit: 'kg' },
      { itemId: 'tomato-sanmarzano', name: 'San Marzano tomatoes', qty: 0.12, unit: 'kg' },
      { itemId: 'mozz-fior', name: 'Fior di latte', qty: 0.125, unit: 'kg' },
      { itemId: 'basil', name: 'Basil', qty: 0.2, unit: 'bunch' },
      { itemId: 'olive-oil', name: 'Olive oil', qty: 0.01, unit: 'L' },
    ],
  },
  {
    id: 'risotto-pollo',
    name: 'Chicken Risotto',
    yieldQty: 1,
    yieldUnit: 'portion',
    menuPrice: 19.0,
    ingredients: [
      { itemId: 'arborio', name: 'Arborio rice', qty: 0.09, unit: 'kg' },
      { itemId: 'chicken-breast', name: 'Chicken breast', qty: 0.15, unit: 'kg' },
      { itemId: 'parmesan', name: 'Parmigiano', qty: 0.02, unit: 'kg' },
      { itemId: 'olive-oil', name: 'Olive oil', qty: 0.01, unit: 'L' },
    ],
  },
];

const SALES: SalesSummary = {
  period: 'last-7d',
  covers: 1240,
  revenue: 28460,
  topItems: [
    { name: 'Pizza Margherita', qty: 380, revenue: 5510 },
    { name: 'Chicken Risotto', qty: 190, revenue: 3610 },
    { name: 'House Salad', qty: 240, revenue: 2880 },
  ],
};

const SCHEDULE: ScheduleEntry[] = [
  { employee: 'A. Rossi', role: 'Sous Chef', date: '2026-09-25', start: '09:00', end: '17:00', hours: 8, hourlyRate: 24 },
  { employee: 'B. Chen', role: 'Line Cook', date: '2026-09-25', start: '11:00', end: '22:00', hours: 10, hourlyRate: 18 },
  { employee: 'C. Diallo', role: 'Server', date: '2026-09-25', start: '17:00', end: '23:00', hours: 6, hourlyRate: 14 },
  { employee: 'D. Patel', role: 'Server', date: '2026-09-25', start: '17:00', end: '23:00', hours: 6, hourlyRate: 14 },
];

const TEMPS: TempReading[] = [
  { unit: 'Walk-in cooler', location: 'Kitchen', tempC: 3.1, takenAt: '2026-09-25T08:00:00Z', takenBy: 'A. Rossi' },
  { unit: 'Prep fridge 1', location: 'Kitchen', tempC: 4.2, takenAt: '2026-09-25T08:05:00Z', takenBy: 'A. Rossi' },
  { unit: 'Freezer', location: 'Kitchen', tempC: -19.5, takenAt: '2026-09-25T08:06:00Z', takenBy: 'A. Rossi' },
  { unit: 'Hot hold', location: 'Pass', tempC: 68.0, takenAt: '2026-09-25T12:00:00Z', takenBy: 'B. Chen' },
];

const EVENTS: EventInfo[] = [
  { id: 'evt-101', name: 'Rossi Wedding', date: '2026-10-03', guests: 80, menu: ['margherita', 'risotto-pollo'], notes: 'Outdoor service' },
];

export class MockConnector implements CulinaryOSConnector {
  readonly mode = 'mock' as const;
  private prepCounter = 0;
  private poCounter = 0;
  readonly wasteLog: WasteEntry[] = [
    { item: 'Basil', qty: 2, unit: 'bunch', reason: 'wilted', cost: 1.6, recordedAt: '2026-09-24' },
    { item: 'Fior di latte', qty: 0.5, unit: 'kg', reason: 'expired', cost: 4.75, recordedAt: '2026-09-23' },
  ];
  readonly haccpLog: HaccpEntry[] = [];

  async 'inventory.get'(params?: { ids?: string[] }): Promise<InventoryItem[]> {
    if (!params?.ids) return INVENTORY.map((i) => ({ ...i }));
    return INVENTORY.filter((i) => params.ids!.includes(i.id)).map((i) => ({ ...i }));
  }

  async 'sales.summary'(): Promise<SalesSummary> {
    return JSON.parse(JSON.stringify(SALES)) as SalesSummary;
  }

  async 'recipes.search'(params?: { query?: string; ids?: string[] }): Promise<Recipe[]> {
    let out = RECIPES;
    if (params?.ids) out = out.filter((r) => params.ids!.includes(r.id));
    if (params?.query) {
      const q = params.query.toLowerCase();
      out = out.filter((r) => r.name.toLowerCase().includes(q) || r.id.includes(q));
    }
    return JSON.parse(JSON.stringify(out)) as Recipe[];
  }

  async 'prep.create'(params: { date: string; tasks: PrepTask[] }): Promise<{ id: string; tasks: PrepTask[] }> {
    this.prepCounter += 1;
    return {
      id: `prep-${params.date}-${this.prepCounter}`,
      tasks: params.tasks.map((t, i) => ({ id: `pt-${this.prepCounter}-${i + 1}`, ...t })),
    };
  }

  async 'waste.record'(params: { entries: WasteEntry[] }): Promise<{ recorded: number }> {
    for (const e of params.entries) this.wasteLog.push({ ...e, recordedAt: new Date().toISOString() });
    return { recorded: params.entries.length };
  }

  async 'schedule.read'(): Promise<ScheduleEntry[]> {
    return SCHEDULE.map((s) => ({ ...s }));
  }

  async 'purchase_order.draft'(params: { lines: PurchaseOrderLine[]; supplier?: string }): Promise<PurchaseOrderDraft> {
    this.poCounter += 1;
    const totalEst = params.lines.reduce((s, l) => s + l.estCost, 0);
    return { id: `po-draft-${this.poCounter}`, supplier: params.supplier, lines: params.lines, totalEst, status: 'draft' };
  }

  async 'temps.read'(): Promise<TempReading[]> {
    return TEMPS.map((t) => ({ ...t }));
  }

  async 'haccp.log'(params: { entries: HaccpEntry[] }): Promise<{ logged: number }> {
    for (const e of params.entries) this.haccpLog.push({ ...e, loggedAt: new Date().toISOString() });
    return { logged: params.entries.length };
  }

  async 'menu.cost'(params?: { recipeIds?: string[] }): Promise<MenuCostLine[]> {
    const recipes = params?.recipeIds ? RECIPES.filter((r) => params.recipeIds!.includes(r.id)) : RECIPES;
    const costs = new Map(INVENTORY.map((i) => [i.id, i.unitCost]));
    return recipes.map((r) => {
      const portionCost = r.ingredients.reduce(
        (s, ing) => s + ing.qty * (ing.unitCost ?? costs.get(ing.itemId ?? '') ?? 0),
        0,
      );
      const marginPct =
        r.menuPrice && r.menuPrice > 0 ? Math.round(((r.menuPrice - portionCost) / r.menuPrice) * 1000) / 10 : undefined;
      return { recipeId: r.id, name: r.name, portionCost: Math.round(portionCost * 100) / 100, menuPrice: r.menuPrice, marginPct };
    });
  }

  async 'events.read'(): Promise<EventInfo[]> {
    return EVENTS.map((e) => ({ ...e }));
  }
}
