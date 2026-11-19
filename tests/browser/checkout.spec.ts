import { expect, test, type Page } from "@playwright/test";
import { mockApi, ownProfile, product, seller, testOrigin } from "./fixtures";
import type { Order } from "../../src/lib/checkout";

const reference = "forma-11111111-1111-4111-8111-111111111111";
const completeProfile = {
  ...ownProfile,
  firstName: "Test",
  lastName: "Member",
  phoneNumber: "+234 801 234 5678",
  address: "12 Demo Street",
  city: "Ikeja",
  state: "Lagos",
  country: "Nigeria",
};
const items = [
  {
    productId: 11,
    title: product.title,
    slug: product.slug,
    quantity: 1,
    unitPriceMinor: 1100000,
    imageUrl: "/images/demo-marketplace/boucle-chair.webp",
  },
];
const quote = {
  items,
  seller,
  currency: "NGN",
  totalMinor: 1100000,
  quoteToken: "signed-test-fixture",
  expiresAt: Date.now() + 600000,
  mode: "test",
  fulfilment: "DELIVERY",
  shippingMinor: 0,
};
const order: Order = {
  id: "11111111-1111-4111-8111-111111111111",
  checkoutKey: "22222222-2222-4222-8222-222222222222",
  status: "PENDING_PAYMENT",
  currency: "NGN",
  totalMinor: 1100000,
  customerName: "Test Member",
  phoneNumber: "+234 801 234 5678",
  shippingAddress: {
    address: "12 Demo Street",
    city: "Ikeja",
    state: "Lagos",
    country: "Nigeria",
  },
  seller,
  items,
  createdAt: "2026-11-17T12:00:00.000Z",
  expiresAt: "2099-11-17T12:30:00.000Z",
  paidAt: null,
  mode: "test",
  fulfilment: "DELIVERY",
  shippingMinor: 0,
  payment: {
    reference,
    status: "PENDING",
    checkoutUrl: "https://checkout.paystack.com/test-checkout",
  },
};

async function fixture(page: Page, signedIn = true) {
  await mockApi(page, { signedIn });
  await page.addInitScript(() =>
    localStorage.setItem("forma-device-bag-v1", "[11]"),
  );
  const headers = {
    "access-control-allow-origin": testOrigin,
    "access-control-allow-credentials": "true",
    "access-control-allow-headers": "content-type",
    "access-control-allow-methods": "GET,POST,OPTIONS",
  };
  await page.route("http://localhost:3000/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (!/^\/(payments|checkout|orders)(\/|$)/.test(path))
      return route.fallback();
    if (route.request().method() === "OPTIONS")
      return route.fulfill({ status: 204, headers });
    const json =
      path === "/payments/config"
        ? {
            enabled: true,
            mode: "test",
            currency: "NGN",
            fulfilment: "DELIVERY",
            shippingMinor: 0,
          }
        : path === "/checkout/quote"
          ? quote
          : path === "/orders"
            ? [order]
            : order;
    return route.fulfill({
      json,
      headers,
      status: path === "/checkout" ? 201 : 200,
    });
  });
  await page.route("http://localhost:3000/users/me/profile", (route) =>
    route.fulfill({ json: completeProfile, headers }),
  );
  return headers;
}

const secondStore = {
  ...seller,
  id: 8,
  displayName: "Second Studio",
  slug: "second-studio",
};
const secondItem = {
  ...items[0],
  productId: 12,
  title: "A considered lamp",
  slug: "considered-lamp",
  unitPriceMinor: 2500000,
  imageUrl: "/images/demo-marketplace/arc-desk-lamp.webp",
};
const storeOrders: Order[] = [
  {
    ...order,
    id: "33333333-3333-4333-8333-333333333333",
    checkoutId: order.id,
    checkoutTotalMinor: 3600000,
    orders: [],
  },
  {
    ...order,
    id: "44444444-4444-4444-8444-444444444444",
    seller: secondStore,
    items: [secondItem],
    totalMinor: 2500000,
    checkoutId: order.id,
    checkoutTotalMinor: 3600000,
    orders: [],
  },
];
const combined: Order = {
  ...order,
  seller: null,
  items: [...items, secondItem],
  totalMinor: 3600000,
  orders: storeOrders,
};
async function mixedFixture(page: Page) {
  const headers = await fixture(page);
  await page.addInitScript(() =>
    localStorage.setItem("forma-device-bag-v1", "[11,12]"),
  );
  await page.route("http://localhost:3000/checkout/quote", (route) =>
    route.fulfill({
      headers,
      json: {
        ...quote,
        seller: null,
        items: combined.items,
        totalMinor: 3600000,
        stores: [
          { seller, items, totalMinor: 1100000 },
          { seller: secondStore, items: [secondItem], totalMinor: 2500000 },
        ],
      },
    }),
  );
  await page.route("http://localhost:3000/checkout", (route) =>
    route.fulfill({ headers, status: 201, json: combined }),
  );
  await page.route(`http://localhost:3000/orders/${combined.id}`, (route) =>
    route.fulfill({ headers, json: combined }),
  );
  for (const part of storeOrders) {
    await page.route(`http://localhost:3000/orders/${part.id}`, (route) =>
      route.fulfill({ headers, json: part }),
    );
    await page.route(
      `http://localhost:3000/orders/${part.id}/resume`,
      (route) => route.fulfill({ headers, json: combined }),
    );
  }
  return headers;
}

test("mixed-store checkout reviews each subtotal and starts only one combined payment", async ({
  page,
}, info) => {
  await mixedFixture(page);
  let starts = 0;
  page.on("request", (req) => {
    if (new URL(req.url()).pathname === "/checkout" && req.method() === "POST")
      starts++;
  });
  await page.goto("/checkout");
  await expect(page.locator(".checkout-store-group")).toHaveCount(2);
  await expect(page.locator(".checkout-store-groups")).toContainText(
    "Second Studio",
  );
  await expect(
    page.getByText(
      "One payment for your whole bag. Each store receives its own order.",
    ),
  ).toBeVisible();
  await page.screenshot({
    path: info.outputPath("multi-store-review.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: /Pay .* in test mode/ }).click();
  await expect(page.locator(".demo-order-summary")).toContainText(
    "2 independent stores",
  );
  await expect(page.locator(".demo-order-summary")).toContainText(
    "NGN 36,000.00",
  );
  expect(starts).toBe(1);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("one confirmed payment shows separate store receipts and delivery progress", async ({
  page,
}, info) => {
  const headers = await mixedFixture(page);
  const paid = {
    ...combined,
    status: "PAID",
    paidAt: "2026-11-19T11:00:00Z",
    payment: { ...combined.payment, status: "SUCCESS", checkoutUrl: null },
    orders: storeOrders.map((part) => ({
      ...part,
      status: "PAID",
      paidAt: "2026-11-19T11:00:00Z",
      fulfilmentStatus: "PENDING_SHIPPING",
    })),
  };
  await page.route(
    `http://localhost:3000/payments/${reference}/verify`,
    (route) => route.fulfill({ headers, json: paid }),
  );
  await page.route(
    `http://localhost:3000/orders/${storeOrders[0].id}`,
    (route) => route.fulfill({ headers, json: paid.orders[0] }),
  );
  await page.goto(`/checkout/return?reference=${reference}`);
  await expect(
    page.getByRole("heading", { name: "Payment confirmed", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".combined-store-order")).toHaveCount(2);
  await expect(
    page.locator('.combined-store-order [aria-current="step"]'),
  ).toHaveCount(2);
  await expect(page.locator(".combined-store-order").first()).toContainText(
    seller.displayName,
  );
  await expect(page.locator(".combined-store-order").last()).toContainText(
    secondStore.displayName,
  );
  await page.screenshot({
    path: info.outputPath("multi-store-receipt.png"),
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .locator(".combined-store-order")
    .first()
    .getByRole("link", { name: "Full order details", exact: true })
    .click();
  await expect(page).toHaveURL(
    new RegExp(`/account/orders/${storeOrders[0].id}$`),
  );
  await expect(
    page.getByText("This store order is part of one", { exact: false }),
  ).toContainText("NGN 36,000.00");
  await expect(
    page.getByRole("link", { name: "View the complete checkout" }),
  ).toHaveAttribute("href", `/account/orders/${combined.id}`);
});

test("resuming a store order still prepares its whole combined checkout", async ({
  page,
}) => {
  await mixedFixture(page);
  await page.goto(`/account/orders/${storeOrders[1].id}`);
  await page
    .getByRole("button", { name: "Continue test payment", exact: true })
    .click();
  await expect(page.locator(".demo-payment-guide")).toBeVisible();
  await expect(page.locator(".demo-order-summary")).toContainText(
    "2 independent stores",
  );
  await expect(page.locator(".demo-order-summary")).toContainText(
    "NGN 36,000.00",
  );
});

test("checkout saves an idempotent server order and keeps demo card guidance beside a new Paystack tab", async ({
  page,
}, info) => {
  await fixture(page);
  await page
    .context()
    .route("https://checkout.paystack.com/test-checkout", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: "<h1>Simulated provider checkout</h1>",
      }),
    );
  await page.goto("/checkout");
  await expect(
    page.getByRole("heading", { name: "Your delivery details." }),
  ).toBeVisible();
  await page.getByLabel("Phone number").fill("+234 801 234 5678");
  await page.screenshot({
    path: info.outputPath("checkout.png"),
    fullPage: true,
  });
  const request = page.waitForRequest(
    (req) =>
      new URL(req.url()).pathname === "/checkout" && req.method() === "POST",
  );
  await page.getByRole("button", { name: /Pay .* in test mode/ }).click();
  const body = (await request).postDataJSON();
  expect(body.quoteToken).toBe(quote.quoteToken);
  expect(body.idempotencyKey).toMatch(/^[a-f0-9-]{36}$/);
  expect(body).not.toHaveProperty("totalMinor");
  const guide = page.locator(".demo-payment-guide");
  await expect(
    guide.getByRole("heading", { name: /Try the checkout/ }),
  ).toBeVisible();
  await expect(guide).toContainText("4084 0840 8408 4081");
  await expect(guide).toContainText("No PIN or OTP is needed.");
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({
    path: info.outputPath("demo-payment-guide.png"),
    fullPage: true,
  });
  const popupPromise = page.waitForEvent("popup");
  await guide
    .getByRole("link", { name: "Open Paystack checkout", exact: false })
    .click();
  const popup = await popupPromise;
  await expect(popup).toHaveURL("https://checkout.paystack.com/test-checkout");
  await expect(
    popup.getByRole("heading", { name: "Simulated provider checkout" }),
  ).toBeVisible();
  expect(await popup.evaluate(() => window.opener)).toBeNull();
  await expect(page).toHaveURL(/\/checkout$/);
  await expect(guide).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Payment confirmed", exact: true }),
  ).toHaveCount(0);
});

test("demo card fields copy their exact values and show accessible confirmation", async ({
  page,
}) => {
  await fixture(page);
  await page.addInitScript(() => {
    const copied: string[] = [];
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (value: string) => {
          copied.push(value);
        },
      },
    });
    Object.assign(window, { demoCopied: copied });
  });
  await page.goto("/checkout");
  await page.getByRole("button", { name: /Pay .* in test mode/ }).click();
  const card = page.getByRole("region", { name: "Paystack demo card details" });
  for (const [label, message] of [
    ["card number", "Card number copied."],
    ["expiry", "Expiry copied."],
    ["cvv", "CVV copied."],
  ]) {
    await card
      .getByRole("button", { name: `Copy ${label}`, exact: true })
      .click();
    await expect(card.getByRole("status")).toHaveText(message);
  }
  expect(
    await page.evaluate(
      () => (window as Window & { demoCopied?: string[] }).demoCopied,
    ),
  ).toEqual(["4084084084084081", "12/35", "408"]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("denied clipboard access keeps the demo card selectable and gives manual-copy guidance", async ({
  page,
}) => {
  await fixture(page);
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async () => {
          throw new DOMException("Denied", "NotAllowedError");
        },
      },
    }),
  );
  await page.goto("/checkout");
  await page.getByRole("button", { name: /Pay .* in test mode/ }).click();
  const card = page.getByRole("region", { name: "Paystack demo card details" });
  await card
    .getByRole("button", { name: "Copy card number", exact: true })
    .click();
  await expect(card.getByRole("status")).toContainText(
    "Select and copy the card number shown above.",
  );
  expect(await page.evaluate(() => window.getSelection()?.toString())).toBe(
    "4084 0840 8408 4081",
  );
  await expect(
    page.getByRole("link", { name: "Open Paystack checkout", exact: false }),
  ).toBeVisible();
});

test("checking from the demo guide asks the backend to verify before showing success", async ({
  page,
}) => {
  await fixture(page);
  await page.goto("/checkout");
  await page.getByRole("button", { name: /Pay .* in test mode/ }).click();
  const request = page.waitForRequest(
    (req) =>
      new URL(req.url()).pathname === `/payments/${reference}/verify` &&
      req.method() === "POST",
  );
  await page
    .locator(".demo-payment-guide")
    .getByRole("link", { name: "Check payment status", exact: true })
    .click();
  await request;
  await expect(page).toHaveURL(
    new RegExp(`/checkout/return\\?reference=${reference}`),
  );
  await expect(
    page.getByRole("heading", { name: "Awaiting payment", exact: true }),
  ).toBeVisible();
});

test("resuming an unpaid order opens the same demo guide after a backend profile check", async ({
  page,
}) => {
  await fixture(page);
  await page.goto(`/account/orders/${order.id}`);
  const resume = page.waitForRequest(
    (req) =>
      new URL(req.url()).pathname === `/orders/${order.id}/resume` &&
      req.method() === "POST",
  );
  await page
    .getByRole("button", { name: "Continue test payment", exact: true })
    .click();
  await resume;
  await expect(page.locator(".demo-payment-guide")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Open Paystack checkout", exact: false }),
  ).toHaveAttribute("href", "https://checkout.paystack.com/test-checkout");
});

test("a backend-confirmed paid order leaves the guide and shows its receipt", async ({
  page,
}) => {
  const headers = await fixture(page);
  let paid = false;
  await page.route(`http://localhost:3000/orders/${order.id}`, (route) =>
    route.fulfill({
      headers,
      json: paid
        ? {
            ...order,
            status: "PAID",
            paidAt: "2026-11-17T12:01:00Z",
            fulfilmentStatus: "PENDING_SHIPPING",
            payment: { ...order.payment, status: "SUCCESS", checkoutUrl: null },
          }
        : order,
    }),
  );
  await page.goto("/checkout");
  await page.getByRole("button", { name: /Pay .* in test mode/ }).click();
  await expect(page.locator(".demo-payment-guide")).toBeVisible();
  paid = true;
  await expect(page).toHaveURL(new RegExp(`/account/orders/${order.id}$`), {
    timeout: 15000,
  });
  await expect(
    page.getByRole("heading", { name: "Payment confirmed", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".demo-payment-guide")).toHaveCount(0);
});

test("a return visit stays pending until the backend confirms success and then removes purchased bag items", async ({
  page,
}) => {
  const headers = await fixture(page);
  await page.addInitScript(() =>
    sessionStorage.setItem(
      "forma-checkout-intent-test-account",
      JSON.stringify({
        signature: "test-purchase",
        key: "22222222-2222-4222-8222-222222222222",
      }),
    ),
  );
  let paid = false;
  await page.route(
    `http://localhost:3000/payments/${reference}/verify`,
    (route) =>
      route.request().method() === "OPTIONS"
        ? route.fulfill({ status: 204, headers })
        : route.fulfill({
            headers,
            json: paid
              ? {
                  ...order,
                  status: "PAID",
                  paidAt: "2026-11-17T12:01:00Z",
                  payment: {
                    ...order.payment,
                    status: "SUCCESS",
                    checkoutUrl: null,
                  },
                }
              : order,
          }),
  );
  await page.goto(`/checkout/return?reference=${reference}`);
  await expect(
    page.getByRole("heading", { name: "Awaiting payment" }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("forma-device-bag-v1")),
  ).toBe("[11]");
  paid = true;
  await page.getByRole("button", { name: "Check payment status" }).click();
  await expect(
    page.getByRole("heading", { name: "Payment confirmed" }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => localStorage.getItem("forma-device-bag-v1")),
    )
    .toBe("[]");
  await expect
    .poll(() =>
      page.evaluate(() =>
        sessionStorage.getItem("forma-checkout-intent-test-account"),
      ),
    )
    .toBeNull();
});

test("signed-out payment returns keep their reference in the sign-in destination", async ({
  page,
}) => {
  await fixture(page, false);
  await page.goto(`/checkout/return?reference=${reference}`);
  const expected = `/sign-in?next=${encodeURIComponent(`/checkout/return?reference=${reference}`)}`;
  await expect(
    page
      .getByRole("link", { name: "Sign in", exact: true })
      .filter({ hasText: "Sign in" })
      .last(),
  ).toHaveAttribute("href", expected);
});

test("resuming an older unpaid order also requires a complete profile", async ({
  page,
}) => {
  const headers = await fixture(page);
  await page.route(`http://localhost:3000/orders/${order.id}/resume`, (route) =>
    route.fulfill({
      headers,
      status: 400,
      json: {
        message:
          "Add your shipping address and phone number to your profile before paying.",
      },
    }),
  );
  await page.goto(`/account/orders/${order.id}`);
  await page.getByRole("button", { name: "Continue test payment" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page).not.toHaveURL(/checkout.paystack.com/);
});

test("a receipt uses its current product photo when its stored photo is unavailable", async ({
  page,
}) => {
  const headers = await fixture(page);
  await page.route(`http://localhost:3000/orders/${order.id}`, (route) =>
    route.fulfill({
      headers,
      json: {
        ...order,
        status: "PAID",
        fulfilmentStatus: "PENDING_SHIPPING",
        items: [
          {
            ...items[0],
            imageUrl: "/missing-old-photo.webp",
            fallbackImageUrl: "/images/demo-marketplace/boucle-chair.webp",
          },
        ],
      },
    }),
  );
  await page.goto(`/account/orders/${order.id}`);
  const image = page.locator(".checkout-items img");
  await expect(image).toHaveAttribute(
    "src",
    "/images/demo-marketplace/boucle-chair.webp",
  );
  await expect
    .poll(() =>
      image.evaluate((image) => (image as HTMLImageElement).naturalWidth),
    )
    .toBeGreaterThan(0);
  await expect(page.locator(".checkout-items .image-placeholder")).toHaveCount(
    0,
  );
});

test("checkout preserves contact details after a failed start and offers order recovery", async ({
  page,
}) => {
  const headers = await fixture(page);
  await page.route("http://localhost:3000/checkout", (route) =>
    route.request().method() === "OPTIONS"
      ? route.fulfill({ status: 204, headers })
      : route.fulfill({
          status: 503,
          headers,
          json: {
            message:
              "Payment result is uncertain. Check orders before retrying.",
          },
        }),
  );
  await page.goto("/checkout");
  await page.getByLabel("Full name").fill("Ada Buyer");
  await page.getByLabel("Phone number").fill("+234 801 234 5678");
  await page.getByRole("button", { name: /Pay .* in test mode/ }).click();
  await expect(
    page.getByText(
      "Payment result is uncertain. Check orders before retrying.",
    ),
  ).toBeVisible();
  await expect(page.getByLabel("Full name")).toHaveValue("Ada Buyer");
  await expect(page.getByLabel("Phone number")).toHaveValue(
    "+234 801 234 5678",
  );
  await expect(
    page.getByRole("link", {
      name: "Check your orders before starting another payment",
    }),
  ).toBeVisible();
});

test("incomplete profiles get a guided dialog and cannot create a payment", async ({
  page,
}, info) => {
  const headers = await fixture(page);
  let starts = 0;
  await page.route("http://localhost:3000/users/me/profile", (route) =>
    route.fulfill({
      json: { ...completeProfile, address: null, phoneNumber: null },
      headers,
    }),
  );
  page.on("request", (req) => {
    if (new URL(req.url()).pathname === "/checkout" && req.method() === "POST")
      starts++;
  });
  await page.goto("/checkout");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByText("Shipping address", { exact: true }),
  ).toBeVisible();
  await expect(dialog.getByText("Phone number", { exact: true })).toBeVisible();
  await page.screenshot({
    path: info.outputPath("profile-check.png"),
    fullPage: true,
  });
  await expect(
    page.getByRole("button", { name: /Pay .* in test mode/ }),
  ).toHaveCount(0);
  await dialog.getByRole("button", { name: "Close profile reminder" }).click();
  await page.getByRole("button", { name: "Complete my profile" }).click();
  await expect(dialog).toBeVisible();
  await dialog
    .getByRole("link", { name: "Complete profile & continue" })
    .click();
  await expect(page).toHaveURL(/account\/profile\?checkout=1/);
  await expect(page.getByLabel("Shipping address")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Save & return to checkout" }),
  ).toBeVisible();
  expect(starts).toBe(0);
});

test("paid return shows the receipt and stops tracking at pending shipping", async ({
  page,
}, info) => {
  const headers = await fixture(page);
  await page.route(
    `http://localhost:3000/payments/${reference}/verify`,
    (route) =>
      route.fulfill({
        headers,
        json: {
          ...order,
          status: "PAID",
          fulfilmentStatus: "PENDING_SHIPPING",
          paidAt: "2026-11-17T12:01:00Z",
          payment: { ...order.payment, status: "SUCCESS", checkoutUrl: null },
        },
      }),
  );
  await page.goto(`/checkout/return?reference=${reference}`);
  await expect(
    page.getByRole("heading", { name: "Payment confirmed", exact: true }),
  ).toBeVisible();
  await expect(
    page.locator('.order-progress [aria-current="step"]'),
  ).toContainText("Pending shipping");
  await expect(page.locator(".order-progress .upcoming")).toHaveCount(2);
  await expect(
    page.getByText("12 Demo Street", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "What you ordered." }),
  ).toBeVisible();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".order-progress")).toBeVisible();
  await page.screenshot({
    path: info.outputPath("paid-receipt.png"),
    fullPage: true,
  });
  await expect(
    page.locator('.order-progress [aria-current="step"]'),
  ).toContainText("Pending shipping");
});

test("order history filters delivery states and opens a full order; desktop navigation sticks", async ({
  page,
}, info) => {
  const headers = await fixture(page);
  const paid = {
    ...order,
    status: "PAID",
    paidAt: "2026-11-17T12:01:00Z",
    payment: { ...order.payment, status: "SUCCESS", checkoutUrl: null },
  };
  await page.route("http://localhost:3000/orders*", (route) => {
    const url = new URL(route.request().url());
    const status = url.searchParams.get("status");
    const states = status
      ? [status]
      : [
          "PENDING_SHIPPING",
          "SHIPPED",
          "DELIVERED",
          "PENDING_SHIPPING",
          "PENDING_SHIPPING",
          "PENDING_SHIPPING",
        ];
    return route.fulfill({
      headers,
      json: {
        items: states.map((fulfilmentStatus, i) => ({
          ...paid,
          id: `${i + 1}1111111-1111-4111-8111-111111111111`,
          fulfilmentStatus,
        })),
        pagination: { page: 1, limit: 8, total: states.length, totalPages: 1 },
      },
    });
  });
  await page.goto("/account/orders");
  await expect(page.locator(".order-history-card")).toHaveCount(6);
  if (info.project.name === "desktop") {
    await page.evaluate(() => window.scrollTo(0, 700));
    await expect
      .poll(async () =>
        Math.round((await page.locator(".workspace-nav").boundingBox())!.y),
      )
      .toBe(24);
  }
  await page.getByRole("button", { name: "Delivered", exact: true }).click();
  await expect(page.locator(".order-history-card")).toHaveCount(1);
  await expect(page.locator(".order-status")).toContainText("Delivered");
  await page.screenshot({
    path: info.outputPath("order-history.png"),
    fullPage: true,
  });
  await page.route("http://localhost:3000/orders/*", (route) =>
    route.fulfill({
      headers,
      json: { ...paid, fulfilmentStatus: "DELIVERED" },
    }),
  );
  await page.getByRole("link", { name: "View order details" }).click();
  await expect(
    page.getByRole("heading", { name: "Payment confirmed", exact: true }),
  ).toBeVisible();
  await expect(
    page.locator('.order-progress [aria-current="step"]'),
  ).toContainText("Delivered");
});
