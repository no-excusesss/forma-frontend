# Marketplace UX refresh

The homepage uses `/products/discovery` to show categories with active, available, in-stock products. The backend shuffles the category order. The subsequent [Forma Market homepage redesign](./MARKETPLACE-HOMEPAGE.md) replaces the editorial layout with product shelves, quick look, category moodboards, price ranges and shop spotlights. The manual edit control has been removed; the selection stays stable while browsing.

The opening collage shows real product photographs, titles, prices and categories. Collection moodboards use real inventory and available product counts. Empty categories and invented product counts are not displayed. Loading, empty, and failed requests have separate states.

The visual scale is smaller across the site: a 76px desktop header, tighter product and account cards, smaller buttons, and reduced section spacing. Form inputs keep a readable 16px size. Mobile primary buttons retain a 44px minimum touch target. Reduced-motion preferences are respected.

Storefronts have **Products** and **Reviews** tabs, review counts, and a clickable rating. Tabs support keyboard navigation. Reviews can be read without signing in. The sign-in link returns to the store's reviews tab; publishing refreshes the ratings and review list. Owners can read reviews but cannot review their own store.

Loading is shared across the app through route skeletons, branded local loading panels, product-card skeletons, image loading backgrounds, and a delayed top progress indicator. Background requests do not block the rest of the page.

## Receipt image repair

The original basketball photograph was found in the local upload backup. Its saved address pointed at `localhost:3000`; the product, account photo, and affected receipt references were repaired to use the hosted backend. Earlier receipts without image snapshots now use the available product image. New receipts continue to preserve their stored photo, with a current-image fallback if needed.

Uploads keep a durable database copy as well as a disposable local cache. `/uploads/:key` can serve the database copy after a free Render restart removes local files. Only validated, re-encoded WebP images are stored. An image referenced by a saved receipt is retained when a seller replaces a listing photo.

The additive migration is `20261118090000_durable_images`. The restored backups and repaired references are already in the existing project database. The backend deployment includes the durable image endpoint and the discovery API.

Relevant frontend files: `src/features/catalog/discovery.tsx`, `src/app/refinement.css`, `src/components/loading.tsx`, `src/app/loading.tsx`, `src/features/sellers/sellers.tsx`, and `src/features/reviews/reviews.tsx`.
