# Demo seller collection

Three seller accounts were created through the hosted app's normal signup and store APIs. Each has five active NGN products, positive stock, an individual generated product photograph, a store logo, and a banner. Store and product descriptions disclose that these are fictional items for test checkout, with no physical fulfilment. The accounts have no invented reviews or verification badges.

| Store | Theme | Local storefront |
| --- | --- | --- |
| Sora Living | Home and living | http://localhost:3101/stores/sora-living-demo |
| Aster Lane | Style and accessories | http://localhost:3101/stores/aster-lane-demo |
| Fieldwork Supply | Desk and tech | http://localhost:3101/stores/fieldwork-supply-demo |

## Sign in as a seller

Open the root `.env.demo-sellers` file privately. Each store has its own `EMAIL` and `PASSWORD` pair. Use those values on the site's sign-in page, then open the seller dashboard to manage its store and listings. The file is covered by the project's `.env*` ignore rule; never commit it or put it in `public/`. The email addresses use a reserved example domain, so they do not have real inboxes for password resets.

## Products

| Sora Living | Aster Lane | Fieldwork Supply |
| --- | --- | --- |
| Noma Sculptural Ceramic Vase | Daybreak Canvas Sneakers | Studio Wireless Over-Ear Headphones |
| Cove Boucle Accent Chair | Milo Tan Crossbody Bag | Forest 65 Mechanical Keyboard |
| Solstice Amber Glass Pendant | Everyday Olive Cotton Overshirt | Arc Matte Black Desk Lamp |
| Palm Woven Storage Basket | Luna Sculpted Gold-Tone Hoops | Elevate Walnut Laptop Stand |
| Forma Oval Oak Coffee Table | Tempo Minimal Leather-Strap Watch | Pebble Sand Wireless Mouse |

## Images and persistence

The 15 product images were generated with the built-in `image_gen` tool. Their final prompts are saved in `docs/demo-marketplace-image-prompts.json`. Optimized WebP product images and the three store logos live in `public/images/demo-marketplace/` (about 2.8 MiB for all product images). Original generated PNG copies are in the ignored `.payment-work/demo-marketplace/originals/` directory.

Products and images were created through authenticated API endpoints. A narrow, ownership-checked database update then changed only these new demo image URL fields to `/images/demo-marketplace/...`. This lets the frontend serve durable image files while the backend stores accounts and listings. It avoids relying on the free Render service's temporary upload filesystem. Existing products and images were left untouched. These relative paths require deploying the frontend with the `public/images/demo-marketplace/` assets; opening an image path on the backend domain alone is not the intended use.

The preparation catalog, resumable progress state, and setup script are in `.payment-work/demo-marketplace/`. They are local maintenance files, ignored by Git. Passwords are stored only in `.env.demo-sellers`; session cookies stay in memory while the script runs.

## Testing checkout

Open a demo listing and save it to the bag. Checkout supports NGN products across demo stores in one payment, with a separate order for each store (requires the multi-store backend migration and deployment). Use the existing Paystack test checkout and test card flow. All prices and product specifications in this collection are illustrative.

Refresh the marketplace after starting `npm run dev` to see the new products. Because the accounts and listings are in the hosted database, they remain after restarting the frontend.

## Verification completed

The hosted API returned five active, in-stock NGN products for each store. All 15 product images and each store's logo and banner loaded from the frontend. Chrome checks covered all three desktop storefronts, the homepage, the mobile storefront, product image enlargement, and saving a product to the bag. Each of the three seller accounts signed in successfully and displayed its own five listings in the seller inventory. No payment was submitted during these checks.
