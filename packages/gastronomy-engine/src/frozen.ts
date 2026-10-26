// packages/gastronomy-engine/src/frozen.ts
// Mathematical models for cryo-gastronomy, gelato formulation, PAC/POD balancing, and Brix optimization.

import type {
  SugarType,
  FrozenDessertType,
  FrozenIngredient,
  FrozenFormulationResult,
  SorbetBrixBalanceResult,
} from './types.js';

interface SugarProperty {
  pac: number; // Anti-freezing power relative to sucrose = 100
  pod: number; // Sweetening power relative to sucrose = 100
  solidsPct: number;
}

export const SUGAR_DATABASE: Record<SugarType, SugarProperty> = {
  sucrose: { pac: 100, pod: 100, solidsPct: 100 },
  dextrose: { pac: 190, pod: 70, solidsPct: 91 },
  fructose: { pac: 190, pod: 140, solidsPct: 100 },
  glucose_de40: { pac: 50, pod: 40, solidsPct: 80 },
  glucose_de60: { pac: 70, pod: 60, solidsPct: 80 },
  invert_sugar: { pac: 190, pod: 130, solidsPct: 77 },
  maltodextrin_de18: { pac: 20, pod: 15, solidsPct: 95 },
  erythritol: { pac: 280, pod: 70, solidsPct: 100 },
  alcohol_100abv: { pac: 330, pod: 0, solidsPct: 0 },
};

/**
 * Balance and evaluate a gelato, ice cream, or sorbet formulation across PAC, POD, Total Solids, Fat, and MSNF.
 */
export function calculateFrozenFormulation(
  ingredients: FrozenIngredient[],
  options?: {
    dessertType?: FrozenDessertType;
    targetServingTempC?: number;
  }
): FrozenFormulationResult {
  if (ingredients.length === 0) throw new Error('Recipe must contain at least one ingredient');
  const dessertType = options?.dessertType ?? 'gelato';
  const targetServingTempC = options?.targetServingTempC ?? (dessertType === 'sorbet' ? -12 : -11);

  let totalWeightGrams = 0;
  let totalPAC = 0;
  let totalPOD = 0;
  let totalSolidsGrams = 0;
  let totalFatGrams = 0;
  let totalMsnfGrams = 0;

  for (const ing of ingredients) {
    if (ing.weightGrams <= 0) continue;
    totalWeightGrams += ing.weightGrams;

    // Sugar properties
    if (ing.sugarType) {
      const prop = SUGAR_DATABASE[ing.sugarType];
      const sugarMass = ing.weightGrams;
      totalPAC += (sugarMass * prop.pac) / 100;
      totalPOD += (sugarMass * prop.pod) / 100;
      totalSolidsGrams += (sugarMass * prop.solidsPct) / 100;
    } else {
      if (ing.solidsPct) {
        totalSolidsGrams += (ing.weightGrams * ing.solidsPct) / 100;
      }
    }

    if (ing.fatPct) {
      totalFatGrams += (ing.weightGrams * ing.fatPct) / 100;
    }
    if (ing.msnfPct) {
      totalMsnfGrams += (ing.weightGrams * ing.msnfPct) / 100;
    }
    if (ing.alcoholAbv) {
      // Alcohol contributes strong PAC (330 per 100g pure ethanol)
      const pureAlcoholGrams = (ing.weightGrams * ing.alcoholAbv) / 100;
      totalPAC += (pureAlcoholGrams * SUGAR_DATABASE.alcohol_100abv.pac) / 100;
    }
  }

  if (totalWeightGrams === 0) throw new Error('Total recipe weight cannot be zero');

  const pacPercentage = Math.round(((totalPAC / totalWeightGrams) * 100) * 10) / 10;
  const podPercentage = Math.round(((totalPOD / totalWeightGrams) * 100) * 10) / 10;
  const totalSolidsPct = Math.round(((totalSolidsGrams / totalWeightGrams) * 100) * 10) / 10;
  const fatPct = Math.round(((totalFatGrams / totalWeightGrams) * 100) * 10) / 10;
  const msnfPct = Math.round(((totalMsnfGrams / totalWeightGrams) * 100) * 10) / 10;

  // Approximate initial freezing point in °C
  const estimatedFreezingPointC = Math.round((- (pacPercentage * 0.08) - 0.5) * 10) / 10;

  const diagnostics: string[] = [];
  let isBalanced = true;

  // Benchmark validations
  if (dessertType === 'gelato') {
    if (pacPercentage < 25.0 || pacPercentage > 30.0) {
      isBalanced = false;
      diagnostics.push(
        `PAC is ${pacPercentage}%. Optimal Italian gelato PAC is 26%–29% for display cabinets at -11°C.`
      );
    }
    if (totalSolidsPct < 35.0 || totalSolidsPct > 42.0) {
      isBalanced = false;
      diagnostics.push(`Total Solids is ${totalSolidsPct}%. Target is 36%–40% for creamy texture without icy grain.`);
    }
    if (fatPct < 5.0 || fatPct > 10.0) {
      diagnostics.push(`Milk Fat is ${fatPct}%. Authentic artisanal gelato typically maintains 6%–9% fat.`);
    }
  } else if (dessertType === 'sorbet') {
    if (pacPercentage < 27.0 || pacPercentage > 32.0) {
      isBalanced = false;
      diagnostics.push(
        `Sorbet PAC is ${pacPercentage}%. Target 28%–31% to prevent rock-hard crystallization at -12°C.`
      );
    }
    if (totalSolidsPct < 28.0 || totalSolidsPct > 34.0) {
      isBalanced = false;
      diagnostics.push(`Sorbet Solids is ${totalSolidsPct}%. Optimal target is 29%–32% Brix.`);
    }
    if (fatPct > 0.5) {
      diagnostics.push('Sorbet contains fat; sorbets should traditionally be dairy-free and fat-free.');
    }
  } else if (dessertType === 'ice_cream') {
    if (pacPercentage < 24.0 || pacPercentage > 28.0) {
      diagnostics.push(`Ice cream PAC is ${pacPercentage}%. Standard range is 24%–27% for -14°C deep freeze.`);
    }
    if (fatPct < 10.0 || fatPct > 18.0) {
      diagnostics.push(`Fat is ${fatPct}%. American premium ice cream requires minimum 10%–16% butterfat.`);
    }
  }

  return {
    dessertType,
    totalWeightGrams: Math.round(totalWeightGrams),
    totalPAC: Math.round(totalPAC * 10) / 10,
    pacPercentage,
    totalPOD: Math.round(totalPOD * 10) / 10,
    podPercentage,
    totalSolidsPct,
    fatPct,
    msnfPct,
    estimatedFreezingPointC,
    recommendedServingTempC: targetServingTempC,
    isBalanced,
    diagnostics,
  };
}

/**
 * Balance fruit purée Brix to reach target sorbet density (default 30° Brix) using 50° Brix simple syrup (1:1 sugar/water).
 */
export function balanceSorbetBrix(
  fruitPureeWeightGrams: number,
  initialBrix: number,
  targetBrix = 30.0
): SorbetBrixBalanceResult {
  if (fruitPureeWeightGrams <= 0) throw new Error('Fruit purée weight must be greater than 0');
  if (initialBrix < 0 || initialBrix > 70) throw new Error('Brix must be between 0 and 70');

  const syrupBrix = 50.0; // Standard 1:1 simple syrup (50% sucrose)
  let syrupGrams = 0;
  let waterGrams = 0;

  if (initialBrix < targetBrix) {
    // Need to add syrup: m_s = m_p * (B_target - B_p) / (B_s - B_target)
    syrupGrams = Math.round(
      (fruitPureeWeightGrams * (targetBrix - initialBrix)) / (syrupBrix - targetBrix)
    );
  } else if (initialBrix > targetBrix) {
    // Dilute with water: m_w = m_p * (B_p - B_target) / B_target
    waterGrams = Math.round((fruitPureeWeightGrams * (initialBrix - targetBrix)) / targetBrix);
  }

  const finalTotalWeight = fruitPureeWeightGrams + syrupGrams + waterGrams;
  const sugarFromPuree = (fruitPureeWeightGrams * initialBrix) / 100;
  const sugarFromSyrup = (syrupGrams * syrupBrix) / 100;
  const finalSugarWeight = sugarFromPuree + sugarFromSyrup;
  const finalBrix = Math.round(((finalSugarWeight / finalTotalWeight) * 100) * 10) / 10;
  const finalPAC = Math.round((finalSugarWeight / finalTotalWeight) * 100 * 10) / 10;

  return {
    fruitPureeWeightGrams,
    initialBrix,
    targetBrix,
    simpleSyrup5050GramsToAdd: syrupGrams,
    waterGramsToAdd: waterGrams,
    finalBrix,
    finalPAC,
  };
}
