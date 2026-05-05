import { AuthShell } from "@/components/auth/auth-shell";
import { AuthPanel } from "@/components/auth/auth-panel";

export default function SignupPage() {
  return (
    <AuthShell title="Create your account" description="Set up your workspace to plan routes, stays, activities, and collaborators together.">
      <AuthPanel path="sign-up" />
    </AuthShell>
  );
}
