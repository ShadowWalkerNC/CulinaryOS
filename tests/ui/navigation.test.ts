import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  CULINARY_APP_MODULES,
  partitionCompactNavigation,
  resolveCulinaryAppHref,
  type CompactNavigationItem,
} from '../../packages/ui/src/navigation.ts';

const items: CompactNavigationItem[] = [
  { id: 'home', label: 'Home', primary: true },
  { id: 'floor', label: 'Floor Map', primary: true },
  { id: 'ticket', label: 'Ticket', primary: true },
  { id: 'pay', label: 'Pay', primary: true },
  { id: 'reports', label: 'Reports' },
  { id: 'settings', label: 'Settings' },
];

describe('compact operational navigation', () => {
  it('keeps the primary quick rail bounded and exposes every remaining section in overflow', () => {
    const layout = partitionCompactNavigation(items, 'home', 4);

    expect(layout.primary.map((item) => item.id)).toEqual(['home', 'floor', 'ticket', 'pay']);
    expect(layout.overflow.map((item) => item.id)).toEqual(['reports', 'settings']);
  });

  it('promotes an active non-primary section instead of hiding its state', () => {
    const layout = partitionCompactNavigation(items, 'reports', 4);

    expect(layout.primary.map((item) => item.id)).toEqual(['home', 'floor', 'ticket', 'reports']);
    expect(layout.overflow.map((item) => item.id)).toEqual(['pay', 'settings']);
  });

  it('retains the current loopback hostname while switching local apps', () => {
    expect(resolveCulinaryAppHref('kds', { protocol: 'http:', hostname: '127.0.0.1' })).toBe('http://127.0.0.1:5173/');
    expect(resolveCulinaryAppHref('admin', { protocol: 'http:', hostname: 'localhost' })).toBe('http://localhost:5174/');
  });

  it('returns the unified-shell relative route away from local app ports', () => {
    expect(resolveCulinaryAppHref('pos', { protocol: 'https:', hostname: 'console.example.com' })).toBe('/pos/');
  });

  it('keeps paired LAN devices on the server hostname and uses the destination port', () => {
    expect(resolveCulinaryAppHref('kds', { protocol: 'http:', hostname: '192.168.1.20', port: '5172' })).toBe('http://192.168.1.20:5173/');
    expect(resolveCulinaryAppHref('admin', { protocol: 'http:', hostname: 'culinaryos.local', port: '5180' })).toBe('http://culinaryos.local:5174/');
  });

  it('brackets IPv6 addresses exactly once', () => {
    expect(resolveCulinaryAppHref('pos', { protocol: 'http:', hostname: '::1' })).toBe('http://[::1]:5172/');
    expect(resolveCulinaryAppHref('pos', { protocol: 'http:', hostname: '[::1]' })).toBe('http://[::1]:5172/');
  });

  it('exposes each canonical application once and does not reintroduce the transitional Marketing surface', () => {
    const appIds = CULINARY_APP_MODULES.map((app) => app.id);

    expect(new Set(appIds).size).toBe(appIds.length);
    expect(appIds).not.toContain('marketing');
  });

  it('keeps the operational shell headers on the shared non-scrolling navigation primitive', () => {
    const shellPaths = [
      'apps/pos/src/App.tsx',
      'apps/kds/src/pages/Station.tsx',
      'apps/admin/src/App.tsx',
      'apps/desktop/src/App.tsx',
    ];

    for (const relativePath of shellPaths) {
      const source = readFileSync(join(process.cwd(), relativePath), 'utf8');
      expect(source).toContain('CompactNavigation');
      expect(source).not.toMatch(/<nav[^>]*overflow-x-auto/);
      expect(source).not.toContain('appModules');
    }
  });
});
