import { test, expect, type Page } from "@playwright/test";
import { mockApi, ownProfile, testOrigin } from "./fixtures";
import { chooseOption } from "./select-helpers";

const categories = [
  { id: 21, name: "Jeans", slug: "jeans" },
  { id: 22, name: "Tops", slug: "tops" },
  ...Array.from({ length: 24 }, (_, i) => ({
    id: 100 + i,
    name: `Collection ${String(i + 1).padStart(2, "0")}`,
    slug: `collection-${i + 1}`,
  })),
];
const headers = {
  "access-control-allow-origin": testOrigin,
  "access-control-allow-credentials": "true",
  "access-control-allow-headers": "content-type",
  "access-control-allow-methods": "GET,PATCH,OPTIONS",
};
async function openProduct(page: Page) {
  await mockApi(page, { signedIn: true, hasStore: true });
  await page.route("http://localhost:3000/product-categories", (route) =>
    route.fulfill({ json: categories, headers }),
  );
  await page.goto("/seller/products/new");
}

test("category search commits only a real choice and dismissal restores the selected label", async ({
  page,
}) => {
  await openProduct(page);
  const combo = page.getByRole("combobox", { name: /^Category/ });
  await chooseOption(page, /^Category/, "Tops");
  await expect(combo).toHaveValue("Tops");
  await expect(
    page.locator('input[type="hidden"][name="categoryId"]'),
  ).toHaveValue("22");
  await combo.click();
  await expect(
    page.getByRole("option", { name: "Tops", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await combo.fill("  jEaN  ");
  await expect(page.getByRole("option")).toHaveCount(1);
  await expect(
    page.getByRole("option", { name: "Jeans", exact: true }),
  ).toBeVisible();
  await combo.press("Escape");
  await expect(combo).toHaveValue("Tops");
  await expect(combo).toBeFocused();
  await expect(page.getByRole("listbox")).toHaveCount(0);
  await combo.click();
  await combo.fill("does not exist");
  await expect(
    page.getByText("No categories found", { exact: true }),
  ).toBeVisible();
  await combo.press("Enter");
  await expect(
    page.locator('input[type="hidden"][name="categoryId"]'),
  ).toHaveValue("22");
  await page.getByLabel("Product title").click();
  await expect(combo).toHaveValue("Tops");
  await expect(page.getByRole("listbox")).toHaveCount(0);
  await combo.click();
  await combo.fill("jean");
  await combo.press("Enter");
  await expect(combo).toHaveValue("Jeans");
  await expect(
    page.locator('input[type="hidden"][name="categoryId"]'),
  ).toHaveValue("21");
  await combo.click();
  await combo.press("Tab");
  await expect(combo).toHaveValue("Jeans");
  await expect(page.getByRole("listbox")).toHaveCount(0);
});

test("dropdown keyboard navigation scrolls long menus and keeps them within the viewport", async ({
  page,
}) => {
  await openProduct(page);
  const combo = page.getByRole("combobox", { name: /^Category/ });
  await combo.evaluate((element) => {
    element.scrollIntoView({ block: "center", behavior: "instant" });
    element.focus({ preventScroll: true });
  });
  const scrollBefore = await page.evaluate(() => window.scrollY);
  await combo.press("ArrowDown");
  await expect(combo).toHaveAttribute("aria-expanded", "true");
  await combo.press("Control+End");
  const last = page.getByRole("option", { name: "Collection 24", exact: true });
  await expect(last).toBeInViewport();
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollBefore);
  const bounds = await page.locator(".select-popover").boundingBox();
  const viewport = page.viewportSize()!;
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.y).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height);
  await combo.press("Enter");
  await expect(combo).toHaveValue("Collection 24");
  await expect(combo).toBeFocused();
  await expect(
    page.getByRole("heading", { name: "Product details", exact: true }),
  ).toBeVisible();
});

test("required dropdown errors focus the control and keyboard choice clears the error", async ({
  page,
}) => {
  await openProduct(page);
  await page.getByLabel("Product title").fill("A carefully chosen product");
  await page
    .getByLabel("The full story")
    .fill("An accurate description of this carefully chosen product.");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  const combo = page.getByRole("combobox", { name: /^Category/ });
  await expect(combo).toBeFocused();
  await expect(combo).toHaveAttribute("aria-invalid", "true");
  await combo.press("ArrowDown");
  await combo.press("ArrowDown");
  await combo.press("Enter");
  await expect(combo).toHaveValue("Tops");
  await expect(combo).toHaveAttribute("aria-invalid", "false");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  const condition = page.getByRole("combobox", {
    name: "Condition",
    exact: true,
  });
  await condition.focus();
  await condition.press(" ");
  await condition.press("End");
  await condition.press("Home");
  await condition.press("p");
  await condition.press("Enter");
  await expect(condition).toHaveValue("Pre-loved");
  await expect(
    page.getByRole("heading", { name: "Price & stock", exact: true }),
  ).toBeVisible();
});

test("optional dropdowns can be cleared and submit null to the API", async ({
  page,
}) => {
  await mockApi(page, { signedIn: true });
  let saved: unknown;
  await page.route("http://localhost:3000/users/me/profile", (route) => {
    if (route.request().method() === "OPTIONS")
      return route.fulfill({ status: 204, headers });
    if (route.request().method() === "PATCH")
      saved = route.request().postDataJSON();
    return route.fulfill({
      json: { ...ownProfile, gender: saved ? null : "MALE" },
      headers,
    });
  });
  await page.route(
    "http://localhost:3000/users/me/profile/completeness",
    (route) => route.fulfill({ json: ownProfile.completion, headers }),
  );
  await page.goto("/account/profile");
  await page.locator(".advanced-fields summary").click();
  const gender = page.getByRole("combobox", { name: "Gender", exact: true });
  await expect(gender).toHaveValue("male");
  await chooseOption(page, "Gender", "Not specified");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(
    page.getByText("Your profile is updated.", { exact: true }),
  ).toBeVisible();
  expect(saved).toEqual({ gender: null });
});
