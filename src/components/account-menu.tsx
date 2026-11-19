"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, LoaderCircle, UserRound } from "lucide-react";
import { useAuth, useOwnProfile, useOwnSeller } from "@/providers/app-provider";
import { Avatar } from "./ui";
import { segment } from "@/lib/api";

export function AccountMenu() {
  const auth = useAuth();
  const profile = useOwnProfile();
  const seller = useOwnSeller();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    function closeOutside(event: PointerEvent) {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    }
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  if (auth.loading) {
    return (
      <span
        className="icon-button"
        role="status"
        aria-label="Checking your session"
      >
        <LoaderCircle size={18} className="spin" />
      </span>
    );
  }
  if (auth.error) {
    return (
      <button
        className="account-session-error"
        onClick={auth.retry}
        title={auth.error.message}
      >
        Retry account
      </button>
    );
  }
  if (!auth.user) {
    return (
      <Link className="account-signin" href="/sign-in" aria-label="Sign in">
        <UserRound size={18} />
        <span>Sign in</span>
      </Link>
    );
  }

  const name = profile.data
    ? `${profile.data.firstName} ${profile.data.lastName}`.trim()
    : auth.user.name;
  const firstName =
    profile.data?.firstName ||
    auth.user.name.trim().split(/\s+/)[0] ||
    "Account";
  const photo = profile.data ? profile.data.profilePicture : auth.user.image;

  return (
    <div
      className="account-menu"
      ref={container}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <button
        ref={trigger}
        className="account-trigger"
        aria-label={`Your account, ${name}`}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(!open)}
      >
        <Avatar className="account-avatar" src={photo} name={name} />
        <span className="account-first-name">{firstName}</span>
        <ChevronDown size={12} aria-hidden="true" />
      </button>
      {open && (
        <div id={panelId} className="account-panel">
          <div className="account-identity">
            <p className="eyebrow">Signed in</p>
            <strong>{name}</strong>
            <span>{auth.user.email}</span>
          </div>
          <nav aria-label="Account navigation">
            <Link href="/account/profile" onClick={() => setOpen(false)}>
              My profile
            </Link>
            <Link href="/account/reviews" onClick={() => setOpen(false)}>
              My reviews
            </Link>
            <Link href="/account/orders" onClick={() => setOpen(false)}>
              My orders
            </Link>
            {seller.data ? (
              <>
                <Link href="/seller" onClick={() => setOpen(false)}>
                  My Store
                </Link>
                <Link href="/seller/products" onClick={() => setOpen(false)}>
                  Manage products
                </Link>
                <Link
                  href={`/stores/${segment(seller.data.slug)}`}
                  onClick={() => setOpen(false)}
                >
                  Visit storefront ↗
                </Link>
              </>
            ) : seller.isPending ? (
              <span className="muted small-text">Loading your store…</span>
            ) : seller.error ? (
              <button
                className="text-link"
                onClick={() => {
                  void seller.refetch();
                }}
              >
                Retry store details
              </button>
            ) : (
              <Link href="/sell" onClick={() => setOpen(false)}>
                Become a seller
              </Link>
            )}
          </nav>
          <button
            className="account-signout"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                await auth.logout();
                setOpen(false);
              } catch (cause) {
                setError(
                  cause instanceof Error
                    ? cause.message
                    : "Couldn’t sign out. Please try again.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Signing out…" : "Sign out"}
          </button>
          {error && (
            <p role="alert" className="field-error">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
