/**
 * @culinaryos/forecast-engine
 * Pure functions for predictive order volume smoothing, rush queue bottleneck detection,
 * and adaptive safety-stock par level recommendations.
 */

export interface HistoricalDaypartSales {
  dayOfWeek: number; // 0 = Sunday, 6 = Saturday
  daypart: 'breakfast' | 'lunch' | 'dinner' | 'late_night';
  orderCount: number;
  grossRevenueCents: number;
}

export interface DaypartForecastResult {
  predictedOrderCount: number;
  confidenceScorePercent: number;
  projectedRevenueCents: number;
  suggestedLineStaffCount: number;
}

export interface KitchenBottleneckAdvisory {
  station: string;
  activeTicketCount: number;
  stationCapacity: number;
  loadFactor: number; // ratio active / capacity
  isBottleneck: boolean;
  advisoryLevel: 'normal' | 'moderate_delay' | 'heavy_rush_throttle';
  recommendedPrepPaddingMins: number; // e.g. +15m
  recommendedAction: string;
}

export interface ParLevelRecommendation {
  ingredientId: string;
  name: string;
  unit: string;
  currentParLevel: number;
  suggestedParLevel: number;
  averageDailyUsage: number;
  supplierLeadTimeDays: number;
  deltaPercent: number;
  rationale: string;
}

/**
 * Computes smoothed forecast demand based on historical weekday patterns.
 */
export function forecastDaypartDemand(
  history: HistoricalDaypartSales[],
  targetDayOfWeek: number,
  targetDaypart: 'breakfast' | 'lunch' | 'dinner' | 'late_night',
  weatherMultiplier = 1.0 // 1.1 for clear sunny weekends, 0.9 for storm
): DaypartForecastResult {
  const matching = history.filter(
    (h) => h.dayOfWeek === targetDayOfWeek && h.daypart === targetDaypart
  );

  if (matching.length === 0) {
    return {
      predictedOrderCount: 40,
      confidenceScorePercent: 50,
      projectedRevenueCents: 120000,
      suggestedLineStaffCount: 3,
    };
  }

  const avgOrders = matching.reduce((s, h) => s + h.orderCount, 0) / matching.length;
  const avgRev = matching.reduce((s, h) => s + h.grossRevenueCents, 0) / matching.length;

  const predictedOrders = Math.round(avgOrders * weatherMultiplier);
  const projectedRevenueCents = Math.round(avgRev * weatherMultiplier);

  // Suggested staffing: 1 cook per 20 orders/hr
  const suggestedLineStaffCount = Math.max(2, Math.ceil(predictedOrders / 20));

  return {
    predictedOrderCount: predictedOrders,
    confidenceScorePercent: Math.min(95, 70 + matching.length * 5),
    projectedRevenueCents,
    suggestedLineStaffCount,
  };
}

/**
 * Assesses station queue depth and emits advisory bottleneck alerts.
 */
export function evaluateKitchenBottlenecks(stations: Array<{
  stationName: string;
  activeTickets: number;
  nominalCapacity: number; // e.g. 10 simultaneous orders
}>): KitchenBottleneckAdvisory[] {
  return stations.map((st) => {
    const loadFactor = Math.round((st.activeTickets / Math.max(1, st.nominalCapacity)) * 100) / 100;
    let advisoryLevel: KitchenBottleneckAdvisory['advisoryLevel'] = 'normal';
    let recommendedPrepPaddingMins = 0;
    let recommendedAction = 'Station operating within normal throughput parameters.';

    if (loadFactor >= 1.5) {
      advisoryLevel = 'heavy_rush_throttle';
      recommendedPrepPaddingMins = 20;
      recommendedAction = `Heavy queue detected on ${st.stationName}. Recommend adding +20 min padding to online orders and staging Course 2 fires.`;
    } else if (loadFactor >= 1.0) {
      advisoryLevel = 'moderate_delay';
      recommendedPrepPaddingMins = 10;
      recommendedAction = `Moderate rush approaching capacity on ${st.stationName}. Recommend +10 min pickup estimate.`;
    }

    return {
      station: st.stationName,
      activeTicketCount: st.activeTickets,
      stationCapacity: st.nominalCapacity,
      loadFactor,
      isBottleneck: loadFactor >= 1.0,
      advisoryLevel,
      recommendedPrepPaddingMins,
      recommendedAction,
    };
  });
}

/**
 * Calculates adaptive safety-stock par levels based on daily velocity and lead time.
 * Formula: Par = (Daily Velocity * Lead Time Days) * 1.5 (Safety Stock Buffer)
 */
export function calculateAdaptiveParLevels(items: Array<{
  ingredientId: string;
  name: string;
  unit: string;
  currentParLevel: number;
  dailyUsageHistory: number[]; // past 7 days usage
  supplierLeadTimeDays: number;
}>): ParLevelRecommendation[] {
  return items.map((i) => {
    const avgUsage = i.dailyUsageHistory.length > 0
      ? i.dailyUsageHistory.reduce((a, b) => a + b, 0) / i.dailyUsageHistory.length
      : 5;
    
    // Safety buffer 1.5x
    const rawSuggested = avgUsage * Math.max(1, i.supplierLeadTimeDays) * 1.5;
    const suggestedParLevel = Math.ceil(rawSuggested);
    const delta = suggestedParLevel - i.currentParLevel;
    const deltaPercent = i.currentParLevel > 0
      ? Math.round((delta / i.currentParLevel) * 100)
      : 0;

    let rationale = 'Par level aligned with current cooking velocity.';
    if (deltaPercent > 20) {
      rationale = `High velocity spike detected: Increase par by ${deltaPercent}% to prevent 86 stockouts.`;
    } else if (deltaPercent < -20) {
      rationale = `Low demand velocity: Decrease par by ${Math.abs(deltaPercent)}% to reduce food spoilage.`;
    }

    return {
      ingredientId: i.ingredientId,
      name: i.name,
      unit: i.unit,
      currentParLevel: i.currentParLevel,
      suggestedParLevel,
      averageDailyUsage: Math.round(avgUsage * 10) / 10,
      supplierLeadTimeDays: i.supplierLeadTimeDays,
      deltaPercent,
      rationale,
    };
  });
}
