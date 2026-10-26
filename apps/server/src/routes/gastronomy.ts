// ============================================================
// CulinaryOS — Modernist Gastronomy & Food Science API
// Hydrocolloids, Sous-Vide Baldwin Curves, PAC/POD, Equilibrium Brines, Molecular Pairing
// ============================================================

import { Hono } from 'hono';
import { requireTenant, ok, err } from '../middleware/auth.js';
import {
  convertGelatinBloom,
  calculateAgarGel,
  calculateSpherification,
  calculateFoamOrAir,
  calculatePasteurizationTime,
  getProteinDenaturationProfile,
  calculateSousVideEgg,
  calculateFrozenFormulation,
  balanceSorbetBrix,
  calculateEquilibriumBrine,
  calculateCuringSalts,
  calculateFlavorAffinity,
  findFlavorPairings,
  calculateEmulsionStability,
  FLAVOR_DATABASE,
  SUGAR_DATABASE,
  BLOOM_GRADE_VALUES,
} from '@culinaryos/gastronomy-engine';
import type { Env } from '../types.js';

export const gastronomyRoutes = new Hono<Env>();
gastronomyRoutes.use('*', requireTenant);

// 1. Gelatin Bloom Inversion Conversion
gastronomyRoutes.post('/gelatin/bloom', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const { massGrams, fromBloom, toBloom } = body;
    if (typeof massGrams !== 'number' || massGrams <= 0) {
      return err(c, 'INVALID_INPUT', 'massGrams must be a positive number', 400);
    }
    if (!fromBloom || !toBloom) {
      return err(c, 'INVALID_INPUT', 'fromBloom and toBloom are required (grade or number)', 400);
    }
    const result = convertGelatinBloom(massGrams, fromBloom, toBloom);
    return ok(c, result);
  } catch (error: any) {
    return err(c, 'CALCULATION_ERROR', error.message, 400);
  }
});

// 2. Agar-Agar Formulation
gastronomyRoutes.post('/agar', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const { liquidMassGrams, texture } = body;
    if (typeof liquidMassGrams !== 'number' || liquidMassGrams <= 0) {
      return err(c, 'INVALID_INPUT', 'liquidMassGrams must be a positive number', 400);
    }
    if (!['soft', 'fluid', 'firm', 'brittle'].includes(texture)) {
      return err(c, 'INVALID_INPUT', 'texture must be soft, fluid, firm, or brittle', 400);
    }
    const result = calculateAgarGel(liquidMassGrams, texture);
    return ok(c, result);
  } catch (error: any) {
    return err(c, 'CALCULATION_ERROR', error.message, 400);
  }
});

// 3. Spherification Formulator
gastronomyRoutes.post('/spherification', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const { type, liquidBaseGrams, basePh, settingBathWaterGrams } = body;
    if (!['direct', 'reverse', 'frozen_reverse'].includes(type)) {
      return err(c, 'INVALID_INPUT', 'type must be direct, reverse, or frozen_reverse', 400);
    }
    if (typeof liquidBaseGrams !== 'number' || liquidBaseGrams <= 0) {
      return err(c, 'INVALID_INPUT', 'liquidBaseGrams must be a positive number', 400);
    }
    const opts: { basePh?: number; settingBathWaterGrams?: number } = {};
    if (typeof basePh === 'number') opts.basePh = basePh;
    if (typeof settingBathWaterGrams === 'number') opts.settingBathWaterGrams = settingBathWaterGrams;
    const result = calculateSpherification(type, liquidBaseGrams, opts);
    return ok(c, result);
  } catch (error: any) {
    return err(c, 'CALCULATION_ERROR', error.message, 400);
  }
});

// 4. Foams & Airs Calculator
gastronomyRoutes.post('/foams', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const { liquidMassGrams, type, siphonCapacityLiters } = body;
    if (typeof liquidMassGrams !== 'number' || liquidMassGrams <= 0) {
      return err(c, 'INVALID_INPUT', 'liquidMassGrams must be a positive number', 400);
    }
    if (!['lecithin_air', 'siphon_espuma'].includes(type)) {
      return err(c, 'INVALID_INPUT', 'type must be lecithin_air or siphon_espuma', 400);
    }
    const result = calculateFoamOrAir(liquidMassGrams, type, { siphonCapacityLiters });
    return ok(c, result);
  } catch (error: any) {
    return err(c, 'CALCULATION_ERROR', error.message, 400);
  }
});

// 5. Sous-Vide Pasteurization & Baldwin Pathogen Reduction
gastronomyRoutes.post('/sous-vide/pasteurize', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const { protein, thicknessMm, bathTempC, initialTempC, geometry, targetPathogen } = body;
    if (!protein || typeof thicknessMm !== 'number' || typeof bathTempC !== 'number') {
      return err(c, 'INVALID_INPUT', 'protein, thicknessMm, and bathTempC are required numbers', 400);
    }
    const result = calculatePasteurizationTime(protein, thicknessMm, bathTempC, {
      initialTempC,
      geometry,
      targetPathogen,
    });
    return ok(c, result);
  } catch (error: any) {
    return err(c, 'CALCULATION_ERROR', error.message, 400);
  }
});

// 6. Protein Denaturation State Profiler
gastronomyRoutes.post('/sous-vide/denaturation', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const { bathTempC, cookHours, protein } = body;
    if (typeof bathTempC !== 'number' || typeof cookHours !== 'number' || !protein) {
      return err(c, 'INVALID_INPUT', 'bathTempC, cookHours, and protein are required', 400);
    }
    const result = getProteinDenaturationProfile(bathTempC, cookHours, protein);
    return ok(c, result);
  } catch (error: any) {
    return err(c, 'CALCULATION_ERROR', error.message, 400);
  }
});

// 7. Sous-Vide Egg Precision Yolk Stage Predictor
gastronomyRoutes.post('/sous-vide/egg', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const { bathTempC, cookMinutes } = body;
    if (typeof bathTempC !== 'number' || typeof cookMinutes !== 'number') {
      return err(c, 'INVALID_INPUT', 'bathTempC and cookMinutes are required', 400);
    }
    const result = calculateSousVideEgg(bathTempC, cookMinutes);
    return ok(c, result);
  } catch (error: any) {
    return err(c, 'CALCULATION_ERROR', error.message, 400);
  }
});

// 8. Gelato & Frozen Dessert PAC/POD Balancer
gastronomyRoutes.post('/frozen/balance', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const { ingredients, dessertType, targetServingTempC } = body;
    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      return err(c, 'INVALID_INPUT', 'ingredients must be a non-empty array', 400);
    }
    const result = calculateFrozenFormulation(ingredients, {
      dessertType,
      targetServingTempC,
    });
    return ok(c, result);
  } catch (error: any) {
    return err(c, 'CALCULATION_ERROR', error.message, 400);
  }
});

// 9. Sorbet Refractometer Brix Balancer
gastronomyRoutes.post('/frozen/sorbet-brix', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const { fruitPureeWeightGrams, initialBrix, targetBrix } = body;
    if (typeof fruitPureeWeightGrams !== 'number' || typeof initialBrix !== 'number') {
      return err(c, 'INVALID_INPUT', 'fruitPureeWeightGrams and initialBrix are required', 400);
    }
    const result = balanceSorbetBrix(fruitPureeWeightGrams, initialBrix, targetBrix);
    return ok(c, result);
  } catch (error: any) {
    return err(c, 'CALCULATION_ERROR', error.message, 400);
  }
});

// 10. Equilibrium Brine Formulation
gastronomyRoutes.post('/brining/equilibrium', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const { proteinWeightGrams, waterWeightGrams, targetSaltPct, targetSugarPct, aromatics } = body;
    if (typeof proteinWeightGrams !== 'number' || typeof waterWeightGrams !== 'number') {
      return err(c, 'INVALID_INPUT', 'proteinWeightGrams and waterWeightGrams are required', 400);
    }
    const result = calculateEquilibriumBrine(proteinWeightGrams, waterWeightGrams, {
      targetSaltPct,
      targetSugarPct,
      aromatics,
    });
    return ok(c, result);
  } catch (error: any) {
    return err(c, 'CALCULATION_ERROR', error.message, 400);
  }
});

// 11. Curing Salts USDA Nitrite Safety Verification
gastronomyRoutes.post('/curing/salts', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const { meatWeightGrams, cureType, cureNumber, customPpm, targetTotalSaltPct } = body;
    if (typeof meatWeightGrams !== 'number' || !cureType) {
      return err(c, 'INVALID_INPUT', 'meatWeightGrams and cureType are required', 400);
    }
    const result = calculateCuringSalts(meatWeightGrams, cureType, {
      cureNumber,
      customPpm,
      targetTotalSaltPct,
    });
    return ok(c, result);
  } catch (error: any) {
    return err(c, 'CALCULATION_ERROR', error.message, 400);
  }
});

// 12. Computational Molecular Flavor Affinity
gastronomyRoutes.post('/flavor/affinity', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const { ingredientA, ingredientB } = body;
    if (!ingredientA || !ingredientB) {
      return err(c, 'INVALID_INPUT', 'ingredientA and ingredientB are required', 400);
    }
    const result = calculateFlavorAffinity(ingredientA, ingredientB);
    return ok(c, result);
  } catch (error: any) {
    return err(c, 'CALCULATION_ERROR', error.message, 400);
  }
});

// 13. Top Companion Flavor Pairings
gastronomyRoutes.post('/flavor/pairings', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const { ingredient, limit } = body;
    if (!ingredient) {
      return err(c, 'INVALID_INPUT', 'ingredient is required', 400);
    }
    const result = findFlavorPairings(ingredient, typeof limit === 'number' ? limit : 5);
    return ok(c, result);
  } catch (error: any) {
    return err(c, 'CALCULATION_ERROR', error.message, 400);
  }
});

// 14. Culinary Emulsion Stability & HLB
gastronomyRoutes.post('/emulsions/stability', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const { oilPhaseGrams, waterPhaseGrams, emulsifiers } = body;
    if (typeof oilPhaseGrams !== 'number' || typeof waterPhaseGrams !== 'number' || !Array.isArray(emulsifiers)) {
      return err(c, 'INVALID_INPUT', 'oilPhaseGrams, waterPhaseGrams, and emulsifiers array are required', 400);
    }
    const result = calculateEmulsionStability(oilPhaseGrams, waterPhaseGrams, emulsifiers);
    return ok(c, result);
  } catch (error: any) {
    return err(c, 'CALCULATION_ERROR', error.message, 400);
  }
});

// 15. Science Catalog & Reference Database
gastronomyRoutes.get('/catalog', (c) => {
  return ok(c, {
    gelatinBloomGrades: BLOOM_GRADE_VALUES,
    sugars: Object.keys(SUGAR_DATABASE),
    flavorProfiles: Object.keys(FLAVOR_DATABASE).map((key) => ({
      key,
      name: FLAVOR_DATABASE[key]!.name,
      category: FLAVOR_DATABASE[key]!.category,
      chemicalFamilies: FLAVOR_DATABASE[key]!.families,
    })),
  });
});
