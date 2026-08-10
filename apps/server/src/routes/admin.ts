// ============================================================
// CulinaryOS — Thin admin API (menu + staff)
// ============================================================

import { Hono } from 'hono';
import type { Env } from '../types.js';
import { requireTenant, ok, err } from '../middleware/auth.js';
import { hashPin } from '../lib/pin.js';
import { isLiveSupabaseConfigured } from '../lib/secrets.js';

export const adminRoutes = new Hono<Env>();
adminRoutes.use('*', requireTenant);

function requireManager(c: any): Response | null {
  const mode = c.get('authMode');
  const role = c.get('authRole');
  if (mode === 'api_key' || mode === 'relaxed') return null;
  if (role && ['owner', 'manager'].includes(role)) return null;
  if (!role && mode === 'jwt') {
    return err(c, 'FORBIDDEN', 'Manager or owner role required', 403);
  }
  return null;
}

// ---- Menu ----

adminRoutes.get('/menu/items', async (c) => {
  const tenantId = c.get('tenantId');
  const supabase = c.get('supabase');
  if (!supabase) return ok(c, { items: [], demo: true });

  const { data, error } = await supabase
    .from('menu_items')
    .select('id, name, description, price, status, station, section_id, sort_order')
    .eq('tenant_id', tenantId)
    .order('sort_order');

  if (error) return err(c, 'DB_ERROR', error.message, 500);
  return ok(c, { items: data ?? [] });
});

adminRoutes.patch('/menu/items/:id', async (c) => {
  const denied = requireManager(c);
  if (denied) return denied;

  const tenantId = c.get('tenantId');
  const supabase = c.get('supabase');
  const id = c.req.param('id');
  const body = await c.req.json<{
    name?: string;
    description?: string;
    price?: number;
    status?: string;
    station?: string;
  }>();

  if (!supabase) return err(c, 'SERVICE_UNAVAILABLE', 'Database not configured', 503);

  const patch: Record<string, unknown> = {};
  for (const k of ['name', 'description', 'price', 'status', 'station'] as const) {
    if (body[k] !== undefined) patch[k] = body[k];
  }
  if (Object.keys(patch).length === 0) {
    return err(c, 'VALIDATION_ERROR', 'No fields to update', 422);
  }

  const { data, error } = await supabase
    .from('menu_items')
    .update(patch)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single();

  if (error) return err(c, 'DB_ERROR', error.message, 500);
  return ok(c, data);
});

adminRoutes.post('/menu/items', async (c) => {
  const denied = requireManager(c);
  if (denied) return denied;

  const tenantId = c.get('tenantId');
  const supabase = c.get('supabase');
  const body = await c.req.json<{
    section_id: string;
    name: string;
    description?: string;
    price: number;
    station?: string;
    status?: string;
  }>();

  if (!body.section_id || !body.name || body.price == null) {
    return err(c, 'VALIDATION_ERROR', 'section_id, name, price required', 422);
  }
  if (!supabase) return err(c, 'SERVICE_UNAVAILABLE', 'Database not configured', 503);

  const { data, error } = await supabase
    .from('menu_items')
    .insert({
      tenant_id: tenantId,
      section_id: body.section_id,
      name: body.name,
      description: body.description ?? null,
      price: body.price,
      station: body.station ?? 'pass',
      status: body.status ?? 'available',
      sort_order: 99,
      allergens: [],
    })
    .select()
    .single();

  if (error) return err(c, 'DB_ERROR', error.message, 500);
  return ok(c, data, 201);
});

// ---- Staff ----

adminRoutes.get('/staff', async (c) => {
  const tenantId = c.get('tenantId');
  const supabase = c.get('supabase');
  if (!supabase) {
    return ok(c, {
      demo: true,
      staff: [
        { display_name: 'John Doe', role: 'server', active: true },
        { display_name: 'Jane Smith', role: 'manager', active: true },
      ],
    });
  }

  const { data: members, error } = await supabase
    .from('tenant_users')
    .select('user_id, role')
    .eq('tenant_id', tenantId);

  if (error) return err(c, 'DB_ERROR', error.message, 500);

  const { data: pins } = await supabase
    .from('staff_pins')
    .select('user_id, display_name, active')
    .eq('tenant_id', tenantId);

  const pinMap = new Map((pins ?? []).map((p) => [p.user_id, p]));
  const staff = (members ?? []).map((m) => ({
    user_id: m.user_id,
    role: m.role,
    display_name: pinMap.get(m.user_id)?.display_name ?? m.user_id.slice(0, 8),
    active: pinMap.get(m.user_id)?.active ?? true,
    has_pin: pinMap.has(m.user_id),
  }));

  return ok(c, { staff });
});

adminRoutes.post('/staff', async (c) => {
  const denied = requireManager(c);
  if (denied) return denied;

  if (!isLiveSupabaseConfigured()) {
    return err(c, 'SERVICE_UNAVAILABLE', 'Live Supabase required to create staff', 503);
  }

  const tenantId = c.get('tenantId');
  const supabase = c.get('supabase');
  const body = await c.req.json<{
    email: string;
    display_name: string;
    role: string;
    pin: string;
  }>();

  if (!body.email || !body.display_name || !body.role || !body.pin) {
    return err(c, 'VALIDATION_ERROR', 'email, display_name, role, pin required', 422);
  }
  if (!/^\d{4,8}$/.test(body.pin)) {
    return err(c, 'VALIDATION_ERROR', 'PIN must be 4–8 digits', 422);
  }
  if (!['owner', 'manager', 'chef', 'server', 'viewer'].includes(body.role)) {
    return err(c, 'VALIDATION_ERROR', 'Invalid role', 422);
  }
  if (!supabase) return err(c, 'SERVICE_UNAVAILABLE', 'Database not configured', 503);

  const { data: created, error: createErr } = await supabase.auth.admin.createUser({
    email: body.email,
    password: body.pin,
    email_confirm: true,
    user_metadata: { display_name: body.display_name, tenant_id: tenantId },
  });

  if (createErr || !created.user) {
    return err(c, 'DB_ERROR', createErr?.message ?? 'Failed to create Auth user', 500);
  }

  const userId = created.user.id;
  const { error: tuErr } = await supabase.from('tenant_users').upsert({
    tenant_id: tenantId,
    user_id: userId,
    role: body.role,
  }, { onConflict: 'tenant_id,user_id' });

  if (tuErr) return err(c, 'DB_ERROR', tuErr.message, 500);

  const { error: pinErr } = await supabase.from('staff_pins').upsert({
    tenant_id: tenantId,
    user_id: userId,
    pin_hash: hashPin(body.pin),
    display_name: body.display_name,
    active: true,
  }, { onConflict: 'tenant_id,user_id' });

  if (pinErr) return err(c, 'DB_ERROR', pinErr.message, 500);

  return ok(c, { user_id: userId, email: body.email, role: body.role, display_name: body.display_name }, 201);
});
