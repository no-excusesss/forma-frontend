import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import {
  api,
  ApiError,
  changedFields,
  optional,
  queryString,
  segment,
} from "../src/lib/api";
import {
  moneySchema,
  productSchema,
  profileSchema,
  reviewSchema,
  validateFiles,
} from "../src/lib/validation";
const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});
test("the API sends cookies and preserves the signed-out null response", async () => {
  globalThis.fetch = async (_input, init) => {
    assert.equal(init?.credentials, "include");
    assert.equal(init?.cache, "no-store");
    assert.equal(init?.headers, undefined);
    return Response.json(null);
  };
  assert.equal(await api("/api/auth/get-session"), null);
});
test("JSON is serialized, while multipart keeps the browser-generated content type", async () => {
  let seen = 0;
  globalThis.fetch = async (_input, init) => {
    if (seen++ === 0) {
      assert.equal(init?.body, JSON.stringify({ bio: null }));
      assert.deepEqual(init?.headers, { "Content-Type": "application/json" });
    } else {
      assert.ok(init?.body instanceof FormData);
      assert.equal(init?.headers, undefined);
    }
    return Response.json({ success: true });
  };
  await api("/users/me/profile", { method: "PATCH", body: { bio: null } });
  const body = new FormData();
  body.append("image", new File(["image"], "image.png", { type: "image/png" }));
  await api("/users/me/profile-picture", { method: "POST", body });
});
test("Nest arrays and Better Auth error messages remain useful", async () => {
  globalThis.fetch = async () =>
    Response.json(
      { message: ["Duplicate username", "Try another name"] },
      { status: 409 },
    );
  await assert.rejects(
    api("/users/profile"),
    (error: unknown) =>
      error instanceof ApiError &&
      error.status === 409 &&
      error.messages.length === 2,
  );
  globalThis.fetch = async () =>
    Response.json(
      {
        code: "INVALID_EMAIL_OR_PASSWORD",
        message: "Invalid email or password",
      },
      { status: 401 },
    );
  await assert.rejects(
    api("/api/auth/sign-in/email"),
    /Invalid email or password/,
  );
});
test("only missing profiles become null; network and permission failures stay errors", async () => {
  globalThis.fetch = async () =>
    Response.json({ message: "Not found" }, { status: 404 });
  assert.equal(await optional("/sellers/me"), null);
  globalThis.fetch = async () =>
    Response.json({ message: "Forbidden" }, { status: 403 });
  await assert.rejects(
    optional("/sellers/me"),
    (error: unknown) => error instanceof ApiError && error.status === 403,
  );
  globalThis.fetch = async () => {
    throw new TypeError("Failed to fetch");
  };
  await assert.rejects(
    optional("/users/me/profile"),
    (error: unknown) => error instanceof ApiError && error.status === 0,
  );
});
test("cancellation stays cancellation", async () => {
  const controller = new AbortController();
  controller.abort();
  globalThis.fetch = async (_input, init) => {
    assert.equal(init?.signal, controller.signal);
    throw new DOMException("Cancelled", "AbortError");
  };
  await assert.rejects(api("/products", { signal: controller.signal }), {
    name: "AbortError",
  });
});
test("PATCH omits unchanged fields but preserves explicit null clearing", () => {
  assert.deepEqual(
    changedFields<{ firstName: string; bio: string | null }>(
      { firstName: "Ada", bio: null },
      { firstName: "Ada", bio: "Old bio" },
    ),
    { bio: null },
  );
});
test("queries omit blank filters and safely encode names", () => {
  assert.equal(
    queryString({
      page: 1,
      search: "chair & table",
      city: "",
      status: undefined,
    }),
    "?page=1&search=chair+%26+table",
  );
  assert.equal(segment("a/b?x"), "a%2Fb%3Fx");
});
test("money validation rejects exponent notation, negatives, and excessive precision", () => {
  for (const value of ["1e3", "-1", "2.001", "1000000000000"])
    assert.equal(moneySchema.safeParse(value).success, false);
  for (const value of ["0", "0.50", "999999999999.99"])
    assert.equal(moneySchema.safeParse(value).success, true);
});
const product = {
  title: "Studio chair",
  description: "A considered chair with a solid frame.",
  price: "100.00",
  currency: "NGN",
  discountPrice: null,
  categoryId: 1,
  stockQuantity: 2,
  condition: "NEW",
  status: "DRAFT",
  available: true,
  country: "Nigeria",
  state: "Lagos",
  city: "Ikeja",
  shortDescription: null,
  brand: null,
};
test("products validate category, discounts, stock and optional generated slugs", () => {
  assert.equal(
    productSchema.safeParse({ ...product, slug: null }).success,
    true,
  );
  assert.equal(
    productSchema.safeParse({ ...product, categoryId: 0 }).success,
    false,
  );
  assert.equal(
    productSchema.safeParse({ ...product, discountPrice: "101.00" }).success,
    false,
  );
  assert.equal(
    productSchema.safeParse({ ...product, status: "SOLD_OUT" }).success,
    false,
  );
  assert.equal(
    productSchema.safeParse({
      ...product,
      status: "SOLD_OUT",
      stockQuantity: 0,
    }).success,
    true,
  );
  assert.equal(
    productSchema.safeParse({ ...product, stockQuantity: 1.5 }).success,
    false,
  );
});
test("profile and review validation reject impossible dates and fractional ratings", () => {
  const profile = {
    firstName: "Ada",
    lastName: "Obi",
    username: "ada_obi",
    phoneNumber: null,
    bio: null,
    dateOfBirth: null,
    nationality: null,
    country: null,
    state: null,
    city: null,
    gender: null,
    preferredLanguage: null,
    address: null,
  };
  assert.equal(profileSchema.safeParse(profile).success, true);
  assert.equal(
    profileSchema.safeParse({ ...profile, dateOfBirth: "2025-02-30" }).success,
    false,
  );
  assert.equal(
    profileSchema.safeParse({ ...profile, username: "profile" }).success,
    false,
  );
  assert.equal(
    reviewSchema.safeParse({ rating: 4.5, title: null, comment: "Nice" })
      .success,
    false,
  );
  assert.equal(
    reviewSchema.safeParse({ rating: 5, title: null, comment: "   " }).success,
    false,
  );
});
test("uploads enforce MIME types, size and the combined stored-image limit", () => {
  const image = new File(["ok"], "good.png", { type: "image/png" });
  assert.equal(validateFiles([image]), null);
  assert.match(validateFiles([image], 10)!, /10 images/);
  assert.match(
    validateFiles([new File(["bad"], "bad.svg", { type: "image/svg+xml" })])!,
    /JPEG/,
  );
  assert.match(
    validateFiles([
      new File([new Uint8Array(5 * 1024 * 1024 + 1)], "large.jpg", {
        type: "image/jpeg",
      }),
    ])!,
    /5 MiB/,
  );
});
