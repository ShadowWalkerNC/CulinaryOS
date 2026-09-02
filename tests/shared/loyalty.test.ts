import { describe, it, expect } from 'vitest';
import {
  calculatePointsEarned,
  earnPoints,
  redeemPoints,
  punchCard,
  punchesRemaining,
  generateGiftCardCode,
  applyGiftCard,
  generateReferralCode,
  calculateReferralRewards,
  validateEmailCapture,
  getLoyaltyTier,
  DEFAULT_LOYALTY_CONFIG,
  type GiftCard,
  type PunchCardConfig,
} from '../../packages/loyalty-engine/src/index.js';

describe('Loyalty Engine Pure Functions', () => {
  describe('Points Engine', () => {
    it('calculates points earned accurately based on cents', () => {
      expect(calculatePointsEarned(2550)).toBe(25);
      expect(calculatePointsEarned(99)).toBe(0);
      expect(calculatePointsEarned(10000)).toBe(100);
    });

    it('earns points and increments customer balance with expiration date', () => {
      const result = earnPoints(5000, 150);
      expect(result.pointsEarned).toBe(50);
      expect(result.newBalance).toBe(200);
      expect(result.expiresAt).toBeDefined();
    });

    it('enforces minimum redemption threshold', () => {
      const result = redeemPoints(50, 200, DEFAULT_LOYALTY_CONFIG);
      expect(result).toHaveProperty('error');
    });

    it('rejects redemptions exceeding current balance', () => {
      const result = redeemPoints(300, 200, DEFAULT_LOYALTY_CONFIG);
      expect(result).toHaveProperty('error');
    });

    it('calculates dollar discount for valid points redemption', () => {
      const result = redeemPoints(200, 500, DEFAULT_LOYALTY_CONFIG);
      expect('discountCents' in result && result.discountCents).toBe(200);
      expect('newBalance' in result && result.newBalance).toBe(300);
    });
  });

  describe('Punch Card Engine', () => {
    const punchConfig: PunchCardConfig = {
      punchesRequired: 10,
      rewardDescription: 'Free Specialty Entree',
    };

    it('advances punches toward reward threshold', () => {
      const punch1 = punchCard(8, 0, punchConfig);
      expect(punch1.newPunches).toBe(9);
      expect(punch1.rewardEarned).toBe(false);
      expect(punchesRemaining(punch1.newPunches, punchConfig)).toBe(1);

      const punch2 = punchCard(9, 0, punchConfig);
      expect(punch2.newPunches).toBe(0);
      expect(punch2.newCompleted).toBe(1);
      expect(punch2.rewardEarned).toBe(true);
      expect(punch2.rewardAvailable).toBe(true);
    });
  });

  describe('Gift Card Engine', () => {
    it('generates standard format alphanumeric gift card codes', () => {
      const code = generateGiftCardCode();
      expect(code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    });

    it('applies partial and full gift card balances against ticket totals', () => {
      const card: GiftCard = {
        code: 'TEST-CARD-1234',
        balanceCents: 5000,
        issuedAt: new Date().toISOString(),
        expiresAt: null,
        isActive: true,
      };

      const partialApply = applyGiftCard(card, 2500);
      expect('deductedCents' in partialApply && partialApply.deductedCents).toBe(2500);
      expect('remainingOrderCents' in partialApply && partialApply.remainingOrderCents).toBe(0);
      expect('newCardBalanceCents' in partialApply && partialApply.newCardBalanceCents).toBe(2500);

      const fullApply = applyGiftCard(card, 7500);
      expect('deductedCents' in fullApply && fullApply.deductedCents).toBe(5000);
      expect('remainingOrderCents' in fullApply && fullApply.remainingOrderCents).toBe(2500);
      expect('newCardBalanceCents' in fullApply && fullApply.newCardBalanceCents).toBe(0);
    });

    it('rejects inactive or expired gift cards', () => {
      const inactiveCard: GiftCard = {
        code: 'INACT-CARD-1234',
        balanceCents: 5000,
        issuedAt: new Date().toISOString(),
        expiresAt: null,
        isActive: false,
      };
      expect(applyGiftCard(inactiveCard, 2000)).toHaveProperty('error');
    });
  });

  describe('Referral & Marketing Intelligence', () => {
    it('generates customer-keyed referral codes', () => {
      const code = generateReferralCode('Chef Gordon');
      expect(code.startsWith('CHE')).toBe(true);
      expect(code.length).toBe(8);
    });

    it('calculates dual-sided referral reward credits on qualified orders', () => {
      const unqualified = calculateReferralRewards(1500);
      expect(unqualified).toHaveProperty('error');

      const qualified = calculateReferralRewards(3500);
      expect('referrerCreditCents' in qualified && qualified.referrerCreditCents).toBe(1000);
      expect('refereeCreditCents' in qualified && qualified.refereeCreditCents).toBe(500);
    });

    it('validates email addresses for checkout guest capture', () => {
      expect(validateEmailCapture('Chef@CulinaryOS.io ')).toBe('chef@culinaryos.io');
      expect(validateEmailCapture('invalid-email')).toBeNull();
    });

    it('evaluates loyalty tiers correctly based on lifetime spending', () => {
      expect(getLoyaltyTier(500)).toBe('bronze');
      expect(getLoyaltyTier(2500)).toBe('silver');
      expect(getLoyaltyTier(7500)).toBe('gold');
      expect(getLoyaltyTier(15000)).toBe('platinum');
    });
  });
});
