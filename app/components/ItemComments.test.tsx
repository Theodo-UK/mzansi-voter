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
            authorId: "user-1",
            author: "Dale",
            body: "Could we try the smaller pack?",
            time: "10:24",
          },
        ]}
        currentUserId="user-1"
        onAddComment={() => undefined}
        onUpdateComment={() => undefined}
        onDeleteComment={() => undefined}
      />,
    );

    expect(html).not.toContain("Local mockup");
    expect(html).toContain("Could we try the smaller pack?");
    expect(html).toContain("Comment…");
    expect(html).toContain('aria-label="Add emoji"');
    expect(html).toContain('aria-label="Add GIF"');
    expect(html).not.toContain('aria-label="Resize comments panel"');
    expect(html).not.toContain('aria-label="Resize comments panel height"');
    expect(html).toContain(
      'aria-label="Resize comments panel in both directions"',
    );
    expect(html).toContain('aria-label="Edit comment"');
    expect(html).toContain('aria-label="Delete comment"');
    expect(html).toContain("item-comments-emoji__choices");
    expect(html).toContain('aria-label="About comment retention"');
    expect(html).not.toContain("item-comments-giphy__thread-credit");
    expect(html).toContain(
      "Comments are retained across weeks and are only removed when the item is removed.",
    );
  });

  it("renders a stored Giphy link as a GIF", () => {
    const html = renderToStaticMarkup(
      <ItemComments
        itemId="item-1"
        itemName="Dried mango"
        comments={[
          {
            id: "comment-1",
            authorId: "user-1",
            author: "Dale",
            body: "https://giphy.com/gifs/8VrtCswiLDNnO",
            time: "10:24",
          },
        ]}
        currentUserId="user-1"
        onAddComment={() => undefined}
        onUpdateComment={() => undefined}
        onDeleteComment={() => undefined}
      />,
    );

    expect(html).toContain("Powered by GIPHY");
    expect(html).toContain("item-comments-giphy__thread-credit");
    expect(html).toContain(
      "https://media.giphy.com/media/8VrtCswiLDNnO/giphy.gif",
    );
    expect(html).not.toContain('aria-label="View GIF on Giphy"');
    const gifMarkup = html.match(
      /<div class="item-comment-gif">([\s\S]*?)<\/div>/,
    )?.[1];
    expect(gifMarkup).not.toContain("Powered by GIPHY");
    expect(html).toContain('aria-label="Edit comment"');
    expect(html).toContain('aria-label="Delete comment"');
  });
});
