"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
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
  const [form, setForm] = useState<ItemInput>(() => toForm(item));
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      setForm(toForm(item));
      setErrors({});
      dialog.showModal();
    }

    if (!open && dialog.open) {
      dialog.close();
    }
  }, [item, open]);

  function update<K extends keyof ItemInput>(key: K, value: ItemInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
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
            Add the exact price and a {retailer} link so the eventual shopper
            has no detective work.
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
          Item name
          <input
            autoFocus
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

        <label>
          Product link
          <input
            type="url"
            value={form.productUrl}
            onChange={(event) => update("productUrl", event.target.value)}
            placeholder="https://..."
          />
          {errors.productUrl ? <small>{errors.productUrl}</small> : null}
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
