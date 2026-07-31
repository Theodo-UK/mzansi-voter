import {
  isAuthenticatedOfficeUser,
  json,
  responseHeaders,
} from "../_shared/edge-function.ts";
import {
  isProductAUoM,
  readProductAvailability,
  type ProductAvailability,
} from "../_shared/product-availability.ts";
import {
  getCheckersProductCode,
  parseCheckersProductUrl,
} from "../_shared/product-metadata.ts";

const CHECKERS_ORIGIN = "https://www.checkers.co.za";
const MAX_PRODUCTS = 20;
const OFFICE_ADDRESS = {
  fullAddress:
    "10 Prestwich St, Cape Town City Centre, Cape Town, 8000, South Africa",
  streetNumber: "10",
  street: "Prestwich St",
  suburb: "Cape Town City Centre",
  city: "Cape Town",
  postalCode: "8000",
  coordinates: {
    longitude: 18.421328374381,
    latitude: -33.917524085342,
  },
  id: "",
  type: "",
  name: "",
};
const upstreamHeaders = {
  Accept: "application/json",
  "Content-Type": "application/json",
  Origin: CHECKERS_ORIGIN,
  Referer: `${CHECKERS_ORIGIN}/`,
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/138.0.0.0 Safari/537.36",
};

type StoreContext = Record<string, unknown> & { storeId: string };

function isStoreContext(value: unknown): value is StoreContext {
  return (
    !!value &&
    typeof value === "object" &&
    typeof (value as Record<string, unknown>).storeId === "string" &&
    /^[a-f0-9]{24}$/.test(
      (value as Record<string, unknown>).storeId as string,
    )
  );
}

async function fetchStoreContexts() {
  const response = await fetch(
    `${CHECKERS_ORIGIN}/api/store/fetch-store-contexts?update=false`,
    {
      method: "POST",
      headers: upstreamHeaders,
      body: JSON.stringify({ address: OFFICE_ADDRESS }),
    },
  );
  if (!response.ok) {
    throw new Error(`Store context returned ${response.status}.`);
  }

  const payload = (await response.json()) as { storeContexts?: unknown };
  const storeContexts = Array.isArray(payload.storeContexts)
    ? payload.storeContexts.filter(isStoreContext)
    : [];
  if (!storeContexts.length) throw new Error("No office store was found.");
  return storeContexts;
}

function storeCookie(storeContexts: StoreContext[]) {
  const storeIds = storeContexts.map(({ storeId }) => storeId).join("-");
  return [
    `storeContexts=${encodeURIComponent(JSON.stringify(storeContexts))}`,
    `storeids=${storeIds}`,
    `istio-storeIds=${storeIds}`,
  ].join("; ");
}

async function fetchAvailability(
  url: string,
  storeContexts: StoreContext[],
  cookie: string,
): Promise<ProductAvailability> {
  const productUrl = parseCheckersProductUrl(url);
  const productCode = productUrl
    ? getCheckersProductCode(productUrl)
    : null;
  if (!productCode || !isProductAUoM(productCode)) return "unknown";

  const response = await fetch(
    `${CHECKERS_ORIGIN}/api/catalogue/get-products-filter`,
    {
      method: "POST",
      headers: { ...upstreamHeaders, Cookie: cookie },
      body: JSON.stringify({
        storeContexts,
        filterData: {
          filter: {
            productListSource: { productAUoM: productCode },
          },
        },
        forYouBonusBuyIds: [],
        url: "",
        isCarousel: false,
      }),
    },
  );
  if (!response.ok) {
    throw new Error(`Product availability returned ${response.status}.`);
  }

  const payload = (await response.json()) as { products?: unknown };
  const product = Array.isArray(payload.products)
    ? payload.products[0]
    : null;
  return readProductAvailability(product);
}

function unknownItems(urls: string[]) {
  return urls.map((url) => ({ url, status: "unknown" as const }));
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: responseHeaders });
  }

  if (request.method !== "POST") {
    return json({ error: "Use POST." }, 405);
  }

  try {
    if (!(await isAuthenticatedOfficeUser(request))) {
      return json({ error: "Use a verified Theodo or Aleios account." }, 403);
    }
  } catch {
    return json({ error: "Authentication is unavailable." }, 503);
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "Request body must be JSON." }, 400);
  }

  const requestedUrls = (payload as Record<string, unknown> | null)?.urls;
  if (
    !Array.isArray(requestedUrls) ||
    requestedUrls.some((url) => typeof url !== "string") ||
    requestedUrls.length > MAX_PRODUCTS
  ) {
    return json({ error: `Provide up to ${MAX_PRODUCTS} product URLs.` }, 400);
  }
  const urls = [...new Set(requestedUrls as string[])];
  if (!urls.length) return json({ items: [] });

  let storeContexts: StoreContext[];
  try {
    storeContexts = await fetchStoreContexts();
  } catch (error) {
    console.error(
      "Office store lookup failed:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return json({ items: unknownItems(urls) });
  }

  const cookie = storeCookie(storeContexts);
  const items = await Promise.all(
    urls.map(async (url) => {
      try {
        return {
          url,
          status: await fetchAvailability(url, storeContexts, cookie),
        };
      } catch (error) {
        console.error(
          "Product availability lookup failed:",
          error instanceof Error ? error.message : "Unknown error",
        );
        return { url, status: "unknown" as const };
      }
    }),
  );

  return json({ items });
});
