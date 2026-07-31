import { redirect } from "next/navigation";
import { AuthBoundary } from "./AuthBoundary";
import { AuthScreen } from "./components/AuthScreen";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { isAllowedOfficeEmail } from "@/lib/voting";

export const dynamic = "force-dynamic";

export default async function Home() {
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
  const isAllowed =
    user.app_metadata.provider === "google" &&
    isAllowedOfficeEmail(email);

  if (!isAllowed) {
    await supabase.auth.signOut();
    redirect("/auth/denied");
  }

  return <AuthBoundary user={{ id: user.id, email }} />;
}
