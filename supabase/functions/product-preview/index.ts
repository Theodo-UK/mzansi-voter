import {
  extractPreviewImage,
  getCheckersProductCode,
  parseCheckersImageUrl,
  parseCheckersProductUrl,
} from "../_shared/product-metadata.ts";

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const IMAGE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const responseHeaders = {
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: responseHeaders,
  });
}

function requiredEnvironment(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing ${name}.`);
  return value;
}

async function getAuthenticatedTheodoUser(request: Request) {
  const authorization = request.headers.get("Authorization");
  if (!authorization) return null;

  const supabaseUrl = requiredEnvironment("SUPABASE_URL");
  const publishableKey = requiredEnvironment("SUPABASE_ANON_KEY");
  const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: publishableKey,
      Authorization: authorization,
    },
  });
  if (!userResponse.ok) return null;

  const user = (await userResponse.json()) as { email?: string };
  const email = user.email?.trim().toLowerCase() ?? "";
  return /^[^@\s]+@theodo[.]com$/.test(email) ? user : null;
}

async function fetchCheckersProduct(initialUrl: URL) {
  let productUrl = initialUrl;

  for (let redirectCount = 0; redirectCount <= 3; redirectCount += 1) {
    const response = await fetch(productUrl, {
      redirect: "manual",
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-ZA,en;q=0.9",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/138.0.0.0 Safari/537.36",
      },
    });

    if (response.status < 300 || response.status >= 400) {
      return { productUrl, response };
    }

    const location = response.headers.get("location");
    const redirectedUrl = location
      ? parseCheckersProductUrl(new URL(location, productUrl).href)
      : null;
    if (!redirectedUrl) {
      throw new Error("Checkers returned an unsafe redirect.");
    }

    productUrl = redirectedUrl;
  }

  throw new Error("Checkers returned too many redirects.");
}

async function cachePreviewImage(productUrl: URL, imageUrl: URL) {
  const productCode = getCheckersProductCode(productUrl);
  if (!productCode) throw new Error("Checkers product code is missing.");

  const imageResponse = await fetch(imageUrl, {
    redirect: "error",
    headers: { Accept: "image/avif,image/webp,image/png,image/jpeg" },
  });
  if (!imageResponse.ok) {
    throw new Error(`Product image returned ${imageResponse.status}.`);
  }

  const contentType =
    imageResponse.headers.get("content-type")?.split(";")[0]?.trim() ?? "";
  const extension = IMAGE_EXTENSIONS[contentType];
  if (!extension) throw new Error("Product image type is not supported.");

  const declaredSize = Number(imageResponse.headers.get("content-length"));
  if (declaredSize > MAX_IMAGE_BYTES) {
    throw new Error("Product image is too large.");
  }

  const image = await imageResponse.arrayBuffer();
  if (image.byteLength > MAX_IMAGE_BYTES) {
    throw new Error("Product image is too large.");
  }

  const previewImagePath = `${productCode}.${extension}`;
  const supabaseUrl = requiredEnvironment("SUPABASE_URL");
  const serviceRoleKey = requiredEnvironment("SUPABASE_SERVICE_ROLE_KEY");
  const uploadResponse = await fetch(
    `${supabaseUrl}/storage/v1/object/product-previews/${previewImagePath}`,
    {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": contentType,
        "x-upsert": "true",
      },
      body: image,
    },
  );

  if (!uploadResponse.ok) {
    throw new Error(`Preview upload returned ${uploadResponse.status}.`);
  }

  return previewImagePath;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: responseHeaders });
  }

  if (request.method !== "POST") {
    return json({ error: "Use POST." }, 405);
  }

  try {
    if (!(await getAuthenticatedTheodoUser(request))) {
      return json({ error: "Use a verified Theodo account." }, 403);
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

  const productUrl = parseCheckersProductUrl(
    (payload as Record<string, unknown> | null)?.url,
  );
  if (!productUrl) {
    return json({ error: "Use a Checkers product URL." }, 400);
  }

  try {
    const upstream = await fetchCheckersProduct(productUrl);
    const html = await upstream.response.text();
    const extractedImageUrl = upstream.response.ok
      ? extractPreviewImage(html, upstream.productUrl)
      : null;
    const imageUrl = parseCheckersImageUrl(extractedImageUrl);

    if (!imageUrl) {
      return json({
        previewImagePath: null,
        upstreamStatus: upstream.response.status,
      });
    }

    const previewImagePath = await cachePreviewImage(
      upstream.productUrl,
      imageUrl,
    );

    return json({
      previewImagePath,
      upstreamStatus: upstream.response.status,
    });
  } catch (error) {
    console.error(
      "Product preview cache failed:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return json({ previewImagePath: null, upstreamStatus: null });
  }
});
