// ============================================================
// CulinaryOS — Display Client Runtime Engine
// Persistent device tokens, heartbeat sync, remote navigation listeners
// ============================================================

import type {
  DisplayDevice,
  DisplayMode,
  DisplayHeartbeatResponse,
  DisplayRemoteCommand,
} from '@culinaryos/shared';

const STORAGE_KEYS = {
  TOKEN: 'culinaryos_display_token',
  DEVICE_ID: 'culinaryos_display_id',
  MODE: 'culinaryos_display_mode',
  VIEW: 'culinaryos_display_view',
  API_BASE: 'culinaryos_api_base',
  TENANT_ID: 'culinaryos_tenant_id',
};

export class DisplayClient {
  private apiBase: string;
  private tenantId: string;
  private heartbeatInterval: number | null = null;
  private onRemoteCommandCallback?: ((cmd: DisplayRemoteCommand) => void) | undefined;

  constructor(apiBase?: string, tenantId?: string) {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const queryApi = params.get('api');
      const queryTenant = params.get('tenant');
      if (queryApi) localStorage.setItem(STORAGE_KEYS.API_BASE, queryApi);
      if (queryTenant) localStorage.setItem(STORAGE_KEYS.TENANT_ID, queryTenant);
    }

    const envApi = typeof import.meta !== 'undefined' ? (import.meta as any).env?.VITE_API_URL : undefined;
    const inferredHostApi =
      typeof window !== 'undefined' && window.location.hostname
        ? `${window.location.protocol}//${window.location.hostname}:3000`
        : 'http://localhost:3000';

    this.apiBase =
      apiBase ||
      (typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.API_BASE) : null) ||
      envApi ||
      inferredHostApi;

    this.tenantId =
      tenantId ||
      (typeof window !== 'undefined'
        ? localStorage.getItem(STORAGE_KEYS.TENANT_ID) || '00000000-0000-0000-0000-000000000001'
        : '00000000-0000-0000-0000-000000000001');
  }

  getApiBase(): string {
    return this.apiBase;
  }

  setApiBase(url: string) {
    this.apiBase = url;
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.API_BASE, url);
    }
  }

  getDeviceToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(STORAGE_KEYS.TOKEN);
  }

  setDeviceSession(token: string, deviceId: string, mode?: DisplayMode, view?: string) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.TOKEN, token);
    localStorage.setItem(STORAGE_KEYS.DEVICE_ID, deviceId);
    if (mode) localStorage.setItem(STORAGE_KEYS.MODE, mode);
    if (view) localStorage.setItem(STORAGE_KEYS.VIEW, view);
  }

  clearDeviceSession() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.DEVICE_ID);
    localStorage.removeItem(STORAGE_KEYS.MODE);
    localStorage.removeItem(STORAGE_KEYS.VIEW);
  }

  async registerDevice(hardwareModel?: string): Promise<{ deviceId: string; pairingCode: string; deviceToken: string }> {
    const res = await fetch(`${this.apiBase}/v1/displays/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': this.tenantId,
      },
      body: JSON.stringify({
        deviceType: 'android_tv',
        platform: 'android_tv',
        appVersion: '1.2.0',
        hardwareModel: hardwareModel || 'Android TV Display',
      }),
    });

    if (!res.ok) {
      throw new Error(`Failed to register display: ${res.statusText}`);
    }

    const json = await res.json();
    if (!json.ok) throw new Error(json.error?.message || 'Registration failed');

    this.setDeviceSession(json.data.deviceToken, json.data.deviceId, json.data.assignedMode, json.data.assignedView);
    return json.data;
  }

  async getSession(): Promise<DisplayDevice | null> {
    const token = this.getDeviceToken();
    if (!token) return null;

    try {
      const res = await fetch(`${this.apiBase}/v1/displays/session?token=${token}`, {
        headers: { 'X-Tenant-Id': this.tenantId },
      });
      if (!res.ok) return null;
      const json = await res.json();
      return json.ok ? json.data : null;
    } catch {
      return null;
    }
  }

  async sendHeartbeat(appVersion: string = '1.2.0'): Promise<DisplayHeartbeatResponse | null> {
    const token = this.getDeviceToken();
    if (!token) return null;

    try {
      const res = await fetch(`${this.apiBase}/v1/displays/heartbeat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'X-Tenant-Id': this.tenantId,
        },
        body: JSON.stringify({
          deviceToken: token,
          appVersion,
          connectionQuality: navigator.onLine ? 'excellent' : 'offline',
        }),
      });

      if (!res.ok) return null;
      const json = await res.json();
      if (!json.ok) return null;

      const data: DisplayHeartbeatResponse = json.data;
      if (data.remoteCommand && this.onRemoteCommandCallback) {
        this.onRemoteCommandCallback(data.remoteCommand);
      }
      return data;
    } catch {
      return null;
    }
  }

  async fetchProjection(mode: DisplayMode, view: string = 'all', brand: string = 'culinaryos'): Promise<any> {
    const res = await fetch(
      `${this.apiBase}/v1/displays/projection?mode=${mode}&view=${encodeURIComponent(
        view
      )}&brand=${brand}`,
      {
        headers: { 'X-Tenant-Id': this.tenantId },
      }
    );

    if (!res.ok) throw new Error(`Projection fetch failed: ${res.statusText}`);
    const json = await res.json();
    return json.data;
  }

  async bumpTicket(ticketId: string): Promise<boolean> {
    try {
      const res = await fetch(`${this.apiBase}/v1/displays/bump`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-Id': this.tenantId,
        },
        body: JSON.stringify({ ticketId }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  startHeartbeatLoop(intervalMs: number = 15000, onRemoteCommand?: (cmd: DisplayRemoteCommand) => void) {
    this.stopHeartbeatLoop();
    this.onRemoteCommandCallback = onRemoteCommand;
    this.sendHeartbeat();
    this.heartbeatInterval = window.setInterval(() => {
      this.sendHeartbeat();
    }, intervalMs);
  }

  stopHeartbeatLoop() {
    if (this.heartbeatInterval !== null) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
}
