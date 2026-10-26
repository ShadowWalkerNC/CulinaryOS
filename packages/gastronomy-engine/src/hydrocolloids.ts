// packages/gastronomy-engine/src/hydrocolloids.ts
// Mathematical formulation and reaction kinetics for hydrocolloids, gelling agents, and spherification.

import type {
  BloomConversionResult,
  GelatinBloomGrade,
  SpherificationType,
  SpherificationPlan,
  AgarGelPlan,
} from './types.js';

export const BLOOM_GRADE_VALUES: Record<GelatinBloomGrade, number> = {
  bronze: 140,
  silver: 160,
  gold: 200,
  platinum: 250,
};

export const SHEET_WEIGHT_ESTIMATES: Record<GelatinBloomGrade, number> = {
  bronze: 3.3,
  silver: 2.5,
  gold: 2.0,
  platinum: 1.7,
};

function resolveBloomValue(bloom: number | GelatinBloomGrade): number {
  if (typeof bloom === 'number') {
    if (bloom <= 0) throw new Error('Bloom value must be greater than 0');
    return bloom;
  }
  const val = BLOOM_GRADE_VALUES[bloom];
  if (!val) throw new Error(`Unknown gelatin bloom grade: ${bloom}`);
  return val;
}

/**
 * Convert gelatin mass across Bloom strengths using the Mass Bloom Square-Root Inversion Formula:
 * m2 = m1 * sqrt(Bloom1 / Bloom2)
 */
export function convertGelatinBloom(
  massGrams: number,
  fromBloom: number | GelatinBloomGrade,
  toBloom: number | GelatinBloomGrade
): BloomConversionResult {
  if (massGrams <= 0) throw new Error('Mass must be greater than 0');
  const b1 = resolveBloomValue(fromBloom);
  const b2 = resolveBloomValue(toBloom);

  const targetMassGrams = Math.round((massGrams * Math.sqrt(b1 / b2)) * 100) / 100;

  // Approximate sheet counts if standard grades
  const fromGrade = typeof fromBloom === 'string' ? fromBloom : 'silver';
  const toGrade = typeof toBloom === 'string' ? toBloom : 'silver';
  const sourceSheetsEstimate = Math.round((massGrams / SHEET_WEIGHT_ESTIMATES[fromGrade]) * 10) / 10;
  const targetSheetsEstimate = Math.round((targetMassGrams / SHEET_WEIGHT_ESTIMATES[toGrade]) * 10) / 10;

  return {
    sourceBloom: b1,
    targetBloom: b2,
    sourceMassGrams: massGrams,
    targetMassGrams,
    sourceSheetsEstimate,
    targetSheetsEstimate,
  };
}

/**
 * Calculate agar-agar formulation based on desired gel texture and thermal hysteresis parameters.
 */
export function calculateAgarGel(
  liquidMassGrams: number,
  texture: 'soft' | 'fluid' | 'firm' | 'brittle'
): AgarGelPlan {
  if (liquidMassGrams <= 0) throw new Error('Liquid mass must be greater than 0');

  const percentageMap = {
    soft: 0.3,
    fluid: 0.7,
    firm: 1.2,
    brittle: 1.8,
  };

  const percentage = percentageMap[texture];
  const agarGrams = Math.round(((liquidMassGrams * percentage) / 100) * 100) / 100;

  const instructions = [
    `Disperse ${agarGrams}g of agar-agar powder (${percentage}%) into ${liquidMassGrams}g cold liquid using an immersion blender.`,
    'Bring mixture to a vigorous rolling boil (minimum 95°C–100°C) while stirring continuously for 2 to 3 minutes to achieve complete hydration.',
    'Pour into mold or hotel pan. Mixture will initiate gelling as it cools through 35°C–40°C.',
  ];

  if (texture === 'fluid') {
    instructions.push(
      'Once fully chilled and set (minimum 1 hour at 4°C), cut into cubes and blend in a high-shear blender (Vitamix) on high speed for 90 seconds until perfectly glossy and shear-thinned.'
    );
  }

  return {
    liquidMassGrams,
    texture,
    agarGrams,
    percentage,
    hydrationTempC: 95,
    gellingTempC: 38,
    meltingTempC: 85,
    instructions,
  };
}

/**
 * Precision molecular spherification formulation (Direct, Reverse, or Frozen Reverse).
 */
export function calculateSpherification(
  type: SpherificationType,
  liquidBaseGrams: number,
  options?: {
    basePh?: number;
    baseCalciumMgPerL?: number;
    settingBathWaterGrams?: number;
  }
): SpherificationPlan {
  if (liquidBaseGrams <= 0) throw new Error('Liquid base mass must be greater than 0');
  const ph = options?.basePh ?? 5.5;
  const bathWater = options?.settingBathWaterGrams ?? 1000;

  let baseAlginate = 0;
  let baseCalcium = 0;
  let baseXanthan = 0;
  let bufferGrams = 0;
  let bathAlginate = 0;
  let bathCalcium = 0;
  let submersionSec = 120;
  const instructions: string[] = [];

  if (type === 'direct') {
    // Direct Spherification: Alginate in base (0.6% - 0.8%), Calcium in bath (1.5% - 2.0%)
    baseAlginate = Math.round(((liquidBaseGrams * 0.7) / 100) * 100) / 100;
    bathCalcium = Math.round(((bathWater * 1.5) / 100) * 100) / 100;
    submersionSec = 120;

    instructions.push(
      `Blend ${baseAlginate}g Sodium Alginate (0.7%) into ${liquidBaseGrams}g base liquid with immersion blender. Rest 4-12 hours in cooler to de-aerate.`
    );

    if (ph < 4.5) {
      // Buffer required: Sodium Citrate (0.25% of base)
      bufferGrams = Math.round(((liquidBaseGrams * 0.25) / 100) * 100) / 100;
      instructions.push(
        `[ACIDITY BUFFER ALERT] Base pH is ${ph} (below 4.5 threshold). Add ${bufferGrams}g Sodium Citrate to prevent premature alginic acid precipitation.`
      );
    }

    instructions.push(
      `Dissolve ${bathCalcium}g Calcium Lactate Gluconate (1.5%) into ${bathWater}g distilled or low-calcium water to create the setting bath.`
    );
    instructions.push(
      'Drop base liquid by syringe or hemispherical spoon into the bath. Gently stir bath for 2 minutes.'
    );
    instructions.push(
      'Remove with perforated spoon, rinse in clean water bath, and serve immediately (membrane continues gelling inward).'
    );
  } else {
    // Reverse or Frozen Reverse Spherification: Calcium in base (2.0%), Alginate in bath (0.5%)
    baseCalcium = Math.round(((liquidBaseGrams * 2.0) / 100) * 100) / 100;
    bathAlginate = Math.round(((bathWater * 0.5) / 100) * 100) / 100;
    // Add 0.2% Xanthan gum to base for viscosity matching if needed
    baseXanthan = Math.round(((liquidBaseGrams * 0.2) / 100) * 100) / 100;
    submersionSec = 150;

    instructions.push(
      `Dissolve ${baseCalcium}g Calcium Lactate Gluconate (2.0%) and ${baseXanthan}g Xanthan Gum (0.2%) into ${liquidBaseGrams}g base liquid until smooth.`
    );
    instructions.push(
      `Dissolve ${bathAlginate}g Sodium Alginate (0.5%) into ${bathWater}g cold distilled water (<50ppm calcium). Rest 6 hours to clear all air bubbles.`
    );

    if (type === 'frozen_reverse') {
      instructions.push(
        'Freeze base liquid into silicone hemisphere molds at -18°C. Drop frozen spheres directly into the 0.5% alginate bath.'
      );
      submersionSec = 180;
    } else {
      instructions.push('Gently submerge spheres using a dosing spoon into the alginate setting bath.');
    }

    instructions.push(
      `Submerge for ${submersionSec / 60} minutes with gentle movement. Rinse thoroughly in clean water bath.`
    );
    instructions.push(
      '[REVERSE ADVANTAGE] Reaction terminates upon water rinse. Spheres can be held in flavored aromatic bath or neutral oil for 48+ hours without gelling solid.'
    );
  }

  return {
    type,
    liquidBaseGrams,
    liquidBasePh: ph,
    baseAlginateGrams: baseAlginate,
    baseCalciumGrams: baseCalcium,
    baseXanthanGrams: baseXanthan,
    sodiumCitrateBufferGrams: bufferGrams,
    settingBathWaterGrams: bathWater,
    bathAlginateGrams: bathAlginate,
    bathCalciumGrams: bathCalcium,
    submersionTimeSeconds: submersionSec,
    instructions,
  };
}

/**
 * Precision culinary foam and air calculator (Lecithin airs vs Siphon Espumas).
 */
export function calculateFoamOrAir(
  liquidMassGrams: number,
  type: 'lecithin_air' | 'siphon_espuma',
  options?: { siphonCapacityLiters?: number }
): {
  additiveName: string;
  additiveGrams: number;
  percentage: number;
  chargersRequired?: number;
  instructions: string[];
} {
  if (liquidMassGrams <= 0) throw new Error('Liquid mass must be greater than 0');

  if (type === 'lecithin_air') {
    const percentage = 0.5; // 0.5% Soy/Sunflower Lecithin
    const grams = Math.round(((liquidMassGrams * percentage) / 100) * 100) / 100;
    return {
      additiveName: 'Soy/Sunflower Lecithin',
      additiveGrams: grams,
      percentage,
      instructions: [
        `Disperse ${grams}g Lecithin (${percentage}%) into ${liquidMassGrams}g liquid at room temp (20°C–40°C).`,
        'Position immersion blender head tilted half-in and half-out of the liquid surface to pull air into the liquid.',
        'Blend on high speed for 60 seconds until a voluminous, stable aromatic air collects on top.',
        'Allow foam to stabilize for 1 minute before scooping the airy top layer onto the plate.',
      ],
    };
  }

  // Siphon Espuma (Gelatin-stabilized warm or cold foam)
  const capacity = options?.siphonCapacityLiters ?? 0.5;
  const percentage = 1.2; // 1.2% Gelatin (Gold 200 Bloom)
  const grams = Math.round(((liquidMassGrams * percentage) / 100) * 100) / 100;
  const chargers = capacity <= 0.5 ? 1 : 2;

  return {
    additiveName: 'Gelatin (Gold 200 Bloom)',
    additiveGrams: grams,
    percentage,
    chargersRequired: chargers,
    instructions: [
      `Bloom and dissolve ${grams}g Gelatin into ${liquidMassGrams}g warm base liquid (50°C–60°C). Strain through fine chinois.`,
      `Pour into ${capacity}L whipping siphon, seal tightly, and charge with ${chargers} cartridge(s) of N2O.`,
      'Shake vigorously 10-15 times. Chill in ice bath or refrigerator for at least 2 hours.',
      'Dispense upside down at 90° angle onto chilled or room-temperature culinary elements.',
    ],
  };
}
