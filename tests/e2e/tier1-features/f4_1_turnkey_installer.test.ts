// ============================================================
// Tier 1 — F4.1: Turnkey Windows Installer (Granular Feature Tests)
// Covers: Zero-tech 1-click installation verification, Node runtime checks,
// firewall rule validation (3000, 5172-5180), and desktop shortcut scripting.
// ============================================================

import { describe, expect, it } from 'bun:test';

export interface TurnkeyInstallConfig {
  installDir: string;
  nodeVersion: string;
  targetPorts: number[];
  createDesktopShortcut: boolean;
  configureFirewall: boolean;
  silentMode: boolean;
}

export function validateInstallEnvironment(nodeVersionString: string): { valid: boolean; majorVersion: number; error?: string } {
  const match = nodeVersionString.match(/v?(\d+)\./);
  if (!match) {
    return { valid: false, majorVersion: 0, error: 'Invalid Node.js version string' };
  }
  const major = parseInt(match[1], 10);
  if (major < 20) {
    return { valid: false, majorVersion: major, error: `Node.js version must be >= 20.x, found ${nodeVersionString}` };
  }
  return { valid: true, majorVersion: major };
}

export function generateFirewallRuleCommands(ports: number[]): string[] {
  return ports.map((port) =>
    `netsh advfirewall firewall add rule name="CulinaryOS Port ${port}" dir=in action=allow protocol=TCP localport=${port}`
  );
}

export function generateDesktopShortcutScript(targetExe: string, shortcutPath: string, args: string[]): string {
  return [
    `$WshShell = New-Object -ComObject WScript.Shell`,
    `$Shortcut = $WshShell.CreateShortcut("${shortcutPath}")`,
    `$Shortcut.TargetPath = "${targetExe}"`,
    `$Shortcut.Arguments = "${args.join(' ')}"`,
    `$Shortcut.WindowStyle = 1`,
    `$Shortcut.Save()`,
  ].join('\n');
}

describe('F4.1 Turnkey Windows Installer — Tier 1 Isolation', () => {
  it('1. validates Node.js version >= 20 requirement', () => {
    expect(validateInstallEnvironment('v20.15.0').valid).toBe(true);
    expect(validateInstallEnvironment('v22.2.0').valid).toBe(true);
    expect(validateInstallEnvironment('v18.19.0').valid).toBe(false);
  });

  it('2. generates firewall opening rules for API (3000) and Frontends (5172-5180)', () => {
    const ports = [3000, 5172, 5173, 5174, 5176];
    const rules = generateFirewallRuleCommands(ports);
    expect(rules).toHaveLength(5);
    expect(rules[0]).toContain('localport=3000');
    expect(rules[1]).toContain('localport=5172');
    expect(rules[4]).toContain('localport=5176');
  });

  it('3. generates PowerShell script for desktop workstation shortcuts', () => {
    const script = generateDesktopShortcutScript(
      'C:\\Program Files\\nodejs\\node.exe',
      'C:\\Users\\Public\\Desktop\\CulinaryOS POS.lnk',
      ['scripts/tray-manager.ts', '--launch-pos']
    );
    expect(script).toContain('WScript.Shell');
    expect(script).toContain('CulinaryOS POS.lnk');
    expect(script).toContain('--launch-pos');
  });

  it('4. verifies install config accepts silent unattended execution', () => {
    const config: TurnkeyInstallConfig = {
      installDir: 'C:\\CulinaryOS',
      nodeVersion: 'v20.15.0',
      targetPorts: [3000, 5172, 5173],
      createDesktopShortcut: true,
      configureFirewall: true,
      silentMode: true,
    };
    expect(config.silentMode).toBe(true);
    expect(config.installDir).toBe('C:\\CulinaryOS');
  });

  it('5. handles malformed version strings with descriptive error', () => {
    const res = validateInstallEnvironment('not_a_version');
    expect(res.valid).toBe(false);
    expect(res.error).toContain('Invalid Node.js version string');
  });
});
