import { AuthPanel } from "@/components/auth/auth-panel";

export default function SignupPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md">
        <AuthPanel path="sign-up" />
      </div>
    </main>
  );
}
