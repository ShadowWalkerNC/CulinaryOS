// ============================================================
// Tier 2 — F3.1: Manager PIN Gatekeeper (Boundary & Corner Cases)
// Covers: Empty PIN, whitespace-padded PINs, non-numeric PINs,
// long PIN strings, and corrupted hash delimiters.
// ============================================================

import { describe, expect, it } from 'bun:test';
import { hashPin, verifyPin } from '@culinaryos/server/lib/pin';
import {
  authorizeManagerAction,
} from '../tier1-features/f3_1_manager_pin.test.js';

describe('F3.1 Manager PIN Gatekeeper — Tier 2 Boundaries', () => {
  const managerPin = '5678';
  const managerHash = hashPin(managerPin);

  it('1. rejects empty string PIN with unauthorized result', () => {
    const res = authorizeManagerAction(
      { action: 'void_item', managerPin: '', reasonCode: 'spill', staffRole: 'manager' },
      managerHash
    );
    expect(res.authorized).toBe(false);
  });

  it('2. verifies 8-digit high-security manager PINs correctly', () => {
    const longPin = '87654321';
    const longHash = hashPin(longPin);
    expect(verifyPin(longPin, longHash)).toBe(true);
    expect(verifyPin('87654320', longHash)).toBe(false);
  });

  it('3. rejects non-numeric or alphanumeric strings when compared against numeric PINs', () => {
    expect(verifyPin('ABCD', managerHash)).toBe(false);
    expect(verifyPin('5678a', managerHash)).toBe(false);
  });

  it('4. fails gracefully without throwing when hash string contains corrupt delimiters', () => {
    expect(verifyPin('5678', 'corrupt_hash_no_colon')).toBe(false);
    expect(verifyPin('5678', ':missing_salt')).toBe(false);
    expect(verifyPin('5678', 'missing_hash:')).toBe(false);
  });

  it('5. handles whitespace around PINs requiring exact match', () => {
    expect(verifyPin(' 5678 ', managerHash)).toBe(false);
    expect(verifyPin('5678', managerHash)).toBe(true);
  });
});
