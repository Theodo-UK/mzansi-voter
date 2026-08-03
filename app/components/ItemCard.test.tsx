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
  availabilityStatus: "unknown",
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
      comments={[
        {
          id: "comment-1",
          authorId: "user-2",
          author: "Dale",
          body: "Could we try the smaller pack?",
          time: "10:24",
        },
      ]}
      onAddComment={() => undefined}
      onUpdateComment={() => undefined}
      onDeleteComment={() => undefined}
      commentsOpen={false}
      onCommentsOpenChange={() => undefined}
    />,
  );
}

describe("ItemCard", () => {
  it("flags only confirmed out-of-stock products", () => {
    const outOfStock = renderItem("out_of_stock");

    expect(outOfStock).toContain("Out of stock");
    expect(outOfStock.indexOf("Out of stock")).toBeLessThan(
      outOfStock.indexOf("item-meta"),
    );
    expect(renderItem("available")).not.toContain("Out of stock");
    expect(renderItem("unknown")).not.toContain("Out of stock");
  });

  it("shows the comment count on the item", () => {
    expect(renderItem("available")).toContain(
      "View 1 comment about Kara Sev &amp; Nuts",
    );
  });
});
