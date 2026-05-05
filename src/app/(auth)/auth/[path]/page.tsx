import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthPanel } from "@/components/auth/auth-panel";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { SectionCardSkeleton } from "@/components/ui/loading-state";

export default function AuthPathPage({
  params,
  searchParams,
}: {
  params: Promise<{ path: string }>;
  searchParams: Promise<{ authFallback?: string }>;
}) {
  return (
    <Suspense fallback={<AuthPathFallback />}>
      <AuthPathContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function AuthPathContent({
  params,
  searchParams,
}: {
  params: Promise<{ path: string }>;
  searchParams: Promise<{ authFallback?: string }>;
}) {
  const { path } = await params;
  const { authFallback } = await searchParams;
  const authTitle = path === "sign-up" ? "Create your account" : path === "email-otp" ? "Check your email" : "Welcome back";
  const authDescription =
    path === "sign-up"
      ? "Set up your workspace to plan routes, stays, activities, and collaborators together."
      : path === "email-otp"
        ? "Use the verification code from your email to continue."
        : "Sign in to continue planning shared trips, routes, and itineraries.";

  return (
    <AuthShell
      title={authTitle}
      description={authDescription}
      notice={
        path === "email-otp" && authFallback === "google" ? (
          <Card>
            <CardContent className="flex flex-col gap-2 pt-5 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Fallback</Badge>
                Continue with email code
              </div>
              <p>Google sign-in did not complete successfully on this device, so we switched you to the email code flow.</p>
            </CardContent>
          </Card>
        ) : null
      }
    >
        <AuthPanel path={path} />
    </AuthShell>
  );
}

function AuthPathFallback() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-6 sm:p-6">
      <div className="w-full max-w-md">
        <SectionCardSkeleton lines={3} />
      </div>
    </main>
  );
}
