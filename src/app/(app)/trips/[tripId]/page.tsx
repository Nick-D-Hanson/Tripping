import { CalendarDays, Pencil, Settings, UsersRound } from "lucide-react";
import Link from "next/link";
import { ActivityDialog, FoodDialog, LodgingDialog, SegmentDialog } from "@/components/trips/item-dialogs";
import { PackingList } from "@/components/trips/packing-list";
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
  const { trip, segments, stays, activities, food, packingItems, role } = await getTripPageData(tripId);
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
    <main className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 sm:px-6 sm:py-8">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-normal sm:text-3xl">{trip.name}</h1>
            {role ? <Badge>{role}</Badge> : null}
          </div>
          <p className="mt-2 max-w-3xl text-muted-foreground">{trip.description || "No description yet."}</p>
          <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarDays className="size-4" />
            {fmtDate(trip.startDate)} - {fmtDate(trip.endDate)}
          </p>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href={`/trips/${trip.id}/members`}>
              <UsersRound className="size-4" />
              Members
            </Link>
          </Button>
          {manageable ? (
            <>
              <Button asChild variant="outline" className="w-full sm:w-auto">
                <Link href={`/trips/${trip.id}/edit`}>
                  <Pencil className="size-4" />
                  Edit
                </Link>
              </Button>
            </>
          ) : null}
        </div>
      </section>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <CardTitle>Map</CardTitle>
                <CardDescription>Travel, stays, and activities with routed or fallback paths.</CardDescription>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
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

        <PackingList tripId={trip.id} canEdit={editable} items={packingItems} />
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
