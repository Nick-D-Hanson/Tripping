import { Suspense } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { notFound } from "next/navigation";
import { AuthDebugClient } from "@/components/auth/auth-debug-client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SectionCardSkeleton } from "@/components/ui/loading-state";
import { SectionHeader } from "@/components/ui/section-header";
import { getOptionalUser } from "@/lib/data";

export default function AuthDebugPage() {
  return (
    <Suspense fallback={<AuthDebugFallback />}>
      <AuthDebugContent />
    </Suspense>
  );
}

async function AuthDebugContent() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  const user = await getOptionalUser();

  return (
    <main className="mx-auto grid min-h-screen w-full max-w-3xl gap-6 px-4 py-8 sm:px-6">
      <Card>
        <CardHeader>
          <SectionHeader
            title={<CardTitle>Auth debug</CardTitle>}
            description={<CardDescription>Temporary mobile Safari diagnostic screen after sign-in.</CardDescription>}
            className="gap-2"
            descriptionClassName="mt-0"
          />
        </CardHeader>
        <CardContent className="grid gap-4 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            {user ? (
              <>
                <CheckCircle2 className="size-4 text-emerald-400" />
                <span>Server session detected</span>
                <Badge variant="secondary">{user.email ?? user.id}</Badge>
              </>
            ) : (
              <>
                <AlertCircle className="size-4 text-amber-400" />
                <span>No server session detected</span>
              </>
            )}
          </div>
          <pre className="overflow-x-auto rounded-md border bg-muted p-3 text-xs">
            {JSON.stringify(
              {
                serverUser: user
                  ? {
                      id: user.id,
                      email: user.email ?? null,
                      name: user.name ?? null,
                    }
                  : null,
              },
              null,
              2,
            )}
          </pre>
        </CardContent>
      </Card>

      <AuthDebugClient />
    </main>
  );
}

function AuthDebugFallback() {
  return (
    <main className="mx-auto grid min-h-screen w-full max-w-3xl gap-6 px-4 py-8 sm:px-6">
      <SectionCardSkeleton lines={3} />
    </main>
  );
}
