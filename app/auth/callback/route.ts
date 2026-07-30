import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function accessDeniedUrl(
  requestUrl: string,
  reason: "provider_error" | "missing_code" | "expired" | "exchange_failed",
) {
  const url = new URL("/auth/denied", requestUrl);
  url.searchParams.set("reason", reason);
  return url;
}

export async function GET(request: NextRequest) {
  if (!getSupabaseConfig()) {
    return NextResponse.json(
      { error: "Authentication is not configured." },
      { status: 503 },
    );
  }

  const callbackUrl = new URL(request.url);
  const code = callbackUrl.searchParams.get("code");

  if (!code) {
    const reason = callbackUrl.searchParams.has("error")
      ? "provider_error"
      : "missing_code";
    console.error("[auth/callback] OAuth callback did not include a code.", {
      reason,
    });
    return NextResponse.redirect(accessDeniedUrl(request.url, reason));
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const isExpiredFlow =
      error.code === "pkce_code_verifier_not_found" ||
      error.code?.startsWith("flow_state");
    const reason = isExpiredFlow ? "expired" : "exchange_failed";
    console.error("[auth/callback] OAuth code exchange failed.", {
      code: error.code ?? "unknown",
    });
    return NextResponse.redirect(accessDeniedUrl(request.url, reason));
  }

  return NextResponse.redirect(new URL("/", request.url));
}
