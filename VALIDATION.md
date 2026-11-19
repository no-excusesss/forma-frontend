# Verification

## GitHub frontend publication — 19 November 2026

- The production build, strict TypeScript check, ESLint and all 13 unit tests passed. An offline clean-install dry run accepted the package and lockfile.
- All 152 current desktop Chrome/mobile-emulation browser cases passed across the full regression run and focused reruns. The full run passed 147 cases and exposed three failures in older checks: the desktop filter assertion inspected the URL before navigation settled, and both viewport variants expected a homepage seller link replaced by the newer design. The corrected checks passed on both viewports. An obsolete static-editorial homepage check was also updated to verify the current featured product photograph and passed on both viewports. Application behavior was unchanged during these test corrections.
- Browser fixtures intercepted API mutations. They used a build with `NEXT_PUBLIC_API_URL=http://localhost:3000`; the final build was then recreated using the normal `.env.local` Render proxy settings.
- The final production server was checked against the live Render backend at desktop (1440px) and mobile (390px) widths. Home, Discover, New Arrivals, Sora Living's store, an available product and the saved bag loaded successfully. Featured and product-detail photos loaded, no horizontal overflow or browser page errors were found, and `/backend/health` passed. Payment configuration reported test-only mode with multi-store checkout enabled. No payment was started.
- Private environment files, seller credentials, maintenance files, dependencies, build output and test artifacts were excluded from Git. The staged source passed a check for private environment values before publication.

## Whole-site design and UX update — 16 November 2026

| Check                                 | Result                                                                     |
| ------------------------------------- | -------------------------------------------------------------------------- |
| Production build                      | Passed, including strict TypeScript compilation                            |
| ESLint and formatting                 | Passed                                                                     |
| API and validation unit tests         | All 11 passed                                                              |
| Desktop and mobile browser regression | All 80 fixture-backed cases passed                                         |
| Real backend smoke on port 3101       | Home, editorial image loading, shop navigation, and product loading passed |

Browser command: `node node_modules/@playwright/test/cli.js test --grep-invert "live homepage"`. The two existing live-homepage tests on port 3102 were excluded because of the previously verified backend CORS restriction. They are not counted in the 80 passing cases. Backend permissions and CORS settings were not changed.

New interaction checks cover discovery-to-filter navigation, search Escape/focus behavior, password visibility without submission, enlarged product images and keyboard controls, save-to-bag feedback and listed values, unavailable products, and responsive layouts across 13 shopping/account/seller routes. Existing authentication, category creation, form validation, image uploads, retries, and seller flows remain covered.

Desktop and phone layouts were visually inspected for home, catalog, product, bag, store, account/profile, sign-in, seller overview, and product creation. Additional header checks at 320px, 390px, and 768px found no horizontal page overflow. Mobile prices were checked for clipping. The production browser suite verifies 16px form inputs and reduced-motion behavior.

The [design guide and previews](docs/DESIGN-SYSTEM.md) document the palette, action hierarchy, typography, and motion rules. Visual previews use isolated API fixtures. Mobile testing uses Chrome emulation; real-device, WebKit, and screen-reader acceptance tests were not performed.

## Dropdown update — 16 November 2026

- Production build, TypeScript, ESLint, and formatting checks passed.
- All 11 API/validation unit tests passed.
- All 8 focused dropdown browser cases passed in desktop Chrome and iPhone Chrome emulation. Coverage includes search, committed category IDs, Escape/outside/Tab dismissal, selected states, keyboard navigation, long-list scrolling, viewport bounds, required-field focus, and optional null clearing.
- The other 60 fixture-backed browser cases passed in the broad regression run, including product creation, category creation, profile saves, image retries, and disabled category fields.
- The 2 existing live-homepage smoke cases time out on the test origin, `http://localhost:3102`. A direct API probe returned 200 without an `Access-Control-Allow-Origin` header for that origin. A separate real Chrome check on the app's trusted origin, `http://localhost:3101`, loaded the homepage and settled the catalog successfully. Backend CORS configuration was not changed for this UI task.
- Desktop and phone layouts were inspected visually; previews are linked in [UX notes](docs/UX-NOTES.md). Mobile checks use emulation rather than phone hardware; screen-reader acceptance was not performed.

## Previous verification — 5 November 2026

## Frontend

| Check               | Result                                                          |
| ------------------- | --------------------------------------------------------------- |
| `npm run build`     | Passed; App Router pages compile, including category management |
| `npm run typecheck` | Passed with strict application and test types                   |
| `npm run lint`      | Passed without warnings or errors                               |
| `npm run test`      | 11 API/validation tests passed                                  |
| `npm run test:e2e`  | 62 desktop Chrome/mobile-emulation cases passed                 |

The app now defaults to port 3101, matching the backend trusted origin. Browser tests default to a separate production server on port 3102 and refuse to reuse an occupied port. `PLAYWRIGHT_PORT` remains available to override the test port.

## Backend

After the final form polish, 6 additional authentication/navigation browser checks passed. The updated NestJS development server was started on port 3000; its health and public categories endpoints returned 200 and CORS allowed `http://localhost:3101`.

Project: `C:\Users\HP\Desktop\nestjsBackend\backend-nestjs`.

| Check              | Result                                                                     |
| ------------------ | -------------------------------------------------------------------------- |
| `npm run build`    | Passed; existing Prisma client regenerated, without a schema migration     |
| `npm run lint`     | Passed                                                                     |
| `npm run test`     | 28 unit tests passed, including 11 category service/HTTP permission tests  |
| `npm run test:e2e` | 31 integration tests passed using real PostgreSQL and Better Auth sessions |

The integration suite created uniquely named temporary accounts, categories, products, reviews, and images and removed its own records during teardown. The category created by a store owner was included in cleanup. No existing account was promoted or modified.

## Category permission change

- `POST /product-categories` still requires `SessionAuthGuard`, a valid cookie session, and a trusted Origin.
- The controller passes the authenticated account ID to the service.
- The service accepts a database-backed store owner or an administrator, and rejects accounts without either authorization.
- Requests cannot submit a different account/seller identity; unknown DTO fields remain rejected.
- Public category reads, existing uniqueness rules, response shape, and seller-verification permissions are unchanged.
- Seller verification remains administrator-only.

Changed backend source: `src/products/categories.controller.ts`, `src/products/products.service.ts`. Permission regressions are in `categories.service.spec.ts`, `categories.controller.spec.ts`, and the updated marketplace integration suite. The backend API contract and build brief were also updated.

## Interaction coverage

- Empty categories automatically open the first-category popup with keyboard focus on the name field.
- Category URLs are suggested from names, the returned numeric ID is selected automatically, and the product page does not change.
- Duplicate, unavailable, unauthorized, and retry responses preserve entered values and never show false success.
- Product details survive category creation, moving forward/back between steps, image-upload failure, and cancelled navigation.
- Product creation validates the current step; invalid optional fields are opened/focused when needed.
- Publishing with zero stock is caught before a mutation. Save draft and Publish are distinct actions, and successful creation returns to inventory.
- Unsaved form changes prompt before internal-link navigation and browser unload; Keep editing retains the draft.
- Seller setup suggests a store URL, preserves manual URL edits, and validates location before creation.
- Existing profile/store creation, picture uploads/removal, account menus, review ownership, filtering, pagination, archiving, restoration, and saved selections remain covered.

## Verification boundaries

Browser mutation tests use isolated API fixtures. Backend integration tests separately use the real database and real authentication cookies. These do not constitute acceptance in the user's own browser/account, a deployed production environment, Safari/WebKit, or real phone hardware. Mobile checks use Chrome at an iPhone viewport.

The existing Nest Observe telemetry worker and PostgreSQL dependency emitted warnings during integration testing; both test files still completed successfully. No telemetry configuration was changed.

Visual previews of the popup and creation flow use fixture accounts, not production sample-data fallbacks.
