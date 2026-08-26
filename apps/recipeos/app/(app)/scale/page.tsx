'use client';

import { useState } from 'react';
import { scaleIngredients, formatAmount } from '@shared/ratio-engine';
import type { Ingredient } from '@shared/ratio-engine';

const STARTER_INGREDIENTS: Ingredient[] = [
  { name: 'All-purpose flour', amount: '2', unit: 'cups' },
  { name: 'Butter', amount: '0.5', unit: 'cups' },
  { name: 'Sugar', amount: '1', unit: 'cup' },
  { name: 'Eggs', amount: '2', unit: '' },
  { name: 'Milk', amount: '0.25', unit: 'cups' },
];

export default function ScalePage() {
  const [baseServings, setBaseServings] = useState(4);
  const [targetServings, setTargetServings] = useState(8);
  const [ingredients, setIngredients] = useState<Ingredient[]>(STARTER_INGREDIENTS);
  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newUnit, setNewUnit] = useState('');

  const scaled = scaleIngredients(ingredients, baseServings, targetServings);
  const factor = baseServings > 0 ? targetServings / baseServings : 1;

  function addIngredient(e: React.FormEvent) {
    e.preventDefault();
    if (!newName || !newAmount) return;
    setIngredients([...ingredients, { name: newName, amount: newAmount, unit: newUnit }]);
    setNewName(''); setNewAmount(''); setNewUnit('');
  }

  function removeIngredient(index: number) {
    setIngredients(ingredients.filter((_, i) => i !== index));
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Scale</h1>
      <p className="text-sm text-gray-500 mb-6">Adjust servings and see scaled ingredient amounts in real time.</p>

      <div className="flex items-center gap-6 mb-8 p-4 rounded-xl border border-gray-200">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">Base servings</label>
          <input
            type="number"
            min={1}
            value={baseServings}
            onChange={(e) => setBaseServings(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-20 rounded-lg border border-gray-300 px-3 py-2 text-sm text-center"
          />
        </div>
        <div className="text-2xl text-gray-300">→</div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">Target servings</label>
          <input
            type="number"
            min={1}
            value={targetServings}
            onChange={(e) => setTargetServings(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-20 rounded-lg border border-gray-300 px-3 py-2 text-sm text-center"
          />
        </div>
        <div className="ml-auto text-sm text-gray-500">
          <span className="font-semibold text-black">{formatAmount(factor)}×</span> scale
        </div>
      </div>

      <table className="w-full text-sm mb-8">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left pb-2 text-gray-500 font-medium">Ingredient</th>
            <th className="text-right pb-2 text-gray-500 font-medium">Original</th>
            <th className="text-right pb-2 text-gray-500 font-medium">Scaled</th>
            <th className="pb-2"></th>
          </tr>
        </thead>
        <tbody>
          {scaled.map((ing, i) => (
            <tr key={i} className="border-b border-gray-100">
              <td className="py-3">{ing.name}</td>
              <td className="py-3 text-right text-gray-500">{ing.amount} {ing.unit}</td>
              <td className="py-3 text-right font-medium">{ing.scaledAmount} {ing.unit}</td>
              <td className="py-3 text-right">
                <button onClick={() => removeIngredient(i)} className="text-xs text-gray-300 hover:text-red-400">✕</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <form onSubmit={addIngredient} className="flex gap-2 flex-wrap">
        <input
          placeholder="Ingredient"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="flex-1 min-w-[140px] rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <input
          placeholder="Amount"
          value={newAmount}
          onChange={(e) => setNewAmount(e.target.value)}
          className="w-20 rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <input
          placeholder="Unit"
          value={newUnit}
          onChange={(e) => setNewUnit(e.target.value)}
          className="w-20 rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded-lg bg-black text-white text-sm px-4 py-2">
          + Add
        </button>
      </form>
    </div>
  );
}
