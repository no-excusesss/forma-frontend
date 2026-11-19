"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  LayoutDashboard,
  Package,
  Layers,
  Settings,
  UserRound,
  MessageSquare,
  Store,
} from "lucide-react";
import { useAuth, useOwnSeller } from "@/providers/app-provider";
import { EmptyState, ErrorState, Loading } from "./ui";
import { segment } from "@/lib/api";
export function Protected({
  children,
  seller = false,
  nextHref,
}: {
  children: ReactNode;
  seller?: boolean;
  nextHref?: string;
}) {
  const auth = useAuth();
  const store = useOwnSeller();
  const pathname = usePathname();
  if (auth.loading) return <Loading />;
  if (auth.error) return <ErrorState error={auth.error} retry={auth.retry} />;
  if (!auth.user)
    return (
      <EmptyState
        title="Make yourself at home."
        description="Sign in to manage your profile, reviews, and store."
        action={
          <Link
            className="button"
            href={`/sign-in?next=${encodeURIComponent(nextHref || pathname)}`}
          >
            Sign in
          </Link>
        }
      />
    );
  if (seller) {
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
    if (!store.data)
      return (
        <EmptyState
          title="Your store starts here."
          description="Create a seller profile to list your first product."
          action={
            <Link href="/sell" className="button">
              Become a seller
            </Link>
          }
        />
      );
  }
  return children;
}
export function AccountShell({
  children,
  seller = false,
}: {
  children: ReactNode;
  seller?: boolean;
}) {
  const pathname = usePathname();
  const store = useOwnSeller();
  const productEditor = seller && pathname.startsWith("/seller/products/");
  const links = seller
    ? [
        ["/seller", "Overview"],
        ["/seller/products", "Inventory"],
        ["/seller/orders", "Orders"],
        ["/seller/categories", "Categories"],
        ["/seller/store", "Store settings"],
      ]
    : [
        ["/account/profile", "My profile"],
        ["/account/orders", "My orders"],
        ["/account/reviews", "My reviews"],
        [
          store.data ? "/seller" : "/sell",
          store.data ? "My Store" : "Become a seller",
        ],
      ];
  const icons: Record<string, typeof Package> = {
    "/seller": LayoutDashboard,
    "/seller/products": Package,
    "/seller/orders": Package,
    "/seller/categories": Layers,
    "/seller/store": Settings,
    "/account/profile": UserRound,
    "/account/orders": Package,
    "/account/reviews": MessageSquare,
    "/sell": Store,
  };
  return (
    <Protected seller={seller}>
      <div
        className={`workspace ${productEditor ? "workspace-product-editor" : ""}`}
      >
        <aside className="workspace-nav">
          <p className="eyebrow">{seller ? "Seller studio" : "Your account"}</p>
          {links.map(([url, label]) => {
            const Icon = icons[url] || Store;
            return (
              <Link
                className={
                  pathname === url ||
                  (url !== "/seller" && pathname.startsWith(`${url}/`))
                    ? "active"
                    : ""
                }
                aria-current={
                  pathname === url ||
                  (url !== "/seller" && pathname.startsWith(`${url}/`))
                    ? "page"
                    : undefined
                }
                href={url}
                key={url}
              >
                <Icon size={18} aria-hidden="true" />
                {label}
              </Link>
            );
          })}
          {seller && store.data && !productEditor && (
            <div className="workspace-shortcuts">
              <Link className="button small" href="/seller/products/new">
                Add product ↗
              </Link>
              <Link
                className="text-link"
                href={`/stores/${segment(store.data.slug)}`}
              >
                Visit storefront ↗
              </Link>
            </div>
          )}
          <Link
            className="back-link"
            href={seller ? "/account/profile" : "/products"}
          >
            ← {seller ? "Your account" : "Back to discovering"}
          </Link>
        </aside>
        <div className="workspace-content">{children}</div>
      </div>
    </Protected>
  );
}
