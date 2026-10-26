// packages/gastronomy-engine/src/flavor-pairing.ts
// Computational Gastronomy — Volatile organic aroma compound pairing matrix and chemical affinity scoring.

import type { AromaFamily, FlavorPairingAffinity } from './types.js';

interface IngredientFlavorProfile {
  name: string;
  category: 'sweet' | 'fruit' | 'dairy' | 'protein' | 'vegetable' | 'herb_spice' | 'beverage';
  families: AromaFamily[];
  keyVolatiles: string[];
}

export const FLAVOR_DATABASE: Record<string, IngredientFlavorProfile> = {
  dark_chocolate: {
    name: 'Dark Chocolate',
    category: 'sweet',
    families: ['pyrazines', 'aldehydes', 'lactones'],
    keyVolatiles: ['tetramethylpyrazine', 'isovaleraldehyde', 'vanillin', 'phenylethyl_acetate', 'diacetyl'],
  },
  blue_cheese: {
    name: 'Blue Cheese (Roquefort/Gorgonzola)',
    category: 'dairy',
    families: ['ketones', 'pyrazines', 'esters'],
    keyVolatiles: ['2-heptanone', '2-nonanone', 'tetramethylpyrazine', 'methyl_hexanoate'],
  },
  strawberry: {
    name: 'Strawberry',
    category: 'fruit',
    families: ['esters', 'lactones', 'terpenes'],
    keyVolatiles: ['furaneol', 'ethyl_butyrate', 'linalool', 'gamma-decalactone', 'hexanal'],
  },
  basil: {
    name: 'Fresh Basil',
    category: 'herb_spice',
    families: ['terpenes', 'phenols'],
    keyVolatiles: ['linalool', 'eugenol', 'methyl_chavicol', '1,8-cineole'],
  },
  parmesan: {
    name: 'Parmigiano-Reggiano',
    category: 'dairy',
    families: ['pyrazines', 'aldehydes', 'sulfur'],
    keyVolatiles: ['glutamic_acid', 'tetramethylpyrazine', 'diacetyl', 'butyric_acid', 'dimethyl_trisulfide'],
  },
  tomato: {
    name: 'Ripe Tomato',
    category: 'vegetable',
    families: ['aldehydes', 'terpenes', 'sulfur'],
    keyVolatiles: ['hexanal', 'beta-ionone', 'cis-3-hexenol', 'dimethyl_sulfide', 'glutamic_acid'],
  },
  vanilla: {
    name: 'Madagascar Bourbon Vanilla',
    category: 'sweet',
    families: ['aldehydes', 'phenols'],
    keyVolatiles: ['vanillin', '4-hydroxybenzaldehyde', 'guaiacol', 'anisic_alcohol'],
  },
  coffee: {
    name: 'Espresso Coffee',
    category: 'beverage',
    families: ['pyrazines', 'sulfur', 'phenols'],
    keyVolatiles: ['2-furfurylthiol', 'tetramethylpyrazine', 'guaiacol', 'isovaleraldehyde'],
  },
  salmon: {
    name: 'King Salmon',
    category: 'protein',
    families: ['aldehydes', 'esters'],
    keyVolatiles: ['octadienol', 'hexanal', 'trimethylamine', '1-octen-3-ol'],
  },
  pork_belly: {
    name: 'Pork Belly',
    category: 'protein',
    families: ['aldehydes', 'pyrazines', 'lactones'],
    keyVolatiles: ['octanal', '2-pentylfuran', 'gamma-nonalactone', 'dimethyl_pyrazine'],
  },
  rosemary: {
    name: 'Rosemary',
    category: 'herb_spice',
    families: ['terpenes'],
    keyVolatiles: ['alpha-pinene', '1,8-cineole', 'camphor', 'borneol'],
  },
  garlic: {
    name: 'Black/Roast Garlic',
    category: 'vegetable',
    families: ['sulfur', 'pyrazines'],
    keyVolatiles: ['diallyl_disulfide', 'allyl_methyl_trisulfide', 'tetramethylpyrazine', 'furfural'],
  },
  mango: {
    name: 'Alphonso Mango',
    category: 'fruit',
    families: ['terpenes', 'esters', 'lactones'],
    keyVolatiles: ['delta-3-carene', 'ethyl_butyrate', 'gamma-octalactone', 'linalool'],
  },
  duck_breast: {
    name: 'Magret Duck Breast',
    category: 'protein',
    families: ['aldehydes', 'lactones', 'pyrazines'],
    keyVolatiles: ['gamma-nonalactone', 'hexanal', 'isovaleraldehyde', '2-ethyl-3,5-dimethylpyrazine'],
  },
  cauliflower: {
    name: 'Caramelized Cauliflower',
    category: 'vegetable',
    families: ['sulfur', 'pyrazines'],
    keyVolatiles: ['dimethyl_trisulfide', 'methanethiol', 'tetramethylpyrazine', 'vanillin'],
  },
  white_chocolate: {
    name: 'White Chocolate',
    category: 'sweet',
    families: ['lactones', 'aldehydes'],
    keyVolatiles: ['vanillin', 'delta-decalactone', 'butyric_acid', 'trimethylamine'],
  },
  caviar: {
    name: 'Sturgeon Caviar',
    category: 'protein',
    families: ['aldehydes', 'esters'],
    keyVolatiles: ['trimethylamine', 'hexanal', '1-octen-3-ol', 'dimethyl_sulfide'],
  },
};

function normalizeKey(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '_');
}

/**
 * Calculate molecular flavor affinity between two ingredients based on shared key aroma volatiles.
 */
export function calculateFlavorAffinity(
  ingredientA: string,
  ingredientB: string
): FlavorPairingAffinity {
  const keyA = normalizeKey(ingredientA);
  const keyB = normalizeKey(ingredientB);

  const profileA = FLAVOR_DATABASE[keyA] ?? {
    name: ingredientA,
    category: 'vegetable' as const,
    families: ['aldehydes' as AromaFamily],
    keyVolatiles: ['hexanal'],
  };

  const profileB = FLAVOR_DATABASE[keyB] ?? {
    name: ingredientB,
    category: 'vegetable' as const,
    families: ['aldehydes' as AromaFamily],
    keyVolatiles: ['hexanal'],
  };

  const setA = new Set(profileA.keyVolatiles);
  const sharedVolatiles = profileB.keyVolatiles.filter((v) => setA.has(v));

  const famSetA = new Set(profileA.families);
  const sharedFamilies = profileB.families.filter((f) => famSetA.has(f));

  // Affinity calculation:
  // Key volatile matches provide strong chemical affinity base (35% per shared key volatile)
  const sharedVolatileContribution = Math.min(0.70, sharedVolatiles.length * 0.35);
  const unionVolatiles = new Set([...profileA.keyVolatiles, ...profileB.keyVolatiles]);
  const jaccardScore = unionVolatiles.size > 0 ? (sharedVolatiles.length / unionVolatiles.size) * 0.25 : 0;
  const familyOverlapBonus = (sharedFamilies.length / Math.max(1, profileA.families.length)) * 0.25;

  const rawScore = Math.min(1.0, sharedVolatileContribution + jaccardScore + familyOverlapBonus);
  const affinityScore = Math.round(rawScore * 100);

  let synergyNotes = 'Complementary sensory contrast.';
  let recommendedTechnique = 'Separate textural plating or gentle fat-solubilized infusion.';

  if (sharedVolatiles.length > 0) {
    synergyNotes = `High molecular affinity bridged by shared volatile compounds: ${sharedVolatiles.join(', ')}.`;
    recommendedTechnique = 'Sous-vide co-infusion (60°C for 2h) or emulsion stabilization to unify aromatic headspace.';
  } else if (sharedFamilies.length > 0) {
    synergyNotes = `Shared aroma chemical families: ${sharedFamilies.join(', ')}.`;
    recommendedTechnique = 'Fluid gel layering or dual-temperature contrasting course.';
  }

  return {
    ingredientA: profileA.name,
    ingredientB: profileB.name,
    affinityScore,
    sharedVolatiles,
    sharedFamilies,
    synergyNotes,
    recommendedTechnique,
  };
}

/**
 * Find top companion pairings for any given ingredient from the culinary gastronomy database.
 */
export function findFlavorPairings(
  targetIngredient: string,
  limit = 5
): Array<{ ingredient: string; score: number; sharedVolatiles: string[]; synergyNotes: string }> {
  const normTarget = normalizeKey(targetIngredient);
  const matches: Array<{ ingredient: string; score: number; sharedVolatiles: string[]; synergyNotes: string }> = [];

  for (const [key, profile] of Object.entries(FLAVOR_DATABASE)) {
    if (key === normTarget) continue;
    const affinity = calculateFlavorAffinity(targetIngredient, key);
    matches.push({
      ingredient: profile.name,
      score: affinity.affinityScore,
      sharedVolatiles: affinity.sharedVolatiles,
      synergyNotes: affinity.synergyNotes,
    });
  }

  matches.sort((a, b) => b.score - a.score);
  return matches.slice(0, limit);
}
