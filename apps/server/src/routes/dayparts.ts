// ============================================================
// CulinaryOS — Daypart & Happy Hour Pricing Routes (apps/server)
// Scheduled pricing rules, time-range validations, and live price resolution
// ============================================================

import { Hono } from 'hono';
import { requireTenant, ok, err } from '../middleware/auth.js';
import {
  type DaypartSchedule,
  validateDaypartSchedule,
  isScheduleActive,
  resolveEffectivePrice,
  formatDaypartTimeWindow,
} from '@culinaryos/shared';
import type { Env } from '../types.js';

export const daypartsRoutes = new Hono<Env>();

daypartsRoutes.use('*', requireTenant);

// In-memory store for Demo/Mock mode schedules
const mockSchedules: DaypartSchedule[] = [
  {
    id: 'dp-happy-hour',
    name: 'Weekday Happy Hour',
    daysOfWeek: [1, 2, 3, 4, 5], // Mon-Fri
    startTime: '16:00',
    endTime: '19:00',
    adjustmentType: 'percent',
    value: 20, // 20% off
    active: true,
    priority: 10,
    categoryIds: ['bar', 'drinks', 'starters', 'apps'],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'dp-late-night',
    name: 'Late Night Slice Special',
    daysOfWeek: [4, 5, 6], // Thu-Sat
    startTime: '22:00',
    endTime: '02:00',
    adjustmentType: 'fixed_cents',
    value: 300, // $3.00 off
    active: true,
    priority: 5,
    categoryIds: ['pizza', 'bar'],
    createdAt: new Date().toISOString(),
  },
];

// GET /v1/dayparts
daypartsRoutes.get('/', async (c) => {
  const supabase = c.get('supabase');
  const tenantId = c.get('tenantId');

  if (!supabase) {
    const list = mockSchedules.map((s) => ({
      ...s,
      timeWindowLabel: formatDaypartTimeWindow(s),
    }));
    return ok(c, list);
  }

  const { data, error } = await supabase
    .from('daypart_schedules')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('priority', { ascending: false });

  if (error) {
    // Fallback to mock schedules if table not yet migrated
    const list = mockSchedules.map((s) => ({
      ...s,
      timeWindowLabel: formatDaypartTimeWindow(s),
    }));
    return ok(c, list);
  }

  const formatted = (data ?? []).map((s: any) => ({
    ...s,
    daysOfWeek: s.days_of_week ?? s.daysOfWeek,
    startTime: s.start_time ?? s.startTime,
    endTime: s.end_time ?? s.endTime,
    adjustmentType: s.adjustment_type ?? s.adjustmentType,
    categoryIds: s.category_ids ?? s.categoryIds,
    itemIds: s.item_ids ?? s.itemIds,
    timeWindowLabel: formatDaypartTimeWindow(s),
  }));

  return ok(c, formatted);
});

// GET /v1/dayparts/active
daypartsRoutes.get('/active', async (c) => {
  const supabase = c.get('supabase');
  const tenantId = c.get('tenantId');
  const atTimeStr = c.req.query('atTime');
  const atTime = atTimeStr ? new Date(atTimeStr) : new Date();

  let schedules: DaypartSchedule[] = [];

  if (!supabase) {
    schedules = mockSchedules;
  } else {
    const { data } = await supabase
      .from('daypart_schedules')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('active', true);

    if (data && data.length > 0) {
      schedules = data.map((s: any) => ({
        id: s.id,
        name: s.name,
        daysOfWeek: s.days_of_week ?? s.daysOfWeek ?? [0, 1, 2, 3, 4, 5, 6],
        startTime: s.start_time ?? s.startTime,
        endTime: s.end_time ?? s.endTime,
        adjustmentType: s.adjustment_type ?? s.adjustmentType,
        value: s.value,
        categoryIds: s.category_ids ?? s.categoryIds,
        itemIds: s.item_ids ?? s.itemIds,
        active: s.active,
        priority: s.priority,
      }));
    } else {
      schedules = mockSchedules;
    }
  }

  const active = schedules
    .filter((s) => isScheduleActive(s, atTime))
    .map((s) => ({
      ...s,
      timeWindowLabel: formatDaypartTimeWindow(s),
    }));

  return ok(c, {
    timestamp: atTime.toISOString(),
    dayOfWeek: atTime.getDay(),
    timeOfDay: `${String(atTime.getHours()).padStart(2, '0')}:${String(atTime.getMinutes()).padStart(2, '0')}`,
    activeSchedules: active,
  });
});

// POST /v1/dayparts
daypartsRoutes.post('/', async (c) => {
  const supabase = c.get('supabase');
  const tenantId = c.get('tenantId');
  const raw = await c.req.json().catch(() => ({}));
  const body: any = raw || {};

  const validation = validateDaypartSchedule(body);
  if (!validation.valid) {
    return err(c, 'VALIDATION_ERROR', validation.errors.join(' '), 422);
  }

  const newSchedule: DaypartSchedule = {
    id: `dp-${Date.now()}`,
    tenantId,
    name: body.name!.trim(),
    daysOfWeek: body.daysOfWeek!,
    startTime: body.startTime!,
    endTime: body.endTime!,
    adjustmentType: body.adjustmentType!,
    value: body.value!,
    categoryIds: body.categoryIds || [],
    itemIds: body.itemIds || [],
    active: body.active !== false,
    priority: body.priority ?? 0,
    createdAt: new Date().toISOString(),
  };

  if (!supabase) {
    mockSchedules.unshift(newSchedule);
    return ok(c, {
      ...newSchedule,
      timeWindowLabel: formatDaypartTimeWindow(newSchedule),
    }, 201);
  }

  try {
    const { data, error } = await supabase
      .from('daypart_schedules')
      .insert({
        tenant_id: tenantId,
        name: newSchedule.name,
        days_of_week: newSchedule.daysOfWeek,
        start_time: newSchedule.startTime,
        end_time: newSchedule.endTime,
        adjustment_type: newSchedule.adjustmentType,
        value: newSchedule.value,
        category_ids: newSchedule.categoryIds,
        item_ids: newSchedule.itemIds,
        active: newSchedule.active,
        priority: newSchedule.priority,
      })
      .select()
      .single();

    if (error) {
      mockSchedules.unshift(newSchedule);
      return ok(c, {
        ...newSchedule,
        timeWindowLabel: formatDaypartTimeWindow(newSchedule),
      }, 201);
    }

    return ok(c, {
      ...data,
      timeWindowLabel: formatDaypartTimeWindow(newSchedule),
    }, 201);
  } catch {
    mockSchedules.unshift(newSchedule);
    return ok(c, newSchedule, 201);
  }
});

// POST /v1/dayparts/calculate-price
daypartsRoutes.post('/calculate-price', async (c) => {
  const supabase = c.get('supabase');
  const tenantId = c.get('tenantId');
  const body = await c.req.json<{
    basePriceCents?: number;
    categoryId?: string;
    itemId?: string;
    atTime?: string;
  }>().catch(() => ({} as any));

  const basePriceCents = Number(body.basePriceCents);
  if (isNaN(basePriceCents) || basePriceCents < 0) {
    return err(c, 'VALIDATION_ERROR', 'basePriceCents must be a positive number', 422);
  }

  const atTime = body.atTime ? new Date(body.atTime) : new Date();

  let schedules: DaypartSchedule[] = mockSchedules;
  if (supabase) {
    const { data } = await supabase
      .from('daypart_schedules')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('active', true);

    if (data && data.length > 0) {
      schedules = data.map((s: any) => ({
        id: s.id,
        name: s.name,
        daysOfWeek: s.days_of_week ?? s.daysOfWeek ?? [0, 1, 2, 3, 4, 5, 6],
        startTime: s.start_time ?? s.startTime,
        endTime: s.end_time ?? s.endTime,
        adjustmentType: s.adjustment_type ?? s.adjustmentType,
        value: s.value,
        categoryIds: s.category_ids ?? s.categoryIds,
        itemIds: s.item_ids ?? s.itemIds,
        active: s.active,
        priority: s.priority,
      }));
    }
  }

  const result = resolveEffectivePrice(basePriceCents, schedules, atTime, {
    categoryId: body.categoryId,
    itemId: body.itemId,
  });

  return ok(c, result);
});

// GET /v1/dayparts/:id
daypartsRoutes.get('/:id', async (c) => {
  const { id } = c.req.param();
  const schedule = mockSchedules.find((s) => s.id === id);
  if (!schedule) return err(c, 'NOT_FOUND', `Schedule ${id} not found`, 404);
  return ok(c, {
    ...schedule,
    timeWindowLabel: formatDaypartTimeWindow(schedule),
  });
});

// DELETE /v1/dayparts/:id
daypartsRoutes.delete('/:id', async (c) => {
  const { id } = c.req.param();
  const index = mockSchedules.findIndex((s) => s.id === id);
  if (index >= 0) {
    mockSchedules.splice(index, 1);
  }
  return ok(c, { success: true, id });
});

export default daypartsRoutes;
