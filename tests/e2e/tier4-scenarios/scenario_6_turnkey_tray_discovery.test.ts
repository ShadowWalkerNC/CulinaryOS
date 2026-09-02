// ============================================================
// Tier 4 — Scenario 6: Zero-Tech Storefront Deployment & LAN Handheld Pairing
// Features Exercised: F4.1 (Turnkey Windows Installer Scripting),
// F4.2 (System Tray Background Daemon), F4.3 (Automated Preflight Diagnostics),
// F4.4 (Port Conflict Self-Healing), F4.5 (Local QR & mDNS Discovery).
// ============================================================

import { describe, expect, it } from 'bun:test';
import { validateInstallEnvironment, generateFirewallRuleCommands, generateDesktopShortcutScript } from '../tier1-features/f4_1_turnkey_installer.test.js';
import { TraySupervisor } from '../tier1-features/f4_2_tray_daemon.test.js';
import { runPreflightDiagnostics } from '../tier1-features/f4_3_diagnostics_preflight.test.js';
import { MockPortManager } from '../tier1-features/f4_4_port_self_healing.test.js';
import { buildPairingUrl, findLocalLanIpv4, formatMdnsAdvertisement } from '../tier1-features/f4_5_mdns_qr_discovery.test.js';

describe('Tier 4 — Scenario 6: Zero-Tech Turnkey Deployment, Tray & Discovery', () => {
  it('executes full turnkey zero-tech deployment lifecycle from install to port healing, daemon supervision, and LAN pairing', () => {
    // Step 1: Turnkey Installer Environment Verification
    const nodeEnv = validateInstallEnvironment('v20.15.0');
    expect(nodeEnv.valid).toBe(true);
    expect(nodeEnv.majorVersion).toBe(20);

    const firewallRules = generateFirewallRuleCommands([3000, 5172, 5173, 5174]);
    expect(firewallRules).toHaveLength(4);

    const shortcut = generateDesktopShortcutScript(
      'C:\\Program Files\\nodejs\\node.exe',
      'C:\\Users\\Public\\Desktop\\CulinaryOS Workstation.lnk',
      ['scripts/tray-manager.ts']
    );
    expect(shortcut).toContain('CulinaryOS Workstation.lnk');

    // Step 2: Detect & Self-Heal Port Conflict on Port 3000 (Zombie Node Process from previous crash)
    const portManager = new MockPortManager([
      { port: 3000, inUse: true, occupyingPid: 7777, processName: 'zombie-node.exe' },
      { port: 5172, inUse: false },
      { port: 5173, inUse: false },
    ]);

    const healResult = portManager.healPortConflict(3000);
    expect(healResult.resolved).toBe(true);
    expect(healResult.freedPid).toBe(7777);
    expect(portManager.checkPort(3000).inUse).toBe(false);

    // Step 3: Run Preflight Diagnostics Health Check Matrix
    const preflight = runPreflightDiagnostics([
      { category: 'System', name: 'Node.js Version >= 20', condition: nodeEnv.valid, passMsg: 'Node v20 OK', failMsg: 'Node outdated' },
      { category: 'System', name: 'Port 3000 Available', condition: !portManager.checkPort(3000).inUse, passMsg: 'Port 3000 Free', failMsg: 'Port locked' },
      { category: 'Builds', name: 'POS Dist Bundle', condition: true, passMsg: 'POS compiled', failMsg: 'POS missing dist' },
      { category: 'Builds', name: 'KDS Dist Bundle', condition: true, passMsg: 'KDS compiled', failMsg: 'KDS missing dist' },
      { category: 'Database', name: 'Supabase Data Plane', condition: true, passMsg: 'Ready (Demo fallback available)', failMsg: 'Offline' },
    ]);

    expect(preflight.isProductionReady).toBe(true);
    expect(preflight.passCount).toBe(5);
    expect(preflight.failCount).toBe(0);

    // Step 4: System Tray Daemon Launches Services & Begins Heartbeat Supervision
    const tray = new TraySupervisor();
    tray.startService('api', 8001);
    tray.startService('pos', 8002);
    tray.startService('kds', 8003);

    expect(tray.getService('api')?.status).toBe('RUNNING');
    expect(tray.getService('pos')?.status).toBe('RUNNING');
    expect(tray.getService('kds')?.status).toBe('RUNNING');

    tray.heartbeat('api', true);
    expect(tray.getService('api')?.uptimeSeconds).toBe(10);

    // Step 5: mDNS Network Broadcast & Terminal LAN QR Pairing
    const lanIp = findLocalLanIpv4({
      eth0: [{ name: 'eth0', address: '192.168.1.88', family: 'IPv4', internal: false }],
    });
    expect(lanIp).toBe('192.168.1.88');

    const pairingUrl = buildPairingUrl(lanIp, 5172, '00000000-0000-0000-0000-000000000001', 'handheld');
    expect(pairingUrl).toBe('http://192.168.1.88:5172?tenant=00000000-0000-0000-0000-000000000001&terminal=handheld');

    const mdnsAd = formatMdnsAdvertisement('culinaryos', 3000, {
      posUrl: `http://${lanIp}:5172`,
      kdsUrl: `http://${lanIp}:5173`,
    });
    expect(mdnsAd.name).toBe('culinaryos._http._tcp.local');
    expect(mdnsAd.txt.posUrl).toBe('http://192.168.1.88:5172');
  });
});
