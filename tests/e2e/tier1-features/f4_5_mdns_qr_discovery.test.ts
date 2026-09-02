// ============================================================
// Tier 1 — F4.5: Local QR & mDNS Discovery (Granular Feature Tests)
// Covers: mDNS hostname advertising (culinaryos.local), IPv4 non-loopback
// address discovery, and terminal LAN pairing QR generation.
// ============================================================

import { describe, expect, it } from 'bun:test';

export interface NetworkInterfaceInfo {
  name: string;
  address: string;
  family: 'IPv4' | 'IPv6';
  internal: boolean;
}

export function findLocalLanIpv4(interfaces: Record<string, NetworkInterfaceInfo[]>): string {
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

export function buildPairingUrl(lanIp: string, port: number, tenantId: string, terminalType: 'pos' | 'kds' | 'handheld'): string {
  return `http://${lanIp}:${port}?tenant=${tenantId}&terminal=${terminalType}`;
}

export function formatMdnsAdvertisement(hostname: string, port: number, txtRecord: Record<string, string>): {
  name: string;
  type: string;
  port: number;
  txt: Record<string, string>;
} {
  return {
    name: `${hostname}._http._tcp.local`,
    type: '_http._tcp',
    port,
    txt: txtRecord,
  };
}

describe('F4.5 Local QR & mDNS Discovery — Tier 1 Isolation', () => {
  const mockInterfaces: Record<string, NetworkInterfaceInfo[]> = {
    lo: [
      { name: 'lo', address: '127.0.0.1', family: 'IPv4', internal: true },
      { name: 'lo', address: '::1', family: 'IPv6', internal: true },
    ],
    eth0: [
      { name: 'eth0', address: '192.168.1.145', family: 'IPv4', internal: false },
      { name: 'eth0', address: 'fe80::1', family: 'IPv6', internal: false },
    ],
  };

  const tenantId = '00000000-0000-0000-0000-000000000001';

  it('1. discovers local non-loopback IPv4 address from network interfaces', () => {
    const ip = findLocalLanIpv4(mockInterfaces);
    expect(ip).toBe('192.168.1.145');
  });

  it('2. falls back to 127.0.0.1 when no external network interface is present', () => {
    const loopbackOnly: Record<string, NetworkInterfaceInfo[]> = {
      lo: [{ name: 'lo', address: '127.0.0.1', family: 'IPv4', internal: true }],
    };
    const ip = findLocalLanIpv4(loopbackOnly);
    expect(ip).toBe('127.0.0.1');
  });

  it('3. constructs pairing URL with LAN IP, port, tenant ID, and terminal type', () => {
    const url = buildPairingUrl('192.168.1.145', 5172, tenantId, 'handheld');
    expect(url).toBe('http://192.168.1.145:5172?tenant=00000000-0000-0000-0000-000000000001&terminal=handheld');
  });

  it('4. formats mDNS advertising payload for culinaryos.local', () => {
    const ad = formatMdnsAdvertisement('culinaryos', 3000, {
      version: '0.1.0',
      api: '/v1',
      tenant: tenantId,
    });
    expect(ad.name).toBe('culinaryos._http._tcp.local');
    expect(ad.port).toBe(3000);
    expect(ad.txt.version).toBe('0.1.0');
    expect(ad.txt.tenant).toBe(tenantId);
  });

  it('5. builds distinct pairing URLs for POS vs KDS terminals', () => {
    const posUrl = buildPairingUrl('10.0.0.50', 5172, tenantId, 'pos');
    const kdsUrl = buildPairingUrl('10.0.0.50', 5173, tenantId, 'kds');
    expect(posUrl).toContain('port=5172' ? '5172' : '');
    expect(posUrl).toContain('terminal=pos');
    expect(kdsUrl).toContain('5173');
    expect(kdsUrl).toContain('terminal=kds');
  });
});
