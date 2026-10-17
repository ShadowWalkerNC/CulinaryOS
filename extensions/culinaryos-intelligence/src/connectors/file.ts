/**
 * File connector: standalone manual-context mode.
 * Reads JSON files from a directory (inventory.json, recipes.json, ...).
 * Writes go to an outbox/ subdirectory as draft files — nothing is
 * mutated in place, so a human stays in control.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
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

function readJson<T>(dir: string, name: string, fallback: T): T {
  const path = join(dir, name);
  if (!existsSync(path)) return fallback;
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as T;
  } catch {
    return fallback;
  }
}

export interface FileConnectorOptions {
  dir: string;
}

export class FileConnector implements CulinaryOSConnector {
  readonly mode = 'file' as const;
  private dir: string;
  private outbox: string;

  constructor(opts: FileConnectorOptions) {
    this.dir = opts.dir;
    this.outbox = join(opts.dir, 'outbox');
    mkdirSync(this.outbox, { recursive: true });
  }

  private stage(kind: string, payload: unknown): string {
    const id = `${kind}-${Date.now().toString(36)}`;
    writeFileSync(join(this.outbox, `${id}.json`), JSON.stringify({ id, kind, payload }, null, 2));
    return id;
  }

  async 'inventory.get'(params?: { ids?: string[] }): Promise<InventoryItem[]> {
    const items = readJson<InventoryItem[]>(this.dir, 'inventory.json', []);
    return params?.ids ? items.filter((i) => params.ids!.includes(i.id)) : items;
  }

  async 'sales.summary'(): Promise<SalesSummary> {
    return readJson<SalesSummary>(this.dir, 'sales.json', { period: 'unknown', covers: 0, revenue: 0, topItems: [] });
  }

  async 'recipes.search'(params?: { query?: string; ids?: string[] }): Promise<Recipe[]> {
    let recipes = readJson<Recipe[]>(this.dir, 'recipes.json', []);
    if (params?.ids) recipes = recipes.filter((r) => params.ids!.includes(r.id));
    if (params?.query) {
      const q = params.query.toLowerCase();
      recipes = recipes.filter((r) => r.name.toLowerCase().includes(q) || r.id.includes(q));
    }
    return recipes;
  }

  async 'prep.create'(params: { date: string; tasks: PrepTask[] }): Promise<{ id: string; tasks: PrepTask[] }> {
    const id = this.stage('prep', params);
    return { id, tasks: params.tasks };
  }

  async 'waste.record'(params: { entries: WasteEntry[] }): Promise<{ recorded: number }> {
    this.stage('waste', params);
    return { recorded: params.entries.length };
  }

  async 'schedule.read'(): Promise<ScheduleEntry[]> {
    return readJson<ScheduleEntry[]>(this.dir, 'schedule.json', []);
  }

  async 'purchase_order.draft'(params: { lines: PurchaseOrderLine[]; supplier?: string }): Promise<PurchaseOrderDraft> {
    const totalEst = params.lines.reduce((s, l) => s + l.estCost, 0);
    const draft: PurchaseOrderDraft = { supplier: params.supplier, lines: params.lines, totalEst, status: 'draft' };
    draft.id = this.stage('purchase-order', draft);
    return draft;
  }

  async 'temps.read'(): Promise<TempReading[]> {
    return readJson<TempReading[]>(this.dir, 'temps.json', []);
  }

  async 'haccp.log'(params: { entries: HaccpEntry[] }): Promise<{ logged: number }> {
    this.stage('haccp', params);
    return { logged: params.entries.length };
  }

  async 'menu.cost'(params?: { recipeIds?: string[] }): Promise<MenuCostLine[]> {
    const cached = readJson<MenuCostLine[]>(this.dir, 'menu-cost.json', []);
    if (cached.length > 0 && !params?.recipeIds) return cached;
    // Compute from local recipes + inventory unit costs.
    const recipes = await this['recipes.search']({ ids: params?.recipeIds });
    const inv = await this['inventory.get']();
    const costs = new Map(inv.map((i) => [i.id, i.unitCost]));
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
    return readJson<EventInfo[]>(this.dir, 'events.json', []);
  }

  /** Files staged in outbox/ (draft writes awaiting human handling). */
  outboxFiles(): string[] {
    return readdirSync(this.outbox).filter((f) => f.endsWith('.json'));
  }
}
