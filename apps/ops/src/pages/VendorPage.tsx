import { useState } from 'react';
import {
  useVendors,
  useAddVendor,
  usePurchaseOrders,
  useCreatePO,
  useUpdatePOStatus,
  type POLineItem,
} from '../hooks/useVendor';
import { Button } from '@culinaryos/ui';
import {
  Building2,
  FileText,
  Package,
  Plus,
  Send,
  CheckCircle2,
  DollarSign,
  Download,
} from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  draft: 'text-zinc-400 bg-zinc-800/60 border-zinc-700',
  sent: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  received: 'text-green-400 bg-green-500/10 border-green-500/30',
  invoiced: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
};

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

export default function VendorPage() {
  const { data: vendors = [], isLoading: vLoading } = useVendors();
  const { data: pos = [], isLoading: poLoading } = usePurchaseOrders();
  const addVendor = useAddVendor();
  const createPO = useCreatePO();
  const updateStatus = useUpdatePOStatus();

  const [activeTab, setActiveTab] = useState<'pos' | 'credits'>('pos');

  const [vForm, setVForm] = useState({ name: '', contact_name: '', email: '', phone: '' });
  const [poVendor, setPOVendor] = useState('');
  const [poDate, setPODate] = useState(new Date().toISOString().split('T')[0]);
  const [lines, setLines] = useState([{ name: '', quantity: '', unit: '', unit_cost: '' }]);

  // Sample Purveyor Credit Memos
  const [creditMemos] = useState([
    {
      id: 'cm-1',
      memoNumber: 'CM-20261001-442',
      vendorName: 'Dennis Food Service',
      invoiceRef: 'INV-DENNIS-8819',
      date: '2026-10-01',
      items: 'Atlantic Salmon Fillet (10 lbs)',
      amount: 112.50,
      status: 'credited',
    },
    {
      id: 'cm-2',
      memoNumber: 'CM-20261004-912',
      vendorName: 'Sysco Boston',
      invoiceRef: 'SYSCO-9021',
      date: '2026-10-04',
      items: 'Organic Baby Arugula (4 lbs)',
      amount: 21.60,
      status: 'submitted',
    },
  ]);

  function addLine() {
    setLines((prev) => [...prev, { name: '', quantity: '', unit: '', unit_cost: '' }]);
  }

  function updateLine(i: number, field: string, val: string) {
    setLines((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)));
  }

  function handleAddVendor(e: React.FormEvent) {
    e.preventDefault();
    if (!vForm.name) return;
    addVendor.mutate({
      name: vForm.name,
      contact_name: vForm.contact_name || null,
      email: vForm.email || null,
      phone: vForm.phone || null,
    });
    setVForm({ name: '', contact_name: '', email: '', phone: '' });
  }

  function handleCreatePO(e: React.FormEvent) {
    e.preventDefault();
    if (!poVendor) return;
    const parsedLines: Omit<POLineItem, 'id' | 'po_id'>[] = lines
      .filter((r) => r.name && r.quantity && r.unit)
      .map((r) => ({
        name: r.name,
        quantity: parseFloat(r.quantity),
        unit: r.unit,
        unit_cost: r.unit_cost ? parseFloat(r.unit_cost) : null,
        received_qty: null,
      }));
    createPO.mutate({ po: { vendor_id: poVendor, order_date: poDate }, lines: parsedLines });
    setPOVendor('');
    setLines([{ name: '', quantity: '', unit: '', unit_cost: '' }]);
  }

  const inputCls =
    'bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 w-full focus:outline-none focus:border-amber-500';
  const btnCls =
    'min-h-[44px] bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-sm px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5';

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header and Tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="w-6 h-6 text-amber-400" />
            <h1 className="text-2xl font-bold tracking-tight text-zinc-100">Vendors & Purchasing</h1>
          </div>
          <p className="text-zinc-400 text-sm mt-1">
            Broadline purveyor catalog · Purchase orders · Defective delivery credit memos
          </p>
        </div>

        <div className="flex bg-zinc-900 p-1.5 rounded-xl border border-zinc-800 gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('pos')}
            className={`min-h-[40px] px-3.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'pos'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Purchase Orders
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('credits')}
            className={`min-h-[40px] px-3.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'credits'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <FileText size={14} />
            Purveyor Credit Claims ({creditMemos.length})
          </button>
        </div>
      </div>

      {/* ─── TAB 1: Purchase Orders ─── */}
      {activeTab === 'pos' && (
        <div className="space-y-6">
          {/* Add Vendor Form */}
          <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-zinc-300 mb-4 uppercase tracking-wide">
              Add Purveyor / Distributor
            </h2>
            <form onSubmit={handleAddVendor} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <input
                className={inputCls}
                placeholder="Vendor name (e.g. Dennis Food Service) *"
                value={vForm.name}
                onChange={(e) => setVForm((f) => ({ ...f, name: e.target.value }))}
              />
              <input
                className={inputCls}
                placeholder="Contact rep"
                value={vForm.contact_name}
                onChange={(e) => setVForm((f) => ({ ...f, contact_name: e.target.value }))}
              />
              <input
                className={inputCls}
                placeholder="Claims/Orders Email"
                value={vForm.email}
                onChange={(e) => setVForm((f) => ({ ...f, email: e.target.value }))}
              />
              <input
                className={inputCls}
                placeholder="Phone"
                value={vForm.phone}
                onChange={(e) => setVForm((f) => ({ ...f, phone: e.target.value }))}
              />
              <Button type="submit" variant="ghost" isLoading={addVendor.isPending} className={`${btnCls} sm:col-span-4`}>
                Register Purveyor
              </Button>
            </form>

            {vLoading ? (
              <p className="text-zinc-500 text-sm mt-3">Loading purveyors…</p>
            ) : (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
                {vendors.map((v) => (
                  <div
                    key={v.id}
                    className="flex justify-between items-center text-sm p-3 bg-zinc-950/60 rounded-lg border border-zinc-800/80"
                  >
                    <div>
                      <span className="font-semibold text-zinc-200">{v.name}</span>
                      <span className="text-zinc-500 text-xs block">{v.email ?? v.phone ?? 'No contact info'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Create PO */}
          <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-zinc-300 mb-4 uppercase tracking-wide">
              Create Purchase Order
            </h2>
            <form onSubmit={handleCreatePO} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select
                  className={inputCls}
                  value={poVendor}
                  onChange={(e) => setPOVendor(e.target.value)}
                >
                  <option value="">Select vendor…</option>
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
                <input
                  className={inputCls}
                  type="date"
                  value={poDate}
                  onChange={(e) => setPODate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <span className="text-xs text-zinc-400 font-semibold uppercase tracking-wider block">
                  Order Line Items:
                </span>
                {lines.map((row, i) => (
                  <div key={i} className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <input
                      className={inputCls}
                      placeholder="Item name (e.g. Ribeye Chuck)"
                      value={row.name}
                      onChange={(e) => updateLine(i, 'name', e.target.value)}
                    />
                    <input
                      className={inputCls}
                      type="number"
                      placeholder="Qty"
                      value={row.quantity}
                      onChange={(e) => updateLine(i, 'quantity', e.target.value)}
                    />
                    <input
                      className={inputCls}
                      placeholder="Unit (cases, lbs)"
                      value={row.unit}
                      onChange={(e) => updateLine(i, 'unit', e.target.value)}
                    />
                    <input
                      className={inputCls}
                      type="number"
                      step="0.01"
                      placeholder="Unit cost ($)"
                      value={row.unit_cost}
                      onChange={(e) => updateLine(i, 'unit_cost', e.target.value)}
                    />
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  onClick={addLine}
                  variant="outline"
                  size="sm"
                  className="min-h-[40px] border-zinc-700 text-zinc-300 hover:text-white"
                >
                  <Plus size={14} /> Add Line Item
                </Button>
                <Button type="submit" variant="ghost" isLoading={createPO.isPending} className={btnCls}>
                  Transmit PO
                </Button>
              </div>
            </form>
          </section>

          {/* PO List */}
          <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-zinc-300 mb-4 uppercase tracking-wide">
              Recent Purchase Orders
            </h2>
            {poLoading ? (
              <p className="text-zinc-500 text-sm">Loading purchase orders…</p>
            ) : pos.length === 0 ? (
              <p className="text-zinc-500 text-sm">No purchase orders created yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-zinc-500 text-xs uppercase border-b border-zinc-800">
                      <th className="text-left pb-2">Order Date</th>
                      <th className="text-left pb-2">Purveyor</th>
                      <th className="text-left pb-2">Status</th>
                      <th className="text-right pb-2">Advance Stage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/80">
                    {pos.map((po) => {
                      const next = { draft: 'sent', sent: 'received', received: 'invoiced', invoiced: 'invoiced' } as const;
                      return (
                        <tr key={po.id} className="hover:bg-zinc-800/40">
                          <td className="py-2.5 font-mono text-zinc-300">{po.order_date}</td>
                          <td className="py-2.5 font-medium text-zinc-100">{(po.vendors as any)?.name ?? '—'}</td>
                          <td className="py-2.5">
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-semibold uppercase border ${STATUS_COLORS[po.status]}`}
                            >
                              {po.status}
                            </span>
                          </td>
                          <td className="py-2.5 text-right">
                            {po.status !== 'invoiced' && (
                              <Button
                                onClick={() => updateStatus.mutate({ id: po.id, status: next[po.status] })}
                                variant="ghost"
                                size="sm"
                                className="min-h-[36px] text-xs font-semibold text-amber-400 hover:bg-amber-500/10"
                              >
                                Advance → {next[po.status]}
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}

      {/* ─── TAB 2: Credit Claims & Invoices ─── */}
      {activeTab === 'credits' && (
        <div className="space-y-6">
          <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div>
                <h2 className="text-base font-bold text-zinc-100">Purveyor Credit Memos & Invoice Offsets</h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Reconciled against supplier delivery discrepancies and waste logs
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-zinc-500 text-xs uppercase border-b border-zinc-800">
                    <th className="text-left pb-2">Memo Number</th>
                    <th className="text-left pb-2">Purveyor</th>
                    <th className="text-left pb-2">Invoice Ref</th>
                    <th className="text-left pb-2">Date</th>
                    <th className="text-left pb-2">Claimed Items</th>
                    <th className="text-right pb-2">Credit Amount</th>
                    <th className="text-center pb-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/80 font-mono">
                  {creditMemos.map((cm) => (
                    <tr key={cm.id} className="hover:bg-zinc-800/40">
                      <td className="py-2.5 font-bold text-amber-400">{cm.memoNumber}</td>
                      <td className="py-2.5 font-sans font-medium text-zinc-200">{cm.vendorName}</td>
                      <td className="py-2.5 text-zinc-400">{cm.invoiceRef}</td>
                      <td className="py-2.5 text-zinc-400">{cm.date}</td>
                      <td className="py-2.5 font-sans text-zinc-300">{cm.items}</td>
                      <td className="py-2.5 text-right font-bold text-emerald-400 font-sans">
                        {fmt(cm.amount)}
                      </td>
                      <td className="py-2.5 text-center font-sans">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          {cm.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
