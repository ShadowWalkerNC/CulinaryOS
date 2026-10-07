import type {
  MenuItemSalesInput,
  MenuMatrixItem,
  MenuMatrixReport,
  MenuQuadrant,
} from './types.ts';

/**
 * Classifies menu items according to the Kasavana & Smith / Boston Consulting Group
 * menu engineering matrix into Stars, Plowhorses, Puzzles, and Dogs.
 *
 * Hurdle rates:
 * - Margin Benchmark: Average contribution margin across all units sold.
 * - Volume Benchmark: 70% of equal popularity share: (1 / totalItems) * 70%.
 */
export function analyzeMenuMatrix(items: MenuItemSalesInput[]): MenuMatrixReport {
  if (!items || items.length === 0) {
    return {
      totalSalesCount: 0,
      totalRevenueCents: 0,
      totalMarginCents: 0,
      averageContributionMarginCents: 0,
      popularityThresholdSharePercent: 0,
      items: [],
      summary: { stars: 0, plowhorses: 0, puzzles: 0, dogs: 0 },
    };
  }

  let totalSalesCount = 0;
  let totalRevenueCents = 0;
  let totalMarginCents = 0;

  for (const item of items) {
    const marginCents = item.priceCents - item.costCents;
    totalSalesCount += item.salesCount;
    totalRevenueCents += item.priceCents * item.salesCount;
    totalMarginCents += marginCents * item.salesCount;
  }

  const averageContributionMarginCents = totalSalesCount > 0
    ? Math.round(totalMarginCents / totalSalesCount)
    : 0;

  // Kasavana & Smith 70% hurdle rate of equal popularity
  const hurdleRateSharePercent = Number(((1 / items.length) * 70).toFixed(2));

  const classifiedItems: MenuMatrixItem[] = [];
  const summary = { stars: 0, plowhorses: 0, puzzles: 0, dogs: 0 };

  for (const item of items) {
    const contributionMarginCents = item.priceCents - item.costCents;
    const foodCostPercent = item.priceCents > 0
      ? Number(((item.costCents / item.priceCents) * 100).toFixed(1))
      : 0;

    const popularitySharePercent = totalSalesCount > 0
      ? Number(((item.salesCount / totalSalesCount) * 100).toFixed(2))
      : 0;

    const isHighVolume = popularitySharePercent >= hurdleRateSharePercent;
    const isHighMargin = contributionMarginCents >= averageContributionMarginCents;

    let quadrant: MenuQuadrant;
    let recommendation: string;
    let suggestedAction: 'maintain' | 'reprice' | 're-engineer' | 'promote' | '86';

    if (isHighMargin && isHighVolume) {
      quadrant = 'star';
      suggestedAction = 'maintain';
      recommendation = `Star dish: High profit ($${(contributionMarginCents / 100).toFixed(2)}) and high volume (${popularitySharePercent}% share). Maintain strict quality consistency and prime placement.`;
      summary.stars++;
    } else if (!isHighMargin && isHighVolume) {
      quadrant = 'plowhorse';
      suggestedAction = foodCostPercent > 35 ? 're-engineer' : 'reprice';
      recommendation = `Plowhorse dish: High volume (${popularitySharePercent}% share) but suppressed margin ($${(contributionMarginCents / 100).toFixed(2)}). Consider modest price increase or portion re-engineering.`;
      summary.plowhorses++;
    } else if (isHighMargin && !isHighVolume) {
      quadrant = 'puzzle';
      suggestedAction = 'promote';
      recommendation = `Puzzle dish: High profit ($${(contributionMarginCents / 100).toFixed(2)}) but low volume (${popularitySharePercent}% share). Train servers to highlight as daily special or feature in hero menu section.`;
      summary.puzzles++;
    } else {
      quadrant = 'dog';
      suggestedAction = '86';
      recommendation = `Dog dish: Low margin ($${(contributionMarginCents / 100).toFixed(2)}) and low volume (${popularitySharePercent}% share). Candidate to 86 or replace with a high-margin seasonal offering.`;
      summary.dogs++;
    }

    classifiedItems.push({
      itemId: item.itemId,
      name: item.name,
      salesCount: item.salesCount,
      priceCents: item.priceCents,
      costCents: item.costCents,
      contributionMarginCents,
      foodCostPercent,
      popularitySharePercent,
      isHighVolume,
      isHighMargin,
      quadrant,
      recommendation,
      suggestedAction,
    });
  }

  return {
    totalSalesCount,
    totalRevenueCents,
    totalMarginCents,
    averageContributionMarginCents,
    popularityThresholdSharePercent: hurdleRateSharePercent,
    items: classifiedItems,
    summary,
  };
}
