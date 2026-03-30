import { Router } from 'express';
import { DiscountCode, generateRandomCode } from '../models/DiscountCode.js';
import { Order } from '../models/Order.js';
import { getOrCreateSettings } from '../models/StoreSettings.js';
import { canGenerateCouponForCurrentMilestone } from '../services/discountLogic.js';

const router = Router();

/**
 * Generate a single-use discount code when the store has hit an nth-order
 * milestone and a code has not yet been generated for that milestone.
 */
router.post('/discount-codes/generate', async (_req, res, next) => {
  try {
    const settings = await getOrCreateSettings();
    const n = settings.ordersPerCoupon;
    const count = settings.completedOrderCount;
    const currentMilestone = n > 0 ? Math.floor(count / n) : 0;

    const eligible = canGenerateCouponForCurrentMilestone(
      count,
      n,
      settings.lastCouponMilestoneIndex
    );

    if (!eligible) {
      return res.status(400).json({
        error: 'No eligible milestone',
        detail:
          count === 0
            ? 'No completed orders yet.'
            : count % n !== 0
              ? `Next milestone at order count multiple of ${n} (current: ${count}).`
              : 'A discount code was already generated for this milestone.',
        completedOrderCount: count,
        ordersPerCoupon: n,
        lastCouponMilestoneIndex: settings.lastCouponMilestoneIndex,
      });
    }

    const codeStr = generateRandomCode('DEAL');
    const doc = await DiscountCode.create({
      code: codeStr,
      discountPercent: settings.couponDiscountPercent,
      milestoneIndex: currentMilestone,
      used: false,
    });

    settings.lastCouponMilestoneIndex = currentMilestone;
    await settings.save();

    res.status(201).json({
      code: doc.code,
      discountPercent: doc.discountPercent,
      milestoneIndex: doc.milestoneIndex,
      message: 'Discount code created. Share with a customer to use at checkout.',
    });
  } catch (e) {
    next(e);
  }
});

/**
 * Aggregate store metrics: units sold, revenue, codes issued, total discounts.
 */
router.get('/stats', async (_req, res, next) => {
  try {
    const orders = await Order.find({}).lean();
    let itemsPurchased = 0;
    let revenueCents = 0;
    let totalDiscountsGivenCents = 0;
    for (const o of orders) {
      revenueCents += o.totalCents;
      totalDiscountsGivenCents += o.discountAmountCents ?? 0;
      for (const line of o.lines ?? []) {
        itemsPurchased += line.quantity;
      }
    }

    const codes = await DiscountCode.find({})
      .sort({ createdAt: -1 })
      .select('code discountPercent used milestoneIndex createdAt usedAt')
      .lean();

    res.json({
      orderCount: orders.length,
      itemsPurchased,
      revenueCents,
      totalDiscountsGivenCents,
      discountCodes: codes.map((c) => ({
        code: c.code,
        discountPercent: c.discountPercent,
        used: c.used,
        milestoneIndex: c.milestoneIndex,
        createdAt: c.createdAt,
        usedAt: c.usedAt,
      })),
      discountCodesIssued: codes.length,
    });
  } catch (e) {
    next(e);
  }
});

/**
 * Optional: read or update nth-order rule (helps demos without reseeding).
 */
router.get('/settings', async (_req, res, next) => {
  try {
    const s = await getOrCreateSettings();
    res.json({
      ordersPerCoupon: s.ordersPerCoupon,
      couponDiscountPercent: s.couponDiscountPercent,
      completedOrderCount: s.completedOrderCount,
      lastCouponMilestoneIndex: s.lastCouponMilestoneIndex,
    });
  } catch (e) {
    next(e);
  }
});

router.patch('/settings', async (req, res, next) => {
  try {
    const { ordersPerCoupon, couponDiscountPercent } = req.body ?? {};
    const s = await getOrCreateSettings();
    if (ordersPerCoupon != null) {
      const v = Number(ordersPerCoupon);
      if (!Number.isInteger(v) || v < 1) {
        return res.status(400).json({ error: 'ordersPerCoupon must be an integer >= 1' });
      }
      s.ordersPerCoupon = v;
    }
    if (couponDiscountPercent != null) {
      const v = Number(couponDiscountPercent);
      if (Number.isNaN(v) || v < 0 || v > 100) {
        return res.status(400).json({ error: 'couponDiscountPercent must be between 0 and 100' });
      }
      s.couponDiscountPercent = v;
    }
    await s.save();
    res.json({
      ordersPerCoupon: s.ordersPerCoupon,
      couponDiscountPercent: s.couponDiscountPercent,
      completedOrderCount: s.completedOrderCount,
      lastCouponMilestoneIndex: s.lastCouponMilestoneIndex,
    });
  } catch (e) {
    next(e);
  }
});

export default router;
