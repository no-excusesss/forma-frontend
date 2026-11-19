# Forma marketplace

A warm, editorial Next.js marketplace for the supplied NestJS contract. Ivory surfaces, charcoal text, forest-green accents, natural photography, readable forms, and purposeful motion connect the shopping, account, and seller experiences. See the [design guide](docs/DESIGN-SYSTEM.md) for the visual system and interaction standards.

## Run locally

Requires Node.js 22.x, matching the project's deployment settings.

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Open **http://localhost:3101**. The NestJS API runs at **http://localhost:3000**.

The default frontend port is 3101, matching the current backend trusted-origin setting. Browser tests use a separate server on 3102, so development and testing can run together.

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:3000
```

This is the default local configuration. It is a public origin, not a secret. Next.js reads public variables at build time; rebuild when changing the production API origin. For a hosted backend, use `NEXT_PUBLIC_API_URL=/backend` and set the server-only `API_UPSTREAM_URL` to the backend HTTPS origin. The optional rewrite in `next.config.ts` forwards requests while the NestJS backend continues to enforce sessions and Origin protection. Payment secret keys belong only in NestJS.

Paystack **test-only** checkout, database orders, stock reservations, customer order history, and seller test orders are implemented across the frontend and NestJS backend. Read the [hosting and payment walkthrough](docs/PAYSTACK-TESTING.md) for Render settings, private environment variables, webhook configuration, test cards, code explanations, and limitations. The hosted Paystack test transaction still requires your own test account and configuration.

For a production build:

```powershell
npm run build
npm start
```

To deploy this frontend to Vercel with the existing Render backend, follow [the Vercel deployment guide](docs/VERCEL-DEPLOYMENT.md). The complete frontend configuration is in `.env.vercel.example`. Payment checkout now shows copyable public demo-card details and opens Paystack in another tab, keeping the guide available while the shopper completes the form.

## Backend configuration required

The API project is at `C:\Users\HP\Desktop\nestjsBackend\backend-nestjs`. Its category endpoint has been updated to allow authenticated store owners as well as administrators. Session and Origin protection remain enabled. Restart NestJS after updating its code:

```dotenv
PORT=3000
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_TRUSTED_ORIGINS=http://localhost:3000,http://localhost:3101
BETTER_AUTH_DASH_ENABLED=false
UPLOAD_PUBLIC_BASE_URL=http://localhost:3000/uploads
```

The NestJS CORS configuration must return the matching origin with credentials, for example:

```ts
app.enableCors({
  origin: ["http://localhost:3101"],
  credentials: true,
});
```

Use the same hostname (`localhost`) for both apps in development. Production should prefer origins on the same site, such as `shop.example.com` and `api.example.com`, with explicitly configured trusted origins and cookies. Cross-site deployments require a deliberate cookie or proxy design; keep CSRF protection enabled.

The initial setup check found empty categories and a missing allow-origin response for port 3001. The current development workflow uses port 3101; the backend trusted origins include it. See `VALIDATION.md` for backend tests with real sessions and temporary data.

Store owners can create categories without administrator access. When there are no categories, product creation automatically opens **Create your first category**. Enter a name, choose **Create category & continue**, and the returned category ID is selected immediately. The product form remains on the same page.

A **+ Create category** action remains beside the category selector for adding another category later. Categories can also be managed at `/seller/categories`; the old `/admin/categories` URL remains compatible. Duplicate or failed requests preserve typed details and never show fake success.

## Implemented pages

| Route                        | Function                                                                       |
| ---------------------------- | ------------------------------------------------------------------------------ |
| `/`                          | Editorial home, real newest products, real categories                          |
| `/products`                  | Search, categories, price, condition, location, sorting, pagination            |
| `/products/[slug]`           | Slug-based detail, gallery, stock, product reviews, related products           |
| `/stores/[slug]`             | Store branding, verification, products, independent store reviews              |
| `/people/[username]`         | Public-only profile details                                                    |
| `/sign-up`, `/sign-in`       | Better Auth email/password forms and cookie-session bootstrap                  |
| `/account/profile`           | Profile creation/editing, picture upload/removal, backend completeness, logout |
| `/account/reviews`           | Paginated authoritative own product/store reviews, editing/deletion            |
| `/sell`                      | Seller onboarding without requiring a personal profile                         |
| `/seller`                    | Inventory and store-review statistics, without sales/revenue claims            |
| `/seller/store`              | Store settings, private business details, logo/banner management               |
| `/seller/products`           | Owner inventory with status filters                                            |
| `/seller/products/new`       | JSON creation with separately uploaded images and retry-safe partial success   |
| `/seller/products/[id]/edit` | Private numeric-ID editing, images, stock, availability, archive/restore       |
| `/cart`                      | Browser-only saved selections, revalidated against live product endpoints; links to test checkout |
| `/checkout`                  | Signed server price quote, collection contact, one NGN test payment covering multiple stores with separate seller orders |
| `/checkout/return`           | Authenticated server verification of a Paystack test payment |
| `/account/orders`, `/account/orders/[id]` | Customer test-order history and payment progress |
| `/seller/orders`             | Store's confirmed test orders and orders needing stock review |
| `/seller/categories`         | Category list and creation for authenticated store owners                      |
| `/admin/categories`          | Compatible category management route, with backend permission handling         |

Seller verification remains a backend operator action. There is no seller directory or guessed admin role.

## Behavior and design decisions

- Every API request includes cookies; raw auth tokens are never logged or persisted. Missing profiles are handled independently from authentication errors.
- Successful profile creation and edits update the shared profile cache and redirect home. The header shows the saved profile name and an account dropdown with profile/review links and sign-out. Session loading and connection errors have distinct states.
- Uploaded profile pictures appear in the account control and update immediately after upload or removal. Missing/unavailable images fall back to initials.
- Store owners see **My Store** across desktop/mobile navigation and the footer, with direct inventory and storefront shortcuts. Revisiting `/sell` takes an existing seller to their studio; home-page calls to action also adapt to store ownership.
- Inventory status counts link to filtered listings. Nested product pages keep Inventory highlighted. Empty inventory points to adding the first product; the bag shows a selection count, and catalogue filters can be removed individually.
- First-time product creation has three steps: **Product details**, **Price & stock**, and **Review & save**. Details remain mounted across steps; optional fields stay collapsed until needed. Drafts and publishing have different actions. After a successful creation, the user returns to inventory. Existing products stay directly editable without repeating onboarding.
- Store onboarding has two steps, suggests the URL from the store name, and preserves a manually edited URL. Optional private business details stay tucked away. Existing images offer a compact Change image action.
- Changed forms warn before internal navigation or closing/reloading the tab. Keep editing preserves the values; Discard changes is an explicit choice. Image-only updates preserve typed metadata. Owners can edit directly from a public product page; returning members with profiles sign in to the marketplace rather than repeating onboarding.
- TanStack Query keys include collection filters and pagination, and private keys include the account ID. Mutations invalidate affected data conservatively through query invalidation. Logout cancels requests and clears the cache.
- Zod provides consistent validation with inline field messages, preserved inputs, and focus on the first invalid field. Success notices depend on actual successful responses.
- PATCH requests contain changed DTO fields only. Blank nullable fields are sent as JSON `null`; response-only fields are excluded.
- A new listing is saved with JSON before images are appended via multipart. If upload fails, the listing ID is retained in the current form, and retry updates that same listing rather than creating a duplicate.
- Restocking a sold-out listing makes it active. Explicit sold-out creation requires zero stock. Archived listings require positive stock before restoration; the restore action sends `{ status: 'ACTIVE', available: true }`.
- Native modal dialogs provide keyboard focus handling and confirmation before destructive actions. Focus outlines, a skip link, semantic controls, image alternative text, reduced-motion support, loading skeletons, and meaningful error/empty states are included.
- Reviews stay separate for products and stores. Editing/deletion is available only from authoritative own-review lists; display names are never used to guess ownership. Duplicate and self-review restrictions remain enforced by the backend.
- Uploads use the exact `image` and repeated `images` fields, with no multipart Content-Type override. The client checks format, size, and combined product image count. Object URL previews are revoked on unmount. The server remains authoritative for animation/content checks and storage failures.
- The bag persists only numeric product selections on the current device. Each saved product represents one unit. Saving does not reserve stock. The test checkout asks NestJS for authoritative prices, creates an order and a 30-minute stock reservation, and opens Paystack hosted checkout. Paid order screens remove only the purchased products from the bag after server confirmation. Live keys and transactions are rejected.
- Descriptions and review text are rendered as plain React text.
- Homepage collections and featured products come from the API. Product photographs use the URLs saved with each listing; the generated demo photographs are included in `public/images/demo-marketplace/`.

## Source map

| Location                            | Responsibility                                                                  |
| ----------------------------------- | ------------------------------------------------------------------------------- |
| `src/app/`                          | App Router pages, metadata, global layout/styles, loading/error/not-found views |
| `src/components/`                   | Shared accessible UI, forms, uploads, account navigation                        |
| `src/features/`                     | Authentication, catalogue, profiles, stores, listings, reviews                  |
| `src/providers/app-provider.tsx`    | Query client, session bootstrap, private data, feedback, cache clearing         |
| `src/lib/api.ts`                    | Typed fetch, errors, cancellation, URL encoding, PATCH utilities                |
| `src/lib/contracts.ts`              | Supplied API data/request types                                                 |
| `src/lib/validation.ts`             | Shared form and upload validation                                               |
| `src/lib/bag.ts`                    | Device-only selections, without auth state                                      |
| `tests/contracts.test.ts`           | API serialization, session/error/cancellation, DTO validation tests             |
| `tests/browser/marketplace.spec.ts` | Isolated browser integration tests with contract fixtures                       |

## Validation commands

```powershell
npm run typecheck
npm run lint
npm test
# Compile with the API origin intercepted by the browser fixtures.
$env:NEXT_PUBLIC_API_URL = 'http://localhost:3000'
npm run build
npm run test:e2e
# Restore the API configuration from .env.local for normal use.
Remove-Item Env:NEXT_PUBLIC_API_URL
npm run build
```

Browser tests use an installed Google Chrome (`channel: 'chrome'`) and an isolated production server on port 3102. Next.js embeds `NEXT_PUBLIC_API_URL` when building, so build with the fixture origin shown above before running the suite. Playwright starts and stops its own server and refuses to reuse an occupied port. All browser API mutations use network interception; the featured-image check loads a real bundled product photograph. No live backend is required for this suite. Real-backend smoke checks are documented separately in [verification notes](VALIDATION.md).

To override the test port when necessary:

```powershell
$env:PLAYWRIGHT_PORT = '3103'
npm run test:e2e
```

For another environment, install Chrome or change the Playwright browser channel. Test traces and screenshots are written under ignored `test-results/` when requested or on failure.

The tests distinguish frontend contract behavior from actual backend integration. The backend integration suite passed real-session category, inventory, profile, upload, and review checks using isolated temporary records with teardown cleanup. Final acceptance with your own store data remains separate from these tests. See `VALIDATION.md` for the checks executed in this workspace.

## Remaining backend gaps

Test-only Paystack checkout, multi-store orders, shipping-profile checks and seller order email notifications are implemented in the backend. Remaining gaps include live payments, delivery/tax calculation, coupons, in-app refunds and refund-event tracking, seller payouts, cross-device carts/wishlists, seller directory, sales/revenue statistics, chat, verified-purchase reviews, review attachments, configured social login, and password recovery. Late payments without allocatable stock are recorded as PAID_REVIEW for manual review. See [the order update notes](docs/CHECKOUT-AND-ORDER-UPDATES.md) for demo fulfilment, email and upload-storage behavior.

## Learning notes

The marketplace contract determines the available user journeys: good UX requires honest stock, errors, and partial-success feedback as much as visual polish. A single API layer and shared schema-driven forms keep request details consistent. Independent profile/store queries prevent onboarding from accidentally signing out a valid seller. Separating product JSON from multipart uploads allows nullable fields to be cleared correctly and upload failures to be retried honestly.

Framework references: [Next.js installation](https://nextjs.org/docs/app/getting-started/installation) and [TanStack Query invalidation](https://tanstack.com/query/latest/docs/framework/react/guides/query-invalidation).
