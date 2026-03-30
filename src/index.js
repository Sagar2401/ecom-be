import 'dotenv/config';
import { createApp } from './app.js';
import { connectDb } from './config/db.js';

const PORT = Number(process.env.PORT) || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ecommerce_store';

async function main() {
  await connectDb(MONGODB_URI);
  const app = createApp();
  app.listen(PORT, () => {
    console.log(`E-commerce API listening on http://localhost:${PORT}`);
  });
}

main().catch((e) => {
  console.error('Failed to start server', e);
  process.exit(1);
});
