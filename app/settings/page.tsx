import { redirect } from "next/navigation";
import { AdminSettingsClient } from "./AdminSettingsClient";
import { AuthScreen } from "../components/AuthScreen";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { loadGroupAdminEmails } from "@/lib/supabase/repository";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { isAllowedOfficeEmail } from "@/lib/voting";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
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

  const [profileResult, membershipResult] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", user.id).single(),
    supabase
      .from("group_members")
      .select("group_id, role")
      .eq("user_id", user.id)
      .single(),
  ]);

  if (profileResult.error || membershipResult.error) {
    return (
      <AuthScreen state="error" message="Settings could not be loaded." />
    );
  }

  const isAdmin = membershipResult.data.role === "admin";
  const groupId = membershipResult.data.group_id as string;
  const groupResult = await supabase
    .from("groups")
    .select("name")
    .eq("id", groupId)
    .single();

  if (groupResult.error) {
    return (
      <AuthScreen state="error" message="Settings could not be loaded." />
    );
  }

  let adminEmails: string[] = [];
  if (isAdmin) {
    try {
      adminEmails = await loadGroupAdminEmails(supabase, groupId);
    } catch {
      return (
        <AuthScreen state="error" message="Settings could not be loaded." />
      );
    }
  }

  return (
    <AdminSettingsClient
      isAdmin={isAdmin}
      groupId={groupId}
      groupName={groupResult.data.name as string}
      displayName={profileResult.data.display_name as string}
      currentEmail={email.trim().toLowerCase()}
      initialAdminEmails={adminEmails}
    />
  );
}
