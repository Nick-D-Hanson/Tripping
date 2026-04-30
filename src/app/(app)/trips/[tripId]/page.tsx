import { CalendarDays, Pencil, Settings, Trash2, UsersRound } from "lucide-react";
import Link from "next/link";
import { deleteTrip } from "@/app/actions";
import { ActivityDialog, FoodDialog, LodgingDialog, SegmentDialog } from "@/components/trips/item-dialogs";
import { Timeline } from "@/components/trips/timeline";
import { TripMap } from "@/components/trips/trip-map";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { fmtDate, fmtDateTime } from "@/lib/dates";
import { getTripPageData } from "@/lib/data";
import { canEdit, canManage } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function TripDetailPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const { trip, segments, stays, activities, food, role } = await getTripPageData(tripId);
  const editable = canEdit(role);
  const manageable = canManage(role);

  const points = [
    ...segments.flatMap((segment) => {
      const result = [];
      if (segment.startLat != null && segment.startLng != null) {
        result.push({
          id: `${segment.id}-start`,
          kind: "travel" as const,
          label: segment.startLocationName,
          lat: segment.startLat,
          lng: segment.startLng,
          detail: `Start · ${segment.type}`,
        });
      }
      if (segment.endLat != null && segment.endLng != null) {
        result.push({
          id: `${segment.id}-end`,
          kind: "travel" as const,
          label: segment.endLocationName,
          lat: segment.endLat,
          lng: segment.endLng,
          detail: `End · ${segment.type}`,
        });
      }
      return result;
    }),
    ...stays
      .filter((stay) => stay.lat != null && stay.lng != null)
      .map((stay) => ({
        id: stay.id,
        kind: "lodging" as const,
        label: stay.title || stay.name,
        lat: stay.lat!,
        lng: stay.lng!,
        detail: fmtDateTime(stay.checkIn),
      })),
    ...activities
      .filter((activity) => activity.lat != null && activity.lng != null)
      .map((activity) => ({
        id: activity.id,
        kind: "activity" as const,
        label: activity.title || activity.name,
        lat: activity.lat!,
        lng: activity.lng!,
        detail: activity.includeInRoute ? "Included in route" : activity.category ?? undefined,
      })),
    ...food
      .filter((item) => item.lat != null && item.lng != null)
      .map((item) => ({
        id: item.id,
        kind: "food" as const,
        label: item.title || item.name,
        lat: item.lat!,
        lng: item.lng!,
        detail: fmtDateTime(item.datetime),
      })),
  ];

  const fallbackLines = segments
    .filter((segment) => segment.startLat != null && segment.startLng != null && segment.endLat != null && segment.endLng != null)
    .map((segment): { kind: "drive" | "flight"; coordinates: [[number, number], [number, number]] } => {
      const kind = segment.type === "drive" ? "drive" : "flight";
      return {
        kind,
        coordinates: [[segment.startLng!, segment.startLat!], [segment.endLng!, segment.endLat!]],
      };
    });

  return (
    <main className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-8 sm:px-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-semibold tracking-normal">{trip.name}</h1>
            {role ? <Badge>{role}</Badge> : null}
          </div>
          <p className="mt-2 max-w-3xl text-muted-foreground">{trip.description || "No description yet."}</p>
          <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarDays className="size-4" />
            {fmtDate(trip.startDate)} - {fmtDate(trip.endDate)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href={`/trips/${trip.id}/members`}>
              <UsersRound className="size-4" />
              Members
            </Link>
          </Button>
          {manageable ? (
            <>
              <Button asChild variant="outline">
                <Link href={`/trips/${trip.id}/edit`}>
                  <Pencil className="size-4" />
                  Edit
                </Link>
              </Button>
              <form action={deleteTrip.bind(null, trip.id)}>
                <Button variant="destructive" type="submit">
                  <Trash2 className="size-4" />
                  Delete
                </Button>
              </form>
            </>
          ) : null}
        </div>
      </section>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>Map</CardTitle>
                <CardDescription>Travel, stays, and activities with routed or fallback paths.</CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <SegmentDialog tripId={trip.id} canEdit={editable} />
                <LodgingDialog tripId={trip.id} canEdit={editable} />
                <ActivityDialog tripId={trip.id} canEdit={editable} />
                <FoodDialog tripId={trip.id} canEdit={editable} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <TripMap
              tripId={trip.id}
              token={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
              styleUrl={process.env.NEXT_PUBLIC_MAPBOX_STYLE_URL}
              points={points}
              fallbackLines={fallbackLines}
            />
          </CardContent>
        </Card>

        <Timeline tripId={trip.id} canEdit={editable} segments={segments} stays={stays} activities={activities} food={food} />
      </div>

      {!editable ? (
        <Card>
          <CardContent className="flex items-center gap-2 pt-5 text-sm text-muted-foreground">
            <Settings className="size-4" />
            You have viewer access, so editing controls are hidden.
          </CardContent>
        </Card>
      ) : null}
    </main>
  );
}
