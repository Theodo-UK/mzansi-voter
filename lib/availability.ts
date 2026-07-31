export type AvailabilityStatus =
  | "available"
  | "out_of_stock"
  | "unknown";

const statuses = new Set<AvailabilityStatus>([
  "available",
  "out_of_stock",
  "unknown",
]);

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
