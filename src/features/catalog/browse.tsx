"use client";

import Link from "next/link";
import { useId, useRef, useState, useSyncExternalStore } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import { api, queryString } from "@/lib/api";
import type { Category, Page, ProductListItem } from "@/lib/contracts";
import { Select } from "@/components/select";
import {
  EmptyState,
  ErrorState,
  ImageView,
  Pagination,
  Skeleton,
} from "@/components/ui";
import { useDiscovery } from "./discovery";
import {
  ProductTile,
  QuickLook,
  productHref,
  type ShoppingProduct,
} from "./product-tile";

const filters = [
  "search",
  "category",
  "minPrice",
  "maxPrice",
  "condition",
  "country",
  "state",
  "city",
] as const;
const sorts = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
];
const conditions = [
  { value: "", label: "Any condition" },
  { value: "NEW", label: "New" },
  { value: "USED", label: "Pre-loved" },
  { value: "REFURBISHED", label: "Refurbished" },
];
function subscribeViewport(callback: () => void) {
  const media = matchMedia("(max-width: 900px)");
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}
const smallViewport = () => matchMedia("(max-width: 900px)").matches;

export function BrowseCatalog({ arrivals = false }: { arrivals?: boolean }) {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const id = useId();
  const results = useRef<HTMLDivElement>(null);
  const details = useRef<HTMLDetailsElement>(null);
  const compact = useSyncExternalStore(
    subscribeViewport,
    smallViewport,
    () => false,
  );
  const [filterError, setFilterError] = useState("");
  const [filterRevision, setFilterRevision] = useState(0);
  const [selected, setSelected] = useState<ShoppingProduct | null>(null);
  const discovery = useDiscovery();
  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: ({ signal }) => api<Category[]>("/product-categories", { signal }),
  });
  const query: Record<string, string | number> = {
    page: Math.max(
      1,
      Math.min(10000, Math.floor(Number(params.get("page")) || 1)),
    ),
    limit: 12,
    sort: params.get("sort") || "newest",
  };
  filters.forEach((key) => {
    if (params.get(key)) query[key] = params.get(key)!;
  });
  const products = useQuery({
    queryKey: ["products", "public", "/products", query],
    queryFn: ({ signal }) =>
      api<Page<ProductListItem>>(`/products${queryString(query)}`, { signal }),
    placeholderData: keepPreviousData,
  });
  // The opening images always represent the newest listings, even after refining results.
  const latest = useQuery({
    queryKey: ["products", "home-newest"],
    queryFn: ({ signal }) =>
      api<Page<ProductListItem>>("/products?limit=8&sort=newest", { signal }),
    enabled: arrivals,
  });
  const active = filters.filter((key) => params.get(key));
  const categoryName = categories.data?.find(
    (c) => c.slug === params.get("category"),
  )?.name;
  const heading = params.get("search")
    ? `Finds for “${params.get("search")}”`
    : categoryName ||
      (arrivals ? "The latest, all in one place." : "The good mix.");
  const featured = arrivals
    ? latest.data?.items.filter((p) => p.images.length).slice(0, 2)
    : discovery.data
        ?.slice(0, 3)
        .flatMap((c) => c.products.filter((p) => p.images.length).slice(0, 1));
  const total = products.data?.pagination.total;

  function navigate(next: URLSearchParams, scroll = false) {
    setFilterError("");
    const suffix = next.toString();
    router.push(`${pathname}${suffix ? `?${suffix}` : ""}`, { scroll: false });
    if (scroll)
      results.current?.scrollIntoView({
        block: "start",
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
      });
  }
  function clearFilters() {
    setFilterRevision((value) => value + 1);
    const next = new URLSearchParams(params);
    filters.forEach((key) => next.delete(key));
    next.delete("page");
    navigate(next);
  }
  function chooseCategory(slug: string) {
    const next = new URLSearchParams(params);
    if (slug) next.set("category", slug);
    else next.delete("category");
    next.delete("page");
    navigate(next, true);
  }
  function filterLabel(key: (typeof filters)[number]) {
    const value = params.get(key);
    if (key === "category") return categoryName || value;
    if (key === "condition")
      return conditions.find((c) => c.value === value)?.label || value;
    if (key === "minPrice") return `From ${value}`;
    if (key === "maxPrice") return `Up to ${value}`;
    if (key === "search") return `“${value}”`;
    return `${key[0].toUpperCase()}${key.slice(1)}: ${value}`;
  }

  return (
    <div className={`browse-market${arrivals ? " browse-arrivals" : ""}`}>
      <div className="container">
        <div className="browse-topline">
          <nav aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span>/</span>
            <span>{arrivals ? "New arrivals" : "Discover"}</span>
          </nav>
          <nav aria-label="Marketplace collections">
            <Link
              href="/products"
              aria-current={!arrivals ? "page" : undefined}
            >
              Discover
            </Link>
            <Link
              href="/new-arrivals"
              aria-current={arrivals ? "page" : undefined}
            >
              <Sparkles size={13} /> New arrivals
            </Link>
          </nav>
        </div>
        <section
          className="browse-intro"
          aria-label={
            arrivals ? "Meet the new arrivals" : "Explore the marketplace"
          }
        >
          <div className="browse-intro-copy">
            <p className="eyebrow">
              <span />
              {arrivals
                ? "JUST LANDED. ALL PERSONALITY."
                : "THE INDEPENDENT MARKETPLACE"}
            </p>
            <h1>
              {arrivals ? (
                <>
                  New in.
                  <br />
                  <em>Very you.</em>
                </>
              ) : (
                <>
                  Find your
                  <br />
                  <em>kind of good.</em>
                </>
              )}
            </h1>
            <p>
              {arrivals
                ? "Fresh additions from independent stores. Come for a look. Stay for the unexpected."
                : "For your space, your style, your everyday. Follow your curiosity to something worth keeping."}
            </p>
            <form
              className="browse-search"
              role="search"
              aria-label="Search this collection"
              key={params.get("search") || "search"}
              onSubmit={(event) => {
                event.preventDefault();
                const next = new URLSearchParams(params);
                const search = String(
                  new FormData(event.currentTarget).get("search") || "",
                ).trim();
                if (search) next.set("search", search);
                else next.delete("search");
                next.delete("page");
                navigate(next, true);
              }}
            >
              <Search size={18} />
              <label className="sr-only" htmlFor={`${id}-search`}>
                Search products
              </label>
              <input
                id={`${id}-search`}
                name="search"
                maxLength={200}
                defaultValue={params.get("search") || ""}
                placeholder={
                  arrivals
                    ? "Find something fresh…"
                    : "What’s your next good find?"
                }
              />
              <button type="submit" aria-label="Submit search">
                <ArrowRight size={18} />
              </button>
            </form>
          </div>
          <div className="browse-intro-art" data-count={featured?.length || 0}>
            {featured?.map((p, index) => (
              <Link
                href={productHref(p)}
                className={`browse-art-product browse-art-${index}`}
                key={p.id}
                aria-label={`Explore ${p.title}`}
              >
                <ImageView
                  src={p.images[0]?.url}
                  alt={p.title}
                  priority={index === 0}
                />
                <span>
                  {p.title}
                  <ArrowUpRight size={14} />
                </span>
              </Link>
            ))}
            {!featured?.length &&
              ((arrivals ? latest.isPending : discovery.isPending) ? (
                <div className="browse-art-placeholder skeleton" />
              ) : (
                <div className="browse-art-placeholder">
                  <Sparkles size={31} />
                  <span>
                    Good things.
                    <br />
                    <em>Independent minds.</em>
                  </span>
                </div>
              ))}
            <span className="browse-art-stamp" aria-hidden="true">
              {arrivals ? (
                <>
                  FRESH
                  <br />
                  <em>perspectives.</em>
                </>
              ) : (
                <>
                  GOOD
                  <br />
                  <em>finds ahead.</em>
                </>
              )}
            </span>
          </div>
        </section>

        <div className="browse-category-heading">
          <span className="eyebrow">
            {arrivals
              ? "A FRESH LOOK IN EVERY CORNER"
              : "WHERE WILL YOUR CURIOSITY TAKE YOU?"}
          </span>
          <span>Pick a category. Find your thing.</span>
        </div>
        <div
          className="browse-categories"
          role="group"
          aria-label="Browse categories"
        >
          <button
            className={`browse-category-all${!params.get("category") ? " selected" : ""}`}
            aria-pressed={!params.get("category")}
            onClick={() => chooseCategory("")}
          >
            <span className="browse-category-icon">
              <Sparkles size={20} />
            </span>
            <span>
              <strong>
                {arrivals ? "All new arrivals" : "All discoveries"}
              </strong>
              <small>A little of everything.</small>
            </span>
            {!params.get("category") ? (
              <Check size={16} />
            ) : (
              <ArrowUpRight size={16} />
            )}
          </button>
          {discovery.data?.map((c) => (
            <button
              key={c.id}
              className={params.get("category") === c.slug ? "selected" : ""}
              aria-pressed={params.get("category") === c.slug}
              onClick={() => chooseCategory(c.slug)}
            >
              <ImageView
                src={c.products.find((p) => p.images.length)?.images[0]?.url}
                alt=""
              />
              <span>
                <strong>{c.name}</strong>
                <small>
                  {c.productCount} {c.productCount === 1 ? "find" : "finds"} to
                  explore
                </small>
              </span>
              {params.get("category") === c.slug ? (
                <Check size={16} />
              ) : (
                <ArrowUpRight size={16} />
              )}
            </button>
          ))}
          {discovery.isPending && (
            <div
              className="browse-category-skeleton skeleton"
              aria-label="Loading categories"
            />
          )}
        </div>
        {discovery.error && (
          <button
            className="text-link browse-category-retry"
            onClick={() => {
              void discovery.refetch();
            }}
          >
            Collections are taking a moment. Try again <RotateCcw size={13} />
          </button>
        )}

        <section
          className="browse-shopping"
          ref={results}
          aria-label="Browse products"
        >
          <div className="browse-results-top">
            <div>
              <p className="eyebrow">
                {arrivals
                  ? "ADDED BY INDEPENDENT STORES"
                  : "CONSIDERED FINDS. PLENTY OF CHARACTER."}
              </p>
              <h2>{heading}</h2>
            </div>
            <label className="browse-sort">
              Sort by
              <Select
                id={`${id}-sort`}
                name="sort"
                aria-label="Sort products"
                value={String(query.sort)}
                options={sorts}
                onValueChange={(value) => {
                  const next = new URLSearchParams(params);
                  next.set("sort", value);
                  next.delete("page");
                  navigate(next);
                }}
              />
            </label>
          </div>
          <div className="browse-layout">
            <aside className="browse-sidebar" aria-label="Refine products">
              <details
                className="browse-filter-panel"
                ref={details}
                open={!compact}
              >
                <summary>
                  <SlidersHorizontal size={16} />
                  <span>Refine your discovery</span>
                  {active.length > 0 && <b>{active.length}</b>}
                  <ChevronDown size={16} />
                </summary>
                <form
                  key={`${params.toString()}:${filterRevision}`}
                  onSubmit={(event) => {
                    event.preventDefault();
                    const data = new FormData(event.currentTarget);
                    const min = String(data.get("minPrice") || "");
                    const max = String(data.get("maxPrice") || "");
                    if (min && max && Number(min) > Number(max)) {
                      setFilterError(
                        "The minimum price cannot exceed the maximum price.",
                      );
                      event.currentTarget
                        .querySelector<HTMLInputElement>('[name="minPrice"]')
                        ?.focus();
                      return;
                    }
                    const next = new URLSearchParams(params);
                    data.forEach((value, key) => {
                      const text = String(value).trim();
                      if (text) next.set(key, text);
                      else next.delete(key);
                    });
                    next.delete("page");
                    if (compact && details.current)
                      details.current.open = false;
                    navigate(next, compact);
                  }}
                >
                  <label>
                    Category
                    <Select
                      id={`${id}-category`}
                      name="category"
                      aria-label="Category"
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
                      className="text-link"
                      type="button"
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
                      id={`${id}-condition`}
                      name="condition"
                      aria-label="Condition"
                      defaultValue={params.get("condition") || ""}
                      options={conditions}
                    />
                  </label>
                  <fieldset className="browse-price-fields">
                    <legend>Price range</legend>
                    <div>
                      <input
                        aria-label="Minimum price"
                        aria-invalid={!!filterError}
                        aria-describedby={
                          filterError ? `${id}-filter-error` : undefined
                        }
                        name="minPrice"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Min"
                        defaultValue={params.get("minPrice") || ""}
                        onChange={() => setFilterError("")}
                      />
                      <span>–</span>
                      <input
                        aria-label="Maximum price"
                        name="maxPrice"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Max"
                        defaultValue={params.get("maxPrice") || ""}
                        onChange={() => setFilterError("")}
                      />
                    </div>
                    <p>Uses each listing’s base price and currency.</p>
                  </fieldset>
                  <details
                    className="browse-location"
                    open={
                      !!(
                        params.get("country") ||
                        params.get("state") ||
                        params.get("city")
                      )
                    }
                  >
                    <summary>
                      Shop closer to home <ChevronDown size={14} />
                    </summary>
                    <div>
                      {["country", "state", "city"].map((key) => (
                        <label key={key}>
                          {key[0].toUpperCase() + key.slice(1)}
                          <input
                            name={key}
                            defaultValue={params.get(key) || ""}
                            placeholder={`Any ${key}`}
                            maxLength={100}
                          />
                        </label>
                      ))}
                    </div>
                  </details>
                  {filterError && (
                    <p
                      className="field-error"
                      id={`${id}-filter-error`}
                      role="alert"
                    >
                      {filterError}
                    </p>
                  )}
                  <button className="button browse-apply" type="submit">
                    Apply filters <ArrowRight size={15} />
                  </button>
                  <button
                    className="text-link browse-reset"
                    type="button"
                    onClick={clearFilters}
                  >
                    <RotateCcw size={13} /> Reset filters
                  </button>
                </form>
              </details>
              <div className="browse-sidebar-note">
                <span>GOOD THINGS TAKE A LITTLE CURIOSITY.</span>
                <p>
                  Stay for the unexpected.
                  <br />
                  <em>Find something very you.</em>
                </p>
              </div>
            </aside>

            <div className="browse-results" aria-busy={products.isFetching}>
              <div className="browse-result-meta">
                <p role="status" aria-live="polite">
                  {products.isPlaceholderData ? (
                    "Updating your finds…"
                  ) : total !== undefined ? (
                    <>
                      <strong>{total}</strong> {total === 1 ? "find" : "finds"}
                      {products.data!.items.length > 0 && (
                        <span>
                          {" "}
                          · Showing{" "}
                          {(products.data!.pagination.page - 1) *
                            products.data!.pagination.limit +
                            1}
                          –
                          {(products.data!.pagination.page - 1) *
                            products.data!.pagination.limit +
                            products.data!.items.length}
                        </span>
                      )}
                    </>
                  ) : products.error ? (
                    "Your finds will appear here."
                  ) : (
                    "Finding something good…"
                  )}
                </p>
                <span>
                  {arrivals
                    ? "Dates show when items were listed"
                    : "Independent shops. Individual finds."}
                </span>
              </div>
              {active.length > 0 && (
                <div
                  className="browse-active-filters"
                  aria-label="Applied filters"
                >
                  {active.map((key) => (
                    <button
                      key={key}
                      aria-label={`Remove ${key} filter`}
                      onClick={() => {
                        const next = new URLSearchParams(params);
                        next.delete(key);
                        next.delete("page");
                        navigate(next);
                      }}
                    >
                      {filterLabel(key)}
                      <X size={12} />
                    </button>
                  ))}
                  <button className="browse-clear-all" onClick={clearFilters}>
                    Clear all
                  </button>
                </div>
              )}
              {products.isPending ? (
                <Skeleton cards={6} />
              ) : products.error ? (
                <ErrorState
                  error={products.error}
                  retry={() => {
                    void products.refetch();
                  }}
                />
              ) : products.data.items.length ? (
                <>
                  <div
                    className={`market-product-grid browse-product-grid${products.isPlaceholderData ? " browse-updating" : ""}`}
                    inert={products.isPlaceholderData}
                  >
                    {products.data.items.map((product) => (
                      <ProductTile
                        product={product}
                        onLook={setSelected}
                        showAddedDate={arrivals}
                        key={product.id}
                      />
                    ))}
                  </div>
                  <div className="browse-pagination">
                    <span>A few good finds at a time.</span>
                    <Pagination
                      busy={products.isPlaceholderData}
                      pagination={products.data.pagination}
                      onPage={(page) => {
                        const next = new URLSearchParams(params);
                        next.set("page", String(page));
                        navigate(next, true);
                      }}
                    />
                  </div>
                </>
              ) : (
                <EmptyState
                  title={
                    Number(query.page) > 1 && total
                      ? "Nothing on this page."
                      : "No finds this time."
                  }
                  description="A little change can lead to a very good find. Try another word, category, or price range."
                  action={
                    <button
                      className="button secondary"
                      onClick={
                        Number(query.page) > 1 && total
                          ? () => {
                              const next = new URLSearchParams(params);
                              next.delete("page");
                              navigate(next);
                            }
                          : clearFilters
                      }
                    >
                      {Number(query.page) > 1 && total
                        ? "Back to the first page"
                        : "Clear filters"}
                      <ArrowRight size={16} />
                    </button>
                  }
                />
              )}
            </div>
          </div>
        </section>
        <div className="browse-endnote">
          <Sparkles size={18} />
          <p>
            {arrivals
              ? "Good things don’t stay undiscovered for long."
              : "Your kind of good is out there."}{" "}
            <em>Keep a little room for it.</em>
          </p>
          <Link href={arrivals ? "/products" : "/new-arrivals"}>
            {arrivals
              ? "Explore the whole marketplace"
              : "See what’s just landed"}
            <ArrowUpRight size={15} />
          </Link>
        </div>
      </div>
      <QuickLook selected={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
