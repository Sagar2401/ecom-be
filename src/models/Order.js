import mongoose from 'mongoose';

const orderLineSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true },
    unitPriceCents: { type: Number, required: true },
    lineSubtotalCents: { type: Number, required: true },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    cartId: { type: mongoose.Schema.Types.ObjectId, ref: 'Cart', required: true },
    lines: { type: [orderLineSchema], required: true },
    subtotalCents: { type: Number, required: true },
    discountCode: { type: String, default: null },
    discountPercentApplied: { type: Number, default: 0 },
    discountAmountCents: { type: Number, default: 0 },
    totalCents: { type: Number, required: true },
  },
  { timestamps: true }
);

export const Order = mongoose.model('Order', orderSchema);
