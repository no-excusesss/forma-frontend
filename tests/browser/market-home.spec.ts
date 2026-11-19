import { expect, test, type Page } from "@playwright/test";
import { mockApi, product, seller, testOrigin } from "./fixtures";

const headers = {
  "access-control-allow-origin": testOrigin,
  "access-control-allow-credentials": "true",
};
const categories = [
  product.category,
  { id: 9, name: "Everyday style", slug: "everyday-style" },
  { id: 10, name: "Desk & tech", slug: "desk-tech" },
];
const finds = [
  {
    title: "Studio chair",
    slug: "studio-chair",
    price: "18000",
    discountPrice: "15000",
    photo: "boucle-chair",
    category: categories[0],
  },
  {
    title: "Milo crossbody",
    slug: "milo-crossbody",
    price: "24000",
    discountPrice: null,
    photo: "tan-crossbody",
    category: categories[1],
  },
  {
    title: "Arc desk lamp",
    slug: "arc-desk-lamp",
    price: "42000",
    discountPrice: null,
    photo: "arc-desk-lamp",
    category: categories[2],
  },
  {
    title: "Clay vase",
    slug: "clay-vase",
    price: "8000",
    discountPrice: null,
    photo: "vase",
    category: categories[0],
  },
  {
    title: "Gold hoops",
    slug: "gold-hoops",
    price: "32000",
    discountPrice: "14000",
    photo: "gold-hoops",
    category: categories[1],
  },
  {
    title: "Wireless mouse",
    slug: "wireless-mouse",
    price: "12000",
    discountPrice: null,
    photo: "sand-wireless-mouse",
    category: categories[2],
  },
  {
    title: "Foreign currency find",
    slug: "foreign-find",
    price: "20",
    discountPrice: null,
    photo: "vase",
    category: categories[0],
    currency: "USD",
  },
].map((p, i) => ({
  ...product,
  ...p,
  id: 100 + i,
  images: [{ url: `/images/demo-marketplace/${p.photo}.webp` }],
  seller: {
    ...seller,
    slug: `shop-${i % 3}`,
    displayName: ["Home Studio", "Style Studio", "Desk Studio"][i % 3],
  },
}));

async function homeApi(page: Page) {
  await mockApi(page);
  await page.route("http://localhost:3000/products/discovery", (route) =>
    route.fulfill({
      headers,
      json: categories.map((c) => ({
        ...c,
        productCount: finds.filter((p) => p.category.slug === c.slug).length,
        products: finds.filter((p) => p.category.slug === c.slug),
      })),
    }),
  );
  await page.route("http://localhost:3000/products?**", (route) =>
    route.fulfill({
      headers,
      json: {
        items: finds,
        pagination: { page: 1, limit: 8, total: finds.length, totalPages: 1 },
      },
    }),
  );
  await page.route("http://localhost:3000/products/slug/**", (route) =>
    route.fulfill({
      headers,
      json: finds.find((p) => route.request().url().endsWith(`/${p.slug}`)),
    }),
  );
}

test("home presents real products, working collection links and no edit button", async ({
  page,
}, info) => {
  await homeApi(page);
  await page.goto("/");
  await expect(page.locator(".market-hero-card")).toHaveCount(3);
  await expect(
    page.locator(".market-product-grid .market-product"),
  ).toHaveCount(7);
  await expect(page.locator(".market-world")).toHaveCount(3);
  await expect(page.locator(".market-shop")).toHaveCount(3);
  await expect(page.locator(".market-hero-card").first()).toHaveAttribute(
    "href",
    "/products/studio-chair",
  );
  await expect(page.locator(".market-world").nth(1)).toHaveAttribute(
    "href",
    "/products?category=everyday-style",
  );
  await expect(
    page.getByRole("button", {
      name: /Another edit|Discover another category/i,
    }),
  ).toHaveCount(0);
  await expect(page.locator(".market-world-objects img").first()).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(
    (await page.locator(".header").boundingBox())!.height,
  ).toBeLessThanOrEqual(80);
  await page.screenshot({
    path: info.outputPath("market-home.png"),
    fullPage: true,
  });
});

test("fresh-finds filters change the products and keep an explicit selected state", async ({
  page,
}) => {
  await homeApi(page);
  await page.goto("/");
  const filters = page.getByRole("group", { name: "Filter fresh finds" });
  const style = filters.getByRole("button", { name: /Everyday style/ });
  await style.click();
  await expect(style).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.locator(".market-product-grid .market-product"),
  ).toHaveCount(2);
  await expect(page.locator(".market-product-grid")).toContainText(
    "Milo crossbody",
  );
  await expect(page.locator(".market-product-grid")).not.toContainText(
    "Arc desk lamp",
  );
  await filters.getByRole("button", { name: /The good mix/ }).click();
  await expect(
    page.locator(".market-product-grid .market-product"),
  ).toHaveCount(7);
});

test("price shelves use the actual discounted NGN price and scroll through available finds", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await homeApi(page);
  await page.goto("/");
  const budget = page.getByRole("group", { name: "Choose a price limit" });
  const rail = page.locator(".market-product-rail");
  await budget.getByRole("button", { name: "₦15k & under" }).click();
  await expect(rail.locator(".market-product")).toHaveCount(4);
  await expect(rail).toContainText("Studio chair");
  await expect(rail).toContainText("Gold hoops");
  await expect(rail).not.toContainText("Foreign currency find");
  await expect(rail).not.toContainText("Arc desk lamp");
  await budget.getByRole("button", { name: "₦50k & under" }).click();
  await expect(rail.locator(".market-product")).toHaveCount(6);
  await page.getByRole("button", { name: "Next affordable finds" }).click();
  await expect
    .poll(() => rail.evaluate((el) => el.scrollLeft))
    .toBeGreaterThan(0);
  await expect(
    page.getByRole("button", { name: "Previous affordable finds" }),
  ).toBeEnabled();
  await expect(page.locator(".market-product-grid")).toHaveCSS(
    "animation-name",
    "none",
  );
});

test("quick look loads current details, saves to the bag and restores keyboard focus", async ({
  page,
}) => {
  await homeApi(page);
  await page.goto("/");
  const trigger = page
    .locator(".market-product-grid")
    .getByRole("button", { name: "Quick look at Studio chair", exact: true });
  await trigger.focus();
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "A closer look." });
  await expect(
    dialog.getByRole("heading", { name: "Studio chair" }),
  ).toBeVisible();
  await expect(dialog).toContainText("3 available");
  await dialog
    .getByRole("button", { name: "Save to bag", exact: true })
    .click();
  await expect(
    dialog.getByRole("button", { name: "Saved to bag", exact: true }),
  ).toBeDisabled();
  await expect(
    dialog.getByRole("link", { name: "View your bag" }),
  ).toHaveAttribute("href", "/cart");
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await expect(
    page
      .locator(".market-product-grid")
      .getByRole("button", { name: "Studio chair saved to bag", exact: true }),
  ).toBeDisabled();
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("forma-device-bag-v1") || "[]"),
    ),
  ).toEqual([100]);
  await page
    .locator(".market-product-grid")
    .getByRole("button", { name: "Quick look at Milo crossbody", exact: true })
    .click();
  await expect(
    dialog.getByRole("heading", { name: "Milo crossbody" }),
  ).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Save to bag", exact: true }),
  ).toBeEnabled();
});

test("homepage search takes the entered words to the real marketplace", async ({
  page,
}) => {
  await homeApi(page);
  await page.goto("/");
  await page
    .getByLabel("Find your next good thing", { exact: true })
    .fill("vase & lamp");
  await page
    .getByRole("button", { name: "Find products", exact: true })
    .click();
  await expect(page).toHaveURL(/\/products\?search=vase/);
  expect(new URL(page.url()).searchParams.get("search")).toBe("vase & lamp");
});

test("one-product collections still have an image and owners get a view action", async ({
  page,
}) => {
  await mockApi(page, { signedIn: true, hasStore: true });
  await page.goto("/");
  await expect(page.locator(".market-collage")).toHaveAttribute(
    "data-count",
    "1",
  );
  await expect(page.locator(".market-world-objects img")).toHaveCount(1);
  await expect(
    page
      .locator(".market-product-grid")
      .getByRole("link", { name: `View your ${product.title}` }),
  ).toBeVisible();
  await expect(
    page
      .locator(".market-product-grid")
      .getByRole("button", {
        name: `Save ${product.title} to bag`,
        exact: true,
      }),
  ).toHaveCount(0);
});
