// ============================================================
// CulinaryOS — Batch Prep Recipe Scaling & Adhesive Expiration Labels Engine
// Supports Baker's percentage scaling, yield scaling, and
// 2"x1" and 2"x2" thermal adhesive label formatting with cook initials,
// expiration times, allergen warnings, and QR code traceability.
// ============================================================

export type LabelFormat = '2x1' | '2x2';

export interface PrepBatch {
  id?: string;
  recipeName: string;
  batchNumber: string;
  cookInitials: string;
  prepDate: string | Date;
  shelfLifeHours: number; // e.g. 72 hours for sauces, 168 hours for dressings
  allergens?: string[];
  storageLocation?: string;
  storageTemp?: string; // e.g. "≤ 40°F (4°C)"
  yieldQuantity: number;
  yieldUnit: string;
  qrData?: string;
  notes?: string;
}

export interface AdhesiveLabelPayload {
  format: LabelFormat;
  recipeName: string;
  batchNumber: string;
  cookInitials: string;
  prepDateTime: string;
  useByDateTime: string;
  hoursRemaining: number;
  isExpired: boolean;
  allergens: string[];
  allergenWarningText: string;
  storageLocation: string;
  storageTemp: string;
  yieldSummary: string;
  qrCodeData: string;
  formattedAscii: string;
  escPosCommands: Uint8Array;
}

export interface BakersIngredient {
  name: string;
  percentage: number; // e.g., 100 for flour, 68 for water, 2.2 for salt
  isBaseFlour?: boolean;
}

export interface BakersRecipe {
  name: string;
  description?: string;
  baseFlourGrams: number;
  ingredients: BakersIngredient[];
}

export interface ScaledBakersRecipe {
  name: string;
  targetBaseFlourGrams: number;
  totalBatchWeightGrams: number;
  ingredients: Array<{
    name: string;
    percentage: number;
    weightGrams: number;
  }>;
}

export interface StandardRecipeIngredient {
  name: string;
  amount: number;
  unit: string;
}

export interface StandardPrepRecipe {
  id?: string;
  name: string;
  baseYield: number;
  yieldUnit: string;
  shelfLifeHours: number;
  allergens?: string[];
  ingredients: StandardRecipeIngredient[];
}

export interface ScaledPrepRecipe {
  name: string;
  scaleFactor: number;
  targetYield: number;
  yieldUnit: string;
  ingredients: Array<{
    name: string;
    amount: number;
    unit: string;
  }>;
}

// FDA Major 9 Allergens
export const FDA_ALLERGENS = [
  'Milk',
  'Eggs',
  'Fish',
  'Crustacean Shellfish',
  'Tree Nuts',
  'Peanuts',
  'Wheat',
  'Soybeans',
  'Sesame',
] as const;

/**
 * Calculates the exact use-by date/time given a prep start time and shelf-life in hours.
 */
export function calculateUseByDate(
  prepDate: Date | string,
  shelfLifeHours: number
): { useByDate: Date; useByFormatted: string; hoursRemaining: number; isExpired: boolean } {
  const prep = typeof prepDate === 'string' ? new Date(prepDate) : new Date(prepDate.getTime());
  const useBy = new Date(prep.getTime() + shelfLifeHours * 3600 * 1000);
  const now = new Date();

  const diffMs = useBy.getTime() - now.getTime();
  const hoursRemaining = Math.max(0, Math.round((diffMs / (3600 * 1000)) * 10) / 10);
  const isExpired = diffMs <= 0;

  const pad = (n: number) => n.toString().padStart(2, '0');
  const month = pad(useBy.getMonth() + 1);
  const day = pad(useBy.getDate());
  const year = useBy.getFullYear();
  const hours = pad(useBy.getHours());
  const mins = pad(useBy.getMinutes());

  const useByFormatted = `${month}/${day}/${year} ${hours}:${mins}`;
  return { useByDate: useBy, useByFormatted, hoursRemaining, isExpired };
}

/**
 * Scales a recipe using Baker's Percentages.
 * In Baker's Math, total flour weight = 100%. All other ingredients are percentages of the flour weight.
 */
export function scaleRecipeByBakersPercentage(
  recipe: BakersRecipe,
  targetFlourGrams: number
): ScaledBakersRecipe {
  const scaledIngredients = recipe.ingredients.map((ing) => {
    const weight = Math.round((targetFlourGrams * (ing.percentage / 100)) * 10) / 10;
    return {
      name: ing.name,
      percentage: ing.percentage,
      weightGrams: weight,
    };
  });

  const totalBatchWeightGrams = Math.round(
    scaledIngredients.reduce((sum, i) => sum + i.weightGrams, 0) * 10
  ) / 10;

  return {
    name: recipe.name,
    targetBaseFlourGrams: targetFlourGrams,
    totalBatchWeightGrams,
    ingredients: scaledIngredients,
  };
}

/**
 * Scales a recipe by target total dough/batch weight in grams using Baker's percentages.
 */
export function scaleRecipeByTotalBatchWeight(
  recipe: BakersRecipe,
  targetTotalWeightGrams: number
): ScaledBakersRecipe {
  const totalPercentage = recipe.ingredients.reduce((sum, i) => sum + i.percentage, 0);
  const requiredFlourGrams = (targetTotalWeightGrams / totalPercentage) * 100;
  return scaleRecipeByBakersPercentage(recipe, Math.round(requiredFlourGrams * 10) / 10);
}

/**
 * Scales a standard prep recipe by target yield portions.
 */
export function scaleRecipeByTargetYield(
  recipe: StandardPrepRecipe,
  targetYield: number
): ScaledPrepRecipe {
  const factor = recipe.baseYield > 0 ? targetYield / recipe.baseYield : 1;
  const scaledIngredients = recipe.ingredients.map((ing) => ({
    name: ing.name,
    amount: Math.round(ing.amount * factor * 100) / 100,
    unit: ing.unit,
  }));

  return {
    name: recipe.name,
    scaleFactor: Math.round(factor * 100) / 100,
    targetYield,
    yieldUnit: recipe.yieldUnit,
    ingredients: scaledIngredients,
  };
}

/**
 * Generates raw ESC/POS binary commands for 2"x1" or 2"x2" adhesive thermal label rolls.
 */
export function generateLabelEscPos(payload: Omit<AdhesiveLabelPayload, 'escPosCommands' | 'formattedAscii'>): Uint8Array {
  const buf: number[] = [];

  // ESC @ - Init
  buf.push(0x1b, 0x40);

  // Center align
  buf.push(0x1b, 0x61, 0x01);

  // Double height & bold for Item Name
  buf.push(0x1b, 0x45, 0x01); // Bold on
  buf.push(0x1d, 0x21, payload.format === '2x2' ? 0x11 : 0x01); // Double size/height

  for (let i = 0; i < payload.recipeName.length; i++) {
    buf.push(payload.recipeName.charCodeAt(i) & 0xff);
  }
  buf.push(0x0a);

  buf.push(0x1d, 0x21, 0x00); // Normal size
  buf.push(0x1b, 0x45, 0x00); // Bold off

  // Divider
  const div = '--------------------------------';
  for (let i = 0; i < div.length; i++) buf.push(div.charCodeAt(i));
  buf.push(0x0a);

  // Left align for details
  buf.push(0x1b, 0x61, 0x00);

  const lines: string[] = [
    `LOT / BATCH: #${payload.batchNumber}`,
    `PREP: ${payload.prepDateTime} | BY: ${payload.cookInitials.toUpperCase()}`,
    `USE BY: ${payload.useByDateTime}`,
    `STORAGE: ${payload.storageLocation} (${payload.storageTemp})`,
    `YIELD: ${payload.yieldSummary}`,
  ];

  if (payload.allergens && payload.allergens.length > 0) {
    lines.push(`ALLERGENS: ${payload.allergens.join(', ')}`);
  }

  for (const l of lines) {
    for (let i = 0; i < l.length; i++) {
      buf.push(l.charCodeAt(i) & 0xff);
    }
    buf.push(0x0a);
  }

  // QR Code for 2x2 format
  if (payload.format === '2x2' && payload.qrCodeData) {
    buf.push(0x1b, 0x61, 0x01); // Center
    const qrStr = payload.qrCodeData;
    const len = qrStr.length + 3;
    buf.push(0x1d, 0x28, 0x6b, len % 256, Math.floor(len / 256), 0x31, 0x50, 0x30);
    for (let i = 0; i < qrStr.length; i++) buf.push(qrStr.charCodeAt(i) & 0xff);
    buf.push(0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30); // Print QR
    buf.push(0x0a);
  }

  // Feed & Peel/Cut
  buf.push(0x1b, 0x64, 0x02);
  buf.push(0x1d, 0x56, 0x42, 0x00);

  return new Uint8Array(buf);
}

/**
 * Formats a 2"x1" or 2"x2" adhesive thermal expiration label.
 */
export function formatAdhesiveLabel(
  batch: PrepBatch,
  format: LabelFormat = '2x1'
): AdhesiveLabelPayload {
  const prep = typeof batch.prepDate === 'string' ? new Date(batch.prepDate) : batch.prepDate;
  const { useByFormatted, hoursRemaining, isExpired } = calculateUseByDate(
    prep,
    batch.shelfLifeHours
  );

  const pad = (n: number) => n.toString().padStart(2, '0');
  const prepFormatted = `${pad(prep.getMonth() + 1)}/${pad(prep.getDate())}/${prep.getFullYear()} ${pad(prep.getHours())}:${pad(prep.getMinutes())}`;

  const allergens = batch.allergens ?? [];
  const allergenWarningText =
    allergens.length > 0 ? `CONTAINS: ${allergens.join(', ').toUpperCase()}` : 'NO MAJOR ALLERGENS';

  const storageLocation = batch.storageLocation ?? 'Walk-In Cooler';
  const storageTemp = batch.storageTemp ?? '≤ 40°F (4°C)';
  const yieldSummary = `${batch.yieldQuantity} ${batch.yieldUnit}`;
  const batchNumber = batch.batchNumber || `LOT-${Date.now().toString().slice(-6)}`;
  const cookInitials = (batch.cookInitials || 'CHEF').toUpperCase();

  const qrCodeData =
    batch.qrData ||
    `CULINARYOS:BATCH:${batchNumber}:EXP:${useByFormatted}:COOK:${cookInitials}`;

  // ASCII preview formatting (32 chars wide for 2" label)
  const width = 32;
  const border = '='.repeat(width);
  const subBorder = '-'.repeat(width);

  const asciiLines: string[] = [
    border,
    ` ${batch.recipeName.toUpperCase().slice(0, width - 2)}`,
    subBorder,
    ` BATCH #${batchNumber.slice(-8)} | COOK: ${cookInitials}`,
    ` PREP:   ${prepFormatted}`,
    ` USE BY: ${useByFormatted}`,
    ` KEEP:   ${storageLocation} (${storageTemp})`,
    ` YIELD:  ${yieldSummary}`,
  ];

  if (allergens.length > 0) {
    asciiLines.push(` ALLERGENS: ${allergens.join(', ').slice(0, width - 13)}`);
  }

  if (format === '2x2') {
    asciiLines.push(` [QR TRACEABILITY SCAN: ${batchNumber}]`);
  }

  asciiLines.push(border);

  const formattedAscii = asciiLines.join('\n');

  const partialPayload = {
    format,
    recipeName: batch.recipeName,
    batchNumber,
    cookInitials,
    prepDateTime: prepFormatted,
    useByDateTime: useByFormatted,
    hoursRemaining,
    isExpired,
    allergens,
    allergenWarningText,
    storageLocation,
    storageTemp,
    yieldSummary,
    qrCodeData,
  };

  const escPosCommands = generateLabelEscPos(partialPayload);

  return {
    ...partialPayload,
    formattedAscii,
    escPosCommands,
  };
}
