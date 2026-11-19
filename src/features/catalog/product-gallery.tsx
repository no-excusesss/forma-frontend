"use client";
import { useId, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Expand, X } from "lucide-react";
import type { ProductImage } from "@/lib/contracts";
import { ImageView } from "@/components/ui";

export function ProductGallery({
  title,
  images,
}: {
  title: string;
  images: ProductImage[];
}) {
  const sorted = [...images].sort((a, b) => a.sortOrder - b.sortOrder);
  const [index, setIndex] = useState(0);
  const current = Math.min(index, Math.max(0, sorted.length - 1));
  const image = sorted[current];
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const move = (direction: number) =>
    setIndex(
      (previous) => (previous + direction + sorted.length) % sorted.length,
    );
  return (
    <div className="product-gallery">
      <div className={`main-product-image${image ? "" : " is-empty"}`}>
        {image ? (
          <button
            className="gallery-open"
            type="button"
            aria-label={`Enlarge image of ${title}`}
            onClick={() => dialog.current?.showModal()}
          >
            <ImageView
              src={image.url}
              alt={`${title} — image ${current + 1}`}
            />
            <span className="gallery-counter">
              {current + 1} / {sorted.length}
            </span>
            <span className="gallery-zoom">
              <Expand size={18} aria-hidden="true" />
            </span>
          </button>
        ) : (
          <ImageView alt={title} />
        )}
      </div>
      {sorted.length > 1 && (
        <div className="thumbnails" aria-label="Product images">
          {sorted.map((item, position) => (
            <button
              type="button"
              key={item.id}
              className={current === position ? "selected" : ""}
              aria-pressed={current === position}
              aria-label={`View image ${position + 1} of ${title}`}
              onClick={() => setIndex(position)}
            >
              <ImageView src={item.url} alt={`${title} view ${position + 1}`} />
            </button>
          ))}
        </div>
      )}
      <dialog
        className="dialog gallery-dialog"
        ref={dialog}
        aria-labelledby={titleId}
        onClick={(event) => {
          if (event.target !== event.currentTarget) return;
          const bounds = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < bounds.left ||
            event.clientX > bounds.right ||
            event.clientY < bounds.top ||
            event.clientY > bounds.bottom
          )
            dialog.current?.close();
        }}
        onKeyDown={(event) => {
          if (
            sorted.length > 1 &&
            ["ArrowLeft", "ArrowRight"].includes(event.key)
          ) {
            event.preventDefault();
            move(event.key === "ArrowRight" ? 1 : -1);
          }
        }}
      >
        <h2 id={titleId}>{title}</h2>
        <button
          type="button"
          className="icon-button dialog-close"
          aria-label="Close product images"
          autoFocus
          onClick={() => dialog.current?.close()}
        >
          <X size={22} />
        </button>
        <div className="gallery-display">
          <ImageView
            src={image?.url}
            alt={`${title} — enlarged image ${current + 1}`}
          />
        </div>
        <div className="gallery-tools">
          {sorted.length > 1 && (
            <button
              type="button"
              className="icon-button"
              aria-label="Previous product image"
              onClick={() => move(-1)}
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <span role="status">
            Image {current + 1} of {sorted.length}
          </span>
          {sorted.length > 1 && (
            <button
              type="button"
              className="icon-button"
              aria-label="Next product image"
              onClick={() => move(1)}
            >
              <ArrowRight size={20} />
            </button>
          )}
        </div>
      </dialog>
    </div>
  );
}
