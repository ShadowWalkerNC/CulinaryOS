import { describe, it, expect } from 'bun:test';
import { displaysRoutes } from '../../apps/server/src/routes/displays.js';
import { useAppStore } from '../../mobile/lib/store.js';
import {
  fetchLiveInventory,
  fetchPairedDisplays,
  pairTvDisplayRemote,
} from '../../mobile/lib/api.js';

describe('Mobile (iOS/Android), Display Platform & CleanMyTV Launcher Parity', () => {
  it('GET /v1/displays/discover returns zero-config LAN IPv4, mDNS host, and surface URLs', async () => {
    const res = await displaysRoutes.request('/discover', { method: 'GET' });
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data.service).toBe('culinaryos-control-plane');
    expect(body.data.mdnsHost).toBe('culinaryos.local');
    expect(body.data.ports.display).toBe(5181);
    expect(body.data.surfaces.display).toContain(':5181');
    expect(body.data.adbProvisioning.launcherAppId).toBe('com.cleanmytv.launcher.culinaryos');
  });

  it('GET /v1/displays/launcher-config returns a valid CleanMyTV Launcher Engine v1 JSON layout', async () => {
    const res = await displaysRoutes.request('/launcher-config?mode=kitchen&view=all&brand=culinaryos', {
      method: 'GET',
      headers: {
        'X-Tenant-Id': '00000000-0000-0000-0000-000000000001',
      },
    });
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.ok).toBe(true);
    const cfg = body.data;
    expect(cfg.version).toBe(1);
    expect(cfg.edition).toBe('culinaryos');
    expect(cfg.applicationId).toBe('com.cleanmytv.launcher.culinaryos');
    expect(cfg.targetConfigPath).toBe(
      '/sdcard/Android/data/com.cleanmytv.launcher.culinaryos/files/launcher-config.json'
    );
    expect(cfg.reloadBroadcast).toBe('com.cleanmytv.launcher.RELOAD_CONFIG');
    expect(Array.isArray(cfg.widgets)).toBe(true);
    const dockWidget = cfg.widgets.find((w: any) => w.type === 'dock');
    expect(dockWidget).toBeDefined();
    expect(dockWidget.pinned).toContain('com.culinaryos.display');
  });

  it('GET /v1/displays/launcher-config supports Cheezies food truck branding', async () => {
    const res = await displaysRoutes.request('/launcher-config?mode=pickup&brand=cheezies', {
      method: 'GET',
    });
    expect(res.status).toBe(200);
    const body: any = await res.json();
    const greeting = body.data.widgets.find((w: any) => w.type === 'greeting');
    expect(greeting.text).toContain('Cheezies');
  });

  it('completes full Android TV register -> pair -> session -> heartbeat -> remote mode switch lifecycle', async () => {
    // 1. TV registers on boot
    const regRes = await displaysRoutes.request('/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceType: 'android_tv',
        platform: 'android_tv',
        appVersion: '1.2.0',
        hardwareModel: 'onn_4k_gtv',
      }),
    });
    expect(regRes.status).toBe(200);
    const regBody: any = await regRes.json();
    const { deviceId, pairingCode, deviceToken } = regBody.data;
    expect(pairingCode).toHaveLength(6);
    expect(deviceToken).toBeTruthy();

    // 2. Manager pairs TV via 6-digit code
    const pairRes = await displaysRoutes.request('/pair', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': '00000000-0000-0000-0000-000000000001',
      },
      body: JSON.stringify({
        pairingCode,
        name: 'Walmart onn. 4K Main Line',
        assignedMode: 'kitchen',
        assignedView: 'grill',
      }),
    });
    expect(pairRes.status).toBe(200);

    // 3. TV checks session
    const sessRes = await displaysRoutes.request(`/session?token=${deviceToken}`, {
      method: 'GET',
    });
    expect(sessRes.status).toBe(200);
    const sessBody: any = await sessRes.json();
    expect(sessBody.data.isPaired).toBe(true);
    expect(sessBody.data.assignedMode).toBe('kitchen');
    expect(sessBody.data.assignedView).toBe('grill');

    // 4. Manager switches TV remotely to Manager Wallboard
    const patchRes = await displaysRoutes.request(`/${deviceId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': '00000000-0000-0000-0000-000000000001',
      },
      body: JSON.stringify({
        assignedMode: 'manager',
        assignedView: 'all',
        remoteCommand: { type: 'navigate', mode: 'manager', view: 'all' },
      }),
    });
    expect(patchRes.status).toBe(200);

    // 5. TV heartbeat receives remote navigation command
    const hbRes = await displaysRoutes.request('/heartbeat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${deviceToken}`,
      },
      body: JSON.stringify({ deviceToken, appVersion: '1.2.0' }),
    });
    expect(hbRes.status).toBe(200);
    const hbBody: any = await hbRes.json();
    expect(hbBody.data.assignedMode).toBe('manager');
  });

  it('Mobile Companion store supports ADR-0011 pantry stock adjustment & TV display pairing', async () => {
    const inv = await fetchLiveInventory();
    expect(inv.length).toBeGreaterThan(0);

    useAppStore.setState({ inventory: inv });
    const firstItem = inv[0]!;
    const initialQty = firstItem.quantity;

    useAppStore.getState().adjustInventoryStock(firstItem.id, 5);
    const updatedItem = useAppStore.getState().inventory.find((i) => i.id === firstItem.id)!;
    expect(updatedItem.quantity).toBe(initialQty + 5);

    const displays = await fetchPairedDisplays();
    expect(displays.length).toBeGreaterThan(0);

    const paired = await pairTvDisplayRemote('884210', 'Expo Pass TV', 'pickup', 'all', 'culinaryos');
    expect(paired.assignedMode).toBe('pickup');
  });
});
