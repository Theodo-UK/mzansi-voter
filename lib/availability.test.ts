import { describe, expect, it } from "vitest";
import { parseAvailabilityResponse } from "./availability";
import {
  isProductAUoM,
  readProductAvailability,
} from "../supabase/functions/_shared/product-availability";

describe("Checkers product availability", () => {
  it("reads available, out-of-stock, and ambiguous responses", () => {
    expect(
      readProductAvailability({
        isStockAvailable: true,
        outOfStock: false,
      }),
    ).toBe("available");
    expect(
      readProductAvailability({
        isStockAvailable: false,
        outOfStock: true,
      }),
    ).toBe("out_of_stock");
    expect(readProductAvailability({ isStockAvailable: true })).toBe(
      "unknown",
    );
  });

  it("accepts article and unit codes but not internal catalogue IDs", () => {
    expect(isProductAUoM("10203715EA")).toBe(true);
    expect(isProductAUoM("10500055PK1")).toBe(true);
    expect(isProductAUoM("602B939453C6141847410C27")).toBe(false);
  });
});

describe("availability response validation", () => {
  it("defaults missing and invalid results to unknown", () => {
    const availableUrl = "https://www.checkers.co.za/product/available";
    const missingUrl = "https://www.checkers.co.za/product/missing";

    expect(
      parseAvailabilityResponse([availableUrl, missingUrl], {
        items: [
          { url: availableUrl, status: "out_of_stock" },
          { url: missingUrl, status: "definitely_available" },
        ],
      }),
    ).toEqual({
      [availableUrl]: "out_of_stock",
      [missingUrl]: "unknown",
    });
  });
});
