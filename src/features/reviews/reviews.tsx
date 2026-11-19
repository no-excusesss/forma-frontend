"use client";
import Link from "next/link";
import { useId, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { api, ApiError, changedFields, queryString, segment } from "@/lib/api";
import type {
  CreateReviewInput,
  OwnProductReview,
  OwnSellerReview,
  Page,
  Review,
  ReviewPage,
} from "@/lib/contracts";
import { reviewSchema } from "@/lib/validation";
import {
  useAuth,
  useFeedback,
  useOwnSeller,
  useRefresh,
} from "@/providers/app-provider";
import { DataForm, type FieldSpec } from "@/components/forms";
import { Select } from "@/components/select";
import {
  ConfirmDialog,
  EmptyState,
  ErrorState,
  ImageView,
  Loading,
  Pagination,
} from "@/components/ui";
const reviewFields: FieldSpec[] = [
  {
    name: "rating",
    label: "Your rating",
    type: "number",
    required: true,
    options: [5, 4, 3, 2, 1].map((v) => ({
      value: String(v),
      label: `${v} ${v === 1 ? "star" : "stars"}`,
    })),
  },
  {
    name: "title",
    label: "A few words to sum it up",
    nullable: true,
    maxLength: 200,
  },
  {
    name: "comment",
    label: "Your experience",
    required: true,
    type: "textarea",
    maxLength: 5000,
  },
];
function ReviewCard({
  review: r,
  children,
}: {
  review: Review;
  children?: React.ReactNode;
}) {
  return (
    <article className="review-card">
      <div className="review-heading">
        <div className="review-author">
          <ImageView src={r.reviewer.image} alt={r.reviewer.name} />
          <div>
            {r.reviewer.profile ? (
              <Link href={`/people/${segment(r.reviewer.profile.username)}`}>
                {r.reviewer.name}
              </Link>
            ) : (
              <span>{r.reviewer.name}</span>
            )}
            <p className="muted small-text">
              {new Date(r.createdAt).toLocaleDateString("en", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>
        </div>
        <span className="stars" aria-label={`${r.rating} out of 5 stars`}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Star
              key={n}
              size={13}
              fill={n <= r.rating ? "currentColor" : "none"}
            />
          ))}
        </span>
      </div>
      {r.title && <h3>{r.title}</h3>}
      <p className="plain-text">{r.comment}</p>
      {children}
    </article>
  );
}
export function Reviews({
  kind,
  id,
  slug,
  ownerSellerId,
}: {
  kind: "product" | "seller";
  id: number;
  slug?: string;
  ownerSellerId?: number;
}) {
  const [page, setPage] = useState(1);
  const [rating, setRating] = useState("");
  const [sort, setSort] = useState("newest");
  const [writing, setWriting] = useState(false);
  const notify = useFeedback();
  const filterId = useId();
  const auth = useAuth();
  const store = useOwnSeller();
  const refresh = useRefresh();
  const path =
    kind === "product"
      ? `/products/${id}/reviews`
      : `/sellers/${segment(slug || "")}/reviews`;
  const query = useQuery({
    queryKey: ["reviews", kind, id, slug, page, rating, sort],
    queryFn: ({ signal }) =>
      api<ReviewPage<Review>>(
        path + queryString({ page, limit: 5, rating, sort }),
        { signal },
      ),
  });
  return (
    <section className="reviews-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">FROM THE COMMUNITY</p>
          <h2>
            {kind === "product" ? "Product" : "Store"} reviews
            {query.data && (
              <span className="muted review-count">
                {" "}
                ({query.data.ratings.totalReviews})
              </span>
            )}
          </h2>
          <p className="review-intro">
            Real experiences help the next person find their kind of good.
          </p>
        </div>
        <button
          className="button secondary small"
          onClick={() => setWriting(!writing)}
          aria-expanded={writing}
        >
          {writing ? "Close" : "Share your experience"}
        </button>
      </div>
      {query.data && (
        <div className="rating-overview">
          <div>
            <strong>
              {query.data.ratings.totalReviews
                ? query.data.ratings.averageRating.toFixed(1)
                : "—"}
            </strong>
            <p className="muted">
              out of 5 · {query.data.ratings.totalReviews} reviews
            </p>
          </div>
          <div className="rating-bars">
            {[5, 4, 3, 2, 1].map((n) => (
              <div key={n}>
                <span>
                  {n} <Star size={10} />
                </span>
                <progress
                  aria-label={`${n} star reviews`}
                  max={Math.max(1, query.data.ratings.totalReviews)}
                  value={
                    query.data.ratings.ratingDistribution[String(n) as "1"]
                  }
                />
                <span>
                  {query.data.ratings.ratingDistribution[String(n) as "1"]}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      {writing && (
        <div className="review-form panel">
          {auth.loading ? (
            <Loading />
          ) : auth.error ? (
            <ErrorState error={auth.error} retry={auth.retry} />
          ) : !auth.user ? (
            <p>
              <Link
                className="text-link"
                href={`/sign-in?next=${encodeURIComponent(kind === "seller" ? `/stores/${slug}?tab=reviews` : `/products/${slug || id}`)}`}
              >
                Sign in
              </Link>{" "}
              to share your experience.
            </p>
          ) : store.isPending ? (
            <Loading />
          ) : store.error ? (
            <ErrorState
              error={store.error}
              retry={() => {
                void store.refetch();
              }}
            />
          ) : store.data?.id === (kind === "seller" ? id : ownerSellerId) &&
            !!store.data ? (
            <p>
              You can’t review your own{" "}
              {kind === "seller" ? "store" : "product"}.
            </p>
          ) : (
            <>
              <p className="muted">
                Already shared a review? You can edit it in{" "}
                <Link className="text-link" href="/account/reviews">
                  My reviews
                </Link>
                .
              </p>
              <DataForm
                fields={reviewFields}
                schema={reviewSchema}
                initial={{ rating: 5 }}
                submit="Publish review"
                onSave={async (values) => {
                  try {
                    await api(
                      kind === "product"
                        ? `/products/${id}/reviews`
                        : `/sellers/${id}/reviews`,
                      {
                        method: "POST",
                        body: values as unknown as CreateReviewInput,
                      },
                    );
                    await refresh();
                    setPage(1);
                    setRating("");
                    setSort("newest");
                    setWriting(false);
                    notify("Your review is published. Thank you for sharing.");
                    return "Your review is published. Thank you for sharing.";
                  } catch (error) {
                    if (error instanceof ApiError && error.status === 409)
                      await refresh();
                    throw error;
                  }
                }}
              />
            </>
          )}
        </div>
      )}
      <div className="review-filters">
        <label>
          Rating
          <Select
            id={`${filterId}-rating`}
            name="rating"
            aria-label="Filter reviews by rating"
            value={rating}
            onValueChange={(value) => {
              setRating(value);
              setPage(1);
            }}
            options={[
              { value: "", label: "All ratings" },
              ...[5, 4, 3, 2, 1].map((n) => ({
                value: String(n),
                label: `${n} ${n === 1 ? "star" : "stars"}`,
              })),
            ]}
          />
        </label>
        <label>
          Sort
          <Select
            id={`${filterId}-sort`}
            name="sort"
            aria-label="Sort reviews"
            value={sort}
            onValueChange={(value) => {
              setSort(value);
              setPage(1);
            }}
            options={[
              { value: "newest", label: "Newest" },
              { value: "oldest", label: "Oldest" },
            ]}
          />
        </label>
      </div>
      {query.isPending ? (
        <Loading />
      ) : query.error ? (
        <ErrorState
          error={query.error}
          retry={() => {
            void query.refetch();
          }}
        />
      ) : query.data.items.length ? (
        <>
          {query.data.items.map((r) => (
            <ReviewCard key={r.id} review={r} />
          ))}
          <Pagination pagination={query.data.pagination} onPage={setPage} />
        </>
      ) : (
        <EmptyState
          title="A little perspective goes a long way."
          description="No reviews match this selection. Be the first to share your experience."
        />
      )}
    </section>
  );
}
export function MyReviews() {
  const [kind, setKind] = useState<"product" | "seller">("product");
  return (
    <>
      <div className="tabs" role="group" aria-label="Review type">
        <button
          className={kind === "product" ? "active" : ""}
          onClick={() => setKind("product")}
        >
          Product reviews
        </button>
        <button
          className={kind === "seller" ? "active" : ""}
          onClick={() => setKind("seller")}
        >
          Store reviews
        </button>
      </div>
      <OwnReviewList key={kind} kind={kind} />
    </>
  );
}
function OwnReviewList({ kind }: { kind: "product" | "seller" }) {
  const { user } = useAuth();
  const refresh = useRefresh();
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const query = useQuery({
    queryKey: ["private", user?.id, "reviews", kind, page],
    queryFn: ({ signal }) =>
      api<Page<OwnProductReview | OwnSellerReview>>(
        `/users/me/${kind}-reviews?page=${page}&limit=10`,
        { signal },
      ),
    enabled: !!user,
  });
  if (query.isPending) return <Loading />;
  if (query.error)
    return (
      <ErrorState
        error={query.error}
        retry={() => {
          void query.refetch();
        }}
      />
    );
  return (
    <>
      {query.data.items.length ? (
        query.data.items.map((r) => {
          const product = "product" in r ? r.product : null;
          const seller = "seller" in r ? r.seller : null;
          const active = !product || product.status === "ACTIVE";
          return (
            <div className="own-review" key={r.id}>
              <Link
                className="review-target"
                href={
                  product
                    ? `/products/${segment(product.slug)}`
                    : `/stores/${segment(seller!.slug)}`
                }
              >
                {product?.title || seller?.displayName} ↗
              </Link>
              <ReviewCard review={r}>
                <div className="row review-actions">
                  <button
                    className="text-link"
                    disabled={!active}
                    onClick={() => setEditing(editing === r.id ? null : r.id)}
                  >
                    {editing === r.id ? "Cancel editing" : "Edit review"}
                  </button>
                  <button
                    className="text-link muted"
                    onClick={() => {
                      setError("");
                      setDeleting(r.id);
                    }}
                  >
                    Delete
                  </button>
                </div>
                {!active && (
                  <p className="field-help">
                    This product is{" "}
                    {product?.status.toLowerCase().replaceAll("_", " ")}. Its
                    review can still be deleted; editing requires an active,
                    publicly available product.
                  </p>
                )}
                {editing === r.id && (
                  <DataForm
                    fields={reviewFields}
                    schema={reviewSchema}
                    initial={{
                      rating: r.rating,
                      title: r.title,
                      comment: r.comment,
                    }}
                    submit="Update review"
                    onSave={async (values) => {
                      await api(`/${kind}-reviews/${r.id}`, {
                        method: "PATCH",
                        body: changedFields(values, {
                          rating: r.rating,
                          title: r.title,
                          comment: r.comment,
                        }),
                      });
                      await refresh();
                      setEditing(null);
                      return "Review updated.";
                    }}
                  />
                )}
              </ReviewCard>
            </div>
          );
        })
      ) : (
        <EmptyState
          title="Your perspective belongs here."
          description={`You haven’t shared any ${kind} reviews yet.`}
          action={
            <Link href="/products" className="text-link">
              Discover the marketplace →
            </Link>
          }
        />
      )}
      <Pagination pagination={query.data.pagination} onPage={setPage} />
      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title="Delete your review?"
        description="Your review will be permanently removed and its rating will be recalculated."
        busy={busy}
        error={error}
        onConfirm={async () => {
          setBusy(true);
          try {
            await api(`/${kind}-reviews/${deleting}`, { method: "DELETE" });
            setDeleting(null);
            setPage(1);
            await refresh();
          } catch (e) {
            setError(
              e instanceof Error ? e.message : "Couldn’t delete the review.",
            );
          } finally {
            setBusy(false);
          }
        }}
      />
    </>
  );
}
