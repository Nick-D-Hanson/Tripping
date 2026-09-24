"use client";

import { UserButton } from "@neondatabase/auth-ui";
import { CircleHelp, Compass, LayoutGrid, Map } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

function pageLabel(pathname: string) {
  if (pathname === "/trips") return "Your trips";
  if (pathname === "/trips/new") return "Plan a trip";
  if (pathname.endsWith("/members")) return "People & access";
  if (pathname.endsWith("/edit")) return "Trip settings";
  if (pathname.startsWith("/trips/")) return "Trip planner";
  return "Workspace";
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const plannerActive = pathname.startsWith("/trips/") && pathname !== "/trips/new";

  return (
    <div className="flex min-h-dvh bg-background">
      <aside className="sticky top-0 z-50 hidden h-dvh w-[76px] shrink-0 flex-col items-center border-r bg-card px-3 py-6 sm:flex">
        <Link
          href="/trips"
          className="mb-5 flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm sm:mb-7 sm:size-11 sm:rounded-2xl"
          aria-label="Tripping home"
        >
          <Map className="size-4 sm:size-5" />
        </Link>

        <nav className="grid gap-2" aria-label="Main navigation">
          <RailLink href="/trips" label="All trips" active={pathname === "/trips" || pathname === "/trips/new"}>
            <LayoutGrid />
          </RailLink>
          <RailLink href={plannerActive ? pathname.split("/").slice(0, 3).join("/") : "/trips"} label="Trip planner" active={plannerActive}>
            <Compass />
          </RailLink>
        </nav>

        <div className="mt-auto grid justify-items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-xl text-muted-foreground" title="Planning help">
            <CircleHelp className="size-5" aria-hidden="true" />
          </span>
          <UserButton size="icon" disableDefaultLinks />
        </div>
      </aside>

      <div className="min-w-0 flex-1 pb-[calc(4rem+env(safe-area-inset-bottom))] sm:pb-0">
        <header className="sticky top-0 z-40 flex h-15 items-center justify-between gap-4 border-b bg-card/95 px-4 backdrop-blur sm:h-[76px] sm:px-7">
          <div className="flex min-w-0 items-center gap-3 text-xs font-semibold sm:text-sm">
            <Link href="/trips" className="hidden text-muted-foreground transition-colors hover:text-foreground sm:inline">
              Workspace
            </Link>
            <span className="hidden text-border sm:inline">/</span>
            <span className="truncate text-foreground">{pageLabel(pathname)}</span>
          </div>
          <Link
            href="/trips/new"
            className="inline-flex h-9 items-center justify-center rounded-lg border bg-card px-3 text-xs font-semibold text-primary transition-colors hover:border-primary/35 hover:bg-primary/5 sm:px-4 sm:text-sm"
          >
            + New trip
          </Link>
        </header>
        {children}
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-50 grid h-[calc(4rem+env(safe-area-inset-bottom))] grid-cols-3 border-t bg-card/95 px-4 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(25,55,47,0.08)] backdrop-blur sm:hidden" aria-label="Mobile navigation">
        <MobileNavLink href="/trips" label="Trips" active={pathname === "/trips" || pathname === "/trips/new"}><LayoutGrid /></MobileNavLink>
        <MobileNavLink href={plannerActive ? pathname.split("/").slice(0, 3).join("/") : "/trips"} label="Planner" active={plannerActive}><Compass /></MobileNavLink>
        <div className="flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold text-muted-foreground"><UserButton size="icon" disableDefaultLinks /><span>Account</span></div>
      </nav>
    </div>
  );
}

function MobileNavLink({ href, label, active, children }: { href: string; label: string; active: boolean; children: ReactNode }) {
  return (
    <Link href={href} className={cn("flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold text-muted-foreground", active && "text-primary")} aria-current={active ? "page" : undefined}>
      <span className={cn("flex size-8 items-center justify-center rounded-xl [&_svg]:size-4", active && "bg-primary/10")}>{children}</span>
      {label}
    </Link>
  );
}

function RailLink({ href, label, active, children }: { href: string; label: string; active: boolean; children: ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        "relative flex size-11 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-primary/8 hover:text-primary sm:size-12",
        active && "bg-primary/10 text-primary before:absolute before:-left-1.5 before:h-6 before:w-0.5 before:rounded-r-full before:bg-primary sm:before:-left-3",
      )}
      aria-label={label}
      title={label}
      aria-current={active ? "page" : undefined}
    >
      <span className="[&_svg]:size-5">{children}</span>
    </Link>
  );
}
