import { Router } from 'express';
import mongoose from 'mongoose';
import { Cart } from '../models/Cart.js';
import { Order } from '../models/Order.js';
import { DiscountCode } from '../models/DiscountCode.js';
import { StoreSettings, getOrCreateSettings } from '../models/StoreSettings.js';
import { applyPercentDiscount } from '../services/discountLogic.js';

const router = Router();

/**
 * Quote endpoint: validates optional discount code and returns totals for the
 * current cart WITHOUT creating an order or consuming the code.
 * Body: { cartId, discountCode? }
 */
router.post('/quote', async (req, res, next) => {
  try {
    const { cartId, discountCode: rawCode } = req.body ?? {};
    if (!cartId || !mongoose.isValidObjectId(cartId)) {
      return res.status(400).json({ error: 'cartId is required and must be a valid ObjectId' });
    }

    const cart = await Cart.findById(cartId);
    if (!cart) return res.status(404).json({ error: 'Cart not found' });
    if (!cart.items.length) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    const lines = cart.items.map((i) => {
      const lineSubtotalCents = i.unitPriceCents * i.quantity;
      return {
        productId: i.productId,
        quantity: i.quantity,
        unitPriceCents: i.unitPriceCents,
        lineSubtotalCents,
      };
    });
    const subtotalCents = lines.reduce((s, l) => s + l.lineSubtotalCents, 0);

    let discountPercentApplied = 0;
    let discountAmountCents = 0;
    let normalizedCode = null;

    if (rawCode != null && String(rawCode).trim() !== '') {
      normalizedCode = String(rawCode).trim().toUpperCase();
      const discountDoc = await DiscountCode.findOne({ code: normalizedCode });
      if (!discountDoc) {
        return res.status(400).json({ error: 'Invalid discount code' });
      }
      if (discountDoc.used) {
        return res.status(400).json({ error: 'Discount code has already been used' });
      }
      discountPercentApplied = discountDoc.discountPercent;
      discountAmountCents = applyPercentDiscount(subtotalCents, discountPercentApplied).discountAmountCents;
    }

    const totalCents =
      discountAmountCents > 0
        ? applyPercentDiscount(subtotalCents, discountPercentApplied).totalAfterDiscountCents
        : subtotalCents;

    res.json({
      cartId,
      subtotalCents,
      discountCode: normalizedCode,
      discountPercentApplied,
      discountAmountCents,
      totalCents,
    });
  } catch (e) {
    next(e);
  }
});

/**
 * Checkout: validates optional discount code, creates order, clears cart,
 * increments global completed order count (used for nth-order coupon eligibility).
 * Body: { cartId, discountCode? }
 */
router.post('/', async (req, res, next) => {
  try {
    const { cartId, discountCode: rawCode } = req.body ?? {};
    if (!cartId || !mongoose.isValidObjectId(cartId)) {
      return res.status(400).json({ error: 'cartId is required and must be a valid ObjectId' });
    }

    const cart = await Cart.findById(cartId);
    if (!cart) return res.status(404).json({ error: 'Cart not found' });
    if (!cart.items.length) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    const lines = cart.items.map((i) => {
      const lineSubtotalCents = i.unitPriceCents * i.quantity;
      return {
        productId: i.productId,
        quantity: i.quantity,
        unitPriceCents: i.unitPriceCents,
        lineSubtotalCents,
      };
    });
    const subtotalCents = lines.reduce((s, l) => s + l.lineSubtotalCents, 0);

    let discountPercentApplied = 0;
    let discountAmountCents = 0;
    let normalizedCode = null;
    let discountDoc = null;

    if (rawCode != null && String(rawCode).trim() !== '') {
      normalizedCode = String(rawCode).trim().toUpperCase();
      discountDoc = await DiscountCode.findOne({ code: normalizedCode });
      if (!discountDoc) {
        return res.status(400).json({ error: 'Invalid discount code' });
      }
      if (discountDoc.used) {
        return res.status(400).json({ error: 'Discount code has already been used' });
      }
      discountPercentApplied = discountDoc.discountPercent;
      const applied = applyPercentDiscount(subtotalCents, discountPercentApplied);
      discountAmountCents = applied.discountAmountCents;
    }

    const totalCents =
      discountAmountCents > 0
        ? applyPercentDiscount(subtotalCents, discountPercentApplied).totalAfterDiscountCents
        : subtotalCents;

    const order = await Order.create({
      cartId: cart._id,
      lines,
      subtotalCents,
      discountCode: normalizedCode,
      discountPercentApplied,
      discountAmountCents,
      totalCents,
    });

    if (discountDoc) {
      const updated = await DiscountCode.findOneAndUpdate(
        { _id: discountDoc._id, used: false },
        { $set: { used: true, usedAt: new Date() } },
        { new: true }
      );
      if (!updated) {
        await Order.deleteOne({ _id: order._id });
        return res.status(409).json({ error: 'Discount code was used by another request' });
      }
    }

    cart.items = [];
    await cart.save();

    await getOrCreateSettings();
    await StoreSettings.updateOne({ _id: 'global' }, { $inc: { completedOrderCount: 1 } });

    res.status(201).json({
      orderId: order._id.toString(),
      subtotalCents: order.subtotalCents,
      discountCode: order.discountCode,
      discountPercentApplied: order.discountPercentApplied,
      discountAmountCents: order.discountAmountCents,
      totalCents: order.totalCents,
      lines: order.lines,
    });
  } catch (e) {
    next(e);
  }
});

export default router;
