import type {
  WasteLogItem,
  StationHistoricalWaste,
  WasteAnomalyItem,
  WasteAnomalyReport,
  AnomalySeverity,
} from './types.ts';

export interface WasteAnomalyOptions {
  /** Multiplier threshold over baseline considered a spike (default: 1.5 = 50% above average). */
  spikeMultiplier?: number;
  /** Minimum cost in cents to flag as critical/high impact (default: 2000 = $20.00). */
  costThresholdCents?: number;
}

/**
 * Analyzes kitchen shift waste logs against historical station averages to detect
 * threshold deviations, volume spikes, and ranked financial cost impact.
 */
export function detectWasteAnomalies(
  logs: WasteLogItem[],
  historical: StationHistoricalWaste[],
  options: WasteAnomalyOptions = {}
): WasteAnomalyReport {
  const spikeMultiplier = options.spikeMultiplier ?? 1.5;
  const costThresholdCents = options.costThresholdCents ?? 2000;

  const stationMap = new Map<string, StationHistoricalWaste>();
  for (const hist of historical) {
    stationMap.set(hist.station.toLowerCase(), hist);
  }

  let totalWasteCostCents = 0;
  let totalWasteGrams = 0;
  const stationCostTotals = new Map<string, number>();
  const anomalyItems: WasteAnomalyItem[] = [];

  for (const item of logs) {
    const costCents = item.costCents ?? (
      item.costPerGramCents
        ? Math.round(item.quantityGrams * item.costPerGramCents)
        : 0
    );

    totalWasteCostCents += costCents;
    totalWasteGrams += item.quantityGrams;

    const currentStationCost = stationCostTotals.get(item.station) ?? 0;
    stationCostTotals.set(item.station, currentStationCost + costCents);

    const hist = stationMap.get(item.station.toLowerCase());
    const historicalAvg = hist?.averageGrams ?? 0;

    let deviationMultiplier = 1;
    let deviationPercent = 0;
    let isSpike = false;

    if (historicalAvg > 0) {
      deviationMultiplier = Number((item.quantityGrams / historicalAvg).toFixed(2));
      deviationPercent = Math.round(((item.quantityGrams - historicalAvg) / historicalAvg) * 100);
      isSpike = deviationMultiplier >= spikeMultiplier;
    } else if (item.quantityGrams > 0 && historical.length > 0) {
      // Station had 0 historical waste baseline, any waste is a spike
      deviationMultiplier = 2.0;
      deviationPercent = 100;
      isSpike = true;
    }

    if (isSpike || costCents >= costThresholdCents) {
      let severity: AnomalySeverity = 'low';
      if (deviationMultiplier >= 2.5 || (deviationMultiplier >= 2.0 && costCents >= costThresholdCents * 2)) {
        severity = 'critical';
      } else if (deviationMultiplier >= 2.0 || costCents >= costThresholdCents) {
        severity = 'high';
      } else if (deviationMultiplier >= 1.4 || costCents >= costThresholdCents / 2) {
        severity = 'medium';
      }

      let advice = `Station "${item.station}" waste is elevated (+${deviationPercent}% vs baseline).`;
      if (costCents > 0) {
        advice += ` Cost impact: $${(costCents / 100).toFixed(2)}.`;
      }
      if (severity === 'critical') {
        advice += ` Immediate station supervisor audit and portion control check required.`;
      } else if (severity === 'high') {
        advice += ` Review prep batch sizes and recipe par levels.`;
      } else {
        advice += ` Monitor line handling and end-of-shift cooling procedures.`;
      }

      anomalyItems.push({
        station: item.station,
        ingredient: item.ingredient,
        quantityGrams: item.quantityGrams,
        historicalAverageGrams: historicalAvg,
        deviationPercent,
        deviationMultiplier,
        costCents,
        isSpike,
        severity,
        actionableAdvice: advice,
      });
    }
  }

  // Rank anomalies by cost impact descending, then quantity descending
  const rankedCostImpact = [...anomalyItems].sort((a, b) => {
    if (b.costCents !== a.costCents) return b.costCents - a.costCents;
    return b.quantityGrams - a.quantityGrams;
  });

  // Find station with highest total waste cost
  let highestCostStation: string | null = null;
  let maxStationCost = -1;
  for (const [station, cost] of stationCostTotals.entries()) {
    if (cost > maxStationCost) {
      maxStationCost = cost;
      highestCostStation = station;
    }
  }

  return {
    totalWasteCostCents,
    totalWasteGrams,
    anomalyCount: anomalyItems.length,
    highestCostImpactStation: highestCostStation,
    anomalies: anomalyItems,
    rankedCostImpact,
    generatedAt: new Date().toISOString(),
  };
}
