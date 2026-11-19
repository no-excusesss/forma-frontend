"use client";
import { useId, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { LoaderCircle } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { Category } from "@/lib/contracts";
import { categorySchema } from "@/lib/validation";
import { slugify } from "@/lib/slug";
import { useFeedback } from "@/providers/app-provider";
import { Dialog } from "@/components/ui";

export function CategoryCreateForm({
  onCreated,
  onCancel,
  onBusyChange,
}: {
  onCreated?: (category: Category) => void;
  onCancel?: () => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  const id = useId();
  const client = useQueryClient();
  const notify = useFeedback();
  const [name, setName] = useState("");
  const [customSlug, setCustomSlug] = useState<string | null>(null);
  const [editingSlug, setEditingSlug] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const slug = customSlug ?? slugify(name);
  return (
    <form
      className="category-create-form"
      noValidate
      onSubmit={async (event) => {
        event.preventDefault();
        setError("");
        const result = categorySchema.safeParse({ name, slug });
        if (!result.success) {
          const next: Record<string, string> = {};
          result.error.issues.forEach((issue) => {
            next[String(issue.path[0])] = issue.message;
          });
          setErrors(next);
          if (next.slug) setEditingSlug(true);
          requestAnimationFrame(() =>
            document
              .getElementById(`${id}-${next.name ? "name" : "slug"}`)
              ?.focus(),
          );
          return;
        }
        setErrors({});
        setBusy(true);
        onBusyChange?.(true);
        try {
          const category = await api<Category>("/product-categories", {
            method: "POST",
            body: result.data,
          });
          client.setQueryData<Category[]>(["categories"], (previous) =>
            [
              ...(previous || []).filter((item) => item.id !== category.id),
              category,
            ].sort((a, b) => a.name.localeCompare(b.name)),
          );
          onCreated?.(category);
          notify(
            onCreated
              ? "Category created and selected. Continue with your product."
              : "Category created.",
          );
          setName("");
          setCustomSlug(null);
          setEditingSlug(false);
          void client.invalidateQueries({ queryKey: ["categories"] });
        } catch (cause) {
          if (cause instanceof ApiError && cause.status === 409) {
            setError(
              "A category with this name or URL already exists. Choose another name, or close this popup and select the existing category.",
            );
            void client.invalidateQueries({ queryKey: ["categories"] });
          } else if (cause instanceof ApiError && cause.status === 401)
            setError(
              "Please sign in again to create a category. Your product details are still on this page.",
            );
          else
            setError(
              cause instanceof Error
                ? cause.message
                : "We couldn’t create the category. Your details are safe; please try again.",
            );
        } finally {
          setBusy(false);
          onBusyChange?.(false);
        }
      }}
    >
      <fieldset disabled={busy}>
        <div className="field">
          <label htmlFor={`${id}-name`}>
            Category name{" "}
            <span className="required" aria-hidden="true">
              *
            </span>
          </label>
          <input
            id={`${id}-name`}
            name="name"
            data-autofocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Clothing, Home & living, Electronics"
            maxLength={100}
            required
            autoComplete="off"
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? `${id}-name-error` : undefined}
          />
          {errors.name && (
            <p className="field-error" id={`${id}-name-error`}>
              {errors.name}
            </p>
          )}
        </div>
        <p className="category-url-preview">
          <span>
            URL name: <strong>{slug || "generated from the name"}</strong>
          </span>
          <button
            type="button"
            className="text-link"
            onClick={() => setEditingSlug(!editingSlug)}
          >
            {editingSlug ? "Done" : "Edit"}
          </button>
        </p>
        {editingSlug && (
          <div className="field">
            <label htmlFor={`${id}-slug`}>Category URL name</label>
            <input
              id={`${id}-slug`}
              name="slug"
              value={slug}
              onChange={(event) => setCustomSlug(event.target.value)}
              maxLength={80}
              aria-invalid={!!errors.slug}
              aria-describedby={errors.slug ? `${id}-slug-error` : undefined}
            />
            {errors.slug && (
              <p className="field-error" id={`${id}-slug-error`}>
                {errors.slug}
              </p>
            )}
            <p className="field-help">
              Use lowercase letters, numbers, and hyphens.
            </p>
          </div>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="modal-actions">
          {onCancel && (
            <button
              type="button"
              className="button secondary"
              onClick={onCancel}
            >
              Not now
            </button>
          )}
          <button className="button" type="submit" disabled={busy}>
            {busy ? (
              <>
                <LoaderCircle className="spin" size={16} /> Creating…
              </>
            ) : onCreated ? (
              "Create category & continue"
            ) : (
              "Create category"
            )}
          </button>
        </div>
      </fieldset>
    </form>
  );
}

export function CategoryCreateDialog({
  open,
  onClose,
  onCreated,
  first = false,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (category: Category) => void;
  first?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Dialog
      open={open}
      onClose={onClose}
      busy={busy}
      title={first ? "Create your first category" : "Create a category"}
      description={
        first
          ? "Give your products a home. Add one category now, then continue creating your product right here."
          : "Add a category and we’ll select it for this product. Your entered details will stay in place."
      }
    >
      <CategoryCreateForm
        onCreated={onCreated}
        onCancel={onClose}
        onBusyChange={setBusy}
      />
    </Dialog>
  );
}
