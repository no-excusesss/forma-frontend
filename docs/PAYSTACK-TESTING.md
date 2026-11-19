# Paystack test checkout: deployment and learning guide

This project accepts **test payments only**. It refuses live Paystack secret keys and live transaction results. Use Paystack's test cards, never your own card. A test purchase does update the application's order and stock records, so use disposable demo products and a separate buyer account.

For deploying the frontend to Vercel with the existing hosted backend, use the current [Vercel deployment guide](./VERCEL-DEPLOYMENT.md). It includes the complete frontend environment and Render callback/origin changes.

The frontend is `C:\Users\HP\Desktop\shoptesting`.
The NestJS backend is `C:\Users\HP\Desktop\nestjsBackend\backend-nestjs`.
The backend repository is https://github.com/no-excusesss/forma-backend.

## 1. Host the backend on Render's Free web service

Your database is already hosted on Prisma Postgres. The backend's private `.env` has a pooled `DATABASE_URL` for the app and a direct `DIRECT_URL` for migrations. Reuse those privately for this development deployment; you do not need to buy or create a Render database. Use a separate database before any real launch.

In Render:

1. Select **New → Web Service**.
2. Choose GitHub and connect `no-excusesss/forma-backend`. If it is missing, use Render's GitHub app configuration to allow that repository. You can limit its access to this one repository.
3. Use these settings:

| Setting | Value |
| --- | --- |
| Name | `forma-backend-test` or an available name |
| Language/runtime | Node |
| Branch | `main` |
| Root directory | Leave empty |
| Build command | `npm ci --include=dev && npm run build` |
| Start command | `npm run start:render` |
| Instance type | **Free** |
| Health check path, under Advanced | `/health` |

The committed `.node-version` pins Node. Prisma is used at startup to apply pending migrations, which is why this test deployment includes development dependencies. Do not set `PORT`: Render provides it.

Before deploying, add these **environment variables** in Render. Environment variables are private configuration values read by the running backend. Do not paste their secret values into chat or GitHub.

| Variable | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Copy its complete value from your backend `.env`, without the surrounding quotes |
| `DIRECT_URL` | Copy its complete value from your backend `.env`, without the surrounding quotes |
| `BETTER_AUTH_SECRET` | Copy the existing value from your backend `.env` |
| `BETTER_AUTH_TRUSTED_ORIGINS` | `http://localhost:3101` |
| `BETTER_AUTH_DASH_ENABLED` | `false` |
| `CHECKOUT_FRONTEND_URL` | `http://localhost:3101` |
| `PAYSTACK_SECRET_KEY` | Your **test** secret key beginning `sk_test_`; this can be added after the first deploy |
| `PAYMENT_RECONCILIATION_ENABLED` | `true` |
| `UPLOAD_DRIVER` | `local` |

Leave `BETTER_AUTH_URL` unset on Render. The backend automatically uses Render's own `RENDER_EXTERNAL_URL`. This avoids guessing the final service address. Local development still uses your existing `BETTER_AUTH_URL=http://localhost:3000`.

`PAYSTACK_WEBHOOK_SECRET` is optional until you configure a current webhook signing secret in Paystack; see section 3. It is distinct from the API secret key.

Select **Deploy Web Service**. Wait for the service to become Live. Copy the exact HTTPS address Render gives you, for example `https://forma-backend-test-xxxx.onrender.com`.

Open these addresses, replacing the example host:

```text
https://YOUR-RENDER-HOST/health
https://YOUR-RENDER-HOST/payments/config
```

The first should return `{"status":"ok","payments":"test-only"}`. The second reports `mode: "test"`; `enabled` becomes true after a test secret key is configured.

The repository also contains `render.yaml`, an optional blueprint with the same service configuration.

**Free hosting limits:** Render can put an idle Free service to sleep, and waking it can take time. Its local uploaded files are not persistent. Test orders are in hosted PostgreSQL and survive restarts, but newly uploaded images can disappear after sleeping or redeployment. Existing image records may still point to your local server. This deployment is for learning and payment testing; durable image storage is a separate change before launch. Do not upgrade to a paid plan for this exercise.

Official references: [Render Free services](https://render.com/docs/free), [Node deployment](https://render.com/docs/deploy-node-express-app), [Prisma database connections](https://www.prisma.io/docs/postgres/database/connecting-to-your-database).

## 2. Point your local frontend to the hosted backend

In the frontend `.env.local`, use:

```dotenv
NEXT_PUBLIC_API_URL=/backend
API_UPSTREAM_URL=https://YOUR-RENDER-HOST
```

Use the actual origin, with no `/health` or other path. Stop and restart `npm run dev` after changing these variables.

The browser now calls paths like `/backend/orders` on `localhost:3101`. `next.config.ts` forwards those requests to the Render backend. This keeps the browser's session requests on the frontend origin and avoids relying on third-party cookies across unrelated domains.

The backend still validates login sessions and the `Origin` header. This proxy does not disable authentication, CORS, or CSRF protection. Never add payment keys to frontend environment variables.

If the browser does not find your old session, sign in again. Existing users remain in the same hosted database. Use `localhost`, not `127.0.0.1`, for the documented frontend URL.

To return to your entirely local setup:

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:3000
# Remove or comment out API_UPSTREAM_URL.
```

Then restart Next.js and run the NestJS backend locally.

## 3. Configure Paystack in test mode

1. Create/sign in to your Paystack account and stay in **Test mode**.
2. Find the developer API configuration / API keys and webhooks page.
3. Copy the test secret key starting `sk_test_` into Render's `PAYSTACK_SECRET_KEY` environment variable. Save and redeploy. No frontend public key is needed for this hosted-redirect integration.
4. Set the **test webhook URL** to:

```text
https://YOUR-RENDER-HOST/payments/paystack/webhook
```

5. If the dashboard offers a webhook signing secret starting `whsec_`, generate/copy it privately to Render's `PAYSTACK_WEBHOOK_SECRET` and redeploy. The server will then require the current `Paystack-Signature` header, including its timestamp.
6. If your integration has only the legacy signature, leave `PAYSTACK_WEBHOOK_SECRET` unset. The server verifies `x-paystack-signature` using the test API key. Once a current signing secret is configured, it will not silently fall back to legacy validation.
7. A dashboard test callback URL can be `http://localhost:3101/checkout/return`. The backend also supplies this address when creating each transaction, using `CHECKOUT_FRONTEND_URL`.

The callback returns the customer's browser to your frontend. The webhook is a separate server-to-server request from Paystack to the public NestJS backend. Do not enter the frontend callback address as the webhook address.

Your frontend can remain on your computer during this test: the customer is you, using that computer. Paystack's webhook must use the public Render address.

If your Paystack account does not yet expose test keys, complete the dashboard onboarding needed to access test mode. Do not make a live payment or enter a live key to work around it.

Official references: [Accept payments](https://paystack.com/docs/payments/accept-payments/), [webhook verification](https://paystack.com/docs/payments/webhooks/), [test payment details](https://paystack.com/docs/payments/test-payments/).

## 4. Make your first test purchase

1. Sign in as a seller and create an ACTIVE, available demo product priced in NGN with positive stock. The current bag purchases one unit of each saved product, with at most 20 distinct items per checkout.
2. Use another account as the buyer. The backend prevents buying your own listing.
3. Save the demo product to the bag. Use NGN items; after the multi-store backend update, products from several stores can share one checkout.
4. Open the bag and choose **Review checkout**.
5. Enter the collection contact name and phone number.
6. Review the server-calculated total and select **Pay … in test mode**.
7. The order is saved and a demo-payment guide appears with copy buttons. Choose **Open Paystack checkout** to open the provider's card form in another tab, keeping the guide available. Use its successful test card:

```text
Card number: 4084 0840 8408 4081
CVV:         408
Expiry:      Any future date, for example 12/35
```

These details are from [Paystack's test payments documentation](https://paystack.com/docs/payments/test-payments/). This card does not use real money and needs no PIN or OTP.

8. After payment, the app checks the transaction with Paystack. It shows **Payment confirmed** only after the backend verifies it.
9. Look under **My orders** to see the saved purchase. In the seller account, **Seller studio → Orders** shows confirmed test purchases.
10. Check Paystack's test dashboard and webhook event delivery. A successful notification should receive HTTP 200 from the backend. The webhook continues to work even if you close the customer tab before the return visit.

The first version is a **collection-only simulation**. It does not arrange collection, charge delivery, calculate tax, split seller payouts, send email receipts, or issue automatic refunds. It cannot be switched to live payments merely by changing a key. If a late payment cannot be matched with available stock, the order becomes `PAID_REVIEW`; refund that test transaction through the Paystack test dashboard. An in-app refund workflow and refund-event tracking are future work before any real launch.

## 5. Follow the code, from button to confirmed order

### A. The bag stores selections

Frontend `src/lib/bag.ts` stores numeric product IDs on the current device. Saving an item does not reserve it. The new `removePurchased` helper removes only the items in a confirmed paid order and preserves other saved items.

Frontend `src/features/catalog/bag.tsx` links to `/checkout`. The initial implementation keeps the existing one-unit-per-product behavior.

### B. The checkout asks the backend for a quote

Frontend `src/features/checkout/checkout.tsx` requests `POST /checkout/quote` with product IDs and quantities. It sends no price or total chosen by the browser.

Backend `src/payments/checkout.dto.ts` validates the input shape and rejects unknown fields. `src/payments/checkout.service.ts` reads real products, checks stock, currency, seller, and ownership, and calculates the price in integer kobo.

For example, NGN 99.99 becomes 9,999 kobo. `payment-rules.ts` converts decimal price strings without floating-point rounding.

The quote includes a short-lived signed token. Its signature binds the reviewed products and prices to the buyer. A customer cannot edit the total in that token without invalidating it.

### C. Clicking Pay saves an unpaid order

The frontend sends `POST /checkout` with the signed quote, contact details, and an idempotency key.

An idempotency key is a label for one checkout intention. Repeating that same request returns the existing order. The browser stores the key in its tab's session storage so a network retry does not create another order accidentally.

The saved order returns its checkout key to the signed-in client. When that order reaches a final state, the client clears only the matching saved key. This lets the same buyer deliberately purchase the same product again later without confusing it with an old paid order, and avoids clearing another checkout's retry protection.

The backend verifies the token, checks prices again, and uses a serializable database transaction to create the order and reserve stock. A changed price requires the customer to refresh the review. Database constraints prevent negative or excessive reservations. A seller cannot edit stock below a pending reservation.

Quotes last 10 minutes. Once an order is created, its stock hold lasts 30 minutes.

### D. The backend initializes Paystack

Backend `src/payments/paystack.service.ts` calls `POST https://api.paystack.co/transaction/initialize` using the private test key. It supplies the exact amount, NGN currency, a unique reference, and the fixed application callback address. Only the card channel is enabled for this version.

The backend stores Paystack's checkout URL and returns the saved order. The frontend shows copyable demo-card details and offers a new-tab HTTPS link on `checkout.paystack.com`, keeping the guide accessible while the customer pays. Card numbers are entered only on Paystack, not into this app. Resuming an unpaid order rechecks the profile on the backend before showing the same guide.

If initialization times out, the backend saves an uncertain result and does not blindly initialize another payment. The customer can check the existing order. A pending order is not proof of payment.

### E. The return page asks for verification

Frontend `src/app/checkout/return/page.tsx` reads the transaction reference. Its client component calls `POST /payments/:reference/verify`. If sign-in is needed, the sign-in destination preserves the payment reference.

The backend confirms that the payment belongs to this customer's order, then calls Paystack's verification API. It compares reference, amount, currency, environment, and the transaction's actual status. An HTTP 200 from Paystack alone is not a successful payment.

### F. The webhook uses the same confirmation logic

Backend `src/payments/payments.controller.ts` receives `POST /payments/paystack/webhook`. `src/configure-app.ts` captures the original request bytes so the signature can be verified correctly.

`payment-rules.ts` authenticates the provider signature. For a successful test-payment notification, the server verifies the reference with Paystack and calls the same confirmation logic used by the return page.

The handler acknowledges a successful notification only after its database work is committed. If verification or saving fails, a non-200 response allows the provider to retry. It stores a hash of processed successful event bodies to recognize duplicates, and the payment/order state provides a second duplicate-processing guard.

### G. Confirmation updates stock and payment together

The backend records the payment, marks the order paid, releases the reservation, and deducts purchased stock in one database transaction. When the last item sells, the same stock update marks the product SOLD_OUT to satisfy the existing database rule.

If callback verification and a webhook arrive together, the transaction/retry logic makes the second confirmation harmless. It cannot deduct stock twice.

Expired holds are released. A late successful payment tries to allocate available stock again; if stock is no longer available, the order is recorded as paid but needing review rather than claiming it can be fulfilled.

### H. The order screens read stored facts

Frontend `src/features/checkout/orders.tsx` shows the customer's own orders, order details, and the seller's confirmed test orders. Customers cannot read someone else's private order by changing its ID. Sellers only see their own store's purchases.

Pending order screens periodically read the stored status. The backend also checks a limited batch of unresolved payments in the background while the process is awake: up to five per minute, with each payment checked no more than every five minutes, for its first 24 hours. On Free hosting this is best-effort because the process can sleep. Webhooks, explicit customer verification, and checks when opening checkout/order routes provide additional recovery paths.

## 6. Database additions

The additive migration is `prisma/migrations/20261117090000_test_checkout/migration.sql`.

| Addition | Why it exists |
| --- | --- |
| `Product.reservedQuantity` | Hold stock without pretending it was already purchased |
| `Order` | Permanent customer, seller, total, contact details, and payment state |
| `OrderItem` | Purchased product title, quantity, and exact price snapshot |
| `PaymentAttempt` | Provider reference, link, result, and last verification time |
| `PaymentEvent` | Recognize repeated successful notifications |

Purchased prices remain unchanged when a seller later edits a product. Order relationships preserve purchase history instead of silently deleting it when another record is removed.

## 7. Verification commands

Frontend:

```powershell
npm run typecheck
npm run lint
npm test
npm run build
node node_modules/@playwright/test/cli.js test tests/browser/checkout.spec.ts tests/browser/marketplace.spec.ts --grep-invert "live homepage"
```

Backend, from its own directory:

```powershell
npm run build
npm run lint
npm test
node node_modules/vitest/vitest.mjs run --config vitest.config.e2e.ts test/payments.e2e-spec.ts --reporter=verbose
```

The automated checkout tests simulate Paystack's API. Integration tests use PostgreSQL and real login sessions with temporary records and cleanup. Browser tests use intercepted API responses. These checks do not replace the first genuine **Paystack test-mode** transaction and real public-webhook delivery after hosting is configured.

`node scripts/check-payment-setup.mjs` prints configuration checks without printing secret values. `node scripts/check-staged-secrets.mjs` checks Git's staged files for your configured secrets before a push.

## 8. Troubleshooting

| Problem | Check |
| --- | --- |
| Render build fails | Read the first build error. Confirm the runtime is Node, root directory is empty, and use the exact build command above. |
| Render startup fails at migration | Check `DIRECT_URL`, database access, and the migration error. Do not reset the database. |
| Test checkout unavailable | `/payments/config` must report `enabled: true`. Confirm `PAYSTACK_SECRET_KEY` begins `sk_test_` and redeploy. |
| Login does not persist | Use `/backend` plus `API_UPSTREAM_URL`, restart Next.js, and sign in again. Confirm the frontend origin is trusted. |
| The first request is slow | Open `/health` and wait for the Free Render service to wake. |
| Callback returns to the wrong site | Correct `CHECKOUT_FRONTEND_URL` and start a fresh test transaction. Existing links may retain their old return URL. |
| Webhook returns 401 | Check the correct test key/signing secret and signature format; do not remove verification. |
| Webhook returns 404 | The URL must end with `/payments/paystack/webhook`; check the host and deployment. |
| Webhook returns 503 | Check provider connectivity and test configuration; retry after the service is awake. |
| Payment stays pending | Use Check payment status; inspect the test transaction and webhook delivery. Avoid starting another payment while the outcome is uncertain. |
| Quote says unavailable | Another order may hold the item for up to 30 minutes. Use another demo item or wait for expiry. |
| A paid order says review needed | Stock was unavailable when a delayed payment was confirmed. Resolve/refund that test transaction in the dashboard. |
| Images disappear after redeployment | Free Render local files are temporary; persistent object storage is not configured. |

If you later host the frontend too, update `CHECKOUT_FRONTEND_URL` and trusted origins to its exact HTTPS origin, and configure that frontend's proxy to this API. Keep the webhook pointing directly at the backend.
