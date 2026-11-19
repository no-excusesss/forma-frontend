"use client";
import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  MapPin,
  ShoppingBag,
} from "lucide-react";
import { api, segment } from "@/lib/api";
import { money } from "@/lib/money";
import { useBag } from "@/lib/bag";
import type {
  Page,
  ProductDetail as ProductType,
  ProductListItem,
} from "@/lib/contracts";
import {
  EmptyState,
  ErrorState,
  Rating,
  Skeleton,
  Verified,
} from "@/components/ui";
import { ProductsGrid } from "./catalog";
import { ProductGallery } from "./product-gallery";
import { Reviews } from "@/features/reviews/reviews";
import { useOwnSeller } from "@/providers/app-provider";
export function ProductDetail({ slug }: { slug: string }) {
  const query = useQuery({
    queryKey: ["product", slug],
    queryFn: ({ signal }) =>
      api<ProductType>(`/products/slug/${segment(slug)}`, { signal }),
  });
  const [bagError, setBagError] = useState("");
  const bag = useBag();
  const store = useOwnSeller();
  const p = query.data;
  const related = useQuery({
    queryKey: ["products", "related", p?.id],
    queryFn: ({ signal }) =>
      api<Page<ProductListItem>>(`/products/${p!.id}/related?limit=4`, {
        signal,
      }),
    enabled: !!p,
  });
  if (query.isPending) return <Skeleton cards={2} />;
  if (query.error)
    return (
      <ErrorState
        error={query.error}
        retry={() => {
          void query.refetch();
        }}
      />
    );
  if (!p) return null;
  const saved = bag.ids.includes(p.id);
  const available = p.available && p.stockQuantity > 0 && p.status === "ACTIVE";
  return (
    <>
      <Link className="text-link muted breadcrumb" href="/products">
        <ArrowLeft size={15} /> Back to discoveries
      </Link>
      <div className="product-detail">
        <ProductGallery key={p.id} title={p.title} images={p.images} />
        <div className="product-info">
          <p className="eyebrow">
            {p.category.name} /{" "}
            {p.condition.toLowerCase().replace("used", "pre-loved")}
          </p>
          <h1>{p.title}</h1>
          <Rating ratings={p.ratings} />
          <p className="detail-price">
            {money(p.discountPrice ?? p.price, p.currency)}
            {p.discountPrice !== null && (
              <del>{money(p.price, p.currency)}</del>
            )}
          </p>
          {p.shortDescription && (
            <p className="muted plain-text">{p.shortDescription}</p>
          )}
          <Link
            className="store-byline"
            href={`/stores/${segment(p.seller.slug)}`}
          >
            <span>
              From {p.seller.displayName}{" "}
              <Verified status={p.seller.verificationStatus} />
            </span>
            <ArrowUpRightSmall />
          </Link>
          <p className={`stock-note${available ? "" : " unavailable"}`}>
            <span className="status-dot" />
            {available
              ? `${p.stockQuantity} available`
              : "Currently unavailable"}
          </p>
          {store.data?.id === p.seller.id ? (
            <Link
              className="button full-width"
              href={`/seller/products/${p.id}/edit`}
            >
              Edit your product ↗
            </Link>
          ) : (
            <div className="purchase-actions">
              <button
                className="button full-width"
                disabled={!available || saved}
                onClick={() => {
                  try {
                    bag.add(p);
                    setBagError("");
                  } catch {
                    setBagError(
                      "Your browser couldn’t save this selection. Please enable local storage.",
                    );
                  }
                }}
              >
                {saved ? (
                  <>
                    <Check size={18} /> Saved to your bag
                  </>
                ) : !available ? (
                  "Currently unavailable"
                ) : (
                  <>
                    <ShoppingBag size={18} /> Save to bag
                  </>
                )}
              </button>
              {saved && (
                <div className="bag-saved-feedback" role="status">
                  <span>Added to your collection.</span>
                  <Link className="text-link" href="/cart">
                    View bag <ArrowRight size={16} />
                  </Link>
                </div>
              )}
              {bagError && (
                <p className="field-error" role="alert">
                  {bagError}
                </p>
              )}
              <p className="field-help">
                Saved on this device. Selections don’t reserve stock. Checkout
                is not available.
              </p>
            </div>
          )}
          <div className="product-facts">
            <details open>
              <summary>The details</summary>
              <p className="plain-text">{p.description}</p>
              {p.brand && <p>Brand: {p.brand}</p>}
            </details>
            <details>
              <summary>Where it’s from</summary>
              <p>
                <MapPin size={14} />{" "}
                {[p.city, p.state, p.country].filter(Boolean).join(", ")}
              </p>
              <Link
                className="text-link"
                href={`/stores/${segment(p.seller.slug)}`}
              >
                Meet the store <ArrowRight size={15} />
              </Link>
            </details>
          </div>
        </div>
      </div>
      <Reviews
        kind="product"
        id={p.id}
        slug={p.slug}
        ownerSellerId={p.seller.id}
      />
      <section className="section related-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">KEEP EXPLORING</p>
            <h2>A similar point of view.</h2>
          </div>
        </div>
        {related.isPending ? (
          <Skeleton cards={4} />
        ) : related.error ? (
          <ErrorState
            error={related.error}
            retry={() => {
              void related.refetch();
            }}
          />
        ) : related.data?.items.length ? (
          <ProductsGrid items={related.data.items} />
        ) : (
          <EmptyState
            title="One of a kind. For now."
            description="More discoveries in this category will appear here."
          />
        )}
      </section>
    </>
  );
}
function ArrowUpRightSmall() {
  return <span aria-hidden="true">↗</span>;
}
