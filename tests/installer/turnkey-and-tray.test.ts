import { describe, it, expect } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';
import * as net from 'net';
import {
  isPortAvailable,
  findProcessOnPort,
  healPortConflicts,
  ensurePortsFree,
  killProcess,
  CULINARYOS_PORTS,
} from '../../scripts/port-healer';
import {
  getLanIpv4,
  getAllLanIpv4,
  generatePairingPayload,
  generateTerminalQr,
  generateDataUrlQr,
  buildMdnsResponsePacket,
} from '../../scripts/mdns-qr-discovery';
import { runDiagnostics } from '../../scripts/doctor';

const repoRoot = path.resolve(__dirname, '../..');

describe('Milestone 4: Turnkey Zero-Tech Installer & System Tray Engine', () => {
  describe('F4.1: Turnkey Zero-Tech Windows Installer Scripts', () => {
    it('verifies install-windows-turnkey.ps1 exists and contains complete setup sequence', () => {
      const psPath = path.join(repoRoot, 'scripts/install-windows-turnkey.ps1');
      expect(fs.existsSync(psPath)).toBe(true);

      const content = fs.readFileSync(psPath, 'utf8');
      expect(content).toContain('CulinaryOS');
      expect(content).toContain('New-NetFirewallRule');
      expect(content).toContain('3000');
      expect(content).toContain('5172');
      expect(content).toContain('5180');
      expect(content).toContain('winget install OpenJS.NodeJS.LTS');
      expect(content).toContain('pnpm install');
      expect(content).toContain('CreateShortcut');
      expect(content).toContain('pnpm doctor');
    });

    it('verifies Install-CulinaryOS.bat root launcher exists and has fallback sequence', () => {
      const batPath = path.join(repoRoot, 'Install-CulinaryOS.bat');
      expect(fs.existsSync(batPath)).toBe(true);

      const content = fs.readFileSync(batPath, 'utf8');
      expect(content).toContain('install-windows-turnkey.ps1');
      expect(content).toContain('INSTALL_PROFILE');
      expect(content).toContain('pnpm install');
      expect(content).toContain('pnpm doctor');
    });

    it('verifies helper scripts for shortcuts and firewall exist', () => {
      const shortcutScript = path.join(repoRoot, 'scripts/create-desktop-shortcut.ps1');
      const firewallScript = path.join(repoRoot, 'scripts/setup-firewall.ps1');

      expect(fs.existsSync(shortcutScript)).toBe(true);
      expect(fs.existsSync(firewallScript)).toBe(true);

      const fwContent = fs.readFileSync(firewallScript, 'utf8');
      expect(fwContent).toContain('CulinaryOS Local Restaurant Network');
      expect(fwContent).toContain('5180');
    });
  });

  describe('F4.4: Port Conflict Auto-Healing Engine', () => {
    it('defines all 8 standard CulinaryOS ports', () => {
      expect(CULINARYOS_PORTS).toEqual([3000, 5172, 5173, 5174, 5175, 5176, 5177, 5180]);
    });

    it('detects available port on an ephemeral port', async () => {
      const ephemeralPort = 49152 + Math.floor(Math.random() * 10000);
      const available = await isPortAvailable(ephemeralPort);
      expect(available).toBe(true);
    });

    it('detects occupied port when a socket server is actively listening', async () => {
      const testPort = 49200 + Math.floor(Math.random() * 5000);
      const server = net.createServer();

      await new Promise<void>((resolve) => {
        server.listen(testPort, '127.0.0.1', () => resolve());
      });

      const availableWhileListening = await isPortAvailable(testPort, '127.0.0.1');
      expect(availableWhileListening).toBe(false);

      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });

      const availableAfterClose = await isPortAvailable(testPort, '127.0.0.1');
      expect(availableAfterClose).toBe(true);
    });

    it('safeguards against killing critical system PIDs or self', async () => {
      const killZero = await killProcess(0);
      const killSystem = await killProcess(4);
      const killSelf = await killProcess(process.pid);

      expect(killZero).toBe(false);
      expect(killSystem).toBe(false);
      expect(killSelf).toBe(false);
    });

    it('scans port list and returns structured heal results', async () => {
      const testPorts = [49301, 49302] as const;
      const results = await healPortConflicts(testPorts);

      expect(results.length).toBe(2);
      expect(results[0].port).toBe(49301);
      expect(results[0].occupied).toBe(false);
      expect(results[0].healed).toBe(false);
      expect(results[0].message).toContain('free');
    });

    it('ensurePortsFree returns true for available port range', async () => {
      const testPorts = [49401, 49402] as const;
      const allFree = await ensurePortsFree(testPorts);
      expect(allFree).toBe(true);
    });
  });

  describe('F4.5: Local QR & mDNS Network Discovery Engine', () => {
    it('resolves valid IPv4 LAN address format', () => {
      const lanIp = getLanIpv4();
      expect(lanIp).toMatch(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/);

      const allLan = getAllLanIpv4();
      expect(Array.isArray(allLan)).toBe(true);
      for (const ip of allLan) {
        expect(ip).toMatch(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/);
      }
    });

    it('generates pairing payload with direct IP and mDNS addresses', () => {
      const payload = generatePairingPayload({
        lanIp: '192.168.1.100',
        hostname: 'culinaryos.local',
        tenantId: 'test-tenant-1234',
      });

      expect(payload.lanIp).toBe('192.168.1.100');
      expect(payload.hostname).toBe('culinaryos.local');
      expect(payload.tenantId).toBe('test-tenant-1234');
      expect(payload.urls.desktop).toBe('http://192.168.1.100:5180');
      expect(payload.urls.pos).toBe('http://192.168.1.100:5172');
      expect(payload.urls.kds).toBe('http://192.168.1.100:5173');
      expect(payload.urls.tableside).toBe('http://192.168.1.100:5176/table/demo/1');
      expect(payload.mdnsUrls.desktop).toBe('http://culinaryos.local:5180');
      expect(payload.mdnsUrls.pos).toBe('http://culinaryos.local:5172');
    });

    it('renders ANSI / ASCII terminal QR code string', async () => {
      const qrText = await generateTerminalQr('http://192.168.1.100:5180');
      expect(typeof qrText).toBe('string');
      expect(qrText.length).toBeGreaterThan(50);
    });

    it('generates Data URL for browser rendering', async () => {
      const dataUrl = await generateDataUrlQr('http://192.168.1.100:5180');
      expect(dataUrl.startsWith('data:image/')).toBe(true);
      expect(dataUrl.length).toBeGreaterThan(100);
    });

    it('constructs authoritative RFC 6762 mDNS response packet buffer', () => {
      const packet = buildMdnsResponsePacket({
        hostname: 'culinaryos.local',
        ip: '192.168.1.50',
        port: 5180,
        serviceName: 'CulinaryOS Test Workstation',
      });

      expect(Buffer.isBuffer(packet)).toBe(true);
      expect(packet.length).toBeGreaterThan(50);

      // Verify DNS Response Flag (0x8400)
      const flags = packet.readUInt16BE(2);
      expect(flags & 0x8000).toBe(0x8000); // Response flag bit set
      expect(flags & 0x0400).toBe(0x0400); // Authoritative Answer flag bit set

      // Check packet contains host and IP bytes
      const packetStr = packet.toString('binary');
      expect(packetStr).toContain('culinaryos');
      expect(packetStr).toContain('_culinaryos');
    });
  });

  describe('F4.3: 1-Click Automated Diagnostics Preflight Suite', () => {
    it('executes runDiagnostics() and returns comprehensive DiagnosticReport', async () => {
      const report = await runDiagnostics();

      expect(report).toBeDefined();
      expect(typeof report.passedCount).toBe('number');
      expect(typeof report.warnCount).toBe('number');
      expect(typeof report.failCount).toBe('number');
      expect(typeof report.isReady).toBe('boolean');

      expect(report.system).toBeDefined();
      expect(report.system.nodeVersion).toBeDefined();
      expect(report.system.totalMemoryMb).toBeGreaterThan(0);
      expect(report.system.cpuCores).toBeGreaterThanOrEqual(1);
      expect(report.system.lanIp).toBeDefined();

      expect(report.checks.length).toBeGreaterThanOrEqual(10);

      // Verify key check categories are covered
      const categories = new Set(report.checks.map((c) => c.category));
      expect(categories.has('Runtimes')).toBe(true);
      expect(categories.has('Resources')).toBe(true);
      expect(categories.has('Ports')).toBe(true);
      expect(categories.has('Builds')).toBe(true);
      expect(categories.has('Database')).toBe(true);
      expect(categories.has('Network')).toBe(true);
      expect(categories.has('Hardware')).toBe(true);
    });

    it('checks port availability across all 8 CulinaryOS ports', async () => {
      const report = await runDiagnostics();
      const portChecks = report.checks.filter((c) => c.category === 'Ports');

      expect(portChecks.length).toBe(8);
      const portNames = portChecks.map((p) => p.name);
      expect(portNames.some((n) => n.includes('3000'))).toBe(true);
      expect(portNames.some((n) => n.includes('5172'))).toBe(true);
      expect(portNames.some((n) => n.includes('5180'))).toBe(true);
    });

    it('verifies build artifact inspection for all client bundles', async () => {
      const report = await runDiagnostics();
      const buildChecks = report.checks.filter((c) => c.category === 'Builds');

      expect(buildChecks.length).toBe(7);
      const buildNames = buildChecks.map((b) => b.name);
      expect(buildNames).toContain('POS Client');
      expect(buildNames).toContain('KDS Client');
      expect(buildNames).toContain('Admin Portal');
      expect(buildNames).toContain('Web Storefront');
      expect(buildNames).toContain('KitchenKit');
      expect(buildNames).toContain('CulinaryOps');
      expect(buildNames).toContain('Desktop Workstation');
    });
  });

  describe('F4.2: Background System Tray Daemon & Supervisor Engine', () => {
    it('verifies tray-manager.ts exists and implements supervisor lifecycle', () => {
      const trayPath = path.join(repoRoot, 'scripts/tray-manager.ts');
      expect(fs.existsSync(trayPath)).toBe(true);

      const content = fs.readFileSync(trayPath, 'utf8');
      expect(content).toContain('class TrayManager');
      expect(content).toContain('healPortConflicts');
      expect(content).toContain('startHttpControlApi');
      expect(content).toContain('SUPERVISOR_PORT = 5188');
      expect(content).toContain('/api/diagnostics');
      expect(content).toContain('/api/pairing-qr');
      expect(content).toContain('/api/heal-ports');
      expect(content).toContain('.culinaryos-daemon.log');
      expect(content).toContain('launchWindowsSystemTrayIcon');
      expect(content).toContain('NotifyIcon');
    });
  });
});

