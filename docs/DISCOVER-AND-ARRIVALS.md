# Discover and New Arrivals

Discover (`/products`) and New Arrivals (`/new-arrivals`) now have distinct entrances with the same shopping tools. Header, mobile navigation, footer and homepage links point to the new arrivals route. Existing `/products?sort=newest` links remain valid marketplace searches.

Discover shows a live category collage and a sage introduction. New Arrivals uses a warm clay introduction, the latest listing photographs and listing dates on product cards. Both default to newest first. New Arrivals browses the catalogue in that order; it does not impose an undisclosed date cutoff.

Category cards use only populated categories and real product counts from `/products/discovery`. The product results use the paginated `/products` endpoint. The two feeds have separate responsibilities: category totals describe a whole category, while result totals reflect the current search and filters.

Search, category, condition, price, location, sort and page stay in the URL. Changing filters or sorting resets the page. Reset clears both applied filters and unsubmitted drafts, while preserving the chosen sort and collection route. Price filtering follows the API's existing base-price and listing-currency rules, which are explained beside the inputs.

The desktop filter sidebar stays visible while scrolling and can scroll internally on shorter screens. Mobile filters collapse after applying. Selected filters have removable chips and a clear-all action. During pagination or refinement, previous cards remain in place but are inert until the response arrives; pagination buttons also pause to prevent duplicate navigation. Failed requests can be retried, empty selections can be cleared, and an empty page can return to the first page.

`src/features/catalog/product-tile.tsx` now shares the homepage's product cards and quick-look dialog with these pages. Saving uses the same device-local bag. Preview details are fetched from the product endpoint. Owners get a view action, and unavailable items cannot be saved. Reduced motion, keyboard focus restoration and loading skeletons are supported.

Implementation: `src/features/catalog/browse.tsx`, `src/app/browse.css`, and the two route files. Browser coverage: `tests/browser/browse.spec.ts`, alongside the existing homepage and marketplace checks. Live-catalogue visual captures are stored under `.payment-work/browse/`.

Verification: TypeScript, ESLint and the production build pass, along with all 13 unit checks. The 14 new browsing checks pass on desktop and mobile; the 42 existing homepage and marketplace checks also pass. Live products, photographs, quick look, focus restoration and page width were checked at 390px, 1024px and 1440px. The two initial test failures were test-setup issues (checking a filter before it mounted and an unscoped alert locator); both were corrected and the browsing suite rerun successfully.
