import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BallotPulse } from "../components/BallotPulse";
import { AuthScreen } from "../components/AuthScreen";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { isAllowedOfficeEmail } from "@/lib/voting";

export const dynamic = "force-dynamic";

export default async function MetricsPage() {
  if (process.env.NEXT_PUBLIC_DEPLOY_ENV !== "development") {
    notFound();
  }

  if (!getSupabaseConfig()) {
    return (
      <AuthScreen
        state="error"
        message="Authentication is not configured for this deployment."
      />
    );
  }

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const email = user.email ?? "";
  if (
    user.app_metadata.provider !== "google" ||
    !isAllowedOfficeEmail(email)
  ) {
    await supabase.auth.signOut();
    redirect("/auth/denied");
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <Link className="brand" href="/" aria-label="Mzansi Voter home">
          <span className="brand-mark" aria-hidden="true" />
          <span>
            <strong>Mzansi Voter</strong>
            <small>The office shop, democratically.</small>
          </span>
        </Link>
        <span className="metrics-preview-badge">Dev preview</span>
      </header>

      <main className="metrics-preview-page">
        <Link className="settings-back" href="/">
          <ArrowLeft aria-hidden="true" size={15} />
          Back to the voting list
        </Link>
        <BallotPulse />
      </main>

      <footer className="site-footer">
        <span>Mzansi Voter · Cape Town</span>
        <span>Office groceries, voted lekker.</span>
      </footer>
    </div>
  );
}
