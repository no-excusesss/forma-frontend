"use client";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { LoaderCircle, X } from "lucide-react";
import { api } from "@/lib/api";
import { validateFiles } from "@/lib/validation";
import { useAuth, useRefresh } from "@/providers/app-provider";
import type { OwnProfile, OwnSeller, ProductImage } from "@/lib/contracts";
import { ConfirmDialog, ImageView } from "./ui";
import { useUnsavedChanges } from "./use-unsaved-changes";
function LocalPreview({ file }: { file: File }) {
  const [url] = useState(() => URL.createObjectURL(file));
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  return <img src={url} alt={`Preview of ${file.name}`} />;
}
export function FilePicker({
  files,
  onChange,
  existing = 0,
  multiple = true,
  id = "product-images",
}: {
  files: File[];
  onChange: (files: File[]) => void;
  existing?: number;
  multiple?: boolean;
  id?: string;
}) {
  const [error, setError] = useState("");
  return (
    <div className="upload-area">
      <label htmlFor={id}>
        {multiple ? "Add product images" : "Choose an image"}
      </label>
      <input
        id={id}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple={multiple}
        onChange={(e) => {
          const selected = Array.from(e.target.files || []);
          const next = multiple ? [...files, ...selected] : selected;
          const issue = validateFiles(next, existing);
          if (issue) {
            setError(issue);
            e.target.value = "";
            return;
          }
          setError("");
          onChange(next);
          e.target.value = "";
        }}
      />
      <p className="field-help">
        JPEG, PNG or WebP · Up to 5 MiB each
        {multiple ? " · 10 images per listing" : ""}. Still images only.
      </p>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
      {files.length > 0 && (
        <div className="upload-preview-grid">
          {files.map((file, i) => (
            <div
              className="upload-preview"
              key={`${file.name}-${file.lastModified}-${i}`}
            >
              <LocalPreview file={file} />
              <button
                className="icon-button"
                type="button"
                aria-label={`Remove ${file.name}`}
                onClick={() =>
                  onChange(files.filter((_, index) => index !== i))
                }
              >
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
export function SingleMedia({
  path,
  src,
  label,
}: {
  path: string;
  src: string | null;
  label: string;
}) {
  const refresh = useRefresh();
  const client = useQueryClient();
  const { user } = useAuth();
  function updateMediaCache(updated: OwnProfile | OwnSeller) {
    client.setQueryData(
      [
        "private",
        user?.id,
        path === "/users/me/profile-picture" ? "profile" : "seller",
      ],
      updated,
    );
  }
  const [files, setFiles] = useState<File[]>([]);
  const [editing, setEditing] = useState(false);
  const leave = useUnsavedChanges(files.length > 0, () => setFiles([]));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [confirm, setConfirm] = useState(false);
  const id = `media-${path.replaceAll("/", "-")}`;
  async function upload() {
    if (!files[0]) return;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const form = new FormData();
      form.append("image", files[0]);
      const updated = await api<OwnProfile | OwnSeller>(path, {
        method: "POST",
        body: form,
      });
      updateMediaCache(updated);
      setFiles([]);
      setEditing(false);
      await refresh();
      setSuccess(`${label} updated.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel">
      <h2>{label}</h2>
      <div className="media-management">
        <ImageView src={src} alt={label} />
        {src && (
          <button
            className="text-link"
            disabled={busy}
            onClick={() => setEditing(true)}
          >
            Change image
          </button>
        )}
        {src && (
          <button
            className="text-link"
            disabled={busy}
            onClick={() => {
              setConfirm(true);
              setError("");
            }}
          >
            Remove image
          </button>
        )}
      </div>
      {(!src || editing) && (
        <fieldset disabled={busy}>
          <FilePicker
            id={id}
            files={files}
            onChange={setFiles}
            multiple={false}
          />
          <button
            className="button small secondary"
            disabled={!files.length || busy}
            onClick={upload}
          >
            {busy ? (
              <>
                <LoaderCircle className="spin" size={14} /> Uploading…
              </>
            ) : (
              "Upload image"
            )}
          </button>
          {src && (
            <button
              className="text-link"
              type="button"
              disabled={busy}
              onClick={() => {
                setFiles([]);
                setEditing(false);
              }}
            >
              Cancel image change
            </button>
          )}
        </fieldset>
      )}
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="success" role="status">
          {success}
        </p>
      )}
      <ConfirmDialog
        open={leave.pendingHref !== null}
        title="Leave without uploading?"
        description="Your selected image hasn’t been uploaded yet. Keep editing or discard the selection."
        onClose={leave.cancelLeave}
        onConfirm={leave.confirmLeave}
        confirmLabel="Discard changes"
        cancelLabel="Keep editing"
      />
      <ConfirmDialog
        open={confirm}
        title={`Remove ${label.toLowerCase()}?`}
        description="You can upload a new image whenever you like."
        busy={busy}
        error={error}
        onClose={() => setConfirm(false)}
        onConfirm={async () => {
          setBusy(true);
          try {
            const updated = await api<OwnProfile | OwnSeller>(path, {
              method: "DELETE",
            });
            updateMediaCache(updated);
            await refresh();
            setConfirm(false);
            setSuccess(`${label} removed.`);
          } catch (e) {
            setError(e instanceof Error ? e.message : "Couldn’t remove image.");
          } finally {
            setBusy(false);
          }
        }}
      />
    </section>
  );
}
export function ProductImages({
  productId,
  images,
}: {
  productId: number;
  images: ProductImage[];
}) {
  const refresh = useRefresh();
  const [files, setFiles] = useState<File[]>([]);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  return (
    <section className="panel">
      <h2>Product images</h2>
      <p className="field-help">
        Images are shown in upload order. Existing images stay in place until
        you remove them.
      </p>
      <div className="upload-preview-grid">
        {[...images]
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((image, i) => (
            <div className="upload-preview" key={image.id}>
              <ImageView src={image.url} alt={`Product image ${i + 1}`} />
              <button
                className="icon-button"
                disabled={busy}
                aria-label={`Delete image ${i + 1}`}
                onClick={() => {
                  setError("");
                  setDeleting(image.id);
                }}
              >
                <X size={13} />
              </button>
            </div>
          ))}
      </div>
      <fieldset disabled={busy}>
        <FilePicker
          files={files}
          existing={images.length}
          onChange={setFiles}
        />
        <button
          className="button small secondary"
          disabled={busy || !files.length}
          onClick={async () => {
            setBusy(true);
            setError("");
            setSuccess("");
            try {
              const issue = validateFiles(files, images.length);
              if (issue) throw new Error(issue);
              const body = new FormData();
              files.forEach((file) => body.append("images", file));
              await api(`/products/${productId}/images`, {
                method: "POST",
                body,
              });
              setFiles([]);
              await refresh();
              setSuccess("Images uploaded.");
            } catch (e) {
              setError(
                e instanceof Error
                  ? e.message
                  : "Upload failed. Your existing images are safe.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? (
            <>
              <LoaderCircle className="spin" size={14} /> Uploading…
            </>
          ) : (
            "Upload images"
          )}
        </button>
      </fieldset>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="success" role="status">
          {success}
        </p>
      )}
      <ConfirmDialog
        open={deleting !== null}
        title="Remove this image?"
        description="This image will be permanently removed from the listing."
        busy={busy}
        error={error}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          setBusy(true);
          try {
            await api(`/products/${productId}/images/${deleting}`, {
              method: "DELETE",
            });
            setDeleting(null);
            await refresh();
          } catch (e) {
            setError(
              e instanceof Error ? e.message : "Couldn’t remove the image.",
            );
          } finally {
            setBusy(false);
          }
        }}
      />
    </section>
  );
}
