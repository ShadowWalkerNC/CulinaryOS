import type {
  PrimeCostInput,
  PrimeCostAnalysis,
  PrimeCostSeverity,
  PrimeCostStatus,
} from './types.ts';

/**
 * Calculates Prime Cost % = (COGS + Labor) / Revenue against the gold-standard 60% industry benchmark.
 * Decomposes variance into COGS (<=28%) and Labor (<=32%) drivers and projects annual recovery potential.
 */
export function calculatePrimeCost(input: PrimeCostInput): PrimeCostAnalysis {
  const { revenueCents, cogsCents, laborCents } = input;
  const targetPrimeCostPercent = input.targetPrimeCostPercent ?? 60.0;
  const targetCogsPercent = input.targetCogsPercent ?? 28.0;
  const targetLaborPercent = input.targetLaborPercent ?? 32.0;

  if (revenueCents <= 0) {
    throw new Error('Revenue must be greater than zero to calculate prime cost.');
  }

  const primeCostCents = cogsCents + laborCents;
  const cogsPercent = Number(((cogsCents / revenueCents) * 100).toFixed(2));
  const laborPercent = Number(((laborCents / revenueCents) * 100).toFixed(2));
  const primeCostPercent = Number(((primeCostCents / revenueCents) * 100).toFixed(2));
  const variancePercent = Number((primeCostPercent - targetPrimeCostPercent).toFixed(2));

  let severity: PrimeCostSeverity = 'healthy';
  let status: PrimeCostStatus = 'OPTIMAL';

  if (primeCostPercent > 68.0) {
    severity = 'critical';
    status = 'CRITICAL_RISK';
  } else if (primeCostPercent > targetPrimeCostPercent) {
    severity = 'warning';
    status = 'ELEVATED';
  }

  const cogsStatus = cogsPercent > 33.0
    ? 'critical'
    : cogsPercent > targetCogsPercent
    ? 'elevated'
    : 'on-target';

  const laborStatus = laborPercent > 37.0
    ? 'critical'
    : laborPercent > targetLaborPercent
    ? 'elevated'
    : 'on-target';

  // Calculate potential annual savings if prime cost is brought to target 60%
  let potentialAnnualSavingsCents = 0;
  if (variancePercent > 0) {
    const excessCostRatio = variancePercent / 100;
    // Estimated on an annualized run-rate (assuming input period represents typical cadence)
    potentialAnnualSavingsCents = Math.round(revenueCents * excessCostRatio * 12);
  }

  const recommendations: string[] = [];

  if (status === 'OPTIMAL') {
    recommendations.push(
      `Prime Cost is healthy at ${primeCostPercent}% (target <=${targetPrimeCostPercent}%). Maintain current recipe portioning and labor scheduling.`
    );
  } else {
    if (cogsStatus !== 'on-target') {
      recommendations.push(
        `COGS is running at ${cogsPercent}% (target <=${targetCogsPercent}%). Audit protein portioning, inspect vendor invoice price creep, and 86 high-waste low-margin menu items.`
      );
    }
    if (laborStatus !== 'on-target') {
      recommendations.push(
        `Labor is running at ${laborPercent}% (target <=${targetLaborPercent}%). Stagger BOH prep call times, eliminate scheduled overtime over 38 hrs, and adjust shift cuts during slow covers.`
      );
    }
    if (severity === 'critical') {
      recommendations.push(
        `CRITICAL: Prime cost is exceeding viable margin by ${variancePercent}%. Initiate emergency 30-day revival plan immediately.`
      );
    }
  }

  return {
    revenueCents,
    cogsCents,
    laborCents,
    primeCostCents,
    cogsPercent,
    laborPercent,
    primeCostPercent,
    targetPrimeCostPercent,
    targetCogsPercent,
    targetLaborPercent,
    variancePercent,
    severity,
    status,
    breakdown: {
      cogsStatus,
      laborStatus,
    },
    potentialAnnualSavingsCents,
    actionableRecommendations: recommendations,
  };
}
