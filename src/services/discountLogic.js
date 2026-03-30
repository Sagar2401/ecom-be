/**
 * Pure discount / nth-order coupon rules used by checkout and admin APIs.
 * Kept framework-free for straightforward unit testing.
 */

/**
 * @param {number} subtotalCents - cart subtotal in smallest currency unit
 * @param {number} discountPercent - 0–100
 * @returns {{ discountAmountCents: number, totalAfterDiscountCents: number }}
 */
export function applyPercentDiscount(subtotalCents, discountPercent) {
  if (subtotalCents < 0) throw new Error('subtotalCents must be non-negative');
  if (discountPercent < 0 || discountPercent > 100) {
    throw new Error('discountPercent must be between 0 and 100');
  }
  const raw = (subtotalCents * discountPercent) / 100;
  const discountAmountCents = Math.round(raw);
  const totalAfterDiscountCents = Math.max(0, subtotalCents - discountAmountCents);
  return { discountAmountCents, totalAfterDiscountCents };
}

/**
 * Whether the store has reached a milestone where a new coupon may be issued
 * (every nth completed order). Does not imply a code was already generated.
 *
 * @param {number} completedOrderCount - total successful checkouts so far
 * @param {number} n - every nth order (n >= 1)
 */
export function isNthOrderMilestone(completedOrderCount, n) {
  if (!Number.isInteger(completedOrderCount) || completedOrderCount < 0) {
    throw new Error('completedOrderCount must be a non-negative integer');
  }
  if (!Number.isInteger(n) || n < 1) {
    throw new Error('n must be a positive integer');
  }
  return completedOrderCount > 0 && completedOrderCount % n === 0;
}

/**
 * True if we have not yet recorded generation for this milestone.
 *
 * @param {number} completedOrderCount
 * @param {number} n
 * @param {number|null|undefined} lastGeneratedMilestone - floor(completedCount/n) when code was last generated
 */
export function canGenerateCouponForCurrentMilestone(
  completedOrderCount,
  n,
  lastGeneratedMilestone
) {
  if (!isNthOrderMilestone(completedOrderCount, n)) return false;
  const currentMilestone = completedOrderCount / n;
  if (lastGeneratedMilestone == null) return true;
  return currentMilestone > lastGeneratedMilestone;
}
