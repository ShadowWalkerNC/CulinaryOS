// ============================================================
// CulinaryOS — Swappable Vendor Adapter Engine
// Solves monolithic distributor lock-in (e.g. Sysco IMPAC).
// Provides an extensible interface for multi-distributor ordering:
// Sysco, US Foods, Gordon Food Service (GFS), and Local Farms.
// ============================================================

export interface VendorCatalogItem {
  vendorSku: string;
  name: string;
  brand?: string;
  packSize: string;      // e.g. "6/5 LB", "12/32 OZ", "50 LB CS"
  unitPriceCents: number; // Integer cents per pack
  category: string;      // "produce", "meat", "dairy", "dry_goods", "paper_chemicals"
  leadTimeDays: number;
  inStock: boolean;
  minOrderQty?: number;
}

export interface PurchaseOrderItem {
  ingredientId: string;
  vendorSku: string;
  name: string;
  quantityOrdered: number;
  unitPriceCents: number;
  extendedPriceCents: number;
}

export interface PurchaseOrderPayload {
  poNumber: string;
  venueId: string;
  organizationId: string;
  vendorId: string;
  deliveryDateRequested: string; // ISO 8601 date YYYY-MM-DD
  items: PurchaseOrderItem[];
  totalAmountCents: number;
  notes?: string;
}

export interface VendorOrderConfirmation {
  success: boolean;
  vendorOrderRef: string;
  vendorName: string;
  confirmationTimestamp: string;
  estimatedDeliveryDate: string;
  totalConfirmedCents: number;
  status: 'accepted' | 'partial' | 'rejected';
  backorderedSkus?: string[];
  message: string;
}

export interface VendorOrderStatus {
  vendorOrderRef: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  trackingNumber?: string;
  carrier?: string;
  actualDeliveryDate?: string;
}

export interface InvoiceLineItem {
  vendorSku: string;
  name: string;
  quantityInvoiced: number;
  unitPriceCents: number;
  lineTotalCents: number;
}

export interface ParsedVendorInvoice {
  invoiceNumber: string;
  poNumber?: string;
  invoiceDate: string;
  vendorId: string;
  items: InvoiceLineItem[];
  subtotalCents: number;
  taxCents: number;
  freightCents: number;
  totalCents: number;
}

export interface InvoicePriceVariance {
  vendorSku: string;
  ingredientName: string;
  orderedUnitPriceCents: number;
  invoicedUnitPriceCents: number;
  quantityReceived: number;
  variancePerUnitCents: number; // invoiced - ordered (positive = overcharge)
  totalVarianceCents: number;
  status: 'match' | 'overcharge' | 'undercharge';
}

/**
 * Standard interface that all vendor integration adapters must implement.
 * This guarantees zero vendor lock-in and clean swap-in of custom purveyors.
 */
export interface VendorAdapter {
  readonly vendorId: string;
  readonly vendorName: string;
  readonly supportedProtocols: Array<'edi850' | 'rest_api' | 'punchout' | 'csv_direct'>;

  searchCatalog(query: string, category?: string): Promise<VendorCatalogItem[]>;
  getLivePricing(vendorSkus: string[]): Promise<Map<string, number>>;
  submitPurchaseOrder(order: PurchaseOrderPayload): Promise<VendorOrderConfirmation>;
  getOrderStatus(vendorOrderRef: string): Promise<VendorOrderStatus>;
  parseElectronicInvoice(rawInvoiceData: string): Promise<ParsedVendorInvoice>;
}

// -------------------------------------------------------------
// 1. Sysco Adapter (EDI 850 / REST / IMPAC Replacement)
// -------------------------------------------------------------
export class SyscoAdapter implements VendorAdapter {
  readonly vendorId = 'sysco';
  readonly vendorName = 'Sysco Foods';
  readonly supportedProtocols: Array<'edi850' | 'rest_api' | 'punchout' | 'csv_direct'> = ['edi850', 'rest_api'];

  private mockCatalog: VendorCatalogItem[] = [
    { vendorSku: 'SYS-782194', name: 'Flour All-Purpose High Gluten', brand: 'Sysco Classic', packSize: '50 LB BAG', unitPriceCents: 2450, category: 'dry_goods', leadTimeDays: 1, inStock: true },
    { vendorSku: 'SYS-109283', name: 'Butter Unsalted Solid Grade AA', brand: 'Sysco Imperial', packSize: '36/1 LB CS', unitPriceCents: 11800, category: 'dairy', leadTimeDays: 1, inStock: true },
    { vendorSku: 'SYS-554120', name: 'Heavy Whipping Cream 36%', brand: 'Sysco Classic', packSize: '12/32 OZ CS', unitPriceCents: 4600, category: 'dairy', leadTimeDays: 1, inStock: true },
    { vendorSku: 'SYS-993812', name: 'Whole Peeled Plum Tomatoes', brand: 'Sysco Reliance', packSize: '6/#10 CAN', unitPriceCents: 3850, category: 'dry_goods', leadTimeDays: 1, inStock: true },
    { vendorSku: 'SYS-441209', name: 'Chicken Breast Boneless Skinless', brand: 'Sysco Imperial', packSize: '4/10 LB CS', unitPriceCents: 8900, category: 'meat', leadTimeDays: 2, inStock: true },
  ];

  async searchCatalog(query: string, category?: string): Promise<VendorCatalogItem[]> {
    const q = query.toLowerCase();
    return this.mockCatalog.filter(item => {
      const matchText = item.name.toLowerCase().includes(q) || item.vendorSku.toLowerCase().includes(q);
      const matchCat = !category || item.category === category;
      return matchText && matchCat;
    });
  }

  async getLivePricing(vendorSkus: string[]): Promise<Map<string, number>> {
    const priceMap = new Map<string, number>();
    for (const sku of vendorSkus) {
      const found = this.mockCatalog.find(i => i.vendorSku === sku);
      if (found) priceMap.set(sku, found.unitPriceCents);
    }
    return priceMap;
  }

  async submitPurchaseOrder(order: PurchaseOrderPayload): Promise<VendorOrderConfirmation> {
    if (!order.items || order.items.length === 0) {
      throw new Error('Cannot submit empty purchase order to Sysco');
    }
    const orderRef = `SYS-ORD-${Date.now().toString().slice(-6)}`;
    return {
      success: true,
      vendorOrderRef: orderRef,
      vendorName: this.vendorName,
      confirmationTimestamp: new Date().toISOString(),
      estimatedDeliveryDate: order.deliveryDateRequested || new Date(Date.now() + 86400000).toISOString().split('T')[0]!,
      totalConfirmedCents: order.totalAmountCents,
      status: 'accepted',
      message: `Sysco EDI 850 transmission confirmed for PO #${order.poNumber}.`,
    };
  }

  async getOrderStatus(vendorOrderRef: string): Promise<VendorOrderStatus> {
    return {
      vendorOrderRef,
      status: 'processing',
      trackingNumber: `TRK-${vendorOrderRef}`,
      carrier: 'Sysco Fleet Delivery',
    };
  }

  async parseElectronicInvoice(rawInvoiceData: string): Promise<ParsedVendorInvoice> {
    // Standard Sysco CSV / EDI 810 format: SKU,Name,Qty,UnitPriceCents,LineTotalCents
    const lines = rawInvoiceData.trim().split('\n');
    const items: InvoiceLineItem[] = [];
    let subtotal = 0;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]?.trim();
      if (!line) continue;
      const [sku, name, qtyStr, priceStr, totalStr] = line.split(',');
      if (sku && name && qtyStr && priceStr) {
        const qty = parseFloat(qtyStr);
        const unitPriceCents = parseInt(priceStr, 10);
        const lineTotalCents = totalStr ? parseInt(totalStr, 10) : Math.round(qty * unitPriceCents);
        items.push({
          vendorSku: sku.trim(),
          name: name.trim(),
          quantityInvoiced: qty,
          unitPriceCents,
          lineTotalCents,
        });
        subtotal += lineTotalCents;
      }
    }

    return {
      invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
      invoiceDate: new Date().toISOString().split('T')[0]!,
      vendorId: this.vendorId,
      items,
      subtotalCents: subtotal,
      taxCents: 0,
      freightCents: 0,
      totalCents: subtotal,
    };
  }
}

// -------------------------------------------------------------
// 2. US Foods Adapter
// -------------------------------------------------------------
export class USFoodsAdapter implements VendorAdapter {
  readonly vendorId = 'us_foods';
  readonly vendorName = 'US Foods';
  readonly supportedProtocols: Array<'edi850' | 'rest_api' | 'punchout' | 'csv_direct'> = ['rest_api', 'edi850'];

  private mockCatalog: VendorCatalogItem[] = [
    { vendorSku: 'USF-112233', name: 'Extra Virgin Olive Oil First Cold Press', brand: 'Monarch', packSize: '4/3 LTR CS', unitPriceCents: 6200, category: 'dry_goods', leadTimeDays: 1, inStock: true },
    { vendorSku: 'USF-445566', name: 'Fresh Romaine Hearts Cleaned', brand: 'Cross Valley Farms', packSize: '12/3 CT CS', unitPriceCents: 3200, category: 'produce', leadTimeDays: 1, inStock: true },
    { vendorSku: 'USF-778899', name: 'Shredded Mozzarella Whole Milk', brand: 'Roseli', packSize: '4/5 LB CS', unitPriceCents: 5400, category: 'dairy', leadTimeDays: 1, inStock: true },
  ];

  async searchCatalog(query: string, category?: string): Promise<VendorCatalogItem[]> {
    const q = query.toLowerCase();
    return this.mockCatalog.filter(item => {
      const matchText = item.name.toLowerCase().includes(q) || item.vendorSku.toLowerCase().includes(q);
      const matchCat = !category || item.category === category;
      return matchText && matchCat;
    });
  }

  async getLivePricing(vendorSkus: string[]): Promise<Map<string, number>> {
    const map = new Map<string, number>();
    for (const s of vendorSkus) {
      const f = this.mockCatalog.find(i => i.vendorSku === s);
      if (f) map.set(s, f.unitPriceCents);
    }
    return map;
  }

  async submitPurchaseOrder(order: PurchaseOrderPayload): Promise<VendorOrderConfirmation> {
    const orderRef = `USF-${Date.now().toString().slice(-6)}`;
    return {
      success: true,
      vendorOrderRef: orderRef,
      vendorName: this.vendorName,
      confirmationTimestamp: new Date().toISOString(),
      estimatedDeliveryDate: order.deliveryDateRequested || new Date().toISOString().split('T')[0]!,
      totalConfirmedCents: order.totalAmountCents,
      status: 'accepted',
      message: `US Foods electronic order placed successfully.`,
    };
  }

  async getOrderStatus(vendorOrderRef: string): Promise<VendorOrderStatus> {
    return { vendorOrderRef, status: 'processing' };
  }

  async parseElectronicInvoice(rawInvoiceData: string): Promise<ParsedVendorInvoice> {
    return {
      invoiceNumber: `USF-INV-${Date.now()}`,
      invoiceDate: new Date().toISOString().split('T')[0]!,
      vendorId: this.vendorId,
      items: [],
      subtotalCents: 0,
      taxCents: 0,
      freightCents: 0,
      totalCents: 0,
    };
  }
}

// -------------------------------------------------------------
// 3. Local Farm / Direct Purveyor Adapter
// -------------------------------------------------------------
export class LocalDirectAdapter implements VendorAdapter {
  readonly vendorId: string;
  readonly vendorName: string;
  readonly supportedProtocols: Array<'edi850' | 'rest_api' | 'punchout' | 'csv_direct'> = ['csv_direct'];

  constructor(vendorId = 'local_direct', vendorName = 'Local Farm Purveyor') {
    this.vendorId = vendorId;
    this.vendorName = vendorName;
  }

  async searchCatalog(query: string): Promise<VendorCatalogItem[]> {
    return [];
  }

  async getLivePricing(vendorSkus: string[]): Promise<Map<string, number>> {
    return new Map();
  }

  async submitPurchaseOrder(order: PurchaseOrderPayload): Promise<VendorOrderConfirmation> {
    return {
      success: true,
      vendorOrderRef: `LOC-${order.poNumber}`,
      vendorName: this.vendorName,
      confirmationTimestamp: new Date().toISOString(),
      estimatedDeliveryDate: order.deliveryDateRequested,
      totalConfirmedCents: order.totalAmountCents,
      status: 'accepted',
      message: `Direct PO #${order.poNumber} prepared and sent via email/dispatch.`,
    };
  }

  async getOrderStatus(vendorOrderRef: string): Promise<VendorOrderStatus> {
    return { vendorOrderRef, status: 'pending' };
  }

  async parseElectronicInvoice(rawInvoiceData: string): Promise<ParsedVendorInvoice> {
    const lines = rawInvoiceData.trim().split('\n');
    const items: InvoiceLineItem[] = [];
    let subtotal = 0;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]?.trim();
      if (!line) continue;
      const [sku, name, qtyStr, priceStr] = line.split(',');
      if (sku && name && qtyStr && priceStr) {
        const qty = parseFloat(qtyStr);
        const unitPriceCents = Math.round(parseFloat(priceStr) * 100);
        const lineTotal = Math.round(qty * unitPriceCents);
        items.push({
          vendorSku: sku.trim(),
          name: name.trim(),
          quantityInvoiced: qty,
          unitPriceCents,
          lineTotalCents: lineTotal,
        });
        subtotal += lineTotal;
      }
    }

    return {
      invoiceNumber: `LOC-INV-${Date.now()}`,
      invoiceDate: new Date().toISOString().split('T')[0]!,
      vendorId: this.vendorId,
      items,
      subtotalCents: subtotal,
      taxCents: 0,
      freightCents: 0,
      totalCents: subtotal,
    };
  }
}

// -------------------------------------------------------------
// 4. Vendor Registry & Invoice Reconciliation Helper
// -------------------------------------------------------------
export class VendorRegistry {
  private static adapters = new Map<string, VendorAdapter>();

  static register(adapter: VendorAdapter): void {
    this.adapters.set(adapter.vendorId, adapter);
  }

  static get(vendorId: string): VendorAdapter | undefined {
    return this.adapters.get(vendorId);
  }

  static list(): VendorAdapter[] {
    return Array.from(this.adapters.values());
  }

  static initializeDefaults(): void {
    if (this.adapters.size === 0) {
      this.register(new SyscoAdapter());
      this.register(new USFoodsAdapter());
      this.register(new LocalDirectAdapter('local_farm', 'Hillside Organic Farm'));
    }
  }
}

// Ensure standard defaults are available
VendorRegistry.initializeDefaults();

/**
 * Pure function: Computes line-by-line Invoice Price Variance (IPV).
 * Identifies distributor overcharges between ordered PO price and received invoice price.
 */
export function calculateInvoicePriceVariance(
  po: PurchaseOrderPayload,
  invoice: ParsedVendorInvoice
): InvoicePriceVariance[] {
  const variances: InvoicePriceVariance[] = [];

  for (const invItem of invoice.items) {
    const poItem = po.items.find(i => i.vendorSku === invItem.vendorSku);
    const orderedUnitPrice = poItem ? poItem.unitPriceCents : invItem.unitPriceCents;
    const invoicedUnitPrice = invItem.unitPriceCents;
    const variancePerUnit = invoicedUnitPrice - orderedUnitPrice;
    const totalVariance = Math.round(variancePerUnit * invItem.quantityInvoiced);

    variances.push({
      vendorSku: invItem.vendorSku,
      ingredientName: invItem.name,
      orderedUnitPriceCents: orderedUnitPrice,
      invoicedUnitPriceCents: invoicedUnitPrice,
      quantityReceived: invItem.quantityInvoiced,
      variancePerUnitCents: variancePerUnit,
      totalVarianceCents: totalVariance,
      status: variancePerUnit === 0 ? 'match' : variancePerUnit > 0 ? 'overcharge' : 'undercharge',
    });
  }

  return variances;
}
