import { UserButton } from "@neondatabase/auth-ui";
import { Map } from "lucide-react";
import Link from "next/link";
import { requireUser } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireUser();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex min-w-0 items-center gap-2.5 font-semibold">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Map className="size-4" />
            </span>
            <span className="truncate text-sm sm:text-base">Tripping</span>
          </Link>
          <div className="flex items-center">
            <UserButton size="icon" disableDefaultLinks />
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
