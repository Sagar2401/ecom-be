import mongoose from 'mongoose';

/**
 * Singleton-style settings: reward every `ordersPerCoupon` completed orders
 * with a new code worth `couponDiscountPercent` off one checkout.
 */
const storeSettingsSchema = new mongoose.Schema(
  {
    _id: { type: String, default: 'global', immutable: true },
    /** Every nth successful order unlocks admin coupon generation */
    ordersPerCoupon: { type: Number, required: true, min: 1, default: 3 },
    /** Percent off for newly generated codes */
    couponDiscountPercent: { type: Number, required: true, min: 0, max: 100, default: 10 },
    /** How many checkouts have completed (increments on each order) */
    completedOrderCount: { type: Number, default: 0, min: 0 },
    /**
     * Milestone index (completedOrderCount / ordersPerCoupon) for which we last
     * generated a coupon — prevents duplicate codes for the same nth boundary.
     */
    lastCouponMilestoneIndex: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

export const StoreSettings = mongoose.model('StoreSettings', storeSettingsSchema);

const SETTINGS_ID = 'global';

export async function getOrCreateSettings() {
  let doc = await StoreSettings.findById(SETTINGS_ID);
  if (!doc) {
    doc = await StoreSettings.create({ _id: SETTINGS_ID });
  }
  return doc;
}
