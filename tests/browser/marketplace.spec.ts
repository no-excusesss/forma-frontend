import { test, expect } from "@playwright/test";
import { mockApi, product, testOrigin } from "./fixtures";
import { chooseOption } from "./select-helpers";
test("home, mobile navigation and page width", async ({ page }, info) => {
  await mockApi(page);
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: /Good finds.*Great instincts.*Very you/,
    }),
  ).toBeVisible();
  await expect(page.getByText(product.title).first()).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  if (info.project.name === "mobile") {
    await page.getByRole("button", { name: "Open navigation" }).click();
    await page
      .getByRole("navigation", { name: "Mobile navigation" })
      .getByRole("link", { name: "Discover", exact: true })
      .click();
    await expect(page).toHaveURL(/\/products$/);
  } else {
    await page.keyboard.press("Tab");
    await expect(
      page.getByRole("link", { name: "Skip to content" }),
    ).toBeFocused();
  }
});
test("search, filters, sorting and pagination are reflected in API queries", async ({
  page,
}) => {
  await mockApi(page);
  await page.goto("/products?page=2");
  await page
    .getByRole("textbox", { name: "Search products", exact: true })
    .fill("chair");
  await page.getByRole("button", { name: "Submit search" }).click();
  await expect(page).toHaveURL(/search=chair/);
  expect(new URL(page.url()).searchParams.has("page")).toBe(false);
  await chooseOption(page, "Sort products", "Price: low to high");
  await expect(page).toHaveURL(/sort=price_asc/);
  if (
    !(await page
      .getByRole("combobox", { name: "Condition", exact: true })
      .isVisible())
  )
    await page.getByText("Refine your discovery", { exact: true }).click();
  await chooseOption(page, "Condition", "Pre-loved");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page).toHaveURL(/condition=USED/);
  await page.getByRole("button", { name: "Next page" }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(page.getByText("Page 2 of 3")).toBeVisible();
  await page.getByRole("button", { name: "Remove condition filter" }).click();
  await expect(page).not.toHaveURL(/condition=USED/);
  expect(new URL(page.url()).searchParams.has("page")).toBe(false);
});
test("sign in uses cookies; missing profiles retain the session; logout clears private data", async ({
  page,
}) => {
  await mockApi(page);
  await page.goto("/sign-in");
  await page.getByLabel("Email address").fill("member@example.test");
  await page.getByLabel(/^Password/).fill("a-test-password");
  await page.getByRole("button", { name: "Sign in →" }).click();
  await expect(
    page.getByRole("heading", { name: "Nice to meet you." }),
  ).toBeVisible();
  await expect(
    page.getByText("member@example.test · Account email"),
  ).toBeVisible();
  expect(
    (await page.context().cookies()).some(
      (c) => c.name === "better-auth.session_token" && c.httpOnly,
    ),
  ).toBe(true);
  expect(
    await page.evaluate(() =>
      Object.keys(localStorage).filter((key) =>
        /token|auth|session/i.test(key),
      ),
    ),
  ).toEqual([]);
  await page.getByRole("button", { name: "Sign out", exact: false }).click();
  await expect(
    page.getByRole("heading", { name: "Make yourself at home." }),
  ).toBeVisible();
});
test("session server errors stay errors rather than signed-out onboarding", async ({
  page,
}) => {
  await mockApi(page, { sessionError: true });
  await page.goto("/account/profile");
  await expect(page.getByText("Session service unavailable")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Make yourself at home." }),
  ).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
});
test("product slug details, reviews and device-only bag", async ({ page }) => {
  await mockApi(page);
  await page.goto(`/products/${product.slug}`);
  await expect(
    page.getByRole("heading", { name: product.title }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Product reviews (1)" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Save to bag", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Saved to your bag" }),
  ).toBeDisabled();
  await page.getByRole("link", { name: "Your saved bag" }).click();
  await expect(
    page.getByText("Test checkout supports NGN items from multiple stores", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: product.title }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: product.title }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Remove", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Room for something good." }),
  ).toBeVisible();
});
test("review ownership comes from My Reviews; archived reviews can be deleted", async ({
  page,
}) => {
  await mockApi(page, { signedIn: true });
  await page.route(
    "http://localhost:3000/product-reviews/31",
    async (route) => {
      expect(route.request().method()).toBe("DELETE");
      await route.fulfill({
        json: { id: 31, deleted: true },
        headers: {
          "access-control-allow-origin": testOrigin,
          "access-control-allow-credentials": "true",
        },
      });
    },
  );
  await page.goto("/account/reviews");
  await expect(
    page.getByRole("button", { name: "Edit review" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Keep it" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
});
test("seller may exist without a personal profile; owner editor uses numeric private endpoint", async ({
  page,
}) => {
  await mockApi(page, { signedIn: true, hasStore: true });
  const paths: string[] = [];
  page.on("request", (request) => {
    if (request.url().startsWith("http://localhost:3000"))
      paths.push(new URL(request.url()).pathname);
  });
  await page.goto("/seller");
  await expect(
    page.getByRole("heading", { name: "Your store at a glance." }),
  ).toBeVisible();
  await page.goto("/seller/products/11/edit");
  await expect(page.getByLabel("Product title")).toHaveValue(product.title);
  expect(paths).toContain("/products/me/listings/11");
  expect(paths).not.toContain("/products/11");
  await page
    .getByRole("button", { name: "Archive product", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
});
test("seller review creation uses numeric seller ID and product duplicate errors stay visible", async ({
  page,
}) => {
  await mockApi(page, { signedIn: true });
  await page.goto("/stores/test-studio");
  await page.getByRole("tab", { name: /Reviews/ }).click();
  await expect(
    page.getByRole("heading", { name: "Store reviews (1)" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Share your experience" }).click();
  await page
    .getByLabel("Your experience")
    .fill("A thoughtful independent store.");
  const request = page.waitForRequest(
    (r) =>
      new URL(r.url()).pathname === "/sellers/7/reviews" &&
      r.method() === "POST",
  );
  await page.getByRole("button", { name: "Publish review" }).click();
  expect((await request).postDataJSON()).toMatchObject({
    rating: 5,
    comment: "A thoughtful independent store.",
  });
  await expect(
    page.getByText("Your review is published. Thank you for sharing."),
  ).toBeVisible();
  await page.goto(`/products/${product.slug}`);
  await page.getByRole("button", { name: "Share your experience" }).click();
  await page.getByLabel("Your experience").fill("My second review attempt.");
  await page.getByRole("button", { name: "Publish review" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "You have already reviewed" }),
  ).toContainText("You have already reviewed this product.");
  await expect(page.getByLabel("Your experience")).toHaveValue(
    "My second review attempt.",
  );
});
test("form validation preserves inputs and focuses the first invalid field", async ({
  page,
}) => {
  await mockApi(page);
  await page.goto("/sign-up");
  await page.getByRole("button", { name: "Create account →" }).click();
  await expect(page.getByLabel("Your name")).toBeFocused();
  await expect(
    page.getByText("Please check the highlighted fields."),
  ).toBeVisible();
  await page.getByLabel("Your name").fill("Test Member");
  await page.getByLabel("Email address").fill("invalid-email");
  await page.getByRole("button", { name: "Create account →" }).click();
  await expect(page.getByLabel("Your name")).toHaveValue("Test Member");
  await expect(page.getByLabel("Email address")).toBeFocused();
});
