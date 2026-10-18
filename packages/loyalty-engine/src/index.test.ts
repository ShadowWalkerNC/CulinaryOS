import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculatePointsEarned, earnPoints, redeemPoints } from './index.js';

describe('Loyalty Engine: Points Calculation and Redemption', () => {
  it('calculates points earned using floor rounding per dollar spent', () => {
    assert.equal(calculatePointsEarned(2450), 24); // $24.50 -> 24 points
    assert.equal(calculatePointsEarned(99), 0);    // $0.99 -> 0 points
    assert.equal(calculatePointsEarned(10000), 100);
  });

  it('updates point balance and sets expiry timestamp', () => {
    const result = earnPoints(5000, 150);
    assert.equal(result.pointsEarned, 50);
    assert.equal(result.newBalance, 200);
    assert.ok(result.expiresAt !== null);
  });

  it('validates minimum point threshold and computes discount on redemption', () => {
    const denied = redeemPoints(50, 200);
    assert.ok('error' in denied);

    const allowed = redeemPoints(150, 200);
    assert.ok(!('error' in allowed));
    if (!('error' in allowed)) {
      assert.equal(allowed.pointsRedeemed, 150);
      assert.equal(allowed.discountCents, 150); // $1.50
      assert.equal(allowed.newBalance, 50);
    }
  });
});
