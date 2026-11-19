"use client";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight } from "lucide-react";
import { api, changedFields, segment } from "@/lib/api";
import type {
  OwnSeller,
  OwnSellerStatistics,
  Storefront,
} from "@/lib/contracts";
import { sellerSchema } from "@/lib/validation";
import { useAuth, useOwnSeller, useRefresh } from "@/providers/app-provider";
import { DataForm, type FieldSpec } from "@/components/forms";
import {
  ErrorState,
  ImageView,
  Loading,
  PageIntro,
  Rating,
  Verified,
} from "@/components/ui";
import { SingleMedia } from "@/components/uploads";
import { Catalog } from "@/features/catalog/catalog";
import { Reviews } from "@/features/reviews/reviews";
import { slugify } from "@/lib/slug";
const fields: FieldSpec[] = [
  { name: "displayName", label: "Store name", required: true },
  {
    name: "slug",
    label: "Store URL name",
    required: true,
    placeholder: "my-store",
    maxLength: 80,
    autoComplete: "off",
    derive: { from: "displayName", transform: slugify },
    help: "Your store link will look like /stores/my-store. Use 3–80 lowercase letters, numbers, and hyphens.",
  },
  {
    name: "description",
    label: "Your store’s story",
    type: "textarea",
    required: true,
    maxLength: 5000,
    help: "Tell people what makes your store yours. At least 10 characters.",
  },
  { name: "country", label: "Country", required: true },
  { name: "state", label: "State / region", required: true },
  { name: "city", label: "City", required: true },
  {
    name: "businessName",
    label: "Legal business name",
    nullable: true,
    help: "Business details below are private.",
  },
  {
    name: "businessEmail",
    label: "Business email",
    type: "email",
    nullable: true,
  },
  {
    name: "businessPhone",
    label: "Business phone",
    type: "tel",
    nullable: true,
  },
  {
    name: "businessAddress",
    label: "Business street address (optional)",
    type: "textarea",
    nullable: true,
    maxLength: 500,
    placeholder: "Street, building, area",
    autoComplete: "street-address",
    help: "Enter your physical business address here. This is kept private.",
  },
];
function ExistingStoreRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/seller");
  }, [router]);
  return <Loading />;
}
export function SellerForm({ onboarding = false }: { onboarding?: boolean }) {
  const { user } = useAuth();
  const client = useQueryClient();
  const store = useOwnSeller();
  const refresh = useRefresh();
  const router = useRouter();
  if (store.isPending) return <Loading />;
  if (store.error)
    return (
      <ErrorState
        error={store.error}
        retry={() => {
          void store.refetch();
        }}
      />
    );
  const s = store.data;
  if (onboarding && s) return <ExistingStoreRedirect />;
  const formFields = fields.map((field) => ({
    ...field,
    stage:
      ["country", "state", "city"].includes(field.name) ||
      field.name.startsWith("business")
        ? "location"
        : "store",
    advanced: field.name.startsWith("business"),
    derive: onboarding ? field.derive : undefined,
  }));
  const initial: Record<string, unknown> = {};
  fields.forEach((f) => {
    initial[f.name] = s?.[f.name as keyof OwnSeller] ?? null;
  });
  return (
    <>
      <PageIntro
        eyebrow={s ? "STORE SETTINGS" : "CREATE YOUR STORE"}
        title={s ? "Your store, your story." : "Make room for your ideas."}
        description={
          s
            ? "A thoughtful introduction to the things you put out into the world."
            : "Start your own store. Give your good things a place to be discovered."
        }
        action={
          s ? (
            <Link className="text-link" href={`/stores/${segment(s.slug)}`}>
              View your store ↗
            </Link>
          ) : undefined
        }
      />
      {s && (
        <>
          <p className="notice">
            Verification: {s.verificationStatus.toLowerCase()}{" "}
            <Verified status={s.verificationStatus} /> · You can publish
            products without verification.
          </p>
          <SingleMedia
            path="/sellers/me/logo"
            src={s.logoUrl}
            label="Store logo"
          />
          <SingleMedia
            path="/sellers/me/banner"
            src={s.bannerUrl}
            label="Store banner"
          />
        </>
      )}
      <section className="panel">
        <h2>{s ? "Store details" : "Let’s start with your store"}</h2>
        <DataForm
          key={s ? `${s.id}:${JSON.stringify(initial)}` : "new"}
          fields={formFields}
          stages={
            onboarding
              ? [
                  {
                    id: "store",
                    label: "Your store",
                    description:
                      "Choose a name and tell shoppers what you offer. We’ll suggest your store link.",
                  },
                  {
                    id: "location",
                    label: "Location & finish",
                    description:
                      "Add your store’s location. Business details are optional and stay private.",
                  },
                ]
              : undefined
          }
          advancedLabel="Private business details (optional)"
          cancelHref={s ? "/seller" : "/products"}
          schema={sellerSchema}
          initial={initial}
          submit={s ? "Save store details" : "Create your store →"}
          onSave={async (values) => {
            const saved = await api<OwnSeller>(s ? "/sellers/me" : "/sellers", {
              method: s ? "PATCH" : "POST",
              body: s ? changedFields(values, initial) : values,
            });
            client.setQueryData(["private", user?.id, "seller"], saved);
            await refresh();
            if (!s) router.push("/seller");
            return s ? "Your store is updated." : "Your store is ready.";
          }}
        />
      </section>
    </>
  );
}
export function SellerDashboard() {
  const auth = useAuth();
  const seller = useOwnSeller();
  const stats = useQuery({
    queryKey: ["private", auth.user?.id, "statistics"],
    queryFn: ({ signal }) =>
      api<OwnSellerStatistics>("/sellers/me/statistics", { signal }),
    enabled: !!seller.data,
  });
  if (stats.isPending) return <Loading />;
  if (stats.error)
    return (
      <ErrorState
        error={stats.error}
        retry={() => {
          void stats.refetch();
        }}
      />
    );
  const s = stats.data;
  const totalProducts = Object.values(s.productsByStatus).reduce(
    (total, count) => total + (count || 0),
    0,
  );
  return (
    <>
      <PageIntro
        eyebrow="YOUR SELLER STUDIO"
        title="Your store at a glance."
        description={
          seller.data
            ? `A little perspective on ${seller.data.displayName}.`
            : undefined
        }
        action={
          totalProducts > 0 ? (
            <Link className="button small" href="/seller/products/new">
              New product <ArrowUpRight size={16} />
            </Link>
          ) : undefined
        }
      />
      {totalProducts === 0 && (
        <section className="first-product-card">
          <div>
            <p className="eyebrow">YOUR NEXT STEP</p>
            <h2>
              Your store is ready.
              <br />
              Let’s add your first product.
            </h2>
            <p>
              Start with the basics. Add a category as you go, then save a draft
              or publish when you’re ready.
            </p>
          </div>
          <Link className="button" href="/seller/products/new">
            Add my first product <ArrowUpRight size={17} />
          </Link>
        </section>
      )}
      {seller.data && (
        <nav className="studio-actions" aria-label="Store shortcuts">
          <Link href="/seller/products">Manage products →</Link>
          <Link href="/seller/store">Edit store details →</Link>
          <Link href={`/stores/${segment(seller.data.slug)}`}>
            Visit storefront ↗
          </Link>
        </nav>
      )}
      <div className="stat-grid">
        <div className="stat-card">
          <p>Active products</p>
          <strong>{s.activeProducts}</strong>
          <span>Ready to be discovered</span>
        </div>
        <div className="stat-card">
          <p>Store rating</p>
          <strong>{s.totalReviews ? s.averageRating.toFixed(1) : "—"}</strong>
          <span>Out of 5 stars</span>
        </div>
        <div className="stat-card">
          <p>Store reviews</p>
          <strong>{s.totalReviews}</strong>
          <span>Real people. Real perspective.</span>
        </div>
      </div>
      <section className="panel">
        <h2>Your inventory at a glance.</h2>
        <div className="status-grid">
          {["DRAFT", "ACTIVE", "SOLD_OUT", "ARCHIVED"].map((status) => (
            <Link href={`/seller/products?status=${status}`} key={status}>
              {status.toLowerCase().replaceAll("_", " ")}
              <strong>
                {s.productsByStatus[
                  status as keyof typeof s.productsByStatus
                ] ?? 0}
              </strong>
            </Link>
          ))}
        </div>
        <Link
          className="text-link"
          style={{ marginTop: 25 }}
          href="/seller/products"
        >
          Manage your inventory →
        </Link>
      </section>
      <section className="panel">
        <h2>The community’s perspective.</h2>
        {[5, 4, 3, 2, 1].map((n) => (
          <p className="small-text muted" key={n} style={{ marginBlock: 8 }}>
            {n} stars · {s.ratingDistribution[String(n) as "1"]} reviews
          </p>
        ))}
        {seller.data && (
          <Link
            className="text-link"
            style={{ marginTop: 15 }}
            href={`/stores/${segment(seller.data.slug)}`}
          >
            Visit your store & reviews ↗
          </Link>
        )}
      </section>
    </>
  );
}
export function PublicStore({
  slug,
  initialTab = "products",
}: {
  slug: string;
  initialTab?: "products" | "reviews";
}) {
  const [tab, setTab] = useState(initialTab);
  const query = useQuery({
    queryKey: ["store", slug],
    queryFn: ({ signal }) =>
      api<Storefront>(`/sellers/${segment(slug)}`, { signal }),
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
  const s = query.data;
  return (
    <>
      <div className="store-banner">
        {s.bannerUrl && (
          <ImageView src={s.bannerUrl} alt={`${s.displayName} store banner`} />
        )}
      </div>
      <div className="store-intro">
        <ImageView src={s.logoUrl} alt={`${s.displayName} logo`} />
        <div>
          <p className="eyebrow">AN INDEPENDENT POINT OF VIEW</p>
          <h1>
            {s.displayName}
            <Verified status={s.verificationStatus} />
          </h1>
          <p className="muted plain-text">{s.description}</p>
          <div className="row">
            <span>
              {s.city}, {s.state}, {s.country}
            </span>
            <span>{s.statistics.activeProducts} active products</span>
            <button
              className="store-rating-link"
              onClick={() => setTab("reviews")}
              aria-label={`Read ${s.statistics.totalReviews} store reviews`}
            >
              <Rating ratings={s.statistics} />
            </button>
          </div>
        </div>
      </div>
      <div
        className="store-tabs"
        role="tablist"
        aria-label="Explore this store"
        onKeyDown={(event) => {
          if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
            event.preventDefault();
            const next =
              event.key === "Home"
                ? "products"
                : event.key === "End"
                  ? "reviews"
                  : tab === "products"
                    ? "reviews"
                    : "products";
            setTab(next);
            document.getElementById(`store-tab-${next}`)?.focus();
          }
        }}
      >
        <button
          id="store-tab-products"
          role="tab"
          aria-selected={tab === "products"}
          tabIndex={tab === "products" ? 0 : -1}
          aria-controls="store-panel-products"
          onClick={() => setTab("products")}
        >
          Products <span>{s.statistics.activeProducts}</span>
        </button>
        <button
          id="store-tab-reviews"
          role="tab"
          aria-selected={tab === "reviews"}
          tabIndex={tab === "reviews" ? 0 : -1}
          aria-controls="store-panel-reviews"
          onClick={() => setTab("reviews")}
        >
          Reviews <span>{s.statistics.totalReviews}</span>
        </button>
      </div>
      {tab === "products" ? (
        <div
          id="store-panel-products"
          role="tabpanel"
          aria-labelledby="store-tab-products"
        >
          <Suspense fallback={<Loading />}>
            <Catalog endpoint={`/sellers/${segment(slug)}/products`} />
          </Suspense>
        </div>
      ) : (
        <div
          id="store-panel-reviews"
          role="tabpanel"
          aria-labelledby="store-tab-reviews"
        >
          <Reviews kind="seller" id={s.id} slug={s.slug} />
        </div>
      )}
    </>
  );
}
