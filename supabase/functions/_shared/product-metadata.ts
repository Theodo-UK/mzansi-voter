const CHECKERS_HOSTS = new Set(["checkers.co.za", "www.checkers.co.za"]);
const CHECKERS_IMAGE_HOSTS = new Set(["catalog.sixty60.co.za"]);

export function parseCheckersProductUrl(value: unknown) {
  if (typeof value !== "string") return null;

  try {
    const url = new URL(value);
    const isCheckersProduct =
      url.protocol === "https:" &&
      CHECKERS_HOSTS.has(url.hostname.toLowerCase()) &&
      url.pathname.startsWith("/product/");

    return isCheckersProduct ? url : null;
  } catch {
    return null;
  }
}

export function parseCheckersImageUrl(value: unknown) {
  if (typeof value !== "string") return null;

  try {
    const url = new URL(value);
    const isCheckersImage =
      url.protocol === "https:" &&
      CHECKERS_IMAGE_HOSTS.has(url.hostname.toLowerCase());

    return isCheckersImage ? url : null;
  } catch {
    return null;
  }
}

export function getCheckersProductCode(productUrl: URL) {
  return (
    productUrl.pathname.match(/-([A-Z0-9]{10,64})$/i)?.[1]?.toUpperCase() ??
    null
  );
}

function readAttribute(tag: string, name: string) {
  const attributes = tag.matchAll(
    /([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g,
  );

  for (const match of attributes) {
    if (match[1]?.toLowerCase() === name) {
      return match[2] ?? match[3] ?? "";
    }
  }

  return null;
}

function findOpenGraphImage(html: string) {
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const tag = match[0];
    const property =
      readAttribute(tag, "property") ?? readAttribute(tag, "name");

    if (
      property?.toLowerCase() === "og:image" ||
      property?.toLowerCase() === "twitter:image"
    ) {
      return readAttribute(tag, "content");
    }
  }

  return null;
}

function findImageInStructuredData(value: unknown): string | null {
  if (Array.isArray(value)) {
    for (const entry of value) {
      const image = findImageInStructuredData(entry);
      if (image) return image;
    }
    return null;
  }

  if (!value || typeof value !== "object") return null;

  const record = value as Record<string, unknown>;
  const image = record.image;
  if (typeof image === "string") return image;
  if (Array.isArray(image)) {
    const firstImage = image.find((entry) => typeof entry === "string");
    if (typeof firstImage === "string") return firstImage;
  }
  if (image && typeof image === "object") {
    const imageUrl = (image as Record<string, unknown>).url;
    if (typeof imageUrl === "string") return imageUrl;
  }

  for (const key of ["@graph", "mainEntity", "itemListElement"]) {
    const nestedImage = findImageInStructuredData(record[key]);
    if (nestedImage) return nestedImage;
  }

  return null;
}

function findStructuredDataImage(html: string) {
  const scripts = html.matchAll(
    /<script\b[^>]*type=(?:"application\/ld\+json"|'application\/ld\+json')[^>]*>([\s\S]*?)<\/script>/gi,
  );

  for (const match of scripts) {
    try {
      const image = findImageInStructuredData(JSON.parse(match[1] ?? ""));
      if (image) return image;
    } catch {
      continue;
    }
  }

  return null;
}

function decodeHtmlEntities(value: string) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&apos;", "'");
}

export function extractPreviewImage(html: string, pageUrl: URL) {
  const candidate = findOpenGraphImage(html) ?? findStructuredDataImage(html);
  if (!candidate) return null;

  try {
    const imageUrl = new URL(decodeHtmlEntities(candidate), pageUrl);
    return parseCheckersImageUrl(imageUrl.href)?.href ?? null;
  } catch {
    return null;
  }
}
