"use client";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  CircleAlert,
  LoaderCircle,
  PackageOpen,
  Star,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import type {
  Pagination as PaginationType,
  RatingOverview,
  VerificationStatus,
} from "@/lib/contracts";
import { ApiError } from "@/lib/api";
export function PageIntro({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-intro">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && (
          <p className="muted intro-description">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
export function ErrorState({
  error,
  retry,
}: {
  error: Error | null;
  retry?: () => void;
}) {
  const status = error instanceof ApiError ? error.status : 0;
  return (
    <div className="state error-state" role="alert">
      <CircleAlert size={26} strokeWidth={1.4} />
      <h3>
        {status === 404
          ? "This is no longer available."
          : status === 403
            ? "You don’t have access to this."
            : status === 401
              ? "Your session has expired."
              : "A little interruption."}
      </h3>
      <p>{error?.message || "Something went wrong. Please try again."}</p>
      <div className="row">
        {retry && (
          <button className="button secondary small" onClick={retry}>
            Try again <ArrowRight size={15} />
          </button>
        )}
        {status === 401 && (
          <Link className="text-link" href="/sign-in">
            Sign in
          </Link>
        )}
      </div>
    </div>
  );
}
export function EmptyState({
  title = "Nothing here just yet.",
  description = "There’s room for something good.",
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="state">
      <PackageOpen size={32} strokeWidth={1} />
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function Skeleton({ cards = 3 }: { cards?: number }) {
  return (
    <div className="product-grid" aria-busy="true" aria-label="Loading">
      <span className="sr-only">Loading content…</span>
      {Array.from({ length: cards }, (_, i) => (
        <div className="skeleton-card" key={i}>
          <div className="skeleton skeleton-image" />
          <div className="skeleton skeleton-line" />
          <div className="skeleton skeleton-line short" />
        </div>
      ))}
    </div>
  );
}
export function Loading({
  label = "Getting things ready",
}: {
  label?: string;
}) {
  return (
    <div
      className="loading-panel"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="loading-label">
        <span className="loading-mark" aria-hidden="true">
          f<span>·</span>
        </span>
        <div>
          <strong>{label}</strong>
          <p>A little moment for something good.</p>
        </div>
        <span className="loading-dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
      </div>
      <div className="loading-content" aria-hidden="true">
        <div className="skeleton loading-thumbnail" />
        <div>
          <div className="skeleton skeleton-line" />
          <div className="skeleton skeleton-line short" />
          <div className="skeleton skeleton-line" />
        </div>
      </div>
    </div>
  );
}
export function Rating({ ratings }: { ratings: RatingOverview }) {
  return (
    <span className="rating">
      <Star size={12} fill={ratings.totalReviews ? "currentColor" : "none"} />
      {ratings.totalReviews ? (
        <>
          {ratings.averageRating.toFixed(1)}{" "}
          <span className="muted">({ratings.totalReviews})</span>
        </>
      ) : (
        <span className="muted">No reviews yet</span>
      )}
    </span>
  );
}
export function Verified({ status }: { status: VerificationStatus }) {
  return status === "VERIFIED" ? (
    <span className="verified" title="Verified seller">
      <CheckCircle2 size={14} />
      <span className="sr-only">Verified seller</span>
    </span>
  ) : null;
}
export function Pagination({
  pagination,
  onPage,
  busy = false,
}: {
  pagination: PaginationType;
  onPage: (page: number) => void;
  busy?: boolean;
}) {
  if (pagination.totalPages <= 1) return null;
  return (
    <nav className="pagination" aria-label="Pagination">
      <button
        className="icon-button"
        aria-label="Previous page"
        disabled={busy || pagination.page <= 1}
        onClick={() => onPage(pagination.page - 1)}
      >
        <ArrowLeft size={18} />
      </button>
      <span>
        Page {pagination.page} of {pagination.totalPages}
      </span>
      <button
        className="icon-button"
        aria-label="Next page"
        disabled={busy || pagination.page >= pagination.totalPages}
        onClick={() => onPage(pagination.page + 1)}
      >
        <ArrowRight size={18} />
      </button>
    </nav>
  );
}
export function Notice({ children }: { children: ReactNode }) {
  return (
    <p className="notice" role="status">
      <Check size={16} />
      {children}
    </p>
  );
}
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  busy = false,
  error,
  confirmLabel = "Confirm",
  cancelLabel = "Keep it",
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  busy?: boolean;
  error?: string;
  confirmLabel?: string;
  cancelLabel?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    if (open) ref.current?.showModal();
    else ref.current?.close();
  }, [open]);
  return (
    <dialog
      className="dialog"
      aria-labelledby={titleId}
      ref={ref}
      onCancel={(e) => {
        if (busy) e.preventDefault();
        else onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <button
        className="icon-button dialog-close"
        aria-label="Close confirmation"
        onClick={onClose}
        disabled={busy}
      >
        <X size={20} />
      </button>
      <h2 id={titleId}>{title}</h2>
      <p className="muted">{description}</p>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
      <div className="row">
        <button className="button secondary" onClick={onClose} disabled={busy}>
          {cancelLabel}
        </button>
        <button className="button" onClick={onConfirm} disabled={busy}>
          {busy ? <LoaderCircle className="spin" size={16} /> : confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
export function Dialog({
  open,
  onClose,
  title,
  eyebrow = "KEEP CREATING",
  description,
  children,
  busy = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  eyebrow?: string;
  description?: string;
  children: ReactNode;
  busy?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (open && !dialog?.open) {
      dialog?.showModal();
      dialog?.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    } else if (!open) dialog?.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      className="dialog form-dialog"
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        if (busy) event.preventDefault();
        else onClose();
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget || busy) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < bounds.left ||
          event.clientX > bounds.right ||
          event.clientY < bounds.top ||
          event.clientY > bounds.bottom
        )
          onClose();
      }}
    >
      <button
        className="icon-button dialog-close"
        type="button"
        aria-label="Close dialog"
        disabled={busy}
        onClick={onClose}
      >
        <X size={20} />
      </button>
      <p className="eyebrow">{eyebrow}</p>
      <h2 id={titleId}>{title}</h2>
      {description && (
        <p id={descriptionId} className="muted dialog-description">
          {description}
        </p>
      )}
      {children}
    </dialog>
  );
}
export function ImageView({
  src,
  fallbackSrc,
  alt,
  priority = false,
  className = "",
}: {
  src?: string | null;
  fallbackSrc?: string | null;
  alt: string;
  priority?: boolean;
  className?: string;
}) {
  const [brokenSources, setBrokenSources] = useState<string[]>([]);
  const [loadedSource, setLoadedSource] = useState<string | null>(null);
  const source = [src, fallbackSrc].find(
    (value) => value && !brokenSources.includes(value),
  );
  return source ? (
    <img
      className={`${className}${loadedSource === source ? "" : " image-loading"}`.trim()}
      src={source}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding="async"
      onLoad={() => setLoadedSource(source)}
      onError={() => setBrokenSources((previous) => [...previous, source])}
    />
  ) : (
    <div
      className={`image-placeholder ${className}`}
      role="img"
      aria-label={alt}
    >
      <PackageOpen size={30} strokeWidth={1} />
      <span>No image available</span>
    </div>
  );
}

export function Avatar({
  src,
  name,
  className = "",
}: {
  src?: string | null;
  name: string;
  className?: string;
}) {
  const [failed, setFailed] = useState<string | null>(null);
  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  return (
    <span className={`avatar ${className}`}>
      {src && src !== failed ? (
        <img
          src={src}
          alt={`${name}’s profile picture`}
          onError={() => setFailed(src)}
        />
      ) : (
        <span aria-hidden="true">{initials || <UserRound size={16} />}</span>
      )}
    </span>
  );
}
