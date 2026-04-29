import { CalendarDays, Plus, UsersRound } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { fmtDate } from "@/lib/dates";
import { getDashboardTrips } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function TripsPage() {
  const trips = await getDashboardTrips();

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-normal">Trips</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Plan routes, stays, activities, and collaborators from one shared workspace.
          </p>
        </div>
        <Button asChild>
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
            <Button asChild>
              <Link href="/trips/new">
                <Plus className="size-4" />
                Create trip
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {trips.map((trip) => (
            <Link key={trip.id} href={`/trips/${trip.id}`}>
              <Card className="h-full transition hover:border-primary/60 hover:shadow-md">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="leading-6">{trip.name}</CardTitle>
                    <Badge variant={trip.role === "owner" ? "default" : "secondary"}>{trip.role}</Badge>
                  </div>
                  <CardDescription className="line-clamp-2">{trip.description || "No description yet."}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="size-4" />
                    {fmtDate(trip.startDate)} - {fmtDate(trip.endDate)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <UsersRound className="size-4" />
                    Shared plan
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
