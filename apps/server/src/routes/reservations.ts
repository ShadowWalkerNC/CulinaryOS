// ============================================================
// CulinaryOS — Reservations API
// POST   /v1/reservations                   — create reservation
// GET    /v1/reservations                   — list (date / status filter)
// GET    /v1/reservations/availability      — time-slot availability
// GET    /v1/reservations/:id               — single reservation
// PATCH  /v1/reservations/:id/status        — update status (+ seat event)
// DELETE /v1/reservations/:id              — soft-cancel
// ============================================================

import { Hono }                    from 'hono';
import type { Context }            from 'hono';
import { handleIncomingEvent }     from '@culinaryos/event-bus';
import { requireTenant, ok, err }  from '../middleware/auth.js';
import type { Env }                from '../types.js';

export const reservationRoutes = new Hono<Env>();

reservationRoutes.use('*', requireTenant);

// ---- Demo time-slots -------------------------------------------------------

const DEMO_SLOTS = ['11:00', '11:30', '12:00', '12:30', '17:00', '17:30', '18:00', '18:30'];

// ---- helpers ---------------------------------------------------------------

/** Build start/end of a calendar day in UTC for a YYYY-MM-DD string. */
function dayRange(date: string): { start: string; end: string } | null {
  const d = new Date(`${date}T00:00:00.000Z`);
  if (isNaN(d.getTime())) return null;
  const start = d.toISOString();
  d.setUTCDate(d.getUTCDate() + 1);
  const end = d.toISOString();
  return { start, end };
}

/** Build a mock reservation object for demo mode. */
function mockReservation(overrides: Record<string, unknown> = {}) {
  return {
    id:           crypto.randomUUID(),
    tenant_id:    '00000000-0000-0000-0000-000000000001',
    status:       'confirmed',
    duration_mins: 90,
    sms_reminded: false,
    created_at:   new Date().toISOString(),
    updated_at:   new Date().toISOString(),
    demo_mode:    true,
    ...overrides,
  };
}

// ============================================================
// POST /v1/reservations
// ============================================================
reservationRoutes.post('/', async (c: Context<Env>) => {
  const tenantId = c.get('tenantId') as string;
  const supabase = c.get('supabase');

  const body = await c.req.json<{
    guest_name:    string;
    party_size:    number;
    reserved_at:   string;
    guest_phone?:  string;
    guest_email?:  string;
    duration_mins?: number;
    notes?:        string;
    table_id?:     string;
  }>().catch(() => null);

  if (!body) {
    return err(c, 'VALIDATION_ERROR', 'Request body must be valid JSON', 400);
  }

  // ---- Validation -----------------------------------------------------------
  if (!body.guest_name?.trim()) {
    return err(c, 'VALIDATION_ERROR', 'guest_name is required', 422);
  }
  if (!body.party_size || body.party_size < 1 || !Number.isInteger(body.party_size)) {
    return err(c, 'VALIDATION_ERROR', 'party_size must be an integer >= 1', 422);
  }
  if (!body.reserved_at) {
    return err(c, 'VALIDATION_ERROR', 'reserved_at is required (ISO 8601)', 422);
  }
  const reservedAt = new Date(body.reserved_at);
  if (isNaN(reservedAt.getTime())) {
    return err(c, 'VALIDATION_ERROR', 'reserved_at must be a valid ISO 8601 date-time', 422);
  }
  if (reservedAt.getTime() <= Date.now()) {
    return err(c, 'VALIDATION_ERROR', 'reserved_at must be a future date-time', 422);
  }

  // ---- Demo mode ------------------------------------------------------------
  if (!supabase) {
    return ok(c, mockReservation({
      guest_name:   body.guest_name,
      party_size:   body.party_size,
      reserved_at:  body.reserved_at,
      guest_phone:  body.guest_phone  ?? null,
      guest_email:  body.guest_email  ?? null,
      duration_mins: body.duration_mins ?? 90,
      notes:        body.notes        ?? null,
      table_id:     body.table_id     ?? null,
    }), 201);
  }

  // ---- Live path ------------------------------------------------------------
  const { data, error } = await supabase
    .from('reservations')
    .insert({
      tenant_id:    tenantId,
      guest_name:   body.guest_name.trim(),
      party_size:   body.party_size,
      reserved_at:  reservedAt.toISOString(),
      guest_phone:  body.guest_phone  ?? null,
      guest_email:  body.guest_email  ?? null,
      duration_mins: body.duration_mins ?? 90,
      notes:        body.notes        ?? null,
      table_id:     body.table_id     ?? null,
    })
    .select()
    .single();

  if (error) return err(c, 'DB_ERROR', error.message, 500);

  return ok(c, data, 201);
});

// ============================================================
// GET /v1/reservations
// ============================================================
reservationRoutes.get('/', async (c: Context<Env>) => {
  const tenantId = c.get('tenantId') as string;
  const supabase = c.get('supabase');

  const dateParam   = c.req.query('date');
  const statusParam = c.req.query('status');
  const limitParam  = parseInt(c.req.query('limit') ?? '50', 10);
  const limit       = isNaN(limitParam) || limitParam < 1 ? 50 : Math.min(limitParam, 200);

  // ---- Demo mode ------------------------------------------------------------
  if (!supabase) {
    return ok(c, [
      mockReservation({ guest_name: 'Alice Martin',  party_size: 2, reserved_at: new Date(Date.now() + 3_600_000).toISOString() }),
      mockReservation({ guest_name: 'Bob Chen',      party_size: 4, reserved_at: new Date(Date.now() + 7_200_000).toISOString() }),
      mockReservation({ guest_name: 'Carol Nguyen',  party_size: 6, reserved_at: new Date(Date.now() + 10_800_000).toISOString() }),
    ]);
  }

  // ---- Live path ------------------------------------------------------------
  let query = supabase
    .from('reservations')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('reserved_at', { ascending: true })
    .limit(limit);

  if (dateParam) {
    const range = dayRange(dateParam);
    if (!range) {
      return err(c, 'VALIDATION_ERROR', 'date must be in YYYY-MM-DD format', 422);
    }
    query = query.gte('reserved_at', range.start).lt('reserved_at', range.end);
  }

  if (statusParam) {
    query = query.eq('status', statusParam);
  }

  const { data, error } = await query;
  if (error) return err(c, 'DB_ERROR', error.message, 500);

  return ok(c, data);
});

// ============================================================
// GET /v1/reservations/availability
// Must be declared before /:id to avoid route shadowing
// ============================================================
reservationRoutes.get('/availability', async (c: Context<Env>) => {
  const tenantId = c.get('tenantId') as string;
  const supabase = c.get('supabase');
  const dateParam = c.req.query('date');
  const partySizeParam = parseInt(c.req.query('party_size') ?? '2', 10);
  const partySize = isNaN(partySizeParam) || partySizeParam < 1 ? 2 : partySizeParam;

  if (!dateParam) {
    return err(c, 'VALIDATION_ERROR', 'date query param is required (YYYY-MM-DD)', 422);
  }

  // ---- Demo mode ------------------------------------------------------------
  if (!supabase) {
    return ok(c, {
      date:       dateParam,
      party_size: partySize,
      slots: DEMO_SLOTS.map((time) => ({
        time,
        available:         true,
        reservations_count: 0,
        capacity_remaining: 6,
      })),
      demo_mode: true,
    });
  }

  // ---- Live path: count bookings per slot -----------------------------------
  const range = dayRange(dateParam);
  if (!range) {
    return err(c, 'VALIDATION_ERROR', 'date must be in YYYY-MM-DD format (YYYY-MM-DD)', 422);
  }

  const { data: dayReservations, error } = await supabase
    .from('reservations')
    .select('reserved_at, duration_mins, status')
    .eq('tenant_id', tenantId)
    .gte('reserved_at', range.start)
    .lt('reserved_at', range.end)
    .not('status', 'in', '("cancelled","no_show")');

  if (error) return err(c, 'DB_ERROR', error.message, 500);

  const MAX_CONCURRENT = 6;

  const slots = DEMO_SLOTS.map((time) => {
    // Build a Date for this slot on the requested date (UTC)
    const slotDt = new Date(`${dateParam}T${time}:00.000Z`);
    const slotEnd = new Date(slotDt.getTime() + 90 * 60_000);

    // Count how many existing reservations overlap with this slot window
    const overlapping = (dayReservations ?? []).filter((r: any) => {
      const rStart = new Date(r.reserved_at).getTime();
      const rEnd   = rStart + (r.duration_mins ?? 90) * 60_000;
      return rStart < slotEnd.getTime() && rEnd > slotDt.getTime();
    });

    const count = overlapping.length;
    return {
      time,
      available:          count < MAX_CONCURRENT,
      reservations_count: count,
      capacity_remaining: Math.max(0, MAX_CONCURRENT - count),
    };
  });

  return ok(c, { date: dateParam, party_size: partySize, slots });
});

// ============================================================
// GET /v1/reservations/:id
// ============================================================
reservationRoutes.get('/:id', async (c: Context<Env>) => {
  const tenantId = c.get('tenantId') as string;
  const supabase = c.get('supabase');
  const id       = c.req.param('id');

  if (!supabase) {
    return ok(c, mockReservation({ id, guest_name: 'Demo Guest', party_size: 2 }));
  }

  const { data, error } = await supabase
    .from('reservations')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single();

  if (error || !data) return err(c, 'NOT_FOUND', 'Reservation not found', 404);

  return ok(c, data);
});

// ============================================================
// PATCH /v1/reservations/:id/status
// ============================================================
reservationRoutes.patch('/:id/status', async (c: Context<Env>) => {
  const tenantId = c.get('tenantId') as string;
  const supabase = c.get('supabase');
  const id       = c.req.param('id');

  const body = await c.req.json<{
    status:    'pending' | 'confirmed' | 'seated' | 'completed' | 'cancelled' | 'no_show';
    table_id?: string;
  }>().catch(() => null);

  if (!body || !body.status) {
    return err(c, 'VALIDATION_ERROR', 'status is required', 422);
  }

  const validStatuses = ['pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no_show'];
  if (!validStatuses.includes(body.status)) {
    return err(c, 'VALIDATION_ERROR', `status must be one of: ${validStatuses.join(', ')}`, 422);
  }

  // ---- Demo mode ------------------------------------------------------------
  if (!supabase) {
    const updated = mockReservation({ id, status: body.status, table_id: body.table_id ?? null });
    if (body.status === 'seated') {
      await handleIncomingEvent({
        eventId:   crypto.randomUUID(),
        eventType: 'pos:reservation:seated',
        tenantId,
        source:    'reservations',
        timestamp: new Date().toISOString(),
        version:   1,
        payload: { reservation_id: id, table_id: body.table_id ?? null, tenant_id: tenantId },
      }).catch((e: Error) => console.warn('[reservations] Event emit failed:', e.message));
    }
    return ok(c, updated);
  }

  // ---- Verify reservation belongs to tenant ---------------------------------
  const { data: existing, error: fetchErr } = await supabase
    .from('reservations')
    .select('id, status, tenant_id')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single();

  if (fetchErr || !existing) return err(c, 'NOT_FOUND', 'Reservation not found', 404);

  // ---- Apply update ---------------------------------------------------------
  const updatePayload: Record<string, unknown> = {
    status:     body.status,
    updated_at: new Date().toISOString(),
  };
  if (body.table_id !== undefined) {
    updatePayload.table_id = body.table_id;
  }

  const { data: updated, error: updateErr } = await supabase
    .from('reservations')
    .update(updatePayload)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single();

  if (updateErr) return err(c, 'DB_ERROR', updateErr.message, 500);

  // ---- Emit domain event when guest is seated -------------------------------
  if (body.status === 'seated') {
    await handleIncomingEvent({
      eventId:   crypto.randomUUID(),
      eventType: 'pos:reservation:seated',
      tenantId,
      source:    'reservations',
      timestamp: new Date().toISOString(),
      version:   1,
      payload: {
        reservation_id: id,
        table_id:       body.table_id ?? updated?.table_id ?? null,
        tenant_id:      tenantId,
      },
    }).catch((e: Error) => console.warn('[reservations] Event emit failed:', e.message));
  }

  return ok(c, updated);
});

// ============================================================
// DELETE /v1/reservations/:id  — soft-delete (status → cancelled)
// ============================================================
reservationRoutes.delete('/:id', async (c: Context<Env>) => {
  const tenantId = c.get('tenantId') as string;
  const supabase = c.get('supabase');
  const id       = c.req.param('id');

  if (!supabase) {
    return ok(c, { success: true, id, status: 'cancelled', demo_mode: true });
  }

  const { error } = await supabase
    .from('reservations')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', tenantId);

  if (error) return err(c, 'DB_ERROR', error.message, 500);

  return ok(c, { success: true });
});
