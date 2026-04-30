import { AlertCircle, CheckCircle2 } from "lucide-react";
import { AuthDebugClient } from "@/components/auth/auth-debug-client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getOptionalUser } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function AuthDebugPage() {
  const user = await getOptionalUser();

  return (
    <main className="mx-auto grid min-h-screen w-full max-w-3xl gap-6 px-4 py-8 sm:px-6">
      <Card>
        <CardHeader>
          <CardTitle>Auth debug</CardTitle>
          <CardDescription>Temporary mobile Safari diagnostic screen after sign-in.</CardDescription>
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
