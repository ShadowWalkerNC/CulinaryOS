/**
 * @culinaryos/commissary-engine
 * Pure functions for multi-unit store stock transfer requisition math,
 * central production batch aggregate calculations, and franchise royalty ledgers.
 */

export interface StoreStockRequestItem {
  ingredientId: string;
  name: string;
  unit: string;
  quantityRequested: number;
  currentStoreStock: number;
  parLevel: number;
}

export interface StoreTransferRequest {
  storeId: string;
  storeName: string;
  items: StoreStockRequestItem[];
}

export interface ConsolidatedBatchRequirement {
  ingredientId: string;
  name: string;
  unit: string;
  totalQuantityRequired: number;
  breakdownByStore: Array<{ storeId: string; storeName: string; quantity: number }>;
}

export interface BatchLotMetadata {
  lotCode: string;
  productName: string;
  quantityBatched: number;
  unit: string;
  manufacturedAt: string;
  expiresAt: string;
}

export interface FranchiseRoyaltyItem {
  storeId: string;
  storeName: string;
  grossSalesCents: number;
  royaltyRatePercent: number;
  royaltyDueCents: number;
}

export interface FranchiseRoyaltySummary {
  organizationId: string;
  periodStart: string;
  periodEnd: string;
  totalGrossSalesCents: number;
  totalRoyaltyDueCents: number;
  stores: FranchiseRoyaltyItem[];
}

/**
 * Calculates replenishment requirements for a store branch based on par levels and on-hand inventory.
 */
export function calculateStoreReplenishmentOrder(
  storeId: string,
  storeName: string,
  items: Array<{
    ingredientId: string;
    name: string;
    unit: string;
    currentStock: number;
    parLevel: number;
    reorderMultiple?: number;
  }>
): StoreTransferRequest {
  const orderItems: StoreStockRequestItem[] = [];

  for (const item of items) {
    if (item.currentStock < item.parLevel) {
      const deficit = item.parLevel - item.currentStock;
      const mult = item.reorderMultiple && item.reorderMultiple > 0 ? item.reorderMultiple : 1;
      const roundedQty = Math.ceil(deficit / mult) * mult;

      orderItems.push({
        ingredientId: item.ingredientId,
        name: item.name,
        unit: item.unit,
        quantityRequested: roundedQty,
        currentStoreStock: item.currentStock,
        parLevel: item.parLevel,
      });
    }
  }

  return {
    storeId,
    storeName,
    items: orderItems,
  };
}

/**
 * Aggregates store transfer orders across multiple locations into consolidated central commissary production quotas.
 */
export function aggregateCommissaryProduction(
  requests: StoreTransferRequest[]
): ConsolidatedBatchRequirement[] {
  const map: Record<string, ConsolidatedBatchRequirement> = {};

  for (const req of requests) {
    for (const item of req.items) {
      if (!map[item.ingredientId]) {
        map[item.ingredientId] = {
          ingredientId: item.ingredientId,
          name: item.name,
          unit: item.unit,
          totalQuantityRequired: 0,
          breakdownByStore: [],
        };
      }
      const rec = map[item.ingredientId]!;
      rec.totalQuantityRequired += item.quantityRequested;
      rec.breakdownByStore.push({
        storeId: req.storeId,
        storeName: req.storeName,
        quantity: item.quantityRequested,
      });
    }
  }

  return Object.values(map).sort((a, b) => b.totalQuantityRequired - a.totalQuantityRequired);
}

/**
 * Generates an industry standard ISO lot tracking code for a commissary batch.
 * Format: LOT-YYYYMMDD-PRODUCTPREFIX-RANDOM
 */
export function generateCommissaryLotCode(
  productName: string,
  manufacturedDate: Date = new Date()
): string {
  const dateStr = manufacturedDate.toISOString().split('T')[0]!.replace(/-/g, '');
  const prefix = productName.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 4).padEnd(4, 'X');
  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `LOT-${dateStr}-${prefix}-${randomSuffix}`;
}

/**
 * Computes consolidated franchise royalty fee receivables across all brand store locations.
 */
export function calculateFranchiseRoyaltyLedger(input: {
  organizationId: string;
  periodStart: string;
  periodEnd: string;
  stores: Array<{
    storeId: string;
    storeName: string;
    grossSalesCents: number;
    royaltyRatePercent?: number; // fallback to default if not set
  }>;
  defaultRoyaltyRatePercent?: number; // e.g. 4.5%
}): FranchiseRoyaltySummary {
  const defaultRate = input.defaultRoyaltyRatePercent ?? 4.5;
  let totalGrossSalesCents = 0;
  let totalRoyaltyDueCents = 0;

  const stores: FranchiseRoyaltyItem[] = input.stores.map((s) => {
    const rate = s.royaltyRatePercent ?? defaultRate;
    const royaltyDue = Math.round(s.grossSalesCents * (rate / 100));
    totalGrossSalesCents += s.grossSalesCents;
    totalRoyaltyDueCents += royaltyDue;

    return {
      storeId: s.storeId,
      storeName: s.storeName,
      grossSalesCents: s.grossSalesCents,
      royaltyRatePercent: rate,
      royaltyDueCents: royaltyDue,
    };
  });

  return {
    organizationId: input.organizationId,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    totalGrossSalesCents,
    totalRoyaltyDueCents,
    stores,
  };
}
