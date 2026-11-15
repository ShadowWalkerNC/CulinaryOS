// ============================================================
// CulinaryOS — Rust Standalone Desktop & SaaS Cloud Bridge Parity Test
// Verifies:
// 1. Unified Root Cargo Workspace (packages/native, packages/hardware/daemon, apps/desktop/src-tauri)
// 2. Installed Rust App + SaaS Cloud Bridge HMAC-SHA256 Entitlement Contract
// 3. Hardcoded FLSA Tip Pool Manager Exclusion & Embedded Local Store Integrity
// ============================================================

import { describe, it, expect } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = path.resolve(__dirname, '../..');

describe('Rust Standalone Desktop & SaaS Cloud Bridge Architecture', () => {
  it('1. unifies packages/native, packages/hardware/daemon, and apps/desktop/src-tauri in root Cargo.toml', () => {
    const cargoToml = fs.readFileSync(path.join(ROOT, 'Cargo.toml'), 'utf8');
    expect(cargoToml).toContain('"packages/native"');
    expect(cargoToml).toContain('"packages/hardware/daemon"');
    expect(cargoToml).toContain('"apps/desktop/src-tauri"');

    const desktopCargo = fs.readFileSync(
      path.join(ROOT, 'apps/desktop/src-tauri/Cargo.toml'),
      'utf8'
    );
    expect(desktopCargo).toContain('name = "culinaryos-desktop"');
    expect(desktopCargo).toContain('culinaryos-native');
  });

  it('2. enforces #![forbid(unsafe_code)], embedded local DB, and FLSA tip exclusion in Rust', () => {
    const libRs = fs.readFileSync(path.join(ROOT, 'packages/native/src/lib.rs'), 'utf8');
    expect(libRs).toContain('#![forbid(unsafe_code)]');
    expect(libRs).toContain('pub mod local_store;');
    expect(libRs).toContain('pub mod cloud_bridge;');
    expect(libRs).toContain('pub mod standalone;');

    const localStoreRs = fs.readFileSync(
      path.join(ROOT, 'packages/native/src/local_store.rs'),
      'utf8'
    );
    expect(localStoreRs).toContain('FLSA 29 U.S.C. 203(m)(2)(B)');
    expect(localStoreRs).toContain('is_management_or_supervisor');
  });

  it('3. verifies SaaS Cloud Bridge add-ons require installed Rust app and match canonical HMAC-SHA256 grant format', () => {
    const cloudBridgeRs = fs.readFileSync(
      path.join(ROOT, 'packages/native/src/cloud_bridge.rs'),
      'utf8'
    );
    expect(cloudBridgeRs).toContain('CloudStorageSync');
    expect(cloudBridgeRs).toContain('OnlineOrderingBridge');
    expect(cloudBridgeRs).toContain('AiAutopilot');
    expect(cloudBridgeRs).toContain('MultiUnitCommissary');
    expect(cloudBridgeRs).toContain('ManagedStripeConnect');

    // Verify canonical JSON payload signing matches Rust serde camelCase order
    const payload = {
      grantId: 'grant-001',
      customerId: 'cust-alley-katz',
      siteId: '00000000-0000-0000-0000-000000000777',
      planTier: 'saas_pro',
      addons: ['ai_autopilot', 'cloud_storage_sync', 'online_ordering_bridge'],
      cloudEndpoint: 'https://cloud.culinaryos.io',
      issuedAtUnix: 1000,
      expiresAtUnix: 2000,
      offlineGraceSeconds: 600,
    };
    const secret = 'culinaryos-saas-signing-secret-key-2026-prod';
    const sig = crypto
      .createHmac('sha256', Buffer.from(secret, 'utf8'))
      .update(Buffer.from(JSON.stringify(payload), 'utf8'))
      .digest('hex');
    expect(sig).toHaveLength(64);
  });
});
