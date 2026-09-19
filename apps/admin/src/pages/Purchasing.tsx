import React, { useState, useEffect, useCallback } from 'react';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
} from '@culinaryos/ui';
import {
  apiHeaders,
  getApiBase,
  type Vendor,
  type VendorItem,
  type OrderGuideEntry,
  type SuggestedOrderLine,
  type PurchaseOrder,
  type PurchaseOrderLine,
} from '@culinaryos/shared';
import { DennisImportModal } from '../components/DennisImportModal';

const API = getApiBase();

interface ReceiveLine extends PurchaseOrderLine {
  guide_id?: string | null;
  guide_on_hand?: number | null;
}

function orderBadge(status: string): { bg: string; fg: string; label: string } {
  switch (status) {
    case 'received':
      return { bg: 'bg-emerald-100 text-emerald-800 border-emerald-300', fg: 'text-emerald-800', label: 'Received' };
    case 'submitted':
      return { bg: 'bg-blue-100 text-blue-800 border-blue-300', fg: 'text-blue-800', label: 'Submitted' };
    case 'approved':
      return { bg: 'bg-purple-100 text-purple-800 border-purple-300', fg: 'text-purple-800', label: 'Approved' };
    case 'cancelled':
      return { bg: 'bg-slate-100 text-slate-700 border-slate-300', fg: 'text-slate-700', label: 'Cancelled' };
    case 'partial':
      return { bg: 'bg-amber-100 text-amber-800 border-amber-300', fg: 'text-amber-800', label: 'Partial' };
    default:
      return { bg: 'bg-amber-50 text-amber-900 border-amber-300', fg: 'text-amber-900', label: 'Draft — Pending Approval' };
  }
}

export function PurchasingPage() {
  const [activeTab, setActiveTab] = useState<'order-guide' | 'suggested' | 'catalog' | 'orders' | 'split-mrp'>('order-guide');
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState<string>('');

  // Data states
  const [orderGuide, setOrderGuide] = useState<OrderGuideEntry[]>([]);
  const [catalogItems, setCatalogItems] = useState<VendorItem[]>([]);
  const [suggestedLines, setSuggestedLines] = useState<SuggestedOrderLine[]>([]);
  const [suggestedSummary, setSuggestedSummary] = useState<{ totalItems: number; totalUnits: number; totalCost: number }>({ totalItems: 0, totalUnits: 0, totalCost: 0 });
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [splitMrpData, setSplitMrpData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Modals
  const [showDennisImport, setShowDennisImport] = useState(false);
  const [showAddGuideModal, setShowAddGuideModal] = useState(false);
  const [showAddCatalogModal, setShowAddCatalogModal] = useState(false);
  const [newGuideItem, setNewGuideItem] = useState({ vendorItemId: '', parLevel: 5, onHand: 0 });
  const [newCatalogItem, setNewCatalogItem] = useState({ vendorSku: '', name: '', brand: '', packSize: '', uom: 'case', category: 'General', unitCost: 0 });

  // Receiving state
  const [receiveOrder, setReceiveOrder] = useState<PurchaseOrder | null>(null);
  const [receiveLines, setReceiveLines] = useState<ReceiveLine[]>([]);
  const [receiveVals, setReceiveVals] = useState<Record<string, string>>({});
  const [receiving, setReceiving] = useState<Record<string, boolean>>({});

  const showMsg = (text: string, type: 'success' | 'error' = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 4000);
  };

  const fetchVendors = useCallback(async () => {
    try {
      const res = await fetch(`${API}/v1/purchasing/vendors`, { headers: apiHeaders() });
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.data || [];
      setVendors(list);
      if (list.length > 0 && !selectedVendorId) {
        setSelectedVendorId(list[0].id);
      }
    } catch {
      // Offline demo fallback
      const demo: Vendor[] = [
        { id: 'dennis-1', name: 'Dennis Food Service', code: 'dennis', active: true, website: 'https://dennisfoodservice.com' },
        { id: 'sysco-1', name: 'Sysco Foods', code: 'sysco', active: true },
      ];
      setVendors(demo);
      setSelectedVendorId(demo[0]!.id);
    }
  }, [selectedVendorId]);

  const fetchOrderGuide = useCallback(async (vendorId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/v1/purchasing/order-guide?vendorId=${vendorId}`, { headers: apiHeaders() });
      const data = await res.json();
      setOrderGuide(Array.isArray(data) ? data : data.data || []);
    } catch {
      showMsg('Failed to load order guide', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCatalog = useCallback(async (vendorId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/v1/purchasing/items?vendorId=${vendorId}`, { headers: apiHeaders() });
      const data = await res.json();
      setCatalogItems(Array.isArray(data) ? data : data.data || []);
    } catch {
      showMsg('Failed to load catalog', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSuggestedOrder = useCallback(async (vendorId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/v1/purchasing/suggested-order`, {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({ vendorId }),
      });
      const data = await res.json();
      setSuggestedLines(data.lines || []);
      setSuggestedSummary({
        totalItems: data.totalItems || 0,
        totalUnits: data.totalUnits || 0,
        totalCost: data.totalCost || 0,
      });
    } catch {
      showMsg('Failed to generate suggested orders', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/v1/purchasing/orders`, { headers: apiHeaders() });
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : data.data || []);
    } catch {
      showMsg('Failed to load purchase orders', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSplitMrp = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/v1/purchasing/split-mrp-optimizer`, {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({}),
      });
      const data = await res.json();
      setSplitMrpData(data);
    } catch {
      showMsg('Failed to run split MRP optimizer', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchVendors();
  }, [fetchVendors]);

  useEffect(() => {
    if (selectedVendorId) {
      if (activeTab === 'order-guide') void fetchOrderGuide(selectedVendorId);
      if (activeTab === 'catalog') void fetchCatalog(selectedVendorId);
      if (activeTab === 'suggested') void fetchSuggestedOrder(selectedVendorId);
      if (activeTab === 'orders') void fetchOrders();
      if (activeTab === 'split-mrp') void fetchSplitMrp();
    }
  }, [selectedVendorId, activeTab, fetchOrderGuide, fetchCatalog, fetchSuggestedOrder, fetchOrders, fetchSplitMrp]);

  const updateGuideCounts = async (id: string, parLevel: number, onHand: number) => {
    try {
      const res = await fetch(`${API}/v1/purchasing/order-guide/${id}`, {
        method: 'PUT',
        headers: apiHeaders(),
        body: JSON.stringify({ parLevel, onHand }),
      });
      if (res.ok) {
        setOrderGuide(prev => prev.map(g => g.id === id ? { ...g, par_level: parLevel, on_hand: onHand } : g));
        showMsg('Par level & on-hand inventory updated');
      }
    } catch {
      showMsg('Failed to update guide counts', 'error');
    }
  };

  const handleCreateOrderFromSuggested = async () => {
    if (suggestedLines.length === 0) return;
    try {
      const lines = suggestedLines.map(l => ({
        vendorItemId: l.vendorItemId,
        qtyOrdered: l.suggestedQty,
        unitCost: l.unitCost,
      }));
      const res = await fetch(`${API}/v1/purchasing/orders`, {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({
          vendorId: selectedVendorId,
          orderDate: new Date().toISOString().slice(0, 10),
          lines,
          notes: 'Auto-generated from Par & Suggested Purchasing',
        }),
      });
      if (res.ok) {
        showMsg('Draft purchase order created — pending manager approval');
        setActiveTab('orders');
        void fetchOrders();
      }
    } catch {
      showMsg('Failed to create purchase order', 'error');
    }
  };

  const approveOrder = async (id: string) => {
    try {
      const res = await fetch(`${API}/v1/purchasing/orders/${id}/approve`, {
        method: 'POST',
        headers: apiHeaders(),
      });
      if (res.ok) {
        showMsg('Purchase order approved');
        void fetchOrders();
      }
    } catch {
      showMsg('Approval failed', 'error');
    }
  };

  const submitOrder = async (id: string) => {
    try {
      const res = await fetch(`${API}/v1/purchasing/orders/${id}/submit`, {
        method: 'POST',
        headers: apiHeaders(),
      });
      if (res.ok) {
        showMsg('Purchase order marked as submitted to vendor');
        void fetchOrders();
      }
    } catch {
      showMsg('Submit failed', 'error');
    }
  };

  const openReceive = async (order: PurchaseOrder) => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/v1/purchasing/orders/${order.id}`, { headers: apiHeaders() });
      const data = await res.json();
      setReceiveOrder(data);
      const lines: ReceiveLine[] = data.lines || [];
      setReceiveLines(lines);
      const vals: Record<string, string> = {};
      lines.forEach(l => { if (l.id) vals[l.id] = String(l.qty_received ?? 0); });
      setReceiveVals(vals);
    } catch {
      showMsg('Failed to load order lines for receiving', 'error');
    } finally {
      setLoading(false);
    }
  };

  const confirmReceive = async (line: ReceiveLine) => {
    if (!line.id || !receiveOrder) return;
    const total = Number(receiveVals[line.id]);
    if (!Number.isFinite(total) || total < 0) {
      showMsg('Enter a valid received quantity', 'error');
      return;
    }
    setReceiving(p => ({ ...p, [line.id as string]: true }));
    try {
      const res = await fetch(`${API}/v1/purchasing/orders/${receiveOrder.id}/lines/${line.id}/receive`, {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({ qtyReceived: total }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setReceiveLines(prev => prev.map(l => l.id === line.id
          ? { ...l, qty_received: total, guide_on_hand: data.guide?.onHandAfter ?? l.guide_on_hand }
          : l));
        showMsg(`Received ${line.item_name}: on-hand updated to ${data.guide?.onHandAfter} (${data.guide?.deltaInGuideUnits >= 0 ? '+' : ''}${data.guide?.deltaInGuideUnits})`);
        void fetchOrders();
      } else {
        showMsg(data.error || 'Failed to record receipt', 'error');
      }
    } catch {
      showMsg('Failed to communicate with receiving API', 'error');
    } finally {
      setReceiving(p => ({ ...p, [line.id as string]: false }));
    }
  };

  const handleExportCSV = () => {
    const selectedVendor = vendors.find(v => v.id === selectedVendorId);
    const vendorName = selectedVendor ? selectedVendor.name : 'Dennis Food Service';
    const header = 'vendor,name,sku,pack,uom,qty,unit_cost\n';
    const rows = suggestedLines.map(l => `"${vendorName}","${l.itemName}","${l.vendorSku}","${l.packSize}","${l.uom}",${l.suggestedQty},${l.unitCost}`).join('\n');
    
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${vendorName.toLowerCase().replace(/\s+/g, '-')}-suggested-order-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showMsg('CSV order sheet exported');
  };

  const currentVendor = vendors.find(v => v.id === selectedVendorId);

  return (
    <div className="space-y-6">
      {/* Top Header: Title & Distributor Switcher */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-slate-950">
              Purchasing & Vendors
            </h1>
            <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 font-bold">
              ShorelineOps Parity
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Distributor-agnostic ordering, par levels, catalog mapping, and multi-distributor Lowest-Cost Split MRP.
          </p>
        </div>

        {/* Vendor Selector */}
        <div className="flex items-center gap-3 bg-white border border-slate-200 p-1.5 rounded-xl shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-2">
            Purveyor:
          </span>
          <select
            value={selectedVendorId}
            onChange={(e) => setSelectedVendorId(e.target.value)}
            className="bg-slate-50 border border-slate-300 text-slate-900 text-sm font-semibold rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-rose-500 cursor-pointer"
          >
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} ({v.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Message Banner */}
      {message && (
        <div
          className={`p-4 rounded-xl border text-sm font-semibold flex items-center gap-2 transition-all ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-rose-50 text-rose-900 border-rose-200'
          }`}
        >
          <span className="material-symbols-outlined">
            {message.type === 'success' ? 'check_circle' : 'error'}
          </span>
          <span>{message.text}</span>
        </div>
      )}

      {/* 4-Tab Navigation (Plus Split MRP Optimizer) */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('order-guide')}
          className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap min-h-[48px] flex items-center gap-2 ${
            activeTab === 'order-guide'
              ? 'border-rose-600 text-rose-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <span className="material-symbols-outlined text-lg">format_list_bulleted</span>
          Standing Order Guide
        </button>

        <button
          onClick={() => setActiveTab('suggested')}
          className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap min-h-[48px] flex items-center gap-2 ${
            activeTab === 'suggested'
              ? 'border-rose-600 text-rose-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <span className="material-symbols-outlined text-lg">auto_awesome</span>
          Suggested Order Generator
        </button>

        <button
          onClick={() => setActiveTab('split-mrp')}
          className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap min-h-[48px] flex items-center gap-2 ${
            activeTab === 'split-mrp'
              ? 'border-rose-600 text-rose-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <span className="material-symbols-outlined text-lg">call_split</span>
          Lowest-Cost Split MRP
        </button>

        <button
          onClick={() => setActiveTab('catalog')}
          className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap min-h-[48px] flex items-center gap-2 ${
            activeTab === 'catalog'
              ? 'border-rose-600 text-rose-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <span className="material-symbols-outlined text-lg">storefront</span>
          Distributor Catalog & SKUs
        </button>

        <button
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap min-h-[48px] flex items-center gap-2 ${
            activeTab === 'orders'
              ? 'border-rose-600 text-rose-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <span className="material-symbols-outlined text-lg">receipt_long</span>
          Purchase Orders & Receiving
        </button>
      </div>

      {/* ──────────────────────────────────────────────────────────────────────────
          TAB 1: Standing Order Guide
      ────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'order-guide' && (
        <Card className="bg-white border-slate-200 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <CardTitle className="text-lg font-bold text-slate-950">
                Par Levels & On-Hand Inventory
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Adjust par levels and live counts inline. Items below par trigger reorders automatically.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                onClick={() => setShowDennisImport(true)}
                className="min-h-[44px] flex items-center gap-1.5 font-bold"
              >
                <span className="material-symbols-outlined text-base">upload_file</span>
                Import Dennis CSV Guide
              </Button>
              <Button
                variant="default"
                onClick={() => setShowAddGuideModal(true)}
                className="min-h-[44px] bg-rose-600 hover:bg-rose-500 text-white font-bold flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-base">add</span>
                + Add Item to Guide
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3.5">SKU</th>
                  <th className="p-3.5">Item Description</th>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5">Pack / UOM</th>
                  <th className="p-3.5 w-24">Par Level</th>
                  <th className="p-3.5 w-24">On Hand</th>
                  <th className="p-3.5 text-right">Unit Cost</th>
                  <th className="p-3.5">Stock Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-900 font-medium">
                {orderGuide.map((item) => {
                  const needsOrder = Number(item.on_hand) < Number(item.par_level);
                  const deficit = Math.ceil(Number(item.par_level) - Number(item.on_hand));
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="p-3.5 font-mono text-xs text-slate-600 font-bold">
                        {item.vendor_sku}
                      </td>
                      <td className="p-3.5 font-bold text-slate-950">
                        {item.item_name}
                      </td>
                      <td className="p-3.5 text-xs text-slate-500 font-semibold">
                        {item.category || 'General'}
                      </td>
                      <td className="p-3.5 text-slate-600">
                        {item.pack_size} ({item.uom})
                      </td>
                      <td className="p-3.5">
                        <input
                          type="number"
                          defaultValue={item.par_level}
                          onBlur={(e) => updateGuideCounts(item.id, Number(e.target.value), Number(item.on_hand))}
                          className="w-16 px-2 py-1 border border-slate-300 rounded-md font-bold text-center focus:ring-2 focus:ring-rose-500 focus:outline-none"
                        />
                      </td>
                      <td className="p-3.5">
                        <input
                          type="number"
                          defaultValue={item.on_hand}
                          onBlur={(e) => updateGuideCounts(item.id, Number(item.par_level), Number(e.target.value))}
                          className="w-16 px-2 py-1 border border-slate-300 rounded-md font-bold text-center focus:ring-2 focus:ring-rose-500 focus:outline-none"
                        />
                      </td>
                      <td className="p-3.5 text-right font-semibold">
                        ${Number(item.unit_cost || 0).toFixed(2)}
                      </td>
                      <td className="p-3.5">
                        {needsOrder ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                            Order {deficit}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                            OK
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {orderGuide.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-slate-400 font-medium">
                      No items in order guide. Import a Dennis CSV or add items from catalog.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* ──────────────────────────────────────────────────────────────────────────
          TAB 2: Suggested Order Generator
      ────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'suggested' && (
        <div className="space-y-6">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="bg-white border-slate-200 p-5 shadow-xs">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Total Line Items
              </span>
              <p className="text-3xl font-black text-slate-950 mt-1">
                {suggestedSummary.totalItems}
              </p>
              <p className="text-xs text-slate-500 mt-1">Items below target par levels</p>
            </Card>

            <Card className="bg-white border-slate-200 p-5 shadow-xs">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Total Units to Order
              </span>
              <p className="text-3xl font-black text-rose-600 mt-1">
                {suggestedSummary.totalUnits}
              </p>
              <p className="text-xs text-slate-500 mt-1">Calculated case packs required</p>
            </Card>

            <Card className="bg-white border-slate-200 p-5 shadow-xs">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Projected Spend
              </span>
              <p className="text-3xl font-black text-emerald-600 mt-1">
                ${suggestedSummary.totalCost.toFixed(2)}
              </p>
              <p className="text-xs text-slate-500 mt-1">Target: {currentVendor?.name}</p>
            </Card>
          </div>

          <Card className="bg-white border-slate-200 shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <CardTitle className="text-lg font-bold text-slate-950">
                  Suggested Purchase Order — {currentVendor?.name}
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Auto-calculated from Par Levels minus On-Hand inventory stock.
                </CardDescription>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  onClick={() => window.print()}
                  className="min-h-[44px] flex items-center gap-1.5 font-bold"
                >
                  <span className="material-symbols-outlined text-base">print</span>
                  Print Worksheet
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleExportCSV}
                  className="min-h-[44px] flex items-center gap-1.5 font-bold"
                >
                  <span className="material-symbols-outlined text-base">download</span>
                  Export CSV
                </Button>
                <Button
                  variant="default"
                  onClick={handleCreateOrderFromSuggested}
                  disabled={suggestedLines.length === 0}
                  className="min-h-[48px] px-6 bg-rose-600 hover:bg-rose-500 text-white font-bold flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-base">shopping_cart_checkout</span>
                  1-Click Create Draft PO
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Vendor</th>
                    <th className="p-3.5">SKU</th>
                    <th className="p-3.5">Item Name</th>
                    <th className="p-3.5">Pack Size</th>
                    <th className="p-3.5">UOM</th>
                    <th className="p-3.5 text-center">Par</th>
                    <th className="p-3.5 text-center">On Hand</th>
                    <th className="p-3.5 text-center">Suggested Qty</th>
                    <th className="p-3.5 text-right">Est. Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-900 font-medium">
                  {suggestedLines.map((line, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/60">
                      <td className="p-3.5 text-slate-500 font-semibold">{line.vendor}</td>
                      <td className="p-3.5 font-mono text-xs font-bold">{line.vendorSku}</td>
                      <td className="p-3.5 font-bold text-slate-950">{line.itemName}</td>
                      <td className="p-3.5 text-slate-600">{line.packSize}</td>
                      <td className="p-3.5 text-slate-500">{line.uom}</td>
                      <td className="p-3.5 text-center font-bold">{line.parLevel}</td>
                      <td className="p-3.5 text-center font-semibold text-rose-600">{line.onHand}</td>
                      <td className="p-3.5 text-center font-black text-rose-600 text-base">
                        {line.suggestedQty}
                      </td>
                      <td className="p-3.5 text-right font-bold">
                        ${(line.suggestedQty * line.unitCost).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                  {suggestedLines.length === 0 && (
                    <tr>
                      <td colSpan={9} className="text-center py-12 text-slate-400 font-medium">
                        All items meet or exceed par levels. No replenishment orders needed!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────────
          TAB 3: Lowest-Cost Split MRP Optimizer
      ────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'split-mrp' && (
        <div className="space-y-6">
          <Card className="bg-white border-slate-200 shadow-xs">
            <CardHeader className="border-b border-slate-100 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg font-bold text-slate-950">
                      Lowest-Cost Split MRP Optimizer
                    </CardTitle>
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300 font-bold">
                      Algorithm Active
                    </Badge>
                  </div>
                  <CardDescription className="text-xs text-slate-500 mt-1">
                    Compares prices across Dennis Food Service, Sysco, and US Foods to assemble split orders that minimize food spend.
                  </CardDescription>
                </div>
                <Button
                  variant="default"
                  onClick={fetchSplitMrp}
                  className="min-h-[44px] bg-slate-900 hover:bg-slate-800 text-white font-bold flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-base">refresh</span>
                  Re-Optimize Quotes
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              {splitMrpData && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                      <span className="text-xs font-bold uppercase text-slate-500">
                        Single-Vendor Benchmark
                      </span>
                      <p className="text-2xl font-black text-slate-800 mt-1">
                        ${Number(splitMrpData.singleVendorBenchmarkCost || 0).toFixed(2)}
                      </p>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                      <span className="text-xs font-bold uppercase text-slate-500">
                        Optimized Split Spend
                      </span>
                      <p className="text-2xl font-black text-emerald-600 mt-1">
                        ${Number(splitMrpData.totalSplitCost || 0).toFixed(2)}
                      </p>
                    </div>

                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                      <span className="text-xs font-bold uppercase text-emerald-800">
                        Projected Savings
                      </span>
                      <p className="text-2xl font-black text-emerald-700 mt-1">
                        ${Number(splitMrpData.projectedSavings || 0).toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                      Generated Split Purchase Orders by Distributor
                    </h3>

                    {(splitMrpData.splitOrders || []).map((order: any, idx: number) => (
                      <div key={idx} className="border border-slate-200 rounded-xl overflow-hidden">
                        <div className="bg-slate-100 px-4 py-3 flex items-center justify-between">
                          <span className="font-bold text-slate-900 text-sm flex items-center gap-2">
                            <span className="material-symbols-outlined text-rose-600 text-lg">local_shipping</span>
                            {order.vendorName}
                          </span>
                          <span className="font-mono font-bold text-sm text-slate-900">
                            Subtotal: ${Number(order.vendorTotalCost).toFixed(2)}
                          </span>
                        </div>
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                            <tr>
                              <th className="p-2.5">SKU</th>
                              <th className="p-2.5">Item Name</th>
                              <th className="p-2.5">Pack</th>
                              <th className="p-2.5 text-center">Suggested Qty</th>
                              <th className="p-2.5 text-right">Winning Price</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {order.lines.map((l: any, lIdx: number) => (
                              <tr key={lIdx}>
                                <td className="p-2.5 font-mono font-semibold text-slate-700">{l.vendorSku}</td>
                                <td className="p-2.5 font-bold text-slate-900">{l.itemName}</td>
                                <td className="p-2.5 text-slate-500">{l.packSize}</td>
                                <td className="p-2.5 text-center font-bold text-rose-600">{l.suggestedQty}</td>
                                <td className="p-2.5 text-right font-semibold">${Number(l.unitCost).toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────────
          TAB 4: Distributor Catalog & SKUs
      ────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'catalog' && (
        <Card className="bg-white border-slate-200 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <CardTitle className="text-lg font-bold text-slate-950">
                Distributor Catalog ({currentVendor?.name})
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                All orderable SKUs, packaging specifications, and master pricing for this vendor.
              </CardDescription>
            </div>
            <Button
              variant="default"
              onClick={() => setShowAddCatalogModal(true)}
              className="min-h-[44px] bg-rose-600 hover:bg-rose-500 text-white font-bold flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-base">add</span>
              + Add Catalog Item
            </Button>
          </CardHeader>

          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3.5">SKU</th>
                  <th className="p-3.5">Product Name</th>
                  <th className="p-3.5">Brand</th>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5">Pack Size</th>
                  <th className="p-3.5">UOM</th>
                  <th className="p-3.5 text-right">Unit Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-900 font-medium">
                {catalogItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60">
                    <td className="p-3.5 font-mono text-xs font-bold text-slate-700">{item.vendor_sku}</td>
                    <td className="p-3.5 font-bold text-slate-950">{item.name}</td>
                    <td className="p-3.5 text-slate-500 font-semibold">{item.brand || '—'}</td>
                    <td className="p-3.5 text-xs text-slate-500">{item.category || 'General'}</td>
                    <td className="p-3.5 text-slate-600">{item.pack_size}</td>
                    <td className="p-3.5 text-slate-500">{item.uom}</td>
                    <td className="p-3.5 text-right font-semibold">${Number(item.unit_cost || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* ──────────────────────────────────────────────────────────────────────────
          TAB 5: Purchase Orders History & Receiving
      ────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
          <Card className="bg-white border-slate-200 shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <CardTitle className="text-lg font-bold text-slate-950">
                  Purchase Orders History
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Workflow pipeline: Draft → Manager Approval → Vendor Submission → Line-by-Line Receiving.
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Date</th>
                    <th className="p-3.5">Vendor</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Notes</th>
                    <th className="p-3.5">Created By</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-900 font-medium">
                  {orders.map((order) => {
                    const badge = orderBadge(order.status);
                    return (
                      <tr key={order.id} className="hover:bg-slate-50/60">
                        <td className="p-3.5 font-bold">{order.order_date}</td>
                        <td className="p-3.5 text-slate-700">{order.vendor_name}</td>
                        <td className="p-3.5">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${badge.bg}`}>
                            {badge.label}
                          </span>
                        </td>
                        <td className="p-3.5 text-xs text-slate-500">{order.notes || '—'}</td>
                        <td className="p-3.5 text-xs text-slate-600">{order.created_by_name || 'System'}</td>
                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {order.status === 'draft' && (
                              <Button
                                variant="secondary"
                                onClick={() => approveOrder(order.id)}
                                className="min-h-[40px] px-3 font-bold text-purple-700 hover:bg-purple-50"
                              >
                                Approve
                              </Button>
                            )}
                            {order.status === 'approved' && (
                              <Button
                                variant="secondary"
                                onClick={() => submitOrder(order.id)}
                                className="min-h-[40px] px-3 font-bold text-blue-700 hover:bg-blue-50"
                              >
                                Mark Submitted
                              </Button>
                            )}
                            {['approved', 'submitted', 'received', 'partial'].includes(order.status) && (
                              <Button
                                variant="default"
                                onClick={() => openReceive(order)}
                                className="min-h-[40px] px-3 font-bold bg-slate-900 hover:bg-slate-800 text-white"
                              >
                                Receive Shipment
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {orders.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-slate-400 font-medium">
                        No purchase orders recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Interactive Line-by-Line Receiving Section */}
          {receiveOrder && (
            <Card className="bg-slate-50 border-2 border-slate-300 shadow-md">
              <CardHeader className="flex flex-row items-center justify-between border-b border-slate-200 pb-4">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-2xl text-slate-900">package_2</span>
                  <div>
                    <CardTitle className="text-base font-black text-slate-950">
                      Receiving Delivery: {receiveOrder.vendor_name} ({receiveOrder.order_date})
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-600">
                      Enter cumulative quantities received. Inventory on-hand is updated in real time.
                    </CardDescription>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => { setReceiveOrder(null); setReceiveLines([]); }}
                  className="min-h-[40px] text-xs font-bold"
                >
                  Close Receiving
                </Button>
              </CardHeader>

              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse bg-white">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3.5">Product</th>
                      <th className="p-3.5 text-center">Ordered</th>
                      <th className="p-3.5 text-center">Already Received</th>
                      <th className="p-3.5 text-center">Cumulative Received</th>
                      <th className="p-3.5">Status Flag</th>
                      <th className="p-3.5 text-right">Confirm</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {receiveLines.map((line) => {
                      const totalRec = Number(receiveVals[line.id as string] ?? 0);
                      const ordered = Number(line.qty_ordered ?? 0);
                      let flag = { label: 'Not Received', bg: 'bg-slate-100 text-slate-600' };
                      if (totalRec > ordered) flag = { label: 'Over-received', bg: 'bg-rose-100 text-rose-800 font-bold' };
                      else if (totalRec > 0 && totalRec < ordered) flag = { label: 'Partial', bg: 'bg-amber-100 text-amber-800 font-bold' };
                      else if (totalRec === ordered) flag = { label: 'Complete', bg: 'bg-emerald-100 text-emerald-800 font-bold' };

                      return (
                        <tr key={line.id}>
                          <td className="p-3.5">
                            <p className="font-bold text-slate-950">{line.item_name}</p>
                            <p className="text-xs font-mono text-slate-500">{line.vendor_sku} · {line.pack_size}</p>
                          </td>
                          <td className="p-3.5 text-center font-bold">{line.qty_ordered}</td>
                          <td className="p-3.5 text-center text-slate-600 font-semibold">{line.qty_received ?? 0}</td>
                          <td className="p-3.5 text-center">
                            <input
                              type="number"
                              value={receiveVals[line.id as string] || ''}
                              onChange={(e) => setReceiveVals(prev => ({ ...prev, [line.id as string]: e.target.value }))}
                              className="w-20 px-2 py-1.5 border border-slate-300 rounded-lg text-center font-bold focus:ring-2 focus:ring-rose-500 focus:outline-none"
                            />
                          </td>
                          <td className="p-3.5">
                            <span className={`px-2 py-0.5 rounded-full text-xs ${flag.bg}`}>
                              {flag.label}
                            </span>
                          </td>
                          <td className="p-3.5 text-right">
                            <Button
                              variant="secondary"
                              onClick={() => confirmReceive(line)}
                              isLoading={Boolean(receiving[line.id as string])}
                              className="min-h-[40px] px-3 text-xs font-bold text-emerald-800 hover:bg-emerald-50"
                            >
                              Confirm
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Dennis CSV Import Modal */}
      {showDennisImport && (
        <DennisImportModal
          vendorId={selectedVendorId}
          vendorName={currentVendor?.name || 'Dennis Food Service'}
          onClose={() => setShowDennisImport(false)}
          onSuccess={() => {
            showMsg('Dennis Food Service catalog imported successfully');
            void fetchOrderGuide(selectedVendorId);
            void fetchCatalog(selectedVendorId);
          }}
        />
      )}
    </div>
  );
}

export default PurchasingPage;
