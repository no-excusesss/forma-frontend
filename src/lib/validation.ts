import { z } from "zod";
const text = (min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min, `Use at least ${min} characters.`)
    .max(max, `Use no more than ${max} characters.`);
const nullable = (max: number, min = 0) => text(min, max).nullable();
const phone = z
  .string()
  .regex(/^\+?[0-9 ()-]{7,30}$/, "Enter a valid phone number.")
  .nullable();
const slug = (
  min: number,
  max: number,
  message = "Use lowercase letters, numbers, and single hyphens.",
) => text(min, max).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, message);
export const moneySchema = z
  .string()
  .regex(
    /^\d{1,12}(?:\.\d{1,2})?$/,
    "Use a nonnegative amount with up to 2 decimal places.",
  );
export const profileSchema = z.object({
  firstName: text(1, 80),
  lastName: text(1, 80),
  username: text(3, 40)
    .regex(/^[a-z0-9_]+$/, "Use lowercase letters, numbers, and underscores.")
    .refine((v) => !["me", "profile"].includes(v), "Choose another username."),
  phoneNumber: phone,
  bio: nullable(2000),
  dateOfBirth: z
    .string()
    .refine(
      (v) =>
        /^\d{4}-\d{2}-\d{2}$/.test(v) &&
        !Number.isNaN(Date.parse(v)) &&
        new Date(v).toISOString().slice(0, 10) === v &&
        v >= "1900-01-01" &&
        v <=
          new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Lagos" }),
      "Enter a valid birth date from 1900 through today.",
    )
    .nullable(),
  nationality: nullable(80, 1),
  country: nullable(80, 1),
  state: nullable(100, 1),
  city: nullable(100, 1),
  gender: z
    .enum(["MALE", "FEMALE", "NON_BINARY", "OTHER", "PREFER_NOT_TO_SAY"])
    .nullable(),
  preferredLanguage: z
    .string()
    .max(20)
    .regex(
      /^[a-zA-Z]{2,8}(?:-[a-zA-Z0-9]{1,8})*$/,
      "Enter a language tag, such as en or en-NG.",
    )
    .nullable(),
  address: nullable(500),
});
export const sellerSchema = z.object({
  displayName: text(2, 120),
  slug: slug(
    3,
    80,
    "Enter a store URL name like my-store. Use lowercase letters, numbers, and single hyphens.",
  ).refine(
    (v) => !["me", "id", "stats"].includes(v),
    "Choose another store URL name.",
  ),
  description: text(10, 5000),
  country: text(1, 80),
  state: text(1, 100),
  city: text(1, 100),
  businessName: nullable(160, 1),
  businessEmail: z.email().max(254).nullable(),
  businessPhone: phone,
  businessAddress: nullable(500),
});
export const categorySchema = z.object({
  name: text(2, 100),
  slug: slug(2, 80),
});
export const productSchema = z
  .object({
    title: text(2, 200),
    slug: z.preprocess(
      (v) => (v === null || v === "" ? undefined : v),
      slug(3, 100).optional(),
    ),
    description: text(10, 10000),
    shortDescription: nullable(500),
    price: moneySchema,
    currency: z
      .string()
      .trim()
      .toUpperCase()
      .refine(
        (v) => Intl.supportedValuesOf("currency").includes(v),
        "Enter a valid ISO currency, such as NGN or USD.",
      ),
    discountPrice: moneySchema.nullable(),
    categoryId: z
      .number({ error: "Choose a category or create a new one." })
      .int()
      .positive("Choose a category."),
    brand: nullable(100),
    condition: z.enum(["NEW", "USED", "REFURBISHED"]),
    stockQuantity: z.number().int().min(0).max(2147483647),
    available: z.boolean(),
    status: z.enum(["DRAFT", "ACTIVE", "SOLD_OUT", "ARCHIVED"]),
    country: text(1, 80),
    state: text(1, 100),
    city: text(1, 100),
  })
  .refine(
    (v) =>
      v.discountPrice === null || Number(v.discountPrice) <= Number(v.price),
    {
      path: ["discountPrice"],
      message: "Discount price cannot exceed the regular price.",
    },
  )
  .refine((v) => v.status !== "SOLD_OUT" || v.stockQuantity === 0, {
    path: ["stockQuantity"],
    message: "Sold-out listings must have zero stock.",
  });
export const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: nullable(200),
  comment: text(1, 5000),
});
export const signInSchema = z.object({
  email: z.email(),
  password: z.string().min(8).max(128),
  rememberMe: z.boolean(),
});
export const signUpSchema = z.object({
  name: text(1, 120),
  email: z.email(),
  password: z.string().min(8, "Use at least 8 characters.").max(128),
});
export function validateFiles(files: File[], existing = 0) {
  if (files.length + existing > 10)
    return "A product can have at most 10 images.";
  for (const file of files) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
      return "Choose JPEG, PNG, or WebP images.";
    if (file.size > 5 * 1024 * 1024)
      return "Each image must be 5 MiB or smaller.";
  }
  return null;
}
