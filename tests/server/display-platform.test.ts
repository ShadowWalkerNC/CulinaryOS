// ============================================================
// CulinaryOS — Display Platform Server Test Suite
// Device Registration, Pairing, Scoped Token Auth, Remote Switching & Projections
// ============================================================

import { describe, it, expect } from 'bun:test';
import { app } from '../../apps/server/src/index.js';

const TENANT_ID = '00000000-0000-0000-0000-000000000001';

describe('Display Platform & Android TV Integration', () => {
  let pairingCode = '';
  let deviceToken = '';
  let deviceId = '';

  it('registers a new Android TV display and generates a 6-digit pairing code', async () => {
    const res = await app.request('/v1/displays/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': TENANT_ID,
      },
      body: JSON.stringify({
        deviceType: 'android_tv',
        platform: 'android_tv',
        appVersion: '1.2.0',
        hardwareModel: 'Walmart onn. 4K Pro Streaming Box',
      }),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data.pairingCode).toBeDefined();
    expect(json.data.pairingCode.length).toBe(6);
    expect(json.data.deviceToken).toBeDefined();
    expect(json.data.status).toBe('pending_pairing');

    pairingCode = json.data.pairingCode;
    deviceToken = json.data.deviceToken;
    deviceId = json.data.deviceId;
  });

  it('manager pairs the TV display from phone/tablet with assigned mode and view', async () => {
    const res = await app.request('/v1/displays/pair', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': TENANT_ID,
      },
      body: JSON.stringify({
        pairingCode,
        name: 'Walmart onn. Kitchen KDS Line 1',
        assignedMode: 'kitchen',
        assignedView: 'all',
        locationId: 'loc-kitchen-main',
        configuration: {
          theme: 'kitchen-oled',
          brand: 'culinaryos',
          stationId: 'all',
          showAllergens: true,
          warningMinutes: 7,
          criticalMinutes: 14,
        },
      }),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data.name).toBe('Walmart onn. Kitchen KDS Line 1');
    expect(json.data.assignedMode).toBe('kitchen');
    expect(json.data.pairedAt).toBeDefined();
    expect(json.data.online).toBe(true);
  });

  it('TV display authenticates session using scoped device token', async () => {
    const res = await app.request(`/v1/displays/session?token=${deviceToken}`, {
      method: 'GET',
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data.assignedMode).toBe('kitchen');
    expect(json.data.assignedView).toBe('all');
    expect(json.data.isPaired).toBe(true);
    expect(json.data.configuration.theme).toBe('kitchen-oled');
  });

  it('TV sends periodic heartbeat reporting health and receives online acknowledgment', async () => {
    const res = await app.request('/v1/displays/heartbeat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${deviceToken}`,
      },
      body: JSON.stringify({
        deviceToken,
        appVersion: '1.2.0',
        currentMode: 'kitchen',
        currentView: 'all',
        connectionQuality: 'excellent',
      }),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data.acknowledged).toBe(true);
    expect(json.data.online).toBe(true);
    expect(json.data.serverTime).toBeDefined();
  });

  it('manager remotely changes display view to Expo and triggers navigation', async () => {
    const res = await app.request(`/v1/displays/${deviceId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': TENANT_ID,
      },
      body: JSON.stringify({
        assignedView: 'expo',
        remoteCommand: {
          type: 'navigate',
          mode: 'kitchen',
          view: 'expo',
        },
      }),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data.assignedView).toBe('expo');
    expect(json.data.configuration.remoteCommand).toBeDefined();
    expect(json.data.configuration.remoteCommand.view).toBe('expo');
  });

  it('heartbeat delivers pending remote command to the television', async () => {
    const res = await app.request('/v1/displays/heartbeat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${deviceToken}`,
      },
      body: JSON.stringify({
        deviceToken,
      }),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data.assignedView).toBe('expo');
    expect(json.data.remoteCommand).toBeDefined();
    expect(json.data.remoteCommand.type).toBe('navigate');
  });

  it('fetches projection for Kitchen KDS with allergen highlights and station tickets', async () => {
    const res = await app.request('/v1/displays/projection?mode=kitchen&view=all', {
      method: 'GET',
      headers: { 'X-Tenant-Id': TENANT_ID },
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data.mode).toBe('kitchen');
    expect(Array.isArray(json.data.tickets)).toBe(true);
    expect(json.data.tickets.length).toBeGreaterThan(0);
    expect(json.data.avgTicketSeconds).toBeGreaterThan(0);
    expect(json.data.items86).toBeDefined();
  });

  it('fetches projection for Manager Wallboard with live operational summary', async () => {
    const res = await app.request('/v1/displays/projection?mode=manager', {
      method: 'GET',
      headers: { 'X-Tenant-Id': TENANT_ID },
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data.mode).toBe('manager');
    expect(json.data.salesToday).toBeGreaterThan(0);
    expect(json.data.stationLoad).toBeDefined();
    expect(json.data.lowStockAlerts).toBeDefined();
  });

  it('fetches projection for Cheezies Customer Menu with artisan melts and combos', async () => {
    const res = await app.request('/v1/displays/projection?mode=guest&brand=cheezies', {
      method: 'GET',
      headers: { 'X-Tenant-Id': TENANT_ID },
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data.brand).toBe('cheezies');
    expect(json.data.categories).toBeDefined();
    const meltCategory = json.data.categories.find((c: any) => c.name === 'ARTISAN MELTS');
    expect(meltCategory).toBeDefined();
    expect(meltCategory.items.some((i: any) => i.name === 'The Patty Meltdown')).toBe(true);
    expect(json.data.specialNotice).toContain('Summit County');
  });

  it('fast bump ticket endpoint updates ticket status for TV remote', async () => {
    const res = await app.request('/v1/displays/bump', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': TENANT_ID,
      },
      body: JSON.stringify({ ticketId: 't-101' }),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data.status).toBe('bumped');
  });

  it('manager lists displays and verifies online health status', async () => {
    const res = await app.request('/v1/displays', {
      method: 'GET',
      headers: { 'X-Tenant-Id': TENANT_ID },
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
    const tv = json.data.find((d: any) => d.id === deviceId);
    expect(tv).toBeDefined();
    expect(tv.online).toBe(true);
  });

  it('manager uncouples/deletes display', async () => {
    const res = await app.request(`/v1/displays/${deviceId}`, {
      method: 'DELETE',
      headers: { 'X-Tenant-Id': TENANT_ID },
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.data.uncoupled).toBe(true);
  });
});
