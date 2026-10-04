import assert from 'node:assert/strict';
import { describe, it } from 'bun:test';
import { allocateCents, canonicalJson, fingerprint, integer, opaqueToken, taxCents, tokenHash, uuid } from '../../apps/server/src/postgres/domain.ts';

describe('PostgreSQL domain boundaries', () => {
  it('rejects unsafe money and noninteger quantities', () => {
    for (const value of [-1, 0.1, '100', NaN, Infinity, 2_147_483_648]) {
      assert.throws(() => integer(value, 'amount'));
    }
    assert.equal(integer(0, 'amount'), 0);
  });
  it('normalizes UUIDs and rejects slugs', () => {
    assert.equal(uuid('AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA', 'tenant'), 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
    assert.throws(() => uuid('demo', 'tenant'));
  });
  it('fingerprints semantic object order consistently and rejects altered payloads', () => {
    assert.equal(fingerprint({ b: 2, a: { d: 4, c: 3 } }), fingerprint({ a: { c: 3, d: 4 }, b: 2 }));
    assert.notEqual(fingerprint({ total: 100 }), fingerprint({ total: 101 }));
    assert.throws(() => canonicalJson({ missing: undefined }));
  });
  it('rejects deeply nested or nonfinite request values', () => {
    assert.throws(() => canonicalJson(Infinity));
    let nested: unknown = null;
    for (let index = 0; index < 20; index++) nested = [nested];
    assert.throws(() => canonicalJson(nested));
  });
  it('rounds taxes exactly and rejects totals outside the DB range', () => {
    assert.equal(taxCents(101, 500), 5);
    assert.equal(taxCents(100, 550), 6);
    assert.equal(taxCents(2_147_483_647, 10_000), 2_147_483_647);
    assert.throws(() => taxCents(100, 10_001));
  });
  it('allocates all cents with stable remainders across check counts', () => {
    for (let total = 0; total < 1000; total += 7) {
      for (let shares = 1; shares <= 20; shares++) {
        const allocations = allocateCents(total, shares);
        assert.equal(allocations.reduce((sum, amount) => sum + amount, 0), total);
        assert.ok(Math.max(...allocations) - Math.min(...allocations) <= 1);
      }
    }
    assert.deepEqual(allocateCents(100, 3), [34, 33, 33]);
  });
  it('mints independent 256-bit tokens and stores only hashes', () => {
    const first = opaqueToken('session');
    const second = opaqueToken('session');
    assert.notEqual(first, second);
    assert.equal(first.startsWith('cs_'), true);
    assert.equal(opaqueToken('device').startsWith('cd_'), true);
    assert.equal(tokenHash(first).length, 64);
    assert.notEqual(tokenHash(first), first);
  });
});
