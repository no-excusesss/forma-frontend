import { expect, test, type Page } from "@playwright/test";
import { mockApi, product, testOrigin } from "./fixtures";
import { chooseOption } from "./select-helpers";

const headers = {
  "access-control-allow-origin": testOrigin,
  "access-control-allow-credentials": "true",
};
const categories = [
  product.category,
  { id: 8, name: "Desk & tech", slug: "desk-tech" },
];
const finds = Array.from({ length: 14 }, (_, i) => ({
  ...product,
  id: 100 + i,
  title: `Find ${String(i + 1).padStart(2, "0")}`,
  slug: `find-${i + 1}`,
  price: String(10000 + i * 1000),
  discountPrice: null,
  category: categories[i % 2],
  images: [
    {
      id: 500 + i,
      sortOrder: 0,
      url: `/images/demo-marketplace/${i % 2 ? "arc-desk-lamp" : "boucle-chair"}.webp`,
    },
  ],
  createdAt: `2026-11-${String(i + 1).padStart(2, "0")}T12:00:00Z`,
}));
async function browseApi(page: Page) {
  await mockApi(page);
  await page.route("http://localhost:3000/product-categories", (route) =>
    route.fulfill({ headers, json: categories }),
  );
  await page.route("http://localhost:3000/products/discovery", (route) =>
    route.fulfill({
      headers,
      json: categories.map((c) => ({
        ...c,
        productCount: 7,
        products: finds.filter((p) => p.category.slug === c.slug).slice(0, 6),
      })),
    }),
  );
  await page.route("http://localhost:3000/products?**", (route) => {
    const query = new URL(route.request().url()).searchParams;
    const items = finds.filter(
      (p) =>
        (!query.get("category") || p.category.slug === query.get("category")) &&
        (!query.get("search") ||
          p.title.toLowerCase().includes(query.get("search")!.toLowerCase())) &&
        (!query.get("condition") || p.condition === query.get("condition")) &&
        (!query.get("minPrice") ||
          Number(p.price) >= Number(query.get("minPrice"))) &&
        (!query.get("maxPrice") ||
          Number(p.price) <= Number(query.get("maxPrice"))),
    );
    items.sort((a, b) =>
      query.get("sort") === "price_asc"
        ? Number(a.price) - Number(b.price)
        : query.get("sort") === "price_desc"
          ? Number(b.price) - Number(a.price)
          : query.get("sort") === "oldest"
            ? a.createdAt.localeCompare(b.createdAt)
            : b.createdAt.localeCompare(a.createdAt),
    );
    const limit = Number(query.get("limit")) || 12;
    const current = Number(query.get("page")) || 1;
    return route.fulfill({
      headers,
      json: {
        items: items.slice((current - 1) * limit, current * limit),
        pagination: {
          page: current,
          limit,
          total: items.length,
          totalPages: Math.ceil(items.length / limit),
        },
      },
    });
  });
  await page.route("http://localhost:3000/products/slug/**", (route) =>
    route.fulfill({
      headers,
      json: finds.find((p) => route.request().url().endsWith(`/${p.slug}`)),
    }),
  );
}
async function openFilters(page: Page) {
  const panel = page.locator(".browse-filter-panel");
  await expect(panel).toBeVisible();
  if ((await panel.getAttribute("open")) === null)
    await page.getByText("Refine your discovery", { exact: true }).click();
  await expect(
    page.getByRole("combobox", { name: "Condition", exact: true }),
  ).toBeVisible();
}

test("Discover and New Arrivals have distinct entrances and real product imagery", async ({
  page,
}, info) => {
  await browseApi(page);
  await page.goto("/products");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    /Find yourkind of good\./,
  );
  await expect(page.locator(".browse-art-product")).toHaveCount(2);
  await expect(
    page.locator(".browse-product-grid .market-product"),
  ).toHaveCount(12);
  await expect(
    page.locator(".browse-product-grid .market-product-title").first(),
  ).toHaveText("Find 14");
  await page
    .getByRole("navigation", { name: "Marketplace collections" })
    .getByRole("link", { name: "New arrivals", exact: true })
    .click();
  await expect(page).toHaveURL(/\/new-arrivals$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "New in.Very you.",
  );
  await expect(page).toHaveTitle(/New arrivals/);
  await expect(
    page.locator(".browse-product-grid time").first(),
  ).toHaveAttribute("datetime", finds[13].createdAt);
  await expect(
    page
      .getByRole("navigation", { name: "Marketplace collections" })
      .getByRole("link", { name: "New arrivals" }),
  ).toHaveAttribute("aria-current", "page");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  if (info.project.name === "desktop")
    await expect(page.locator(".browse-sidebar")).toHaveCSS(
      "position",
      "sticky",
    );
});

test("category cards preserve search and sorting, reset pagination and show selected products", async ({
  page,
}) => {
  await browseApi(page);
  await page.goto("/new-arrivals?sort=price_asc&search=Find&page=2");
  const category = page
    .getByRole("group", { name: "Browse categories" })
    .getByRole("button", { name: /Desk & tech/ });
  await category.click();
  await expect(page).toHaveURL(/category=desk-tech/);
  expect(new URL(page.url()).pathname).toBe("/new-arrivals");
  expect(new URL(page.url()).searchParams.get("sort")).toBe("price_asc");
  expect(new URL(page.url()).searchParams.get("search")).toBe("Find");
  expect(new URL(page.url()).searchParams.has("page")).toBe(false);
  await expect(category).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.locator(".browse-product-grid .market-product"),
  ).toHaveCount(7);
  await expect(
    page.locator(".browse-product-grid .market-product-title").first(),
  ).toHaveText("Find 02");
  await page
    .getByRole("button", { name: "Remove category filter", exact: true })
    .click();
  await expect(
    page.locator(".browse-product-grid .market-product"),
  ).toHaveCount(12);
});

test("filter validation focuses the range, applying collapses mobile filters, and reset clears drafts", async ({
  page,
}, info) => {
  await browseApi(page);
  await page.goto("/products?sort=price_asc");
  await openFilters(page);
  const min = page.getByRole("spinbutton", { name: "Minimum price" });
  await min.fill("18000");
  await page.getByRole("spinbutton", { name: "Maximum price" }).fill("12000");
  await page
    .getByRole("button", { name: "Apply filters", exact: true })
    .click();
  await expect(
    page.locator(".browse-filter-panel").getByRole("alert"),
  ).toHaveText("The minimum price cannot exceed the maximum price.");
  await expect(min).toBeFocused();
  expect(new URL(page.url()).searchParams.has("minPrice")).toBe(false);
  await page
    .getByRole("button", { name: "Reset filters", exact: true })
    .click();
  await expect(min).toHaveValue("");
  await chooseOption(page, "Condition", "Pre-loved");
  await page
    .getByRole("button", { name: "Apply filters", exact: true })
    .click();
  await expect(page).toHaveURL(/condition=USED/);
  if (info.project.name === "mobile") await expect(min).not.toBeVisible();
  await expect(
    page.getByRole("heading", { name: "No finds this time." }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Clear filters", exact: true })
    .click();
  await expect(page).toHaveURL(
    (url) =>
      url.searchParams.get("sort") === "price_asc" &&
      !url.searchParams.has("condition"),
  );
  await expect(
    page.locator(".browse-product-grid .market-product"),
  ).toHaveCount(12);
});

test("pagination keeps previous cards stable but inert while the next page loads", async ({
  page,
}) => {
  await browseApi(page);
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("http://localhost:3000/products?**", async (route) => {
    if (new URL(route.request().url()).searchParams.get("page") === "2")
      await gate;
    return route.fallback();
  });
  await page.goto("/products");
  await page.getByRole("button", { name: "Next page", exact: true }).click();
  await expect(
    page.getByText("Updating your finds…", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".browse-product-grid")).toHaveAttribute(
    "inert",
    "",
  );
  await expect(
    page.getByRole("button", { name: "Next page", exact: true }),
  ).toBeDisabled();
  release();
  await expect(
    page.locator(".browse-product-grid .market-product"),
  ).toHaveCount(2);
  await expect(page.locator(".browse-product-grid")).not.toHaveAttribute(
    "inert",
  );
  await expect(page.getByText("Page 2 of 2", { exact: true })).toBeVisible();
});

test("quick look works on both collection pages and the bag persists across navigation", async ({
  page,
}) => {
  await browseApi(page);
  await page.goto("/products");
  const trigger = page
    .locator(".browse-product-grid")
    .getByRole("button", { name: "Quick look at Find 14", exact: true });
  await trigger.focus();
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "A closer look." });
  await expect(dialog.getByRole("heading", { name: "Find 14" })).toBeVisible();
  await dialog
    .getByRole("button", { name: "Save to bag", exact: true })
    .click();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await page.goto("/new-arrivals");
  await expect(
    page
      .locator(".browse-product-grid")
      .getByRole("button", { name: "Find 14 saved to bag", exact: true }),
  ).toBeDisabled();
  await page
    .locator(".browse-product-grid")
    .getByRole("button", { name: "Quick look at Find 13", exact: true })
    .click();
  await expect(dialog.getByRole("heading", { name: "Find 13" })).toBeVisible();
});

test("query failures retry without replacing the page and empty pages can recover", async ({
  page,
}) => {
  await browseApi(page);
  let fail = true;
  await page.route("http://localhost:3000/products?**", (route) =>
    fail
      ? route.fulfill({
          headers,
          status: 503,
          json: { message: "Products are taking a moment." },
        })
      : route.fallback(),
  );
  await page.goto("/products");
  await expect(
    page.locator(".browse-results").getByRole("alert"),
  ).toContainText("Products are taking a moment.");
  fail = false;
  await page
    .locator(".browse-results")
    .getByRole("button", { name: "Try again" })
    .click();
  await expect(
    page.locator(".browse-product-grid .market-product"),
  ).toHaveCount(12);
  await page.goto("/new-arrivals?page=40");
  await expect(
    page.getByRole("heading", { name: "Nothing on this page." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Back to the first page" }).click();
  await expect(page).toHaveURL(/\/new-arrivals$/);
  await expect(
    page.locator(".browse-product-grid .market-product"),
  ).toHaveCount(12);
});

test("search, sort and location refinements remain shareable on New Arrivals", async ({
  page,
}) => {
  await browseApi(page);
  await page.goto("/new-arrivals");
  await page
    .getByRole("textbox", { name: "Search products", exact: true })
    .fill("Find 02");
  await page.getByRole("button", { name: "Submit search" }).click();
  await expect(
    page.locator(".browse-product-grid .market-product"),
  ).toHaveCount(1);
  await chooseOption(page, "Sort products", "Price: low to high");
  await openFilters(page);
  await page.getByText("Shop closer to home", { exact: true }).click();
  await page.getByLabel("City", { exact: true }).fill("Lagos");
  await page
    .getByRole("button", { name: "Apply filters", exact: true })
    .click();
  await expect(page).toHaveURL(/city=Lagos/);
  expect(new URL(page.url()).pathname).toBe("/new-arrivals");
  expect(new URL(page.url()).searchParams.get("search")).toBe("Find 02");
  expect(new URL(page.url()).searchParams.get("sort")).toBe("price_asc");
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Remove city filter" }),
  ).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Search products", exact: true }),
  ).toHaveValue("Find 02");
});
