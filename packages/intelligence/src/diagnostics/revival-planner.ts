import type {
  RevivalPlanInput,
  FinancialRevivalPlan,
  RevivalWeekPlan,
} from './types.ts';

/**
 * Generates an actionable 30-day (4-week) financial and operational turnaround plan
 * tailored to an operator's prime cost variance, waste anomalies, and menu matrix diagnosis.
 */
export function generateRevivalPlan(input: RevivalPlanInput): FinancialRevivalPlan {
  const { primeCost, wasteReport, menuMatrix } = input;
  const currentPrimeCostPercent = primeCost.primeCostPercent;
  const targetPrimeCostPercent = primeCost.targetPrimeCostPercent ?? 60.0;
  const variance = primeCost.variancePercent;

  let urgencyLevel: 'urgent' | 'moderate' | 'maintenance' = 'maintenance';
  if (variance > 8.0) {
    urgencyLevel = 'urgent';
  } else if (variance > 0) {
    urgencyLevel = 'moderate';
  }

  // Savings estimation: monthly and annual recovery
  const monthlyRevenue = primeCost.revenueCents;
  const excessCostFraction = Math.max(0, variance / 100);
  const projectedMonthlySavingsCents = Math.round(monthlyRevenue * excessCostFraction);
  const projectedAnnualSavingsCents = projectedMonthlySavingsCents * 12;

  // Derive immediate top 3 priorities
  const immediateTop3Priorities: string[] = [];

  if (primeCost.breakdown.laborStatus !== 'on-target') {
    immediateTop3Priorities.push(
      'Cap unapproved overtime at 38 hours and enforce strict 15-minute staggered clock-in rules for BOH shifts.'
    );
  }
  if (wasteReport && wasteReport.anomalyCount > 0) {
    const topStation = wasteReport.highestCostImpactStation ?? 'main prep';
    immediateTop3Priorities.push(
      `Mandate digital shift waste logging at station "${topStation}" and recalibrate protein portion scales.`
    );
  } else if (primeCost.breakdown.cogsStatus !== 'on-target') {
    immediateTop3Priorities.push(
      'Conduct a 100% vendor invoice price comparison against purchase order contracts to halt ingredient cost creep.'
    );
  }
  if (menuMatrix && menuMatrix.summary.dogs > 0) {
    immediateTop3Priorities.push(
      `86 or re-engineer the ${menuMatrix.summary.dogs} identified "Dog" menu items draining margin and prep labor.`
    );
  } else {
    immediateTop3Priorities.push(
      'Reprice high-volume "Plowhorse" dishes to recover minimum 300 bps contribution margin.'
    );
  }

  // Week 1 Plan: Immediate Triage & Cash Bleed Reduction
  const week1Savings = Math.round(projectedMonthlySavingsCents * 0.35);
  const week1: RevivalWeekPlan = {
    week: 1,
    title: 'Immediate Triage & Cash Bleed Reduction',
    focus: 'Stop active cash leaks across station waste and unscheduled overtime.',
    milestones: [
      'Activate digital shift waste logging at every prep and line station',
      'Audit the past 14 days of punch logs and eliminate unapproved overtime',
      'Freeze non-essential pantry and supply reorders',
    ],
    dailyActions: [
      'Day 1: Calibrate all kitchen portion scales and inspect trash bins at shift change',
      'Day 2: Audit top 5 vendor invoices for undocumented delivery price hikes',
      'Day 3: Hold 10-minute BOH huddle on portion standards for highest-cost proteins',
      'Day 4: Establish strict clock-in grace period (no punching in >5 min before shift)',
      'Day 5: Implement mid-shift line cut checklist for slow volume hours',
      'Day 6: Conduct weekend prep audit against actual reservation books',
      'Day 7: Weekly prime cost reconciliation: review Day 1–7 labor and waste deltas',
    ],
    targetCentsSaved: week1Savings,
  };

  // Week 2 Plan: Menu & Recipe Cost Recalibration
  const week2Savings = Math.round(projectedMonthlySavingsCents * 0.30);
  const week2: RevivalWeekPlan = {
    week: 2,
    title: 'Menu Engineering & Recipe Cost Recalibration',
    focus: 'Re-align pricing and portions on Plowhorses, Puzzles, and Dogs.',
    milestones: [
      'Recalculate plate economics on top 15 revenue-generating dishes',
      'Execute price adjustment (+3% to +6%) on verified Plowhorses',
      '86 persistent Dog items or convert to high-yield chef specials',
    ],
    dailyActions: [
      'Day 8: Re-cost recipes for the top 5 sellers based on current vendor delivery prices',
      'Day 9: Adjust side dish portions or swap costly garnishes with high-perceived-value alternatives',
      'Day 10: Launch server incentive for high-margin "Puzzle" menu dishes',
      'Day 11: Remove or replace lowest 3 performing Dog items from POS and digital menus',
      'Day 12: Train FOH team on upselling pairings (appetizers, craft beverages, desserts)',
      'Day 13: Monitor customer price resistance on repriced Plowhorses (target zero volume drop)',
      'Day 14: Week 2 margin review: verify theoretical vs actual food cost convergence',
    ],
    targetCentsSaved: week2Savings,
  };

  // Week 3 Plan: Labor Scheduling & Station Waste Protocol
  const week3Savings = Math.round(projectedMonthlySavingsCents * 0.20);
  const week3: RevivalWeekPlan = {
    week: 3,
    title: 'Labor Scheduling & Station Waste Protocol',
    focus: 'Institutionalize efficient prep pars and demand-forecasted staffing.',
    milestones: [
      'Switch from static weekly schedules to forecasted-cover dynamic schedules',
      'Enforce station prep pars tied to weekend reservation projections',
      'Achieve zero unlogged waste bins across all stations',
    ],
    dailyActions: [
      'Day 15: Publish next week schedule matching historical sales hourly curves',
      'Day 16: Set minimum and maximum par levels for walk-in cooler proteins and produce',
      'Day 17: Cross-train one line cook for prep coverage to reduce split shifts',
      'Day 18: Audit station closing checklists and overnight refrigeration temps',
      'Day 19: Review FOH floor cuts at 2:00 PM and 8:30 PM based on live table turns',
      'Day 20: Conduct mystery shopper / manager table audit on portion consistency',
      'Day 21: Week 3 labor check: confirm Labor Cost is under 32% of weekly sales',
    ],
    targetCentsSaved: week3Savings,
  };

  // Week 4 Plan: Stabilization, Margin Audit & Forward Forecasting
  const week4Savings = Math.round(projectedMonthlySavingsCents * 0.15);
  const week4: RevivalWeekPlan = {
    week: 4,
    title: 'Stabilization, Margin Audit & Forward Forecasting',
    focus: 'Lock in permanent operational routines and verify Prime Cost <= 60%.',
    milestones: [
      'Verify target Prime Cost of <= 60% reached on weekly run-rate',
      'Conduct full physical pantry inventory and reconcile theoretical variance',
      'Lock in monthly vendor review cadence and KPI dashboard',
    ],
    dailyActions: [
      'Day 22: Complete end-of-month full physical inventory count in pantry and walk-ins',
      'Day 23: Reconcile POS theoretical ingredient usage against actual inventory on hand',
      'Day 24: Meet with primary food distributor to negotiate volume tier discounts',
      'Day 25: Present turn-around performance metrics to key supervisors and kitchen leads',
      'Day 26: Set up automated CulinaryOS alerts for daily waste > $25 and overtime warnings',
      'Day 27: Implement quarterly seasonal menu review calendar',
      'Day 28: Conduct full 30-day Z-report and P&L margin verification',
      'Day 29: Finalize ongoing SOP binders for station prep, opening, and closing',
      'Day 30: Celebrate milestones with team and cement operational standards as daily culture',
    ],
    targetCentsSaved: week4Savings,
  };

  const executiveSummary = urgencyLevel === 'urgent'
    ? `CRITICAL RECOVERY NEEDED: Current Prime Cost is ${currentPrimeCostPercent}% (${variance > 0 ? `+${variance}%` : ''} over 60% ceiling). Immediate implementation of this 30-day plan targets recovering $${(projectedMonthlySavingsCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/month ($${(projectedAnnualSavingsCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/yr).`
    : `OPTIMIZATION ROADMAP: Current Prime Cost is ${currentPrimeCostPercent}%. This 30-day plan fine-tunes station waste, menu margins, and labor scheduling to preserve long-term profit margins.`;

  return {
    restaurantId: input.restaurantId,
    restaurantName: input.restaurantName,
    currentPrimeCostPercent,
    targetPrimeCostPercent,
    projectedMonthlySavingsCents,
    projectedAnnualSavingsCents,
    executiveSummary,
    urgencyLevel,
    weeks: [week1, week2, week3, week4],
    immediateTop3Priorities,
    generatedAt: new Date().toISOString(),
  };
}
