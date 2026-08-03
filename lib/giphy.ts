export type GiphyResult = {
  id: string;
  title: string;
  username: string;
  previewUrl: string;
};

const GIPHY_COMMENT_PATTERN = /^https:\/\/giphy[.]com\/gifs\/([A-Za-z0-9]+)$/;
const GIPHY_COMMENT_PREFIX = "giphy:";

export function createGiphyComment(id: string, caption = "") {
  const prefix = `${GIPHY_COMMENT_PREFIX}${id}`;
  return caption.trim() ? `${prefix}\n${caption.trim()}` : prefix;
}

export function readGiphyComment(body: string) {
  const trimmed = body.trim();
  const legacyId = GIPHY_COMMENT_PATTERN.exec(trimmed)?.[1];
  if (legacyId) return { id: legacyId, caption: "" };
  if (!trimmed.startsWith(GIPHY_COMMENT_PREFIX)) return;

  const [id, ...caption] = trimmed.slice(GIPHY_COMMENT_PREFIX.length).split("\n");
  if (!id || !/^[A-Za-z0-9]+$/.test(id)) return;
  return { id, caption: caption.join("\n").trim() };
}

export function getGiphyMediaUrl(id: string) {
  return `https://media.giphy.com/media/${id}/giphy.gif`;
}

export async function searchGiphy(
  query: string,
  apiKey: string,
  signal?: AbortSignal,
) {
  const parameters = new URLSearchParams({
    api_key: apiKey,
    q: query.slice(0, 50),
    limit: "12",
    rating: "g",
    lang: "en",
    bundle: "messaging_non_clips",
    country_code: "ZA",
  });
  const response = await fetch(
    `https://api.giphy.com/v1/gifs/search?${parameters}`,
    { signal },
  );
  const payload = await response.json();

  if (!response.ok || payload?.meta?.status !== 200) {
    throw new Error(payload?.meta?.msg || "Giphy search failed");
  }

  return (Array.isArray(payload.data) ? payload.data : []).flatMap(
    (item: unknown): GiphyResult[] => {
      if (!item || typeof item !== "object") return [];
      const gif = item as Record<string, unknown>;
      const images = gif.images as Record<string, unknown> | undefined;
      const fixedWidth = images?.fixed_width as
        | Record<string, unknown>
        | undefined;
      const id = typeof gif.id === "string" ? gif.id : "";
      const previewUrl =
        typeof fixedWidth?.webp === "string" ? fixedWidth.webp : "";

      if (!id || !previewUrl) return [];

      return [
        {
          id,
          previewUrl,
          title: typeof gif.title === "string" ? gif.title : "GIF",
          username: typeof gif.username === "string" ? gif.username : "",
        },
      ];
    },
  );
}
