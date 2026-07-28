import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  if (!getSupabaseConfig()) {
    return NextResponse.json(
      { error: "Authentication is not configured." },
      { status: 503 },
    );
  }

  const supabase = await getSupabaseServerClient();
  const callbackUrl = new URL("/auth/callback", request.url);
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: callbackUrl.toString(),
      queryParams: {
        hd: "theodo.com",
        prompt: "select_account",
      },
    },
  });

  if (error || !data.url) {
    return NextResponse.redirect(new URL("/auth/denied", request.url));
  }

  return NextResponse.redirect(data.url);
}
