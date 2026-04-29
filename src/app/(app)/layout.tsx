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
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/trips" className="flex items-center gap-2 font-semibold">
            <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Map className="size-4" />
            </span>
            Tripping
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild size="sm">
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
