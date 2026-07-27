import { describe, expect, it } from "vitest";
import { initialItems } from "./fixture";
import {
  applyBudgetCutoff,
  deriveDisplayName,
  isAllowedTheodoEmail,
  rankItems,
  type GroceryItem,
} from "./voting";

function item(overrides: Partial<GroceryItem> = {}): GroceryItem {
  return {
    id: crypto.randomUUID(),
    name: "Test item",
    priceCents: 1_000,
    productUrl: "https://example.com/product",
    purchaseType: "recurring",
    locked: false,
    skipped: false,
    createdAt: "2026-07-27T10:00:00.000Z",
    createdBy: "Liam Hitchcock",
    votes: [],
    ...overrides,
  };
}

describe("email access and display names", () => {
  it("derives the agreed display name from the email local-part", () => {
    expect(deriveDisplayName("liam.hitchcock@theodo.com")).toBe(
      "Liam Hitchcock",
    );
  });

  it("accepts the exact Theodo domain case-insensitively", () => {
    expect(isAllowedTheodoEmail(" Liam.Hitchcock@THEODO.COM ")).toBe(true);
  });

  it("rejects other and suffix-lookalike domains", () => {
    expect(isAllowedTheodoEmail("liam.hitchcock@gmail.com")).toBe(false);
    expect(isAllowedTheodoEmail("liam@theodo.com.example")).toBe(false);
    expect(isAllowedTheodoEmail("liam@evil.com@theodo.com")).toBe(false);
    expect(isAllowedTheodoEmail("theodo.com")).toBe(false);
  });
});

describe("ranking", () => {
  it("pins locked items before higher-scoring ordinary items", () => {
    const locked = item({ id: "locked", locked: true });
    const popular = item({
      id: "popular",
      createdAt: "2026-07-27T09:00:00.000Z",
      votes: [
        { userId: "one", displayName: "OnePerson", value: 1 },
        { userId: "two", displayName: "TwoPerson", value: 1 },
      ],
    });

    expect(rankItems([popular, locked]).map(({ id }) => id)).toEqual([
      "locked",
      "popular",
    ]);
  });

  it("uses creation time as a deterministic tie-breaker", () => {
    const earlier = item({
      id: "earlier",
      createdAt: "2026-07-27T08:00:00.000Z",
    });
    const later = item({
      id: "later",
      createdAt: "2026-07-27T09:00:00.000Z",
    });

    expect(rankItems([later, earlier]).map(({ id }) => id)).toEqual([
      "earlier",
      "later",
    ]);
  });
});

describe("strict budget cutoff", () => {
  it("stops at the first unaffordable item instead of packing cheaper items", () => {
    const result = applyBudgetCutoff(
      [
        item({ id: "first", priceCents: 7_000 }),
        item({
          id: "blocker",
          priceCents: 4_000,
          createdAt: "2026-07-27T10:01:00.000Z",
        }),
        item({
          id: "cheaper",
          priceCents: 2_000,
          createdAt: "2026-07-27T10:02:00.000Z",
        }),
      ],
      10_000,
    );

    expect(result.accepted.map(({ id }) => id)).toEqual(["first"]);
    expect(result.outOfBudget.map(({ id }) => id)).toEqual([
      "blocker",
      "cheaper",
    ]);
    expect(result.remainingCents).toBe(3_000);
  });

  it("excludes skipped items from ranking and budget use", () => {
    const result = applyBudgetCutoff(
      [
        item({ id: "active", priceCents: 1_000 }),
        item({ id: "skipped", skipped: true, priceCents: 9_000 }),
      ],
      5_000,
    );

    expect(result.accepted.map(({ id }) => id)).toEqual(["active"]);
    expect(result.skipped.map(({ id }) => id)).toEqual(["skipped"]);
    expect(result.usedCents).toBe(1_000);
  });

  it("warns when locked staples alone exceed the budget", () => {
    const result = applyBudgetCutoff(
      [
        item({ id: "milk", locked: true, priceCents: 6_000 }),
        item({ id: "coffee", locked: true, priceCents: 5_000 }),
      ],
      10_000,
    );

    expect(result.lockedOverBudget).toBe(true);
    expect(result.lockedTotalCents).toBe(11_000);
  });

  it("matches the inspected Cape Town fixture and blocks at droewors", () => {
    const result = applyBudgetCutoff(initialItems, 100_000);

    expect(result.usedCents).toBe(85_098);
    expect(result.outOfBudget[0]?.id).toBe("droewors");
  });
});
