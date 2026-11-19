# Forma Market: a product-led homepage

The homepage is built around the live catalogue. The former “Another edit” control and the large static editorial panels have been removed.

## Research and direction

[Baymard's research on homepage catalogue breadth](https://baymard.com/research-articles/inferring-product-catalog-from-homepage) explains why showing a broad selection early helps people understand what a shop sells. That informed the three-category product collage, visible category navigation, prominent search and a mixed product grid near the top.

[Etsy](https://www.etsy.com/) offers useful examples of interest-led collections and independent-shop discovery. [Areaware](https://www.areaware.com/) shows how expressive imagery and editorial sections can sit alongside real, priced products. Forma applies these principles with its own visual direction: forest green, chartreuse accents, serif details, overlapping product moodboards and compact shopping cards.

The page has no autoplaying carousel, fake bestseller labels, invented ratings or artificial urgency. Customers control category filters, price ranges, previews and scrolling.

## Shopping experience

- **Opening collage:** photographs, titles and prices from up to three populated categories, each linking to its product. One- and two-category layouts are supported.
- **Fresh off the shelf:** the latest eight listings, plus category buttons that show products from the discovery feed. Each card has quick look and save-to-bag actions.
- **Find your corner:** category moodboards built from listing photographs, with real category counts and working browse links.
- **Small finds:** a horizontal shelf with ₦15k, ₦30k and ₦50k limits. It uses the effective discounted price and NGN products only. The shelf is drawn from the discovery sample, not an exhaustive price search.
- **Small shops:** real independent stores represented by their products and names.
- **Quick look:** fetches current product details before showing stock and allowing a save. Unavailable products cannot be saved from the preview. Escape closes the dialog and returns focus to its trigger.

The discovery request is cached for five minutes and stays stable while browsing. Its backend randomizes populated categories. New arrivals refresh through the existing query cache. Nothing requires a manual “new edit” button.

Photos load lazily below the opening image. Skeletons, failed-request retries and honest empty states are included. Mobile layouts use two-column product grids and swipeable price shelves; keyboard focus and reduced-motion preferences are supported. Saving uses the project's existing device-local bag.

## Code

`src/features/catalog/marketplace-home.tsx` contains the page sections and interactions. `src/app/marketplace-home.css` scopes their styling. Product cards and quick look are shared through `src/features/catalog/product-tile.tsx`. `src/features/catalog/discovery.tsx` keeps the shared discovery contract and query used by the rest of the site. New arrivals links lead to the dedicated `/new-arrivals` collection.

Browser coverage lives in `tests/browser/market-home.spec.ts`. It exercises category filters, discounted price limits, currency exclusion, scrolling, quick look, bag persistence, focus restoration, search, collection links, owner actions and narrow layouts.

## Verification

The production build, TypeScript and ESLint checks pass. All 13 unit tests and 48 relevant desktop/mobile browser checks pass. The hosted catalogue was also checked in an isolated local production preview at 390px, 1024px and 1440px: photos loaded, quick look opened and returned focus on close, and no horizontal page overflow or runtime errors were observed. Visual captures are saved under `.payment-work/market-home/`.
