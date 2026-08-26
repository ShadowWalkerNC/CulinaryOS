import { useState } from 'react';
import { useMenuItems, useAddMenuItem, useDeleteMenuItem } from '../hooks/useFoodCost';
import { costRecipe } from '@culinaryos/food-cost-engine';
import type { Ingredient } from '../hooks/useFoodCost';

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

export default function FoodCostPage() {
  const { data: items = [], isLoading } = useMenuItems();
  const addItem = useAddMenuItem();
  const deleteItem = useDeleteMenuItem();

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [ings, setIngs] = useState([{ name: '', quantity: '', unit: '', cost_per_unit: '' }]);

  function addIngRow() {
    setIngs(prev => [...prev, { name: '', quantity: '', unit: '', cost_per_unit: '' }]);
  }

  function updateIng(i: number, field: string, val: string) {
    setIngs(prev => prev.map((row, idx) => idx === i ? { ...row, [field]: val } : row));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !price) return;
    const ingredients: Omit<Ingredient, 'id' | 'menu_item_id'>[] = ings
      .filter(r => r.name && r.quantity && r.unit && r.cost_per_unit)
      .map(r => ({
        name: r.name,
        quantity: parseFloat(r.quantity),
        unit: r.unit,
        cost_per_unit: parseFloat(r.cost_per_unit),
      }));
    addItem.mutate({ item: { name, menu_price: parseFloat(price), category: category || null }, ingredients });
    setName(''); setPrice(''); setCategory('');
    setIngs([{ name: '', quantity: '', unit: '', cost_per_unit: '' }]);
  }

  const inputCls = 'bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 w-full focus:outline-none focus:border-amber-500';
  const btnCls = 'bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-sm px-4 py-2 rounded-lg transition-colors';

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-1">Food Cost</h1>
        <p className="text-zinc-400 text-sm">Recipe costing · Actual vs. theoretical variance</p>
      </div>

      {/* Add Menu Item */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-zinc-300 mb-4 uppercase tracking-wide">Add Menu Item</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input className={inputCls} placeholder="Item name" value={name} onChange={e => setName(e.target.value)} />
            <input className={inputCls} type="number" placeholder="Menu price ($)" value={price} onChange={e => setPrice(e.target.value)} />
            <input className={inputCls} placeholder="Category (optional)" value={category} onChange={e => setCategory(e.target.value)} />
          </div>
          <p className="text-xs text-zinc-500 uppercase tracking-wide mt-2">Ingredients</p>
          {ings.map((row, i) => (
            <div key={i} className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <input className={inputCls} placeholder="Ingredient" value={row.name} onChange={e => updateIng(i, 'name', e.target.value)} />
              <input className={inputCls} type="number" placeholder="Qty" value={row.quantity} onChange={e => updateIng(i, 'quantity', e.target.value)} />
              <input className={inputCls} placeholder="Unit" value={row.unit} onChange={e => updateIng(i, 'unit', e.target.value)} />
              <input className={inputCls} type="number" placeholder="Cost/unit ($)" value={row.cost_per_unit} onChange={e => updateIng(i, 'cost_per_unit', e.target.value)} />
            </div>
          ))}
          <div className="flex gap-3">
            <button type="button" onClick={addIngRow} className="text-xs text-amber-400 hover:text-amber-300">+ ingredient</button>
            <button type="submit" className={btnCls} disabled={addItem.isPending}>
              {addItem.isPending ? 'Saving…' : 'Save Item'}
            </button>
          </div>
        </form>
      </section>

      {/* Menu Items Table */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-zinc-300 mb-4 uppercase tracking-wide">Active Menu Items</h2>
        {isLoading ? (
          <p className="text-zinc-500 text-sm">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-zinc-500 text-sm">No menu items yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-zinc-500 text-xs uppercase border-b border-zinc-800">
                <th className="text-left pb-2">Item</th>
                <th className="text-left pb-2">Category</th>
                <th className="text-right pb-2">Menu $</th>
                <th className="text-right pb-2">Recipe Cost</th>
                <th className="text-right pb-2">FC %</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => {
                const ings = (item.menu_item_ingredients ?? []).map(i => ({
                  name: i.name,
                  quantity: i.quantity,
                  unit: i.unit,
                  costPerUnit: i.cost_per_unit,
                }));
                const costed = costRecipe(ings, 1, item.menu_price);
                const pct = costed.foodCostPct;


                const color = pct > 35 ? 'text-red-400' : pct > 28 ? 'text-amber-400' : 'text-green-400';
                return (
                  <tr key={item.id} className="border-b border-zinc-800 hover:bg-zinc-800/40">
                    <td className="py-2">{item.name}</td>
                    <td className="py-2 text-zinc-500">{item.category ?? '—'}</td>
                    <td className="py-2 text-right">{fmt(item.menu_price)}</td>
                    <td className="py-2 text-right">{fmt(costed.totalCost)}</td>
                    <td className={`py-2 text-right font-semibold ${color}`}>{pct.toFixed(1)}%</td>
                    <td className="py-2 text-right">
                      <button onClick={() => deleteItem.mutate(item.id)} className="text-zinc-600 hover:text-red-400 text-xs ml-4">✕</button>
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
