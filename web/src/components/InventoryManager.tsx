import React, { useState } from 'react';
import { AlertTriangle, Clipboard, CheckCircle2 } from 'lucide-react';
import { InventoryItem } from '../types';

const INITIAL_INVENTORY: InventoryItem[] = [
  { id: 'i1', name: 'Unbleached Bread Flour', stockQty: 12.500, parLevel: 50.000, unit: 'kg', costPerUnit: 2.00 },
  { id: 'i2', name: 'Active Starter Culture', stockQty: 2.200, parLevel: 5.000, unit: 'kg', costPerUnit: 1.50 },
  { id: 'i3', name: 'Fine Sea Salt', stockQty: 8.200, parLevel: 10.000, unit: 'kg', costPerUnit: 0.80 },
  { id: 'i4', name: 'Unsalted Butter', stockQty: 24.500, parLevel: 20.000, unit: 'kg', costPerUnit: 5.50 },
  { id: 'i5', name: 'Whole Milk', stockQty: 4.000, parLevel: 12.000, unit: 'L', costPerUnit: 1.20 },
  { id: 'i6', name: 'Ground Cinnamon', stockQty: 1.800, parLevel: 1.000, unit: 'kg', costPerUnit: 14.00 }
];

export const InventoryManager: React.FC = () => {
  const [items, setItems] = useState<InventoryItem[]>(INITIAL_INVENTORY);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [physicalCount, setPhysicalCount] = useState<string>('');
  const [varianceLog, setVarianceLog] = useState<{ name: string; variance: number; loss: number }[]>([]);
  const [successMsg, setSuccessMsg] = useState<string>('');

  const handleAudit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || !physicalCount) return;

    const count = parseFloat(physicalCount);
    if (isNaN(count)) return;

    const variance = count - selectedItem.stockQty;
    const loss = Math.abs(variance * selectedItem.costPerUnit);

    // Update state
    setItems(prev => prev.map(i => i.id === selectedItem.id ? { ...i, stockQty: count } : i));
    setVarianceLog(prev => [{ name: selectedItem.name, variance, loss }, ...prev]);
    setSuccessMsg(`Audited ${selectedItem.name}. Variance of ${variance.toFixed(3)} ${selectedItem.unit} logged.`);
    
    // Clear inputs
    setSelectedItem(null);
    setPhysicalCount('');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  return (
    <div>
      <h2 className="title-xl">Inventory & Variance Logs</h2>

      {/* Warnings & Alerts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
        <div className="glass-card" style={{ borderLeft: '4px solid var(--status-danger)' }}>
          <h3 className="title-lg" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--status-danger)' }}>
            <AlertTriangle size={18} /> Smart 86 Alerts
          </h3>
          <p style={{ fontSize: '14px', marginBottom: '12px' }}>
            Bread Flour depletion velocity is currently high. Sourdough loaf item availability will auto-disable on POS in approx. 12 minutes unless stock is audited.
          </p>
          <span className="chip chip-danger">Action Required</span>
        </div>

        <div className="glass-card" style={{ borderLeft: '4px solid var(--status-warning)' }}>
          <h3 className="title-lg" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--status-warning)' }}>
            <AlertTriangle size={18} /> Low Stock Warnings
          </h3>
          <ul style={{ fontSize: '14px', paddingLeft: '20px', listStyleType: 'disc' }}>
            <li>Whole Milk: 4.0L (Par: 12.0L)</li>
            <li>Starter Culture: 2.2kg (Par: 5.0kg)</li>
          </ul>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        {/* Inventory Table */}
        <div className="glass-card" style={{ padding: '0px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-tertiary)', borderBottom: '1px solid var(--bg-tertiary)' }}>
                <th style={{ padding: '16px' }}>Item Name</th>
                <th style={{ padding: '16px' }}>Current Stock</th>
                <th style={{ padding: '16px' }}>Par Level</th>
                <th style={{ padding: '16px' }}>Cost / Unit</th>
                <th style={{ padding: '16px' }}>Status</th>
                <th style={{ padding: '16px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => {
                const ratio = item.stockQty / item.parLevel;
                const status = ratio < 0.5 ? 'crit' : ratio < 1.0 ? 'low' : 'ok';
                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--bg-tertiary)' }}>
                    <td style={{ padding: '16px', fontWeight: '500' }}>{item.name}</td>
                    <td style={{ padding: '16px' }}>{item.stockQty.toFixed(3)} {item.unit}</td>
                    <td style={{ padding: '16px' }}>{item.parLevel.toFixed(3)} {item.unit}</td>
                    <td style={{ padding: '16px' }}>${item.costPerUnit.toFixed(2)}</td>
                    <td style={{ padding: '16px' }}>
                      <span className={`chip ${status === 'crit' ? 'chip-danger' : status === 'low' ? 'chip-warning' : 'chip-success'}`}>
                        {status === 'crit' ? 'Critical' : status === 'low' ? 'Low' : 'Optimal'}
                      </span>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <button 
                        onClick={() => setSelectedItem(item)}
                        className="btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                      >
                        Audit
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Audit Form & Variance Log */}
        <div>
          {/* Audit Card */}
          <div className="glass-card" style={{ marginBottom: '24px' }}>
            <h3 className="title-lg" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clipboard size={18} /> Physical Audit
            </h3>

            {successMsg && (
              <div style={{
                backgroundColor: 'rgba(16,185,129,0.1)',
                color: 'var(--status-success)',
                padding: '10px',
                borderRadius: '6px',
                fontSize: '12px',
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <CheckCircle2 size={14} />
                {successMsg}
              </div>
            )}

            {selectedItem ? (
              <form onSubmit={handleAudit}>
                <p style={{ fontSize: '14px', marginBottom: '12px' }}>
                  Auditing: <strong>{selectedItem.name}</strong>
                </p>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                    Physical Count ({selectedItem.unit})
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    value={physicalCount}
                    onChange={e => setPhysicalCount(e.target.value)}
                    style={{
                      width: '100%',
                      backgroundColor: 'var(--bg-primary)',
                      border: '1px solid var(--bg-tertiary)',
                      color: 'var(--text-main)',
                      padding: '10px',
                      borderRadius: '8px',
                      fontFamily: 'var(--font-family)'
                    }}
                    placeholder={`Expected: ${selectedItem.stockQty.toFixed(3)}`}
                    required
                  />
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="submit" className="btn-primary" style={{ flexGrow: 1 }}>Save Audit</button>
                  <button type="button" onClick={() => setSelectedItem(null)} className="btn-secondary">Cancel</button>
                </div>
              </form>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                Select an item in the ledger list to log a physical counts audit.
              </p>
            )}
          </div>

          {/* Variance Log Card */}
          <div className="glass-card">
            <h3 className="title-lg">Variance Ledger</h3>
            {varianceLog.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No audit variances logged today.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '200px', overflowY: 'auto' }}>
                {varianceLog.map((log, idx) => (
                  <div key={idx} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: '1px solid var(--bg-tertiary)',
                    paddingBottom: '8px',
                    fontSize: '13px'
                  }}>
                    <div>
                      <strong>{log.name}</strong>
                      <span style={{
                        display: 'block',
                        fontSize: '11px',
                        color: log.variance < 0 ? 'var(--status-danger)' : 'var(--status-success)'
                      }}>
                        {log.variance < 0 ? '' : '+'}{log.variance.toFixed(3)} units
                      </span>
                    </div>
                    <span style={{ fontWeight: '600', color: log.variance < 0 ? 'var(--status-danger)' : 'var(--text-main)' }}>
                      {log.variance < 0 ? `-$${log.loss.toFixed(2)}` : 'No loss'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
