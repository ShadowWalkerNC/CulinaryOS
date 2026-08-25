import React, { useEffect, useState, useCallback } from 'react';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Package,
  RefreshCw,
  ShoppingBag,
  CheckCircle2,
  AlertCircle,
} from '@culinaryos/ui';
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
          <h1 className="text-xl font-black text-foreground uppercase tracking-wider">
            Pantry & Inventory Management
          </h1>
          <p className="text-xs text-muted-foreground mt-1 font-medium">
            Monitor real-time ingredient levels, replenishment thresholds, and automated purchase orders.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {alerts.length > 0 ? (
            <Badge variant="warning" pulse className="px-2.5 py-1">
              {alerts.length} Restock Alerts
            </Badge>
          ) : (
            <Badge variant="success" className="px-2.5 py-1">
              All Stock Levels OK
            </Badge>
          )}
          <Button
            variant="brand"
            size="sm"
            onClick={createAutoPO}
            disabled={creating || alerts.length === 0}
            className="uppercase tracking-wider"
          >
            <ShoppingBag className="w-3.5 h-3.5 mr-1.5" />
            {creating ? 'Generating…' : 'Auto-Generate PO'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => void fetchAll()}>
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Feedback Alert Toast */}
      {msg && (
        <div
          className={`p-3 rounded-xl border flex items-center justify-between text-xs font-semibold animate-fadeIn ${
            msg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-destructive/10 border-destructive/20 text-destructive'
          }`}
        >
          <div className="flex items-center gap-2">
            {msg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-destructive" />
            )}
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
      <div className="flex items-center gap-2 border-b border-border pb-2">
        <button
          onClick={() => setTab('inventory')}
          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
            tab === 'inventory'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'bg-card text-muted-foreground hover:text-foreground border border-border'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Inventory Roster ({items.length})</span>
        </button>
        <button
          onClick={() => setTab('orders')}
          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
            tab === 'orders'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'bg-card text-muted-foreground hover:text-foreground border border-border'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Purchase Orders ({pos.length})</span>
        </button>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <Card className="p-12 text-center text-xs text-muted-foreground font-medium flex flex-col items-center justify-center gap-2">
          <RefreshCw className="w-6 h-6 animate-spin text-primary" />
          <span>Loading pantry catalog…</span>
        </Card>
      ) : tab === 'inventory' ? (
        <Card className="p-5">
          <CardHeader className="p-0 pb-4">
            <CardTitle>Ingredient Stock Levels</CardTitle>
            <CardDescription>
              Tracking {items.length} pantry items with live deduction hooks
            </CardDescription>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ingredient</TableHead>
                <TableHead>Current Qty</TableHead>
                <TableHead>Reorder Point</TableHead>
                <TableHead>Reorder Qty</TableHead>
                <TableHead>Unit Cost</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead className="text-right">Stock Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const isOk = item.stock_status === 'ok';
                const isLow = item.stock_status === 'low_stock';
                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-bold text-foreground">{item.name}</TableCell>
                    <TableCell className="font-mono font-bold text-foreground">
                      {item.current_qty} {item.unit}
                    </TableCell>
                    <TableCell className="font-mono text-muted-foreground">
                      {item.reorder_at} {item.unit}
                    </TableCell>
                    <TableCell className="font-mono text-muted-foreground">
                      {item.reorder_qty} {item.unit}
                    </TableCell>
                    <TableCell className="font-mono text-foreground">{cents(item.cost_per_unit)}</TableCell>
                    <TableCell className="text-muted-foreground">{item.supplier ?? '—'}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={isOk ? 'success' : isLow ? 'warning' : 'destructive'}>
                        {item.stock_status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!items.length && (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-xs text-muted-foreground">
                    No pantry inventory records found. Run <code className="font-mono bg-muted px-1.5 py-0.5 rounded text-foreground">pnpm seed</code>.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <div className="space-y-4">
          {pos.length === 0 ? (
            <Card className="p-12 text-center text-xs text-muted-foreground font-medium">
              No purchase orders generated yet. Use “Auto-Generate PO” to automatically restock low inventory items.
            </Card>
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
                  ? 'destructive'
                  : 'secondary';

              return (
                <Card key={po.id} className="p-5">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-border pb-3">
                    <div>
                      <h3 className="font-black text-sm uppercase text-foreground">{po.po_number}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(po.created_at).toLocaleDateString()} · {po.po_line_items.length} line item(s) · Total: {cents(po.total_cost)} {po.supplier ? `· Supplier: ${po.supplier}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={statusVariant as any}>{po.status}</Badge>
                      {po.status === 'draft' && (
                        <Button
                          variant="brand"
                          size="sm"
                          onClick={() => void approvePO(po.id)}
                        >
                          Approve
                        </Button>
                      )}
                      {po.status === 'approved' && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => void sendPO(po.id)}
                        >
                          Mark Sent
                        </Button>
                      )}
                      {['draft', 'approved'].includes(po.status) && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => void cancelPO(po.id)}
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="overflow-x-auto mt-3">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Ingredient</TableHead>
                          <TableHead>Ordered Qty</TableHead>
                          <TableHead>Received Qty</TableHead>
                          <TableHead>Unit Cost</TableHead>
                          <TableHead className="text-right">Line Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {po.po_line_items.map((line) => (
                          <TableRow key={line.id}>
                            <TableCell className="font-medium text-foreground">{line.ingredient_name}</TableCell>
                            <TableCell className="font-mono">{line.ordered_qty} {line.unit}</TableCell>
                            <TableCell className="font-mono text-muted-foreground">
                              {line.received_qty > 0 ? `${line.received_qty} ${line.unit}` : '—'}
                            </TableCell>
                            <TableCell className="font-mono text-muted-foreground">{cents(line.unit_cost)}</TableCell>
                            <TableCell className="font-mono font-bold text-foreground text-right">
                              {cents(line.ordered_qty * line.unit_cost)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export default PantryPage;
