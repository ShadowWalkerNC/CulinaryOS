// packages/gastronomy-engine/src/types.ts
// Pure TypeScript mathematical definitions for modernist cuisine & food science.

export type HydrocolloidType =
  | 'agar_agar'
  | 'gelatin'
  | 'sodium_alginate'
  | 'calcium_lactate_gluconate'
  | 'calcium_chloride'
  | 'sodium_citrate'
  | 'iota_carrageenan'
  | 'kappa_carrageenan'
  | 'lambda_carrageenan'
  | 'methylcellulose'
  | 'xanthan_gum'
  | 'soy_lecithin'
  | 'versawhip'
  | 'hm_pectin'
  | 'lm_pectin';

export type GelatinBloomGrade = 'bronze' | 'silver' | 'gold' | 'platinum';

export type SpherificationType = 'direct' | 'reverse' | 'frozen_reverse';

export type SousVideProtein =
  | 'beef_tenderloin'
  | 'beef_tough_cut'
  | 'poultry_breast'
  | 'poultry_thigh'
  | 'pork_chop'
  | 'pork_belly'
  | 'fish_lean'
  | 'fish_fatty'
  | 'egg';

export type ProteinGeometry = 'slab' | 'cylinder' | 'sphere';

export type PathogenTarget = 'salmonella' | 'listeria' | 'ecoli';

export type EggYolkStage =
  | 'raw'
  | 'onsen'
  | 'soft_custard'
  | 'jammy'
  | 'paste'
  | 'hard';

export type SugarType =
  | 'sucrose'
  | 'dextrose'
  | 'fructose'
  | 'glucose_de40'
  | 'glucose_de60'
  | 'invert_sugar'
  | 'maltodextrin_de18'
  | 'erythritol'
  | 'alcohol_100abv';

export type FrozenDessertType = 'gelato' | 'ice_cream' | 'sorbet';

export type CureType = 'equilibrium_brine' | 'dry_cure' | 'immersion_cure';

export type AromaFamily =
  | 'pyrazines'
  | 'terpenes'
  | 'esters'
  | 'aldehydes'
  | 'lactones'
  | 'phenols'
  | 'sulfur'
  | 'ketones';

export interface BloomConversionResult {
  sourceBloom: number;
  targetBloom: number;
  sourceMassGrams: number;
  targetMassGrams: number;
  sourceSheetsEstimate: number;
  targetSheetsEstimate: number;
}

export interface SpherificationPlan {
  type: SpherificationType;
  liquidBaseGrams: number;
  liquidBasePh: number;
  baseAlginateGrams: number;
  baseCalciumGrams: number;
  baseXanthanGrams: number;
  sodiumCitrateBufferGrams: number;
  settingBathWaterGrams: number;
  bathAlginateGrams: number;
  bathCalciumGrams: number;
  submersionTimeSeconds: number;
  instructions: string[];
}

export interface AgarGelPlan {
  liquidMassGrams: number;
  texture: 'soft' | 'fluid' | 'firm' | 'brittle';
  agarGrams: number;
  percentage: number;
  hydrationTempC: number;
  gellingTempC: number;
  meltingTempC: number;
  instructions: string[];
}

export interface SousVidePasteurizationResult {
  protein: SousVideProtein;
  thicknessMm: number;
  bathTempC: number;
  initialTempC: number;
  geometry: ProteinGeometry;
  targetPathogen: PathogenTarget;
  timeToCoreMinutes: number;
  pasteurizationHoldMinutes: number;
  totalCookTimeMinutes: number;
  log10Reduction: number;
  isSafe: boolean;
  warnings: string[];
}

export interface ProteinDenaturationProfile {
  protein: SousVideProtein;
  bathTempC: number;
  cookHours: number;
  doneness: string;
  myosinState: string;
  actinState: string;
  collagenConversion: string;
  textureDescription: string;
}

export interface EggYolkPrecisionResult {
  bathTempC: number;
  cookMinutes: number;
  stage: EggYolkStage;
  yolkViscosityCp: number;
  albumenTexture: string;
  culinaryApplication: string;
}

export interface FrozenIngredient {
  name: string;
  weightGrams: number;
  sugarType?: SugarType;
  solidsPct?: number;
  fatPct?: number;
  msnfPct?: number;
  alcoholAbv?: number;
}

export interface FrozenFormulationResult {
  dessertType: FrozenDessertType;
  totalWeightGrams: number;
  totalPAC: number;
  pacPercentage: number;
  totalPOD: number;
  podPercentage: number;
  totalSolidsPct: number;
  fatPct: number;
  msnfPct: number;
  estimatedFreezingPointC: number;
  recommendedServingTempC: number;
  isBalanced: boolean;
  diagnostics: string[];
}

export interface SorbetBrixBalanceResult {
  fruitPureeWeightGrams: number;
  initialBrix: number;
  targetBrix: number;
  simpleSyrup5050GramsToAdd: number;
  waterGramsToAdd: number;
  finalBrix: number;
  finalPAC: number;
}

export interface EquilibriumBrineResult {
  proteinWeightGrams: number;
  waterWeightGrams: number;
  targetSaltPct: number;
  targetSugarPct: number;
  saltWeightGrams: number;
  sugarWeightGrams: number;
  totalSystemWeightGrams: number;
  minCureHours: number;
  instructions: string[];
}

export interface CuringSaltsResult {
  meatWeightGrams: number;
  cureType: CureType;
  cureNumber: 1 | 2;
  cureSaltGrams: number;
  sodiumNitriteGrams: number;
  resultingNitritePpm: number;
  maxAllowedPpm: number;
  isWithinUsdaLimit: boolean;
  kosherSaltBalanceGrams: number;
  instructions: string[];
}

export interface FlavorPairingAffinity {
  ingredientA: string;
  ingredientB: string;
  affinityScore: number;
  sharedVolatiles: string[];
  sharedFamilies: AromaFamily[];
  synergyNotes: string;
  recommendedTechnique: string;
}
