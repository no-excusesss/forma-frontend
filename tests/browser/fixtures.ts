import type { Page } from "@playwright/test";
export const testOrigin = `http://localhost:${process.env.PLAYWRIGHT_PORT || "3102"}`;
export const now = "2026-01-01T00:00:00.000Z";
export const ownProfile = {
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
const author = { name: "Test reader", image: null, profile: null };
export const ratings = {
  averageRating: 4,
  totalReviews: 1,
  ratingDistribution: { "1": 0, "2": 0, "3": 0, "4": 1, "5": 0 },
};
export const seller = {
  id: 7,
  displayName: "Test Studio",
  slug: "test-studio",
  logoUrl: null,
  verificationStatus: "VERIFIED",
  description: "An independent test studio.",
  bannerUrl: null,
  country: "Nigeria",
  state: "Lagos",
  city: "Ikeja",
  createdAt: now,
  updatedAt: now,
  userId: 1,
  businessName: null,
  businessEmail: null,
  businessPhone: null,
  businessAddress: null,
  statistics: {
    ...ratings,
    activeProducts: 1,
    productsByStatus: { ACTIVE: 1 },
  },
};
export const product = {
  id: 11,
  title: "Test studio chair",
  slug: "test-studio-chair",
  description: "A thoughtful chair with a simple, considered silhouette.",
  shortDescription: "Made for everyday moments.",
  price: "12500.00",
  currency: "NGN",
  discountPrice: "11000.00",
  brand: null,
  condition: "NEW",
  stockQuantity: 3,
  available: true,
  status: "ACTIVE",
  country: "Nigeria",
  state: "Lagos",
  city: "Ikeja",
  createdAt: now,
  updatedAt: now,
  category: { id: 2, name: "Test furniture", slug: "test-furniture" },
  seller,
  images: [],
  ratings,
};
const collection = (items: unknown[], page = 1, total = items.length) => ({
  items,
  pagination: { page, limit: 12, total, totalPages: Math.ceil(total / 12) },
});
const review = {
  id: 31,
  rating: 4,
  title: "Considered details",
  comment: "Test review from a real contract fixture.",
  reviewer: author,
  createdAt: now,
  updatedAt: now,
};
export const user = {
  id: "test-account",
  name: "Test Member",
  email: "member@example.test",
  emailVerified: false,
  createdAt: now,
  updatedAt: now,
};
export async function mockApi(
  page: Page,
  {
    signedIn = false,
    hasStore = false,
    sessionError = false,
  }: { signedIn?: boolean; hasStore?: boolean; sessionError?: boolean } = {},
) {
  let signed = signedIn;
  await page.route("http://localhost:3000/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const headers = {
      "access-control-allow-origin": testOrigin,
      "access-control-allow-credentials": "true",
      "access-control-allow-headers": "content-type",
      "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS",
    };
    if (request.method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers });
      return;
    }
    const send = (
      json: unknown,
      status = 200,
      extra: Record<string, string> = {},
    ) => route.fulfill({ status, json, headers: { ...headers, ...extra } });
    if (path === "/api/auth/get-session")
      return sessionError
        ? send({ message: "Session service unavailable" }, 503)
        : send(
            signed
              ? {
                  user,
                  session: {
                    id: "session",
                    userId: user.id,
                    expiresAt: "2099-01-01T00:00:00Z",
                    createdAt: now,
                    updatedAt: now,
                    token: "test-only",
                  },
                }
              : null,
          );
    if (
      path === "/api/auth/sign-in/email" ||
      path === "/api/auth/sign-up/email"
    ) {
      signed = true;
      return send({ user, token: "test-only" }, 200, {
        "set-cookie":
          "better-auth.session_token=test-only; HttpOnly; SameSite=Lax; Path=/",
      });
    }
    if (path === "/api/auth/sign-out") {
      signed = false;
      return send({ success: true });
    }
    if (path === "/users/me/profile")
      return send({ message: "Profile not created" }, 404);
    if (path === "/sellers/me")
      return hasStore
        ? send(seller)
        : send({ message: "Seller not created" }, 404);
    if (path === "/sellers/me/statistics") return send(seller.statistics);
    if (path === "/product-categories") return send([product.category]);
    if (path === "/products/discovery")
      return send([
        {
          ...product.category,
          productCount: 1,
          products: [
            {
              ...product,
              images: [{ url: "/images/demo-marketplace/boucle-chair.webp" }],
            },
          ],
        },
      ]);
    if (path === "/products/me/listings/11") return send(product);
    if (path === "/products/me/listings") return send(collection([product]));
    if (path === "/products" && request.method() === "GET")
      return send(
        collection([product], Number(url.searchParams.get("page")) || 1, 25),
      );
    if (path === "/products/slug/test-studio-chair" || path === "/products/11")
      return send(product);
    if (path === "/products/11/related") return send(collection([]));
    if (path === "/products/11/reviews" && request.method() === "GET")
      return send({ ...collection([{ ...review, productId: 11 }]), ratings });
    if (path === "/products/11/reviews" && request.method() === "POST")
      return send({ message: "You have already reviewed this product." }, 409);
    if (path === "/sellers/test-studio") return send(seller);
    if (path === "/sellers/test-studio/products")
      return send(collection([product]));
    if (path === "/sellers/test-studio/reviews")
      return send({ ...collection([{ ...review, sellerId: 7 }]), ratings });
    if (path === "/sellers/7/reviews" && request.method() === "POST")
      return send({ ...review, ...request.postDataJSON(), sellerId: 7 }, 201);
    if (path === "/users/me/product-reviews")
      return send(
        collection([
          {
            ...review,
            product: {
              id: 11,
              slug: product.slug,
              title: product.title,
              status: "ARCHIVED",
            },
          },
        ]),
      );
    if (path === "/users/me/seller-reviews")
      return send(
        collection([
          {
            ...review,
            seller: {
              id: 7,
              slug: seller.slug,
              displayName: seller.displayName,
            },
          },
        ]),
      );
    return send(
      { message: `Unexpected test endpoint: ${request.method()} ${path}` },
      404,
    );
  });
}
