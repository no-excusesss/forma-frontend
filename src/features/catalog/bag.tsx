"use client";
import Link from "next/link";
import { useQueries } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowRight, LoaderCircle, Store } from "lucide-react";
import { api, segment } from "@/lib/api";
import { useBag } from "@/lib/bag";
import { money } from "@/lib/money";
import type { ProductDetail } from "@/lib/contracts";
import { EmptyState, ErrorState, ImageView, Notice } from "@/components/ui";
export function Bag() {
  const bag = useBag();
  const [error, setError] = useState("");
  const products = useQueries({
    queries: bag.ids.map((id) => ({
      queryKey: ["bag-product", id],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        api<ProductDetail>(`/products/${id}`, { signal }),
      retry: false,
      staleTime: 0,
    })),
  });
  const ready = products.every((query) => query.isSuccess);
  const pending = products.some((query) => query.isPending);
  const values = new Map<string, number>();
  if (ready)
    products.forEach((query) => {
      const product = query.data!;
      values.set(
        product.currency,
        (values.get(product.currency) || 0) +
          Number(product.discountPrice ?? product.price),
      );
    });
  return (
    <div className="bag-layout">
      <div className="bag-notice">
        <Notice>
          Your bag is saved on this device. Saving an item doesn’t reserve
          stock. Test checkout supports NGN items from multiple stores in one
          payment. Complete your shipping address and phone number before
          payment.
        </Notice>
      </div>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
      {!bag.ids.length ? (
        <EmptyState
          title="Room for something good."
          description="Save the things that catch your eye. Come back when you’re ready to take another look."
          action={
            <Link href="/products" className="button">
              Discover the marketplace ↗
            </Link>
          }
        />
      ) : (
        <div className="bag-content">
          <div className="bag-items">
            <div className="bag-items-heading">
              <p role="status" aria-live="polite">
                {pending ? (
                  <>
                    <LoaderCircle
                      size={14}
                      className="spin"
                      aria-hidden="true"
                    />{" "}
                    Checking your saved finds…
                  </>
                ) : (
                  "Your saved finds"
                )}
              </p>
              <span>
                {bag.ids.length} {bag.ids.length === 1 ? "item" : "items"}
              </span>
            </div>
            {products.map((query, i) => {
              const id = bag.ids[i];
              const p = query.data;
              return (
                <article
                  className="bag-row"
                  key={id}
                  aria-busy={query.isPending}
                >
                  {query.isPending ? (
                    <>
                      <span className="sr-only">
                        Loading saved item {i + 1}
                      </span>
                      <div
                        className="skeleton bag-loading-thumbnail"
                        aria-hidden="true"
                      />
                      <div className="bag-loading-details" aria-hidden="true">
                        <div className="skeleton bag-loading-title" />
                        <div className="skeleton bag-loading-store" />
                        <div className="skeleton bag-loading-price" />
                        <div className="bag-loading-actions">
                          <div className="skeleton" />
                          <div className="skeleton" />
                        </div>
                      </div>
                    </>
                  ) : query.error ? (
                    <div className="bag-row-error">
                      <ErrorState
                        error={query.error}
                        retry={() => {
                          void query.refetch();
                        }}
                      />
                      <button
                        className="text-link"
                        onClick={() => {
                          try {
                            bag.remove(id);
                          } catch {
                            setError(
                              "Couldn’t update your bag. Please check your browser’s storage settings.",
                            );
                          }
                        }}
                      >
                        Remove selection
                      </button>
                    </div>
                  ) : (
                    p && (
                      <>
                        <ImageView src={p.images[0]?.url} alt={p.title} />
                        <div className="bag-details">
                          <Link href={`/products/${segment(p.slug)}`}>
                            <h3>{p.title}</h3>
                          </Link>
                          <p className="muted">
                            {p.seller.displayName} ·{" "}
                            {p.available &&
                            p.status === "ACTIVE" &&
                            p.stockQuantity > 0
                              ? `${p.stockQuantity} available`
                              : "Currently unavailable"}
                          </p>
                          <p className="bag-price">
                            {money(p.discountPrice ?? p.price, p.currency)}
                          </p>
                          <div className="bag-item-actions">
                            <Link
                              className="text-link"
                              href={`/stores/${segment(p.seller.slug)}`}
                            >
                              <Store size={15} /> Visit store
                            </Link>
                            <button
                              className="text-link muted"
                              onClick={() => {
                                try {
                                  bag.remove(id);
                                } catch {
                                  setError(
                                    "Couldn’t update your bag. Please check your browser’s storage settings.",
                                  );
                                }
                              }}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </>
                    )
                  )}
                </article>
              );
            })}
          </div>
          <aside className="bag-summary" aria-label="Your saved collection">
            <p className="eyebrow">YOUR COLLECTION</p>
            <h2>A second look.</h2>
            <dl>
              <div>
                <dt>Saved items</dt>
                <dd>{bag.ids.length}</dd>
              </div>
              {ready &&
                [...values].map(([currency, value]) => (
                  <div key={currency}>
                    <dt>
                      Listed value{values.size > 1 ? ` (${currency})` : ""}
                    </dt>
                    <dd>{money(String(value), currency)}</dd>
                  </div>
                ))}
              {pending && (
                <div className="bag-value-loading" aria-hidden="true">
                  <dt>Listed value</dt>
                  <dd>
                    <span className="skeleton" />
                  </dd>
                </div>
              )}
            </dl>
            {!ready && (
              <p>
                {products.some((query) => query.isError)
                  ? "Some items couldn't be loaded. Retry them to see their current prices."
                  : "Checking current prices…"}
              </p>
            )}
            <p>
              One of each saved item. Review current prices before paying with a
              Paystack test card.
            </p>
            {ready ? (
              <Link className="button" href="/checkout">
                Review checkout <ArrowRight size={17} />
              </Link>
            ) : (
              <button className="button" disabled>
                {pending ? "Checking prices…" : "Check items before checkout"}
              </button>
            )}
            <Link className="text-link" href="/products">
              Continue exploring <ArrowRight size={17} />
            </Link>
          </aside>
        </div>
      )}
    </div>
  );
}
