// ============================================================
// Tier 2 — F4.1: Turnkey Windows Installer (Boundary & Corner Cases)
// Covers: Node v19.99.99 boundary rejection, paths containing spaces,
// empty port array, upper bound port (65535), and shortcut escaping.
// ============================================================

import { describe, expect, it } from 'bun:test';
import {
  generateDesktopShortcutScript,
  generateFirewallRuleCommands,
  validateInstallEnvironment,
} from '../tier1-features/f4_1_turnkey_installer.test.js';

describe('F4.1 Turnkey Installer — Tier 2 Boundaries', () => {
  it('1. rejects Node version v19.99.99 right below v20 threshold', () => {
    const res = validateInstallEnvironment('v19.99.99');
    expect(res.valid).toBe(false);
    expect(res.majorVersion).toBe(19);
  });

  it('2. accepts Node version v20.0.0 exact threshold', () => {
    const res = validateInstallEnvironment('v20.0.0');
    expect(res.valid).toBe(true);
    expect(res.majorVersion).toBe(20);
  });

  it('3. handles empty ports list returning empty firewall rule commands array', () => {
    const rules = generateFirewallRuleCommands([]);
    expect(rules).toHaveLength(0);
  });

  it('4. formats firewall rules for highest TCP port boundary 65535', () => {
    const rules = generateFirewallRuleCommands([65535]);
    expect(rules[0]).toContain('localport=65535');
  });

  it('5. handles file paths containing whitespace and special characters in shortcut generation', () => {
    const script = generateDesktopShortcutScript(
      'C:\\Program Files (x86)\\Node JS\\node.exe',
      'C:\\Users\\John Doe\\Desktop\\Culinary OS POS.lnk',
      ['--config="C:\\Program Data\\CulinaryOS\\config.json"']
    );
    expect(script).toContain('C:\\Program Files (x86)\\Node JS\\node.exe');
    expect(script).toContain('C:\\Users\\John Doe\\Desktop\\Culinary OS POS.lnk');
  });
});
