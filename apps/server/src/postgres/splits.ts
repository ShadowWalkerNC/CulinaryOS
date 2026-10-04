import { allocateCents, DomainError, integer, taxCents } from './domain.js';

export interface CheckAllocationInput {
  subtotalCents: number;
  taxRateBps: number;
  discountCents?: number;
  serviceChargeCents?: number;
  tipCents?: number;
  shares: number;
}

export interface CheckShare {
  index: number;
  subtotalCents: number;
  discountCents: number;
  taxableCents: number;
  taxCents: number;
  serviceChargeCents: number;
  tipCents: number;
  totalCents: number;
}

/**
 * Pure split-check allocation. Every cent is preserved without floats;
 * remainders land on the earliest shares deterministically. This validates
 * math only — persistent split storage and mixed-tender settlement await
 * their schema slice and are intentionally not fabricated here.
 */
export function allocateCheck(input: CheckAllocationInput): CheckShare[] {
  const subtotal = integer(input.subtotalCents, 'subtotal');
  const rate = integer(input.taxRateBps, 'tax rate', 0, 10_000);
  const discount = input.discountCents === undefined ? 0 : integer(input.discountCents, 'discount');
  const service = input.serviceChargeCents === undefined ? 0 : integer(input.serviceChargeCents, 'service charge');
  const tip = input.tipCents === undefined ? 0 : integer(input.tipCents, 'tip');
  const shares = integer(input.shares, 'shares', 2, 25);
  if (discount > subtotal) {
    throw new DomainError('VALIDATION_ERROR', 'Discount cannot exceed the subtotal', 422);
  }
  const subtotalParts = allocateCents(subtotal, shares);
  const discountParts = allocateCents(discount, shares);
  const serviceParts = allocateCents(service, shares);
  const tipParts = allocateCents(tip, shares);
  return subtotalParts.map((part, index) => {
    const shareDiscount = discountParts[index] ?? 0;
    const taxable = part - shareDiscount;
    const tax = taxCents(taxable, rate);
    const shareService = serviceParts[index] ?? 0;
    const shareTip = tipParts[index] ?? 0;
    return {
      index,
      subtotalCents: part,
      discountCents: shareDiscount,
      taxableCents: taxable,
      taxCents: tax,
      serviceChargeCents: shareService,
      tipCents: shareTip,
      totalCents: taxable + tax + shareService + shareTip,
    };
  });
}

export function assertAllocationConserves(input: CheckAllocationInput, shares: CheckShare[]): void {
  const sum = (pick: (share: CheckShare) => number) => shares.reduce((total, share) => total + pick(share), 0);
  const expectedTax = taxCents(input.subtotalCents - (input.discountCents ?? 0), input.taxRateBps);
  if (sum((share) => share.subtotalCents) !== input.subtotalCents) {
    throw new DomainError('INTERNAL_ERROR', 'Subtotal allocation lost cents', 500);
  }
  // Per-share tax rounding can differ by a cent from whole-check rounding;
  // callers must persist the per-share tax actually charged, not re-derive it.
  const taxDrift = Math.abs(sum((share) => share.taxCents) - expectedTax);
  if (taxDrift > shares.length) {
    throw new DomainError('INTERNAL_ERROR', 'Tax allocation drift exceeds one cent per share', 500);
  }
}
