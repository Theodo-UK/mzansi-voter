"use client";

/* eslint-disable @next/next/no-img-element -- Preview URLs are retailer-hosted and discovered at runtime. */

import { useId, useState } from "react";

type ProductPreviewProps = {
  imageUrl: string;
  productName: string;
};

export function ProductPreview({
  imageUrl,
  productName,
}: ProductPreviewProps) {
  const previewId = useId();
  const [open, setOpen] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  if (imageFailed) return null;

  return (
    <span
      className={`product-preview${open ? " is-open" : ""}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setOpen(false);
        }
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          setOpen(false);
        }
      }}
    >
      <button
        type="button"
        className="product-preview__trigger"
        aria-label={`Preview ${productName}`}
        aria-controls={previewId}
        aria-expanded={open}
        onClick={(event) =>
          setOpen((current) => (event.detail === 0 ? true : !current))
        }
        onFocus={(event) => {
          if (event.currentTarget.matches(":focus-visible")) {
            setOpen(true);
          }
        }}
      >
        <img
          src={imageUrl}
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
        />
      </button>
      <span
        id={previewId}
        className="product-preview__panel"
        role="tooltip"
        aria-hidden={!open}
      >
        <img
          src={imageUrl}
          alt={`${productName} product preview`}
          loading="lazy"
          decoding="async"
          onError={() => setImageFailed(true)}
        />
      </span>
    </span>
  );
}
