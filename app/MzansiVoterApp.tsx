"use client";

import { useMemo, useState } from "react";
import {
  CalendarClock,
  ChartNoAxesCombined,
  Check,
  ChevronDown,
  CircleAlert,
  Info,
  LogOut,
  Plus,
  Settings2,
  Store,
  Trash2,
  UserCog,
} from "lucide-react";
import Link from "next/link";
import { BallotSettingsDialog } from "./components/BallotSettingsDialog";
import { ItemCard } from "./components/ItemCard";
import { ItemDialog, type ItemInput } from "./components/ItemDialog";
import {
  currentUser as fixtureUser,
  initialItems as fixtureItems,
} from "@/lib/fixture";
import type { AppUser } from "@/lib/supabase/repository";
import {
  applyBudgetCutoff,
  formatRand,
  type GroceryItem,
  type RankedItem,
  type VoteValue,
} from "@/lib/voting";

const DEFAULT_BUDGET_CENTS = 100_000;
const DEFAULT_NEXT_ORDER_DATE = "2026-07-31";

export type ShoppingPersistence = {
  saveItem: (input: ItemInput, itemId?: string) => Promise<string>;
  vote: (itemId: string, value: VoteValue | null) => Promise<void>;
  deleteItem: (itemId: string) => Promise<void>;
  setItemFlags: (
    itemId: string,
    patch: Partial<Pick<GroceryItem, "locked" | "skipped">>,
  ) => Promise<void>;
  updateGroupSettings: (settings: {
    retailer: string;
    budgetCents: number;
    nextOrderDate: string;
    cutoffTime: string;
  }) => Promise<void>;
  clearItems: () => Promise<void>;
  startNextCycle: (acceptedItemIds: string[]) => Promise<void>;
};

type MzansiVoterAppProps = {
  user?: AppUser;
  groupName?: string;
  startingRetailer?: string;
  startingItems?: GroceryItem[];
  startingBudgetCents?: number;
  startingNextOrderDate?: string;
  startingCutoffTime?: string;
  persistence?: ShoppingPersistence;
  showDevtools?: boolean;
  insightsHref?: string;
  onSignOut?: () => void;
};

function formatOrderDeadline(orderDate: string, cutoffTime: string) {
  const [year, month, day] = orderDate.split("-").map(Number);
  const [hours, minutes] = cutoffTime.split(":").map(Number);
  const date = new Date(year, month - 1, day, hours, minutes);

  return new Intl.DateTimeFormat("en-ZA", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function newItemFrom(input: ItemInput, user: AppUser): GroceryItem {
  return {
    id: crypto.randomUUID(),
    name: input.name,
    priceCents: Math.round(input.price * 100),
    productUrl: input.productUrl,
    purchaseType: input.purchaseType,
    locked: false,
    skipped: false,
    createdAt: new Date().toISOString(),
    createdBy: user.displayName,
    votes: [],
  };
}

export function MzansiVoterApp({
  user = fixtureUser,
  groupName = "Cape Town",
  startingRetailer = "Checkers",
  startingItems = fixtureItems,
  startingBudgetCents = DEFAULT_BUDGET_CENTS,
  startingNextOrderDate = DEFAULT_NEXT_ORDER_DATE,
  startingCutoffTime = "10:00",
  persistence,
  showDevtools = process.env.NODE_ENV === "development" &&
    persistence === undefined,
  insightsHref = process.env.NEXT_PUBLIC_DEPLOY_ENV === "development"
    ? "/metrics"
    : undefined,
  onSignOut,
}: MzansiVoterAppProps = {}) {
  const [items, setItems] = useState<GroceryItem[]>(startingItems);
  const [retailer, setRetailer] = useState(startingRetailer);
  const [budgetCents, setBudgetCents] = useState(startingBudgetCents);
  const [nextOrderDate, setNextOrderDate] = useState(startingNextOrderDate);
  const [cutoffTime, setCutoffTime] = useState(startingCutoffTime);
  const [editingItem, setEditingItem] = useState<RankedItem>();
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [adminPreview, setAdminPreview] = useState(user.role === "admin");
  const [sharedData, setSharedData] = useState({
    items: startingItems,
    retailer: startingRetailer,
    budgetCents: startingBudgetCents,
    nextOrderDate: startingNextOrderDate,
    cutoffTime: startingCutoffTime,
  });
  const budget = useMemo(
    () => applyBudgetCutoff(items, budgetCents),
    [budgetCents, items],
  );
  const isAdmin = showDevtools ? adminPreview : user.role === "admin";

  if (
    sharedData.items !== startingItems ||
    sharedData.retailer !== startingRetailer ||
    sharedData.budgetCents !== startingBudgetCents ||
    sharedData.nextOrderDate !== startingNextOrderDate ||
    sharedData.cutoffTime !== startingCutoffTime
  ) {
    // Reconcile shared data without remounting local dialog state.
    setSharedData({
      items: startingItems,
      retailer: startingRetailer,
      budgetCents: startingBudgetCents,
      nextOrderDate: startingNextOrderDate,
      cutoffTime: startingCutoffTime,
    });
    setItems(startingItems);
    setRetailer(startingRetailer);
    setBudgetCents(startingBudgetCents);
    setNextOrderDate(startingNextOrderDate);
    setCutoffTime(startingCutoffTime);
  }

  function announce(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2600);
  }

  function handleVote(itemId: string, value: VoteValue) {
    const previous = items;
    const item = items.find((candidate) => candidate.id === itemId);
    if (!item || item.locked || item.skipped) return;

    const existing = item.votes.find((vote) => vote.userId === user.id);
    const nextValue = existing?.value === value ? null : value;
    setItems((current) =>
      current.map((candidate) => {
        if (candidate.id !== itemId) return candidate;

        const otherVotes = candidate.votes.filter(
          (vote) => vote.userId !== user.id,
        );
        return {
          ...candidate,
          votes:
            nextValue === null
              ? otherVotes
              : [
                  ...otherVotes,
                  {
                    userId: user.id,
                    displayName: user.displayName,
                    value: nextValue,
                  },
                ],
        };
      }),
    );

    void persistence?.vote(itemId, nextValue).catch(() => {
      setItems(previous);
      announce("Vote failed. The previous ballot has been restored.");
    });
  }

  function handleSave(input: ItemInput, itemId?: string) {
    const previous = items;
    if (itemId) {
      setItems((current) =>
        current.map((item) =>
          item.id === itemId
            ? {
                ...item,
                name: input.name,
                priceCents: Math.round(input.price * 100),
                productUrl: input.productUrl,
                purchaseType: input.purchaseType,
              }
            : item,
        ),
      );
      announce("Item updated.");
      void persistence?.saveItem(input, itemId).catch(() => {
        setItems(previous);
        announce("Update failed. The previous item has been restored.");
      });
      return;
    }

    const optimisticItem = newItemFrom(input, user);
    setItems((current) => [...current, optimisticItem]);
    announce("Suggestion added to the ballot.");
    void persistence
      ?.saveItem(input)
      .then((savedId) => {
        setItems((current) =>
          current.map((item) =>
            item.id === optimisticItem.id ? { ...item, id: savedId } : item,
          ),
        );
      })
      .catch(() => {
        setItems(previous);
        announce("Suggestion failed. Nothing was added.");
      });
  }

  function toggleProperty(itemId: string, property: "locked" | "skipped") {
    const previous = items;
    const item = items.find((candidate) => candidate.id === itemId);
    if (!item) return;
    const nextValue = !item[property];
    setItems((current) =>
      current.map((item) =>
        item.id === itemId ? { ...item, [property]: nextValue } : item,
      ),
    );
    void persistence
      ?.setItemFlags(itemId, { [property]: nextValue })
      .catch(() => {
        setItems(previous);
        announce("Admin change failed and was rolled back.");
      });
  }

  function handleDelete(itemId: string) {
    if (!window.confirm("Delete this item from the ballot?")) return;

    const previous = items;
    setItems((current) =>
      current.filter((candidate) => candidate.id !== itemId),
    );
    announce("Item deleted.");
    void persistence?.deleteItem(itemId).catch(() => {
      setItems(previous);
      announce("Delete failed. The item has been restored.");
    });
  }

  function startNextCycle() {
    if (
      !window.confirm(
        "Start the next cycle? This clears every vote and removes accepted one-off items.",
      )
    ) {
      return;
    }

    const previous = items;
    const acceptedIds = new Set(budget.accepted.map((item) => item.id));
    setItems((current) =>
      current
        .filter(
          (item) =>
            item.purchaseType === "recurring" || !acceptedIds.has(item.id),
        )
        .map((item) => ({ ...item, votes: [], skipped: false })),
    );
    announce("New shopping cycle started.");
    void persistence
      ?.startNextCycle(Array.from(acceptedIds))
      .catch(() => {
        setItems(previous);
        announce("Cycle reset failed. The ballot has been restored.");
      });
  }

  function clearAllItems() {
    if (
      !items.length ||
      !window.confirm(
        "Clear every item from the ballot? This permanently deletes all items and votes.",
      )
    ) {
      return;
    }

    const previous = items;
    setItems([]);
    announce("All ballot items cleared.");
    void persistence?.clearItems().catch(() => {
      setItems(previous);
      announce("Clear failed. The ballot has been restored.");
    });
  }

  return (
    <main className="app-shell">
      <header className="site-header">
        <a className="brand" href="#" aria-label="Mzansi Voter home">
          <span className="brand-mark" aria-hidden="true" />
          <span>
            <strong>Mzansi Voter</strong>
            <small>The office shop, democratically.</small>
          </span>
        </a>
        <div className="account-area">
          {insightsHref ? (
            <Link className="insights-link" href={insightsHref}>
              <ChartNoAxesCombined aria-hidden="true" size={16} />
              <span>Insights</span>
            </Link>
          ) : null}
          <div className="account-copy">
            <span>{user.displayName}</span>
            <small>
              {groupName} · {isAdmin ? "Admin" : "Member"}
            </small>
          </div>
          <span className="avatar" aria-hidden="true">
            {user.displayName.slice(0, 2).toUpperCase()}
          </span>
          {isAdmin && persistence ? (
            <Link
              className="icon-button"
              href="/settings"
              aria-label="Open admin settings"
            >
              <UserCog aria-hidden="true" size={19} />
            </Link>
          ) : null}
          <button
            type="button"
            className="icon-button"
            aria-label="Sign out"
            onClick={() =>
              onSignOut
                ? onSignOut()
                : announce("Sign-out connects when Supabase is configured.")
            }
          >
            <LogOut aria-hidden="true" size={19} />
          </button>
        </div>
      </header>

      <section className="ballot-shell" aria-labelledby="ballot-title">
        <div className="ballot-intro">
          <span className="eyebrow">{groupName} office ballot</span>
          <h1 id="ballot-title">
            Voting list
            <span
              className="brand-mark ballot-title-mark"
              aria-hidden="true"
            />
          </h1>
          <div className="budget-summary">
            <div className="budget-heading">
              <strong>Budget: {formatRand(budgetCents)}</strong>
              {isAdmin ? (
                <button
                  type="button"
                  className="icon-button icon-button--settings"
                  aria-label="Edit ballot settings"
                  onClick={() => setSettingsDialogOpen(true)}
                >
                  <Settings2 aria-hidden="true" size={17} />
                </button>
              ) : null}
            </div>
            <p>
              <Store aria-hidden="true" size={15} />
              Shopping at {retailer}
            </p>
            <p>
              <CalendarClock aria-hidden="true" size={15} />
              Next order: {formatOrderDeadline(nextOrderDate, cutoffTime)}
            </p>
          </div>
        </div>

        <details className="how-it-works" open>
          <summary>
            <span>
              <Info aria-hidden="true" size={17} />
              How it works
            </span>
            <ChevronDown aria-hidden="true" size={17} />
          </summary>
          <div className="how-it-works__copy">
            <p>
              Suggest something the office should buy, then vote it up or down.
              Hover or focus a vote to see who chose it.
            </p>
            <p>
              Popular items rise to the top. The budget line marks the cut, so
              anything below it needs more votes.
            </p>
          </div>
        </details>

        <div className="suggest-row">
          <button
            type="button"
            className="button button--primary"
            onClick={() => {
              setEditingItem(undefined);
              setItemDialogOpen(true);
            }}
          >
            <Plus aria-hidden="true" size={17} />
            Suggest an item for the list
          </button>
        </div>

        {budget.lockedOverBudget ? (
          <div className="warning-banner" role="alert">
            <CircleAlert aria-hidden="true" size={18} />
            Locked staples exceed the whole budget. The ballot needs an admin.
          </div>
        ) : null}

        <ol className="item-list" aria-label="Items within budget">
          {budget.accepted.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              status="accepted"
              currentUserId={user.id}
              isAdmin={isAdmin}
              onVote={handleVote}
              onEdit={(selected) => {
                setEditingItem(selected);
                setItemDialogOpen(true);
              }}
              onDelete={handleDelete}
              onToggleLock={(itemId) => toggleProperty(itemId, "locked")}
              onToggleSkip={(itemId) => toggleProperty(itemId, "skipped")}
            />
          ))}
        </ol>

        {budget.outOfBudget.length ? (
          <>
            <div className="budget-divider">
              <span>Out of budget</span>
              <strong>{formatRand(budget.usedCents)} used</strong>
            </div>
            <ol className="item-list" aria-label="Items outside the budget">
              {budget.outOfBudget.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  status="out"
                  currentUserId={user.id}
                  isAdmin={isAdmin}
                  onVote={handleVote}
                  onEdit={(selected) => {
                    setEditingItem(selected);
                    setItemDialogOpen(true);
                  }}
                  onDelete={handleDelete}
                  onToggleLock={(itemId) => toggleProperty(itemId, "locked")}
                  onToggleSkip={(itemId) => toggleProperty(itemId, "skipped")}
                />
              ))}
            </ol>
          </>
        ) : null}

        {budget.skipped.length ? (
          <>
            <div className="budget-divider budget-divider--skipped">
              <span>Skipped this cycle</span>
              <strong>{budget.skipped.length}</strong>
            </div>
            <ol className="item-list" aria-label="Skipped items">
              {budget.skipped.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  status="skipped"
                  currentUserId={user.id}
                  isAdmin={isAdmin}
                  onVote={handleVote}
                  onEdit={(selected) => {
                    setEditingItem(selected);
                    setItemDialogOpen(true);
                  }}
                  onDelete={handleDelete}
                  onToggleLock={(itemId) => toggleProperty(itemId, "locked")}
                  onToggleSkip={(itemId) => toggleProperty(itemId, "skipped")}
                />
              ))}
            </ol>
          </>
        ) : null}

        {isAdmin ? (
          <div className="admin-actions">
            <div>
              <span className="eyebrow">Admin</span>
              <strong>Manage the ballot</strong>
              <p>Start the next cycle, or clear every item and begin again.</p>
            </div>
            <div className="admin-actions__buttons">
              <button
                type="button"
                className="button button--danger"
                disabled={!items.length}
                onClick={clearAllItems}
              >
                <Trash2 aria-hidden="true" size={16} />
                Clear all items
              </button>
              <button
                type="button"
                className="button button--quiet"
                disabled={!items.length}
                onClick={startNextCycle}
              >
                <Check aria-hidden="true" size={16} />
                Start next cycle
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <footer className="site-footer">
        <span>Mzansi Voter · Cape Town</span>
        <span>Office groceries, voted lekker.</span>
      </footer>

      {showDevtools ? (
        <aside className="devtools-toggle" aria-label="Developer preview">
          <span>Dev preview</span>
          <button
            type="button"
            role="switch"
            aria-checked={isAdmin}
            onClick={() => {
              setAdminPreview((current) => !current);
              if (isAdmin) setSettingsDialogOpen(false);
            }}
          >
            <span className="devtools-toggle__track" aria-hidden="true">
              <span />
            </span>
            Admin mode {isAdmin ? "on" : "off"}
          </button>
        </aside>
      ) : null}

      <ItemDialog
        open={itemDialogOpen}
        item={editingItem}
        retailer={retailer}
        onClose={() => {
          setItemDialogOpen(false);
          setEditingItem(undefined);
        }}
        onSave={handleSave}
      />
      <BallotSettingsDialog
        open={settingsDialogOpen}
        retailer={retailer}
        budgetCents={budgetCents}
        nextOrderDate={nextOrderDate}
        cutoffTime={cutoffTime}
        onClose={() => setSettingsDialogOpen(false)}
        onSave={(settings) => {
          const previous = {
            retailer,
            budgetCents,
            nextOrderDate,
            cutoffTime,
          };
          setRetailer(settings.retailer);
          setBudgetCents(settings.budgetCents);
          setNextOrderDate(settings.nextOrderDate);
          setCutoffTime(settings.cutoffTime);
          announce("Ballot settings updated.");
          void persistence?.updateGroupSettings(settings).catch(() => {
            setRetailer(previous.retailer);
            setBudgetCents(previous.budgetCents);
            setNextOrderDate(previous.nextOrderDate);
            setCutoffTime(previous.cutoffTime);
            announce("Settings update failed and was rolled back.");
          });
        }}
      />

      <div className={`toast ${notice ? "is-visible" : ""}`} role="status">
        {notice}
      </div>
    </main>
  );
}
