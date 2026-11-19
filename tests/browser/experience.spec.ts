import { test, expect, type Route } from "@playwright/test";
import { mockApi, ownProfile, product, testOrigin, now } from "./fixtures";
import { money } from "../../src/lib/money";
const headers = {
  "access-control-allow-origin": testOrigin,
  "access-control-allow-credentials": "true",
};
const reply = (route: Route, json: unknown) => route.fulfill({ json, headers });

test("discovery cards lead to real shopping filters and header search restores focus", async ({
  page,
}) => {
  await mockApi(page);
  await page.goto("/");
  await page.locator(".market-world").first().click();
  await expect(page).toHaveURL(/category=test-furniture/);
  await expect(
    page.getByRole("button", { name: "Remove category filter" }),
  ).toBeVisible();
  const trigger = page.getByRole("button", { name: "Search marketplace" });
  await trigger.click();
  const input = page.locator("#global-search");
  await expect(input).toBeFocused();
  await input.press("Escape");
  await expect(trigger).toBeFocused();
  await expect(input).toHaveCount(0);
  await trigger.click();
  await page.locator("#global-search").fill("ceramic vase");
  await page
    .locator(".header-search")
    .getByRole("button", { name: "Search", exact: false })
    .click();
  await expect(page).toHaveURL(/search=ceramic%20vase/);
});

test("password visibility keeps the entered value and never submits the form", async ({
  page,
}) => {
  await mockApi(page);
  await page.goto("/sign-in");
  const password = page.getByLabel(/^Password/);
  await password.fill("a-private-test-password");
  await expect(password).toHaveAttribute("type", "password");
  await page
    .getByRole("button", { name: "Show password", exact: true })
    .click();
  await expect(password).toHaveAttribute("type", "text");
  await expect(password).toHaveValue("a-private-test-password");
  await page
    .getByRole("button", { name: "Hide password", exact: true })
    .click();
  await expect(password).toHaveAttribute("type", "password");
  await expect(page).toHaveURL(/\/sign-in$/);
});

test("product images enlarge, support keyboard navigation and return focus on close", async ({
  page,
}) => {
  await mockApi(page);
  await page.route(
    `http://localhost:3000/products/slug/${product.slug}`,
    (route) =>
      reply(route, {
        ...product,
        images: [
          {
            id: 91,
            productId: product.id,
            url: "/images/considered-objects.jpg",
            sortOrder: 0,
            createdAt: now,
          },
          {
            id: 92,
            productId: product.id,
            url: "/images/quiet-interior.jpg",
            sortOrder: 1,
            createdAt: now,
          },
        ],
      }),
  );
  await page.goto(`/products/${product.slug}`);
  const enlarge = page.getByRole("button", {
    name: `Enlarge image of ${product.title}`,
  });
  await enlarge.click();
  const gallery = page.getByRole("dialog", { name: product.title });
  await expect(gallery).toBeVisible();
  await expect(
    gallery.getByRole("button", { name: "Close product images" }),
  ).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(gallery.getByRole("status")).toHaveText("Image 2 of 2");
  await page.keyboard.press("Escape");
  await expect(gallery).not.toBeVisible();
  await expect(enlarge).toBeFocused();
  await expect(
    page.getByRole("button", { name: `View image 2 of ${product.title}` }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("saving a product offers a visible next step and the bag explains its listed value", async ({
  page,
}) => {
  await mockApi(page);
  await page.goto(`/products/${product.slug}`);
  await page.getByRole("button", { name: "Save to bag", exact: true }).click();
  await page.getByRole("link", { name: "View bag", exact: true }).click();
  const summary = page.getByRole("complementary", {
    name: "Your saved collection",
  });
  await expect(
    summary.getByText(
      money(product.discountPrice ?? product.price, product.currency),
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Visit store", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Test checkout supports NGN items from multiple stores", {
      exact: false,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Remove", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Room for something good." }),
  ).toBeVisible();
});

test("unavailable products have a clear state and cannot be saved", async ({
  page,
}) => {
  await mockApi(page);
  await page.route(
    `http://localhost:3000/products/slug/${product.slug}`,
    (route) => reply(route, { ...product, stockQuantity: 0 }),
  );
  await page.goto(`/products/${product.slug}`);
  await expect(
    page.getByRole("button", { name: "Currently unavailable", exact: true }),
  ).toBeDisabled();
  await expect(page.locator(".stock-note")).toHaveText("Currently unavailable");
  await expect(
    page.getByRole("button", { name: "Save to bag", exact: true }),
  ).toHaveCount(0);
});

test("storefront and account surfaces stay readable and fit the viewport with reduced motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockApi(page, { signedIn: true, hasStore: true });
  await page.route("http://localhost:3000/users/me/profile", (route) =>
    reply(route, ownProfile),
  );
  await page.route(
    "http://localhost:3000/users/me/profile/completeness",
    (route) => reply(route, ownProfile.completion),
  );
  for (const path of [
    "/",
    "/products",
    `/products/${product.slug}`,
    "/cart",
    "/account/profile",
    "/account/reviews",
    "/seller",
    "/seller/products",
    "/seller/products/new",
    "/seller/categories",
    "/seller/store",
    "/stores/test-studio",
    "/sign-up",
  ]) {
    await page.goto(path);
    await expect(page.locator("main h1").first()).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      path,
    ).toBe(true);
  }
  await expect(page.locator(".field input").first()).toHaveCSS(
    "font-size",
    "16px",
  );
  await expect(page.locator(".page-intro")).toHaveCSS("animation-name", "none");
});
