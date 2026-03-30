import mongoose from 'mongoose';
import crypto from 'crypto';

const discountCodeSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    discountPercent: { type: Number, required: true, min: 0, max: 100 },
    /** Set when a customer successfully checks out with this code */
    used: { type: Boolean, default: false },
    usedAt: { type: Date, default: null },
    /** Order milestone index (e.g. 3 when this was generated after the 3rd nth batch) */
    milestoneIndex: { type: Number, default: null },
  },
  { timestamps: true }
);

/** Human-readable random code prefix */
export function generateRandomCode(prefix = 'SAVE') {
  const suffix = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `${prefix}-${suffix}`;
}

export const DiscountCode = mongoose.model('DiscountCode', discountCodeSchema);
