import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ItemComments } from "./ItemComments";

describe("ItemComments", () => {
  it("renders a compact thread and comment form", () => {
    const html = renderToStaticMarkup(
      <ItemComments
        itemId="item-1"
        itemName="Dried mango"
        comments={[
          {
            id: "comment-1",
            author: "Dale",
            body: "Could we try the smaller pack?",
            time: "10:24",
          },
        ]}
        onAddComment={() => undefined}
      />,
    );

    expect(html).not.toContain("Local mockup");
    expect(html).toContain("Could we try the smaller pack?");
    expect(html).toContain("Write a comment");
    expect(html).toContain('aria-label="Add emoji"');
    expect(html).toContain("item-comments-emoji__choices");
  });
});
