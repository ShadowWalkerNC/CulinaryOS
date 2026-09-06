// ============================================================
// CulinaryOS — Multi-Rate Tax Engine
// Categorized tax calculations for prepared food (e.g. 8.25%),
// alcoholic beverages (e.g. 10.0%), and tax-exempt items (0%).
// ============================================================

export type TaxCategory = 'prepared_food' | 'alcohol' | 'exempt' | 'custom' | string;

export interface TaxRatesConfig {
  preparedFoodRatePercent: number; // e.g. 8.25
  alcoholRatePercent: number;      // e.g. 10.0
  taxExemptRatePercent: 0;         // 0.0
  defaultRatePercent?: number;     // e.g. 8.25
  customRates?: Record<string, number>; // category -> ratePercent
}

export const DEFAULT_TAX_RATES: TaxRatesConfig = {
  preparedFoodRatePercent: 8.25,
  alcoholRatePercent: 10.0,
  taxExemptRatePercent: 0,
  defaultRatePercent: 8.25,
  customRates: {},
};

export interface TaxableItem {
  id?: string;
  name: string;
  category?: string;
  station?: string;
  lineTotalCents: number;
  isTaxExempt?: boolean;
}

export interface TaxCategorySummary {
  category: TaxCategory;
  displayName: string;
  ratePercent: number;
  taxableSalesCents: number;
  taxAmountCents: number;
  itemCount: number;
}

export interface TaxCalculationResult {
  subtotalCents: number;
  totalTaxCents: number;
  totalCents: number;
  effectiveTaxRatePercent: number;
  categories: Record<string, TaxCategorySummary>;
  breakdown: {
    preparedFood: TaxCategorySummary;
    alcohol: TaxCategorySummary;
    exempt: TaxCategorySummary;
  };
}

/**
 * Categorize a line item into prepared_food, alcohol, or exempt based on its attributes.
 */
export function determineTaxCategory(item: TaxableItem): 'prepared_food' | 'alcohol' | 'exempt' {
  if (item.isTaxExempt === true || item.category === 'exempt' || item.category === 'tax_exempt') {
    return 'exempt';
  }

  const cat = (item.category ?? '').toLowerCase();
  const station = (item.station ?? '').toLowerCase();
  const name = (item.name ?? '').toLowerCase();

  const isAlcohol =
    station === 'bar' ||
    ['alcohol', 'alcoholic', 'cocktail', 'cocktails', 'wine', 'beer', 'liquor', 'spirits', 'draft_beer', 'bottle_beer'].includes(cat) ||
    /\b(cocktail|margarita|martini|ipa|lager|stout|pilsner|cabernet|chardonnay|pinot|prosecco|champagne|whiskey|bourbon|vodka|gin|tequila|rum|beer|wine|cider|spritz|old fashioned|mojito)\b/i.test(name);

  if (isAlcohol) {
    return 'alcohol';
  }

  return 'prepared_food';
}

/**
 * Resolve the applicable tax rate percentage for a given category.
 */
export function getTaxRateForCategory(category: string, rates?: Partial<TaxRatesConfig>): number {
  const merged: TaxRatesConfig = { ...DEFAULT_TAX_RATES, ...rates };
  if (category === 'exempt') return 0;
  if (category === 'alcohol') return merged.alcoholRatePercent;
  if (category === 'prepared_food') return merged.preparedFoodRatePercent;
  if (merged.customRates && merged.customRates[category] !== undefined) {
    return merged.customRates[category]!;
  }
  return merged.defaultRatePercent ?? merged.preparedFoodRatePercent;
}

/**
 * Calculate multi-rate tax breakdown across a list of order line items.
 */
export function calculateMultiRateTax(
  items: TaxableItem[],
  rates?: Partial<TaxRatesConfig>
): TaxCalculationResult {
  const mergedRates: TaxRatesConfig = { ...DEFAULT_TAX_RATES, ...rates };

  let preparedFoodSales = 0;
  let preparedFoodCount = 0;
  let alcoholSales = 0;
  let alcoholCount = 0;
  let exemptSales = 0;
  let exemptCount = 0;
  let subtotalCents = 0;

  for (const item of items) {
    const total = Math.max(0, Math.round(item.lineTotalCents || 0));
    subtotalCents += total;

    const cat = determineTaxCategory(item);
    if (cat === 'exempt') {
      exemptSales += total;
      exemptCount += 1;
    } else if (cat === 'alcohol') {
      alcoholSales += total;
      alcoholCount += 1;
    } else {
      preparedFoodSales += total;
      preparedFoodCount += 1;
    }
  }

  const preparedFoodTax = Math.round(preparedFoodSales * (mergedRates.preparedFoodRatePercent / 100));
  const alcoholTax = Math.round(alcoholSales * (mergedRates.alcoholRatePercent / 100));
  const exemptTax = 0;

  const preparedFoodSummary: TaxCategorySummary = {
    category: 'prepared_food',
    displayName: 'Prepared Food & Soft Beverages',
    ratePercent: mergedRates.preparedFoodRatePercent,
    taxableSalesCents: preparedFoodSales,
    taxAmountCents: preparedFoodTax,
    itemCount: preparedFoodCount,
  };

  const alcoholSummary: TaxCategorySummary = {
    category: 'alcohol',
    displayName: 'Alcoholic Beverages',
    ratePercent: mergedRates.alcoholRatePercent,
    taxAmountCents: alcoholTax,
    taxableSalesCents: alcoholSales,
    itemCount: alcoholCount,
  };

  const exemptSummary: TaxCategorySummary = {
    category: 'exempt',
    displayName: 'Tax-Exempt Items',
    ratePercent: 0,
    taxAmountCents: exemptTax,
    taxableSalesCents: exemptSales,
    itemCount: exemptCount,
  };

  const totalTaxCents = preparedFoodTax + alcoholTax + exemptTax;
  const totalCents = subtotalCents + totalTaxCents;
  const effectiveTaxRatePercent =
    subtotalCents > 0 ? Math.round((totalTaxCents / subtotalCents) * 10000) / 100 : 0;

  const categories: Record<string, TaxCategorySummary> = {
    prepared_food: preparedFoodSummary,
    alcohol: alcoholSummary,
    exempt: exemptSummary,
  };

  return {
    subtotalCents,
    totalTaxCents,
    totalCents,
    effectiveTaxRatePercent,
    categories,
    breakdown: {
      preparedFood: preparedFoodSummary,
      alcohol: alcoholSummary,
      exempt: exemptSummary,
    },
  };
}
