'use client';

import { useState } from 'react';
import { usePantryItems, useAddPantryItem, useDeletePantryItem } from '@/lib/queries/pantry';

export default function PantryPage() {
  const { data: items, isLoading, error } = usePantryItems();
  const addItem = useAddPantryItem();
  const deleteItem = useDeletePantryItem();

  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('');
  const [adding, setAdding] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !quantity) return;
    await addItem.mutateAsync({ name_override: name, quantity: parseFloat(quantity), unit });
    setName(''); setQuantity(''); setUnit('');
    setAdding(false);
  }

  if (isLoading) return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Pantry</h1>
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => <div key={i} className="h-14 rounded-lg bg-gray-100 animate-pulse" />)}
      </div>
    </div>
  );

  if (error) return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Pantry</h1>
      <p className="text-red-500">Failed to load pantry. Please refresh.</p>
    </div>
  );

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Pantry</h1>
        <button
          onClick={() => setAdding(!adding)}
          className="rounded-lg bg-black text-white text-sm px-4 py-2"
        >
          + Add Item
        </button>
      </div>

      {adding && (
        <form onSubmit={handleAdd} className="mb-6 flex gap-2 flex-wrap">
          <input
            placeholder="Item name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="flex-1 min-w-[160px] rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            placeholder="Qty"
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
            className="w-20 rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            placeholder="Unit"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <button type="submit" disabled={addItem.isPending} className="rounded-lg bg-black text-white text-sm px-4 py-2 disabled:opacity-50">
            {addItem.isPending ? 'Saving...' : 'Save'}
          </button>
          <button type="button" onClick={() => setAdding(false)} className="text-sm text-gray-400 underline">
            Cancel
          </button>
        </form>
      )}

      {!items || items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="text-5xl mb-4">🥫</div>
          <h2 className="text-lg font-semibold">Pantry is empty</h2>
          <p className="mt-2 text-sm text-gray-500">Add ingredients to track your stock.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id} className={`flex items-center justify-between rounded-lg border px-4 py-3 ${
              item.isLow ? 'border-orange-300 bg-orange-50' : 'border-gray-200'
            }`}>
              <div>
                <span className="font-medium text-sm">{item.displayName}</span>
                <span className="ml-2 text-sm text-gray-500">{item.quantity} {item.unit}</span>
                {item.isLow && <span className="ml-2 text-xs text-orange-500">Low</span>}
              </div>
              <button
                onClick={() => deleteItem.mutate(item.id)}
                className="text-xs text-gray-400 hover:text-red-500"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
