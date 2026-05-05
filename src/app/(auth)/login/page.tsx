import { AuthShell } from "@/components/auth/auth-shell";
import { AuthPanel } from "@/components/auth/auth-panel";

export default function LoginPage() {
  return (
    <AuthShell title="Welcome back" description="Sign in to continue planning shared trips, routes, and itineraries.">
      <AuthPanel path="sign-in" />
    </AuthShell>
  );
}
