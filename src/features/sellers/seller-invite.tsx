"use client";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useOwnSeller } from "@/providers/app-provider";

export function SellerInvite() {
  const store = useOwnSeller();
  return (
    <section className="seller-invite">
      <div className="container">
        <p className="eyebrow">
          {store.data
            ? `YOUR STORE · ${store.data.displayName}`
            : "FOR THE MAKERS. THE CURATORS. THE DOERS."}
        </p>
        <div>
          <h2>
            {store.data ? (
              <>
                Your next good thing.
                <br />
                Ready to be discovered.
              </>
            ) : (
              <>
                You have good things.
                <br />
                Let’s put them out there.
              </>
            )}
          </h2>
          <div className="seller-invite-actions">
            <Link
              className="button light"
              href={store.data ? "/seller" : "/sell"}
            >
              {store.data ? "Manage my store" : "Create your store"}
              <ArrowUpRight size={18} />
            </Link>
            {store.data && (
              <Link className="text-link" href="/seller/products/new">
                Add a product <ArrowUpRight size={16} />
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
