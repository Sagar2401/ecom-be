# DECISIONS

This file captures key design decisions made while implementing the e-commerce store APIs.

---

## Decision: Use Node.js + Express + MongoDB (Mongoose)

**Context:** The assignment required functional APIs with a database (you requested MongoDB), with room for quick iteration and clear code structure.

**Options Considered:**
- Option A: Node.js + Express + MongoDB (Mongoose)
- Option B: Node.js + Fastify + MongoDB (native driver)

**Choice:** Node.js + Express + Mongoose.

**Why:** Express is widely understood and fast to scaffold. Mongoose provides schema validation, indexes, and a straightforward modeling experience for carts, orders, and discount codes. Fastify + native driver could be faster/lower-level, but would add more setup and reduce clarity for an exercise.

---

## Decision: Store money as integer cents

**Context:** Checkout totals, discounts, and revenue reporting must be correct and stable.

**Options Considered:**
- Option A: Store money as integer cents (`priceCents`, `subtotalCents`, etc.)
- Option B: Store money as floating-point numbers (e.g. `19.99`)

**Choice:** Integer cents everywhere.

**Why:** Floating-point math causes rounding errors that show up in totals and reporting. Integer cents keeps calculations deterministic and simplifies discount math and unit testing.

---

## Decision: Snapshot unit price into cart items (and order lines)

**Context:** Products can change price over time; carts should remain consistent once items are added.

**Options Considered:**
- Option A: Store only `productId` in cart; always fetch latest product price at checkout
- Option B: Store `unitPriceCents` snapshot per cart item and carry it into the order

**Choice:** Snapshot `unitPriceCents` at add-to-cart time.

**Why:** This prevents “surprise” price changes at checkout and makes orders auditable. It also makes order totals reproducible without needing historical product pricing tables.

---

## Decision: Represent the nth-order discount rule via a singleton `StoreSettings` document

**Context:** The discount system needs global counters (completed orders) and parameters (`n`, `% off`), with a simple way to prevent duplicate coupon issuance for the same milestone.

**Options Considered:**
- Option A: Global singleton `StoreSettings` document (`completedOrderCount`, `ordersPerCoupon`, `lastCouponMilestoneIndex`)
- Option B: Compute milestones from orders each time (aggregate `Order.countDocuments()`), and track generation separately

**Choice:** Singleton `StoreSettings`.

**Why:** Counting orders via aggregation every time is slower and invites race conditions for coupon generation. A single settings doc makes the rule explicit, easy to patch for demos, and avoids repeated DB scans. It also creates a natural place to store the “already generated for this milestone” guard.

---

## Decision: Discount codes are single-use and consumed only on successful checkout

**Context:** Discount codes should not be re-used and should remain valid while a customer is previewing totals.

**Options Considered:**
- Option A: Mark code used when the user “applies”/previews it
- Option B: Mark code used only when an order is created successfully

**Choice:** Consume the code only during checkout (`POST /api/checkout`).

**Why:** Previewing a code should not burn it. Consuming at checkout matches typical commerce behavior. To reduce race conditions, checkout updates the code with a conditional query (`used: false`) and returns a 409 if another request consumed it first.

---

## Decision: Add a checkout “quote” endpoint to support safe discount validation

**Context:** We needed a way to validate discount codes and compute totals without creating an order or consuming a single-use code.

**Options Considered:**
- Option A: Validate and consume codes only during checkout (no preflight)
- Option B: Add a server-side quote endpoint that validates the code and returns totals without consuming it

**Choice:** Server-side quote endpoint (`POST /api/checkout/quote`).

**Why:** Validation rules and discount availability belong on the server. The quote endpoint provides a safe preflight for totals and code validity while ensuring the code is only consumed during the actual checkout request.

---

## Decision: Protect admin endpoints with a simple static token middleware

**Context:** Admin APIs (stats, settings, discount generation) should not be publicly accessible, but the assignment doesn’t require full user auth/roles.

**Options Considered:**
- Option A: No auth (public admin APIs)
- Option B: Static shared token (`ADMIN_TOKEN`) checked by middleware on `/api/admin/*`

**Choice:** Static token middleware with `ADMIN_TOKEN`.

**Why:** It’s minimal but demonstrates secure-by-default behavior. It keeps the focus on business logic while ensuring admin endpoints require a caller-supplied token (e.g., `Authorization: Bearer <token>`).

