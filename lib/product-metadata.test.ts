import { describe, expect, it } from "vitest";
import {
  extractProductDetails,
  extractPreviewImage,
  getCheckersProductCode,
  parseCheckersImageUrl,
  parseCheckersProductUrl,
} from "../supabase/functions/_shared/product-metadata";

describe("Checkers product URL validation", () => {
  it("accepts a Checkers product page", () => {
    expect(
      parseCheckersProductUrl(
        "https://www.checkers.co.za/product/padkos-mango-slices-550g-10819910EA",
      )?.hostname,
    ).toBe("www.checkers.co.za");
  });

  it("rejects non-product and lookalike hosts", () => {
    expect(parseCheckersProductUrl("https://www.checkers.co.za/help")).toBeNull();
    expect(
      parseCheckersProductUrl(
        "https://www.checkers.co.za.evil.example/product/mango",
      ),
    ).toBeNull();
  });

  it("extracts the stable product code used for cached filenames", () => {
    const url = parseCheckersProductUrl(
      "https://www.checkers.co.za/product/padkos-mango-slices-550g-10819910EA",
    );

    expect(getCheckersProductCode(url!)).toBe("10819910EA");
  });

  it("supports Checkers catalogue IDs as cached filenames", () => {
    const url = parseCheckersProductUrl(
      "https://www.checkers.co.za/product/padkos-mango-slices-550g-63f5e22120877749070ca371",
    );

    expect(getCheckersProductCode(url!)).toBe(
      "63F5E22120877749070CA371",
    );
  });
});

describe("Checkers image URL validation", () => {
  it("accepts the Sixty60 catalogue host", () => {
    expect(
      parseCheckersImageUrl(
        "https://catalog.sixty60.co.za/v2/files/image?width=1200",
      )?.hostname,
    ).toBe("catalog.sixty60.co.za");
  });

  it("rejects lookalike and insecure image hosts", () => {
    expect(
      parseCheckersImageUrl(
        "https://catalog.sixty60.co.za.evil.example/image.webp",
      ),
    ).toBeNull();
    expect(
      parseCheckersImageUrl("http://catalog.sixty60.co.za/image.webp"),
    ).toBeNull();
  });
});

describe("product image metadata", () => {
  const pageUrl = new URL(
    "https://www.checkers.co.za/product/padkos-mango-slices-550g-10819910EA",
  );

  it("reads an Open Graph image regardless of attribute order", () => {
    expect(
      extractPreviewImage(
        '<meta content="https://catalog.sixty60.co.za/images/mango.webp" property="og:image">',
        pageUrl,
      ),
    ).toBe("https://catalog.sixty60.co.za/images/mango.webp");
  });

  it("decodes HTML entities in metadata URLs", () => {
    expect(
      extractPreviewImage(
        '<meta property="og:image" content="https://catalog.sixty60.co.za/mango.webp?width=1200&amp;height=1200">',
        pageUrl,
      ),
    ).toBe(
      "https://catalog.sixty60.co.za/mango.webp?width=1200&height=1200",
    );
  });

  it("falls back to JSON-LD product images", () => {
    expect(
      extractPreviewImage(
        `<script type="application/ld+json">
          {"@type":"Product","image":["https://catalog.sixty60.co.za/mango.webp"]}
        </script>`,
        pageUrl,
      ),
    ).toBe("https://catalog.sixty60.co.za/mango.webp");
  });

  it("rejects insecure image URLs", () => {
    expect(
      extractPreviewImage(
        '<meta property="og:image" content="http://cdn.example/mango.webp">',
        pageUrl,
      ),
    ).toBeNull();
  });
});

describe("product details metadata", () => {
  it("reads the product name and rand price from JSON-LD", () => {
    expect(
      extractProductDetails(`<script type="application/ld+json">
        {
          "@context": "https://schema.org/",
          "@type": "Product",
          "name": "Darling Fresh Full Cream Milk Bottle 2L",
          "offers": { "@type": "Offer", "priceCurrency": "ZAR", "price": 37.99 }
        }
      </script>`),
    ).toEqual({
      name: "Darling Fresh Full Cream Milk Bottle 2L",
      price: 37.99,
    });
  });

  it("ignores incomplete product metadata", () => {
    expect(
      extractProductDetails(
        '<script type="application/ld+json">{"@type":"Product","name":"Milk"}</script>',
      ),
    ).toBeNull();
  });
});
