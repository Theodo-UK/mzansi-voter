import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { AvailabilityStatus } from "@/lib/availability";
import type { RankedItem } from "@/lib/voting";
import { ItemCard } from "./ItemCard";

const item: RankedItem = {
  id: "item-1",
  name: "Kara Sev & Nuts",
  priceCents: 999,
  productUrl:
    "https://www.checkers.co.za/product/kara-nichhas-sev-and-nuts-snack-100g-10203715EA",
  purchaseType: "one_off",
  locked: false,
  skipped: false,
  createdAt: "2026-07-31T08:00:00.000Z",
  createdBy: "Liam",
  votes: [],
  score: 0,
  upVoters: [],
  downVoters: [],
};

function renderItem(availability: AvailabilityStatus) {
  return renderToStaticMarkup(
    <ItemCard
      item={item}
      availability={availability}
      status="accepted"
      currentUserId="user-1"
      isAdmin={false}
      onVote={() => undefined}
      onEdit={() => undefined}
      onDelete={() => undefined}
      onToggleLock={() => undefined}
      onToggleSkip={() => undefined}
    />,
  );
}

describe("ItemCard", () => {
  it("flags only confirmed out-of-stock products", () => {
    expect(renderItem("out_of_stock")).toContain("Out of stock");
    expect(renderItem("available")).not.toContain("Out of stock");
    expect(renderItem("unknown")).not.toContain("Out of stock");
  });
});
