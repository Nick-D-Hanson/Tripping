import { Activity, CalendarDays, Hotel, Pencil, Plane, Settings, Trash2, UsersRound } from "lucide-react";
import Link from "next/link";
import { deleteTrip } from "@/app/actions";
import { DeleteButton } from "@/components/trips/delete-button";
import { ExternalLinkButton } from "@/components/trips/external-link-button";
import { ActivityDialog, LodgingDialog, SegmentDialog } from "@/components/trips/item-dialogs";
import { Timeline } from "@/components/trips/timeline";
import { TripMap } from "@/components/trips/trip-map";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { fmtDate, fmtDateTime } from "@/lib/dates";
import { getTripPageData } from "@/lib/data";
import { canEdit, canManage } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function TripDetailPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const { trip, segments, stays, activities, role } = await getTripPageData(tripId);
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

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(340px,0.8fr)]">
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

        <Timeline segments={segments} stays={stays} activities={activities} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Plane className="size-5" /> Travel</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            {segments.length === 0 ? <p className="text-sm text-muted-foreground">No travel segments yet.</p> : null}
            {segments.map((segment) => (
              <div key={segment.id} className="rounded-md border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{segment.title || `${segment.startLocationName} to ${segment.endLocationName}`}</p>
                      <ExternalLinkButton href={segment.url} label={segment.title || `${segment.startLocationName} to ${segment.endLocationName}`} />
                    </div>
                    <p className="text-sm text-muted-foreground">{segment.type} · {fmtDateTime(segment.startDatetime)}</p>
                  </div>
                  <div className="flex">
                    <SegmentDialog tripId={trip.id} canEdit={editable} segment={segment} />
                    {editable ? <DeleteButton kind="segment" tripId={trip.id} id={segment.id} /> : null}
                  </div>
                </div>
                {segment.notes ? <><Separator className="my-3" /><p className="text-sm">{segment.notes}</p></> : null}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Hotel className="size-5" /> Lodging</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            {stays.length === 0 ? <p className="text-sm text-muted-foreground">No lodging yet.</p> : null}
            {stays.map((stay) => (
              <div key={stay.id} className="rounded-md border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{stay.title || stay.name}</p>
                      <ExternalLinkButton href={stay.url} label={stay.title || stay.name} />
                    </div>
                    <p className="text-sm text-muted-foreground">{fmtDateTime(stay.checkIn)}</p>
                  </div>
                  <div className="flex">
                    <LodgingDialog tripId={trip.id} canEdit={editable} stay={stay} />
                    {editable ? <DeleteButton kind="lodging" tripId={trip.id} id={stay.id} /> : null}
                  </div>
                </div>
                {stay.address ? <p className="mt-2 text-sm text-muted-foreground">{stay.address}</p> : null}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Activity className="size-5" /> Activities</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            {activities.length === 0 ? <p className="text-sm text-muted-foreground">No activities yet.</p> : null}
            {activities.map((activity) => (
              <div key={activity.id} className="rounded-md border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{activity.title || activity.name}</p>
                      <ExternalLinkButton href={activity.url} label={activity.title || activity.name} />
                      {activity.includeInRoute ? <Badge variant="outline">route</Badge> : null}
                    </div>
                    <p className="text-sm text-muted-foreground">{fmtDateTime(activity.datetime)}</p>
                  </div>
                  <div className="flex">
                    <ActivityDialog tripId={trip.id} canEdit={editable} activity={activity} />
                    {editable ? <DeleteButton kind="activity" tripId={trip.id} id={activity.id} /> : null}
                  </div>
                </div>
                {activity.category ? <p className="mt-2 text-sm text-muted-foreground">{activity.category}</p> : null}
              </div>
            ))}
          </CardContent>
        </Card>
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
