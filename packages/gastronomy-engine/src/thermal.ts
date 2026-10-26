// packages/gastronomy-engine/src/thermal.ts
// Mathematical thermal kinetics, Baldwin pathogen reduction curves, and protein denaturation profiling.

import type {
  SousVideProtein,
  ProteinGeometry,
  PathogenTarget,
  SousVidePasteurizationResult,
  ProteinDenaturationProfile,
  EggYolkPrecisionResult,
  EggYolkStage,
} from './types.js';

interface PathogenKinetics {
  d60Minutes: number;
  zTempC: number;
  targetLogReduction: number;
}

const PATHOGEN_CONSTANTS: Record<PathogenTarget, PathogenKinetics> = {
  salmonella: {
    d60Minutes: 6.2,
    zTempC: 5.5,
    targetLogReduction: 6.5, // 6.5D USDA poultry standard
  },
  listeria: {
    d60Minutes: 6.5,
    zTempC: 7.0,
    targetLogReduction: 6.0, // 6.0D FSIS standard
  },
  ecoli: {
    d60Minutes: 4.5,
    zTempC: 5.0,
    targetLogReduction: 5.0, // 5.0D beef standard
  },
};

const GEOMETRY_FACTORS: Record<ProteinGeometry, number> = {
  slab: 1.0,
  cylinder: 0.52,
  sphere: 0.35,
};

/**
 * Calculate Baldwin thermal death time and heating conduction time for sous-vide pasteurization.
 */
export function calculatePasteurizationTime(
  protein: SousVideProtein,
  thicknessMm: number,
  bathTempC: number,
  options?: {
    initialTempC?: number;
    geometry?: ProteinGeometry;
    targetPathogen?: PathogenTarget;
  }
): SousVidePasteurizationResult {
  if (thicknessMm <= 0) throw new Error('Thickness must be greater than 0 mm');
  const initialTemp = options?.initialTempC ?? 4.0; // 4°C walk-in cooler standard
  const geometry = options?.geometry ?? 'slab';
  const targetPathogen = options?.targetPathogen ?? (protein.startsWith('poultry') ? 'salmonella' : 'listeria');

  const warnings: string[] = [];

  // Minimum temperature threshold for pathogen lethality: 54.4°C (130°F)
  if (bathTempC < 54.4) {
    warnings.push(
      `Water bath temperature ${bathTempC}°C is below the 54.4°C (130°F) pathogen destruction threshold. Pathogens can proliferate in the danger zone.`
    );
  }

  // 1. Conduction heating time (Fourier heat diffusion equation approximation)
  // Thermal diffusivity of meat alpha ~ 1.4e-3 mm^2 / s
  const alphaMm2PerMin = 1.4e-3 * 60; // ~ 0.084 mm^2 / min
  const geoFactor = GEOMETRY_FACTORS[geometry];

  // Time for core to come within 0.5°C of bath temperature
  const deltaT = Math.max(0.1, bathTempC - initialTemp);
  const deltaFinal = 0.5; // within 0.5°C
  const fourierExponent = Math.log((4 * deltaT) / (Math.PI * deltaFinal));
  const rawHeatTime = (Math.pow(thicknessMm, 2) / (Math.pow(Math.PI, 2) * alphaMm2PerMin)) * geoFactor * fourierExponent;
  const timeToCoreMinutes = Math.max(1, Math.round(rawHeatTime));

  // 2. Pasteurization holding time at core temperature
  const kinetics = PATHOGEN_CONSTANTS[targetPathogen];
  // Baldwin D-value at bath temperature: D(T) = D60 * 10^((60 - T) / z)
  const dValAtTemp = kinetics.d60Minutes * Math.pow(10, (60.0 - bathTempC) / kinetics.zTempC);
  const rawHoldTime = dValAtTemp * kinetics.targetLogReduction;
  const pasteurizationHoldMinutes = bathTempC >= 54.4 ? Math.max(1, Math.round(rawHoldTime)) : 0;

  const totalCookTimeMinutes = timeToCoreMinutes + pasteurizationHoldMinutes;
  const isSafe = bathTempC >= 54.4 && totalCookTimeMinutes > 0;

  if (totalCookTimeMinutes > 240 && bathTempC < 56.0) {
    warnings.push(
      'Holding food between 54.4°C and 56°C for more than 4 hours risks toxin formation from spore-formers (e.g. Clostridium perfringens).'
    );
  }

  return {
    protein,
    thicknessMm,
    bathTempC,
    initialTempC: initialTemp,
    geometry,
    targetPathogen,
    timeToCoreMinutes,
    pasteurizationHoldMinutes,
    totalCookTimeMinutes,
    log10Reduction: isSafe ? kinetics.targetLogReduction : 0,
    isSafe,
    warnings,
  };
}

/**
 * Predict protein denaturation states (myosin, actin, collagen) based on cook temperature and duration.
 */
export function getProteinDenaturationProfile(
  bathTempC: number,
  cookHours: number,
  protein: SousVideProtein
): ProteinDenaturationProfile {
  let doneness = 'Rare';
  let myosinState = 'Native / partially unfolded';
  let actinState = 'Native (intact moisture holding)';
  let collagenConversion = 'Negligible conversion';
  let textureDescription = 'Extremely tender, raw elasticity';

  if (bathTempC < 50.0) {
    doneness = 'Blue Rare / Bleue';
    myosinState = 'Native';
    actinState = 'Native';
    collagenConversion = 'None';
    textureDescription = 'Soft, pliable, uncontracted muscle fibers.';
  } else if (bathTempC < 54.0) {
    doneness = 'Rare';
    myosinState = 'Denatured & gelled (50°C threshold passed)';
    actinState = 'Native (complete intracellular water retention)';
    collagenConversion = 'Minimal';
    textureDescription = 'Silky, succulent mouthfeel with zero fiber shrinkage.';
  } else if (bathTempC < 58.0) {
    doneness = 'Medium-Rare';
    myosinState = 'Completely coagulated';
    actinState = 'Native (optimal tenderness)';
    collagenConversion = cookHours > 12 ? 'Noticeable tenderization' : 'Low';
    textureDescription = 'Peak juiciness; muscle fibers set without moisture expulsion.';
  } else if (bathTempC < 63.0) {
    doneness = 'Medium';
    myosinState = 'Tightened network';
    actinState = 'Early stage denaturation (~60°C onset)';
    collagenConversion = cookHours > 8 ? 'Moderate hydrolysis' : 'Low';
    textureDescription = 'Firmer bite, slight pink hue, minor water release.';
  } else if (bathTempC < 68.0) {
    doneness = 'Medium-Well';
    myosinState = 'Fully contracted';
    actinState = 'Denaturing (66°C threshold passed — rapid water expulsion)';
    collagenConversion = cookHours > 4 ? 'Significant gelatinization' : 'Moderate';
    textureDescription = 'Noticeably firm, greyish-tan color, fibrous texture.';
  } else {
    doneness = 'Well-Done / Braised Yield';
    myosinState = 'Densified protein matrix';
    actinState = 'Completely denatured & contracted (up to 30% moisture lost)';
    collagenConversion = cookHours > 3 ? 'Complete gelatin breakdown' : 'Partial breakdown';
    textureDescription =
      protein === 'beef_tough_cut' || protein === 'pork_belly'
        ? 'Fork-tender, shredded strands lubricated by hydrolyzed gelatin.'
        : 'Dry and chalky if lean protein; braised texture if high-collagen cut.';
  }

  return {
    protein,
    bathTempC,
    cookHours,
    doneness,
    myosinState,
    actinState,
    collagenConversion,
    textureDescription,
  };
}

/**
 * Predict exact stage and rheology of egg yolks cooked sous-vide.
 */
export function calculateSousVideEgg(bathTempC: number, cookMinutes: number): EggYolkPrecisionResult {
  let stage: EggYolkStage = 'raw';
  let yolkViscosityCp = 50; // centipoise (fluid)
  let albumenTexture = 'Translucent, watery fluid';
  let culinaryApplication = 'Cocktails, tartare emulsion';

  if (cookMinutes < 25) {
    stage = 'raw';
    yolkViscosityCp = 80;
    albumenTexture = 'Partially warmed fluid';
    culinaryApplication = 'Insufficient cooking time to initiate protein mesh network';
  } else if (bathTempC < 62.0) {
    stage = 'raw';
    yolkViscosityCp = 120;
    albumenTexture = 'Runny, translucent';
    culinaryApplication = 'Raw yolk suspensions';
  } else if (bathTempC < 63.5) {
    stage = 'onsen';
    yolkViscosityCp = 450;
    albumenTexture = 'Delicate milky white cloud, loosely coagulated (ovotransferrin set)';
    culinaryApplication = 'Traditional Japanese Onsen Tamago over dashi, ramen, or grain bowls';
  } else if (bathTempC < 65.5) {
    stage = 'soft_custard';
    yolkViscosityCp = 1800;
    albumenTexture = 'Soft tender white';
    culinaryApplication = 'Eggs Benedict, artisanal salads, toast topper';
  } else if (bathTempC < 68.0) {
    stage = 'jammy';
    yolkViscosityCp = 6500;
    albumenTexture = 'Fully opaque, elastic solid white';
    culinaryApplication = 'Ramen eggs (Ajitsuke Tamago), pasta carbonara focal point';
  } else if (bathTempC < 72.0) {
    stage = 'paste';
    yolkViscosityCp = 25000;
    albumenTexture = 'Firm set white';
    culinaryApplication = 'Spreadable yolk fudge, deviled eggs, canapés';
  } else {
    stage = 'hard';
    yolkViscosityCp = 80000;
    albumenTexture = 'Hard, rubbery white';
    culinaryApplication = 'Hard-boiled egg salads, grated egg yolk garnish';
  }

  return {
    bathTempC,
    cookMinutes,
    stage,
    yolkViscosityCp,
    albumenTexture,
    culinaryApplication,
  };
}
