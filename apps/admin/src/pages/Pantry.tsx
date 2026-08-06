import React, { useEffect, useState, useCallback } from 'react';
import { CulinaryHeader } from '@culinaryos/ui';
import { apiHeaders, getApiBase } from '@culinaryos/shared';

const API = getApiBase();

type StockStatus = 'ok' | 'low_stock' | 'out_of_stock';
type POStatus    = 'draft' | 'approved' | 'sent' | 'received' | 'cancelled';

interface PantryItem {
  id:           string;
  name:         string;
  unit:         string;
  current_qty:  number;
  reorder_at:   number;
  reorder_qty:  number;
  cost_per_unit:number;
  supplier:     string | null;
  stock_status: StockStatus;
}

interface POLine {
  id:              string;
  ingredient_name: string;
  unit:            string;
  ordered_qty:     number;
  received_qty:    number;
  unit_cost:       number;
}

interface PurchaseOrder {
  id:          string;
  po_number:   string;
  status:      POStatus;
  supplier:    string | null;
  total_cost:  number;
  created_at:  string;
  approved_at: string | null;
  sent_at:     string | null;
  received_at: string | null;
  po_line_items: POLine[];
}

const STATUS_COLOR: Record<StockStatus, string> = {
  ok:           '#22c55e',
  low_stock:    '#f59e0b',
  out_of_stock: '#ef4444',
};

const PO_STATUS_COLOR: Record<POStatus, string> = {
  draft:     '#6b7280',
  approved:  '#7c6aff',
  sent:      '#f59e0b',
  received:  '#22c55e',
  cancelled: '#374151',
};

function cents(c: number): string {
  return `$${(c / 100).toFixed(2)}`;
}

export function PantryPage() {
  const [items,  setItems]  = useState<PantryItem[]>([]);
  const [pos,    setPOs]    = useState<PurchaseOrder[]>([]);
  const [tab,    setTab]    = useState<'inventory' | 'orders'>('inventory');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const headers = apiHeaders();
    const [itemsRes, posRes] = await Promise.all([
      fetch(`${API}/v1/pantry`, { headers }).then((r) => r.json()),
      fetch(`${API}/v1/pantry/purchase-orders`, { headers }).then((r) => r.json()),
    ]);
    if (itemsRes.ok)  setItems(itemsRes.data  ?? []);
    if (posRes.ok)    setPOs(posRes.data    ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function createAutoPO() {
    setCreating(true);
    await fetch(`${API}/v1/pantry/purchase-orders`, {
      method:  'POST',
      headers: apiHeaders(),
      body:    JSON.stringify({ auto: true }),
    });
    await fetchAll();
    setCreating(false);
    setTab('orders');
  }

  async function approvePO(poId: string) {
    await fetch(`${API}/v1/pantry/purchase-orders/${poId}/approve`, { method: 'PATCH', headers: apiHeaders() });
    fetchAll();
  }

  async function sendPO(poId: string) {
    await fetch(`${API}/v1/pantry/purchase-orders/${poId}/send`, { method: 'PATCH', headers: apiHeaders() });
    fetchAll();
  }

  async function cancelPO(poId: string) {
    await fetch(`${API}/v1/pantry/purchase-orders/${poId}`, { method: 'DELETE', headers: apiHeaders() });
    fetchAll();
  }

  const alerts = items.filter((i) => i.stock_status !== 'ok');

  return (
    <div style={{ padding: '0 0 24px', fontFamily: "'Inter', sans-serif", color: '#1f2937', background: '#f8f9fa', minHeight: '100dvh' }}>
      <CulinaryHeader activeModule="admin" tenantName="CulinaryOS Back-Office Admin" />
      <div style={{ padding: '24px' }}>
      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>Pantry & Inventory</h1>
          {alerts.length > 0 && (
            <span style={{ fontSize: '12px', color: '#f59e0b', marginTop: '4px', display: 'block' }}>
              ⚠️ {alerts.length} item{alerts.length !== 1 ? 's' : ''} need restocking
            </span>
          )}
        </div>
        <button
          onClick={createAutoPO}
          disabled={creating || alerts.length === 0}
          style={{
            padding:       '10px 18px',
            borderRadius:  '8px',
            border:        'none',
            background:    alerts.length === 0 ? '#2a2d40' : '#7c6aff',
            color:         alerts.length === 0 ? '#6b7299' : '#fff',
            fontWeight:    700,
            fontSize:      '13px',
            cursor:        alerts.length === 0 || creating ? 'not-allowed' : 'pointer',
          }}
        >
          {creating ? 'Creating…' : '⊕ Auto-Generate PO'}
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', borderBottom: '1px solid #2e3150', paddingBottom: '0' }}>
        {(['inventory', 'orders'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding:       '8px 18px',
              border:        'none',
              borderBottom:  tab === t ? '2px solid #7c6aff' : '2px solid transparent',
              background:    'transparent',
              color:         tab === t ? '#7c6aff' : '#6b7299',
              fontWeight:    tab === t ? 700 : 400,
              fontSize:      '13px',
              cursor:        'pointer',
              textTransform: 'capitalize',
            }}
          >
            {t === 'inventory' ? `Inventory (${items.length})` : `Purchase Orders (${pos.length})`}
          </button>
        ))}
      </div>

      {loading && <div style={{ color: '#6b7299' }}>Loading…</div>}

      {/* Inventory Tab */}
      {!loading && tab === 'inventory' && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ color: '#6b7299', textAlign: 'left' }}>
              {['Ingredient', 'Current', 'Reorder At', 'Reorder Qty', 'Unit', 'Cost/Unit', 'Supplier', 'Status'].map((h) => (
                <th key={h} style={{ padding: '8px 12px', fontWeight: 500, borderBottom: '1px solid #2e3150' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} style={{ borderBottom: '1px solid #1a1d27' }}>
                <td style={{ padding: '10px 12px', fontWeight: 600 }}>{item.name}</td>
                <td style={{ padding: '10px 12px', fontFamily: 'monospace' }}>{item.current_qty}</td>
                <td style={{ padding: '10px 12px', color: '#6b7299' }}>{item.reorder_at}</td>
                <td style={{ padding: '10px 12px', color: '#6b7299' }}>{item.reorder_qty}</td>
                <td style={{ padding: '10px 12px', color: '#6b7299' }}>{item.unit}</td>
                <td style={{ padding: '10px 12px', color: '#6b7299' }}>{cents(item.cost_per_unit)}</td>
                <td style={{ padding: '10px 12px', color: '#6b7299' }}>{item.supplier ?? '—'}</td>
                <td style={{ padding: '10px 12px' }}>
                  <span style={{
                    background:    `${STATUS_COLOR[item.stock_status]}22`,
                    color:         STATUS_COLOR[item.stock_status],
                    borderRadius:  '4px',
                    padding:       '2px 8px',
                    fontSize:      '11px',
                    fontWeight:    600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}>
                    {item.stock_status.replace('_', ' ')}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Purchase Orders Tab */}
      {!loading && tab === 'orders' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {pos.length === 0 && (
            <div style={{ color: '#6b7299', textAlign: 'center', padding: '40px' }}>
              No purchase orders yet. Use “Auto-Generate PO” to create one from low-stock alerts.
            </div>
          )}
          {pos.map((po) => (
            <div key={po.id} style={{
              background:   '#1a1d27',
              border:       '1px solid #2e3150',
              borderLeft:   `4px solid ${PO_STATUS_COLOR[po.status]}`,
              borderRadius: '8px',
              padding:      '16px 20px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div>
                  <span style={{ fontWeight: 700, fontSize: '15px' }}>{po.po_number}</span>
                  {po.supplier && <span style={{ marginLeft: '10px', fontSize: '12px', color: '#6b7299' }}>{po.supplier}</span>}
                  <div style={{ marginTop: '4px', fontSize: '11px', color: '#6b7299' }}>
                    {new Date(po.created_at).toLocaleDateString()} · {po.po_line_items.length} line{po.po_line_items.length !== 1 ? 's' : ''} · {cents(po.total_cost)}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    background:    `${PO_STATUS_COLOR[po.status]}22`,
                    color:         PO_STATUS_COLOR[po.status],
                    borderRadius:  '4px',
                    padding:       '3px 10px',
                    fontSize:      '11px',
                    fontWeight:    700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}>
                    {po.status}
                  </span>
                  {po.status === 'draft'    && <button onClick={() => approvePO(po.id)} style={btnStyle('#22c55e')}>Approve</button>}
                  {po.status === 'approved' && <button onClick={() => sendPO(po.id)}    style={btnStyle('#7c6aff')}>Mark Sent</button>}
                  {['draft', 'approved'].includes(po.status) && (
                    <button onClick={() => cancelPO(po.id)} style={btnStyle('#ef4444')}>Cancel</button>
                  )}
                </div>
              </div>
              {/* Line items */}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ color: '#6b7299' }}>
                    {['Ingredient', 'Ordered', 'Received', 'Unit', 'Unit Cost', 'Line Total'].map((h) => (
                      <th key={h} style={{ textAlign: 'left', padding: '4px 8px', fontWeight: 500 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {po.po_line_items.map((line) => (
                    <tr key={line.id}>
                      <td style={{ padding: '4px 8px' }}>{line.ingredient_name}</td>
                      <td style={{ padding: '4px 8px', fontFamily: 'monospace' }}>{line.ordered_qty} {line.unit}</td>
                      <td style={{ padding: '4px 8px', fontFamily: 'monospace', color: line.received_qty > 0 ? '#22c55e' : '#6b7299' }}>
                        {line.received_qty > 0 ? line.received_qty : '—'}
                      </td>
                      <td style={{ padding: '4px 8px', color: '#6b7299' }}>{line.unit}</td>
                      <td style={{ padding: '4px 8px', color: '#6b7299' }}>{cents(line.unit_cost)}</td>
                      <td style={{ padding: '4px 8px', fontWeight: 600 }}>{cents(line.ordered_qty * line.unit_cost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}

function btnStyle(color: string): React.CSSProperties {
  return {
    padding:      '5px 12px',
    borderRadius: '6px',
    border:       `1px solid ${color}`,
    background:   `${color}18`,
    color,
    fontSize:     '12px',
    fontWeight:   600,
    cursor:       'pointer',
  };
}
