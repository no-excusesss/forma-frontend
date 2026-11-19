import { test, expect, type Page, type Route } from "@playwright/test";
import { mockApi, product, testOrigin } from "./fixtures";
import { chooseOption } from "./select-helpers";
const headers = {
  "access-control-allow-origin": testOrigin,
  "access-control-allow-credentials": "true",
  "access-control-allow-headers": "content-type",
  "access-control-allow-methods": "GET,POST,PATCH,OPTIONS",
};
const reply = (route: Route, json: unknown, status = 200) =>
  route.request().method() === "OPTIONS"
    ? route.fulfill({ status: 204, headers })
    : route.fulfill({ json, status, headers });
async function details(page: Page) {
  await page.getByLabel("Product title").fill("A considered new product");
  await chooseOption(page, /^Category/, product.category.name);
  await page
    .getByLabel("The full story")
    .fill("An accurate and complete product description.");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
}

test("product steps validate in context and preserve details when going back", async ({
  page,
}) => {
  await mockApi(page, { signedIn: true, hasStore: true });
  await page.goto("/seller/products/new");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByLabel("Product title")).toBeFocused();
  await details(page);
  await expect(
    page.getByRole("heading", { name: "Price & stock", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("textbox", { name: /^Price/ })).toBeFocused();
  await page.getByRole("textbox", { name: /^Price/ }).fill("49.00");
  await page.getByLabel("Stock quantity").fill("3");
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page.getByLabel("Product title")).toHaveValue(
    "A considered new product",
  );
  await expect(page.getByRole("combobox", { name: /^Category/ })).toHaveValue(
    product.category.name,
  );
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("textbox", { name: /^Price/ })).toHaveValue(
    "49.00",
  );
  await expect(page.getByLabel("Stock quantity")).toHaveValue("3");
});

test("leaving a changed form requires a choice and keep editing preserves the draft", async ({
  page,
}) => {
  await mockApi(page, { signedIn: true, hasStore: true });
  await page.goto("/seller/products/new");
  await page.getByLabel("Product title").fill("Do not lose this draft");
  await page.getByRole("link", { name: /Back to inventory/ }).click();
  await expect(
    page.getByRole("dialog", { name: "Leave without saving?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Keep editing", exact: true }).click();
  await expect(page.getByLabel("Product title")).toHaveValue(
    "Do not lose this draft",
  );
  await expect(page).toHaveURL(testOrigin + "/seller/products/new");
  await page.getByRole("link", { name: /Back to inventory/ }).click();
  await page
    .getByRole("button", { name: "Discard changes", exact: true })
    .click();
  await expect(page).toHaveURL(testOrigin + "/seller/products");
});

test("publishing catches zero stock and returns to inventory only after API success", async ({
  page,
}) => {
  await mockApi(page, { signedIn: true, hasStore: true });
  let creates = 0;
  await page.route("http://localhost:3000/products", (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    creates++;
    const body = route.request().postDataJSON();
    expect(body).toMatchObject({
      status: "ACTIVE",
      stockQuantity: 2,
      categoryId: product.category.id,
    });
    return reply(route, { ...product, ...body }, 201);
  });
  await page.goto("/seller/products/new");
  await details(page);
  await page.getByRole("textbox", { name: /^Price/ }).fill("25.00");
  await page.getByLabel("Stock quantity").fill("0");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await chooseOption(page, "Save as", "Published — visible to shoppers");
  await page
    .getByRole("button", { name: "Publish product", exact: true })
    .click();
  await expect(
    page.getByText("Add at least one item in stock before publishing."),
  ).toBeVisible();
  await expect(page.getByLabel("Stock quantity")).toBeFocused();
  expect(creates).toBe(0);
  await page.getByLabel("Stock quantity").fill("2");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByRole("button", { name: "Publish product", exact: true })
    .click();
  await expect(page).toHaveURL(testOrigin + "/seller/products");
  await expect(
    page.getByText(
      "Your product is published. You can manage it in inventory.",
    ),
  ).toBeVisible();
  expect(creates).toBe(1);
});

test("optional product fields are revealed and focused when validation needs them", async ({
  page,
}) => {
  await mockApi(page, { signedIn: true, hasStore: true });
  await page.goto("/seller/products/new");
  await page.getByLabel("Product title").fill("A considered new product");
  await chooseOption(page, /^Category/, product.category.name);
  await page
    .getByLabel("The full story")
    .fill("A clear and accurate description.");
  const optional = page.locator('[data-stage="details"] details');
  await optional.locator("summary").click();
  await page
    .getByLabel("Product URL name (optional)")
    .fill("a URL with spaces");
  await optional.locator("summary").click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByLabel("Product URL name (optional)")).toBeFocused();
  await expect(optional).toHaveAttribute("open", "");
});

test("store setup suggests a URL and preserves a manually chosen one across steps", async ({
  page,
}) => {
  await mockApi(page, { signedIn: true });
  await page.goto("/sell");
  await page.getByLabel("Store name").fill("Ada’s Design Studio");
  await expect(page.getByLabel("Store URL name")).toHaveValue(
    "adas-design-studio",
  );
  await page.getByLabel("Store URL name").fill("ada-studio");
  await page.getByLabel("Store name").fill("Ada’s New Studio");
  await expect(page.getByLabel("Store URL name")).toHaveValue("ada-studio");
  await page
    .getByLabel("Your store’s story")
    .fill("Thoughtfully chosen products for everyday living.");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByRole("button", { name: "Create your store →", exact: true })
    .click();
  await expect(page.getByLabel(/^Country/)).toBeFocused();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page.getByLabel("Store URL name")).toHaveValue("ada-studio");
  await expect(page.getByLabel("Store name")).toHaveValue("Ada’s New Studio");
});

test("duplicate category errors keep product details and permit selecting a real existing category", async ({
  page,
}) => {
  await mockApi(page, { signedIn: true, hasStore: true });
  await page.route("http://localhost:3000/product-categories", (route) =>
    reply(
      route,
      route.request().method() === "POST"
        ? { message: "Already exists" }
        : [product.category],
      route.request().method() === "POST" ? 409 : 200,
    ),
  );
  await page.goto("/seller/products/new");
  await page.getByLabel("Product title").fill("Keep my product details");
  await page
    .getByRole("button", { name: "+ Create category", exact: true })
    .click();
  await page.getByLabel("Category name").fill(product.category.name);
  await page
    .getByRole("button", { name: "Create category & continue", exact: true })
    .click();
  await expect(
    page.getByRole("alert").filter({ hasText: "already exists" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Not now", exact: true }).click();
  await expect(page.getByLabel("Product title")).toHaveValue(
    "Keep my product details",
  );
  await chooseOption(page, /^Category/, product.category.name);
  await expect(page.getByRole("combobox", { name: /^Category/ })).toHaveValue(
    product.category.name,
  );
});
