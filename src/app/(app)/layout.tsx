import { UserButton } from "@neondatabase/auth-ui";
import { Map, Plus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireUser();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex min-h-14 max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:flex-nowrap sm:px-6">
          <Link href="/trips" className="flex min-w-0 items-center gap-2 font-semibold">
            <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Map className="size-4" />
            </span>
            <span className="truncate">Tripping</span>
          </Link>
          <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
            <Button asChild size="sm" className="flex-1 sm:flex-none">
              <Link href="/trips/new">
                <Plus className="size-4" />
                Trip
              </Link>
            </Button>
            <UserButton size="icon" />
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
