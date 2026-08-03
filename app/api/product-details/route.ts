import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { isAllowedOfficeEmail } from "@/lib/voting";
import {
  extractProductDetails,
  parseCheckersProductUrl,
} from "@/supabase/functions/_shared/product-metadata";

export async function POST(request: NextRequest) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAllowedOfficeEmail(user.email ?? "")) {
    return NextResponse.json({ error: "Not authorised." }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as {
    url?: unknown;
  } | null;
  const productUrl = parseCheckersProductUrl(payload?.url);

  if (!productUrl) {
    return NextResponse.json(
      { error: "Use a Checkers product link." },
      { status: 400 },
    );
  }

  const response = await fetch(productUrl, {
    headers: {
      Accept: "text/html",
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/138.0.0.0 Safari/537.36",
    },
    redirect: "manual",
    signal: AbortSignal.timeout(8_000),
  }).catch(() => null);
  const details = response?.ok
    ? extractProductDetails(await response.text())
    : null;

  if (!details) {
    return NextResponse.json(
      { error: "Product details could not be read." },
      { status: 502 },
    );
  }

  return NextResponse.json(details);
}
