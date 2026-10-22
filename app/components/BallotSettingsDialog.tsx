"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { closingIn } from "./VotingCountdown";

type BallotSettingsDialogProps = {
  open: boolean;
  retailer: string;
  budgetCents: number;
  nextOrderDate: string;
  cutoffTime: string;
  onClose: () => void;
  onSave: (settings: {
    retailer: string;
    budgetCents: number;
    nextOrderDate: string;
    cutoffTime: string;
  }) => void;
};

export function BallotSettingsDialog({
  open,
  retailer,
  budgetCents,
  nextOrderDate,
  cutoffTime,
  onClose,
  onSave,
}: BallotSettingsDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [retailerName, setRetailerName] = useState(retailer);
  const [budget, setBudget] = useState(budgetCents / 100);
  const [orderDate, setOrderDate] = useState(nextOrderDate);
  const [time, setTime] = useState(cutoffTime.slice(0, 5));

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      setRetailerName(retailer);
      setBudget(budgetCents / 100);
      setOrderDate(nextOrderDate);
      setTime(cutoffTime.slice(0, 5));
      dialog.showModal();
    }

    if (!open && dialog.open) {
      dialog.close();
    }
  }, [budgetCents, cutoffTime, nextOrderDate, open, retailer]);

  function close() {
    dialogRef.current?.close();
    onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      className="app-dialog app-dialog--compact"
      onClose={onClose}
      onCancel={onClose}
    >
      <div className="dialog-heading">
        <div>
          <span className="eyebrow">Admin settings</span>
          <h2>Set the next ballot</h2>
          <p>
            Retailer, budget, and closing time apply to the whole office
            ballot.
          </p>
        </div>
        <button
          type="button"
          className="icon-button"
          aria-label="Close ballot settings"
          onClick={close}
        >
          <X aria-hidden="true" size={20} />
        </button>
      </div>

      <form
        className="item-form"
        onSubmit={(event) => {
          event.preventDefault();
          const normalizedRetailer = retailerName.trim();
          if (
            budget <= 0 ||
            normalizedRetailer.length < 2 ||
            orderDate.length === 0
          ) {
            return;
          }
          onSave({
            retailer: normalizedRetailer,
            budgetCents: Math.round(budget * 100),
            nextOrderDate: orderDate,
            cutoffTime: time,
          });
          close();
        }}
      >
        <label>
          Retailer
          <input
            autoFocus
            list="retailer-options"
            minLength={2}
            maxLength={80}
            required
            value={retailerName}
            onChange={(event) => setRetailerName(event.target.value)}
            placeholder="e.g. Checkers"
          />
          <datalist id="retailer-options">
            <option value="Checkers" />
            <option value="Pick n Pay" />
            <option value="Shoprite" />
            <option value="Woolworths" />
            <option value="Spar" />
            <option value="Makro" />
          </datalist>
        </label>
        <label>
          Budget in rand
          <input
            type="number"
            min="1"
            step="0.01"
            value={budget}
            onChange={(event) => setBudget(Number(event.target.value))}
          />
        </label>
        <div className="form-row">
          <label>
            Next order date
            <input
              type="date"
              value={orderDate}
              onChange={(event) => setOrderDate(event.target.value)}
              required
            />
          </label>
          <label>
            Votes lock at
            <input
              type="time"
              value={time}
              onChange={(event) => setTime(event.target.value)}
              required
            />
          </label>
        </div>
        <div className="closing-presets" role="group" aria-label="Close voting">
          <span>Close voting in</span>
          {(
            [
              [1, "1 min"],
              [15, "15 min"],
              [60, "1 hour"],
            ] as const
          ).map(([minutes, label]) => (
            <button
              key={minutes}
              type="button"
              onClick={() => {
                const closing = closingIn(minutes);
                setOrderDate(closing.orderDate);
                setTime(closing.cutoffTime);
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <small className="closing-hint">
          Cape Town time. The countdown hits zero and votes lock at this
          moment.
        </small>
        <div className="dialog-actions">
          <button type="button" className="button button--quiet" onClick={close}>
            Cancel
          </button>
          <button
            type="submit"
            className="button button--primary"
            disabled={
              budget <= 0 ||
              retailerName.trim().length < 2 ||
              orderDate.length === 0
            }
          >
            Update ballot
          </button>
        </div>
      </form>
    </dialog>
  );
}
