import { AuthScreen } from "@/app/components/AuthScreen";

export default function AccessDeniedPage() {
  return (
    <AuthScreen
      state="denied"
      message="Use a verified @theodo.com or @aleios.com Google account to enter Mzansi Voter."
    />
  );
}
