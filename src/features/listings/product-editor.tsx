"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { api, ApiError, changedFields, segment } from "@/lib/api";
import type { Category, Product } from "@/lib/contracts";
import { productSchema, validateFiles } from "@/lib/validation";
import { useAuth, useOwnSeller, useRefresh } from "@/providers/app-provider";
import { DataForm, type FieldSpec, type FormStage } from "@/components/forms";
import { CategoryCreateDialog } from "@/features/categories/category-create";
import { money } from "@/lib/money";
import { FilePicker, ProductImages } from "@/components/uploads";
import { ConfirmDialog, ErrorState, Loading, PageIntro } from "@/components/ui";
const productStages: FormStage[] = [
  {
    id: "details",
    label: "Product details",
    description: "Start with a name, category, and a clear description.",
  },
  {
    id: "pricing",
    label: "Price & stock",
    description: "Set your price and tell shoppers what’s available.",
  },
  {
    id: "publish",
    label: "Review & save",
    description:
      "Add photos, check the location, then save privately or publish.",
  },
];
export function ProductEditor({ id }: { id?: number }) {
  const auth = useAuth();
  const store = useOwnSeller();
  const refresh = useRefresh();
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [archive, setArchive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [categorySelection, setCategorySelection] = useState<Category | null>(
    null,
  );
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [categoryDismissed, setCategoryDismissed] = useState(false);
  const [draftValues, setDraftValues] = useState<Record<string, unknown>>({});
  const [visibility, setVisibility] = useState<string | null>(null);
  const created = useRef<Product | null>(null);
  const lastSaved = useRef<Record<string, unknown>>({});
  const product = useQuery({
    queryKey: ["private", auth.user?.id, "listing", id],
    queryFn: ({ signal }) =>
      api<Product>(`/products/me/listings/${id}`, { signal }),
    enabled: !!id && !!auth.user,
  });
  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: ({ signal }) => api<Category[]>("/product-categories", { signal }),
  });
  if ((id && product.isPending) || categories.isPending) return <Loading />;
  if (product.error)
    return (
      <ErrorState
        error={product.error}
        retry={() => {
          void product.refetch();
        }}
      />
    );
  if (categories.error && !categories.data)
    return (
      <ErrorState
        error={categories.error}
        retry={() => {
          void categories.refetch();
        }}
      />
    );
  const p = product.data;
  const availableCategories = [...(categories.data || [])];
  if (
    categorySelection &&
    !availableCategories.some(
      (category) => category.id === categorySelection.id,
    )
  )
    availableCategories.push(categorySelection);
  if (
    p &&
    !availableCategories.some((category) => category.id === p.category.id)
  )
    availableCategories.push(p.category);
  const fields: FieldSpec[] = [
    {
      name: "title",
      label: "Product title",
      required: true,
      maxLength: 200,
      section: "1. The essentials",
    },
    {
      name: "slug",
      label: "Product URL name (optional)",
      nullable: true,
      placeholder: "Leave blank to generate from your title",
      help: "Used in the product link. Use lowercase letters, numbers, and hyphens. An existing URL stays the same when you edit the title.",
    },
    {
      name: "description",
      label: "The full story",
      type: "textarea",
      required: true,
      maxLength: 10000,
      help: "At least 10 characters. Describe exactly what someone can expect.",
    },
    {
      name: "shortDescription",
      label: "The short version",
      type: "textarea",
      nullable: true,
      maxLength: 500,
    },
    {
      name: "price",
      label: "Price",
      required: true,
      placeholder: "0.00",
      section: "2. Price & category",
    },
    {
      name: "discountPrice",
      label: "Discount price",
      nullable: true,
      placeholder: "Optional",
    },
    {
      name: "currency",
      label: "Currency",
      required: true,
      placeholder: "NGN",
      help: "An ISO currency code, for example NGN, USD, or GBP.",
    },
    {
      name: "categoryId",
      searchable: true,
      optionsLabel: "categories",
      label: "Category",
      type: "number",
      required: true,
      value: categorySelection?.id ?? p?.category.id ?? "",
      onValueChange: (value) =>
        setCategorySelection(
          availableCategories.find(
            (category) => category.id === Number(value),
          ) || null,
        ),
      disabled: !availableCategories.length,
      placeholder: availableCategories.length
        ? "Choose a category"
        : "Create your first category",
      help: !availableCategories.length
        ? "Add one category to continue. Your product details stay on this page."
        : undefined,
      action: (
        <button
          type="button"
          className="field-action"
          onClick={() => setCategoryOpen(true)}
        >
          + Create category
        </button>
      ),
      options: availableCategories.map((c) => ({
        value: String(c.id),
        label: c.name,
      })),
    },
    { name: "brand", label: "Brand", nullable: true, maxLength: 100 },
    {
      name: "condition",
      label: "Condition",
      options: ["NEW", "USED", "REFURBISHED"].map((v) => ({
        value: v,
        label: v === "USED" ? "Pre-loved" : v.toLowerCase(),
      })),
      required: true,
    },
    {
      name: "stockQuantity",
      section: "3. Stock & visibility",
      label: "Stock quantity",
      type: "number",
      min: "0",
      max: "2147483647",
      step: "1",
      required: true,
    },
    {
      name: "status",
      label: p ? "Listing status" : "Save as",
      required: true,
      value: visibility ?? p?.status ?? "DRAFT",
      onValueChange: setVisibility,
      options: (p
        ? ["DRAFT", "ACTIVE", "SOLD_OUT", "ARCHIVED"]
        : ["DRAFT", "ACTIVE"]
      ).map((v) => ({
        value: v,
        label:
          v === "DRAFT"
            ? "Draft — only visible to me"
            : v === "ACTIVE"
              ? "Published — visible to shoppers"
              : v.toLowerCase().replaceAll("_", " "),
      })),
      help: "Active listings need positive stock and availability to appear publicly.",
    },
    {
      name: "available",
      label: "Available for public discovery",
      type: "checkbox",
      wide: true,
      help: "Turn off to temporarily hide your listing.",
    },
    {
      name: "country",
      label: "Country",
      required: true,
      section: "4. Product location",
    },
    { name: "state", label: "State / region", required: true },
    { name: "city", label: "City", required: true },
  ];
  const initial: Record<string, unknown> = {
    condition: "NEW",
    status: "DRAFT",
    available: true,
    stockQuantity: 1,
    currency: "NGN",
    country: store.data?.country || "",
    state: store.data?.state || "",
    city: store.data?.city || "",
  };
  if (p)
    fields.forEach(
      (f) =>
        (initial[f.name] =
          f.name === "categoryId"
            ? p.category.id
            : (p[f.name as keyof Product] ?? null)),
    );
  else
    fields.forEach((f) => {
      if (!(f.name in initial)) initial[f.name] = f.nullable ? null : "";
    });
  const formFields = fields.map((field) => ({
    ...field,
    stage: [
      "price",
      "discountPrice",
      "currency",
      "condition",
      "stockQuantity",
    ].includes(field.name)
      ? "pricing"
      : ["status", "available", "country", "state", "city"].includes(field.name)
        ? "publish"
        : "details",
    advanced: ["slug", "shortDescription", "brand", "discountPrice"].includes(
      field.name,
    ),
  }));
  if (!p) {
    const order = [
      "title",
      "categoryId",
      "description",
      "slug",
      "shortDescription",
      "brand",
      "price",
      "currency",
      "stockQuantity",
      "condition",
      "discountPrice",
      "country",
      "state",
      "city",
      "status",
      "available",
    ];
    formFields.sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name));
  }
  const schema = z.preprocess(
    (value) => {
      const next = value as Record<string, unknown>;
      return p?.status === "SOLD_OUT" &&
        next.status === "SOLD_OUT" &&
        Number(next.stockQuantity) > 0
        ? { ...next, status: "ACTIVE" }
        : value;
    },
    p
      ? productSchema
      : productSchema.refine(
          (value) => value.status !== "ACTIVE" || value.stockQuantity > 0,
          {
            path: ["stockQuantity"],
            message: "Add at least one item in stock before publishing.",
          },
        ),
  );
  return (
    <>
      <PageIntro
        eyebrow="YOUR PRODUCTS"
        title={p ? "Edit product" : "Add a product"}
        description={
          p
            ? "Keep the details, stock, and images up to date."
            : "Three simple steps. Your product stays private until you choose to publish."
        }
        action={
          <Link className="text-link" href="/seller/products">
            Back to inventory ↗
          </Link>
        }
      />
      <section className="panel product-form-panel">
        {p && <h2>Product details</h2>}
        {p && (
          <p className="listing-visibility">
            <span className="badge">{p.status.replaceAll("_", " ")}</span>
            {p.status === "ACTIVE" && p.available && p.stockQuantity > 0 ? (
              <Link className="text-link" href={`/products/${segment(p.slug)}`}>
                View live product ↗
              </Link>
            ) : (
              <span className="muted small-text">
                Only visible in your inventory. Publish with active status,
                availability, and positive stock.
              </span>
            )}
          </p>
        )}
        <DataForm
          key={p ? `${p.id}:${JSON.stringify(initial)}` : "new-product"}
          fields={formFields}
          schema={schema}
          initial={initial}
          stages={p ? undefined : productStages}
          childrenStage={p ? undefined : "publish"}
          onValuesChange={setDraftValues}
          externalDirty={
            !!categorySelection && categorySelection.id !== p?.category.id
          }
          cancelHref="/seller/products"
          submit={
            p
              ? "Save product"
              : visibility === "ACTIVE"
                ? "Publish product"
                : "Save draft"
          }
          onSave={async (values) => {
            const body = { ...values };
            if (body.slug === null || body.slug === "") delete body.slug;
            const checked = schema.safeParse(body);
            if (!checked.success)
              throw new Error(
                checked.error.issues.map((i) => i.message).join("\n"),
              );
            if (!p) {
              const issue = validateFiles(
                files,
                created.current?.images.length ?? 0,
              );
              if (issue) throw new Error(issue);
            }
            const saved = p
              ? await api<Product>(`/products/${p.id}`, {
                  method: "PATCH",
                  body: changedFields(body, initial),
                })
              : created.current
                ? await api<Product>(`/products/${created.current.id}`, {
                    method: "PATCH",
                    body: changedFields(body, lastSaved.current),
                  })
                : await api<Product>("/products", { method: "POST", body });
            if (!p) {
              created.current = saved;
              lastSaved.current = body;
            }
            await refresh();
            if (!p && files.length) {
              try {
                const form = new FormData();
                files.forEach((file) => form.append("images", file));
                await api(`/products/${saved.id}/images`, {
                  method: "POST",
                  body: form,
                });
                setFiles([]);
                await refresh();
              } catch (e) {
                throw new Error(
                  `Your listing was saved (ID ${saved.id}), but the images weren’t uploaded. Retry to upload without creating another listing. ${e instanceof Error ? e.message : ""}`,
                );
              }
            }
            if (!p) router.replace("/seller/products");
            return p
              ? "Your product is saved."
              : saved.status === "ACTIVE" &&
                  saved.available &&
                  saved.stockQuantity > 0
                ? "Your product is published. You can manage it in inventory."
                : "Draft saved. You can edit or publish it from inventory.";
          }}
        >
          {!p && (
            <>
              <FilePicker files={files} onChange={setFiles} />
              <div className="product-review">
                <p className="eyebrow">READY WHEN YOU ARE</p>
                <h3>{String(draftValues.title || "Your product")}</h3>
                <p>
                  {money(
                    String(
                      draftValues.discountPrice || draftValues.price || "0",
                    ),
                    String(draftValues.currency || "NGN"),
                  )}{" "}
                  · {String(draftValues.stockQuantity ?? 1)} in stock
                </p>
                <span className="badge">
                  {visibility === "ACTIVE"
                    ? "Publish to marketplace"
                    : "Save privately as a draft"}
                </span>
                <p className="field-help">
                  {files.length
                    ? `${files.length} image${files.length === 1 ? "" : "s"} ready to upload.`
                    : "You can add images now or finish them later from inventory."}
                </p>
              </div>
            </>
          )}
        </DataForm>
      </section>
      <CategoryCreateDialog
        open={
          categoryOpen ||
          (!p &&
            categories.isSuccess &&
            !availableCategories.length &&
            !categoryDismissed)
        }
        first={!availableCategories.length}
        onClose={() => {
          setCategoryOpen(false);
          setCategoryDismissed(true);
        }}
        onCreated={(category) => {
          setCategorySelection(category);
          setCategoryOpen(false);
          setCategoryDismissed(true);
          requestAnimationFrame(() =>
            document
              .querySelector<HTMLInputElement>(
                '[data-select-name="categoryId"]',
              )
              ?.focus(),
          );
        }}
      />
      {p && (
        <>
          <ProductImages productId={p.id} images={p.images} />
          <section className="danger-zone">
            <h3>
              {p.status === "ARCHIVED"
                ? "A fresh start?"
                : "Put this one aside."}
            </h3>
            <p>
              {p.status === "ARCHIVED"
                ? "Restore with positive stock to make this listing publicly available again. Your images and reviews stay with it."
                : "Archiving hides your product. Its images and reviews are preserved."}
            </p>
            {p.status === "ARCHIVED" ? (
              <button
                className="button secondary small"
                disabled={busy || p.stockQuantity <= 0}
                onClick={async () => {
                  setBusy(true);
                  setError("");
                  try {
                    await api(`/products/${p.id}`, {
                      method: "PATCH",
                      body: { status: "ACTIVE", available: true },
                    });
                    await refresh();
                  } catch (e) {
                    if (e instanceof ApiError && e.status === 409)
                      await refresh();
                    setError(
                      e instanceof Error
                        ? e.message
                        : "Couldn’t restore listing.",
                    );
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {busy ? "Restoring…" : "Restore product"}
              </button>
            ) : (
              <button
                className="button secondary small"
                onClick={() => {
                  setError("");
                  setArchive(true);
                }}
              >
                Archive product
              </button>
            )}
            {p.status === "ARCHIVED" && p.stockQuantity <= 0 && (
              <p>Add stock and save the details above before restoring.</p>
            )}
            {error && (
              <p className="field-error" role="alert">
                {error}
              </p>
            )}
          </section>
          <ConfirmDialog
            open={archive}
            onClose={() => setArchive(false)}
            title="Archive this product?"
            description="It will disappear from public discovery. Your images and reviews are preserved, and you can restore it later."
            busy={busy}
            error={error}
            onConfirm={async () => {
              setBusy(true);
              try {
                await api(`/products/${p.id}`, { method: "DELETE" });
                setArchive(false);
                await refresh();
              } catch (e) {
                setError(
                  e instanceof Error ? e.message : "Couldn’t archive product.",
                );
              } finally {
                setBusy(false);
              }
            }}
          />
        </>
      )}
    </>
  );
}
