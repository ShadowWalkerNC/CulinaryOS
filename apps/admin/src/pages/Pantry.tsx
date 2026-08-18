import React, { useEffect, useState, useCallback } from 'react';
import { CulinaryCard, CulinaryButton, CulinaryBadge } from '@culinaryos/ui';
import { apiHeaders, getApiBase } from '@culinaryos/shared';

const API = getApiBase();

type StockStatus = 'ok' | 'low_stock' | 'out_of_stock';
type POStatus = 'draft' | 'approved' | 'sent' | 'received' | 'cancelled';

interface PantryItem {
  id: string;
  name: string;
  unit: string;
  current_qty: number;
  reorder_at: number;
  reorder_qty: number;
  cost_per_unit: number;
  supplier: string | null;
  stock_status: StockStatus;
}

interface POLine {
  id: string;
  ingredient_name: string;
  unit: string;
  ordered_qty: number;
  received_qty: number;
  unit_cost: number;
}

interface PurchaseOrder {
  id: string;
  po_number: string;
  status: POStatus;
  supplier: string | null;
  total_cost: number;
  created_at: string;
  approved_at: string | null;
  sent_at: string | null;
  received_at: string | null;
  po_line_items: POLine[];
}

function cents(c: number): string {
  return `$${(c / 100).toFixed(2)}`;
}

export function PantryPage() {
  const [items, setItems] = useState<PantryItem[]>([]);
  const [pos, setPOs] = useState<PurchaseOrder[]>([]);
  const [tab, setTab] = useState<'inventory' | 'orders'>('inventory');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const headers = apiHeaders();
      const [itemsRes, posRes] = await Promise.all([
        fetch(`${API}/v1/pantry`, { headers }).then((r) => r.json()),
        fetch(`${API}/v1/pantry/purchase-orders`, { headers }).then((r) => r.json()),
      ]);
      if (itemsRes.ok) setItems(itemsRes.data ?? []);
      if (posRes.ok) setPOs(posRes.data ?? []);
    } catch {
      setMsg({ text: 'Failed to fetch inventory and PO data from API', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  async function createAutoPO() {
    setCreating(true);
    setMsg(null);
    try {
      const res = await fetch(`${API}/v1/pantry/purchase-orders`, {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({ auto: true }),
      });
      const body = await res.json();
      if (!body.ok) {
        setMsg({ text: body.error?.message ?? 'Failed to generate purchase order', type: 'error' });
      } else {
        setMsg({ text: 'Successfully generated purchase order for restocking', type: 'success' });
        await fetchAll();
        setTab('orders');
      }
    } catch {
      setMsg({ text: 'Network error generating purchase order', type: 'error' });
    } finally {
      setCreating(false);
    }
  }

  async function approvePO(poId: string) {
    try {
      await fetch(`${API}/v1/pantry/purchase-orders/${poId}/approve`, {
        method: 'PATCH',
        headers: apiHeaders(),
      });
      setMsg({ text: 'Purchase order approved', type: 'success' });
      void fetchAll();
    } catch {
      setMsg({ text: 'Network error approving purchase order', type: 'error' });
    }
  }

  async function sendPO(poId: string) {
    try {
      await fetch(`${API}/v1/pantry/purchase-orders/${poId}/send`, {
        method: 'PATCH',
        headers: apiHeaders(),
      });
      setMsg({ text: 'Purchase order marked as sent to supplier', type: 'success' });
      void fetchAll();
    } catch {
      setMsg({ text: 'Network error sending purchase order', type: 'error' });
    }
  }

  async function cancelPO(poId: string) {
    try {
      await fetch(`${API}/v1/pantry/purchase-orders/${poId}`, {
        method: 'DELETE',
        headers: apiHeaders(),
      });
      setMsg({ text: 'Purchase order cancelled', type: 'success' });
      void fetchAll();
    } catch {
      setMsg({ text: 'Network error cancelling purchase order', type: 'error' });
    }
  }

  const alerts = items.filter((i) => i.stock_status !== 'ok');

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-[#0b1c30] uppercase tracking-wider">
            Pantry & Inventory Management
          </h1>
          <p className="text-xs text-[#6b7280] mt-1 font-medium">
            Monitor real-time ingredient levels, replenishment thresholds, and automated purchase orders.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {alerts.length > 0 ? (
            <CulinaryBadge variant="warning">{alerts.length} Restock Alerts</CulinaryBadge>
          ) : (
            <CulinaryBadge variant="success">All Stock Levels OK</CulinaryBadge>
          )}
          <CulinaryButton
            variant="primary"
            size="sm"
            onClick={createAutoPO}
            disabled={creating || alerts.length === 0}
          >
            <span className="material-symbols-outlined text-[14px]">add_shopping_cart</span>
            {creating ? 'Generating…' : 'Auto-Generate PO'}
          </CulinaryButton>
          <CulinaryButton variant="outline" size="sm" onClick={() => void fetchAll()}>
            <span className="material-symbols-outlined text-[14px]">refresh</span>
            Refresh
          </CulinaryButton>
        </div>
      </div>

      {/* Feedback Toast */}
      {msg && (
        <div
          className={`p-3 rounded-xl border flex items-center justify-between text-xs font-semibold ${
            msg.type === 'success'
              ? 'bg-[#22c55e10] border-[#22c55e30] text-[#16a34a]'
              : 'bg-red-50 border-red-200 text-red-600'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">
              {msg.type === 'success' ? 'check_circle' : 'error'}
            </span>
            <span>{msg.text}</span>
          </div>
          <button
            onClick={() => setMsg(null)}
            className="text-xs font-bold hover:underline opacity-80 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Section Tabs */}
      <div className="flex items-center gap-2 border-b border-[#e5e7eb] pb-2">
        <button
          onClick={() => setTab('inventory')}
          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
            tab === 'inventory'
              ? 'bg-[#0f172a] text-white shadow-xs'
              : 'bg-white text-[#6b7280] hover:text-[#0b1c30] border border-[#e5e7eb]'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">inventory</span>
          <span>Inventory Roster ({items.length})</span>
        </button>
        <button
          onClick={() => setTab('orders')}
          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
            tab === 'orders'
              ? 'bg-[#0f172a] text-white shadow-xs'
              : 'bg-white text-[#6b7280] hover:text-[#0b1c30] border border-[#e5e7eb]'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">receipt_long</span>
          <span>Purchase Orders ({pos.length})</span>
        </button>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <CulinaryCard>
          <div className="py-12 text-center text-xs text-[#6b7280] font-medium flex flex-col items-center justify-center gap-2">
            <span className="material-symbols-outlined animate-spin text-[24px] text-[#0f172a]">progress_activity</span>
            <span>Loading pantry catalog…</span>
          </div>
        </CulinaryCard>
      ) : tab === 'inventory' ? (
        <CulinaryCard
          title="Ingredient Stock Levels"
          subtitle={`Tracking ${items.length} pantry items with live deduction hooks`}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#e5e7eb] text-[10px] font-black uppercase tracking-wider text-[#6b7280]">
                  <th className="pb-3 px-3">Ingredient</th>
                  <th className="pb-3 px-3">Current Qty</th>
                  <th className="pb-3 px-3">Reorder Point</th>
                  <th className="pb-3 px-3">Reorder Qty</th>
                  <th className="pb-3 px-3">Unit Cost</th>
                  <th className="pb-3 px-3">Supplier</th>
                  <th className="pb-3 px-3 text-right">Stock Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f3f4f6] text-xs">
                {items.map((item) => {
                  const isOk = item.stock_status === 'ok';
                  const isLow = item.stock_status === 'low_stock';
                  return (
                    <tr key={item.id} className="hover:bg-[#f8f9fa] transition-colors">
                      <td className="py-3.5 px-3 font-bold text-[#0b1c30]">
                        {item.name}
                      </td>
                      <td className="py-3.5 px-3 font-mono font-bold text-[#0f172a]">
                        {item.current_qty} {item.unit}
                      </td>
                      <td className="py-3.5 px-3 text-[#6b7280] font-mono">
                        {item.reorder_at} {item.unit}
                      </td>
                      <td className="py-3.5 px-3 text-[#6b7280] font-mono">
                        {item.reorder_qty} {item.unit}
                      </td>
                      <td className="py-3.5 px-3 font-mono text-[#1f2937]">
                        {cents(item.cost_per_unit)}
                      </td>
                      <td className="py-3.5 px-3 text-[#6b7280]">
                        {item.supplier ?? '—'}
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <CulinaryBadge
                          variant={isOk ? 'success' : isLow ? 'warning' : 'danger'}
                        >
                          {item.stock_status.replace('_', ' ')}
                        </CulinaryBadge>
                      </td>
                    </tr>
                  );
                })}
                {!items.length && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-xs text-[#6b7280]">
                      No pantry inventory records found. Run <code className="font-mono bg-[#f3f4f6] px-1.5 py-0.5 rounded text-[#0f172a]">pnpm seed</code>.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CulinaryCard>
      ) : (
        <div className="space-y-4">
          {pos.length === 0 ? (
            <CulinaryCard>
              <div className="py-12 text-center text-xs text-[#6b7280] font-medium">
                No purchase orders generated yet. Use “Auto-Generate PO” to automatically restock low inventory items.
              </div>
            </CulinaryCard>
          ) : (
            pos.map((po) => {
              const statusVariant =
                po.status === 'received'
                  ? 'success'
                  : po.status === 'sent'
                  ? 'warning'
                  : po.status === 'approved'
                  ? 'brand'
                  : po.status === 'cancelled'
                  ? 'danger'
                  : 'neutral';

              return (
                <CulinaryCard
                  key={po.id}
                  title={po.po_number}
                  subtitle={`${new Date(po.created_at).toLocaleDateString()} · ${po.po_line_items.length} line item(s) · Total: ${cents(po.total_cost)} ${po.supplier ? `· Supplier: ${po.supplier}` : ''}`}
                  headerAction={
                    <div className="flex items-center gap-2">
                      <CulinaryBadge variant={statusVariant}>{po.status}</CulinaryBadge>
                      {po.status === 'draft' && (
                        <CulinaryButton
                          variant="primary"
                          size="sm"
                          onClick={() => void approvePO(po.id)}
                        >
                          Approve
                        </CulinaryButton>
                      )}
                      {po.status === 'approved' && (
                        <CulinaryButton
                          variant="secondary"
                          size="sm"
                          onClick={() => void sendPO(po.id)}
                        >
                          Mark Sent
                        </CulinaryButton>
                      )}
                      {['draft', 'approved'].includes(po.status) && (
                        <CulinaryButton
                          variant="danger"
                          size="sm"
                          onClick={() => void cancelPO(po.id)}
                        >
                          Cancel
                        </CulinaryButton>
                      )}
                    </div>
                  }
                >
                  <div className="overflow-x-auto mt-2">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-[#e5e7eb] text-[10px] font-black uppercase tracking-wider text-[#6b7280]">
                          <th className="pb-2 px-2">Ingredient</th>
                          <th className="pb-2 px-2">Ordered Qty</th>
                          <th className="pb-2 px-2">Received Qty</th>
                          <th className="pb-2 px-2">Unit Cost</th>
                          <th className="pb-2 px-2 text-right">Line Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#f3f4f6] text-xs">
                        {po.po_line_items.map((line) => (
                          <tr key={line.id}>
                            <td className="py-2.5 px-2 font-medium text-[#1f2937]">
                              {line.ingredient_name}
                            </td>
                            <td className="py-2.5 px-2 font-mono">
                              {line.ordered_qty} {line.unit}
                            </td>
                            <td className="py-2.5 px-2 font-mono text-[#6b7280]">
                              {line.received_qty > 0 ? `${line.received_qty} ${line.unit}` : '—'}
                            </td>
                            <td className="py-2.5 px-2 font-mono text-[#6b7280]">
                              {cents(line.unit_cost)}
                            </td>
                            <td className="py-2.5 px-2 font-mono font-bold text-[#0f172a] text-right">
                              {cents(line.ordered_qty * line.unit_cost)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CulinaryCard>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export default PantryPage;
