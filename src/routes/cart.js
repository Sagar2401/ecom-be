import { Router } from 'express';
import mongoose from 'mongoose';
import { Cart } from '../models/Cart.js';
import { Product } from '../models/Product.js';

const router = Router();

function productIdToString(productId) {
  if (productId && typeof productId === 'object' && productId._id) {
    return productId._id.toString();
  }
  return productId.toString();
}

function computeCartTotals(items) {
  let subtotalCents = 0;
  const lines = items.map((i) => {
    const line = i.unitPriceCents * i.quantity;
    subtotalCents += line;
    return {
      productId: productIdToString(i.productId),
      quantity: i.quantity,
      unitPriceCents: i.unitPriceCents,
      lineSubtotalCents: line,
    };
  });
  return { lines, subtotalCents };
}

/** Create an empty cart. */
router.post('/', async (_req, res, next) => {
  try {
    const cart = await Cart.create({ items: [] });
    res.status(201).json({ cartId: cart._id.toString(), items: [], subtotalCents: 0 });
  } catch (e) {
    next(e);
  }
});

/** Get cart with line totals and subtotal. */
router.get('/:cartId', async (req, res, next) => {
  try {
    const { cartId } = req.params;
    if (!mongoose.isValidObjectId(cartId)) {
      return res.status(400).json({ error: 'Invalid cartId' });
    }
    const cart = await Cart.findById(cartId).populate('items.productId', 'name sku').lean();
    if (!cart) return res.status(404).json({ error: 'Cart not found' });
    const { lines, subtotalCents } = computeCartTotals(cart.items);
    const itemsWithProduct = lines.map((line, idx) => {
      const raw = cart.items[idx].productId;
      const populated =
        raw && typeof raw === 'object' && raw.name != null
          ? { name: raw.name, sku: raw.sku }
          : null;
      return { ...line, product: populated };
    });
    res.json({
      cartId: cart._id.toString(),
      items: itemsWithProduct,
      subtotalCents,
    });
  } catch (e) {
    next(e);
  }
});

/**
 * Add or merge line item. Body: { productId, quantity }
 * Price is snapshotted from the product at add time.
 */
router.post('/:cartId/items', async (req, res, next) => {
  try {
    const { cartId } = req.params;
    if (!mongoose.isValidObjectId(cartId)) {
      return res.status(400).json({ error: 'Invalid cartId' });
    }
    const { productId, quantity } = req.body ?? {};
    if (!productId || !mongoose.isValidObjectId(productId)) {
      return res.status(400).json({ error: 'productId is required and must be a valid ObjectId' });
    }
    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty < 1) {
      return res.status(400).json({ error: 'quantity must be a positive integer' });
    }

    const product = await Product.findById(productId);
    if (!product || !product.active) {
      return res.status(404).json({ error: 'Product not found or inactive' });
    }

    const cart = await Cart.findById(cartId);
    if (!cart) return res.status(404).json({ error: 'Cart not found' });

    const existing = cart.items.find((i) => i.productId.toString() === productId);
    if (existing) {
      existing.quantity += qty;
      existing.unitPriceCents = product.priceCents;
    } else {
      cart.items.push({
        productId: product._id,
        quantity: qty,
        unitPriceCents: product.priceCents,
      });
    }
    await cart.save();

    const { lines, subtotalCents } = computeCartTotals(cart.items);
    res.status(200).json({
      cartId: cart._id.toString(),
      items: lines,
      subtotalCents,
    });
  } catch (e) {
    next(e);
  }
});

export default router;
