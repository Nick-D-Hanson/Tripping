import { Suspense } from "react";
import { Plus } from "lucide-react";
import Link from "next/link";
import { tripNoticeMessage } from "@/components/trips/mutation-feedback";
import { TripYearGroups } from "@/components/trips/trip-year-groups";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeaderSkeleton, SectionCardSkeleton } from "@/components/ui/loading-state";
import { Notice } from "@/components/ui/notice";
import { getDashboardTrips } from "@/lib/data";

function tripYear(startDate: string | Date) {
  if (typeof startDate === "string") {
    return startDate.slice(0, 4);
  }

  return String(startDate.getFullYear());
}

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
  const currentYear = String(new Date().getFullYear());
  const tripGroups = trips.reduce<Array<{ year: string; trips: typeof trips }>>((groups, trip) => {
    const year = tripYear(trip.startDate);
    const currentGroup = groups[groups.length - 1];

    if (!currentGroup || currentGroup.year !== year) {
      groups.push({ year, trips: [trip] });
      return groups;
    }

    currentGroup.trips.push(trip);
    return groups;
  }, []);

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      {noticeMessage ? (
        <Notice variant="success" className="mb-6">
          {noticeMessage}
        </Notice>
      ) : null}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-normal">Trips</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Plan routes, stays, activities, and collaborators from one shared workspace.
          </p>
        </div>
        <Button asChild className="w-full sm:w-auto">
          <Link href="/trips/new">
            <Plus className="size-4" />
            New trip
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
        <TripYearGroups groups={tripGroups} defaultExpandedYear={currentYear} />
      )}
    </main>
  );
}

function TripsPageFallback() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <PageHeaderSkeleton className="mb-6" />
      <SectionCardSkeleton lines={3} />
    </main>
  );
}
