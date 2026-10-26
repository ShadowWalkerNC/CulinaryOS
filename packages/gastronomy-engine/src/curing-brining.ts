// packages/gastronomy-engine/src/curing-brining.ts
// Mathematical formulation for modernist equilibrium brining and USDA FSIS-compliant curing salt safety gates.

import type {
  CureType,
  EquilibriumBrineResult,
  CuringSaltsResult,
} from './types.js';

const USDA_NITRITE_LIMITS: Record<CureType, number> = {
  dry_cure: 625, // 625 ppm for dry cured items (salumi, country hams)
  immersion_cure: 200, // 200 ppm for immersed/pumped cuts (bacon, pastrami)
  equilibrium_brine: 156, // 156 ppm comminuted/direct equilibrium meats
};

/**
 * Modernist Equilibrium Brining (EQ Brining) formulation.
 * Replaces high-concentration gradient brining with closed-system thermodynamic equilibrium.
 */
export function calculateEquilibriumBrine(
  proteinWeightGrams: number,
  waterWeightGrams: number,
  options?: {
    targetSaltPct?: number; // e.g. 1.5% default
    targetSugarPct?: number; // e.g. 0.75% default
    aromatics?: string[];
  }
): EquilibriumBrineResult {
  if (proteinWeightGrams <= 0) throw new Error('Protein weight must be greater than 0');
  if (waterWeightGrams <= 0) throw new Error('Water weight must be greater than 0');

  const targetSaltPct = options?.targetSaltPct ?? 1.5;
  const targetSugarPct = options?.targetSugarPct ?? 0.75;
  const totalSystemWeightGrams = proteinWeightGrams + waterWeightGrams;

  const saltWeightGrams = Math.round(((totalSystemWeightGrams * targetSaltPct) / 100) * 10) / 10;
  const sugarWeightGrams = Math.round(((totalSystemWeightGrams * targetSugarPct) / 100) * 10) / 10;

  // Approximate diffusion time: ~12 hours per 25mm thickness; baseline 24 hours for average roasts
  const minCureHours = proteinWeightGrams > 2000 ? 48 : proteinWeightGrams > 800 ? 24 : 12;

  const aromaticsList = options?.aromatics && options.aromatics.length > 0
    ? options.aromatics.join(', ')
    : 'Cracked black peppercorns, fresh bay leaves, crushed garlic';

  const instructions = [
    `Combine ${waterWeightGrams}g cold water with ${saltWeightGrams}g fine sea salt (${targetSaltPct}%) and ${sugarWeightGrams}g sugar (${targetSugarPct}%). Whisk until completely dissolved.`,
    `Add aromatics: ${aromaticsList}.`,
    `Submerge ${proteinWeightGrams}g protein completely into the brine inside a sealed vacuum bag or food-grade container.`,
    `Hold in refrigerated storage (2°C–4°C) for at least ${minCureHours} hours until osmotic equilibrium is reached.`,
    '[MODERNIST EQ PRINCIPLE] Unlike traditional high-salinity brines, this product can never become oversalted regardless of soak duration because the system equilibrates at exactly ' +
      `${targetSaltPct}% salinity throughout.`,
  ];

  return {
    proteinWeightGrams,
    waterWeightGrams,
    targetSaltPct,
    targetSugarPct,
    saltWeightGrams,
    sugarWeightGrams,
    totalSystemWeightGrams,
    minCureHours,
    instructions,
  };
}

/**
 * USDA FSIS 9 CFR § 424.21 Curing Salts & Nitrite Safety Audit.
 * Calculates exact Prague Powder #1 / #2 mass and verifies ingoing nitrite parts-per-million (PPM).
 */
export function calculateCuringSalts(
  meatWeightGrams: number,
  cureType: CureType,
  options?: {
    cureNumber?: 1 | 2;
    customPpm?: number;
    targetTotalSaltPct?: number; // e.g. 2.0% total salt in finished cure
  }
): CuringSaltsResult {
  if (meatWeightGrams <= 0) throw new Error('Meat weight must be greater than 0');

  const maxAllowedPpm = USDA_NITRITE_LIMITS[cureType];
  const cureNumber = options?.cureNumber ?? (cureType === 'dry_cure' ? 2 : 1);
  const targetPpm = options?.customPpm ?? Math.min(156, maxAllowedPpm);
  const targetTotalSaltPct = options?.targetTotalSaltPct ?? 2.0;

  // Prague Powder #1: 6.25% NaNO2 + 93.75% NaCl
  // Prague Powder #2: 6.25% NaNO2 + 4.0% NaNO3 + 89.75% NaCl
  // Formula: cureSaltGrams = (targetPpm * meatWeightGrams) / 62,500
  const cureSaltGrams = Math.round(((targetPpm * meatWeightGrams) / 62500) * 100) / 100;
  const sodiumNitriteGrams = Math.round((cureSaltGrams * 0.0625) * 1000) / 1000;
  const resultingNitritePpm = Math.round((sodiumNitriteGrams / meatWeightGrams) * 1000000);

  const isWithinUsdaLimit = resultingNitritePpm <= maxAllowedPpm;

  // Salt balancing: Subtract salt already contained in Prague Powder from target total salt
  const saltContainedInCure = cureSaltGrams * (cureNumber === 2 ? 0.8975 : 0.9375);
  const totalSaltGrams = (meatWeightGrams * targetTotalSaltPct) / 100;
  const kosherSaltBalanceGrams = Math.max(0, Math.round((totalSaltGrams - saltContainedInCure) * 10) / 10);

  const instructions = [
    `Weigh exactly ${cureSaltGrams}g of Prague Powder #${cureNumber} (yields ${resultingNitritePpm} ppm ingoing NaNO2).`,
    `Weigh ${kosherSaltBalanceGrams}g of non-iodized kosher salt to reach the target ${targetTotalSaltPct}% total salinity.`,
    'Blend curing salts thoroughly with kosher salt, sugars, and spices before applying evenly to meat surfaces.',
    cureNumber === 1
      ? 'Cure #1 contains 6.25% sodium nitrite for fast-cooked/smoked items (bacon, hams, sausages).'
      : 'Cure #2 contains 6.25% sodium nitrite and 4.0% sodium nitrate for extended dry-cured charcuterie (salami, lonzino, coppa) lasting >30 days.',
  ];

  if (!isWithinUsdaLimit) {
    instructions.unshift(
      `[USDA SAFETY VIOLATION] Resulting nitrite ${resultingNitritePpm} PPM exceeds maximum legal threshold of ${maxAllowedPpm} PPM.`
    );
  }

  return {
    meatWeightGrams,
    cureType,
    cureNumber,
    cureSaltGrams,
    sodiumNitriteGrams,
    resultingNitritePpm,
    maxAllowedPpm,
    isWithinUsdaLimit,
    kosherSaltBalanceGrams,
    instructions,
  };
}
