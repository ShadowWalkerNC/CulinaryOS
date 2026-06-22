// ============================================================
// KDS — /v1/tickets routes
//
// GET    /v1/tickets            list active tickets
// GET    /v1/tickets/:id        get single ticket
// POST   /v1/tickets            create ticket (internal, from event bus)
// PATCH  /v1/tickets/:id        update ticket (bump, fire, recall, rush, void)
// ============================================================

import { Hono } from 'hono';
import { ok, err } from '../../../backend/middleware/auth';

const app = new Hono();

// GET /v1/tickets
app.get('/', async (c) => {
  const supabase  = c.get('supabase');
  const tenantId  = c.get('tenantId');
  const station   = c.req.query('station');
  const status    = c.req.query('status') ?? 'fired';
  const course    = c.req.query('course');

  let q = supabase
    .from('kitchen_tickets')
    .select('*, items:ticket_items(id, line_item_id, name, quantity, modifiers, notes, sort_order)')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: true });

  // Status filter — support comma-separated list or default active set
  if (status === 'active') {
    q = q.in('status', ['queued', 'fired', 'cooking']);
  } else if (status.includes(',')) {
    q = q.in('status', status.split(','));
  } else {
    q = q.eq('status', status);
  }

  if (station) q = q.eq('station', station);
  if (course)  q = q.eq('course_number', parseInt(course, 10));

  const { data, error } = await q;
  if (error) return err(c, 'INTERNAL_ERROR', error.message, 500);
  return ok(c, data);
});

// GET /v1/tickets/:id
app.get('/:id', async (c) => {
  const supabase = c.get('supabase');
  const tenantId = c.get('tenantId');
  const { id }   = c.req.param();

  const { data, error } = await supabase
    .from('kitchen_tickets')
    .select('*, items:ticket_items(id, line_item_id, name, quantity, modifiers, notes, sort_order)')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single();

  if (error) return err(c, 'NOT_FOUND', `Ticket ${id} not found`, 404);
  return ok(c, data);
});

// POST /v1/tickets  (called by event bus handler, not directly by clients)
app.post('/', async (c) => {
  const supabase = c.get('supabase');
  const tenantId = c.get('tenantId');
  const body     = await c.req.json();

  const { data, error } = await supabase
    .from('kitchen_tickets')
    .insert({ ...body, tenant_id: tenantId })
    .select()
    .single();

  if (error) return err(c, 'INTERNAL_ERROR', error.message, 500);
  return ok(c, data, 201);
});

// PATCH /v1/tickets/:id
// Accepts: { status, priority, fired_at, bumped_at, cook_time_seconds, void_reason }
app.patch('/:id', async (c) => {
  const supabase = c.get('supabase');
  const tenantId = c.get('tenantId');
  const { id }   = c.req.param();
  const body     = await c.req.json();

  // Validate allowed transitions
  const allowedFields = ['status', 'priority', 'fired_at', 'bumped_at', 'cook_time_seconds', 'void_reason'];
  const updates: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (key in body) updates[key] = body[key];
  }

  if (Object.keys(updates).length === 0) {
    return err(c, 'VALIDATION_ERROR', 'No valid fields to update', 422);
  }

  // Auto-set timestamps based on status
  if (updates.status === 'fired'   && !updates.fired_at)  updates.fired_at  = new Date().toISOString();
  if (updates.status === 'bumped'  && !updates.bumped_at) updates.bumped_at = new Date().toISOString();
  if (updates.status === 'cooking' ) { updates.bumped_at = null; }  // recall

  const { data, error } = await supabase
    .from('kitchen_tickets')
    .update(updates)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single();

  if (error) return err(c, 'NOT_FOUND', `Ticket ${id} not found`, 404);

  // Emit domain event for bump
  if (updates.status === 'bumped') {
    await emitEvent('kds:ticket:bumped', tenantId, {
      ticketId: id,
      orderId:  data.order_id,
      station:  data.station,
      bumpedAt: data.bumped_at,
      cookTimeSeconds: data.cook_time_seconds ?? 0,
    });
  }

  return ok(c, data);
});

async function emitEvent(eventType: string, tenantId: string, payload: unknown) {
  const url = process.env.CULINARYOS_URL ?? 'http://localhost:3000';
  try {
    await fetch(`${url}/internal/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.INTERNAL_API_KEY ?? ''}`,
        'X-Tenant-Id': tenantId,
        'X-Caller-Service': 'kds',
      },
      body: JSON.stringify({
        eventId:   crypto.randomUUID(),
        eventType,
        tenantId,
        source:    'kds',
        timestamp: new Date().toISOString(),
        version:   1,
        payload,
      }),
    });
  } catch {
    console.warn(`[KDS] Failed to emit ${eventType} (non-fatal)`);
  }
}

export { app as ticketRoutes };
