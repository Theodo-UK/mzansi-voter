import { describe, expect, it, vi } from "vitest";
import {
  createGiphyComment,
  getGiphyMediaUrl,
  readGiphyComment,
  searchGiphy,
} from "./giphy";

describe("Giphy comments", () => {
  it("round-trips a selected GIF through the existing comment body", () => {
    const body = createGiphyComment("8VrtCswiLDNnO", "Nailed it");

    expect(readGiphyComment(body)).toEqual({
      id: "8VrtCswiLDNnO",
      caption: "Nailed it",
    });
    expect(getGiphyMediaUrl("8VrtCswiLDNnO")).toBe(
      "https://media.giphy.com/media/8VrtCswiLDNnO/giphy.gif",
    );
    expect(readGiphyComment("ordinary comment")).toBeUndefined();
    expect(readGiphyComment("https://giphy.com/gifs/8VrtCswiLDNnO")).toEqual({
      id: "8VrtCswiLDNnO",
      caption: "",
    });
  });

  it("returns compact search results", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        meta: { status: 200 },
        data: [
          {
            id: "gif-1",
            title: "Nailed it",
            username: "office",
            images: { fixed_width: { webp: "https://media.giphy.com/1.webp" } },
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(searchGiphy("nailed it", "test-key")).resolves.toEqual([
      {
        id: "gif-1",
        title: "Nailed it",
        username: "office",
        previewUrl: "https://media.giphy.com/1.webp",
      },
    ]);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("q=nailed+it"),
      { signal: undefined },
    );
    vi.unstubAllGlobals();
  });
});
