"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Package,
  Search,
  Sparkles,
} from "lucide-react";
import { api, segment } from "@/lib/api";
import type { Page, ProductListItem } from "@/lib/contracts";
import { money } from "@/lib/money";
import { EmptyState, ErrorState, ImageView, Skeleton } from "@/components/ui";
import {
  useDiscovery,
  type DiscoveryCategory,
  type DiscoveryProduct,
} from "./discovery";

import {
  ProductTile,
  QuickLook,
  productHref,
  type ShoppingProduct as HomeProduct,
} from "./product-tile";
const categoryHref = (category: DiscoveryCategory) =>
  `/products?category=${segment(category.slug)}`;
const actualPrice = (product: DiscoveryProduct) =>
  Number(product.discountPrice ?? product.price);
function collectionPhotos(category: DiscoveryCategory) {
  const photos = category.products.filter((p) => p.images.length);
  return photos.length > 1 ? photos.slice(1, 4) : photos.slice(0, 1);
}
function SectionHeading({
  label,
  title,
  description,
  children,
}: {
  label: string;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="market-section-heading">
      <div>
        <p className="eyebrow">{label}</p>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {children}
    </div>
  );
}
function ProductRail({
  children,
  name,
}: {
  children: ReactNode;
  name: string;
}) {
  const rail = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });
  useEffect(() => {
    const element = rail.current;
    if (!element) return;
    const measure = () =>
      setEdges({
        start: element.scrollLeft < 3,
        end:
          element.scrollLeft + element.clientWidth >= element.scrollWidth - 3,
      });
    const frame = requestAnimationFrame(measure);
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    element.addEventListener("scroll", measure, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      element.removeEventListener("scroll", measure);
    };
  }, [children]);
  const move = (direction: number) =>
    rail.current?.scrollBy({
      left: direction * rail.current.clientWidth * 0.85,
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  return (
    <>
      <div className="market-rail-controls">
        <span>
          Find your next good thing <ArrowRight size={13} />
        </span>
        <div>
          <button
            aria-label={`Previous ${name}`}
            disabled={edges.start}
            onClick={() => move(-1)}
          >
            <ArrowLeft size={18} />
          </button>
          <button
            aria-label={`Next ${name}`}
            disabled={edges.end}
            onClick={() => move(1)}
          >
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
      <div
        className="market-product-rail"
        ref={rail}
        aria-label={name}
        tabIndex={0}
      >
        {children}
      </div>
    </>
  );
}
export function MarketplaceHome() {
  const discovery = useDiscovery();
  const newest = useQuery({
    queryKey: ["products", "home-newest"],
    queryFn: ({ signal }) =>
      api<Page<ProductListItem>>("/products?limit=8&sort=newest", { signal }),
  });
  const [category, setCategory] = useState("");
  const [budget, setBudget] = useState(30000);
  const [selected, setSelected] = useState<HomeProduct | null>(null);
  const categories = discovery.data || [];
  const products: HomeProduct[] = categories.flatMap((c) =>
    c.products.map((p) => ({ ...p, category: { name: c.name, slug: c.slug } })),
  );
  const unique = [...new Map(products.map((p) => [p.id, p])).values()];
  const heroProducts = categories
    .slice(0, 3)
    .map((c, index) => ({
      category: c,
      product:
        c.products.filter((p) => p.images.length)[
          index % Math.max(1, c.products.filter((p) => p.images.length).length)
        ] || c.products[0],
    }))
    .filter((p) => p.product);
  const shelf = category
    ? unique.filter((p) => p.category.slug === category).slice(0, 8)
    : newest.data?.items || [];
  const affordable = unique
    .filter((p) => p.currency === "NGN" && actualPrice(p) <= budget)
    .sort((a, b) => actualPrice(a) - actualPrice(b));
  const shops = [
    ...new Map(unique.map((p) => [p.seller.slug, p.seller])).values(),
  ].slice(0, 3);
  const total = categories.reduce((n, c) => n + c.productCount, 0);

  return (
    <div className="market-home">
      <nav className="market-aisles container" aria-label="Shop by category">
        <Link className="market-all-aisles" href="/products">
          <span className="market-grid-symbol" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
          </span>
          All discoveries
        </Link>
        {discovery.isPending ? (
          <span className="market-aisle-loading skeleton" />
        ) : (
          categories.map((c) => (
            <Link key={c.id} href={categoryHref(c)}>
              {c.name}
              <ArrowUpRight size={12} />
            </Link>
          ))
        )}
        <a
          className="market-budget-link"
          href="#small-finds"
          onClick={() => setBudget(30000)}
        >
          Good finds at ₦30k & under <ArrowDown size={12} />
        </a>
      </nav>
      <section
        className="market-hero container"
        aria-label="Meet your next good find"
      >
        <div className="market-hero-copy">
          <p className="eyebrow">
            <span className="market-live-dot" /> THE INDEPENDENT MARKETPLACE
          </p>
          <h1>
            Good finds.
            <br />
            Great instincts.
            <br />
            <em>Very you.</em>
          </h1>
          <p>
            For the home you’re making, the style you’re finding, and everything
            in between.
          </p>
          <form
            action="/products"
            className="market-search"
            role="search"
            aria-label="Search the marketplace"
          >
            <Search size={19} />
            <label className="sr-only" htmlFor="market-home-search">
              Find your next good thing
            </label>
            <input
              id="market-home-search"
              name="search"
              placeholder="What’s caught your eye?"
              type="search"
              maxLength={200}
              required
            />
            <button type="submit" aria-label="Find products">
              <ArrowRight size={19} />
            </button>
          </form>
          <div className="market-hero-links">
            <a href="#fresh-finds" className="text-link">
              Explore the finds <ArrowDown size={15} />
            </a>
            {total > 0 && (
              <span>{total} available finds. Plenty of personality.</span>
            )}
          </div>
        </div>
        <div
          className="market-collage"
          data-count={heroProducts.length}
          aria-busy={discovery.isPending}
        >
          {discovery.isPending ? (
            <>
              <div className="skeleton market-hero-card market-hero-card-0" />
              <div className="skeleton market-hero-card market-hero-card-1" />
              <div className="skeleton market-hero-card market-hero-card-2" />
            </>
          ) : heroProducts.length ? (
            <>
              {heroProducts.map(({ product, category: c }, index) => (
                <Link
                  className={`market-hero-card market-hero-card-${index}`}
                  key={product.id}
                  href={productHref(product)}
                >
                  <ImageView
                    src={product.images[0]?.url}
                    alt={product.title}
                    priority={index === 0}
                  />
                  <span className="market-hero-category">{c.name}</span>
                  <span className="market-hero-caption">
                    <strong>{product.title}</strong>
                    <span>
                      {money(
                        product.discountPrice ?? product.price,
                        product.currency,
                      )}
                    </span>
                    <ArrowUpRight size={17} />
                  </span>
                </Link>
              ))}
              <span className="market-roundel" aria-hidden="true">
                GOOD
                <br />
                <em>by nature.</em>
                <Sparkles size={17} />
              </span>
            </>
          ) : (
            <div className="market-hero-empty">
              <Sparkles size={30} />
              <h2>
                {discovery.error
                  ? "Your next find is a moment away."
                  : "Good things are on their way."}
              </h2>
              <p>
                {discovery.error
                  ? "We couldn’t load the collections just yet."
                  : "Fresh collections will appear as sellers share their finds."}
              </p>
              {discovery.error && (
                <button
                  className="text-link"
                  onClick={() => {
                    void discovery.refetch();
                  }}
                >
                  Try again <ArrowRight size={15} />
                </button>
              )}
            </div>
          )}
        </div>
      </section>
      <div className="market-note container">
        <span>
          <Package size={16} /> Small shops. Big character.
        </span>
        <span>
          For your space <i /> For your style <i /> For your everyday
        </span>
        <Link href="/products">
          Find your kind of good <ArrowUpRight size={14} />
        </Link>
      </div>

      <section id="fresh-finds" className="market-section container">
        <SectionHeading
          label="JUST ARRIVED, ALREADY INTERESTING"
          title="Fresh off the shelf."
          description="Independent finds with a point of view. Pick a corner, or see what catches your eye."
        >
          <Link className="text-link" href="/new-arrivals">
            Shop all new arrivals <ArrowUpRight size={16} />
          </Link>
        </SectionHeading>
        <div
          className="market-filters"
          role="group"
          aria-label="Filter fresh finds"
        >
          <button
            className={!category ? "active" : ""}
            aria-pressed={!category}
            onClick={() => setCategory("")}
          >
            The good mix <span>{newest.data?.pagination.total ?? total}</span>
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              className={category === c.slug ? "active" : ""}
              aria-pressed={category === c.slug}
              onClick={() => setCategory(c.slug)}
            >
              {c.name}
              <span>{c.productCount}</span>
            </button>
          ))}
        </div>
        {(category ? discovery.isPending : newest.isPending) ? (
          <Skeleton cards={4} />
        ) : category ? (
          discovery.error && (
            <ErrorState
              error={discovery.error}
              retry={() => {
                void discovery.refetch();
              }}
            />
          )
        ) : (
          newest.error && (
            <ErrorState
              error={newest.error}
              retry={() => {
                void newest.refetch();
              }}
            />
          )
        )}
        {!!shelf.length && (
          <div className="market-product-grid" key={category || "all"}>
            {shelf.map((product) => (
              <ProductTile
                product={product}
                key={product.id}
                onLook={setSelected}
              />
            ))}
          </div>
        )}
        {!newest.isPending && !newest.error && !shelf.length && (
          <EmptyState
            title="Something good is on its way."
            description="New listings will appear here as independent sellers share their finds."
          />
        )}
      </section>

      {!!categories.length && (
        <section
          className="market-worlds container"
          aria-label="Explore the collections"
        >
          <SectionHeading
            label="YOUR WORLD, A LITTLE MORE YOU"
            title="Find your corner."
          >
            <span className="market-handwritten">
              A good place to get a little lost.
            </span>
          </SectionHeading>
          <div className="market-world-grid">
            {categories.slice(0, 3).map((c, index) => (
              <Link
                key={c.id}
                className={`market-world market-world-${index}`}
                href={categoryHref(c)}
              >
                <div className="market-world-top">
                  <span>0{index + 1} / THE COLLECTION</span>
                  <ArrowUpRight size={21} />
                </div>
                <div className="market-world-objects">
                  {collectionPhotos(c).map((p, i) => (
                    <ImageView
                      src={p.images[0]?.url}
                      key={p.id}
                      alt={p.title}
                      className={`world-object-${i}`}
                    />
                  ))}
                </div>
                <div className="market-world-caption">
                  <h3>{c.name}</h3>
                  <p>{c.productCount} finds, one very good place to start.</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section id="small-finds" className="market-budget-section">
        <div className="container">
          <SectionHeading
            label="LITTLE THINGS. A LOT TO LOVE."
            title="Small finds. Big personality."
            description="Good taste comes in all kinds of price tags."
          >
            <div
              className="market-budgets"
              role="group"
              aria-label="Choose a price limit"
            >
              {[15000, 30000, 50000].map((value) => (
                <button
                  key={value}
                  className={budget === value ? "active" : ""}
                  aria-pressed={budget === value}
                  onClick={() => setBudget(value)}
                >
                  ₦{value / 1000}k & under
                </button>
              ))}
            </div>
          </SectionHeading>
          {discovery.isPending ? (
            <Skeleton cards={4} />
          ) : affordable.length ? (
            <ProductRail key={budget} name="affordable finds">
              {affordable.map((product) => (
                <ProductTile
                  product={product}
                  key={product.id}
                  onLook={setSelected}
                />
              ))}
            </ProductRail>
          ) : (
            <div className="market-budget-empty">
              <p>
                {discovery.error
                  ? "We couldn’t load these finds just yet."
                  : "Nothing in this edit at that price. Try another range or explore the marketplace."}
              </p>
              {discovery.error ? (
                <button
                  className="text-link"
                  onClick={() => {
                    void discovery.refetch();
                  }}
                >
                  Try again <ArrowRight size={15} />
                </button>
              ) : (
                <Link className="text-link" href="/products">
                  Explore the marketplace <ArrowRight size={15} />
                </Link>
              )}
            </div>
          )}
        </div>
      </section>

      {!!shops.length && (
        <section className="market-section market-shops container">
          <SectionHeading
            label="PEOPLE WITH A POINT OF VIEW"
            title="Small shops. Big character."
            description="There’s an independent mind behind every good find."
          >
            <Link className="text-link" href="/products">
              Meet your next favourite <ArrowUpRight size={16} />
            </Link>
          </SectionHeading>
          <div className="market-shop-grid">
            {shops.map((shop, index) => {
              const preview = unique
                .filter((p) => p.seller.slug === shop.slug)
                .slice(-2);
              return (
                <Link
                  className="market-shop"
                  key={shop.slug}
                  href={`/stores/${segment(shop.slug)}`}
                >
                  <div className="market-shop-photos">
                    {preview.map((p) => (
                      <ImageView
                        key={p.id}
                        src={p.images[0]?.url}
                        alt={p.title}
                      />
                    ))}
                    <span className="market-shop-monogram">
                      {shop.displayName
                        .split(" ")
                        .map((s) => s[0])
                        .slice(0, 2)
                        .join("")}
                    </span>
                  </div>
                  <div className="market-shop-bottom">
                    <div>
                      <p className="eyebrow">
                        INDEPENDENT STORE / 0{index + 1}
                      </p>
                      <h3>{shop.displayName}</h3>
                    </div>
                    <span className="market-shop-arrow">
                      <ArrowUpRight size={19} />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}
      <section className="market-seller-invite container">
        <div>
          <p className="eyebrow">FOR THE MAKERS. THE CURATORS. THE DOERS.</p>
          <h2>
            Got an eye for good things?
            <br />
            <em>There’s a place for you here.</em>
          </h2>
        </div>
        <Link href="/sell" className="button">
          Start your own store <ArrowUpRight size={17} />
        </Link>
        <span className="market-invite-decoration" aria-hidden="true">
          f.
        </span>
      </section>
      <QuickLook selected={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
