// ============================================================
// CulinaryOS — Display Platform Routes
// Android TV Device Registration, Pairing, Heartbeat & Projections
// ============================================================

import { Hono } from 'hono';
import { ok, err, requireTenant } from '../middleware/auth.js';
import type { Env } from '../types.js';
import type {
  DisplayDevice,
  DisplayPairingRequest,
  DisplayHeartbeatPayload,
  DisplayMode,
  DisplayRemoteCommand,
} from '@culinaryos/shared';
import {
  getMockDisplays,
  getMockDisplayById,
  getMockDisplayByToken,
  getMockDisplayByPairingCode,
  registerMockDisplay,
  pairMockDisplay,
  updateMockDisplayHeartbeat,
  updateMockDisplay,
  deleteMockDisplay,
  getDisplayProjectionData,
} from '../lib/mock-display.js';
import { bumpMockTicket } from '../lib/mock-kitchen.js';

export const displaysRoutes = new Hono<Env>();

// ----------------------------------------------------------------------------
// 1. PUBLIC DEVICE ENDPOINTS (Called by Android TV / Webview Client)
// ----------------------------------------------------------------------------

/**
 * POST /v1/displays/register
 * Initial TV device boot registration. Generates pairing code & temporary device token.
 */
displaysRoutes.post('/register', async (c) => {
  const supabase = c.get('supabase');
  const body = await c.req.json().catch(() => ({}));
  const { deviceType = 'android_tv', platform = 'android_tv', appVersion = '1.0.0', hardwareModel } = body;

  if (!supabase) {
    const { device, pairingCode } = registerMockDisplay({
      deviceType,
      platform,
      appVersion,
      hardwareModel,
    });
    return ok(c, {
      deviceId: device.id,
      pairingCode,
      deviceToken: device.deviceToken,
      assignedMode: device.assignedMode,
      assignedView: device.assignedView,
      status: 'pending_pairing',
    });
  }

  // Generate 6 digit pairing code
  const pairingCode = Math.floor(100000 + Math.random() * 900000).toString();
  const deviceToken = `dt-${Math.random().toString(36).substring(2, 14)}`;
  const defaultTenantId = c.req.header('X-Tenant-Id') || '00000000-0000-0000-0000-000000000001';

  const { data, error } = await supabase
    .from('display_devices')
    .insert({
      tenant_id: defaultTenantId,
      name: hardwareModel ? `Android TV (${hardwareModel})` : 'New Android TV Display',
      pairing_code: pairingCode,
      device_token: deviceToken,
      device_type: deviceType,
      platform: platform,
      app_version: appVersion,
      assigned_mode: 'kitchen',
      assigned_view: 'all',
      online: true,
      enabled: true,
    })
    .select()
    .single();

  if (error) {
    // Graceful fallback to mock if DB table is unmigrated
    const { device, pairingCode: mockCode } = registerMockDisplay({ deviceType, platform, appVersion, hardwareModel });
    return ok(c, {
      deviceId: device.id,
      pairingCode: mockCode,
      deviceToken: device.deviceToken,
      assignedMode: device.assignedMode,
      assignedView: device.assignedView,
      status: 'pending_pairing',
    });
  }

  return ok(c, {
    deviceId: data.id,
    pairingCode,
    deviceToken,
    assignedMode: data.assigned_mode,
    assignedView: data.assigned_view,
    status: 'pending_pairing',
  });
});

/**
 * GET /v1/displays/session
 * Device authentication & state check via token.
 */
displaysRoutes.get('/session', async (c) => {
  const authHeader = c.req.header('Authorization');
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : c.req.query('token') || c.req.header('X-Device-Token');

  if (!token) {
    return err(c, 'AUTH_REQUIRED', 'Device token is required to fetch session', 401);
  }

  const supabase = c.get('supabase');
  if (!supabase) {
    const device = getMockDisplayByToken(token);
    if (!device) return err(c, 'NOT_FOUND', 'Device session not found or invalid token', 404);
    return ok(c, {
      id: device.id,
      tenantId: device.tenantId,
      name: device.name,
      platform: device.platform,
      appVersion: device.appVersion,
      assignedMode: device.assignedMode,
      assignedView: device.assignedView,
      configuration: device.configuration,
      isPaired: !!device.pairedAt,
      online: device.online,
    });
  }

  const { data, error } = await supabase
    .from('display_devices')
    .select('*')
    .eq('device_token', token)
    .single();

  if (error || !data) {
    const device = getMockDisplayByToken(token);
    if (device) {
      return ok(c, {
        id: device.id,
        tenantId: device.tenantId,
        name: device.name,
        platform: device.platform,
        appVersion: device.appVersion,
        assignedMode: device.assignedMode,
        assignedView: device.assignedView,
        configuration: device.configuration,
        isPaired: !!device.pairedAt,
        online: device.online,
      });
    }
    return err(c, 'NOT_FOUND', 'Device session not found', 404);
  }

  return ok(c, {
    id: data.id,
    tenantId: data.tenant_id,
    name: data.name,
    platform: data.platform,
    appVersion: data.app_version,
    assignedMode: data.assigned_mode,
    assignedView: data.assigned_view,
    configuration: data.configuration,
    isPaired: !!data.paired_at,
    online: data.online,
  });
});

/**
 * POST /v1/displays/heartbeat
 * TV periodic ping. Updates status & returns remote commands (view switch, refresh, etc.)
 */
displaysRoutes.post('/heartbeat', async (c) => {
  const body = await c.req.json<DisplayHeartbeatPayload>().catch(() => ({} as DisplayHeartbeatPayload));
  const authHeader = c.req.header('Authorization');
  const token = body.deviceToken || (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null);

  if (!token) {
    return err(c, 'AUTH_REQUIRED', 'deviceToken is required for heartbeat', 401);
  }

  const supabase = c.get('supabase');
  if (!supabase) {
    const res = updateMockDisplayHeartbeat(token, body);
    if (!res) return err(c, 'NOT_FOUND', 'Device not found for heartbeat', 404);
    return ok(c, res);
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('display_devices')
    .update({
      last_seen_at: now,
      online: true,
      app_version: body.appVersion || '1.0.0',
    })
    .eq('device_token', token)
    .select()
    .single();

  if (error || !data) {
    const res = updateMockDisplayHeartbeat(token, body);
    if (res) return ok(c, res);
    return err(c, 'DB_ERROR', error?.message || 'Failed to update heartbeat', 500);
  }

  const config = data.configuration || {};
  const remoteCommand = config.remoteCommand && (Date.now() - (config.remoteCommand.issuedAt || 0) < 60000)
    ? config.remoteCommand
    : null;

  return ok(c, {
    acknowledged: true,
    online: true,
    assignedMode: data.assigned_mode,
    assignedView: data.assigned_view,
    configuration: data.configuration,
    remoteCommand,
    serverTime: now,
  });
});

/**
 * GET /v1/displays/projection
 * Returns mode-specific operational data projection for the active TV view.
 */
displaysRoutes.get('/projection', async (c) => {
  const mode = (c.req.query('mode') || 'kitchen') as DisplayMode;
  const view = c.req.query('view') || 'all';
  const brand = c.req.query('brand') || 'culinaryos';
  const tenantId = c.req.header('X-Tenant-Id') || '00000000-0000-0000-0000-000000000001';

  const data = await getDisplayProjectionData(mode, view, tenantId, brand);
  return ok(c, data);
});

/**
 * POST /v1/displays/bump
 * Fast bump ticket action for Kitchen TV remote control.
 */
displaysRoutes.post('/bump', async (c) => {
  const body = (await c.req.json<{ ticketId?: string }>().catch(() => ({}))) as { ticketId?: string };
  const ticketId = body.ticketId || c.req.query('ticketId');

  if (!ticketId) {
    return err(c, 'VALIDATION_ERROR', 'ticketId is required to bump ticket', 400);
  }

  const supabase = c.get('supabase');
  const tenantId = c.req.header('X-Tenant-Id') || '00000000-0000-0000-0000-000000000001';

  if (!supabase) {
    const result = bumpMockTicket(ticketId);
    if (!result) return err(c, 'NOT_FOUND', `Ticket ${ticketId} not found`, 404);
    return ok(c, { ticketId, status: 'bumped', bumpedAt: new Date().toISOString() });
  }

  const now = new Date().toISOString();
  const { error } = await supabase
    .from('kitchen_tickets')
    .update({ status: 'bumped', bumped_at: now })
    .eq('id', ticketId)
    .eq('tenant_id', tenantId);

  if (error) {
    const result = bumpMockTicket(ticketId);
    if (result) return ok(c, { ticketId, status: 'bumped', bumpedAt: now });
    return err(c, 'DB_ERROR', error.message, 500);
  }

  return ok(c, { ticketId, status: 'bumped', bumpedAt: now });
});

// ----------------------------------------------------------------------------
// 2. MANAGER DISPLAY MANAGEMENT (Protected by Tenant Auth)
// ----------------------------------------------------------------------------

/**
 * POST /v1/displays/pair
 * Manager completes pairing from phone, tablet, or workstation.
 */
displaysRoutes.post('/pair', requireTenant, async (c) => {
  const tenantId = c.get('tenantId');
  const body = await c.req.json<DisplayPairingRequest>().catch(() => ({} as DisplayPairingRequest));

  if (!body.pairingCode) {
    return err(c, 'VALIDATION_ERROR', 'pairingCode is required', 400);
  }

  const supabase = c.get('supabase');
  if (!supabase) {
    const paired = pairMockDisplay(body.pairingCode, body, tenantId);
    if (!paired) {
      return err(c, 'NOT_FOUND', 'Invalid or expired pairing code', 404);
    }
    return ok(c, paired);
  }

  // Lookup display by pairing code
  const cleanCode = body.pairingCode.replace(/\s+/g, '');
  const { data: existing, error: findErr } = await supabase
    .from('display_devices')
    .select('*')
    .eq('pairing_code', cleanCode)
    .single();

  if (findErr || !existing) {
    const paired = pairMockDisplay(body.pairingCode, body, tenantId);
    if (paired) return ok(c, paired);
    return err(c, 'NOT_FOUND', 'Invalid or expired pairing code', 404);
  }

  const now = new Date().toISOString();
  const updatedConfig = {
    ...existing.configuration,
    ...(body.configuration || {}),
  };

  const { data: updated, error: updateErr } = await supabase
    .from('display_devices')
    .update({
      tenant_id: tenantId,
      name: body.name || existing.name,
      assigned_mode: body.assignedMode || 'kitchen',
      assigned_view: body.assignedView || 'all',
      location_id: body.locationId || null,
      configuration: updatedConfig,
      pairing_code: null, // Consumed
      paired_at: now,
      online: true,
      last_seen_at: now,
    })
    .eq('id', existing.id)
    .select()
    .single();

  if (updateErr) return err(c, 'DB_ERROR', updateErr.message, 500);

  return ok(c, updated);
});

/**
 * GET /v1/displays
 * Manager lists all paired displays for their tenant.
 */
displaysRoutes.get('/', requireTenant, async (c) => {
  const tenantId = c.get('tenantId');
  const supabase = c.get('supabase');

  if (!supabase) {
    const displays = getMockDisplays(tenantId);
    return ok(c, displays);
  }

  const { data, error } = await supabase
    .from('display_devices')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (error) {
    return ok(c, getMockDisplays(tenantId));
  }

  return ok(c, data || []);
});

/**
 * GET /v1/displays/:id
 * Manager views a single display.
 */
displaysRoutes.get('/:id', requireTenant, async (c) => {
  const id = c.req.param('id');
  if (!id) return err(c, 'NOT_FOUND', 'Display ID required', 400);
  const tenantId = c.get('tenantId');
  const supabase = c.get('supabase');

  if (!supabase) {
    const display = getMockDisplayById(id);
    if (!display || display.tenantId !== tenantId) {
      return err(c, 'NOT_FOUND', `Display ${id} not found`, 404);
    }
    return ok(c, display);
  }

  const { data, error } = await supabase
    .from('display_devices')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single();

  if (error || !data) {
    const display = getMockDisplayById(id);
    if (display) return ok(c, display);
    return err(c, 'NOT_FOUND', `Display ${id} not found`, 404);
  }

  return ok(c, data);
});

/**
 * PATCH /v1/displays/:id
 * Manager remotely updates display config or issues remote command (change view, refresh).
 */
displaysRoutes.patch('/:id', requireTenant, async (c) => {
  const id = c.req.param('id');
  if (!id) return err(c, 'NOT_FOUND', 'Display ID required', 400);
  const tenantId = c.get('tenantId');
  const body = (await c.req.json<Record<string, any>>().catch(() => ({}))) as Record<string, any>;
  const supabase = c.get('supabase');

  if (!supabase) {
    const updated = updateMockDisplay(id, body as Partial<DisplayDevice>);
    if (!updated) return err(c, 'NOT_FOUND', `Display ${id} not found`, 404);
    return ok(c, updated);
  }

  const updatePayload: Record<string, unknown> = {};
  if (body.name !== undefined) updatePayload.name = body.name;
  if (body.assignedMode !== undefined) updatePayload.assigned_mode = body.assignedMode;
  if (body.assignedView !== undefined) updatePayload.assigned_view = body.assignedView;
  if (body.locationId !== undefined) updatePayload.location_id = body.locationId;
  if (body.enabled !== undefined) updatePayload.enabled = body.enabled;
  if (body.configuration !== undefined || body.remoteCommand !== undefined) {
    // Merge configuration
    const { data: existing } = await supabase
      .from('display_devices')
      .select('configuration')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();

    const merged = {
      ...(existing?.configuration || {}),
      ...(body.configuration || {}),
    };

    if (body.remoteCommand) {
      merged.remoteCommand = {
        ...body.remoteCommand,
        commandId: `cmd-${Date.now()}`,
        issuedAt: Date.now(),
      };
    }
    updatePayload.configuration = merged;
  }

  const { data, error } = await supabase
    .from('display_devices')
    .update(updatePayload)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single();

  if (error) {
    const updated = updateMockDisplay(id, body as Partial<DisplayDevice>);
    if (updated) return ok(c, updated);
    return err(c, 'DB_ERROR', error.message, 500);
  }

  return ok(c, data);
});

/**
 * DELETE /v1/displays/:id
 * Manager revokes/unpairs a display.
 */
displaysRoutes.delete('/:id', requireTenant, async (c) => {
  const id = c.req.param('id');
  if (!id) return err(c, 'NOT_FOUND', 'Display ID required', 400);
  const tenantId = c.get('tenantId');
  const supabase = c.get('supabase');

  if (!supabase) {
    deleteMockDisplay(id);
    return ok(c, { uncoupled: true, id });
  }

  const { error } = await supabase
    .from('display_devices')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenantId);

  if (error) {
    deleteMockDisplay(id);
  }

  return ok(c, { uncoupled: true, id });
});

export default displaysRoutes;
