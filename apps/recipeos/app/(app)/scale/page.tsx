'use client';

import { useState, useMemo } from 'react';
import {
  scaleIngredients,
  scaleBakersPercentage,
  formatAmount,
  evaluateDietaryAndAllergens,
  ALLERGEN_SUBSTITUTIONS,
  type Ingredient,
  type BakersIngredient,
} from '@shared/ratio-engine';

const STARTER_INGREDIENTS: Ingredient[] = [
  { name: 'All-purpose flour', amount: '2', unit: 'cups' },
  { name: 'Butter', amount: '0.5', unit: 'cups' },
  { name: 'Sugar', amount: '1', unit: 'cup' },
  { name: 'Eggs', amount: '2', unit: 'count' },
  { name: 'Whole Milk', amount: '0.25', unit: 'cups' },
];

const STARTER_BAKERS_FORMULA: BakersIngredient[] = [
  { name: 'Artisan Bread Flour', percentage: 100, isBaseFlour: true },
  { name: 'Water (Hydration 75%)', percentage: 75 },
  { name: 'Active Sourdough Levain', percentage: 20 },
  { name: 'Fine Sea Salt', percentage: 2.2 },
  { name: 'Extra Virgin Olive Oil', percentage: 4.5 },
];

export default function ScalePage() {
  const [mode, setMode] = useState<'servings' | 'bakers'>('servings');

  // Servings state
  const [baseServings, setBaseServings] = useState(4);
  const [targetServings, setTargetServings] = useState(8);
  const [ingredients, setIngredients] = useState<Ingredient[]>(STARTER_INGREDIENTS);
  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newUnit, setNewUnit] = useState('');

  // Baker's math state
  const [targetFlourGrams, setTargetFlourGrams] = useState(2500);
  const [bakersIngredients, setBakersIngredients] = useState<BakersIngredient[]>(STARTER_BAKERS_FORMULA);
  const [newBakersName, setNewBakersName] = useState('');
  const [newBakersPct, setNewBakersPct] = useState('');

  // Commercial equipment cross-contact toggles
  const [sharedFryer, setSharedFryer] = useState(false);
  const [sharedToaster, setSharedToaster] = useState(false);
  const [sharedGrill, setSharedGrill] = useState(false);

  // Scaling calculations
  const scaled = scaleIngredients(ingredients, baseServings, targetServings);
  const factor = baseServings > 0 ? targetServings / baseServings : 1;
  const scaledBakers = useMemo(
    () => scaleBakersPercentage(bakersIngredients, targetFlourGrams),
    [bakersIngredients, targetFlourGrams]
  );

  // Allergen & dietary evaluation
  const activeIngredientNames = useMemo(() => {
    return mode === 'servings'
      ? ingredients.map((i) => i.name)
      : bakersIngredients.map((i) => i.name);
  }, [mode, ingredients, bakersIngredients]);

  const dietaryProfile = useMemo(() => {
    return evaluateDietaryAndAllergens(activeIngredientNames, {
      sharedFryer,
      sharedToaster,
      sharedGrill,
    });
  }, [activeIngredientNames, sharedFryer, sharedToaster, sharedGrill]);

  function addIngredient(e: React.FormEvent) {
    e.preventDefault();
    if (!newName || !newAmount) return;
    setIngredients([...ingredients, { name: newName, amount: newAmount, unit: newUnit }]);
    setNewName('');
    setNewAmount('');
    setNewUnit('');
  }

  function removeIngredient(index: number) {
    setIngredients(ingredients.filter((_, i) => i !== index));
  }

  function addBakersIngredient(e: React.FormEvent) {
    e.preventDefault();
    if (!newBakersName || !newBakersPct) return;
    setBakersIngredients([
      ...bakersIngredients,
      { name: newBakersName, percentage: parseFloat(newBakersPct) || 1 },
    ]);
    setNewBakersName('');
    setNewBakersPct('');
  }

  function removeBakersIngredient(index: number) {
    setBakersIngredients(bakersIngredients.filter((_, i) => i !== index));
  }

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Digital Recipe Scaler & Allergen Matrix
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Dynamically scale culinary recipes via portion multipliers or Baker's % formulas with live FDA FASTER Act Top 9 allergen detection.
        </p>
      </div>

      {/* Mode Switcher Tabs (Ergonomic 48px touch targets) */}
      <div className="flex bg-gray-100 p-1.5 rounded-xl border border-gray-200">
        <button
          type="button"
          onClick={() => setMode('servings')}
          className={`flex-1 h-12 min-w-[48px] rounded-lg text-sm font-semibold transition-all active:scale-[0.97] duration-75 ease-out ${
            mode === 'servings'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          Portion Servings Multiplier
        </button>
        <button
          type="button"
          onClick={() => setMode('bakers')}
          className={`flex-1 h-12 min-w-[48px] rounded-lg text-sm font-semibold transition-all active:scale-[0.97] duration-75 ease-out ${
            mode === 'bakers'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          Baker's Math (% of Flour Basis)
        </button>
      </div>

      {/* Mode 1: Servings Scaler Controls */}
      {mode === 'servings' && (
        <div className="space-y-4">
          <div className="flex items-center gap-6 p-4 rounded-xl border border-gray-200 bg-gray-50">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500">Base Servings</label>
              <input
                type="number"
                min={1}
                value={baseServings}
                onChange={(e) => setBaseServings(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-24 h-12 rounded-lg border border-gray-300 px-3 py-2 text-sm text-center font-bold font-mono focus:border-black focus:outline-none"
              />
            </div>
            <div className="text-2xl text-gray-400">→</div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-500">Target Servings</label>
              <input
                type="number"
                min={1}
                value={targetServings}
                onChange={(e) => setTargetServings(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-24 h-12 rounded-lg border border-gray-300 px-3 py-2 text-sm text-center font-bold font-mono text-amber-600 focus:border-amber-600 focus:outline-none"
              />
            </div>
            <div className="ml-auto text-sm text-gray-500">
              <span className="font-bold text-gray-900 font-mono text-base">{formatAmount(factor)}×</span> scale multiplier
            </div>
          </div>

          <div className="border border-gray-200 rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Ingredient</th>
                  <th className="text-right py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Base</th>
                  <th className="text-right py-3 px-4 text-xs font-bold text-gray-900 uppercase tracking-wider">Scaled Yield</th>
                  <th className="py-3 px-4 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-mono">
                {scaled.map((ing, i) => (
                  <tr key={i} className="hover:bg-gray-50/60">
                    <td className="py-3 px-4 font-sans font-medium text-gray-900">{ing.name}</td>
                    <td className="py-3 px-4 text-right text-gray-500">{ing.amount} {ing.unit}</td>
                    <td className="py-3 px-4 text-right font-bold text-amber-600">{ing.scaledAmount} {ing.unit}</td>
                    <td className="py-3 px-4 text-right font-sans">
                      <button
                        type="button"
                        onClick={() => removeIngredient(i)}
                        className="w-8 h-8 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-500 inline-flex items-center justify-center text-xs"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <form onSubmit={addIngredient} className="flex gap-2 flex-wrap items-center">
            <input
              placeholder="Ingredient name (e.g. Almond Flour)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="flex-1 min-w-[180px] h-12 rounded-lg border border-gray-300 px-3 text-sm focus:border-black focus:outline-none"
            />
            <input
              placeholder="Qty"
              value={newAmount}
              onChange={(e) => setNewAmount(e.target.value)}
              className="w-20 h-12 rounded-lg border border-gray-300 px-3 text-sm text-center font-mono focus:border-black focus:outline-none"
            />
            <input
              placeholder="Unit"
              value={newUnit}
              onChange={(e) => setNewUnit(e.target.value)}
              className="w-20 h-12 rounded-lg border border-gray-300 px-3 text-sm focus:border-black focus:outline-none"
            />
            <button
              type="submit"
              className="h-12 px-5 rounded-lg bg-gray-900 hover:bg-black text-white text-sm font-semibold transition-transform active:scale-[0.97] duration-75 ease-out"
            >
              + Add
            </button>
          </form>
        </div>
      )}

      {/* Mode 2: Baker's Math Formula BOM */}
      {mode === 'bakers' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl border border-gray-200 bg-amber-50/40">
            <div className="sm:col-span-2 flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-600">
                Target Flour Weight Basis (100% Flour in grams)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="50"
                  min={1}
                  value={targetFlourGrams}
                  onChange={(e) => setTargetFlourGrams(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-32 h-12 rounded-lg border border-gray-300 px-3 text-center font-mono font-bold text-amber-700 text-base focus:border-amber-600 focus:outline-none"
                />
                <span className="text-sm font-semibold text-gray-500">grams flour</span>
              </div>
            </div>

            <div className="flex flex-col justify-center bg-white p-3 rounded-lg border border-amber-200 text-center">
              <span className="text-xs text-gray-500 font-semibold">Total Scaled Batch Weight</span>
              <span className="text-lg font-black font-mono text-emerald-700">
                {scaledBakers.totalBatchWeightGrams.toLocaleString()} g
              </span>
              <span className="text-[11px] text-gray-400 font-mono">
                {(scaledBakers.totalBatchWeightGrams / 1000).toFixed(2)} kg / {(scaledBakers.totalBatchWeightGrams * 0.00220462).toFixed(2)} lbs
              </span>
            </div>
          </div>

          <div className="border border-gray-200 rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Formula Ingredient</th>
                  <th className="text-right py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Baker's %</th>
                  <th className="text-right py-3 px-4 text-xs font-bold text-gray-900 uppercase tracking-wider">Mise Weight (g)</th>
                  <th className="text-right py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Approx (kg / lbs)</th>
                  <th className="py-3 px-4 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-mono">
                {scaledBakers.ingredients.map((ing, i) => (
                  <tr key={i} className="hover:bg-gray-50/60">
                    <td className="py-3 px-4 font-sans font-medium text-gray-900">
                      {ing.name} {ing.percentage === 100 ? '(Base Flour 100%)' : ''}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-500">{ing.percentage}%</td>
                    <td className="py-3 px-4 text-right font-bold text-amber-600">{ing.weightGrams} g</td>
                    <td className="py-3 px-4 text-right text-gray-400 text-xs">
                      {ing.approxKg} kg ({ing.approxLbs} lbs)
                    </td>
                    <td className="py-3 px-4 text-right font-sans">
                      {ing.percentage !== 100 && (
                        <button
                          type="button"
                          onClick={() => removeBakersIngredient(i)}
                          className="w-8 h-8 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-500 inline-flex items-center justify-center text-xs"
                        >
                          ✕
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <form onSubmit={addBakersIngredient} className="flex gap-2 flex-wrap items-center">
            <input
              placeholder="Ingredient name (e.g. Olive Oil)"
              value={newBakersName}
              onChange={(e) => setNewBakersName(e.target.value)}
              className="flex-1 min-w-[180px] h-12 rounded-lg border border-gray-300 px-3 text-sm focus:border-black focus:outline-none"
            />
            <input
              placeholder="Baker's % (e.g. 5)"
              value={newBakersPct}
              onChange={(e) => setNewBakersPct(e.target.value)}
              className="w-32 h-12 rounded-lg border border-gray-300 px-3 text-sm text-center font-mono focus:border-black focus:outline-none"
            />
            <button
              type="submit"
              className="h-12 px-5 rounded-lg bg-gray-900 hover:bg-black text-white text-sm font-semibold transition-transform active:scale-[0.97] duration-75 ease-out"
            >
              + Add Formula Item
            </button>
          </form>
        </div>
      )}

      {/* FDA FASTER Act Top 9 Allergen & Dietary Intelligence Box */}
      <div className="p-5 rounded-xl border border-gray-200 bg-white space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
            <span>🛡️</span> FDA FASTER Act Top 9 Allergen Intelligence
          </h2>
          <div className="flex items-center gap-2">
            {dietaryProfile.isVegan && (
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800">
                🌱 Vegan
              </span>
            )}
            {dietaryProfile.isVegetarian && !dietaryProfile.isVegan && (
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                🥗 Vegetarian
              </span>
            )}
            {dietaryProfile.isGlutenFree && (
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                🌾 Gluten-Free
              </span>
            )}
            {dietaryProfile.isDairyFree && (
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                🥛 Dairy-Free
              </span>
            )}
            {dietaryProfile.isNutFree && (
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800">
                🥜 Nut-Free
              </span>
            )}
          </div>
        </div>

        {/* Detected Allergens List */}
        <div>
          <span className="text-xs font-semibold text-gray-500 block mb-2">Detected Allergens in Recipe:</span>
          {dietaryProfile.matchedAllergens.length === 0 ? (
            <div className="text-xs font-medium text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-200">
              ✔ No FDA Top 9 major allergens detected in active formula ingredients.
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {dietaryProfile.matchedAllergens.map((alg) => (
                <div
                  key={alg.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-red-700 border border-red-200 shadow-2xs"
                >
                  <span>{alg.emoji}</span>
                  <span>{alg.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Commercial Kitchen Cross-Contact Toggles */}
        <div className="pt-3 border-t border-gray-100">
          <span className="text-xs font-semibold text-gray-500 block mb-2">
            Commercial Kitchen Station Cross-Contact Toggles:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <label className="flex items-center gap-2 text-xs p-2.5 rounded-lg border border-gray-200 bg-gray-50 cursor-pointer hover:bg-gray-100">
              <input
                type="checkbox"
                checked={sharedFryer}
                onChange={(e) => setSharedFryer(e.target.checked)}
                className="rounded border-gray-300 text-black focus:ring-black"
              />
              <span className="font-medium text-gray-800">Shared Deep Fryer</span>
            </label>
            <label className="flex items-center gap-2 text-xs p-2.5 rounded-lg border border-gray-200 bg-gray-50 cursor-pointer hover:bg-gray-100">
              <input
                type="checkbox"
                checked={sharedToaster}
                onChange={(e) => setSharedToaster(e.target.checked)}
                className="rounded border-gray-300 text-black focus:ring-black"
              />
              <span className="font-medium text-gray-800">Shared Bread Toaster</span>
            </label>
            <label className="flex items-center gap-2 text-xs p-2.5 rounded-lg border border-gray-200 bg-gray-50 cursor-pointer hover:bg-gray-100">
              <input
                type="checkbox"
                checked={sharedGrill}
                onChange={(e) => setSharedGrill(e.target.checked)}
                className="rounded border-gray-300 text-black focus:ring-black"
              />
              <span className="font-medium text-gray-800">Shared Flat-Top Grill</span>
            </label>
          </div>
        </div>

        {/* Cross-Contact Warnings */}
        {dietaryProfile.crossContactWarnings.length > 0 && (
          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 space-y-1">
            <span className="text-xs font-bold text-amber-900 block">⚠ Cross-Contact & Station Risk Advisories:</span>
            <ul className="text-xs text-amber-800 list-disc list-inside space-y-0.5">
              {dietaryProfile.crossContactWarnings.map((warn, i) => (
                <li key={i}>{warn}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Allergen Substitution Hints */}
        {dietaryProfile.matchedAllergens.length > 0 && (
          <div className="pt-3 border-t border-gray-100">
            <span className="text-xs font-semibold text-gray-500 block mb-2">
              Recommended Culinary Substitutions:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {dietaryProfile.matchedAllergens.map((alg) => {
                const subs = ALLERGEN_SUBSTITUTIONS[alg.id];
                if (!subs) return null;
                return (
                  <div key={alg.id} className="p-2.5 rounded-lg bg-gray-50 border border-gray-200">
                    <span className="font-bold text-gray-900">{alg.name}: </span>
                    <span className="text-gray-600">{subs.join(', ')}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

