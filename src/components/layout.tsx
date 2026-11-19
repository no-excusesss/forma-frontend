"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowRight, Menu, Search, ShoppingBag, X } from "lucide-react";
import { useRef, useState } from "react";
import { useAuth, useOwnSeller } from "@/providers/app-provider";
import { useBag } from "@/lib/bag";
import { AccountMenu } from "./account-menu";
export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();
  const store = useOwnSeller();
  const hasStore = !!auth.user && !!store.data;
  const checkingStore =
    auth.loading || (!!auth.user && (store.isPending || !!store.error));
  const storeHref = hasStore || checkingStore ? "/seller" : "/sell";
  const storeLabel = checkingStore
    ? "Store"
    : hasStore
      ? "My Store"
      : "Start selling";
  const bag = useBag();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(false);
  const searchTrigger = useRef<HTMLButtonElement>(null);
  const navTrigger = useRef<HTMLButtonElement>(null);
  return (
    <>
      <div className="announcement">
        A little less ordinary. A little more you.
        <Link href="/products">
          Discover the marketplace <ArrowRight size={12} />
        </Link>
      </div>
      <header className="header">
        <Link className="wordmark" href="/" aria-label="Forma home">
          forma<span>®</span>
        </Link>
        <nav className="desktop-nav" aria-label="Main navigation">
          <Link
            className={pathname === "/products" ? "active" : ""}
            href="/products"
            aria-current={pathname === "/products" ? "page" : undefined}
          >
            Discover
          </Link>
          <Link
            href="/new-arrivals"
            className={pathname === "/new-arrivals" ? "active" : ""}
            aria-current={pathname === "/new-arrivals" ? "page" : undefined}
          >
            New arrivals
          </Link>
          <Link
            href={storeHref}
            className={
              pathname.startsWith("/seller") || pathname === "/sell"
                ? "active"
                : ""
            }
            aria-current={
              pathname.startsWith("/seller") || pathname === "/sell"
                ? "page"
                : undefined
            }
          >
            {storeLabel}
          </Link>
        </nav>
        <div className="header-actions">
          <button
            className="header-search-trigger"
            ref={searchTrigger}
            aria-label="Search marketplace"
            aria-expanded={search}
            onClick={() => {
              setSearch(!search);
              setOpen(false);
            }}
          >
            {search ? <X size={20} /> : <Search size={20} />}
            <span>Search products</span>
          </button>
          <AccountMenu />
          <Link
            className="icon-button"
            href="/cart"
            aria-label="Your saved bag"
          >
            <ShoppingBag size={20} />
            {bag.ids.length > 0 && (
              <span className="bag-count" aria-hidden="true">
                {bag.ids.length}
              </span>
            )}
          </Link>
          <button
            className="icon-button mobile-only"
            ref={navTrigger}
            aria-label={open ? "Close navigation" : "Open navigation"}
            aria-expanded={open}
            onClick={() => {
              setOpen(!open);
              setSearch(false);
            }}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </header>
      {search && (
        <form
          className="header-search container"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setSearch(false);
              searchTrigger.current?.focus();
            }
          }}
          onSubmit={(e) => {
            e.preventDefault();
            const query = new FormData(e.currentTarget).get("search");
            setSearch(false);
            router.push(
              `/products?search=${encodeURIComponent(String(query || ""))}`,
            );
          }}
        >
          <label className="sr-only" htmlFor="global-search">
            Search products
          </label>
          <Search size={20} />
          <input
            autoFocus
            id="global-search"
            name="search"
            placeholder="Find your next favourite thing…"
            required
          />
          <button className="button small" type="submit">
            Search <ArrowRight size={17} />
          </button>
        </form>
      )}
      {open && (
        <nav
          className="mobile-nav"
          aria-label="Mobile navigation"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setOpen(false);
              navTrigger.current?.focus();
            }
          }}
        >
          {[
            ["/products", "Discover"],
            ["/new-arrivals", "New arrivals"],
            [storeHref, storeLabel],
            ...(hasStore
              ? [
                  ["/seller/products", "Manage products"],
                  ["/seller/products/new", "Add product"],
                ]
              : []),
            [
              auth.user ? "/account/profile" : "/sign-in",
              auth.user ? "Your account" : "Sign in",
            ],
          ].map(([url, label]) => (
            <Link
              key={label}
              href={url}
              aria-current={pathname === url ? "page" : undefined}
              onClick={() => setOpen(false)}
            >
              {label}
              <ArrowRight size={18} />
            </Link>
          ))}
        </nav>
      )}
    </>
  );
}
export function Footer() {
  const auth = useAuth();
  const store = useOwnSeller();
  const hasStore = !!auth.user && !!store.data;
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-top">
          <div>
            <Link className="wordmark" href="/">
              forma<span>®</span>
            </Link>
            <p>Good things. Independent minds.</p>
          </div>
          <div className="footer-links">
            <div>
              <p>Explore</p>
              <Link href="/products">The marketplace</Link>
              <Link href="/new-arrivals">New arrivals</Link>
              <Link href="/cart">Your bag</Link>
            </div>
            <div>
              <p>Make it yours</p>
              <Link href={hasStore ? "/seller" : "/sell"}>
                {hasStore ? "My Store" : "Become a seller"}
              </Link>
              <Link href="/account/profile">Your account</Link>
              <Link href="/account/reviews">Your reviews</Link>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <span>
            © {new Date().getFullYear()} Forma. Thoughtfully connected.
          </span>
          <span>
            Less noise. More meaning. <span className="little-mark">↗</span>
          </span>
        </div>
      </div>
    </footer>
  );
}
