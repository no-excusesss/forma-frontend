import { test, expect, type Route } from "@playwright/test";
import { mockApi, ownProfile, product, testOrigin } from "./fixtures";
const headers = {
  "access-control-allow-origin": testOrigin,
  "access-control-allow-credentials": "true",
  "access-control-allow-headers": "content-type",
  "access-control-allow-methods": "GET,POST,PATCH,OPTIONS",
};
const picture =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=";
async function reply(route: Route, json: unknown, status = 200) {
  return route.request().method() === "OPTIONS"
    ? route.fulfill({ status: 204, headers })
    : route.fulfill({ json, status, headers });
}

test("store owners see their photo and store navigation throughout the site", async ({
  page,
}, info) => {
  await mockApi(page, { signedIn: true, hasStore: true });
  await page.route("http://localhost:3000/users/me/profile", (route) =>
    reply(route, { ...ownProfile, profilePicture: picture }),
  );
  await page.goto("/");
  const account = page.getByRole("button", { name: "Your account, Ada Obi" });
  await expect(account.getByRole("img")).toHaveAttribute("src", picture);
  await expect(
    page.getByRole("link", { name: "For the makers", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Become a seller", exact: true }),
  ).toHaveCount(0);
  await expect(
    page
      .getByRole("contentinfo")
      .getByRole("link", { name: "My Store", exact: true }),
  ).toHaveAttribute("href", "/seller");
  if (info.project.name === "mobile")
    await page.getByRole("button", { name: "Open navigation" }).click();
  const nav = page.getByRole("navigation", {
    name:
      info.project.name === "mobile" ? "Mobile navigation" : "Main navigation",
  });
  await expect(
    nav.getByRole("link", { name: "My Store", exact: true }),
  ).toHaveAttribute("href", "/seller");
  await nav.getByRole("link", { name: "My Store", exact: true }).click();
  await expect(page).toHaveURL(`${testOrigin}/seller`);
  await page
    .locator(".status-grid")
    .getByRole("link", { name: /^active/ })
    .click();
  await expect(page).toHaveURL(/\/seller\/products\?status=ACTIVE/);
  await page.goto("/sell");
  await expect(page).toHaveURL(`${testOrigin}/seller`);
  await page.goto("/seller/products/11/edit");
  await expect(
    page
      .getByRole("complementary")
      .getByRole("link", { name: "Inventory", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("a missing profile photo falls back to initials without a broken image", async ({
  page,
}) => {
  await mockApi(page, { signedIn: true });
  await page.route("http://localhost:3000/users/me/profile", (route) =>
    reply(route, { ...ownProfile, profilePicture: "/missing-avatar.png" }),
  );
  await page.route("**/missing-avatar.png", (route) =>
    route.fulfill({ status: 404, body: "not found" }),
  );
  await page.goto("/");
  const account = page.getByRole("button", { name: "Your account, Ada Obi" });
  await expect(account.locator(".account-avatar")).toHaveText("AO");
  await expect(account.getByRole("img")).toHaveCount(0);
});

test("category creation stays in the product flow and selects the returned ID without losing details", async ({
  page,
}) => {
  await mockApi(page, { signedIn: true, hasStore: true });
  let categories: { id: number; name: string; slug: string }[] = [];
  await page.route(
    "http://localhost:3000/product-categories",
    async (route) => {
      if (route.request().method() === "POST") {
        expect(route.request().postDataJSON()).toEqual({
          name: "Home & living",
          slug: "home-living",
        });
        const category = { id: 93, name: "Home & living", slug: "home-living" };
        categories = [category];
        return reply(route, category, 201);
      }
      return reply(route, categories);
    },
  );
  await page.goto("/seller/products/new");
  await expect(
    page.getByRole("dialog", { name: "Create your first category" }),
  ).toBeVisible();
  await expect(page.getByLabel("Category name")).toBeFocused();
  await page.getByRole("button", { name: "Not now", exact: true }).click();
  await page.getByLabel("Product title").fill("A carefully chosen product");
  await page
    .getByLabel("The full story")
    .fill("A clear description that stays in place.");
  await page
    .getByRole("button", { name: "+ Create category", exact: true })
    .click();
  await page.getByLabel("Category name").fill("Home & living");
  await page
    .getByRole("button", { name: "Create category & continue", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Create your first category" }),
  ).not.toBeVisible();
  await expect(page).toHaveURL(testOrigin + "/seller/products/new");
  await expect(page.getByRole("combobox", { name: /^Category/ })).toHaveValue(
    "Home & living",
  );
  await expect(page.getByLabel("Product title")).toHaveValue(
    "A carefully chosen product",
  );
  await expect(page.getByLabel("The full story")).toHaveValue(
    "A clear description that stays in place.",
  );
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Price & stock", exact: true }),
  ).toBeVisible();
});

test("category errors preserve input and never claim success", async ({
  page,
}) => {
  await mockApi(page, { signedIn: true, hasStore: true });
  await page.route("http://localhost:3000/product-categories", (route) =>
    reply(
      route,
      route.request().method() === "POST"
        ? { message: "Create a store before adding product categories." }
        : [],
      route.request().method() === "POST" ? 403 : 200,
    ),
  );
  await page.goto("/seller/products/new");
  await page.getByLabel("Category name").fill("Home & living");
  await page
    .getByRole("button", { name: "Create category & continue", exact: true })
    .click();
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "Create a store before adding product categories." }),
  ).toBeVisible();
  await expect(page.getByLabel("Category name")).toHaveValue("Home & living");
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByText("Category created and selected.", { exact: false }),
  ).toHaveCount(0);
});

test("a failed category request can be retried in place", async ({ page }) => {
  await mockApi(page, { signedIn: true, hasStore: true });
  let attempts = 0;
  let created = false;
  await page.route("http://localhost:3000/product-categories", (route) => {
    if (route.request().method() === "POST") {
      attempts++;
      if (attempts === 1)
        return reply(route, { message: "Temporarily unavailable" }, 503);
      created = true;
      return reply(route, { id: 52, name: "Everyday", slug: "everyday" }, 201);
    }
    return reply(
      route,
      created ? [{ id: 52, name: "Everyday", slug: "everyday" }] : [],
    );
  });
  await page.goto("/seller/products/new");
  await page.getByLabel("Category name").fill("Everyday");
  await page
    .getByRole("button", { name: "Create category & continue", exact: true })
    .click();
  await expect(page.getByText("Temporarily unavailable")).toBeVisible();
  await expect(page.getByLabel("Category name")).toHaveValue("Everyday");
  await page
    .getByRole("button", { name: "Create category & continue", exact: true })
    .click();
  await expect(page.getByRole("combobox", { name: /^Category/ })).toHaveValue(
    "Everyday",
  );
  expect(attempts).toBe(2);
});

test("an existing product remains editable if its category is absent from the category list", async ({
  page,
}) => {
  await mockApi(page, { signedIn: true, hasStore: true });
  await page.route("http://localhost:3000/product-categories", (route) =>
    reply(route, []),
  );
  await page.goto("/seller/products/11/edit");
  await expect(page.getByLabel("Product title")).toHaveValue(product.title);
  await expect(page.getByRole("combobox", { name: /^Category/ })).toHaveValue(
    product.category.name,
  );
  await expect(
    page.getByRole("button", { name: "Save product", exact: true }),
  ).toBeVisible();
});

test("returning members sign in to the marketplace and owners can edit from product details", async ({
  page,
}) => {
  await mockApi(page, { hasStore: true });
  await page.route("http://localhost:3000/users/me/profile", (route) =>
    reply(route, ownProfile),
  );
  await page.goto("/sign-in");
  await page.getByLabel("Email address").fill("member@example.test");
  await page.getByLabel(/^Password/).fill("a-test-password");
  await page.getByRole("button", { name: "Sign in →" }).click();
  await expect(page).toHaveURL(`${testOrigin}/`);
  await expect(
    page.getByRole("button", { name: "Your account, Ada Obi" }),
  ).toBeVisible();
  await page.goto(`/products/${product.slug}`);
  await page.getByRole("link", { name: /Edit your product/ }).click();
  await expect(page).toHaveURL(`${testOrigin}/seller/products/11/edit`);
  await expect(page.getByLabel("Product title")).toHaveValue(product.title);
});
