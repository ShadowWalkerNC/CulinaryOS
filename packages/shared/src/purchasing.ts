// ============================================================
// CulinaryOS & ShorelineOps — Unified Purchasing & MRP Engine
// Standardized across CulinaryOS and ShorelineOps.
// Multi-distributor procurement, order guides, lowest-cost split
// MRP optimization, Dennis/Broadline CSV ingestion, and receiving.
// ============================================================

export interface Vendor {
  id: string;
  name: string;
  code: string;
  phone?: string | undefined;
  email?: string | undefined;
  website?: string | undefined;
  notes?: string | undefined;
  active: boolean;
  created_at?: string | undefined;
  updated_at?: string | undefined;
}

export interface VendorItem {
  id: string;
  vendor_id: string;
  vendor_sku: string;
  name: string;
  brand?: string | undefined;
  pack_size?: string | undefined;
  uom?: string | undefined;
  category?: string | undefined;
  unit_cost?: number | undefined; // In dollars (e.g. 48.50) or cents normalized
  active: boolean;
  vendor_name?: string | undefined;
  vendor_code?: string | undefined;
  created_at?: string | undefined;
  updated_at?: string | undefined;
}

export interface OrderGuideEntry {
  id: string;
  facility_id?: string | undefined;
  vendor_id: string;
  vendor_item_id: string;
  par_level: number;
  on_hand: number;
  avg_usage?: number | undefined;
  sort_group?: string | undefined;
  item_name?: string | undefined;
  vendor_sku?: string | undefined;
  pack_size?: string | undefined;
  uom?: string | undefined;
  unit_cost?: number | undefined;
  category?: string | undefined;
  vendor_name?: string | undefined;
  vendor_code?: string | undefined;
}

export interface SuggestedOrderLine {
  vendorItemId: string;
  vendorSku: string;
  itemName: string;
  vendor: string;
  vendorId?: string | undefined;
  packSize: string;
  uom: string;
  unitCost: number;
  parLevel: number;
  onHand: number;
  suggestedQty: number;
  category: string;
}

export interface PurchaseOrder {
  id: string;
  facility_id?: string | undefined;
  venue_id?: string | undefined;
  tenant_id?: string | undefined;
  vendor_id: string;
  vendor_name?: string | undefined;
  vendor_code?: string | undefined;
  status: 'draft' | 'approved' | 'submitted' | 'received' | 'cancelled' | 'partial';
  order_date: string;
  expected_date?: string | undefined;
  notes?: string | undefined;
  created_by?: string | undefined;
  created_by_name?: string | undefined;
  created_at?: string | undefined;
  lines?: PurchaseOrderLine[] | undefined;
}

export interface PurchaseOrderLine {
  id?: string | undefined;
  purchase_order_id?: string | undefined;
  vendor_item_id: string;
  qty_ordered: number;
  qty_received?: number | undefined;
  unit_cost?: number | undefined;
  notes?: string | undefined;
  item_name?: string | undefined;
  vendor_sku?: string | undefined;
  pack_size?: string | undefined;
  uom?: string | undefined;
  guide_id?: string | null | undefined;
  guide_on_hand?: number | null | undefined;
}

export interface DistributorOffer {
  vendorId: string;
  vendorName: string;
  vendorSku: string;
  packSizeDesc: string;
  packUnitGrams: number;
  pricePerPack: number;
  deliveryDays?: string[];
  orderCutoffLeadDays?: number;
}

export interface LowestCostSplitOrderProposal {
  ingredientName: string;
  requiredGrams: number;
  optimalVendor: string;
  optimalVendorId: string;
  selectedOffer: DistributorOffer;
  packsToOrder: number;
  totalCost: number;
  unitCostPerPound: number;
  alternativeOffers: Array<{
    vendorName: string;
    pricePerPack: number;
    totalCost: number;
    priceVariancePercent: number;
  }>;
  costSavings: number;
  nextAvailableDelivery: string;
}

export interface SuggestedOrderSummary {
  vendorId?: string;
  vendorName?: string;
  lines: SuggestedOrderLine[];
  totalItems: number;
  totalUnits: number;
  totalCost: number;
  totalCostCents: number;
  generatedAt: string;
}

/**
 * Pure calculation: Computes suggested order lines from an order guide.
 * Identifies items where on_hand < par_level and calculates the deficit.
 */
export function calculateSuggestedOrder(
  guideEntries: OrderGuideEntry[],
  vendorNameFallback = 'Broadline Vendor'
): SuggestedOrderSummary {
  const lowItems = guideEntries.filter(g => Number(g.on_hand ?? 0) < Number(g.par_level ?? 0));
  
  let totalUnits = 0;
  let totalCost = 0;

  const lines: SuggestedOrderLine[] = lowItems.map(g => {
    const onHand = Number(g.on_hand ?? 0);
    const parLevel = Number(g.par_level ?? 0);
    const suggestedQty = Math.max(0, Math.ceil(parLevel - onHand));
    const unitCost = Number(g.unit_cost ?? 0);
    const lineTotal = suggestedQty * unitCost;

    totalUnits += suggestedQty;
    totalCost += lineTotal;

    return {
      vendorItemId: g.vendor_item_id,
      vendorSku: g.vendor_sku || '',
      itemName: g.item_name || 'Item',
      vendor: g.vendor_name || vendorNameFallback,
      vendorId: g.vendor_id,
      packSize: g.pack_size || 'case',
      uom: g.uom || 'case',
      unitCost,
      parLevel,
      onHand,
      suggestedQty,
      category: g.category || 'General',
    };
  });

  return {
    lines,
    totalItems: lines.length,
    totalUnits,
    totalCost: Math.round(totalCost * 100) / 100,
    totalCostCents: Math.round(totalCost * 100),
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Compares multi-distributor quotes to select the lowest-cost supplier
 * for an ingredient demand, calculating savings vs next best alternative.
 */
export function evaluateMultiDistributorLowestCost(
  ingredientName: string,
  netDemandGrams: number,
  offers: DistributorOffer[],
  targetServiceDay = 'Monday'
): LowestCostSplitOrderProposal {
  if (!offers || offers.length === 0) {
    throw new Error(`No distributor offers provided for ${ingredientName}`);
  }

  const evaluated = offers.map(offer => {
    const packGrams = offer.packUnitGrams > 0 ? offer.packUnitGrams : 453.592;
    const packsNeeded = Math.ceil(netDemandGrams / packGrams);
    const totalCost = Math.round(packsNeeded * offer.pricePerPack * 100) / 100;
    const unitCostPerGram = offer.pricePerPack / packGrams;
    const unitCostPerLb = Math.round(unitCostPerGram * 453.592 * 100) / 100;

    const deliveryDays = offer.deliveryDays || ['Monday', 'Thursday'];
    const hasDirectDelivery = deliveryDays.some(
      d => d.toLowerCase() === targetServiceDay.toLowerCase()
    );
    const nextDelivery = hasDirectDelivery ? targetServiceDay : (deliveryDays[0] || 'Standard Route');

    return {
      offer,
      packsNeeded,
      totalCost,
      unitCostPerLb,
      nextDelivery,
    };
  });

  // Sort ascending by total cost
  evaluated.sort((a, b) => a.totalCost - b.totalCost);
  const winning = evaluated[0]!;
  const nextBest = evaluated[1] || winning;

  const costSavings = Math.round((nextBest.totalCost - winning.totalCost) * 100) / 100;

  const alternativeOffers = evaluated.slice(1).map(alt => {
    const denom = winning.totalCost > 0 ? winning.totalCost : 1;
    const priceVariancePercent = Math.round(((alt.totalCost - winning.totalCost) / denom) * 1000) / 10;
    return {
      vendorName: alt.offer.vendorName,
      pricePerPack: alt.offer.pricePerPack,
      totalCost: alt.totalCost,
      priceVariancePercent,
    };
  });

  return {
    ingredientName,
    requiredGrams: Math.round(netDemandGrams),
    optimalVendor: winning.offer.vendorName,
    optimalVendorId: winning.offer.vendorId,
    selectedOffer: winning.offer,
    packsToOrder: winning.packsNeeded,
    totalCost: winning.totalCost,
    unitCostPerPound: winning.unitCostPerLb,
    alternativeOffers,
    costSavings,
    nextAvailableDelivery: winning.nextDelivery,
  };
}

/**
 * Optimizes a list of low-stock order guide entries across multiple vendor catalogs.
 * Solves the Lowest-Cost Split MRP routing problem:
 * Assigns each item to the vendor with the lowest unit cost, grouping resulting orders
 * by vendor and reporting overall projected savings.
 */
export function optimizeLowestCostSplit(
  items: OrderGuideEntry[],
  vendorCatalogs: Map<string, { vendorId: string; vendorName: string; items: VendorItem[] }>
): {
  ordersByVendor: Map<string, { vendorName: string; lines: SuggestedOrderLine[]; vendorTotalCost: number }>;
  totalSplitCost: number;
  singleVendorBenchmarkCost: number;
  projectedSavings: number;
} {
  const ordersByVendor = new Map<string, { vendorName: string; lines: SuggestedOrderLine[]; vendorTotalCost: number }>();
  let totalSplitCost = 0;
  let singleVendorBenchmarkCost = 0;

  for (const entry of items) {
    const onHand = Number(entry.on_hand ?? 0);
    const parLevel = Number(entry.par_level ?? 0);
    if (onHand >= parLevel) continue;

    const deficit = Math.ceil(parLevel - onHand);
    const baseCost = Number(entry.unit_cost ?? 0);
    singleVendorBenchmarkCost += deficit * baseCost;

    // Search all vendor catalogs for best price match (matching by SKU or normalized name)
    const normalizedName = (entry.item_name || '').toLowerCase().trim();
    let bestVendorId = entry.vendor_id;
    let bestVendorName = entry.vendor_name || 'Preferred Vendor';
    let bestPrice = baseCost > 0 ? baseCost : 999999;
    let bestSku = entry.vendor_sku || '';
    let bestPackSize = entry.pack_size || 'case';
    let bestUom = entry.uom || 'case';
    let bestItemId = entry.vendor_item_id;

    for (const [vId, cat] of vendorCatalogs.entries()) {
      const match = cat.items.find(i => 
        (i.vendor_sku && entry.vendor_sku && i.vendor_sku === entry.vendor_sku) ||
        (i.name.toLowerCase().trim() === normalizedName)
      );
      if (match && typeof match.unit_cost === 'number' && match.unit_cost > 0) {
        if (match.unit_cost < bestPrice) {
          bestPrice = match.unit_cost;
          bestVendorId = vId;
          bestVendorName = cat.vendorName;
          bestSku = match.vendor_sku;
          bestPackSize = match.pack_size || bestPackSize;
          bestUom = match.uom || bestUom;
          bestItemId = match.id;
        }
      }
    }

    const lineCost = deficit * bestPrice;
    totalSplitCost += lineCost;

    if (!ordersByVendor.has(bestVendorId)) {
      ordersByVendor.set(bestVendorId, {
        vendorName: bestVendorName,
        lines: [],
        vendorTotalCost: 0,
      });
    }

    const vendorGroup = ordersByVendor.get(bestVendorId)!;
    vendorGroup.lines.push({
      vendorItemId: bestItemId,
      vendorSku: bestSku,
      itemName: entry.item_name || 'Item',
      vendor: bestVendorName,
      vendorId: bestVendorId,
      packSize: bestPackSize,
      uom: bestUom,
      unitCost: bestPrice,
      parLevel,
      onHand,
      suggestedQty: deficit,
      category: entry.category || 'General',
    });
    vendorGroup.vendorTotalCost += lineCost;
  }

  const projectedSavings = Math.max(0, Math.round((singleVendorBenchmarkCost - totalSplitCost) * 100) / 100);

  return {
    ordersByVendor,
    totalSplitCost: Math.round(totalSplitCost * 100) / 100,
    singleVendorBenchmarkCost: Math.round(singleVendorBenchmarkCost * 100) / 100,
    projectedSavings,
  };
}

export interface ParsedBroadlineItem {
  vendorSku: string;
  name: string;
  brand: string;
  packSize: string;
  uom: string;
  category: string;
  unitCost: number;
  parLevel: number;
  onHand: number;
}

/**
 * Parses Dennis Food Service, Sysco, US Foods, or generic broadline distributor CSV text.
 * Robust against varied header titles with case-insensitive and partial match heuristic.
 */
export function parseBroadlineCatalogCsv(csvText: string): ParsedBroadlineItem[] {
  const lines = csvText.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length < 2) {
    throw new Error('CSV content must contain a header row and at least one item row.');
  }

  // Parse header
  const header = parseCsvLine(lines[0]!).map(h => h.toLowerCase().trim());

  const skuIdx = header.findIndex(h => h.includes('sku') || h.includes('item') || h.includes('code') || h.includes('prod #'));
  const nameIdx = header.findIndex(h => h.includes('name') || h.includes('desc') || h.includes('product') || h.includes('title'));
  const brandIdx = header.findIndex(h => h.includes('brand') || h.includes('mfg') || h.includes('maker'));
  const packIdx = header.findIndex(h => h.includes('pack') || h.includes('size'));
  const uomIdx = header.findIndex(h => h.includes('uom') || h.includes('unit'));
  const catIdx = header.findIndex(h => h.includes('cat') || h.includes('dept') || h.includes('group') || h.includes('class'));
  const costIdx = header.findIndex(h => h.includes('cost') || h.includes('price') || h.includes('rate'));
  const parIdx = header.findIndex(h => h.includes('par') || h.includes('target'));
  const onHandIdx = header.findIndex(h => h.includes('hand') || h.includes('count') || h.includes('inv') || h.includes('stock'));

  if (skuIdx === -1 || nameIdx === -1) {
    throw new Error('Could not find required "SKU/Item #" or "Description/Name" columns in CSV header.');
  }

  const items: ParsedBroadlineItem[] = [];

  for (let i = 1; i < lines.length; i++) {
    const row = parseCsvLine(lines[i]!);
    if (!row[skuIdx] || !row[nameIdx]) continue;

    const rawCost = costIdx !== -1 && row[costIdx] ? row[costIdx].replace(/[\$,]/g, '') : '0';
    const cost = parseFloat(rawCost);
    const rawPar = parIdx !== -1 && row[parIdx] ? row[parIdx] : '5';
    const par = parseFloat(rawPar);
    const rawOnHand = onHandIdx !== -1 && row[onHandIdx] ? row[onHandIdx] : '0';
    const onHand = parseFloat(rawOnHand);

    items.push({
      vendorSku: row[skuIdx]!.trim(),
      name: row[nameIdx]!.trim(),
      brand: (brandIdx !== -1 && row[brandIdx]?.trim()) || 'Dennis Select',
      packSize: (packIdx !== -1 && row[packIdx]?.trim()) || 'Case',
      uom: (uomIdx !== -1 && row[uomIdx]?.trim()) || 'case',
      category: (catIdx !== -1 && row[catIdx]?.trim()) || 'Broadline',
      unitCost: !isNaN(cost) && cost >= 0 ? cost : 0,
      parLevel: !isNaN(par) && par >= 0 ? par : 5,
      onHand: !isNaN(onHand) && onHand >= 0 ? onHand : 0,
    });
  }

  if (items.length === 0) {
    throw new Error('No valid catalog item rows found in CSV.');
  }

  return items;
}

/**
 * Standard CSV line tokenizer supporting quoted fields containing commas.
 */
function parseCsvLine(text: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (inQuotes && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(cur.trim());
      cur = '';
    } else {
      cur += char;
    }
  }
  result.push(cur.trim());
  return result;
}
