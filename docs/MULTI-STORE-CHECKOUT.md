# One checkout across independent stores

The previous backend allowed multiple products from one store, but rejected a bag containing different sellers. The update supports one NGN test payment for a mixed-store bag and a separate order for each seller. The existing limit of 20 distinct products per checkout and the current one-unit-per-saved-item cart remain in place.

## Customer experience

- Review all items together, grouped by store, with each store's subtotal and one overall payment total.
- Enter one set of contact and shipping details for the checkout.
- Use the existing copyable demo card guide and complete one Paystack transaction.
- After backend verification, see a combined receipt with separate store orders and delivery progress.
- See the individual store orders in My orders. Each has a link back to the combined checkout.
- Resume an unpaid store order through its original combined checkout, at the combined total. It does not start a second charge for that seller.

All payments remain test-only. This change does not implement live seller settlement, commissions, real shipping, tax or partial refunds. Seller payout splitting is separate from grouping orders under one payment.

## Backend model

Single-store orders keep their existing representation. A mixed-store checkout creates a parent `Order` with no seller and one child `Order` for each seller. `parentOrderId` links each child to its parent. The parent owns the one `PaymentAttempt`, the total price, the idempotency key and all stock reservations. Child orders contain their own product snapshots and subtotals but do not hold a second stock reservation.

Signed quotes bind every product to its seller and server-calculated price. The server rechecks the whole bag in a serializable database transaction. If any product is unavailable, the transaction cannot reserve only the remaining products. Retrying the same checkout reuses the same parent and payment attempt.

Verification compares the Paystack transaction against the entire parent total. Repeated callbacks and webhooks do not deduct stock or enqueue notifications again. A successful confirmation updates every child in the same transaction and queues one email per child, containing only that store's items. Parent checkout rows are excluded from customer order history and seller listings. Sellers cannot fetch the buyer's parent checkout; their listing responses omit the combined checkout key and total.

Failure and expiry release the parent's reservations once and update all child statuses together. A late successful payment rechecks the whole bag. If it cannot fulfil every item, the checkout and children become `PAID_REVIEW`; the service does not partially allocate stock or claim successful fulfilment.

## Migration and rollout

Backend migration: `20261119090000_multi_store_checkout`.

It makes `Order.sellerId` nullable, adds nullable `parentOrderId`, and adds a self-reference foreign key and index. Existing rows keep their sellers and have no parent. It does not remove orders, products or payment records.

The migration was applied to the hosted database on 19 November 2026 after explicit approval. Existing record counts remained unchanged: 6 orders, 16 products and 5 accounts. Backend commit `f243d59` was pushed to `forma-backend/main` and deployed on Render.

The live `/payments/config` endpoint now includes `multiStoreCheckout: true`. An authenticated quote against Render successfully combined two products from two stores into one NGN 145,500 total, with matching store subtotals. Chrome checks against the local frontend and live backend passed at desktop and mobile sizes: two store groups, two items, one payment button, and no horizontal overflow on mobile. No payment was started during this verification. Render's existing start command applies pending migrations before starting NestJS. No new Paystack keys or frontend environment variables are needed. Include the compatible frontend changes when publishing the frontend to Vercel.

## Files and verification

Backend: Prisma schema and migration, `src/payments/checkout.service.ts`, `payment-rules.ts`, `seller-order-email.service.ts`, and payment integration coverage in `test/payments.e2e-spec.ts`.

Frontend: checkout review and order contracts, the demo-payment guide, combined and individual receipts, and cart guidance. Browser tests cover grouped review, one payment request, per-store receipts and progress, links to individual orders, resuming a child checkout and existing single-store behavior.

The local database runner is under ignored `.payment-work/multi-store/`. It explicitly overrides **both** `DATABASE_URL` and `DIRECT_URL` to `127.0.0.1:55439`, binds PostgreSQL to loopback, and stops that isolated server after testing. It does not alter the hosted database or the application's environment files.

Validated: 13 real-PostgreSQL payment integration tests, 38 backend unit tests, and 38 desktop/mobile checkout browser checks passed. These cover single-store compatibility, mixed-store subtotals, concurrent checkout retries, wrong payment amounts, duplicate webhooks, seller-order and email privacy, stock expiry, late payments requiring review, and per-store receipts. Both applications compile; frontend TypeScript and lint checks and backend lint checks pass. The hosted migration and live mixed-store quote also passed.
