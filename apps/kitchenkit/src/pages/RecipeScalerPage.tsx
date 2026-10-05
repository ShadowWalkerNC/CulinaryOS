import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Scale,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  Printer,
  Plus,
  Trash2,
  Wheat,
  Utensils,
  CheckCircle2,
} from 'lucide-react';
import {
  scaleIngredients,
  scaleBakersPercentage,
  formatAmount,
  evaluateDietaryAndAllergens,
  ALLERGEN_SUBSTITUTIONS,
  type BakersIngredient,
  type PortionIngredient,
} from '@culinaryos/ratio-engine';
import { useRecipes } from '@/hooks/useRecipes';
import { Button } from '@culinaryos/ui';

interface FormulaPreset {
  id: string;
  name: string;
  mode: 'servings' | 'bakers';
  category: string;
  servings?: { base: number; target: number; ingredients: PortionIngredient[] };
  bakers?: { flourGrams: number; ingredients: BakersIngredient[] };
}

const PRESETS: FormulaPreset[] = [
  {
    id: 'sourdough-artisan',
    name: 'Artisan Sourdough Boule',
    mode: 'bakers',
    category: 'Bread & Dough',
    bakers: {
      flourGrams: 2000,
      ingredients: [
        { name: 'Bread Flour (High Protein)', percentage: 100, isBaseFlour: true },
        { name: 'Filtered Water (74% Hydration)', percentage: 74 },
        { name: 'Active Sourdough Levain', percentage: 20 },
        { name: 'Fine Sea Salt', percentage: 2.2 },
        { name: 'Extra Virgin Olive Oil', percentage: 3.5 },
      ],
    },
  },
  {
    id: 'brioche-buns',
    name: 'Cheezies Brioche Burger Buns',
    mode: 'bakers',
    category: 'Bread & Dough',
    bakers: {
      flourGrams: 1500,
      ingredients: [
        { name: 'Unbleached Bread Flour', percentage: 100, isBaseFlour: true },
        { name: 'Whole Milk', percentage: 35 },
        { name: 'Whole Eggs', percentage: 30 },
        { name: 'Unsalted Butter (European)', percentage: 25 },
        { name: 'Granulated Sugar', percentage: 10 },
        { name: 'Instant Yeast', percentage: 2 },
        { name: 'Kosher Salt', percentage: 2 },
      ],
    },
  },
  {
    id: 'pizza-dough-neapolitan',
    name: 'House 00 Neapolitan Pizza Dough',
    mode: 'bakers',
    category: 'Pizza & Flatbreads',
    bakers: {
      flourGrams: 2500,
      ingredients: [
        { name: 'Caputo 00 Flour', percentage: 100, isBaseFlour: true },
        { name: 'Cold Water (65% Hydration)', percentage: 65 },
        { name: 'Fine Sea Salt', percentage: 2.8 },
        { name: 'Fresh Yeast', percentage: 0.3 },
      ],
    },
  },
  {
    id: 'classic-carbonara',
    name: 'Roman Rigatoni Carbonara',
    mode: 'servings',
    category: 'Pasta & Mains',
    servings: {
      base: 4,
      target: 8,
      ingredients: [
        { name: 'Rigatoni Pasta (Bronze Cut)', amount: '400', unit: 'g' },
        { name: 'Cured Guanciale Strips', amount: '200', unit: 'g' },
        { name: 'Fresh Egg Yolks', amount: '6', unit: 'count' },
        { name: 'Whole Egg', amount: '1', unit: 'count' },
        { name: 'Pecorino Romano DOP', amount: '100', unit: 'g' },
        { name: 'Freshly Cracked Black Pepper', amount: '6', unit: 'g' },
      ],
    },
  },
  {
    id: 'cheezies-cheese-sauce',
    name: 'Cheezies Signature House Cheese Sauce',
    mode: 'servings',
    category: 'Sauces & Bases',
    servings: {
      base: 6,
      target: 12,
      ingredients: [
        { name: 'Sharp Aged White Cheddar', amount: '450', unit: 'g' },
        { name: 'Whole Milk', amount: '500', unit: 'ml' },
        { name: 'Heavy Cream', amount: '250', unit: 'ml' },
        { name: 'Unsalted Butter', amount: '60', unit: 'g' },
        { name: 'All-Purpose Flour', amount: '50', unit: 'g' },
        { name: 'Dijon Mustard', amount: '15', unit: 'g' },
        { name: 'Smoked Paprika', amount: '4', unit: 'g' },
      ],
    },
  },
];

export default function RecipeScalerPage() {
  const [searchParams] = useSearchParams();
  const initialRecipeId = searchParams.get('recipeId');

  const { data: vaultRecipes = [] } = useRecipes();

  const [mode, setMode] = useState<'servings' | 'bakers'>('servings');

  // Servings mode state
  const [baseServings, setBaseServings] = useState(4);
  const [targetServings, setTargetServings] = useState(8);
  const [servingsIngredients, setServingsIngredients] = useState<PortionIngredient[]>(
    PRESETS[3]!.servings!.ingredients
  );
  const [newPortionName, setNewPortionName] = useState('');
  const [newPortionAmount, setNewPortionAmount] = useState('');
  const [newPortionUnit, setNewPortionUnit] = useState('g');

  // Baker's math state
  const [targetFlourGrams, setTargetFlourGrams] = useState(2000);
  const [bakersIngredients, setBakersIngredients] = useState<BakersIngredient[]>(
    PRESETS[0]!.bakers!.ingredients
  );
  const [newBakersName, setNewBakersName] = useState('');
  const [newBakersPct, setNewBakersPct] = useState('');

  // Commercial equipment cross-contact toggles
  const [sharedFryer, setSharedFryer] = useState(false);
  const [sharedToaster, setSharedToaster] = useState(false);
  const [sharedGrill, setSharedGrill] = useState(false);

  // Active loaded recipe label
  const [activeFormulaTitle, setActiveFormulaTitle] = useState('Roman Rigatoni Carbonara');

  // Check URL params for vault recipe linking
  useEffect(() => {
    if (initialRecipeId && vaultRecipes.length > 0) {
      const found = vaultRecipes.find((r) => r.id === initialRecipeId);
      if (found) {
        loadFromVault(found.id);
      }
    }
  }, [initialRecipeId, vaultRecipes]);

  // Scaled calculations
  const scaledPortions = useMemo(() => {
    return scaleIngredients(servingsIngredients, baseServings, targetServings);
  }, [servingsIngredients, baseServings, targetServings]);

  const portionFactor = baseServings > 0 ? targetServings / baseServings : 1;

  const scaledBakers = useMemo(() => {
    return scaleBakersPercentage(bakersIngredients, targetFlourGrams);
  }, [bakersIngredients, targetFlourGrams]);

  // Active ingredient names for allergen engine
  const activeIngredientNames = useMemo(() => {
    return mode === 'servings'
      ? servingsIngredients.map((i) => i.name)
      : bakersIngredients.map((i) => i.name);
  }, [mode, servingsIngredients, bakersIngredients]);

  // Dietary and allergen intelligence profile
  const dietaryProfile = useMemo(() => {
    return evaluateDietaryAndAllergens(activeIngredientNames, {
      sharedFryer,
      sharedToaster,
      sharedGrill,
    });
  }, [activeIngredientNames, sharedFryer, sharedToaster, sharedGrill]);

  function loadPreset(preset: FormulaPreset) {
    setActiveFormulaTitle(preset.name);
    setMode(preset.mode);
    if (preset.mode === 'servings' && preset.servings) {
      setBaseServings(preset.servings.base);
      setTargetServings(preset.servings.target);
      setServingsIngredients(preset.servings.ingredients);
    } else if (preset.mode === 'bakers' && preset.bakers) {
      setTargetFlourGrams(preset.bakers.flourGrams);
      setBakersIngredients(preset.bakers.ingredients);
    }
  }

  function loadFromVault(recipeId: string) {
    const r = vaultRecipes.find((item) => item.id === recipeId);
    if (!r) return;

    setActiveFormulaTitle(r.name);
    setMode('servings');
    const portions = Number(r.base_yield_portions || 4);
    setBaseServings(portions);
    setTargetServings(portions * 2);

    const converted: PortionIngredient[] = (r.ingredients || []).map((ing) => ({
      name: ing.name,
      amount: String(ing.ratio ? Number(ing.ratio) * 100 : 100),
      unit: ing.unit || 'g',
    }));

    if (converted.length > 0) {
      setServingsIngredients(converted);
    }
  }

  function handleAddPortionIngredient(e: React.FormEvent) {
    e.preventDefault();
    if (!newPortionName.trim() || !newPortionAmount.trim()) return;
    setServingsIngredients([
      ...servingsIngredients,
      {
        name: newPortionName.trim(),
        amount: newPortionAmount.trim(),
        unit: newPortionUnit.trim() || 'g',
      },
    ]);
    setNewPortionName('');
    setNewPortionAmount('');
  }

  function handleRemovePortionIngredient(index: number) {
    setServingsIngredients(servingsIngredients.filter((_, i) => i !== index));
  }

  function handleAddBakersIngredient(e: React.FormEvent) {
    e.preventDefault();
    if (!newBakersName.trim() || !newBakersPct.trim()) return;
    const pct = parseFloat(newBakersPct);
    if (isNaN(pct) || pct <= 0) return;
    setBakersIngredients([
      ...bakersIngredients,
      {
        name: newBakersName.trim(),
        percentage: pct,
      },
    ]);
    setNewBakersName('');
    setNewBakersPct('');
  }

  function handleRemoveBakersIngredient(index: number) {
    setBakersIngredients(bakersIngredients.filter((_, i) => i !== index));
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header and Print Control */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Scale className="w-6 h-6 text-brand-400" />
            <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
              Digital Recipe Scaler & Allergen Matrix
            </h1>
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            Dynamic batch multiplier, Baker's % flour ratio math, and FDA FASTER Act Top 9 live allergen detection.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="min-h-[48px] px-4 gap-2 border-surface-border text-zinc-300 hover:text-white"
          >
            <Printer size={16} />
            Print Prep Sheet
          </Button>
        </div>
      </div>

      {/* Preset & Vault Quick-Loader Bar */}
      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
            <Sparkles size={14} className="text-amber-400" />
            Formula Presets & Recipe Vault
          </div>
          <span className="text-xs text-zinc-500 font-mono">
            Active: <span className="text-brand-400 font-semibold">{activeFormulaTitle}</span>
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => loadPreset(p)}
              className={`min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-[0.97] duration-75 ease-out ${
                activeFormulaTitle === p.name
                  ? 'bg-brand-600 text-white font-semibold shadow-sm'
                  : 'bg-surface-muted text-zinc-300 hover:bg-surface-border hover:text-white'
              }`}
            >
              {p.name}
            </button>
          ))}

          {vaultRecipes.length > 0 && (
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-zinc-500">Vault:</span>
              <select
                aria-label="Load Recipe from Vault"
                onChange={(e) => {
                  if (e.target.value) loadFromVault(e.target.value);
                }}
                className="bg-surface-card border border-surface-border text-xs rounded-lg px-2.5 py-2 text-zinc-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
                defaultValue=""
              >
                <option value="" disabled>Select vault recipe...</option>
                {vaultRecipes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Mode Switcher Tabs (Ergonomic 48px Touch Targets) */}
      <div className="grid grid-cols-2 p-1.5 rounded-xl bg-surface-muted border border-surface-border gap-1">
        <button
          type="button"
          onClick={() => setMode('servings')}
          className={`min-h-[48px] rounded-lg text-sm font-semibold transition-all active:scale-[0.97] duration-75 ease-out flex items-center justify-center gap-2 ${
            mode === 'servings'
              ? 'bg-surface-card text-brand-400 shadow-sm border border-surface-border'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Utensils size={16} />
          Portion Servings Multiplier
        </button>
        <button
          type="button"
          onClick={() => setMode('bakers')}
          className={`min-h-[48px] rounded-lg text-sm font-semibold transition-all active:scale-[0.97] duration-75 ease-out flex items-center justify-center gap-2 ${
            mode === 'bakers'
              ? 'bg-surface-card text-brand-400 shadow-sm border border-surface-border'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Wheat size={16} />
          Baker's Math (% of Flour Basis)
        </button>
      </div>

      {/* Mode 1: Portion Servings Multiplier */}
      {mode === 'servings' && (
        <div className="space-y-4">
          <div className="card flex flex-wrap items-center gap-6 bg-surface-card/60">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-zinc-400">Base Servings</label>
              <input
                type="number"
                min={1}
                value={baseServings}
                onChange={(e) => setBaseServings(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-24 min-h-[48px] rounded-lg bg-surface border border-surface-border px-3 text-sm text-center font-bold font-mono text-zinc-100 focus:border-brand-500 focus:outline-none"
              />
            </div>

            <div className="text-2xl text-zinc-600 font-bold">→</div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-zinc-400">Target Servings</label>
              <input
                type="number"
                min={1}
                value={targetServings}
                onChange={(e) => setTargetServings(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-24 min-h-[48px] rounded-lg bg-surface border border-surface-border px-3 text-sm text-center font-bold font-mono text-amber-400 focus:border-amber-400 focus:outline-none"
              />
            </div>

            <div className="ml-auto flex items-center gap-2 bg-surface px-4 py-2.5 rounded-lg border border-surface-border">
              <span className="text-xs text-zinc-400 font-medium">Scaling Multiplier:</span>
              <span className="font-bold text-brand-400 font-mono text-base">
                {formatAmount(portionFactor)}×
              </span>
            </div>
          </div>

          {/* Servings Ingredient Table */}
          <div className="card p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-surface-muted border-b border-surface-border">
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    Ingredient Name
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    Base Qty
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-bold text-amber-400 uppercase tracking-wider">
                    Scaled Yield
                  </th>
                  <th className="py-3 px-4 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border font-mono">
                {scaledPortions.map((ing, i) => (
                  <tr key={i} className="hover:bg-surface-muted/40 transition-colors">
                    <td className="py-3 px-4 font-sans font-medium text-zinc-200">
                      {ing.name}
                    </td>
                    <td className="py-3 px-4 text-right text-zinc-400">
                      {ing.amount} {ing.unit}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-amber-400">
                      {ing.scaledAmount} {ing.unit}
                    </td>
                    <td className="py-3 px-4 text-right font-sans">
                      <button
                        type="button"
                        onClick={() => handleRemovePortionIngredient(i)}
                        className="w-8 h-8 rounded-lg hover:bg-red-500/10 text-zinc-500 hover:text-red-400 inline-flex items-center justify-center transition-colors"
                        aria-label="Remove ingredient"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Add Portion Ingredient Form */}
          <form onSubmit={handleAddPortionIngredient} className="flex gap-2 flex-wrap items-center">
            <input
              placeholder="Ingredient name (e.g. Heavy Cream)"
              value={newPortionName}
              onChange={(e) => setNewPortionName(e.target.value)}
              className="flex-1 min-w-[200px] min-h-[48px] rounded-lg bg-surface-card border border-surface-border px-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-brand-500 focus:outline-none"
            />
            <input
              placeholder="Qty"
              value={newPortionAmount}
              onChange={(e) => setNewPortionAmount(e.target.value)}
              className="w-24 min-h-[48px] rounded-lg bg-surface-card border border-surface-border px-3 text-sm text-center font-mono text-zinc-100 placeholder:text-zinc-500 focus:border-brand-500 focus:outline-none"
            />
            <input
              placeholder="Unit"
              value={newPortionUnit}
              onChange={(e) => setNewPortionUnit(e.target.value)}
              className="w-24 min-h-[48px] rounded-lg bg-surface-card border border-surface-border px-3 text-sm text-center text-zinc-100 placeholder:text-zinc-500 focus:border-brand-500 focus:outline-none"
            />
            <button
              type="submit"
              className="min-h-[48px] px-5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold transition-all active:scale-[0.97] duration-75 ease-out flex items-center gap-1.5"
            >
              <Plus size={16} />
              Add Item
            </button>
          </form>
        </div>
      )}

      {/* Mode 2: Baker's Math Formula BOM */}
      {mode === 'bakers' && (
        <div className="space-y-4">
          <div className="card grid grid-cols-1 sm:grid-cols-3 gap-4 bg-surface-card/60">
            <div className="sm:col-span-2 flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-300">
                Target Flour Weight Basis (100% Flour in grams)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  step="50"
                  min={1}
                  value={targetFlourGrams}
                  onChange={(e) => setTargetFlourGrams(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-36 min-h-[48px] rounded-lg bg-surface border border-surface-border px-3 text-center font-mono font-bold text-amber-400 text-base focus:border-amber-400 focus:outline-none"
                />
                <span className="text-sm font-medium text-zinc-400">grams flour base</span>
              </div>
            </div>

            <div className="flex flex-col justify-center bg-surface p-3.5 rounded-lg border border-surface-border text-center">
              <span className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">
                Total Formula Batch
              </span>
              <span className="text-xl font-black font-mono text-emerald-400 mt-0.5">
                {scaledBakers.totalBatchWeightGrams.toLocaleString()} g
              </span>
              <span className="text-[11px] text-zinc-500 font-mono mt-0.5">
                {(scaledBakers.totalBatchWeightGrams / 1000).toFixed(2)} kg ·{' '}
                {(scaledBakers.totalBatchWeightGrams * 0.00220462).toFixed(2)} lbs
              </span>
            </div>
          </div>

          {/* Baker's Formula Table */}
          <div className="card p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-surface-muted border-b border-surface-border">
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    Formula Ingredient
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    Baker's %
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-bold text-amber-400 uppercase tracking-wider">
                    Mise Weight (g)
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">
                    Approx (kg / lbs)
                  </th>
                  <th className="py-3 px-4 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border font-mono">
                {scaledBakers.ingredients.map((ing, i) => (
                  <tr key={i} className="hover:bg-surface-muted/40 transition-colors">
                    <td className="py-3 px-4 font-sans font-medium text-zinc-200">
                      {ing.name}{' '}
                      {ing.isBaseFlour || ing.percentage === 100 ? (
                        <span className="text-xs font-mono text-brand-400 font-bold ml-1.5">
                          (Flour 100%)
                        </span>
                      ) : null}
                    </td>
                    <td className="py-3 px-4 text-right text-zinc-400">{ing.percentage}%</td>
                    <td className="py-3 px-4 text-right font-bold text-amber-400">
                      {ing.weightGrams} g
                    </td>
                    <td className="py-3 px-4 text-right text-zinc-500 text-xs">
                      {ing.approxKg} kg ({ing.approxLbs} lbs)
                    </td>
                    <td className="py-3 px-4 text-right font-sans">
                      {ing.percentage !== 100 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveBakersIngredient(i)}
                          className="w-8 h-8 rounded-lg hover:bg-red-500/10 text-zinc-500 hover:text-red-400 inline-flex items-center justify-center transition-colors"
                          aria-label="Remove ingredient"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Add Baker's Ingredient Form */}
          <form onSubmit={handleAddBakersIngredient} className="flex gap-2 flex-wrap items-center">
            <input
              placeholder="Ingredient name (e.g. Unsalted Butter)"
              value={newBakersName}
              onChange={(e) => setNewBakersName(e.target.value)}
              className="flex-1 min-w-[200px] min-h-[48px] rounded-lg bg-surface-card border border-surface-border px-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-brand-500 focus:outline-none"
            />
            <input
              placeholder="Baker's % (e.g. 8)"
              value={newBakersPct}
              onChange={(e) => setNewBakersPct(e.target.value)}
              className="w-36 min-h-[48px] rounded-lg bg-surface-card border border-surface-border px-3 text-sm text-center font-mono text-zinc-100 placeholder:text-zinc-500 focus:border-brand-500 focus:outline-none"
            />
            <button
              type="submit"
              className="min-h-[48px] px-5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold transition-all active:scale-[0.97] duration-75 ease-out flex items-center gap-1.5"
            >
              <Plus size={16} />
              Add Formula Item
            </button>
          </form>
        </div>
      )}

      {/* FDA FASTER Act Top 9 Allergen Intelligence & Cross-Contact Matrix */}
      <div className="card space-y-5 border-amber-500/20 bg-surface-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-surface-border pb-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold text-zinc-100">
              FDA FASTER Act Top 9 Allergen Intelligence
            </h2>
          </div>

          {/* Live Dietary Classification Badges */}
          <div className="flex flex-wrap gap-1.5">
            {dietaryProfile.isVegan && (
              <span className="badge bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                🌱 Vegan
              </span>
            )}
            {dietaryProfile.isVegetarian && !dietaryProfile.isVegan && (
              <span className="badge bg-green-500/20 text-green-300 border border-green-500/30">
                🥗 Vegetarian
              </span>
            )}
            {dietaryProfile.isGlutenFree && (
              <span className="badge bg-amber-500/20 text-amber-300 border border-amber-500/30">
                🌾 Gluten-Free
              </span>
            )}
            {dietaryProfile.isDairyFree && (
              <span className="badge bg-blue-500/20 text-blue-300 border border-blue-500/30">
                🥛 Dairy-Free
              </span>
            )}
            {dietaryProfile.isNutFree && (
              <span className="badge bg-purple-500/20 text-purple-300 border border-purple-500/30">
                🥜 Nut-Free
              </span>
            )}
          </div>
        </div>

        {/* Detected Allergens */}
        <div className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block">
            Detected Allergens in Active Formula:
          </span>

          {dietaryProfile.matchedAllergens.length === 0 ? (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-xs font-medium">
              <CheckCircle2 size={16} />
              No FDA Top 9 major allergens detected in active formula ingredients.
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {dietaryProfile.matchedAllergens.map((alg) => (
                <div
                  key={alg.id}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-red-500/15 text-red-300 border border-red-500/30 shadow-xs"
                >
                  <span className="text-sm">{alg.emoji}</span>
                  <span>{alg.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Commercial Kitchen Station Cross-Contact Toggles */}
        <div className="space-y-2 pt-2 border-t border-surface-border">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block">
            Commercial Kitchen Station Cross-Contact Toggles:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <label className="flex items-center gap-3 p-3 rounded-lg border border-surface-border bg-surface cursor-pointer hover:bg-surface-muted/60 transition-colors">
              <input
                type="checkbox"
                checked={sharedFryer}
                onChange={(e) => setSharedFryer(e.target.checked)}
                className="w-4 h-4 rounded border-surface-border bg-surface-card text-brand-500 focus:ring-brand-500"
              />
              <span className="text-xs font-medium text-zinc-200">Shared Deep Fryer</span>
            </label>
            <label className="flex items-center gap-3 p-3 rounded-lg border border-surface-border bg-surface cursor-pointer hover:bg-surface-muted/60 transition-colors">
              <input
                type="checkbox"
                checked={sharedToaster}
                onChange={(e) => setSharedToaster(e.target.checked)}
                className="w-4 h-4 rounded border-surface-border bg-surface-card text-brand-500 focus:ring-brand-500"
              />
              <span className="text-xs font-medium text-zinc-200">Shared Bread Toaster</span>
            </label>
            <label className="flex items-center gap-3 p-3 rounded-lg border border-surface-border bg-surface cursor-pointer hover:bg-surface-muted/60 transition-colors">
              <input
                type="checkbox"
                checked={sharedGrill}
                onChange={(e) => setSharedGrill(e.target.checked)}
                className="w-4 h-4 rounded border-surface-border bg-surface-card text-brand-500 focus:ring-brand-500"
              />
              <span className="text-xs font-medium text-zinc-200">Shared Flat-Top Grill</span>
            </label>
          </div>
        </div>

        {/* Cross-Contact Advisories */}
        {dietaryProfile.crossContactWarnings.length > 0 && (
          <div className="p-3.5 bg-amber-500/10 rounded-lg border border-amber-500/25 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
              <AlertTriangle size={15} />
              Cross-Contact & Station Risk Advisories:
            </div>
            <ul className="text-xs text-amber-200/90 list-disc list-inside space-y-1 pl-1">
              {dietaryProfile.crossContactWarnings.map((warn, i) => (
                <li key={i}>{warn}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Safe Culinary Substitutions Matrix */}
        {dietaryProfile.matchedAllergens.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-surface-border">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block">
              Recommended Culinary Substitutions:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {dietaryProfile.matchedAllergens.map((alg) => {
                const subs = ALLERGEN_SUBSTITUTIONS[alg.id];
                if (!subs) return null;
                return (
                  <div
                    key={alg.id}
                    className="p-3 rounded-lg bg-surface border border-surface-border space-y-1"
                  >
                    <div className="flex items-center gap-1.5 font-bold text-zinc-200">
                      <span>{alg.emoji}</span>
                      <span>{alg.name}</span>
                    </div>
                    <p className="text-zinc-400 text-xs pl-5">
                      {subs.join(' · ')}
                    </p>
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
