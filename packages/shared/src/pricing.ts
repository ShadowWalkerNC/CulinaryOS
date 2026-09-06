// ============================================================
// CulinaryOS — Automated Daypart & Happy Hour Pricing Engine
// Scheduled time/day pricing rules with validation and price resolution
// ============================================================


export type PricingAdjustmentType = 'percent' | 'fixed_cents' | 'override_cents';

export interface DaypartSchedule {
  id: string;
  name: string;
  daysOfWeek: number[]; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  startTime: string;    // 'HH:MM' (24h) e.g. '16:00'
  endTime: string;      // 'HH:MM' (24h) e.g. '19:00'
  adjustmentType: PricingAdjustmentType;
  value: number;        // percent discount (e.g. 20 or -20 for 20%), cents off, or fixed price in cents
  categoryIds?: string[];
  itemIds?: string[];
  active?: boolean;
  priority?: number;
  tenantId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface EffectivePriceResult {
  effectivePriceCents: number;
  originalPriceCents: number;
  appliedSchedules: DaypartSchedule[];
  appliedSchedule?: DaypartSchedule | undefined;
  savingsCents: number;
  isDiscounted: boolean;
}

/**
 * Validates a 24-hour time string format 'HH:MM'.
 */
function isValidTimeFormat(timeStr: string): boolean {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(timeStr)) return false;
  return true;
}

/**
 * Parses 'HH:MM' into total minutes from midnight (0..1439).
 */
function parseTimeToMinutes(timeStr: string): number {
  const parts = timeStr.split(':').map(Number);
  const h = parts[0] ?? 0;
  const m = parts[1] ?? 0;
  return h * 60 + m;
}

/**
 * Validates a daypart / happy hour schedule configuration.
 */
export function validateDaypartSchedule(schedule: Partial<DaypartSchedule>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!schedule.name || schedule.name.trim().length === 0) {
    errors.push('Schedule name is required.');
  }

  if (!Array.isArray(schedule.daysOfWeek) || schedule.daysOfWeek.length === 0) {
    errors.push('At least one day of week (0–6) must be selected.');
  } else {
    const invalidDays = schedule.daysOfWeek.filter((d) => typeof d !== 'number' || d < 0 || d > 6);
    if (invalidDays.length > 0) {
      errors.push('Days of week must be numbers between 0 (Sunday) and 6 (Saturday).');
    }
  }

  if (!schedule.startTime || !isValidTimeFormat(schedule.startTime)) {
    errors.push('Start time must be a valid 24-hour format (HH:MM).');
  }

  if (!schedule.endTime || !isValidTimeFormat(schedule.endTime)) {
    errors.push('End time must be a valid 24-hour format (HH:MM).');
  }

  if (!schedule.adjustmentType || !['percent', 'fixed_cents', 'override_cents'].includes(schedule.adjustmentType)) {
    errors.push('Adjustment type must be one of: "percent", "fixed_cents", or "override_cents".');
  }

  if (typeof schedule.value !== 'number' || isNaN(schedule.value)) {
    errors.push('Adjustment value must be a valid number.');
  } else {
    if (schedule.adjustmentType === 'percent' && (Math.abs(schedule.value) <= 0 || Math.abs(schedule.value) > 100)) {
      errors.push('Percent discount must be between 1% and 100%.');
    }
    if (schedule.adjustmentType === 'override_cents' && schedule.value < 0) {
      errors.push('Override price in cents cannot be negative.');
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Checks if a given schedule is active at a specific timestamp.
 */
export function isScheduleActive(schedule: DaypartSchedule, atTime: Date = new Date()): boolean {
  if (schedule.active === false) return false;

  const currentDay = atTime.getDay();
  const currentMinutes = atTime.getHours() * 60 + atTime.getMinutes();
  const startMinutes = parseTimeToMinutes(schedule.startTime);
  const endMinutes = parseTimeToMinutes(schedule.endTime);

  if (startMinutes <= endMinutes) {
    // Normal same-day window (e.g. 16:00 to 19:00)
    if (!schedule.daysOfWeek.includes(currentDay)) return false;
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  } else {
    // Overnight window spanning midnight (e.g. 22:00 to 02:00)
    if (schedule.daysOfWeek.includes(currentDay) && currentMinutes >= startMinutes) {
      return true;
    }
    const prevDay = (currentDay + 6) % 7;
    if (schedule.daysOfWeek.includes(prevDay) && currentMinutes <= endMinutes) {
      return true;
    }
    return false;
  }
}

/**
 * Resolves the effective price for an item based on active daypart schedules.
 */
export function resolveEffectivePrice(
  basePriceCents: number,
  schedules: DaypartSchedule[] = [],
  atTime: Date = new Date(),
  itemContext?: { categoryId?: string; itemId?: string; sectionId?: string }
): EffectivePriceResult {
  // Filter active schedules matching item context
  const matchingSchedules = schedules
    .filter((s) => isScheduleActive(s, atTime))
    .filter((s) => {
      // If schedule specifies itemIds, item must be in list
      if (s.itemIds && s.itemIds.length > 0) {
        if (!itemContext?.itemId || !s.itemIds.includes(itemContext.itemId)) return false;
      }
      // If schedule specifies categoryIds, category/section must match
      if (s.categoryIds && s.categoryIds.length > 0) {
        const cat = itemContext?.categoryId ?? itemContext?.sectionId;
        if (!cat || !s.categoryIds.includes(cat)) return false;
      }
      return true;
    })
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

  if (matchingSchedules.length === 0) {
    return {
      effectivePriceCents: basePriceCents,
      originalPriceCents: basePriceCents,
      appliedSchedules: [],
      appliedSchedule: undefined,
      savingsCents: 0,
      isDiscounted: false,
    };
  }

  let currentPrice = basePriceCents;
  const applied: DaypartSchedule[] = [];

  for (const schedule of matchingSchedules) {
    applied.push(schedule);

    switch (schedule.adjustmentType) {
      case 'override_cents':
        currentPrice = Math.max(0, schedule.value);
        break;

      case 'fixed_cents':
        const discountCents = Math.abs(schedule.value);
        currentPrice = Math.max(0, currentPrice - discountCents);
        break;

      case 'percent':
        const pct = Math.abs(schedule.value);
        const discountFromPct = Math.round(currentPrice * (pct / 100));
        currentPrice = Math.max(0, currentPrice - discountFromPct);
        break;
    }
  }

  const savingsCents = Math.max(0, basePriceCents - currentPrice);

  return {
    effectivePriceCents: currentPrice,
    originalPriceCents: basePriceCents,
    appliedSchedules: applied,
    appliedSchedule: applied[0],
    savingsCents,
    isDiscounted: savingsCents > 0,
  };
}

/**
 * Calculates effective daypart pricing across all items in a menu.
 */
export function calculateMenuDaypartPrices(
  items: any[],
  schedules: DaypartSchedule[],
  atTime: Date = new Date()
): Map<string, { effectivePriceCents: number; isDiscounted: boolean; savingsCents: number }> {
  const map = new Map<string, { effectivePriceCents: number; isDiscounted: boolean; savingsCents: number }>();
  for (const item of items) {
    const basePrice = item.basePriceCents ?? item.price ?? 0;
    const res = resolveEffectivePrice(basePrice, schedules, atTime, {
      itemId: item.id,
      categoryId: item.categoryId ?? item.category,
      sectionId: item.sectionId,
    });
    map.set(item.id, {
      effectivePriceCents: res.effectivePriceCents,
      isDiscounted: res.isDiscounted,
      savingsCents: res.savingsCents,
    });
  }
  return map;
}

/**
 * Formats a human-readable day & time window for a schedule (e.g. "Mon–Fri • 4:00 PM – 7:00 PM").
 */
export function formatDaypartTimeWindow(schedule: DaypartSchedule): string {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const days = schedule.daysOfWeek
    .slice()
    .sort((a, b) => a - b)
    .map((d) => dayNames[d]);

  const daysLabel = days.length === 7 ? 'Daily' : days.join(', ');

  function formatTime(t: string): string {
    const parts = t.split(':').map(Number);
    const h = parts[0] ?? 0;
    const m = parts[1] ?? 0;
    const period = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 === 0 ? 12 : h % 12;
    const displayM = m === 0 ? '' : `:${String(m).padStart(2, '0')}`;
    return `${displayH}${displayM} ${period}`;
  }

  return `${daysLabel} • ${formatTime(schedule.startTime)} – ${formatTime(schedule.endTime)}`;
}
