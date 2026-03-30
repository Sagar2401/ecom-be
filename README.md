# E-commerce Store API

Express + MongoDB (Mongoose) APIs for carts, checkout with **validated** discount codes, and admin reporting. Money is stored in **integer cents** to avoid floating-point errors.

## Discount model

- Store settings define **every `ordersPerCoupon` completed checkouts** as a milestone.
- After the global completed order count hits a multiple of `n` (e.g. 3, 6, 9…), an admin can call **generate** to create a **single-use** code for `couponDiscountPercent` off (e.g. 10%).
- Each milestone only yields **one** generated code until the **next** milestone (`lastCouponMilestoneIndex` tracks this).
- Checkout **rejects** unknown, already-used, or missing codes when a code is supplied.

Core rules live in `src/services/discountLogic.js` and have **unit tests** (`npm test`).

## Prerequisites

- Node.js 18+
- MongoDB (local or [Atlas](https://www.mongodb.com/cloud/atlas))

## Setup

```bash
cd server
cp .env.example .env
# Edit .env — set MONGODB_URI if not using local default
npm install
npm start
```

Health check: `GET http://localhost:3000/health`

## Frontend (optional)

A React + Vite UI lives in **`../client`**. With the API on port **3000**, run `npm install` and `npm run dev` in `client` (port **5173**); the dev server proxies `/api` to the backend. Use the **Admin** button in the header for admin APIs.

## API overview

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/products` | List active products |
| POST | `/api/cart` | Create empty cart → returns `cartId` |
| GET | `/api/cart/:cartId` | Cart lines + `subtotalCents` |
| POST | `/api/cart/:cartId/items` | Body: `{ "productId", "quantity" }` — merges quantities |
| POST | `/api/checkout` | Body: `{ "cartId", "discountCode"? }` — validates code, creates order, clears cart |
| POST | `/api/admin/discount-codes/generate` | Create code if current order count is on an nth milestone and not yet generated |
| GET | `/api/admin/stats` | Items purchased, revenue, codes list, total discounts given |
| GET | `/api/admin/settings` | Read `ordersPerCoupon`, `couponDiscountPercent`, counters |
| PATCH | `/api/admin/settings` | Body: `{ "ordersPerCoupon"?, "couponDiscountPercent"? }` |

## Example flow

```bash
# 1) Create cart
curl -s -X POST http://localhost:3000/api/cart

# 2) Add item (use productId from GET /api/products)
curl -s -X POST http://localhost:3000/api/cart/CART_ID/items \
  -H "Content-Type: application/json" \
  -d "{\"productId\":\"PRODUCT_OID\",\"quantity\":2}"

# 3) Checkout (optional discount)
curl -s -X POST http://localhost:3000/api/checkout \
  -H "Content-Type: application/json" \
  -d "{\"cartId\":\"CART_ID\",\"discountCode\":\"DEAL-AB12CD34\"}"

# 4) After every 3rd order (default), generate a code
curl -s -X POST http://localhost:3000/api/admin/discount-codes/generate

# 5) Stats
curl -s http://localhost:3000/api/admin/stats
```


Uses Node’s built-in test runner against pure discount/milestone logic (no DB required).

## Pushing to GitHub

Initialize a repo at the project root (or `server/` only), commit in small steps, and push to your remote. Suggested commit themes: models + discount rules → cart/checkout → admin + docs → tests.
# ecom-be
