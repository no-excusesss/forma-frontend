"use client";
import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Eye,
  ShoppingBag,
} from "lucide-react";
import { api, segment } from "@/lib/api";
import { useBag } from "@/lib/bag";
import { money } from "@/lib/money";
import type { Product, ProductDetail } from "@/lib/contracts";
import { useFeedback, useOwnSeller } from "@/providers/app-provider";
import { Dialog, ErrorState, ImageView, Loading } from "@/components/ui";
import type { DiscoveryProduct } from "./discovery";
export type ShoppingProduct = DiscoveryProduct & {
  category: { name: string; slug: string };
} & Partial<
    Pick<Product, "stockQuantity" | "available" | "status" | "createdAt">
  >;
export const productHref = (product: DiscoveryProduct) =>
  `/products/${segment(product.slug)}`;
function discount(product: DiscoveryProduct) {
  const original = Number(product.price);
  return original > 0 && product.discountPrice !== null
    ? Math.max(
        0,
        Math.round((1 - Number(product.discountPrice) / original) * 100),
      )
    : 0;
}
function Price({ product }: { product: DiscoveryProduct }) {
  return (
    <span className="market-price">
      <strong>
        {money(product.discountPrice ?? product.price, product.currency)}
      </strong>
      {discount(product) > 0 && (
        <del>{money(product.price, product.currency)}</del>
      )}
    </span>
  );
}
export function ProductTile({
  product,
  onLook,
  showAddedDate = false,
}: {
  product: ShoppingProduct;
  onLook: (product: ShoppingProduct) => void;
  showAddedDate?: boolean;
}) {
  const bag = useBag();
  const store = useOwnSeller();
  const notify = useFeedback();
  const saved = bag.ids.includes(product.id);
  const own = store.data?.slug === product.seller.slug;
  const unavailable =
    product.available === false ||
    product.stockQuantity === 0 ||
    (product.status !== undefined && product.status !== "ACTIVE");
  return (
    <article className="market-product">
      <div className="market-product-photo">
        <Link href={productHref(product)} aria-label={`View ${product.title}`}>
          <ImageView src={product.images[0]?.url} alt={product.title} />
        </Link>
        {discount(product) > 0 && (
          <span className="market-saving">−{discount(product)}%</span>
        )}
        <button
          className="market-quick-look"
          aria-label={`Quick look at ${product.title}`}
          onClick={() => onLook(product)}
        >
          <Eye size={17} />
          <span>Quick look</span>
        </button>
      </div>
      <div className="market-product-info">
        <div className="market-product-kicker">
          <span className="market-product-category">
            {product.category.name}
          </span>
          {showAddedDate && product.createdAt && (
            <time dateTime={product.createdAt} title="Date listed">
              Added{" "}
              {new Intl.DateTimeFormat("en-GB", {
                day: "numeric",
                month: "short",
                timeZone: "UTC",
              }).format(new Date(product.createdAt))}
            </time>
          )}
        </div>
        <Link href={productHref(product)} className="market-product-title">
          {product.title}
        </Link>
        <Link
          className="market-product-seller"
          href={`/stores/${segment(product.seller.slug)}`}
        >
          {product.seller.displayName}
        </Link>
        <div className="market-product-bottom">
          <Price product={product} />
          {own ? (
            <Link
              className="market-bag-action"
              href={productHref(product)}
              aria-label={`View your ${product.title}`}
            >
              <ArrowUpRight size={17} />
            </Link>
          ) : (
            <button
              className={`market-bag-action${saved ? " saved" : ""}`}
              disabled={saved || unavailable}
              aria-label={
                unavailable
                  ? `${product.title} is unavailable`
                  : saved
                    ? `${product.title} saved to bag`
                    : `Save ${product.title} to bag`
              }
              onClick={() => {
                try {
                  bag.add(product);
                  notify(`${product.title} is in your bag.`);
                } catch {
                  notify(
                    "Your browser couldn’t save this item. Please allow local storage.",
                  );
                }
              }}
            >
              {saved ? <Check size={17} /> : <ShoppingBag size={17} />}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
export function QuickLook({
  selected,
  onClose,
}: {
  selected: ShoppingProduct | null;
  onClose: () => void;
}) {
  const query = useQuery({
    queryKey: ["product", selected?.slug],
    queryFn: ({ signal }) =>
      api<ProductDetail>(`/products/slug/${segment(selected!.slug)}`, {
        signal,
      }),
    enabled: !!selected,
  });
  const bag = useBag();
  const store = useOwnSeller();
  const [saveError, setSaveError] = useState<{
    id: number;
    message: string;
  } | null>(null);
  const p = query.data;
  const saved = !!p && bag.ids.includes(p.id);
  return (
    <div className="market-quick-dialog">
      <Dialog
        open={!!selected}
        onClose={onClose}
        title="A closer look."
        eyebrow="GOOD FINDS, UP CLOSE"
      >
        <div className="market-quick-content">
          {query.isPending ? (
            <Loading label="Finding the details" />
          ) : query.error ? (
            <ErrorState
              error={query.error}
              retry={() => {
                void query.refetch();
              }}
            />
          ) : p ? (
            <>
              <ImageView src={p.images[0]?.url} alt={p.title} priority />
              <div>
                <p className="eyebrow">{p.category.name}</p>
                <h3>{p.title}</h3>
                <Link
                  className="text-link"
                  href={`/stores/${segment(p.seller.slug)}`}
                >
                  {p.seller.displayName} <ArrowUpRight size={14} />
                </Link>
                <Price product={p} />
                <p className="market-quick-description">
                  {p.shortDescription || p.description.split("\n")[0]}
                </p>
                <span className="market-stock">
                  <i />
                  {p.stockQuantity > 0 && p.available && p.status === "ACTIVE"
                    ? `${p.stockQuantity} available`
                    : "Currently unavailable"}
                </span>
                {store.data?.slug === p.seller.slug ? (
                  <Link className="button" href={productHref(p)}>
                    View your product <ArrowRight size={16} />
                  </Link>
                ) : (
                  <button
                    className="button"
                    disabled={
                      saved ||
                      !p.available ||
                      p.stockQuantity < 1 ||
                      p.status !== "ACTIVE"
                    }
                    onClick={() => {
                      try {
                        bag.add(p);
                        setSaveError(null);
                      } catch {
                        setSaveError({
                          id: p.id,
                          message:
                            "Your browser couldn’t save this item. Please allow local storage.",
                        });
                      }
                    }}
                  >
                    {saved ? (
                      <>
                        <Check size={17} /> Saved to bag
                      </>
                    ) : (
                      <>
                        <ShoppingBag size={17} /> Save to bag
                      </>
                    )}
                  </button>
                )}
                {saveError?.id === p.id && (
                  <p className="field-error" role="alert">
                    {saveError.message}
                  </p>
                )}
                {saved && (
                  <Link className="text-link" href="/cart">
                    View your bag <ArrowRight size={15} />
                  </Link>
                )}
                <Link className="text-link" href={productHref(p)}>
                  See every detail <ArrowUpRight size={15} />
                </Link>
              </div>
            </>
          ) : null}
        </div>
      </Dialog>
    </div>
  );
}
