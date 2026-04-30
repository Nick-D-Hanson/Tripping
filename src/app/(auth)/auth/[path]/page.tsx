import { AuthPanel } from "@/components/auth/auth-panel";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export default async function AuthPathPage({
  params,
  searchParams,
}: {
  params: Promise<{ path: string }>;
  searchParams: Promise<{ authFallback?: string }>;
}) {
  const { path } = await params;
  const { authFallback } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-6 sm:p-6">
      <div className="grid w-full max-w-md gap-4">
        {path === "email-otp" && authFallback === "google" ? (
          <Card>
            <CardContent className="flex flex-col gap-2 pt-5 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Fallback</Badge>
                Continue with email code
              </div>
              <p>Google sign-in did not complete successfully on this device, so we switched you to the email code flow.</p>
            </CardContent>
          </Card>
        ) : null}
        <AuthPanel path={path} />
      </div>
    </main>
  );
}
