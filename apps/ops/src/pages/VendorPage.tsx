import { useState } from 'react';
import { useVendors, useAddVendor, usePurchaseOrders, useCreatePO, useUpdatePOStatus } from '../hooks/useVendor';
import type { POLineItem } from '../hooks/useVendor';

const STATUS_COLORS: Record<string, string> = {
  draft: 'text-zinc-400',
  sent: 'text-amber-400',
  received: 'text-green-400',
  invoiced: 'text-blue-400',
};

export default function VendorPage() {
  const { data: vendors = [], isLoading: vLoading } = useVendors();
  const { data: pos = [], isLoading: poLoading } = usePurchaseOrders();
  const addVendor = useAddVendor();
  const createPO = useCreatePO();
  const updateStatus = useUpdatePOStatus();

  const [vForm, setVForm] = useState({ name: '', contact_name: '', email: '', phone: '' });
  const [poVendor, setPOVendor] = useState('');
  const [poDate, setPODate] = useState(new Date().toISOString().split('T')[0]);
  const [lines, setLines] = useState([{ name: '', quantity: '', unit: '', unit_cost: '' }]);

  function addLine() {
    setLines(prev => [...prev, { name: '', quantity: '', unit: '', unit_cost: '' }]);
  }
  function updateLine(i: number, field: string, val: string) {
    setLines(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: val } : r));
  }

  function handleAddVendor(e: React.FormEvent) {
    e.preventDefault();
    if (!vForm.name) return;
    addVendor.mutate({ name: vForm.name, contact_name: vForm.contact_name || null, email: vForm.email || null, phone: vForm.phone || null });
    setVForm({ name: '', contact_name: '', email: '', phone: '' });
  }

  function handleCreatePO(e: React.FormEvent) {
    e.preventDefault();
    if (!poVendor) return;
    const parsedLines: Omit<POLineItem, 'id' | 'po_id'>[] = lines
      .filter(r => r.name && r.quantity && r.unit)
      .map(r => ({
        name: r.name,
        quantity: parseFloat(r.quantity),
        unit: r.unit,
        unit_cost: r.unit_cost ? parseFloat(r.unit_cost) : null,
        received_qty: null,
      }));
    createPO.mutate({ po: { vendor_id: poVendor, order_date: poDate }, lines: parsedLines });
    setPOVendor(''); setLines([{ name: '', quantity: '', unit: '', unit_cost: '' }]);
  }

  const inputCls = 'bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 w-full focus:outline-none focus:border-amber-500';
  const btnCls = 'bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-sm px-4 py-2 rounded-lg transition-colors';

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-1">Vendors</h1>
        <p className="text-zinc-400 text-sm">Vendor catalog · Purchase orders · Invoice matching</p>
      </div>

      {/* Add Vendor */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-zinc-300 mb-4 uppercase tracking-wide">Add Vendor</h2>
        <form onSubmit={handleAddVendor} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <input className={inputCls} placeholder="Vendor name *" value={vForm.name} onChange={e => setVForm(f => ({ ...f, name: e.target.value }))} />
          <input className={inputCls} placeholder="Contact name" value={vForm.contact_name} onChange={e => setVForm(f => ({ ...f, contact_name: e.target.value }))} />
          <input className={inputCls} placeholder="Email" value={vForm.email} onChange={e => setVForm(f => ({ ...f, email: e.target.value }))} />
          <input className={inputCls} placeholder="Phone" value={vForm.phone} onChange={e => setVForm(f => ({ ...f, phone: e.target.value }))} />
          <button type="submit" className={`${btnCls} sm:col-span-4`} disabled={addVendor.isPending}>
            {addVendor.isPending ? 'Saving…' : 'Add Vendor'}
          </button>
        </form>
        {vLoading ? <p className="text-zinc-500 text-sm mt-3">Loading…</p> : (
          <ul className="mt-3 space-y-1">
            {vendors.map(v => (
              <li key={v.id} className="flex justify-between text-sm py-1 border-b border-zinc-800">
                <span>{v.name}</span>
                <span className="text-zinc-500">{v.email ?? v.phone ?? '—'}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Create PO */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-zinc-300 mb-4 uppercase tracking-wide">Create Purchase Order</h2>
        <form onSubmit={handleCreatePO} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <select className={inputCls} value={poVendor} onChange={e => setPOVendor(e.target.value)}>
              <option value="">Select vendor…</option>
              {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
            <input className={inputCls} type="date" value={poDate} onChange={e => setPODate(e.target.value)} />
          </div>
          <p className="text-xs text-zinc-500 uppercase tracking-wide">Line Items</p>
          {lines.map((row, i) => (
            <div key={i} className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <input className={inputCls} placeholder="Item" value={row.name} onChange={e => updateLine(i, 'name', e.target.value)} />
              <input className={inputCls} type="number" placeholder="Qty" value={row.quantity} onChange={e => updateLine(i, 'quantity', e.target.value)} />
              <input className={inputCls} placeholder="Unit" value={row.unit} onChange={e => updateLine(i, 'unit', e.target.value)} />
              <input className={inputCls} type="number" placeholder="Unit cost ($)" value={row.unit_cost} onChange={e => updateLine(i, 'unit_cost', e.target.value)} />
            </div>
          ))}
          <div className="flex gap-3">
            <button type="button" onClick={addLine} className="text-xs text-amber-400 hover:text-amber-300">+ line</button>
            <button type="submit" className={btnCls} disabled={createPO.isPending}>
              {createPO.isPending ? 'Creating…' : 'Create PO'}
            </button>
          </div>
        </form>
      </section>

      {/* PO List */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-zinc-300 mb-4 uppercase tracking-wide">Purchase Orders</h2>
        {poLoading ? <p className="text-zinc-500 text-sm">Loading…</p> : pos.length === 0 ? (
          <p className="text-zinc-500 text-sm">No POs yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-zinc-500 text-xs uppercase border-b border-zinc-800">
                <th className="text-left pb-2">Date</th>
                <th className="text-left pb-2">Vendor</th>
                <th className="text-left pb-2">Status</th>
                <th className="text-right pb-2">Advance</th>
              </tr>
            </thead>
            <tbody>
              {pos.map(po => {
                const next = { draft: 'sent', sent: 'received', received: 'invoiced', invoiced: 'invoiced' } as const;
                return (
                  <tr key={po.id} className="border-b border-zinc-800 hover:bg-zinc-800/40">
                    <td className="py-2">{po.order_date}</td>
                    <td className="py-2">{(po.vendors as any)?.name ?? '—'}</td>
                    <td className={`py-2 font-medium ${STATUS_COLORS[po.status]}`}>{po.status}</td>
                    <td className="py-2 text-right">
                      {po.status !== 'invoiced' && (
                        <button
                          onClick={() => updateStatus.mutate({ id: po.id, status: next[po.status] })}
                          className="text-xs text-amber-400 hover:text-amber-300"
                        >
                          → {next[po.status]}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
