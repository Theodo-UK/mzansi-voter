import { AuthScreen } from "@/app/components/AuthScreen";

type AccessDeniedPageProps = {
  searchParams: Promise<{ reason?: string }>;
};

const failureMessages: Record<string, string> = {
  provider_error:
    "Google did not complete sign-in. Try again or choose a different office account.",
  missing_code:
    "Your Google sign-in did not finish. Start a fresh sign-in and try again.",
  expired:
    "Your sign-in expired before it could finish. Start a fresh sign-in in this browser.",
  exchange_failed:
    "We could not finish your Google sign-in. Start a fresh sign-in and try again.",
};

export default async function AccessDeniedPage({
  searchParams,
}: AccessDeniedPageProps) {
  const { reason } = await searchParams;
  const failureMessage = reason ? failureMessages[reason] : undefined;

  return (
    <AuthScreen
      state={failureMessage ? "error" : "denied"}
      message={
        failureMessage ??
        "Use a verified @theodo.com or @aleios.com Google account to enter Mzansi Voter."
      }
      action={{ href: "/auth/login", label: "Try Google sign-in again" }}
    />
  );
}
