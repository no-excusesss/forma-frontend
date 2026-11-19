import { test, expect } from "@playwright/test";
import { mockApi, testOrigin, now } from "./fixtures";

const profile = {
  id: 1,
  userId: 1,
  firstName: "Ada",
  lastName: "Obi",
  username: "ada_obi",
  email: "member@example.test",
  bio: null,
  phoneNumber: null,
  dateOfBirth: null,
  nationality: null,
  country: null,
  state: null,
  city: null,
  gender: null,
  preferredLanguage: null,
  address: null,
  profilePicture: null,
  isSeller: false,
  seller: null,
  completion: { complete: false, missingFields: ["profilePicture"] },
  createdAt: now,
  updatedAt: now,
  accountCreatedAt: now,
};
const headers = {
  "access-control-allow-origin": testOrigin,
  "access-control-allow-credentials": "true",
  "access-control-allow-headers": "content-type",
  "access-control-allow-methods": "GET,POST,PATCH,OPTIONS",
};

test("signed-in account is visible, keyboard accessible, and logs out from home", async ({
  page,
}) => {
  await mockApi(page, { signedIn: true });
  await page.route("http://localhost:3000/users/me/profile", (route) =>
    route.fulfill({ json: profile, headers }),
  );
  await page.goto("/");
  const account = page.getByRole("button", { name: "Your account, Ada Obi" });
  await expect(account).toBeVisible();
  await expect(page.locator(".account-first-name")).toHaveText("Ada");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await account.click();
  await expect(page.getByText("Signed in", { exact: true })).toBeVisible();
  await expect(
    page
      .getByRole("navigation", { name: "Account navigation" })
      .getByRole("link", { name: "My profile" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(account).toBeFocused();
  await expect(
    page.getByRole("navigation", { name: "Account navigation" }),
  ).toHaveCount(0);
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(
    page
      .getByRole("banner")
      .getByRole("link", { name: "Sign in", exact: true }),
  ).toBeVisible();
  await expect(account).toHaveCount(0);
  await expect(page.getByText("You’re signed out.")).toBeVisible();
});

test("failed profile save keeps inputs and authenticated identity without redirecting", async ({
  page,
}) => {
  await mockApi(page, { signedIn: true });
  await page.route("http://localhost:3000/users/me/profile", async (route) => {
    if (route.request().method() === "OPTIONS")
      return route.fulfill({ status: 204, headers });
    if (route.request().method() === "PATCH")
      return route.fulfill({
        status: 409,
        json: { message: "This username is already taken." },
        headers,
      });
    return route.fulfill({ json: profile, headers });
  });
  await page.route(
    "http://localhost:3000/users/me/profile/completeness",
    (route) => route.fulfill({ json: profile.completion, headers }),
  );
  await page.goto("/account/profile");
  await page.getByLabel("Username").fill("taken_username");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByText("This username is already taken.")).toBeVisible();
  await expect(page).toHaveURL(`${testOrigin}/account/profile`);
  await expect(page.getByLabel("Username")).toHaveValue("taken_username");
  await expect(
    page.getByRole("button", { name: "Your account, Ada Obi" }),
  ).toBeVisible();
});

test("session errors are distinguished from being signed out in the header", async ({
  page,
}) => {
  await mockApi(page, { sessionError: true });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Retry account" }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("banner")
      .getByRole("link", { name: "Sign in", exact: true }),
  ).toHaveCount(0);
});
