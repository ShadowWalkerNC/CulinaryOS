import { useState } from 'react';
import {
  TrendingUp,
  AlertTriangle,
  Flame,
  Trash2,
  DollarSign,
  Plus,
  RefreshCw,
  Layers,
  ChevronRight,
  ShieldAlert,
  CheckCircle2,
} from 'lucide-react';
import {
  useMenuItems,
  useAddMenuItem,
  useDeleteMenuItem,
  useFoodCostVariance,
  useQuickLogWaste,
  type Ingredient,
} from '../hooks/useFoodCost';
import { costRecipe } from '@culinaryos/food-cost-engine';

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

export default function FoodCostPage() {
  const { data: items = [], isLoading: loadingItems } = useMenuItems();
  const { data: varianceData, isLoading: loadingVariance, refetch: refetchVariance } = useFoodCostVariance();
  const addItem = useAddMenuItem();
  const deleteItem = useDeleteMenuItem();
  const quickLogWaste = useQuickLogWaste();

  const [activeTab, setActiveTab] = useState<'variance' | 'recipes' | 'add'>('variance');

  // Quick Waste Modal state
  const [showWasteModal, setShowWasteModal] = useState(false);
  const [wasteItemName, setWasteItemName] = useState('');
  const [wasteQty, setWasteQty] = useState('1');
  const [wasteUnit, setWasteUnit] = useState('portion');
  const [wasteReason, setWasteReason] = useState<'dropped' | 'burned' | 'spoiled' | 'overportion' | 'void_cooked'>('dropped');
  const [wasteNotes, setWasteNotes] = useState('');

  // Add Menu Item Form state
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [ings, setIngs] = useState([{ name: '', quantity: '', unit: '', cost_per_unit: '' }]);

  function addIngRow() {
    setIngs((prev) => [...prev, { name: '', quantity: '', unit: '', cost_per_unit: '' }]);
  }

  function updateIng(i: number, field: string, val: string) {
    setIngs((prev) => prev.map((row, idx) => (idx === i ? { ...row, [field]: val } : row)));
  }

  function handleSubmitRecipe(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !price) return;
    const ingredients: Omit<Ingredient, 'id' | 'menu_item_id'>[] = ings
      .filter((r) => r.name && r.quantity && r.unit && r.cost_per_unit)
      .map((r) => ({
        name: r.name,
        quantity: parseFloat(r.quantity),
        unit: r.unit,
        cost_per_unit: parseFloat(r.cost_per_unit),
      }));
    addItem.mutate({ item: { name, menu_price: parseFloat(price), category: category || null }, ingredients });
    setName('');
    setPrice('');
    setCategory('');
    setIngs([{ name: '', quantity: '', unit: '', cost_per_unit: '' }]);
    setActiveTab('recipes');
  }

  function handleQuickWasteSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!wasteItemName) return;
    quickLogWaste.mutate({
      itemName: wasteItemName,
      ingredient: wasteItemName,
      quantity: Number(wasteQty) || 1,
      unit: wasteUnit,
      reason: wasteReason,
      notes: wasteNotes || undefined,
    }, {
      onSuccess: () => {
        setShowWasteModal(false);
        setWasteItemName('');
        setWasteQty('1');
        setWasteNotes('');
        refetchVariance();
      },
    });
  }

  const inputCls =
    'bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 w-full focus:outline-none focus:border-amber-500';
  const btnCls =
    'bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-sm px-4 py-2 rounded-lg transition-colors';

  const vReport = varianceData || {
    totalTheoreticalCost: 0,
    totalActualCost: 0,
    totalWasteCost: 0,
    totalVarianceCost: 0,
    overallVariancePct: 0,
    totalUnexplainedCost: 0,
    unexplainedVariancePct: 0,
    overallStatus: 'ok',
    ingredients: [],
    topOffenders: [],
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-amber-500" />
            Food Cost & Actual-vs-Theoretical Variance
          </h1>
          <p className="text-zinc-400 text-sm mt-0.5">
            Real-time recipe BOM theoretical usage vs actual inventory depletion & waste loss.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowWasteModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-500 rounded-xl transition shadow-xs"
          >
            <Trash2 className="w-4 h-4" />
            1-Tap Log Scrap
          </button>
          <button
            onClick={() => refetchVariance()}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-zinc-300 bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 rounded-xl transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 border-b border-zinc-800 pb-3">
        <button
          onClick={() => setActiveTab('variance')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'variance'
              ? 'bg-amber-500 text-zinc-950 shadow-xs'
              : 'text-zinc-400 hover:text-zinc-200 bg-zinc-900 border border-zinc-800'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          Actual vs Theoretical Variance
        </button>
        <button
          onClick={() => setActiveTab('recipes')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'recipes'
              ? 'bg-amber-500 text-zinc-950 shadow-xs'
              : 'text-zinc-400 hover:text-zinc-200 bg-zinc-900 border border-zinc-800'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          Menu Recipe Costing ({items.length})
        </button>
        <button
          onClick={() => setActiveTab('add')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'add'
              ? 'bg-amber-500 text-zinc-950 shadow-xs'
              : 'text-zinc-400 hover:text-zinc-200 bg-zinc-900 border border-zinc-800'
          }`}
        >
          <Plus className="w-3.5 h-3.5" />
          Add Menu Item & BOM
        </button>
      </div>

      {/* ── ACTUAL VS THEORETICAL VARIANCE VIEW ── */}
      {activeTab === 'variance' && (
        <div className="space-y-6">
          {/* Executive KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                Theoretical Cost
              </span>
              <div className="text-xl font-black text-zinc-100 mt-1 font-mono">
                {fmt(vReport.totalTheoreticalCost)}
              </div>
              <p className="text-[10px] text-zinc-500 mt-0.5">Based on POS recipe sales</p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                Actual Depletion
              </span>
              <div className="text-xl font-black text-zinc-100 mt-1 font-mono">
                {fmt(vReport.totalActualCost)}
              </div>
              <p className="text-[10px] text-zinc-500 mt-0.5">Inventory stock consumed</p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                Recorded Waste Loss
              </span>
              <div className="text-xl font-black text-red-400 mt-1 font-mono">
                {fmt(vReport.totalWasteCost)}
              </div>
              <p className="text-[10px] text-zinc-500 mt-0.5">Logged scraps & drops</p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                Net Cost Variance
              </span>
              <div className={`text-xl font-black mt-1 font-mono ${
                vReport.totalVarianceCost > 0 ? 'text-amber-400' : 'text-emerald-400'
              }`}>
                {vReport.totalVarianceCost > 0 ? '+' : ''}{fmt(vReport.totalVarianceCost)}
                <span className="text-xs font-normal ml-1">({vReport.overallVariancePct}%)</span>
              </div>
              <p className="text-[10px] text-zinc-500 mt-0.5">Actual vs Theoretical gap</p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                Unexplained Loss
              </span>
              <div className={`text-xl font-black mt-1 font-mono ${
                vReport.totalUnexplainedCost > 0 ? 'text-red-500' : 'text-emerald-400'
              }`}>
                {fmt(vReport.totalUnexplainedCost)}
              </div>
              <p className="text-[10px] text-zinc-500 mt-0.5">Overportion & untracked</p>
            </div>
          </div>

          {/* High Variance Alert Banner */}
          {vReport.topOffenders && vReport.topOffenders.length > 0 && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-xs font-bold text-red-300 uppercase tracking-wider">
                  High Food Cost Variance Detected ({vReport.topOffenders.length} items exceeding threshold)
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  The following ingredients showed the highest variance loss. Check portion sizes, prep trim, and line spoilage:
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {vReport.topOffenders.map((off: any, idx: number) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg bg-red-950/60 border border-red-800/60 text-red-200 text-xs font-semibold flex items-center gap-1.5"
                    >
                      <span>{off.ingredientName}</span>
                      <span className="font-mono text-red-400 font-bold">+{fmt(off.varianceCost)} ({off.variancePct}%)</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Detailed Ingredient Variance Table */}
          <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-wide">
                  Ingredient Variance & Loss Ledger
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Calculated from POS checks, recipe portions, inventory cycle counts, and scrap logs.
                </p>
              </div>
            </div>

            {loadingVariance ? (
              <p className="text-zinc-500 text-sm py-8 text-center">Calculating variance metrics…</p>
            ) : vReport.ingredients.length === 0 ? (
              <p className="text-zinc-500 text-sm py-8 text-center">No variance data recorded yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-zinc-300">
                  <thead className="text-xs text-zinc-400 uppercase bg-zinc-950/60 border-b border-zinc-800">
                    <tr>
                      <th className="py-3 px-3">Ingredient</th>
                      <th className="py-3 px-3 text-right">Unit Cost</th>
                      <th className="py-3 px-3 text-right">Theo Qty</th>
                      <th className="py-3 px-3 text-right">Actual Qty</th>
                      <th className="py-3 px-3 text-right">Waste Qty</th>
                      <th className="py-3 px-3 text-right">Theo Cost</th>
                      <th className="py-3 px-3 text-right">Actual Cost</th>
                      <th className="py-3 px-3 text-right">Variance $</th>
                      <th className="py-3 px-3 text-right">Variance %</th>
                      <th className="py-3 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800 font-mono text-xs">
                    {vReport.ingredients.map((ing: any, i: number) => {
                      const statusColor =
                        ing.status === 'alert'
                          ? 'bg-red-500/10 text-red-400 border-red-500/20'
                          : ing.status === 'warn'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';

                      return (
                        <tr key={i} className="hover:bg-zinc-800/30">
                          <td className="py-3 px-3 font-sans font-semibold text-zinc-100">
                            {ing.ingredientName}
                          </td>
                          <td className="py-3 px-3 text-right text-zinc-400">${ing.unitCost.toFixed(3)}</td>
                          <td className="py-3 px-3 text-right text-zinc-300">
                            {ing.theoreticalQuantity} {ing.unit}
                          </td>
                          <td className="py-3 px-3 text-right text-zinc-100 font-bold">
                            {ing.actualQuantity} {ing.unit}
                          </td>
                          <td className="py-3 px-3 text-right text-red-400">
                            {ing.wasteQuantity} {ing.unit}
                          </td>
                          <td className="py-3 px-3 text-right text-zinc-400">{fmt(ing.theoreticalCost)}</td>
                          <td className="py-3 px-3 text-right text-zinc-200">{fmt(ing.actualCost)}</td>
                          <td className={`py-3 px-3 text-right font-bold ${
                            ing.varianceCost > 0 ? 'text-amber-400' : 'text-emerald-400'
                          }`}>
                            {ing.varianceCost > 0 ? '+' : ''}{fmt(ing.varianceCost)}
                          </td>
                          <td className={`py-3 px-3 text-right font-bold ${
                            ing.variancePct > 5 ? 'text-red-400' : ing.variancePct > 2 ? 'text-amber-400' : 'text-emerald-400'
                          }`}>
                            {ing.variancePct > 0 ? '+' : ''}{ing.variancePct}%
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase ${statusColor}`}>
                              {ing.status.toUpperCase()}
                            </span>
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

      {/* ── MENU RECIPE COSTING VIEW ── */}
      {activeTab === 'recipes' && (
        <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-wide">
                Menu Recipes & Theoretical Food Cost
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Target food cost percentage benchmark: 28% - 32%.
              </p>
            </div>
          </div>

          {loadingItems ? (
            <p className="text-zinc-500 text-sm py-8 text-center">Loading recipes…</p>
          ) : items.length === 0 ? (
            <p className="text-zinc-500 text-sm py-8 text-center">No menu items configured yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-zinc-500 text-xs uppercase border-b border-zinc-800">
                  <th className="text-left pb-2">Item</th>
                  <th className="text-left pb-2">Category</th>
                  <th className="text-right pb-2">Menu $</th>
                  <th className="text-right pb-2">Theoretical Recipe Cost</th>
                  <th className="text-right pb-2">Target FC %</th>
                  <th className="text-right pb-2">Profit Margin</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const ingredients = (item.menu_item_ingredients ?? []).map((i) => ({
                    name: i.name,
                    quantity: i.quantity,
                    unit: i.unit,
                    costPerUnit: i.cost_per_unit,
                  }));
                  const costed = costRecipe(ingredients, 1, item.menu_price);
                  const pct = costed.foodCostPct;
                  const margin = item.menu_price - costed.totalCost;

                  const color = pct > 35 ? 'text-red-400' : pct > 28 ? 'text-amber-400' : 'text-green-400';
                  return (
                    <tr key={item.id} className="border-b border-zinc-800 hover:bg-zinc-800/40">
                      <td className="py-2.5 font-semibold text-zinc-100">{item.name}</td>
                      <td className="py-2.5 text-zinc-500">{item.category ?? '—'}</td>
                      <td className="py-2.5 text-right font-mono">{fmt(item.menu_price)}</td>
                      <td className="py-2.5 text-right font-mono text-zinc-300">{fmt(costed.totalCost)}</td>
                      <td className={`py-2.5 text-right font-bold font-mono ${color}`}>{pct.toFixed(1)}%</td>
                      <td className="py-2.5 text-right font-mono text-zinc-300">{fmt(margin)}</td>
                      <td className="py-2.5 text-right">
                        <button
                          onClick={() => deleteItem.mutate(item.id)}
                          className="text-zinc-600 hover:text-red-400 text-xs ml-4"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>
      )}

      {/* ── ADD MENU ITEM & BOM VIEW ── */}
      {activeTab === 'add' && (
        <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-zinc-200 mb-4 uppercase tracking-wide">
            Add New Menu Item with Ingredient BOM
          </h2>
          <form onSubmit={handleSubmitRecipe} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-zinc-400 mb-1 block">Item Name</label>
                <input
                  className={inputCls}
                  placeholder="e.g. Wagyu Ribeye"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-400 mb-1 block">Menu Price ($)</label>
                <input
                  className={inputCls}
                  type="number"
                  step="0.01"
                  placeholder="38.00"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-400 mb-1 block">Category</label>
                <input
                  className={inputCls}
                  placeholder="e.g. Entrees"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                />
              </div>
            </div>

            <div className="pt-2">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                Recipe Ingredients (BOM)
              </p>
              <div className="space-y-2">
                {ings.map((row, i) => (
                  <div key={i} className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <input
                      className={inputCls}
                      placeholder="Ingredient name"
                      value={row.name}
                      onChange={(e) => updateIng(i, 'name', e.target.value)}
                    />
                    <input
                      className={inputCls}
                      type="number"
                      step="any"
                      placeholder="Qty"
                      value={row.quantity}
                      onChange={(e) => updateIng(i, 'quantity', e.target.value)}
                    />
                    <input
                      className={inputCls}
                      placeholder="Unit (g, oz, portion)"
                      value={row.unit}
                      onChange={(e) => updateIng(i, 'unit', e.target.value)}
                    />
                    <input
                      className={inputCls}
                      type="number"
                      step="0.001"
                      placeholder="Cost/unit ($)"
                      value={row.cost_per_unit}
                      onChange={(e) => updateIng(i, 'cost_per_unit', e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 pt-3">
              <button
                type="button"
                onClick={addIngRow}
                className="text-xs text-amber-400 hover:text-amber-300 font-semibold"
              >
                + Add Ingredient Row
              </button>
              <div className="flex-1" />
              <button type="submit" className={btnCls} disabled={addItem.isPending}>
                {addItem.isPending ? 'Saving…' : 'Save Menu Item'}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* ── 1-CLICK QUICK SCRAP / WASTE MODAL ── */}
      {showWasteModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-red-500" />
                <h3 className="text-base font-bold text-zinc-100">1-Tap Kitchen Waste Logging</h3>
              </div>
              <button
                onClick={() => setShowWasteModal(false)}
                className="text-zinc-500 hover:text-zinc-300 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleQuickWasteSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-zinc-400">Ingredient / Dish</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Prime Ribeye or Burger Patty"
                  value={wasteItemName}
                  onChange={(e) => setWasteItemName(e.target.value)}
                  className="w-full mt-1 bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm text-zinc-100 focus:border-red-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-400">Quantity</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={wasteQty}
                    onChange={(e) => setWasteQty(e.target.value)}
                    className="w-full mt-1 bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm text-zinc-100 focus:border-red-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-400">Unit</label>
                  <select
                    value={wasteUnit}
                    onChange={(e) => setWasteUnit(e.target.value)}
                    className="w-full mt-1 bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm text-zinc-100 focus:border-red-500 focus:outline-none"
                  >
                    <option value="portion">Portion</option>
                    <option value="g">Grams (g)</option>
                    <option value="oz">Ounces (oz)</option>
                    <option value="units">Units / Pieces</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-400">Scrap Reason</label>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  {[
                    { id: 'dropped', label: 'Dropped' },
                    { id: 'burned', label: 'Overcooked' },
                    { id: 'spoiled', label: 'Spoiled' },
                    { id: 'overportion', label: 'Overportion' },
                    { id: 'void_cooked', label: 'Void Cooked' },
                  ].map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setWasteReason(r.id as any)}
                      className={`p-2 rounded-lg text-xs font-bold border transition ${
                        wasteReason === r.id
                          ? 'bg-red-600 border-red-500 text-white'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-400">Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Line drop during dinner rush"
                  value={wasteNotes}
                  onChange={(e) => setWasteNotes(e.target.value)}
                  className="w-full mt-1 bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-sm text-zinc-100 focus:border-red-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowWasteModal(false)}
                  className="w-1/2 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={quickLogWaste.isPending}
                  className="w-1/2 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg text-xs transition"
                >
                  {quickLogWaste.isPending ? 'Logging…' : 'Record Waste'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
