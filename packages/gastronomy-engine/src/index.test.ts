// packages/gastronomy-engine/src/index.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

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
} from './index.js';

describe('Modernist Gastronomy Engine — Hydrocolloids & Texturizers', () => {
  it('converts gelatin Bloom mass using square-root formula', () => {
    // 10g Silver (160) to Gold (200) -> 10 * sqrt(160/200) = 8.94g
    const res = convertGelatinBloom(10, 'silver', 'gold');
    assert.equal(res.sourceBloom, 160);
    assert.equal(res.targetBloom, 200);
    assert.equal(res.targetMassGrams, 8.94);
    assert.ok(res.targetMassGrams < res.sourceMassGrams);
  });

  it('calculates agar-agar fluid gel with correct hydration and shear parameters', () => {
    const res = calculateAgarGel(500, 'fluid');
    assert.equal(res.percentage, 0.7);
    assert.equal(res.agarGrams, 3.5);
    assert.equal(res.hydrationTempC, 95);
    assert.ok(res.instructions.some((step) => step.includes('high-shear blender')));
  });

  it('formulates direct spherification and buffers low-pH acidic liquids', () => {
    const res = calculateSpherification('direct', 400, { basePh: 3.6 });
    assert.equal(res.type, 'direct');
    assert.equal(res.baseAlginateGrams, 2.8); // 0.7% of 400g
    assert.equal(res.sodiumCitrateBufferGrams, 1.0); // 0.25% buffer
    assert.ok(res.instructions.some((step) => step.includes('ACIDITY BUFFER ALERT')));
  });

  it('formulates reverse spherification for calcium/dairy/acidic bases', () => {
    const res = calculateSpherification('reverse', 500);
    assert.equal(res.type, 'reverse');
    assert.equal(res.baseCalciumGrams, 10.0); // 2.0%
    assert.equal(res.baseXanthanGrams, 1.0); // 0.2%
    assert.equal(res.bathAlginateGrams, 5.0); // 0.5% in 1000g bath
    assert.ok(res.instructions.some((step) => step.includes('REVERSE ADVANTAGE')));
  });

  it('calculates lecithin air and siphon espuma formulations', () => {
    const air = calculateFoamOrAir(300, 'lecithin_air');
    assert.equal(air.additiveGrams, 1.5); // 0.5%
    assert.equal(air.percentage, 0.5);

    const espuma = calculateFoamOrAir(500, 'siphon_espuma', { siphonCapacityLiters: 0.5 });
    assert.equal(espuma.additiveGrams, 6.0); // 1.2%
    assert.equal(espuma.chargersRequired, 1);
  });
});

describe('Modernist Gastronomy Engine — Thermal Kinetics & Sous-Vide', () => {
  it('calculates Baldwin pasteurization curve for poultry breast safely', () => {
    const res = calculatePasteurizationTime('poultry_breast', 25, 63.5, {
      geometry: 'slab',
      initialTempC: 4.0,
      targetPathogen: 'salmonella',
    });
    assert.equal(res.isSafe, true);
    assert.equal(res.log10Reduction, 6.5);
    assert.ok(res.timeToCoreMinutes > 0);
    assert.ok(res.pasteurizationHoldMinutes > 0);
    assert.equal(res.totalCookTimeMinutes, res.timeToCoreMinutes + res.pasteurizationHoldMinutes);
    assert.equal(res.warnings.length, 0);
  });

  it('warns when water bath is below safe pasteurization threshold', () => {
    const res = calculatePasteurizationTime('beef_tenderloin', 30, 52.0);
    assert.equal(res.isSafe, false);
    assert.ok(res.warnings.some((w) => w.includes('below the 54.4°C')));
  });

  it('profiles protein denaturation states accurately', () => {
    const mediumRare = getProteinDenaturationProfile(56.0, 2, 'beef_tenderloin');
    assert.equal(mediumRare.doneness, 'Medium-Rare');
    assert.ok(mediumRare.myosinState.includes('Completely coagulated'));
    assert.ok(mediumRare.actinState.includes('Native'));

    const wellDoneTough = getProteinDenaturationProfile(72.0, 24, 'beef_tough_cut');
    assert.equal(wellDoneTough.doneness, 'Well-Done / Braised Yield');
    assert.ok(wellDoneTough.collagenConversion.includes('Complete gelatin breakdown'));
  });

  it('predicts exact egg yolk rheological stages', () => {
    const onsen = calculateSousVideEgg(63.0, 45);
    assert.equal(onsen.stage, 'onsen');
    assert.ok(onsen.culinaryApplication.includes('Onsen Tamago'));

    const jammy = calculateSousVideEgg(66.5, 45);
    assert.equal(jammy.stage, 'jammy');
    assert.ok(jammy.culinaryApplication.includes('Ramen eggs'));

    const fudge = calculateSousVideEgg(69.0, 45);
    assert.equal(fudge.stage, 'paste');
  });
});

describe('Modernist Gastronomy Engine — Cryo-Formulation (PAC/POD & Brix)', () => {
  it('evaluates gelato formulation balance for PAC, POD, and Total Solids', () => {
    const recipe = [
      { name: 'Whole Milk', weightGrams: 600, fatPct: 3.5, msnfPct: 8.5, solidsPct: 12.0 },
      { name: 'Heavy Cream', weightGrams: 150, fatPct: 36.0, msnfPct: 5.5, solidsPct: 41.5 },
      { name: 'Skim Milk Powder', weightGrams: 40, msnfPct: 97.0, solidsPct: 97.0 },
      { name: 'Sucrose', weightGrams: 130, sugarType: 'sucrose' as const },
      { name: 'Dextrose', weightGrams: 50, sugarType: 'dextrose' as const },
      { name: 'Glucose DE40', weightGrams: 30, sugarType: 'glucose_de40' as const },
    ];

    const res = calculateFrozenFormulation(recipe, { dessertType: 'gelato' });
    assert.equal(res.totalWeightGrams, 1000);
    // PAC: (130 * 1.0) + (50 * 1.9) + (30 * 0.5) = 130 + 95 + 15 = 240
    assert.ok(res.totalPAC > 200);
    assert.ok(res.totalSolidsPct >= 35.0 && res.totalSolidsPct <= 42.0);
    assert.ok(res.fatPct >= 6.0 && res.fatPct <= 9.0);
  });

  it('balances sorbet Brix with 50/50 simple syrup', () => {
    // 500g raspberry puree at 10 Brix -> target 30 Brix
    const res = balanceSorbetBrix(500, 10.0, 30.0);
    assert.equal(res.finalBrix, 30.0);
    assert.ok(res.simpleSyrup5050GramsToAdd > 0);
  });
});

describe('Modernist Gastronomy Engine — Equilibrium Brining & Nitrite Gates', () => {
  it('calculates closed-system equilibrium brine', () => {
    const res = calculateEquilibriumBrine(1200, 800, { targetSaltPct: 1.5, targetSugarPct: 0.8 });
    assert.equal(res.totalSystemWeightGrams, 2000);
    assert.equal(res.saltWeightGrams, 30.0); // 1.5% of 2000g
    assert.equal(res.sugarWeightGrams, 16.0); // 0.8% of 2000g
    assert.ok(res.instructions.some((s) => s.includes('can never become oversalted')));
  });

  it('calculates USDA FSIS compliant Prague Powder #1 curing salts', () => {
    const res = calculateCuringSalts(1000, 'equilibrium_brine');
    assert.equal(res.cureNumber, 1);
    assert.equal(res.isWithinUsdaLimit, true);
    assert.equal(res.resultingNitritePpm, 156);
    assert.equal(res.cureSaltGrams, 2.5); // standard 0.25% ratio
    assert.ok(res.kosherSaltBalanceGrams > 0);
  });
});

describe('Modernist Gastronomy Engine — Computational Flavor Pairing', () => {
  it('calculates molecular aroma affinity between dark chocolate and blue cheese', () => {
    const res = calculateFlavorAffinity('dark_chocolate', 'blue_cheese');
    assert.ok(res.affinityScore > 40);
    assert.ok(res.sharedVolatiles.includes('tetramethylpyrazine'));
    assert.ok(res.sharedFamilies.includes('pyrazines'));
  });

  it('finds top pairing recommendations for strawberry', () => {
    const pairings = findFlavorPairings('strawberry', 3);
    assert.equal(pairings.length, 3);
    assert.ok(pairings[0]!.score > 0);
  });
});

describe('Modernist Gastronomy Engine — Emulsion & HLB Stability', () => {
  it('evaluates Oil-in-Water emulsion stability and recommends xanthan stabilizer', () => {
    const emulsifiers = [
      { name: 'Modified Lecithin', hlb: 8.0, weightGrams: 5 },
      { name: 'Sodium Caseinate', hlb: 14.0, weightGrams: 5 },
    ];
    const res = calculateEmulsionStability(300, 700, emulsifiers);
    assert.equal(res.emulsionType, 'oil_in_water');
    assert.equal(res.calculatedSystemHLB, 11.0); // average of 8 and 14
    assert.equal(res.isStable, true); // delta from 12 is 1.0 <= 2.5
    assert.ok(res.recommendedXanthanStabilizerGrams > 0);
  });
});
