/**
 * @culinaryos/loyalty-engine
 * Pure functions for loyalty points, punch cards, gift cards, and referral tracking.
 * All functions are side-effect-free — state management is handled by the API layer.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface LoyaltyConfig {
  /** Points earned per dollar spent (default: 1 point per $1) */
  pointsPerDollar: number;
  /** Cent value of one point when redeeming (default: 1 cent = $0.01 per point) */
  centValuePerPoint: number;
  /** Minimum points required to redeem */
  minRedemptionPoints: number;
  /** Maximum points redeemable per transaction (0 = unlimited) */
  maxRedemptionPerTx: number;
  /** Points expire after N days (0 = never expire) */
  expiryDays: number;
}

export const DEFAULT_LOYALTY_CONFIG: LoyaltyConfig = {
  pointsPerDollar: 1,
  centValuePerPoint: 1,       // 100 points = $1.00
  minRedemptionPoints: 100,
  maxRedemptionPerTx: 0,
  expiryDays: 365,
};

export interface PointsEarnResult {
  pointsEarned: number;
  newBalance: number;
  expiresAt: string | null;
}

export interface PointsRedeemResult {
  pointsRedeemed: number;
  discountCents: number;
  newBalance: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Points Engine
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculate points earned for a transaction.
 * Uses floor rounding — partial points are not awarded.
 */
export function calculatePointsEarned(
  orderTotalCents: number,
  config: LoyaltyConfig = DEFAULT_LOYALTY_CONFIG
): number {
  const dollars = orderTotalCents / 100;
  return Math.floor(dollars * config.pointsPerDollar);
}

/**
 * Compute result of earning points on an order.
 */
export function earnPoints(
  orderTotalCents: number,
  currentBalance: number,
  config: LoyaltyConfig = DEFAULT_LOYALTY_CONFIG
): PointsEarnResult {
  const pointsEarned = calculatePointsEarned(orderTotalCents, config);
  const newBalance = currentBalance + pointsEarned;
  const expiresAt = config.expiryDays > 0
    ? new Date(Date.now() + config.expiryDays * 86_400_000).toISOString()
    : null;
  return { pointsEarned, newBalance, expiresAt };
}

/**
 * Validate and compute points redemption.
 * Returns error string if redemption is not allowed.
 */
export function redeemPoints(
  pointsToRedeem: number,
  currentBalance: number,
  config: LoyaltyConfig = DEFAULT_LOYALTY_CONFIG
): PointsRedeemResult | { error: string } {
  if (pointsToRedeem < config.minRedemptionPoints) {
    return { error: `Minimum redemption is ${config.minRedemptionPoints} points.` };
  }
  if (currentBalance < pointsToRedeem) {
    return { error: `Insufficient points. Balance: ${currentBalance}, requested: ${pointsToRedeem}.` };
  }
  const cap = config.maxRedemptionPerTx > 0
    ? Math.min(pointsToRedeem, config.maxRedemptionPerTx)
    : pointsToRedeem;
  const discountCents = cap * config.centValuePerPoint;
  return {
    pointsRedeemed: cap,
    discountCents,
    newBalance: currentBalance - cap,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Punch Card Engine
// ─────────────────────────────────────────────────────────────────────────────

export interface PunchCardConfig {
  /** Number of punches required to earn the reward */
  punchesRequired: number;
  /** Human-readable description of the reward */
  rewardDescription: string;
  /** Optional: restrict to a specific menu item ID */
  itemId?: string;
}

export interface PunchCardState {
  currentPunches: number;
  completed: number;       // how many full cards completed
  rewardAvailable: boolean;
}

/**
 * Add a punch to the card. Returns new state and whether a reward was earned.
 */
export function punchCard(
  currentPunches: number,
  completed: number,
  config: PunchCardConfig
): { newPunches: number; newCompleted: number; rewardEarned: boolean; rewardAvailable: boolean } {
  const newPunches = currentPunches + 1;
  if (newPunches >= config.punchesRequired) {
    return {
      newPunches: 0,
      newCompleted: completed + 1,
      rewardEarned: true,
      rewardAvailable: true,
    };
  }
  return { newPunches, newCompleted: completed, rewardEarned: false, rewardAvailable: false };
}

/** Check remaining punches needed for next reward. */
export function punchesRemaining(currentPunches: number, config: PunchCardConfig): number {
  return config.punchesRequired - currentPunches;
}

// ─────────────────────────────────────────────────────────────────────────────
// Gift Card Engine
// ─────────────────────────────────────────────────────────────────────────────

export interface GiftCard {
  code: string;
  balanceCents: number;
  issuedAt: string;
  expiresAt: string | null;
  isActive: boolean;
}

/**
 * Generate a gift card code. Format: XXXX-XXXX-XXXX (uppercase alpha-numeric).
 * Not cryptographically secure — collision checking must be done at DB level.
 */
export function generateGiftCardCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars
  const segment = () =>
    Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${segment()}-${segment()}-${segment()}`;
}

/**
 * Apply a gift card to an order. Returns how much was deducted and the new balance.
 */
export function applyGiftCard(
  card: GiftCard,
  orderTotalCents: number
): { deductedCents: number; remainingOrderCents: number; newCardBalanceCents: number } | { error: string } {
  if (!card.isActive) return { error: 'Gift card is inactive or has been voided.' };
  if (card.expiresAt && new Date(card.expiresAt) < new Date()) {
    return { error: 'Gift card has expired.' };
  }
  if (card.balanceCents <= 0) return { error: 'Gift card has no remaining balance.' };

  const deductedCents = Math.min(card.balanceCents, orderTotalCents);
  return {
    deductedCents,
    remainingOrderCents: orderTotalCents - deductedCents,
    newCardBalanceCents: card.balanceCents - deductedCents,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Referral Engine
// ─────────────────────────────────────────────────────────────────────────────

export interface ReferralConfig {
  /** Credit in cents awarded to the referrer when a referred customer completes their first order */
  referrerCreditCents: number;
  /** Credit in cents awarded to the new customer on their first order */
  refereeCreditCents: number;
  /** Minimum order value in cents for the reward to trigger */
  minOrderCents: number;
}

export const DEFAULT_REFERRAL_CONFIG: ReferralConfig = {
  referrerCreditCents: 1000,   // $10.00
  refereeCreditCents:  500,    // $5.00
  minOrderCents:       2000,   // $20.00 minimum order
};

/**
 * Generate a unique referral code for a customer.
 * Format: 3-char prefix from name + 5 random alphanumeric chars.
 */
export function generateReferralCode(customerName: string): string {
  const prefix = customerName.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 3).padEnd(3, 'X');
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const suffix = Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${prefix}${suffix}`;
}

/**
 * Calculate rewards when a referral converts (referred customer places first order).
 */
export function calculateReferralRewards(
  orderTotalCents: number,
  config: ReferralConfig = DEFAULT_REFERRAL_CONFIG
): { referrerCreditCents: number; refereeCreditCents: number } | { error: string } {
  if (orderTotalCents < config.minOrderCents) {
    return {
      error: `Order must be at least $${(config.minOrderCents / 100).toFixed(2)} to qualify for referral reward.`,
    };
  }
  return {
    referrerCreditCents: config.referrerCreditCents,
    refereeCreditCents: config.refereeCreditCents,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Email Capture
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validate an email address for marketing list capture.
 * Returns normalized lowercase email or null if invalid.
 */
export function validateEmailCapture(email: string): string | null {
  const normalized = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(normalized) ? normalized : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Loyalty Summary
// ─────────────────────────────────────────────────────────────────────────────

export interface LoyaltySummary {
  pointsBalance: number;
  lifetimePoints: number;
  punchCards: Array<{ cardId: string; punches: number; required: number; rewardAvailable: boolean }>;
  giftCardBalanceCents: number;
  referralCode: string | null;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
}

/** Determine loyalty tier based on lifetime points. */
export function getLoyaltyTier(lifetimePoints: number): LoyaltySummary['tier'] {
  if (lifetimePoints >= 10_000) return 'platinum';
  if (lifetimePoints >= 5_000) return 'gold';
  if (lifetimePoints >= 1_000) return 'silver';
  return 'bronze';
}
