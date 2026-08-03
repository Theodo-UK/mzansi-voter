"use client";

import { useEffect, useRef, useState } from "react";
import { Check, LoaderCircle, X } from "lucide-react";
import { z } from "zod";
import type { GroceryItem, PurchaseType, RankedItem } from "@/lib/voting";

const itemSchema = z.object({
  name: z.string().trim().min(2, "Give the item a useful name."),
  price: z.coerce.number().positive("Price must be greater than zero."),
  productUrl: z
    .url("Use a complete product URL, including https://")
    .refine((value) => value.startsWith("https://"), {
      message: "Product links must use https://",
    }),
  purchaseType: z.enum(["recurring", "one_off"]),
});

export type ItemInput = z.infer<typeof itemSchema>;

type ItemDialogProps = {
  open: boolean;
  item?: RankedItem;
  retailer: string;
  onClose: () => void;
  onSave: (input: ItemInput, itemId?: string) => void;
};

type LookupState = "idle" | "loading" | "success" | "error";

const emptyForm: ItemInput = {
  name: "",
  price: 0,
  productUrl: "",
  purchaseType: "recurring",
};

function toForm(item?: GroceryItem): ItemInput {
  return item
    ? {
        name: item.name,
        price: item.priceCents / 100,
        productUrl: item.productUrl,
        purchaseType: item.purchaseType,
      }
    : emptyForm;
}

export function ItemDialog({
  open,
  item,
  retailer,
  onClose,
  onSave,
}: ItemDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const lookupRequestRef = useRef(0);
  const nameEditedRef = useRef(false);
  const priceEditedRef = useRef(false);
  const [form, setForm] = useState<ItemInput>(() => toForm(item));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [lookupState, setLookupState] = useState<LookupState>("idle");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      setForm(toForm(item));
      setErrors({});
      setLookupState("idle");
      nameEditedRef.current = false;
      priceEditedRef.current = false;
      dialog.showModal();
    }

    if (!open && dialog.open) {
      dialog.close();
    }
  }, [item, open]);

  function update<K extends keyof ItemInput>(key: K, value: ItemInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
    if (key === "productUrl") {
      lookupRequestRef.current += 1;
      nameEditedRef.current = false;
      priceEditedRef.current = false;
      setLookupState("idle");
    } else if (key === "name") {
      nameEditedRef.current = true;
    } else if (key === "price") {
      priceEditedRef.current = true;
    }
  }

  async function populateProductDetails(url = form.productUrl) {
    const productUrl = url.trim();
    if (!productUrl || productUrl === item?.productUrl) return;

    const requestId = ++lookupRequestRef.current;
    setLookupState("loading");
    try {
      const response = await fetch("/api/product-details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: productUrl }),
      });
      if (!response.ok) throw new Error("Lookup failed");

      const details = (await response.json()) as {
        name: string;
        price: number;
        productUrl: string;
      };
      if (lookupRequestRef.current !== requestId) return;

      setForm((current) =>
        current.productUrl.trim() === productUrl
          ? {
              ...current,
              productUrl: details.productUrl,
              name: nameEditedRef.current ? current.name : details.name,
              price: priceEditedRef.current ? current.price : details.price,
            }
          : current,
      );
      setErrors((current) => ({ ...current, name: "", price: "" }));
      setLookupState("success");
    } catch {
      if (lookupRequestRef.current !== requestId) return;
      setLookupState("error");
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = itemSchema.safeParse(form);

    if (!result.success) {
      const nextErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        nextErrors[String(issue.path[0])] = issue.message;
      }
      setErrors(nextErrors);
      return;
    }

    onSave(result.data, item?.id);
    dialogRef.current?.close();
    onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      className="app-dialog"
      onClose={onClose}
      onCancel={onClose}
    >
      <div className="dialog-heading">
        <div>
          <span className="eyebrow">{item ? "Admin edit" : "New suggestion"}</span>
          <h2>{item ? "Update the item" : "Put it to a vote"}</h2>
          <p>
            Paste a {retailer} link and we&apos;ll add the item name and price.
          </p>
        </div>
        <button
          type="button"
          className="icon-button"
          aria-label="Close item form"
          onClick={() => {
            dialogRef.current?.close();
            onClose();
          }}
        >
          <X aria-hidden="true" size={20} />
        </button>
      </div>

      <form className="item-form" onSubmit={handleSubmit}>
        <label>
          Product link
          <span className="product-link-field">
            <input
              autoFocus
              type="url"
              value={form.productUrl}
              onChange={(event) => update("productUrl", event.target.value)}
              onPaste={(event) => {
                const pastedUrl = event.clipboardData.getData("text");
                window.setTimeout(
                  () => void populateProductDetails(pastedUrl),
                  0,
                );
              }}
              onBlur={() => void populateProductDetails()}
              placeholder="https://www.checkers.co.za/product/..."
            />
            {lookupState === "loading" ? (
              <LoaderCircle
                className="product-link-field__icon product-link-field__icon--loading"
                aria-label="Fetching product details"
                size={17}
              />
            ) : null}
            {lookupState === "success" ? (
              <Check
                className="product-link-field__icon product-link-field__icon--success"
                aria-label="Product details added"
                size={17}
              />
            ) : null}
          </span>
          {errors.productUrl ? <small>{errors.productUrl}</small> : null}
          {lookupState === "loading" ? (
            <small className="product-lookup-status" aria-live="polite">
              Fetching product details…
            </small>
          ) : null}
          {lookupState === "success" ? (
            <small
              className="product-lookup-status product-lookup-status--success"
              aria-live="polite"
            >
              Details found. Confirm the price before adding.
            </small>
          ) : null}
          {lookupState === "error" ? (
            <small>
              Couldn&apos;t read this product. Enter the details manually.
            </small>
          ) : null}
        </label>

        <label>
          Item name
          <input
            value={form.name}
            onChange={(event) => update("name", event.target.value)}
            placeholder="e.g. Naartjies"
          />
          {errors.name ? <small>{errors.name}</small> : null}
        </label>

        <label>
          Price in rand
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={form.price || ""}
            onChange={(event) => update("price", Number(event.target.value))}
            placeholder="70.00"
          />
          {errors.price ? <small>{errors.price}</small> : null}
        </label>

        <fieldset className="purchase-options">
          <legend>How often do we need it?</legend>
          <label>
            <input
              type="radio"
              name="purchaseType"
              value="recurring"
              checked={form.purchaseType === "recurring"}
              onChange={() =>
                update("purchaseType", "recurring" as PurchaseType)
              }
            />
            <span>
              <strong>Regular</strong>
              Stays for the next shopping cycle.
            </span>
          </label>
          <label>
            <input
              type="radio"
              name="purchaseType"
              value="one_off"
              checked={form.purchaseType === "one_off"}
              onChange={() => update("purchaseType", "one_off" as PurchaseType)}
            />
            <span>
              <strong>One-off</strong>
              Leaves after it makes a completed order.
            </span>
          </label>
        </fieldset>

        <div className="dialog-actions">
          <button
            type="button"
            className="button button--quiet"
            onClick={() => {
              dialogRef.current?.close();
              onClose();
            }}
          >
            Cancel
          </button>
          <button type="submit" className="button button--primary">
            {item ? "Save changes" : "Add to the ballot"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
