// ============================================================
// Tier 2 — F4.5: Local QR & mDNS Discovery (Boundary & Corner Cases)
// Covers: Empty network interfaces, IPv6-only networks, multiple NICs,
// custom pairing ports, and special characters in mDNS TXT records.
// ============================================================

import { describe, expect, it } from 'bun:test';
import {
  buildPairingUrl,
  findLocalLanIpv4,
  formatMdnsAdvertisement,
  type NetworkInterfaceInfo,
} from '../tier1-features/f4_5_mdns_qr_discovery.test.js';

describe('F4.5 mDNS & QR Discovery — Tier 2 Boundaries', () => {
  it('1. falls back to 127.0.0.1 on empty network interfaces dictionary', () => {
    const ip = findLocalLanIpv4({});
    expect(ip).toBe('127.0.0.1');
  });

  it('2. falls back to 127.0.0.1 when only IPv6 interfaces are present', () => {
    const ipv6Only: Record<string, NetworkInterfaceInfo[]> = {
      eth0: [{ name: 'eth0', address: '2001:db8::1', family: 'IPv6', internal: false }],
    };
    const ip = findLocalLanIpv4(ipv6Only);
    expect(ip).toBe('127.0.0.1');
  });

  it('3. selects first active non-internal IPv4 when multiple NICs (e.g. WiFi + Ethernet) exist', () => {
    const multiNic: Record<string, NetworkInterfaceInfo[]> = {
      eth0: [{ name: 'eth0', address: '192.168.1.100', family: 'IPv4', internal: false }],
      wlan0: [{ name: 'wlan0', address: '10.0.0.25', family: 'IPv4', internal: false }],
    };
    const ip = findLocalLanIpv4(multiNic);
    expect(ip).toBe('192.168.1.100');
  });

  it('4. builds pairing URL with non-standard custom port (e.g. 5180)', () => {
    const url = buildPairingUrl('192.168.1.100', 5180, '00000000-0000-0000-0000-000000000001', 'pos');
    expect(url).toBe('http://192.168.1.100:5180?tenant=00000000-0000-0000-0000-000000000001&terminal=pos');
  });

  it('5. formats mDNS TXT record containing special restaurant metadata', () => {
    const ad = formatMdnsAdvertisement('culinaryos-lan', 3000, {
      name: 'L\'Atelier & Bar',
      env: 'production',
      version: '1.0.0-rc.1',
    });
    expect(ad.txt.name).toBe('L\'Atelier & Bar');
    expect(ad.txt.version).toBe('1.0.0-rc.1');
    expect(ad.name).toContain('culinaryos-lan');
  });
});
