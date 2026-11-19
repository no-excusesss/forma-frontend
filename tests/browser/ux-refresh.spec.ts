import { expect, test } from "@playwright/test";
import { mockApi, seller, testOrigin } from "./fixtures";
const headers = {
  "access-control-allow-origin": testOrigin,
  "access-control-allow-credentials": "true",
};
test("discovery has honest empty and failure states instead of static category content", async ({
  page,
}) => {
  await mockApi(page);
  await page.route("http://localhost:3000/products/discovery", (route) =>
    route.fulfill({ headers, json: [] }),
  );
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Good things are on their way." }),
  ).toBeVisible();
  await expect(page.locator(".market-world")).toHaveCount(0);
  await page.route("http://localhost:3000/products/discovery", (route) =>
    route.fulfill({
      headers,
      status: 503,
      json: { message: "Temporarily unavailable" },
    }),
  );
  await page.reload();
  await expect(
    page
      .locator(".market-collage")
      .getByRole("button", { name: "Try again", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".market-collage img")).toHaveCount(0);
});

test("loading combines global activity with a stable local skeleton", async ({
  page,
}) => {
  await mockApi(page, { signedIn: true });
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("http://localhost:3000/users/me/profile", async (route) => {
    await gate;
    return route.fulfill({
      headers,
      status: 404,
      json: { message: "No profile" },
    });
  });
  await page.goto("/account/profile");
  await expect(
    page.getByText("Getting things ready", { exact: true }),
  ).toBeVisible();
  await expect(
    page.locator(".loading-content .skeleton").first(),
  ).toBeVisible();
  await expect(
    page.getByRole("progressbar", { name: "Loading content" }),
  ).toBeVisible();
  release();
  await expect(
    page.getByRole("heading", { name: "Nice to meet you." }),
  ).toBeVisible();
  await expect(page.locator(".loading-panel")).toHaveCount(0);
});

test("store reviews have a visible tab, readable public reviews and a sign-in return path", async ({
  page,
}, info) => {
  await mockApi(page);
  await page.goto(`/stores/${seller.slug}`);
  const reviews = page.getByRole("tab", { name: /Reviews/ });
  await reviews.click();
  await expect(
    page.getByRole("heading", { name: "Store reviews (1)" }),
  ).toBeVisible();
  await expect(
    page.getByText("Considered details", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Share your experience" }).click();
  await expect(
    page
      .locator(".review-form")
      .getByRole("link", { name: "Sign in", exact: true }),
  ).toHaveAttribute(
    "href",
    `/sign-in?next=${encodeURIComponent(`/stores/${seller.slug}?tab=reviews`)}`,
  );
  await page.screenshot({
    path: info.outputPath("store-reviews.png"),
    fullPage: true,
  });
  await reviews.focus();
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByRole("tab", { name: /Products/ })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await page.goto(`/stores/${seller.slug}?tab=reviews`);
  await expect(page.getByRole("tab", { name: /Reviews/ })).toHaveAttribute(
    "aria-selected",
    "true",
  );
});
