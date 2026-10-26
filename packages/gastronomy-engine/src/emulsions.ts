// packages/gastronomy-engine/src/emulsions.ts
// Mathematical formulation for culinary emulsions, Hydrophilic-Lipophilic Balance (HLB), and kinetic stabilization.

export interface EmulsifierComponent {
  name: string;
  hlb: number;
  weightGrams: number;
}

export interface EmulsionResult {
  oilPhaseGrams: number;
  waterPhaseGrams: number;
  oilPercentage: number;
  waterPercentage: number;
  emulsionType: 'oil_in_water' | 'water_in_oil';
  targetHLB: number;
  calculatedSystemHLB: number;
  isStable: boolean;
  recommendedXanthanStabilizerGrams: number;
  instructions: string[];
}

export const COMMON_EMULSIFIERS: Record<string, { hlb: number; description: string }> = {
  lecithin_soy: { hlb: 4.0, description: 'Soy Lecithin (Lipophilic, ideal for airs and W/O)' },
  lecithin_modified: { hlb: 8.0, description: 'Enzyme-modified Lecithin (O/W)' },
  mono_diglycerides: { hlb: 3.8, description: 'Glycerol monostearate (Ice cream fat network)' },
  polysorbate_60: { hlb: 14.9, description: 'Hydrophilic surfactant' },
  sodium_caseinate: { hlb: 14.0, description: 'Dairy protein emulsifier' },
  gum_arabic: { hlb: 8.5, description: 'Acacia gum for oil encapsulation' },
};

/**
 * Calculate system HLB and kinetic shear requirements for culinary emulsions.
 */
export function calculateEmulsionStability(
  oilPhaseGrams: number,
  waterPhaseGrams: number,
  emulsifiers: EmulsifierComponent[]
): EmulsionResult {
  if (oilPhaseGrams <= 0 || waterPhaseGrams <= 0) {
    throw new Error('Both oil and water phase weights must be greater than zero');
  }

  const totalMass = oilPhaseGrams + waterPhaseGrams;
  const oilPercentage = Math.round((oilPhaseGrams / totalMass) * 100 * 10) / 10;
  const waterPercentage = Math.round((waterPhaseGrams / totalMass) * 100 * 10) / 10;

  // Traditional rule: if water > 40% and oil dispersed, typically Oil-in-Water (O/W)
  const emulsionType = oilPercentage > 75 ? 'water_in_oil' : 'oil_in_water';
  const targetHLB = emulsionType === 'oil_in_water' ? 12.0 : 5.0;

  let totalEmulsifierWeight = 0;
  let weightedHlbSum = 0;

  for (const em of emulsifiers) {
    if (em.weightGrams <= 0) continue;
    totalEmulsifierWeight += em.weightGrams;
    weightedHlbSum += em.weightGrams * em.hlb;
  }

  const calculatedSystemHLB =
    totalEmulsifierWeight > 0 ? Math.round((weightedHlbSum / totalEmulsifierWeight) * 10) / 10 : 0;

  const hlbDelta = Math.abs(calculatedSystemHLB - targetHLB);
  const isStable = totalEmulsifierWeight > 0 && hlbDelta <= 2.5;

  // Recommended Xanthan gum to provide yield stress (0.15% of total system mass)
  const recommendedXanthanStabilizerGrams = Math.round(((totalMass * 0.15) / 100) * 100) / 100;

  const instructions = [
    `Phase distribution: ${oilPercentage}% lipid phase, ${waterPercentage}% aqueous phase (${emulsionType.toUpperCase()}).`,
    `Target HLB for this continuous phase is ~${targetHLB}. Calculated system HLB is ${calculatedSystemHLB}.`,
  ];

  if (isStable) {
    instructions.push('Emulsifier HLB is within optimal thermodynamic stability window (delta <= 2.5).');
  } else {
    instructions.push(
      `[INSTABILITY WARNING] System HLB (${calculatedSystemHLB}) deviates from target (${targetHLB}). Risk of droplet coalescence or creaming.`
    );
  }

  instructions.push(
    `Add ${recommendedXanthanStabilizerGrams}g Xanthan Gum (0.15%) to aqueous phase before high-shear emulsification to prevent Ostwald ripening.`
  );

  return {
    oilPhaseGrams,
    waterPhaseGrams,
    oilPercentage,
    waterPercentage,
    emulsionType,
    targetHLB,
    calculatedSystemHLB,
    isStable,
    recommendedXanthanStabilizerGrams,
    instructions,
  };
}
