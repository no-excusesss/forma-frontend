import { expect, test } from "@playwright/test";
import { mockApi, product, testOrigin } from "./fixtures";
import { money } from "../../src/lib/money";

const headers = {
  "access-control-allow-origin": testOrigin,
  "access-control-allow-credentials": "true",
};

test("cart loading keeps full-width item skeletons and a stable summary until all prices arrive", async ({
  page,
}, info) => {
  await mockApi(page);
  await page.addInitScript(() =>
    localStorage.setItem("forma-device-bag-v1", "[11,12]"),
  );
  let first = () => {};
  let second = () => {};
  const firstGate = new Promise<void>((resolve) => {
    first = resolve;
  });
  const secondGate = new Promise<void>((resolve) => {
    second = resolve;
  });
  await page.route("http://localhost:3000/products/11", async (route) => {
    await firstGate;
    await route.fulfill({ headers, json: product });
  });
  await page.route("http://localhost:3000/products/12", async (route) => {
    await secondGate;
    await route.fulfill({
      headers,
      json: {
        ...product,
        id: 12,
        title: "Another considered chair",
        slug: "another-chair",
      },
    });
  });
  await page.goto("/cart");
  const rows = page.locator(".bag-row");
  await expect(rows).toHaveCount(2);
  await expect(page.locator(".bag-loading-thumbnail")).toHaveCount(2);
  await expect(page.locator(".bag-loading-details")).toHaveCount(2);
  await expect(
    page.locator(".bag-items-heading").getByRole("status"),
  ).toHaveText("Checking your saved finds…");
  await expect(page.locator(".bag-items .loading-panel")).toHaveCount(0);
  const summary = page.getByRole("complementary", {
    name: "Your saved collection",
  });
  await expect(
    summary.getByRole("button", { name: "Checking prices…", exact: true }),
  ).toBeDisabled();
  const rowBounds = (await rows.first().boundingBox())!;
  const thumbnail = (await page
    .locator(".bag-loading-thumbnail")
    .first()
    .boundingBox())!;
  const details = (await page
    .locator(".bag-loading-details")
    .first()
    .boundingBox())!;
  expect(details.x).toBeGreaterThanOrEqual(thumbnail.x + thumbnail.width);
  expect(details.width).toBeGreaterThan(thumbnail.width);
  expect(
    Math.abs(details.x + details.width - rowBounds.x - rowBounds.width),
  ).toBeLessThan(2);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({
    path: info.outputPath("bag-loading.png"),
    fullPage: true,
  });
  first();
  await expect(
    page.getByRole("heading", { name: product.title, exact: true }),
  ).toBeVisible();
  await expect(page.locator(".bag-loading-thumbnail")).toHaveCount(1);
  await expect(
    summary.getByRole("link", { name: "Review checkout", exact: true }),
  ).toHaveCount(0);
  second();
  await expect(
    page.getByRole("heading", {
      name: "Another considered chair",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator(".bag-loading-thumbnail")).toHaveCount(0);
  await expect(
    summary.getByRole("link", { name: "Review checkout", exact: true }),
  ).toBeVisible();
  await expect(
    summary.getByText(
      money(String(2 * Number(product.discountPrice)), product.currency),
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    page.locator(".bag-items-heading").getByRole("status"),
  ).toHaveText("Your saved finds");
  expect(
    Math.abs((await rows.first().boundingBox())!.width - rowBounds.width),
  ).toBeLessThan(2);
});

test("a failed cart item uses the whole row and retry restores checkout", async ({
  page,
}) => {
  await mockApi(page);
  await page.addInitScript(() =>
    localStorage.setItem("forma-device-bag-v1", "[11]"),
  );
  let fail = true;
  await page.route("http://localhost:3000/products/11", (route) =>
    route.fulfill({
      headers,
      status: fail ? 503 : 200,
      json: fail
        ? {
            message:
              "We could not load the current product details. Please try again.",
          }
        : product,
    }),
  );
  await page.goto("/cart");
  const error = page.locator(".bag-row-error");
  await expect(error.getByRole("alert")).toBeVisible();
  const row = (await page.locator(".bag-row").boundingBox())!;
  expect(Math.abs((await error.boundingBox())!.width - row.width)).toBeLessThan(
    2,
  );
  await expect(
    page.getByRole("button", {
      name: "Check items before checkout",
      exact: true,
    }),
  ).toBeDisabled();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  fail = false;
  await error.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: product.title, exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Review checkout", exact: true }),
  ).toBeVisible();
});
