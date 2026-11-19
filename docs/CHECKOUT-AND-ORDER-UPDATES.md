# Checkout, order tracking, and seller emails

## What a customer sees

1. A customer saves items from independent sellers to the bag and opens checkout. Multi-store checkout groups them into one payment and separate store orders; see MULTI-STORE-CHECKOUT.md for rollout requirements.
2. If the profile is missing a first or last name, valid phone number, shipping address, city, state, or country, a popup lists what to add. Payment is blocked. Optional details such as a photo, date of birth, bio, and nationality are not required for checkout.
3. **Complete profile & continue** opens the profile form with the delivery fields visible and required. Saving returns to checkout, keeping the bag intact.
4. Checkout shows the saved shipping address and contact details. Prices come from the backend. Both a new checkout and resuming an unpaid order check the saved profile on the backend before returning a Paystack payment link.
5. The return page asks the backend to verify the transaction with Paystack. A redirect alone never means a payment succeeded.
6. A successful payment displays a receipt with product images, quantities, prices, total, seller, saved address, payment reference, and payment time. Purchased items are removed from the bag only after confirmation.
7. The timeline moves from **Order received** to **Pending shipping**. It stops there for demo purchases. **Shipped** and **Delivered** remain future steps; no shipment or delivery dates are invented.
8. **My orders** supports status filters, pagination through the customer's history, and a full detail page for each order. The backend checks ownership. Desktop account navigation stays sticky while scrolling; on small screens it keeps the existing compact layout.

Earlier collection orders remain readable, but do not gain a fabricated shipping address or historical product image.

## What the backend saves

Payment state (`PENDING_PAYMENT`, `PAID`, etc.) stays separate from delivery state (`ORDER_RECEIVED`, `PENDING_SHIPPING`, `SHIPPED`, `DELIVERED`). A verified successful demo payment saves `PENDING_SHIPPING`; no timer advances it beyond that stage.

New orders snapshot the shipping address and item images alongside the existing product names and prices. Editing a profile or listing later does not rewrite an existing receipt.

The additive migration is `20261117170000_order_delivery_and_notifications`. It adds nullable receipt fields and a seller notification table. Existing paid orders start at pending shipping. The normal Render start command applies migrations before starting the server.

## Seller order emails

Paystack confirmation updates the paid order and adds one notification to the database in the same transaction. A background worker sends the email after that transaction commits. If email fails, the payment stays successful and the notification remains available for retry. Repeated webhooks use the same order notification and provider idempotency key.

Emails include the order reference, store, items, quantities, total, customer contact, shipping address, and a clear demo notice. Stock-review cases have a separate warning and do not tell the seller to ship. The seller's business email is preferred, with the seller account email as a fallback.

Add these privately to the **backend** Render environment:

| Variable | Value |
| --- | --- |
| `RESEND_API_KEY` | Your Resend API key |
| `ORDER_EMAIL_FROM` | `Forma <onboarding@resend.dev>` during initial testing |
| `ORDER_NOTIFICATION_TEST_EMAIL` | The inbox used to sign up for Resend |

During demo testing, every store's notification goes to that controlled inbox. The three sample sellers have example email addresses without real inboxes. The Resend test sender can only send to your own account email. To deliver to separate real sellers, verify a sending domain, set `ORDER_EMAIL_FROM` to an address on that domain, remove the test inbox override, and use real seller emails. See [Resend's test sender guide](https://resend.com/docs/knowledge-base/403-error-resend-dev-domain).

Do not put these values in the frontend or use `NEXT_PUBLIC_` variable names. The public payment config exposes only email configuration booleans, never the key or recipient address.

The worker runs while Render is awake. Its database queue survives restarts, so free-service sleeping can delay a notification. Successful provider acceptance is saved with a provider message ID. Provider acceptance does not guarantee inbox delivery; check spam and the Resend dashboard for delivery events.

Failed sends use bounded retries, and the request body is saved before the first send so retries stay identical. Resend's [idempotency window is 24 hours](https://resend.com/docs/dashboard/emails/idempotency-keys); uncertain requests stop automatic retries after 23 hours or eight attempts for manual review. There is no automatic bulk replay of old paid orders.

## Relevant files

- `src/features/checkout/profile-gate.tsx`: guided profile popup.
- `src/features/profiles/profile.tsx`: required delivery fields and checkout return.
- `src/features/checkout/checkout.tsx`: address review, profile recheck, payment start.
- `src/features/checkout/orders.tsx`: order history, receipts, and tracking.
- `src/app/checkout.css`: checkout and order styling, responsive tracking, sticky sidebar.
- Backend `src/payments/checkout.service.ts`: profile enforcement, snapshots, and payment confirmation.
- Backend `src/payments/seller-order-email.service.ts`: notification queue and sending.

All payments remain in Paystack test mode. Use [Paystack's official test card details](https://paystack.com/docs/payments/test-payments/) when checking the complete flow.
