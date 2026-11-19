import Link from "next/link";
import { Suspense } from "react";
import { AccountShell } from "@/components/protected";
import { Loading, PageIntro } from "@/components/ui";
import { Catalog } from "@/features/catalog/catalog";
export const metadata = { title: "Your inventory" };
export default function Listings() {
  return (
    <div className="container section">
      <AccountShell seller>
        <PageIntro
          eyebrow="PRODUCTS & STOCK"
          title="Your inventory."
          description="Manage listings, update stock, and choose what shoppers can see."
          action={
            <Link href="/seller/products/new" className="button small">
              New product ↗
            </Link>
          }
        />
        <Suspense fallback={<Loading />}>
          <Catalog endpoint="/products/me/listings" inventory />
        </Suspense>
      </AccountShell>
    </div>
  );
}
