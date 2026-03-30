import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDb, disconnectDb } from '../config/db.js';
import { Product } from '../models/Product.js';
import { getOrCreateSettings } from '../models/StoreSettings.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ecommerce_store';

const SAMPLE_PRODUCTS = [
  { sku: 'BOOK-001', name: 'Paperback Novel', priceCents: 1299 },
  { sku: 'MUG-002', name: 'Ceramic Mug', priceCents: 1599 },
  { sku: 'TSHIRT-003', name: 'Cotton T-Shirt', priceCents: 2499 },
];

async function seed() {
  await connectDb(MONGODB_URI);
  await Product.deleteMany({ sku: { $in: SAMPLE_PRODUCTS.map((p) => p.sku) } });
  await Product.insertMany(SAMPLE_PRODUCTS);
  const settings = await getOrCreateSettings();
  settings.ordersPerCoupon = 3;
  settings.couponDiscountPercent = 10;
  await settings.save();
  console.log('Seeded products and default settings (every 3rd order → 10% coupon eligible).');
  await disconnectDb();
}

seed().catch((e) => {
  console.error(e);
  mongoose.connection.close().finally(() => process.exit(1));
});
