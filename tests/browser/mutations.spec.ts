import { test, expect, type Route } from "@playwright/test";
import { mockApi, product, seller, now, testOrigin } from "./fixtures";
import { chooseOption } from "./select-helpers";
const headers = {
  "access-control-allow-origin": testOrigin,
  "access-control-allow-credentials": "true",
  "access-control-allow-headers": "content-type",
  "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS",
};
async function reply(route: Route, json: unknown, status = 200) {
  if (route.request().method() === "OPTIONS")
    return route.fulfill({ status: 204, headers });
  return route.fulfill({ json, status, headers });
}
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
  "base64",
);
test("profile creation, nullable PATCH and picture multipart management", async ({
  page,
}) => {
  await mockApi(page, { signedIn: true });
  let own: Record<string, unknown> | null = null;
  await page.route("http://localhost:3000/users/profile", async (route) => {
    if (route.request().method() === "OPTIONS") return reply(route, null);
    const body = route.request().postDataJSON();
    expect(Object.keys(body).sort()).toEqual(
      [
        "firstName",
        "lastName",
        "username",
        "phoneNumber",
        "bio",
        "dateOfBirth",
        "nationality",
        "country",
        "state",
        "city",
        "gender",
        "preferredLanguage",
        "address",
      ].sort(),
    );
    own = {
      ...body,
      id: 1,
      userId: 1,
      email: "member@example.test",
      profilePicture: null,
      createdAt: now,
      updatedAt: now,
      accountCreatedAt: now,
      isSeller: false,
      seller: null,
      completion: { complete: false, missingFields: ["profilePicture"] },
    };
    return reply(route, own, 201);
  });
  await page.route("http://localhost:3000/users/me/profile", async (route) => {
    if (route.request().method() === "OPTIONS") return reply(route, null);
    if (route.request().method() === "PATCH") {
      expect(route.request().postDataJSON()).toEqual({ bio: null });
      own = { ...own, bio: null, updatedAt: "2026-01-02T00:00:00Z" };
    }
    return reply(route, own || { message: "Not created" }, own ? 200 : 404);
  });
  await page.route(
    "http://localhost:3000/users/me/profile/completeness",
    (route) =>
      reply(route, { complete: false, missingFields: ["profilePicture"] }),
  );
  await page.route(
    "http://localhost:3000/users/me/profile-picture",
    async (route) => {
      if (route.request().method() === "OPTIONS") return reply(route, null);
      if (route.request().method() === "POST") {
        expect(route.request().headers()["content-type"]).toContain(
          "multipart/form-data; boundary=",
        );
        expect(route.request().postDataBuffer()!.toString()).toContain(
          'name="image"',
        );
        own = {
          ...own,
          profilePicture: `data:image/png;base64,${png.toString("base64")}`,
        };
      } else {
        expect(route.request().method()).toBe("DELETE");
        own = { ...own, profilePicture: null };
      }
      return reply(route, own);
    },
  );
  await page.goto("/account/profile");
  await page.getByLabel("First name").fill("Ada");
  await page.getByLabel("Last name").fill("Obi");
  await page.getByLabel("Username").fill("test_member");
  await page.getByLabel("A little about you").fill("Original bio");
  await page
    .getByRole("button", { name: "Create profile", exact: true })
    .click();
  await expect(page).toHaveURL(`${testOrigin}/`);
  await expect(
    page.getByRole("button", { name: "Your account, Ada Obi" }),
  ).toBeVisible();
  await expect(page.getByText("Your profile is ready.")).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Your account, Ada Obi" }).click();
  await expect(page.getByText("Signed in", { exact: true })).toBeVisible();
  await page
    .getByRole("navigation", { name: "Account navigation" })
    .getByRole("link", { name: "My profile" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Make it personal." }),
  ).toBeVisible();
  await page.getByLabel("A little about you").fill("");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page).toHaveURL(`${testOrigin}/`);
  await expect(page.getByText("Your profile is updated.")).toBeVisible();
  await page.getByRole("button", { name: "Your account, Ada Obi" }).click();
  await page
    .getByRole("navigation", { name: "Account navigation" })
    .getByRole("link", { name: "My profile" })
    .click();
  await page
    .getByLabel("Choose an image")
    .setInputFiles({ name: "avatar.png", mimeType: "image/png", buffer: png });
  await page.getByRole("button", { name: "Upload image", exact: true }).click();
  await expect(page.getByText("Profile picture updated.")).toBeVisible();
  await expect(
    page
      .getByRole("button", { name: "Your account, Ada Obi" })
      .getByRole("img"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Remove image", exact: true }).click();
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(page.getByText("Profile picture removed.")).toBeVisible();
  await expect(
    page
      .getByRole("button", { name: "Your account, Ada Obi" })
      .getByRole("img"),
  ).toHaveCount(0);
});
test("new listing survives image failure and retry never creates a duplicate", async ({
  page,
}) => {
  await mockApi(page, { signedIn: true, hasStore: true });
  let createCount = 0;
  let uploadCount = 0;
  const saved = { ...product, status: "DRAFT" };
  await page.route("http://localhost:3000/products", async (route) => {
    if (route.request().method() === "OPTIONS") return reply(route, null);
    createCount++;
    const body = route.request().postDataJSON();
    expect(body).toMatchObject({
      title: "New test product",
      categoryId: 2,
      price: "120.00",
      stockQuantity: 2,
      status: "DRAFT",
    });
    expect(body).not.toHaveProperty("sellerId");
    expect(body).not.toHaveProperty("images");
    expect(body).not.toHaveProperty("slug");
    return reply(route, { ...saved, ...body }, 201);
  });
  await page.route("http://localhost:3000/products/11", async (route) => {
    expect(route.request().method()).toMatch(/PATCH|OPTIONS/);
    return reply(route, saved);
  });
  await page.route(
    "http://localhost:3000/products/11/images",
    async (route) => {
      if (route.request().method() === "OPTIONS") return reply(route, null);
      uploadCount++;
      expect(route.request().postDataBuffer()!.toString()).toContain(
        'name="images"',
      );
      return uploadCount === 1
        ? reply(
            route,
            { message: "Image storage temporarily unavailable" },
            503,
          )
        : reply(route, saved, 201);
    },
  );
  await page.goto("/seller/products/new");
  await page.getByLabel("Product title").fill("New test product");
  await page
    .getByLabel("The full story")
    .fill("A complete and accurate test description.");
  await chooseOption(page, /^Category/, product.category.name);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByLabel(/^Price/).fill("120.00");
  await page.getByLabel("Stock quantity").fill("2");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByLabel("Add product images")
    .setInputFiles({ name: "product.png", mimeType: "image/png", buffer: png });
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(
    page.getByText("Your listing was saved (ID 11)", { exact: false }),
  ).toBeVisible();
  expect(createCount).toBe(1);
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page).toHaveURL(/\/seller\/products$/);
  expect(createCount).toBe(1);
  expect(uploadCount).toBe(2);
});
test("owner PATCH omits unchanged fields; archive and restore preserve images and reviews", async ({
  page,
}) => {
  await mockApi(page, { signedIn: true, hasStore: true });
  let current = { ...product };
  const patches: unknown[] = [];
  await page.route("http://localhost:3000/products/me/listings/11", (route) =>
    reply(route, current),
  );
  await page.route("http://localhost:3000/products/11", async (route) => {
    const request = route.request();
    if (request.method() === "OPTIONS") return reply(route, null);
    if (request.method() === "DELETE") {
      current = {
        ...current,
        status: "ARCHIVED",
        available: false,
        updatedAt: "2026-01-03T00:00:00Z",
      };
      return reply(route, { id: 11, status: "ARCHIVED" });
    }
    expect(request.method()).toBe("PATCH");
    const body = request.postDataJSON();
    patches.push(body);
    current = { ...current, ...body, updatedAt: "2026-01-02T00:00:00Z" };
    return reply(route, current);
  });
  await page.goto("/seller/products/11/edit");
  await page.getByLabel("Stock quantity").fill("5");
  await page.getByRole("button", { name: "Save product", exact: true }).click();
  await expect(page.getByText("Your product is saved.")).toBeVisible();
  expect(patches[0]).toEqual({ stockQuantity: 5 });
  await page
    .getByRole("button", { name: "Archive product", exact: true })
    .click();
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Restore product", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Restore product", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Archive product", exact: true }),
  ).toBeVisible();
  expect(patches[1]).toEqual({ status: "ACTIVE", available: true });
  expect(current.images).toEqual(product.images);
});
test("seller onboarding and settings use only store DTO fields", async ({
  page,
}) => {
  await mockApi(page, { signedIn: true });
  let own: typeof seller | null = null;
  await page.route("http://localhost:3000/sellers", async (route) => {
    if (route.request().method() === "OPTIONS") return reply(route, null);
    const body = route.request().postDataJSON();
    expect(Object.keys(body).sort()).toEqual(
      [
        "displayName",
        "slug",
        "description",
        "country",
        "state",
        "city",
        "businessName",
        "businessEmail",
        "businessPhone",
        "businessAddress",
      ].sort(),
    );
    own = { ...seller, ...body };
    return reply(route, own, 201);
  });
  await page.route("http://localhost:3000/sellers/me", async (route) => {
    if (route.request().method() === "OPTIONS") return reply(route, null);
    if (route.request().method() === "PATCH") {
      expect(route.request().postDataJSON()).toEqual({
        description: "An updated test studio description.",
      });
      own = {
        ...own!,
        description: "An updated test studio description.",
        updatedAt: "2026-01-02T00:00:00Z",
      };
    }
    return reply(route, own || { message: "Not created" }, own ? 200 : 404);
  });
  await page.goto("/sell");
  await page.getByLabel("Store name").fill("Test Studio");
  await page.getByLabel("Store URL name").fill("test-studio");
  await page
    .getByLabel("Your store’s story")
    .fill("An independent test studio.");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByLabel("Country", { exact: false }).fill("Nigeria");
  await page.getByLabel("State / region").fill("Lagos");
  await page.getByLabel("City", { exact: false }).fill("Ikeja");
  await page.getByRole("button", { name: "Create your store →" }).click();
  await expect(page).toHaveURL(/\/seller$/);
  await expect(
    page.getByRole("heading", { name: "Your store at a glance." }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Store settings", exact: true }).click();
  await page
    .getByLabel("Your store’s story")
    .fill("An updated test studio description.");
  await page.getByRole("button", { name: "Save store details" }).click();
  await expect(page.getByText("Your store is updated.")).toBeVisible();
});
test("missing categories block creation without inventing an ID", async ({
  page,
}) => {
  await mockApi(page, { signedIn: true, hasStore: true });
  await page.route("http://localhost:3000/product-categories", (route) =>
    reply(route, []),
  );
  await page.goto("/seller/products/new");
  await expect(
    page.getByRole("dialog", { name: "Create your first category" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Not now", exact: true }).click();
  await expect(
    page.getByRole("combobox", { name: /^Category/ }),
  ).toBeDisabled();
  await page
    .getByLabel("Product title")
    .fill("A product without a category yet");
  await page
    .getByLabel("The full story")
    .fill("A clear description for this product.");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(
    page.getByText("Choose a category or create a new one."),
  ).toBeVisible();
  await expect(page.getByLabel("Product title")).toHaveValue(
    "A product without a category yet",
  );
  await expect(
    page.getByRole("button", { name: "Save draft", exact: true }),
  ).toHaveCount(0);
});
test("homepage loads its featured product image and fits the viewport", async ({
  page,
}, info) => {
  await mockApi(page);
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: /Good finds.*Great instincts.*Very you/,
    }),
  ).toBeVisible();
  const photo = page.locator(".market-hero-card").getByRole("img", {
    name: product.title,
  });
  await expect(photo).toBeVisible();
  await expect
    .poll(() => photo.evaluate((el) => (el as HTMLImageElement).naturalWidth), {
      timeout: 20_000,
    })
    .toBeGreaterThan(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect(page.locator(".market-collage")).toHaveAttribute(
    "aria-busy",
    "false",
  );
  await page.screenshot({ path: info.outputPath("home.png"), fullPage: true });
});
