import { Router } from 'express';
import { Product } from '../models/Product.js';

const router = Router();

/** List active products (helps clients discover IDs for cart APIs). */
router.get('/', async (_req, res, next) => {
  try {
    const products = await Product.find({ active: true }).lean();
    res.json({ products });
  } catch (e) {
    next(e);
  }
});

export default router;
