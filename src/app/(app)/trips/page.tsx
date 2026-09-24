import { Suspense } from "react";
import { ArrowRight, Plus } from "lucide-react";
import Link from "next/link";
import { tripNoticeMessage } from "@/components/trips/mutation-feedback";
import { TripSummaryCard } from "@/components/trips/trip-summary-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeaderSkeleton, SectionCardSkeleton } from "@/components/ui/loading-state";
import { Notice } from "@/components/ui/notice";
import { getDashboardTrips } from "@/lib/data";

export default function TripsPage({ searchParams }: { searchParams: Promise<{ notice?: string | string[] }> }) {
  return (
    <Suspense fallback={<TripsPageFallback />}>
      <TripsPageContent searchParams={searchParams} />
    </Suspense>
  );
}

async function TripsPageContent({ searchParams }: { searchParams: Promise<{ notice?: string | string[] }> }) {
  const trips = await getDashboardTrips();
  const noticeMessage = tripNoticeMessage((await searchParams).notice);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8 sm:py-12 lg:py-14">
      {noticeMessage ? (
        <Notice variant="success" className="mb-6">
          {noticeMessage}
        </Notice>
      ) : null}
      <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between lg:mb-10">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Your space to explore</p>
          <h1 className="mt-2 font-serif text-4xl font-medium tracking-tight sm:text-5xl">Where to next?</h1>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">Bring the places, people, and little details together.</p>
        </div>
        <Button asChild size="lg" className="w-full rounded-lg sm:w-auto">
          <Link href="/trips/new">
            <Plus className="size-4" />
            Plan a trip
          </Link>
        </Button>
      </div>

      {trips.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No trips yet</CardTitle>
            <CardDescription>Create your first trip and invite people once it exists.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full sm:w-auto">
              <Link href="/trips/new">
                <Plus className="size-4" />
                Create trip
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {trips.map((trip) => <TripSummaryCard key={trip.id} trip={trip} />)}
          <Link
            href="/trips/new"
            className="group flex min-h-72 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-primary/25 bg-primary/[0.025] px-6 text-center transition-colors hover:border-primary/45 hover:bg-primary/[0.055]"
          >
            <span className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary transition-transform group-hover:scale-105">
              <Plus className="size-5" />
            </span>
            <span className="font-serif text-2xl font-medium">Something on the horizon?</span>
            <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
              Start a new trip together <ArrowRight className="size-3.5" />
            </span>
          </Link>
        </div>
      )}
    </main>
  );
}

function TripsPageFallback() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8 sm:py-12">
      <PageHeaderSkeleton className="mb-6" />
      <SectionCardSkeleton lines={3} />
    </main>
  );
}
