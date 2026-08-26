import { useState } from 'react';
import { Clock, Plus, Trash2, AlertTriangle, AlertCircle, CheckCircle2 } from 'lucide-react';
import {
  useInventoryBatches,
  useWasteLogs,
  useAddInventoryBatch,
  useDeleteInventoryBatch,
  useLogWaste
} from '../hooks/useShelfLife';

export default function ShelfLifePage() {
  const { data: batches = [], isLoading: loadingBatches } = useInventoryBatches();
  const { data: wasteLogs = [] } = useWasteLogs();

  const addBatchMutation = useAddInventoryBatch();
  const deleteBatchMutation = useDeleteInventoryBatch();
  const logWasteMutation = useLogWaste();

  // Modal states
  const [showAddBatch, setShowAddBatch] = useState(false);
  const [showLogWaste, setShowLogWaste] = useState(false);

  // Batch Form
  const [ingName, setIngName] = useState('');
  const [qty, setQty] = useState('');
  const [unit, setUnit] = useState('g');
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().split('T')[0]);
  const [expDate, setExpDate] = useState('');
  const [location, setLocation] = useState('Walk-in Cooler');

  // Waste Form
  const [wasteIng, setWasteIng] = useState('');
  const [wasteQty, setWasteQty] = useState('');
  const [wasteUnit, setWasteUnit] = useState('g');
  const [reason, setReason] = useState('Expired');
  const [cost, setCost] = useState('');

  const handleAddBatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ingName.trim() || !qty || !expDate) return;
    addBatchMutation.mutate(
      {
        ingredient_name: ingName,
        quantity: Number(qty),
        unit,
        received_date: receivedDate,
        expiration_date: expDate,
        storage_location: location,
      },
      {
        onSuccess: () => {
          setIngName('');
          setQty('');
          setExpDate('');
          setShowAddBatch(false);
        },
      }
    );
  };

  const handleLogWaste = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wasteIng.trim() || !wasteQty) return;
    logWasteMutation.mutate(
      {
        ingredient_name: wasteIng,
        quantity: Number(wasteQty),
        unit: wasteUnit,
        reason,
        cost: cost ? Number(cost) : 0,
      },
      {
        onSuccess: () => {
          setWasteIng('');
          setWasteQty('');
          setCost('');
          setShowLogWaste(false);
        },
      }
    );
  };

  const getExpirationBadge = (expirationDateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exp = new Date(expirationDateStr);
    exp.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 3600 * 24));

    if (diffDays < 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
          <AlertCircle className="w-3 h-3" /> Expired ({Math.abs(diffDays)}d ago)
        </span>
      );
    }
    if (diffDays <= 3) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <AlertTriangle className="w-3 h-3" /> Use Soon ({diffDays}d left)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
        <CheckCircle2 className="w-3 h-3" /> Fresh ({diffDays}d left)
      </span>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
            <Clock className="w-6 h-6 text-amber-500" />
            Shelf Life & Expiration Tracker
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            FIFO batch management, expiration alerts, and kitchen waste logging.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowLogWaste(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-zinc-200 bg-zinc-800 border border-zinc-700 rounded-lg hover:bg-zinc-700 transition"
          >
            <AlertTriangle className="w-4 h-4 text-red-400" />
            Log Spoilage / Waste
          </button>
          <button
            onClick={() => setShowAddBatch(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-zinc-950 bg-amber-500 rounded-lg hover:bg-amber-400 transition"
          >
            <Plus className="w-4 h-4" />
            Receive New Batch
          </button>
        </div>
      </div>

      {/* Batches Table */}
      <div className="border border-zinc-800 rounded-xl bg-zinc-900/40 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
          Active Batches in Storage ({batches.length})
        </h2>

        {loadingBatches ? (
          <div className="py-8 text-center text-zinc-500 text-sm">Loading inventory batches...</div>
        ) : batches.length === 0 ? (
          <div className="py-12 text-center text-zinc-500 text-sm">
            No active batches recorded. Receive a new batch to track shelf life.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-300">
              <thead className="text-xs text-zinc-400 uppercase bg-zinc-950/60 border-b border-zinc-800">
                <tr>
                  <th className="py-3 px-4">Ingredient</th>
                  <th className="py-3 px-4">Batch Qty</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Received</th>
                  <th className="py-3 px-4">Expiration</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {batches.map((batch) => (
                  <tr key={batch.id} className="hover:bg-zinc-800/30">
                    <td className="py-3 px-4 font-semibold text-zinc-100">{batch.ingredient_name}</td>
                    <td className="py-3 px-4 text-amber-400 font-medium">
                      {batch.quantity} {batch.unit}
                    </td>
                    <td className="py-3 px-4 text-zinc-400">{batch.storage_location}</td>
                    <td className="py-3 px-4 text-zinc-400">{batch.received_date}</td>
                    <td className="py-3 px-4 font-mono text-zinc-200">{batch.expiration_date}</td>
                    <td className="py-3 px-4">{getExpirationBadge(batch.expiration_date)}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => deleteBatchMutation.mutate(batch.id)}
                        className="text-zinc-500 hover:text-red-400 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Waste Logs Table */}
      <div className="border border-zinc-800 rounded-xl bg-zinc-900/40 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
          Recent Spoilage & Waste Log ({wasteLogs.length})
        </h2>

        {wasteLogs.length === 0 ? (
          <div className="py-8 text-center text-zinc-500 text-sm">No waste logged recently.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-300">
              <thead className="text-xs text-zinc-400 uppercase bg-zinc-950/60 border-b border-zinc-800">
                <tr>
                  <th className="py-3 px-4">Ingredient</th>
                  <th className="py-3 px-4">Wasted Amount</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4">Estimated Cost</th>
                  <th className="py-3 px-4">Logged At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {wasteLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-zinc-800/30">
                    <td className="py-3 px-4 font-medium text-zinc-200">{log.ingredient_name}</td>
                    <td className="py-3 px-4 text-red-400 font-medium">
                      {log.quantity} {log.unit}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 text-xs rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                        {log.reason}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-zinc-400 font-mono">${log.cost?.toFixed(2) || '0.00'}</td>
                    <td className="py-3 px-4 text-zinc-500 text-xs">
                      {new Date(log.logged_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Batch Modal */}
      {showAddBatch && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 space-y-4">
            <h2 className="text-lg font-bold text-zinc-100">Receive New Inventory Batch</h2>
            <form onSubmit={handleAddBatch} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-zinc-400">Ingredient Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Heavy Cream"
                  value={ingName}
                  onChange={(e) => setIngName(e.target.value)}
                  className="w-full mt-1 bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-zinc-400">Quantity</label>
                  <input
                    type="number"
                    required
                    placeholder="5000"
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                    className="w-full mt-1 bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-400">Unit</label>
                  <input
                    type="text"
                    required
                    placeholder="ml"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full mt-1 bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-zinc-400">Received Date</label>
                  <input
                    type="date"
                    required
                    value={receivedDate}
                    onChange={(e) => setReceivedDate(e.target.value)}
                    className="w-full mt-1 bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-400">Expiration Date</label>
                  <input
                    type="date"
                    required
                    value={expDate}
                    onChange={(e) => setExpDate(e.target.value)}
                    className="w-full mt-1 bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-400">Storage Location</label>
                <select
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full mt-1 bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none"
                >
                  <option value="Walk-in Cooler">Walk-in Cooler</option>
                  <option value="Freezer">Freezer</option>
                  <option value="Dry Storage">Dry Storage</option>
                  <option value="Pastry Line">Pastry Line</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowAddBatch(false)}
                  className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addBatchMutation.isPending}
                  className="px-4 py-2 text-sm font-semibold text-zinc-950 bg-amber-500 rounded-lg hover:bg-amber-400 transition"
                >
                  Save Batch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Log Waste Modal */}
      {showLogWaste && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 space-y-4">
            <h2 className="text-lg font-bold text-zinc-100">Log Kitchen Spoilage / Waste</h2>
            <form onSubmit={handleLogWaste} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-zinc-400">Ingredient Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sourdough Starter"
                  value={wasteIng}
                  onChange={(e) => setWasteIng(e.target.value)}
                  className="w-full mt-1 bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-zinc-400">Wasted Qty</label>
                  <input
                    type="number"
                    required
                    placeholder="300"
                    value={wasteQty}
                    onChange={(e) => setWasteQty(e.target.value)}
                    className="w-full mt-1 bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-400">Unit</label>
                  <input
                    type="text"
                    required
                    placeholder="g"
                    value={wasteUnit}
                    onChange={(e) => setWasteUnit(e.target.value)}
                    className="w-full mt-1 bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-400">Reason</label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full mt-1 bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none"
                >
                  <option value="Expired">Expired</option>
                  <option value="Quality Control">Quality Control</option>
                  <option value="Trim Loss">Trim Loss</option>
                  <option value="Spoilage">Spoilage</option>
                  <option value="Prep Error">Prep Error</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-400">Estimated Cost ($)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="12.50"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  className="w-full mt-1 bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm text-zinc-100 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowLogWaste(false)}
                  className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={logWasteMutation.isPending}
                  className="px-4 py-2 text-sm font-semibold text-zinc-950 bg-amber-500 rounded-lg hover:bg-amber-400 transition"
                >
                  Record Waste
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
