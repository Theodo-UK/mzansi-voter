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

  const code = request.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/auth/denied", request.url));
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL("/auth/denied", request.url));
  }

  return NextResponse.redirect(new URL("/", request.url));
}
