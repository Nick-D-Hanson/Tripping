import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth/server";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <AuthenticatedAppLayout>{children}</AuthenticatedAppLayout>
    </Suspense>
  );
}

async function AuthenticatedAppLayout({ children }: { children: React.ReactNode }) {
  await requireUser();

  return <AppShell>{children}</AppShell>;
}
