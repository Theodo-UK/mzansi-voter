export type VoteValue = -1 | 1;
export type PurchaseType = "recurring" | "one_off";

export type ItemVote = {
  userId: string;
  displayName: string;
  value: VoteValue;
};

export type GroceryItem = {
  id: string;
  name: string;
  priceCents: number;
  productUrl: string;
  purchaseType: PurchaseType;
  locked: boolean;
  skipped: boolean;
  createdAt: string;
  createdBy: string;
  votes: ItemVote[];
};

export type RankedItem = GroceryItem & {
  score: number;
  upVoters: string[];
  downVoters: string[];
};

export type BudgetResult = {
  accepted: RankedItem[];
  outOfBudget: RankedItem[];
  skipped: RankedItem[];
  usedCents: number;
  remainingCents: number;
  lockedTotalCents: number;
  lockedOverBudget: boolean;
};

export function getVoteSummary(item: GroceryItem) {
  const upVoters = item.votes
    .filter((vote) => vote.value === 1)
    .map((vote) => vote.displayName);
  const downVoters = item.votes
    .filter((vote) => vote.value === -1)
    .map((vote) => vote.displayName);

  return {
    score: upVoters.length - downVoters.length,
    upVoters,
    downVoters,
  };
}

export function rankItems(items: GroceryItem[]): RankedItem[] {
  return items
    .map((item) => ({ ...item, ...getVoteSummary(item) }))
    .sort((left, right) => {
      if (left.locked !== right.locked) {
        return left.locked ? -1 : 1;
      }

      if (left.score !== right.score) {
        return right.score - left.score;
      }

      return left.createdAt.localeCompare(right.createdAt);
    });
}

export function applyBudgetCutoff(
  items: GroceryItem[],
  budgetCents: number,
): BudgetResult {
  const ranked = rankItems(items);
  const active = ranked.filter((item) => !item.skipped);
  const skipped = ranked.filter((item) => item.skipped);
  const accepted: RankedItem[] = [];
  let cutoffIndex = active.length;
  let usedCents = 0;

  for (const [index, item] of active.entries()) {
    if (usedCents + item.priceCents > budgetCents) {
      cutoffIndex = index;
      break;
    }

    accepted.push(item);
    usedCents += item.priceCents;
  }

  const lockedTotalCents = active
    .filter((item) => item.locked)
    .reduce((total, item) => total + item.priceCents, 0);

  return {
    accepted,
    outOfBudget: active.slice(cutoffIndex),
    skipped,
    usedCents,
    remainingCents: Math.max(0, budgetCents - usedCents),
    lockedTotalCents,
    lockedOverBudget: lockedTotalCents > budgetCents,
  };
}

export function formatRand(cents: number) {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

export function deriveDisplayName(email: string) {
  const localPart = email.trim().toLowerCase().split("@")[0] ?? "";

  return localPart
    .split(".")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

export function isAllowedTheodoEmail(email: string) {
  const normalised = email.trim().toLowerCase();
  return /^[^@\s]+@theodo[.]com$/.test(normalised);
}
