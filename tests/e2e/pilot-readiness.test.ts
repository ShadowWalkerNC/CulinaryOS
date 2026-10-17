import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { runPilotBootstrap } from '../../scripts/pilot_bootstrap.js';

describe('Phase 1: Pilot Deployment Readiness (Alley Katz Posture)', () => {
  it('bootstraps the pilot venue and issues a signed certificate', async () => {
    const cert = await runPilotBootstrap({
      tenantId: '00000000-0000-0000-0000-000000000001',
      venueName: 'Alley Katz Pub & Grill',
    });

    assert.equal(cert.status, 'CERTIFIED');
    assert.equal(cert.venueName, 'Alley Katz Pub & Grill');
    assert.equal(cert.tenantId, '00000000-0000-0000-0000-000000000001');
    assert.equal(cert.venueType, 'Full-Service Restaurant & Bar');
    assert.ok(cert.fingerprint && cert.fingerprint.length === 64, 'Must produce 64-char SHA-256 fingerprint');
  });

  it('enforces FLSA Rule 9 manager exclusion in staff configuration', async () => {
    const cert = await runPilotBootstrap();
    const manager = cert.staff.find((s) => s.role === 'manager');
    const server = cert.staff.find((s) => s.role === 'server');
    const kitchen = cert.staff.find((s) => s.role === 'kitchen');

    assert.ok(manager, 'Manager profile must exist');
    assert.equal(manager.tipPoolEligible, false, 'FLSA gate: manager must be excluded from tip pool');

    assert.ok(server, 'Server profile must exist');
    assert.equal(server.tipPoolEligible, true, 'Server profile must be eligible for FOH tip pool');

    assert.ok(kitchen, 'Kitchen profile must exist');
    assert.equal(kitchen.tipPoolEligible, false, 'BOH kitchen excluded in FOH-only tip pool model');
  });

  it('certifies physical POS hardware printer and 24V cash drawer kick pulse', async () => {
    const cert = await runPilotBootstrap();

    assert.equal(cert.hardware.printerStatus, 'ONLINE');
    assert.equal(cert.hardware.drawerKickVerified, true);
    assert.ok(cert.hardware.testTicketBytes > 50, 'Receipt payload must contain formatted ESC/POS bytes');
    assert.equal(cert.hardware.terminalReader, 'Stripe WisePOS E (IP Reader)');
    assert.equal(cert.hardware.terminalStatus, 'READY_FOR_PAIRING');
  });
});
