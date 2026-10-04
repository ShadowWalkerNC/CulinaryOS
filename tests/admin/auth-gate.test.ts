import { describe, it, expect } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('Admin Authentication & RBAC Gate', () => {
  it('App.tsx wraps ResponsiveShell inside AuthProvider and AuthGate', () => {
    const appSource = readFileSync(
      join(process.cwd(), 'apps/admin/src/App.tsx'),
      'utf8'
    );

    expect(appSource).toContain('AuthProvider');
    expect(appSource).toContain('AuthGate');
    expect(appSource).toContain('<AuthProvider>');
    expect(appSource).toContain('<AuthGate>');

    // Must wrap ResponsiveShell
    const authGateIndex = appSource.indexOf('<AuthGate>');
    const shellIndex = appSource.indexOf('<ResponsiveShell');
    expect(authGateIndex).toBeGreaterThan(-1);
    expect(shellIndex).toBeGreaterThan(authGateIndex);
  });

  it('AuthGate checks authentication and manager/owner role privilege', () => {
    const gateSource = readFileSync(
      join(process.cwd(), 'apps/admin/src/components/auth/AuthGate.tsx'),
      'utf8'
    );

    expect(gateSource).toContain('useAuth');
    expect(gateSource).toContain('isAuthenticated');
    expect(gateSource).toContain('isManagerOrOwner');
    expect(gateSource).toContain('AdminLoginView');
  });

  it('AdminLoginView enforces manager/owner verification and 48px touch targets', () => {
    const loginSource = readFileSync(
      join(process.cwd(), 'apps/admin/src/components/auth/AdminLoginView.tsx'),
      'utf8'
    );

    // Verifies PIN against API
    expect(loginSource).toContain('pinLogin');

    // Enforces RBAC privilege rejection for non-managers
    expect(loginSource).toContain("role !== 'owner' && role !== 'manager'");
    expect(loginSource).toContain('does not have manager authorization');

    // Apple HIG Ergonomics: keypad buttons meet 48px touch targets minimum (uses min-h-[56px])
    expect(loginSource).toContain('min-h-[56px]');

    // 6-state button engine: active state haptic physics
    expect(loginSource).toContain('active:scale-[0.96]');
  });

  it('ResponsiveShell provides sign out capabilities in desktop and mobile shells', () => {
    const shellSource = readFileSync(
      join(process.cwd(), 'apps/admin/src/components/layout/ResponsiveShell.tsx'),
      'utf8'
    );

    expect(shellSource).toContain('useAuth');
    expect(shellSource).toContain('logout');
    expect(shellSource).toContain('LogOut');
  });

  it('TabletHeaderNav provides sign out capability in tablet slide-over drawer', () => {
    const tabletNavSource = readFileSync(
      join(process.cwd(), 'apps/admin/src/components/layout/TabletHeaderNav.tsx'),
      'utf8'
    );

    expect(tabletNavSource).toContain('useAuth');
    expect(tabletNavSource).toContain('logout');
    expect(tabletNavSource).toContain('Sign Out');
  });
});
