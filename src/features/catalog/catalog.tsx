"use client";
import Link from "next/link";
import { useId, useState, useSyncExternalStore } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Search, SlidersHorizontal } from "lucide-react";
import { api, queryString, segment } from "@/lib/api";
import type { Category, Page, ProductListItem } from "@/lib/contracts";
import { money } from "@/lib/money";
import { useAuth, useOwnSeller } from "@/providers/app-provider";
import { Select } from "@/components/select";
import { useDiscovery } from "./discovery";
import {
  EmptyState,
  ErrorState,
  ImageView,
  Pagination,
  Rating,
  Skeleton,
  Verified,
} from "@/components/ui";
function subscribeViewport(callback: () => void) {
  const media = window.matchMedia("(max-width: 520px)");
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}
const compactViewport = () => window.matchMedia("(max-width: 520px)").matches;
export function ProductCard({ product: p }: { product: ProductListItem }) {
  return (
    <article className="product-card">
      <Link className="product-image" href={`/products/${segment(p.slug)}`}>
        <ImageView
          src={[...p.images].sort((a, b) => a.sortOrder - b.sortOrder)[0]?.url}
          alt={p.title}
        />
        {p.discountPrice !== null && (
          <span className="product-label">A little less</span>
        )}
        <span className="product-arrow">
          <ArrowRight size={19} />
        </span>
      </Link>
      <div className="card-meta">
        <span>{p.category.name}</span>
        <Rating ratings={p.ratings} />
      </div>
      <Link href={`/products/${segment(p.slug)}`} className="product-title">
        {p.title}
      </Link>
      <div className="card-bottom">
        <Link
          href={`/stores/${segment(p.seller.slug)}`}
          className="seller-link"
        >
          {p.seller.displayName}{" "}
          <Verified status={p.seller.verificationStatus} />
        </Link>
        <span className="product-price">
          {p.discountPrice !== null && <del>{money(p.price, p.currency)}</del>}
          <span className="price-current">
            {money(p.discountPrice ?? p.price, p.currency)}
          </span>
        </span>
      </div>
    </article>
  );
}
export function ProductsGrid({ items }: { items: ProductListItem[] }) {
  return (
    <div className="product-grid">
      {items.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}
export function FeaturedProducts() {
  const store = useOwnSeller();
  const query = useQuery({
    queryKey: ["products", "featured"],
    queryFn: ({ signal }) =>
      api<Page<ProductListItem>>("/products?limit=4&sort=newest", { signal }),
  });
  if (query.isPending) return <Skeleton cards={4} />;
  if (query.error)
    return (
      <ErrorState
        error={query.error}
        retry={() => {
          void query.refetch();
        }}
      />
    );
  return query.data.items.length ? (
    <ProductsGrid items={query.data.items} />
  ) : (
    <EmptyState
      title="Something good is on its way."
      description="New discoveries will appear here as sellers publish their products."
      action={
        <Link
          className="text-link"
          href={store.data ? "/seller/products/new" : "/sell"}
        >
          {store.data ? "Add your first product" : "Be one of the first makers"}{" "}
          <ArrowRight size={16} />
        </Link>
      }
    />
  );
}
export function CategoryLinks() {
  const query = useDiscovery();
  return (
    <div className="category-strip">
      <Link href="/products" className="category-pill active">
        All discoveries <ArrowRight size={14} />
      </Link>
      {query.data?.map((c) => (
        <Link
          className="category-pill"
          key={c.id}
          href={`/products?category=${segment(c.slug)}`}
        >
          {c.name}
        </Link>
      ))}
      {query.isPending && (
        <span className="muted small-text">Finding your next discovery…</span>
      )}
      {query.error && (
        <button
          className="text-link small-text"
          onClick={() => {
            void query.refetch();
          }}
        >
          Categories unavailable · Retry
        </button>
      )}
    </div>
  );
}
export function Catalog({
  endpoint = "/products",
  inventory = false,
}: {
  endpoint?: string;
  inventory?: boolean;
}) {
  const params = useSearchParams();
  const selectId = useId();
  const compact = useSyncExternalStore(
    subscribeViewport,
    compactViewport,
    () => false,
  );
  const [filterError, setFilterError] = useState("");
  const router = useRouter();
  const auth = useAuth();
  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: ({ signal }) => api<Category[]>("/product-categories", { signal }),
  });
  const allowed = [
    "search",
    "category",
    "minPrice",
    "maxPrice",
    "condition",
    "country",
    "state",
    "city",
    "sort",
    ...(inventory ? ["status"] : []),
  ];
  const query: Record<string, string | number> = {
    page: Math.max(
      1,
      Math.min(10000, Math.floor(Number(params.get("page")) || 1)),
    ),
    limit: 12,
  };
  allowed.forEach((k) => {
    const v = params.get(k);
    if (v) query[k] = v;
  });
  const products = useQuery({
    queryKey: [
      inventory ? "private" : "products",
      inventory ? auth.user?.id : "public",
      endpoint,
      query,
    ],
    queryFn: ({ signal }) =>
      api<Page<ProductListItem>>(`${endpoint}${queryString(query)}`, {
        signal,
      }),
  });
  function navigate(values: URLSearchParams) {
    setFilterError("");
    router.push(`?${values.toString()}`, { scroll: false });
  }
  const activeFilters = allowed.filter(
    (key) => key !== "sort" && params.get(key),
  );
  return (
    <>
      <div className="catalog-toolbar">
        <form
          className="catalog-search"
          onSubmit={(e) => {
            e.preventDefault();
            const next = new URLSearchParams(params);
            const search = String(
              new FormData(e.currentTarget).get("search") || "",
            ).trim();
            if (search) next.set("search", search);
            else next.delete("search");
            next.delete("page");
            navigate(next);
          }}
        >
          <Search size={18} />
          <label className="sr-only" htmlFor="catalog-search">
            Search products
          </label>
          <input
            id="catalog-search"
            name="search"
            key={params.get("search")}
            defaultValue={params.get("search") || ""}
            placeholder="Search for something good"
          />
          <button
            type="submit"
            className="icon-button"
            aria-label="Submit search"
          >
            <ArrowRight size={18} />
          </button>
        </form>
        <label className="sort-control">
          Sort by{" "}
          <Select
            id={`${selectId}-sort`}
            name="sort"
            aria-label="Sort products"
            value={params.get("sort") || "newest"}
            onValueChange={(value) => {
              const next = new URLSearchParams(params);
              next.set("sort", value);
              next.delete("page");
              navigate(next);
            }}
            options={[
              { value: "newest", label: "Newest first" },
              { value: "oldest", label: "Oldest first" },
              { value: "price_asc", label: "Price: low to high" },
              { value: "price_desc", label: "Price: high to low" },
            ]}
          />
        </label>
      </div>
      {activeFilters.length > 0 && (
        <div className="active-filters" aria-label="Applied filters">
          {activeFilters.map((key) => (
            <button
              className="active-filter"
              key={key}
              aria-label={`Remove ${key} filter`}
              onClick={() => {
                const next = new URLSearchParams(params);
                next.delete(key);
                next.delete("page");
                navigate(next);
              }}
            >
              {key === "category"
                ? categories.data?.find(
                    (category) => category.slug === params.get(key),
                  )?.name || params.get(key)
                : `${key}: ${params.get(key)}`}{" "}
              <span aria-hidden="true">×</span>
            </button>
          ))}
        </div>
      )}
      <div className="catalog-layout">
        <aside>
          <details className="filter-panel" open={!compact}>
            <summary>
              <SlidersHorizontal size={16} /> Refine your discovery
            </summary>
            <form
              key={params.toString()}
              onSubmit={(e) => {
                e.preventDefault();
                const data = new FormData(e.currentTarget);
                const min = String(data.get("minPrice") || "");
                const max = String(data.get("maxPrice") || "");
                if (min && max && Number(min) > Number(max)) {
                  setFilterError(
                    "The minimum price cannot exceed the maximum price.",
                  );
                  return;
                }
                setFilterError("");
                const next = new URLSearchParams(params);
                data.forEach((value, key) => {
                  if (value) next.set(key, String(value).trim());
                  else next.delete(key);
                });
                next.delete("page");
                navigate(next);
              }}
            >
              <label>
                Category
                <Select
                  id={`${selectId}-category`}
                  aria-label="Category"
                  name="category"
                  searchable
                  optionsLabel="categories"
                  defaultValue={params.get("category") || ""}
                  options={[
                    { value: "", label: "All categories" },
                    ...(categories.data || []).map((c) => ({
                      value: c.slug,
                      label: c.name,
                    })),
                  ]}
                />
              </label>
              {categories.error && (
                <button
                  type="button"
                  className="text-link small-text"
                  onClick={() => {
                    void categories.refetch();
                  }}
                >
                  Retry categories
                </button>
              )}
              <label>
                Condition
                <Select
                  id={`${selectId}-condition`}
                  aria-label="Condition"
                  name="condition"
                  defaultValue={params.get("condition") || ""}
                  options={[
                    { value: "", label: "Any condition" },
                    { value: "NEW", label: "New" },
                    { value: "USED", label: "Pre-loved" },
                    { value: "REFURBISHED", label: "Refurbished" },
                  ]}
                />
              </label>
              <div>
                <p className="filter-label">Price range</p>
                <div className="price-range">
                  <input
                    aria-label="Minimum price"
                    name="minPrice"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Min"
                    defaultValue={params.get("minPrice") || ""}
                  />
                  <span>—</span>
                  <input
                    aria-label="Maximum price"
                    name="maxPrice"
                    type="number"
                    min={params.get("minPrice") || "0"}
                    step="0.01"
                    placeholder="Max"
                    defaultValue={params.get("maxPrice") || ""}
                  />
                </div>
                <p className="field-help">
                  Uses each listing’s base price and currency.
                </p>
              </div>
              {["country", "state", "city"].map((key) => (
                <label key={key}>
                  {key[0].toUpperCase() + key.slice(1)}
                  <input
                    name={key}
                    defaultValue={params.get(key) || ""}
                    placeholder={`Any ${key}`}
                  />
                </label>
              ))}
              {inventory && (
                <label>
                  Status
                  <Select
                    id={`${selectId}-status`}
                    aria-label="Status"
                    name="status"
                    defaultValue={params.get("status") || ""}
                    options={[
                      { value: "", label: "All statuses" },
                      ...["DRAFT", "ACTIVE", "SOLD_OUT", "ARCHIVED"].map(
                        (s) => ({
                          value: s,
                          label: s.toLowerCase().replaceAll("_", " "),
                        }),
                      ),
                    ]}
                  />
                </label>
              )}
              <button className="button small full-width" type="submit">
                Apply filters
              </button>
              {filterError && (
                <p className="field-error" role="alert">
                  {filterError}
                </p>
              )}
              <button
                className="text-link centered"
                type="button"
                onClick={() => navigate(new URLSearchParams())}
              >
                Reset filters
              </button>
            </form>
          </details>
        </aside>
        <div className="catalog-results">
          <div className="results-heading">
            <p className="muted">
              {products.data
                ? `${products.data.pagination.total} ${products.data.pagination.total === 1 ? "product" : "products"}`
                : "Loading products…"}
            </p>
            <span className="eyebrow">Considered. Connected.</span>
          </div>
          {products.isPending ? (
            <Skeleton />
          ) : products.error ? (
            <ErrorState
              error={products.error}
              retry={() => {
                void products.refetch();
              }}
            />
          ) : products.data.items.length ? (
            <>
              {inventory ? (
                <div className="inventory-list">
                  {products.data.items.map((p) => (
                    <Link
                      key={p.id}
                      className="inventory-row"
                      href={`/seller/products/${p.id}/edit`}
                    >
                      <ImageView src={p.images[0]?.url} alt={p.title} />
                      <div>
                        <h3>{p.title}</h3>
                        <p className="muted">
                          {p.category.name} · {p.stockQuantity} in stock
                        </p>
                      </div>
                      <span className="badge">
                        {p.status.replaceAll("_", " ")}
                      </span>
                      <span>{money(p.price, p.currency)}</span>
                      <ArrowRight size={18} />
                    </Link>
                  ))}
                </div>
              ) : (
                <ProductsGrid items={products.data.items} />
              )}
              <Pagination
                pagination={products.data.pagination}
                onPage={(page) => {
                  const next = new URLSearchParams(params);
                  next.set("page", String(page));
                  navigate(next);
                }}
              />
            </>
          ) : (
            <EmptyState
              title={
                inventory && !activeFilters.length
                  ? "Your first listing starts here."
                  : "No products found."
              }
              description={
                inventory && !activeFilters.length
                  ? "Add a product, upload its images, then publish when you’re ready. Drafts stay private until you activate them."
                  : "No products match this selection. Try a different search or clear your filters."
              }
              action={
                inventory && !activeFilters.length ? (
                  <Link className="button small" href="/seller/products/new">
                    Add your first product ↗
                  </Link>
                ) : (
                  <button
                    className="button secondary small"
                    onClick={() => navigate(new URLSearchParams())}
                  >
                    Clear filters
                  </button>
                )
              }
            />
          )}
        </div>
      </div>
    </>
  );
}
