export type AvailabilityStatus =
  | "available"
  | "out_of_stock"
  | "unknown";

const statuses = new Set<AvailabilityStatus>([
  "available",
  "out_of_stock",
  "unknown",
]);

export const AVAILABILITY_TTL_MS = 6 * 60 * 60 * 1000;

export function isAvailabilityStale(
  checkedAt: string | undefined,
  now = Date.now(),
) {
  if (!checkedAt) return true;
  const checkedAtMs = Date.parse(checkedAt);
  return (
    !Number.isFinite(checkedAtMs) || now - checkedAtMs >= AVAILABILITY_TTL_MS
  );
}

export function formatAvailabilityAge(
  checkedAt: string | undefined,
  now = Date.now(),
) {
  if (!checkedAt) return undefined;
  const checkedAtMs = Date.parse(checkedAt);
  if (!Number.isFinite(checkedAtMs)) return undefined;

  const hours = Math.max(0, Math.floor((now - checkedAtMs) / 3_600_000));
  if (hours < 1) return "Stock checked less than an hour ago";
  if (hours < 24) return `Stock checked ${hours}h ago`;
  return `Stock checked ${Math.floor(hours / 24)}d ago`;
}

export function parseAvailabilityResponse(
  urls: string[],
  data: unknown,
): Record<string, AvailabilityStatus> {
  const availability = Object.fromEntries(
    urls.map((url) => [url, "unknown"] as const),
  );
  const items =
    data && typeof data === "object"
      ? (data as Record<string, unknown>).items
      : null;
  if (!Array.isArray(items)) return availability;

  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const { url, status } = item as Record<string, unknown>;
    if (
      typeof url === "string" &&
      urls.includes(url) &&
      typeof status === "string" &&
      statuses.has(status as AvailabilityStatus)
    ) {
      availability[url] = status as AvailabilityStatus;
    }
  }
  return availability;
}
