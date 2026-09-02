import { useState } from 'react';
import {
  Scale,
  X,
  ChefHat,
  Percent,
  Trash2,
  Tag,
} from 'lucide-react';
import {
  scaleRecipeByBakersPercentage,
  scaleRecipeByTargetYield,
  type BakersRecipe,
  type StandardPrepRecipe,
} from '@culinaryos/prep-engine';
import AdhesiveLabelModal from './AdhesiveLabelModal';

interface Props {
  initialRecipeName?: string;
  onClose: () => void;
}

export default function RecipeScalingModal({ initialRecipeName = 'Sourdough Focaccia', onClose }: Props) {
  const [scaleMode, setScaleMode] = useState<'bakers' | 'yield'>('bakers');
  const [recipeName, setRecipeName] = useState(initialRecipeName);
  const [showLabelModal, setShowLabelModal] = useState(false);

  // Baker's Math state
  const [targetFlourGrams, setTargetFlourGrams] = useState(2500);
  const [bakersIngredients, setBakersIngredients] = useState([
    { name: 'Bread Flour', percentage: 100, isBaseFlour: true },
    { name: 'Water (Hydration)', percentage: 75 },
    { name: 'Extra Virgin Olive Oil', percentage: 8 },
    { name: 'Active Sourdough Starter', percentage: 20 },
    { name: 'Sea Salt', percentage: 2.5 },
    { name: 'Fresh Rosemary & Garlic', percentage: 3.5 },
  ]);

  // Standard yield state
  const [baseYield, setBaseYield] = useState(12);
  const [targetYield, setTargetYield] = useState(36);
  const [yieldUnit, setYieldUnit] = useState('portions');
  const [standardIngredients, setStandardIngredients] = useState([
    { name: 'Heavy Cream', amount: 1000, unit: 'ml' },
    { name: 'Garlic Confit', amount: 200, unit: 'g' },
    { name: 'Egg Yolks', amount: 8, unit: 'units' },
    { name: 'White Truffle Oil', amount: 60, unit: 'ml' },
    { name: 'Black Pepper & Salt', amount: 25, unit: 'g' },
  ]);

  const bakersRecipe: BakersRecipe = {
    name: recipeName,
    baseFlourGrams: 1000,
    ingredients: bakersIngredients,
  };

  const standardRecipe: StandardPrepRecipe = {
    name: recipeName,
    baseYield: Number(baseYield) || 1,
    yieldUnit,
    shelfLifeHours: 72,
    ingredients: standardIngredients,
  };

  const scaledBakers = scaleRecipeByBakersPercentage(bakersRecipe, Number(targetFlourGrams) || 1000);
  const scaledYield = scaleRecipeByTargetYield(standardRecipe, Number(targetYield) || 1);

  function handleAddBakersRow() {
    setBakersIngredients([...bakersIngredients, { name: 'New Ingredient', percentage: 5 }]);
  }

  function handleAddStandardRow() {
    setStandardIngredients([...standardIngredients, { name: 'New Ingredient', amount: 100, unit: 'g' }]);
  }

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-4xl w-full p-6 text-zinc-100 space-y-6 shadow-2xl max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-zinc-950 flex items-center justify-center font-bold">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-100">
                Batch Prep Recipe Scaling Engine
              </h2>
              <p className="text-xs text-zinc-400">
                Scale batch recipes dynamically using Baker's Percentages or target yield multipliers.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center justify-between bg-zinc-950 p-3 rounded-xl border border-zinc-800">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
            Scaling Method:
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setScaleMode('bakers')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                scaleMode === 'bakers'
                  ? 'bg-amber-500 text-zinc-950 shadow-xs'
                  : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Percent className="w-3.5 h-3.5" />
              Baker's Math (% of Flour Basis)
            </button>
            <button
              type="button"
              onClick={() => setScaleMode('yield')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                scaleMode === 'yield'
                  ? 'bg-amber-500 text-zinc-950 shadow-xs'
                  : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <ChefHat className="w-3.5 h-3.5" />
              Standard Yield Portions Multiplier
            </button>
          </div>
        </div>

        {/* ── BAKER'S MATH VIEW ── */}
        {scaleMode === 'bakers' ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-zinc-950/60 p-4 rounded-xl border border-zinc-800">
              <div>
                <label className="text-xs font-semibold text-zinc-400 block mb-1">Recipe Name</label>
                <input
                  type="text"
                  value={recipeName}
                  onChange={(e) => setRecipeName(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-100 focus:border-amber-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-400 block mb-1">
                  Target Base Flour Weight (g)
                </label>
                <input
                  type="number"
                  step="50"
                  value={targetFlourGrams}
                  onChange={(e) => setTargetFlourGrams(Number(e.target.value))}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-xs font-mono text-amber-400 font-bold focus:border-amber-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-400 block mb-1">
                  Total Calculated Batch Weight
                </label>
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-xs font-mono text-emerald-400 font-black">
                  {scaledBakers.totalBatchWeightGrams} g ({(scaledBakers.totalBatchWeightGrams / 1000).toFixed(2)} kg)
                </div>
              </div>
            </div>

            {/* Formula & Scaled Mise En Place */}
            <div className="border border-zinc-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs text-zinc-300">
                <thead className="bg-zinc-950 text-zinc-400 uppercase font-mono border-b border-zinc-800">
                  <tr>
                    <th className="py-2.5 px-4">Ingredient</th>
                    <th className="py-2.5 px-4 text-right">Baker's %</th>
                    <th className="py-2.5 px-4 text-right">Scaled Weight (g)</th>
                    <th className="py-2.5 px-4 text-right">Approx (kg / lbs)</th>
                    <th className="py-2.5 px-4 text-center w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800 font-mono">
                  {scaledBakers.ingredients.map((ing, idx) => (
                    <tr key={idx} className="hover:bg-zinc-800/30">
                      <td className="py-2.5 px-4 font-sans font-semibold text-zinc-100">
                        {ing.name} {ing.percentage === 100 ? '(Base 100%)' : ''}
                      </td>
                      <td className="py-2.5 px-4 text-right text-zinc-400">{ing.percentage}%</td>
                      <td className="py-2.5 px-4 text-right font-bold text-amber-300">
                        {ing.weightGrams} g
                      </td>
                      <td className="py-2.5 px-4 text-right text-zinc-400">
                        {(ing.weightGrams / 1000).toFixed(2)} kg / {(ing.weightGrams * 0.00220462).toFixed(2)} lbs
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        {ing.percentage !== 100 && (
                          <button
                            type="button"
                            onClick={() =>
                              setBakersIngredients(bakersIngredients.filter((_, i) => i !== idx))
                            }
                            className="text-zinc-600 hover:text-red-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              type="button"
              onClick={handleAddBakersRow}
              className="text-xs text-amber-400 hover:text-amber-300 font-semibold"
            >
              + Add Baker's Ingredient Row
            </button>
          </div>
        ) : (
          /* ── STANDARD YIELD VIEW ── */
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-zinc-950/60 p-4 rounded-xl border border-zinc-800">
              <div>
                <label className="text-xs font-semibold text-zinc-400 block mb-1">Recipe Name</label>
                <input
                  type="text"
                  value={recipeName}
                  onChange={(e) => setRecipeName(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-100 focus:border-amber-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-400 block mb-1">Base Recipe Yield</label>
                <input
                  type="number"
                  value={baseYield}
                  onChange={(e) => setBaseYield(Number(e.target.value))}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-xs font-mono text-zinc-100 focus:border-amber-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-400 block mb-1">Target Prep Yield</label>
                <div className="flex gap-1.5">
                  <input
                    type="number"
                    value={targetYield}
                    onChange={(e) => setTargetYield(Number(e.target.value))}
                    className="w-20 bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-xs font-mono text-amber-400 font-bold focus:border-amber-500 focus:outline-none"
                  />
                  <input
                    type="text"
                    value={yieldUnit}
                    onChange={(e) => setYieldUnit(e.target.value)}
                    className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-100 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-400 block mb-1">Scale Multiplier</label>
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-xs font-mono text-emerald-400 font-black">
                  {scaledYield.scaleFactor}× Multiplier
                </div>
              </div>
            </div>

            {/* Scaled Ingredients Table */}
            <div className="border border-zinc-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs text-zinc-300">
                <thead className="bg-zinc-950 text-zinc-400 uppercase font-mono border-b border-zinc-800">
                  <tr>
                    <th className="py-2.5 px-4">Ingredient</th>
                    <th className="py-2.5 px-4 text-right">Base Amount</th>
                    <th className="py-2.5 px-4 text-right">Scaled Prep Requirement</th>
                    <th className="py-2.5 px-4 text-center w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800 font-mono">
                  {scaledYield.ingredients.map((ing, idx) => (
                    <tr key={idx} className="hover:bg-zinc-800/30">
                      <td className="py-2.5 px-4 font-sans font-semibold text-zinc-100">{ing.name}</td>
                      <td className="py-2.5 px-4 text-right text-zinc-400">
                        {standardIngredients[idx]?.amount} {ing.unit}
                      </td>
                      <td className="py-2.5 px-4 text-right font-bold text-amber-300">
                        {ing.amount} {ing.unit}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() =>
                            setStandardIngredients(standardIngredients.filter((_, i) => i !== idx))
                          }
                          className="text-zinc-600 hover:text-red-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              type="button"
              onClick={handleAddStandardRow}
              className="text-xs text-amber-400 hover:text-amber-300 font-semibold"
            >
              + Add Recipe Ingredient
            </button>
          </div>
        )}

        {/* Footer actions */}
        <div className="flex items-center justify-between border-t border-zinc-800 pt-4">
          <div className="text-xs text-zinc-500">
            Scaled batch is ready for mise en place station prep.
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-bold"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => setShowLabelModal(true)}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-xs"
            >
              <Tag className="w-4 h-4" />
              <span>Print Adhesive Expiration Label</span>
            </button>
          </div>
        </div>
      </div>

      {showLabelModal && (
        <AdhesiveLabelModal
          initialBatch={{
            recipeName,
            yieldQuantity: scaleMode === 'bakers' ? Math.round(scaledBakers.totalBatchWeightGrams) : targetYield,
            yieldUnit: scaleMode === 'bakers' ? 'g' : yieldUnit,
            shelfLifeHours: 72,
          }}
          onClose={() => setShowLabelModal(false)}
        />
      )}
    </div>
  );
}
