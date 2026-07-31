export type ProductAvailability =
  | "available"
  | "out_of_stock"
  | "unknown";

export function isProductAUoM(value: string) {
  return /^[0-9]{8}[A-Z][A-Z0-9]{1,5}$/.test(value);
}

export function readProductAvailability(value: unknown): ProductAvailability {
  if (!value || typeof value !== "object") return "unknown";

  const product = value as Record<string, unknown>;
  if (product.outOfStock === true || product.isStockAvailable === false) {
    return "out_of_stock";
  }
  if (
    product.outOfStock === false &&
    product.isStockAvailable === true
  ) {
    return "available";
  }
  return "unknown";
}
