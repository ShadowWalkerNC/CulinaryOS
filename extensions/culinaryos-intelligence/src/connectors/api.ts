/**
 * CulinaryOS API connector: API-connected mode.
 * Talks to CulinaryOS over HTTPS with a scoped token. Never direct DB.
 * Contract -> POST {baseUrl}/v1/rpc/{contract} with { params } body.
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
import type { ContractName } from '../schemas/types.ts';

export interface ApiConnectorOptions {
  baseUrl: string;
  /** Scoped token (least privilege). Prefer env CULINARYOS_API_TOKEN. */
  token: string;
  timeoutMs?: number;
}

export class CulinaryOSError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
  }
}

export class CulinaryOSApiConnector implements CulinaryOSConnector {
  readonly mode = 'api' as const;
  private baseUrl: string;
  private token: string;
  private timeoutMs: number;

  constructor(opts: ApiConnectorOptions) {
    if (!opts.baseUrl) throw new Error('baseUrl is required');
    if (!opts.token) throw new Error('token is required (scoped API token)');
    this.baseUrl = opts.baseUrl.replace(/\/+$/, '');
    this.token = opts.token;
    this.timeoutMs = opts.timeoutMs ?? 15000;
  }

  private async rpc<T>(contract: ContractName, params?: unknown): Promise<T> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), this.timeoutMs);
    try {
      const res = await fetch(`${this.baseUrl}/v1/rpc/${contract}`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify({ params: params ?? {} }),
        signal: ctrl.signal,
      });
      if (!res.ok) {
        throw new CulinaryOSError(`CulinaryOS API ${contract} failed: HTTP ${res.status}`, res.status);
      }
      const body = (await res.json()) as { data?: T } | T;
      return (body as { data?: T }).data !== undefined ? ((body as { data: T }).data as T) : (body as T);
    } catch (err) {
      if (err instanceof CulinaryOSError) throw err;
      throw new CulinaryOSError(`CulinaryOS API ${contract} unreachable: ${(err as Error).message}`);
    } finally {
      clearTimeout(timer);
    }
  }

  'inventory.get'(params?: { ids?: string[] }): Promise<InventoryItem[]> {
    return this.rpc('inventory.get', params);
  }
  'sales.summary'(params?: { period?: string }): Promise<SalesSummary> {
    return this.rpc('sales.summary', params);
  }
  'recipes.search'(params?: { query?: string; ids?: string[] }): Promise<Recipe[]> {
    return this.rpc('recipes.search', params);
  }
  'prep.create'(params: { date: string; tasks: PrepTask[] }): Promise<{ id: string; tasks: PrepTask[] }> {
    return this.rpc('prep.create', params);
  }
  'waste.record'(params: { entries: WasteEntry[] }): Promise<{ recorded: number }> {
    return this.rpc('waste.record', params);
  }
  'schedule.read'(params?: { date?: string; weekOf?: string }): Promise<ScheduleEntry[]> {
    return this.rpc('schedule.read', params);
  }
  'purchase_order.draft'(params: { lines: PurchaseOrderLine[]; supplier?: string }): Promise<PurchaseOrderDraft> {
    return this.rpc('purchase_order.draft', params);
  }
  'temps.read'(params?: { date?: string }): Promise<TempReading[]> {
    return this.rpc('temps.read', params);
  }
  'haccp.log'(params: { entries: HaccpEntry[] }): Promise<{ logged: number }> {
    return this.rpc('haccp.log', params);
  }
  'menu.cost'(params?: { recipeIds?: string[] }): Promise<MenuCostLine[]> {
    return this.rpc('menu.cost', params);
  }
  'events.read'(params?: { from?: string; to?: string }): Promise<EventInfo[]> {
    return this.rpc('events.read', params);
  }
}
