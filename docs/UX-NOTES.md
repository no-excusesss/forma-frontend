# Creation flows

The storefront, shopping, account, and seller pages share a warmer visual system with clearer actions, readable forms, consistent filters, and reduced-motion support. The [design guide](DESIGN-SYSTEM.md) documents the visual update and includes current desktop and phone previews.

When the category list is empty, **Create your first category** opens immediately inside product creation. A name is enough to start: the URL name is suggested automatically and can be edited. Successful creation selects the server-returned category and closes the popup. Product details stay in place.

Store owners can now create categories through the updated NestJS endpoint. Accounts without a store remain blocked, and seller verification remains administrator-only. Categories retain the existing marketplace-wide data model; no new taxonomy or fake IDs were introduced.

New products follow three steps: **Product details → Price & stock → Review & save**. Optional details remain collapsed until needed. Draft and published visibility are explicit, and successful creation returns to inventory. Existing products stay directly editable.

New stores use two steps, with a suggested store URL and optional private business details. Changed forms offer **Keep editing** or **Discard changes** before navigating away. Existing profile/store images use a compact change action.

These screenshots use an isolated fixture account to preview layout:

- [Desktop category popup](category-popup-desktop.png)
- [Mobile category popup](category-popup-mobile.png)
- [Mobile product details step](product-step-mobile.png)

Form dropdowns use a shared themed combobox with checked selections, keyboard navigation, and menus that fit the available viewport. Categories can be searched without changing the saved category until a result is chosen. Escape, Tab, and clicking outside dismiss the menu and preserve the existing selection. Optional fields offer **Not specified** to clear a value.

- [Desktop category dropdown](dropdown-desktop.png)
- [Mobile category dropdown](dropdown-mobile.png)
