# Forma experience

The marketplace should feel considered and approachable. Shopping pages use editorial photography and generous headings; account and seller pages prioritize clear labels, visible actions, and useful feedback.

## Foundation

The shared theme is in `src/app/experience.css`, imported after the existing structural styles in the root layout. It applies to every route. Charcoal (`#24332d`) is the primary action and text color, forest green (`#355442`) is the supporting accent, and warm ivory (`#fcfbf7`), sage, and clay create distinct surfaces. Photographs retain their natural color.

Desktop body text is 16px and phone body text is 15px. Form inputs stay at 16px, labels at 14px, and explanatory text at 13px. Small uppercase type is reserved for short overlines and metadata; instructions belong in readable sentence case. Headings, product names, and seller names wrap safely.

## Actions and feedback

- Use a filled, high-contrast button for the primary next step. Use outlined buttons for secondary navigation and destructive alternatives with clear wording.
- Contextual actions such as **Create category** should have a visible surface and sit beside the relevant field.
- Keep labels available to assistive technology when an icon replaces visible text. Account and search controls support keyboard use; search closes with Escape and returns focus.
- Preserve form values after errors. Required fields, invalid inputs, unsaved changes, and successful saves have explicit states.
- Use the shared combobox for category, condition, status, rating, sorting, and review filters. Searches never submit arbitrary category names.

## Shopping

The home page offers direct routes to all products, newest listings, and pre-loved products. Product cards expose the title, seller, rating, and current price. Product photos can be enlarged, navigated with arrow keys, and closed with Escape.

Product availability reflects stock, availability, and listing status together. Saving a product reveals a **View bag** action. The saved bag displays current listed values separately for each currency and links to the seller's store. It clearly explains that saving does not reserve stock and that checkout and payments are unavailable under the current API contract.

## Motion

Use short entrance transitions for the hero, forms, menus, dialogs, and feedback. Hover movement should reinforce an action: a card lifts slightly, an image gently scales, and a link arrow moves toward its destination. No animation is necessary to find or operate a control. The entire experience honors `prefers-reduced-motion`.

## Preview and verification

Previews use isolated API fixtures. They do not add sample products or fake fallback data to the application.

- [Desktop storefront](redesign-home-desktop.png)
- [Phone storefront](redesign-home-mobile.png)
- [Product page](redesign-shopping-desktop.png)
- [Phone product gallery](redesign-gallery-mobile.png)
- [Saved bag](redesign-bag-desktop.png)
- [Seller overview](redesign-seller-desktop.png)
- [Phone product creation](redesign-create-mobile.png)
- [Sign in](redesign-auth-desktop.png)

See [verification notes](../VALIDATION.md) for tested behavior and environmental limits. Phone testing uses Chrome emulation; it is not a real-device or screen-reader acceptance test.
