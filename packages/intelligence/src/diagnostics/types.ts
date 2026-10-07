/**
 * Restaurant financial, operational, and menu engineering diagnostic types.
 * Standardizes metrics for waste anomalies, prime cost health, Kasavana & Smith
 * menu matrices, and 30-day turn-around revival planning.
 */

export interface WasteLogItem {
  id?: string;
  station: string;
  ingredient: string;
  quantityGrams: number;
  costPerGramCents?: number;
  costCents?: number;
  reason?: string;
  loggedAt?: string;
}

export interface StationHistoricalWaste {
  station: string;
  averageGrams: number;
  standardDeviationGrams?: number;
  thresholdGrams?: number;
}

export type AnomalySeverity = 'low' | 'medium' | 'high' | 'critical';

export interface WasteAnomalyItem {
  station: string;
  ingredient: string;
  quantityGrams: number;
  historicalAverageGrams: number;
  deviationPercent: number;
  deviationMultiplier: number;
  costCents: number;
  isSpike: boolean;
  severity: AnomalySeverity;
  actionableAdvice: string;
}

export interface WasteAnomalyReport {
  totalWasteCostCents: number;
  totalWasteGrams: number;
  anomalyCount: number;
  highestCostImpactStation: string | null;
  anomalies: WasteAnomalyItem[];
  rankedCostImpact: WasteAnomalyItem[];
  generatedAt: string;
}

export interface PrimeCostInput {
  revenueCents: number;
  cogsCents: number;
  laborCents: number;
  targetPrimeCostPercent?: number; // default: 60%
  targetCogsPercent?: number;      // default: 28%
  targetLaborPercent?: number;     // default: 32%
}

export type PrimeCostSeverity = 'healthy' | 'warning' | 'critical';
export type PrimeCostStatus = 'OPTIMAL' | 'ELEVATED' | 'CRITICAL_RISK';

export interface PrimeCostAnalysis {
  revenueCents: number;
  cogsCents: number;
  laborCents: number;
  primeCostCents: number;
  cogsPercent: number;
  laborPercent: number;
  primeCostPercent: number;
  targetPrimeCostPercent: number;
  targetCogsPercent: number;
  targetLaborPercent: number;
  variancePercent: number;
  severity: PrimeCostSeverity;
  status: PrimeCostStatus;
  breakdown: {
    cogsStatus: 'on-target' | 'elevated' | 'critical';
    laborStatus: 'on-target' | 'elevated' | 'critical';
  };
  potentialAnnualSavingsCents: number;
  actionableRecommendations: string[];
}

export type MenuQuadrant = 'star' | 'plowhorse' | 'puzzle' | 'dog';

export interface MenuItemSalesInput {
  itemId: string;
  name: string;
  salesCount: number;
  priceCents: number;
  costCents: number;
  category?: string;
}

export interface MenuMatrixItem {
  itemId: string;
  name: string;
  salesCount: number;
  priceCents: number;
  costCents: number;
  contributionMarginCents: number;
  foodCostPercent: number;
  popularitySharePercent: number;
  isHighVolume: boolean;
  isHighMargin: boolean;
  quadrant: MenuQuadrant;
  recommendation: string;
  suggestedAction: 'maintain' | 'reprice' | 're-engineer' | 'promote' | '86';
}

export interface MenuMatrixReport {
  totalSalesCount: number;
  totalRevenueCents: number;
  totalMarginCents: number;
  averageContributionMarginCents: number;
  popularityThresholdSharePercent: number;
  items: MenuMatrixItem[];
  summary: {
    stars: number;
    plowhorses: number;
    puzzles: number;
    dogs: number;
  };
}

export interface RevivalPlanInput {
  restaurantId?: string;
  restaurantName?: string;
  primeCost: PrimeCostAnalysis;
  wasteReport?: WasteAnomalyReport;
  menuMatrix?: MenuMatrixReport;
}

export interface RevivalWeekPlan {
  week: number;
  title: string;
  focus: string;
  milestones: string[];
  dailyActions: string[];
  targetCentsSaved: number;
}

export interface FinancialRevivalPlan {
  restaurantId?: string;
  restaurantName?: string;
  currentPrimeCostPercent: number;
  targetPrimeCostPercent: number;
  projectedMonthlySavingsCents: number;
  projectedAnnualSavingsCents: number;
  executiveSummary: string;
  urgencyLevel: 'urgent' | 'moderate' | 'maintenance';
  weeks: RevivalWeekPlan[];
  immediateTop3Priorities: string[];
  generatedAt: string;
}
