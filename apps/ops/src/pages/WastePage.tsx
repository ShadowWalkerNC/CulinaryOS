import { useState, useMemo } from 'react';
import { useWasteLogs, useLogWaste, useDeleteWasteLog, type WasteReason } from '../hooks/useWaste';
import {
  summarizeWaste,
  generateSupplierCreditMemo,
  exportCreditMemoCsv,
  type SupplierCreditMemo,
  type SupplierCreditMemoItem,
} from '@culinaryos/waste-engine';
import { Button, Trash2 } from '@culinaryos/ui';
import {
  Trash,
  FileText,
  DollarSign,
  AlertCircle,
  Download,
  Copy,
  Check,
  X,
  Send,
  Building,
  CheckCircle2,
} from 'lucide-react';

const REASONS: WasteReason[] = ['spoilage', 'trim', 'overcook', 'drop', 'expired', 'other'];

const PURVEYORS = [
  { name: 'Dennis Food Service', email: 'claims@dennisfoods.com' },
  { name: 'Sysco Boston-Northern NE', email: 'ap-credits@sysco.com' },
  { name: 'US Foods New England', email: 'claims@usfoods.com' },
  { name: 'Maine Coast Seafood Co.', email: 'orders@mainecoast.com' },
  { name: 'Green Mountain Produce', email: 'credits@greenmountainproduce.com' },
];

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

export default function WastePage() {
  const [days, setDays] = useState(30);
  const { data: logs = [], isLoading } = useWasteLogs(days);
  const logWaste = useLogWaste();
  const deleteLog = useDeleteWasteLog();

  const [activeTab, setActiveTab] = useState<'log' | 'claims'>('log');

  // Form State
  const [form, setForm] = useState({
    ingredient: '',
    quantity_grams: '',
    reason: 'spoilage' as WasteReason,
    cost_per_gram: '0.015',
    log_date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  // Credit Memo Modal State
  const [showMemoModal, setShowMemoModal] = useState(false);
  const [selectedPurveyor, setSelectedPurveyor] = useState(PURVEYORS[0]!.name);
  const [vendorEmail, setVendorEmail] = useState(PURVEYORS[0]!.email);
  const [invoiceRef, setInvoiceRef] = useState('INV-2026-9081');
  const [poRef, setPoRef] = useState('PO-2026-1044');
  const [claimNotes, setClaimNotes] = useState('Product arrived out of safe holding temperature (>45°F).');
  const [claimItems, setClaimItems] = useState<SupplierCreditMemoItem[]>([]);
  const [generatedMemo, setGeneratedMemo] = useState<SupplierCreditMemo | null>(null);
  const [copied, setCopied] = useState(false);

  // Stored Claims History
  const [savedClaims, setSavedClaims] = useState<SupplierCreditMemo[]>([
    {
      id: 'memo-1',
      memoNumber: 'CM-20261001-442',
      vendorName: 'Dennis Food Service',
      vendorEmail: 'claims@dennisfoods.com',
      invoiceReference: 'INV-DENNIS-8819',
      poReference: 'PO-2026-1012',
      generatedDate: '2026-10-01',
      items: [
        {
          ingredient: 'Atlantic Salmon Fillet',
          quantityGrams: 4500,
          quantityDisplay: '10 lbs',
          costPerGram: 0.025,
          totalCostDollars: 112.50,
          reason: 'Temperature abuse on delivery (>45°F)',
          lotNumber: 'LOT-SALM-8891',
        },
      ],
      totalCreditDollars: 112.50,
      status: 'submitted',
      requestText: 'CREDIT MEMO REQUEST...',
    },
  ]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.ingredient || !form.quantity_grams) return;
    logWaste.mutate({
      ingredient: form.ingredient,
      quantity_grams: parseFloat(form.quantity_grams),
      reason: form.reason,
      cost_per_gram: parseFloat(form.cost_per_gram || '0'),
      log_date: form.log_date,
      notes: form.notes || null,
    });
    setForm((f) => ({ ...f, ingredient: '', quantity_grams: '', notes: '' }));
  }

  function handleOpenClaimForLog(log: any) {
    const costPerGram = log.cost_per_gram || 0.015;
    const totalDollars = Math.round(log.quantity_grams * costPerGram * 100) / 100;
    const item: SupplierCreditMemoItem = {
      ingredient: log.ingredient,
      quantityGrams: log.quantity_grams,
      quantityDisplay: `${log.quantity_grams.toFixed(0)}g (${(log.quantity_grams * 0.00220462).toFixed(1)} lbs)`,
      costPerGram,
      totalCostDollars: totalDollars,
      reason: `Wasted on ${log.log_date} (${log.reason}): ${log.notes || 'Arrived substandard/damaged'}`,
      poNumber: poRef,
    };
    setClaimItems([item]);
    const memo = generateSupplierCreditMemo(selectedPurveyor, [item], {
      invoiceReference: invoiceRef,
      poReference: poRef,
      vendorEmail,
      notes: claimNotes,
      restaurantName: 'Cheezies Gourmet',
    });
    setGeneratedMemo(memo);
    setShowMemoModal(true);
  }

  function handleGenerateNewMemo() {
    const memo = generateSupplierCreditMemo(selectedPurveyor, claimItems, {
      invoiceReference: invoiceRef,
      poReference: poRef,
      vendorEmail,
      notes: claimNotes,
      restaurantName: 'Cheezies Gourmet',
    });
    setGeneratedMemo(memo);
  }

  function handleSaveClaim() {
    if (!generatedMemo) return;
    setSavedClaims([generatedMemo, ...savedClaims]);
    setShowMemoModal(false);
    setActiveTab('claims');
  }

  function handleDownloadCsv() {
    if (!generatedMemo) return;
    const csv = exportCreditMemoCsv(generatedMemo);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `credit_memo_${generatedMemo.memoNumber}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function handleCopyClaimText() {
    if (!generatedMemo) return;
    navigator.clipboard.writeText(generatedMemo.requestText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const summary = summarizeWaste(
    logs.map((l) => ({
      date: l.log_date,
      ingredient: l.ingredient,
      quantity: l.quantity_grams,
      reason: l.reason,
      costPerGram: l.cost_per_gram,
    }))
  );

  const totalCreditRequested = useMemo(() => {
    return savedClaims.reduce((sum, c) => sum + c.totalCreditDollars, 0);
  }, [savedClaims]);

  const inputCls =
    'bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 w-full focus:outline-none focus:border-amber-500';
  const btnCls =
    'min-h-[44px] bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-sm px-4 py-2 rounded-lg transition-colors';

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Trash className="w-6 h-6 text-red-400" />
            <h1 className="text-2xl font-bold tracking-tight text-zinc-100">Waste & Supplier Credit Memos</h1>
          </div>
          <p className="text-zinc-400 text-sm mt-1">
            Ingredient scrap logging · Actual loss tracking · Supplier credit memo claim generation
          </p>
        </div>

        <div className="flex bg-zinc-900 p-1.5 rounded-xl border border-zinc-800 gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('log')}
            className={`min-h-[40px] px-3.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'log'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Waste Logs
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('claims')}
            className={`min-h-[40px] px-3.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'claims'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <FileText size={14} />
            Supplier Credit Memos ({savedClaims.length})
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Total Waste Cost</p>
          <p className="text-2xl font-bold text-red-400">{fmt(summary.totalCost)}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Total Weight</p>
          <p className="text-2xl font-bold text-zinc-100">
            {(summary.totalGrams / 1000).toFixed(1)} kg <span className="text-xs text-zinc-500 font-normal">({(summary.totalGrams * 0.00220462).toFixed(1)} lbs)</span>
          </p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Vendor Claims Filed</p>
          <p className="text-2xl font-bold text-emerald-400">{fmt(totalCreditRequested)}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Top Wasted Item</p>
          <p className="text-lg font-semibold text-amber-400 truncate mt-1">
            {summary.topWastedIngredients[0]?.ingredient ?? '—'}
          </p>
        </div>
      </div>

      {/* ─── TAB 1: Waste Logs ─── */}
      {activeTab === 'log' && (
        <div className="space-y-6">
          {/* Log Waste Form */}
          <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-zinc-300 mb-4 uppercase tracking-wide">
              Record Kitchen Scrap / Defective Delivery
            </h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                className={inputCls}
                placeholder="Ingredient (e.g. Atlantic Salmon Fillet)"
                value={form.ingredient}
                onChange={(e) => setForm((f) => ({ ...f, ingredient: e.target.value }))}
              />
              <input
                className={inputCls}
                type="number"
                placeholder="Weight in Grams"
                value={form.quantity_grams}
                onChange={(e) => setForm((f) => ({ ...f, quantity_grams: e.target.value }))}
              />
              <select
                className={inputCls}
                value={form.reason}
                onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value as WasteReason }))}
              >
                {REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <input
                className={inputCls}
                type="number"
                step="0.001"
                placeholder="Cost per gram ($)"
                value={form.cost_per_gram}
                onChange={(e) => setForm((f) => ({ ...f, cost_per_gram: e.target.value }))}
              />
              <input
                className={inputCls}
                type="date"
                value={form.log_date}
                onChange={(e) => setForm((f) => ({ ...f, log_date: e.target.value }))}
              />
              <input
                className={inputCls}
                placeholder="Notes / Purveyor Lot # (optional)"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
              <Button
                type="submit"
                variant="ghost"
                isLoading={logWaste.isPending}
                className={`${btnCls} sm:col-span-3`}
              >
                Record Waste Event
              </Button>
            </form>
          </section>

          {/* Waste Log Table */}
          <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wide">
                Recorded Waste Entries
              </h2>
              <select
                className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-300"
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
              >
                {[7, 14, 30, 90].map((d) => (
                  <option key={d} value={d}>
                    Last {d} days
                  </option>
                ))}
              </select>
            </div>

            {isLoading ? (
              <p className="text-zinc-500 text-sm">Loading logs…</p>
            ) : logs.length === 0 ? (
              <p className="text-zinc-500 text-sm">No waste logs recorded in this period.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-zinc-500 text-xs uppercase border-b border-zinc-800">
                      <th className="text-left pb-2">Date</th>
                      <th className="text-left pb-2">Ingredient</th>
                      <th className="text-left pb-2">Reason</th>
                      <th className="text-right pb-2">Weight</th>
                      <th className="text-right pb-2">Loss Cost</th>
                      <th className="text-right pb-2">Supplier Claim</th>
                      <th className="w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/80">
                    {logs.map((l) => (
                      <tr key={l.id} className="hover:bg-zinc-800/40">
                        <td className="py-2.5 font-mono text-zinc-300">{l.log_date}</td>
                        <td className="py-2.5 font-medium text-zinc-100">{l.ingredient}</td>
                        <td className="py-2.5 text-zinc-400 capitalize">{l.reason}</td>
                        <td className="py-2.5 text-right font-mono text-zinc-300">
                          {l.quantity_grams.toFixed(0)}g
                        </td>
                        <td className="py-2.5 text-right font-mono font-semibold text-red-400">
                          {fmt(l.quantity_grams * l.cost_per_gram)}
                        </td>
                        <td className="py-2.5 text-right">
                          <button
                            type="button"
                            onClick={() => handleOpenClaimForLog(l)}
                            className="min-h-[36px] px-3 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30 text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                          >
                            <FileText size={12} />
                            Request Credit
                          </button>
                        </td>
                        <td className="py-2.5 text-right">
                          <Button
                            onClick={() => deleteLog.mutate(l.id)}
                            variant="ghost"
                            size="icon"
                            aria-label="Delete waste log"
                            className="min-h-[44px] min-w-[44px] text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}

      {/* ─── TAB 2: Supplier Credit Claims ─── */}
      {activeTab === 'claims' && (
        <div className="space-y-6">
          <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-zinc-300 mb-4 uppercase tracking-wide">
              Active Supplier Credit Memo Claims
            </h2>

            {savedClaims.length === 0 ? (
              <p className="text-zinc-500 text-sm">No credit memos generated yet.</p>
            ) : (
              <div className="space-y-3">
                {savedClaims.map((claim) => (
                  <div
                    key={claim.id}
                    className="p-4 bg-zinc-950 rounded-xl border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-amber-400">{claim.memoNumber}</span>
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          {claim.status}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-zinc-200 mt-1">
                        {claim.vendorName} ·{' '}
                        <span className="text-zinc-400 font-normal">
                          Inv: {claim.invoiceReference || 'N/A'} (PO: {claim.poReference || 'N/A'})
                        </span>
                      </p>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        Claimed Date: {claim.generatedDate} · Items: {claim.items.map((i) => i.ingredient).join(', ')}
                      </p>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="text-xs text-zinc-500 block">Requested Credit</span>
                        <span className="text-xl font-bold font-mono text-emerald-400">
                          {fmt(claim.totalCreditDollars)}
                        </span>
                      </div>

                      <Button
                        onClick={() => {
                          setGeneratedMemo(claim);
                          setShowMemoModal(true);
                        }}
                        variant="outline"
                        size="sm"
                        className="min-h-[40px] border-zinc-700 text-zinc-300 hover:text-white"
                      >
                        View Claim Letter
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* ─── MODAL: Supplier Credit Memo Preview ─── */}
      {showMemoModal && generatedMemo && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-zinc-100">
                  Supplier Credit Memo: {generatedMemo.memoNumber}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowMemoModal(false)}
                className="w-8 h-8 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center"
              >
                <X size={16} />
              </button>
            </div>

            {/* Editable Purveyor Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-zinc-950 p-4 rounded-xl border border-zinc-800/80">
              <div>
                <label className="text-xs text-zinc-400 font-semibold block mb-1">Purveyor</label>
                <select
                  className={inputCls}
                  value={selectedPurveyor}
                  onChange={(e) => {
                    setSelectedPurveyor(e.target.value);
                    const match = PURVEYORS.find((p) => p.name === e.target.value);
                    if (match) setVendorEmail(match.email);
                    handleGenerateNewMemo();
                  }}
                >
                  {PURVEYORS.map((p) => (
                    <option key={p.name} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-zinc-400 font-semibold block mb-1">Claims Email</label>
                <input
                  className={inputCls}
                  value={vendorEmail}
                  onChange={(e) => setVendorEmail(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs text-zinc-400 font-semibold block mb-1">Invoice Reference</label>
                <input
                  className={inputCls}
                  value={invoiceRef}
                  onChange={(e) => setInvoiceRef(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs text-zinc-400 font-semibold block mb-1">PO Reference</label>
                <input
                  className={inputCls}
                  value={poRef}
                  onChange={(e) => setPoRef(e.target.value)}
                />
              </div>
            </div>

            {/* Claimed Items */}
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block">
                Defective Items Claimed:
              </span>
              <div className="space-y-2">
                {generatedMemo.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 text-xs flex justify-between items-center"
                  >
                    <div>
                      <span className="font-bold text-zinc-200">{item.ingredient}</span>
                      <span className="text-zinc-500 block">{item.reason}</span>
                    </div>
                    <span className="font-mono font-bold text-emerald-400 text-sm">
                      {fmt(item.totalCostDollars)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Claim Letter Text */}
            <div className="space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block">
                Formatted Claim Dispatch Text:
              </span>
              <textarea
                readOnly
                value={generatedMemo.requestText}
                className="w-full h-36 bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-xs font-mono text-zinc-300 resize-none focus:outline-none"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleCopyClaimText}
                  variant="outline"
                  size="sm"
                  className="min-h-[40px] border-zinc-700 text-zinc-300 hover:text-white gap-1.5"
                >
                  {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  {copied ? 'Copied' : 'Copy Text'}
                </Button>
                <Button
                  onClick={handleDownloadCsv}
                  variant="outline"
                  size="sm"
                  className="min-h-[40px] border-zinc-700 text-zinc-300 hover:text-white gap-1.5"
                >
                  <Download size={14} /> Download AP CSV
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setShowMemoModal(false)}
                  variant="ghost"
                  className="min-h-[40px] text-zinc-400 hover:text-white"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveClaim}
                  variant="ghost"
                  className="min-h-[40px] bg-emerald-600 hover:bg-emerald-500 text-white font-semibold gap-1.5"
                >
                  <CheckCircle2 size={15} /> Save Claim
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
