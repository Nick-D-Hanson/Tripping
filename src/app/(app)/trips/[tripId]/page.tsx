import { Suspense } from "react";
import { CalendarDays, Pencil, Settings, UsersRound } from "lucide-react";
import Link from "next/link";
import { IdeaBucket } from "@/components/trips/idea-bucket";
import { tripNoticeMessage } from "@/components/trips/mutation-feedback";
import { ActivityDialog, FoodDialog, LodgingDialog, SegmentDialog } from "@/components/trips/item-dialogs";
import { PackingList } from "@/components/trips/packing-list";
import { Timeline } from "@/components/trips/timeline";
import { TripMap } from "@/components/trips/trip-map";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeaderSkeleton, SectionCardSkeleton } from "@/components/ui/loading-state";
import { Notice } from "@/components/ui/notice";
import { SectionState } from "@/components/ui/section-state";
import { fmtDate } from "@/lib/dates";
import { getTripIdeaBucketData, getTripMapData, getTripPackingData, getTripShellData, getTripTimelineData } from "@/lib/data";
import { canEdit, canManage } from "@/lib/permissions";

export default function TripDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ tripId: string }>;
  searchParams: Promise<{ notice?: string | string[] }>;
}) {
  return (
    <Suspense fallback={<TripDetailFallback />}>
      <TripDetailContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function TripDetailContent({
  params,
  searchParams,
}: {
  params: Promise<{ tripId: string }>;
  searchParams: Promise<{ notice?: string | string[] }>;
}) {
  const { tripId } = await params;
  const { trip, role } = await getTripShellData(tripId);
  const noticeMessage = tripNoticeMessage((await searchParams).notice);
  const editable = canEdit(role);
  const manageable = canManage(role);

  return (
    <main className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 sm:px-6 sm:py-8">
      {noticeMessage ? (
        <Notice variant="success">
          {noticeMessage}
        </Notice>
      ) : null}
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
          <Button asChild variant="secondary" className="w-full sm:w-auto">
            <Link href={`/trips/${trip.id}/members`}>
              <UsersRound className="size-4" />
              Members
            </Link>
          </Button>
          {manageable ? (
            <>
              <Button asChild variant="secondary" className="w-full sm:w-auto">
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
        <Suspense fallback={<SectionFallback title="Map" description="Loading mapped trip items..." />}>
          <TripMapSection tripId={trip.id} canEdit={editable} />
        </Suspense>

        <Suspense fallback={<SectionFallback title="Timeline" description="Loading timeline..." />}>
          <TripTimelineSection tripId={trip.id} canEdit={editable} />
        </Suspense>

        <Suspense fallback={<SectionFallback title="Idea Bucket" description="Loading idea bucket..." />}>
          <TripIdeaBucketSection tripId={trip.id} canEdit={editable} />
        </Suspense>

        <Suspense fallback={<SectionFallback title="Packing List" description="Loading packing list..." />}>
          <TripPackingSection tripId={trip.id} canEdit={editable} />
        </Suspense>
      </div>

      {!editable ? (
        <Card>
          <CardContent className="pt-5">
            <SectionState
              title="Viewer access"
              description="Editing controls are hidden because this trip is shared with you in view-only mode."
              icon={Settings}
              variant="info"
            />
          </CardContent>
        </Card>
      ) : null}
    </main>
  );
}

function TripDetailFallback() {
  return (
    <main className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 sm:px-6 sm:py-8">
      <PageHeaderSkeleton withActions />
      <SectionCardSkeleton withActions lines={1} className="min-h-[220px]" />
      <SectionCardSkeleton lines={4} />
      <SectionCardSkeleton lines={3} />
    </main>
  );
}

function SectionFallback({ title }: { title: string; description: string }) {
  return (
    <SectionCardSkeleton withActions={title === "Map"} lines={title === "Map" ? 1 : 3} className={title === "Map" ? "min-h-[220px]" : undefined} />
  );
}

async function TripMapSection({ tripId, canEdit }: { tripId: string; canEdit: boolean }) {
  const { segments, stays, activities, food, ideas } = await getTripMapData(tripId);

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
        detailDateTime: stay.checkIn,
        detailPrefix: "Check-in",
      })),
    ...activities
      .filter((activity) => activity.lat != null && activity.lng != null)
      .map((activity) => ({
        id: activity.id,
        kind: "activity" as const,
        label: activity.title || activity.name,
        lat: activity.lat!,
        lng: activity.lng!,
        detail: activity.includeInRoute ? "Included in route" : undefined,
      })),
    ...food
      .filter((item) => item.lat != null && item.lng != null)
      .map((item) => ({
        id: item.id,
        kind: "food" as const,
        label: item.title || item.name,
        lat: item.lat!,
        lng: item.lng!,
        detailDateTime: item.datetime,
      })),
    ...ideas
      .filter((idea) => idea.lat != null && idea.lng != null)
      .map((idea) => ({
        id: `idea-${idea.id}`,
        kind: "idea" as const,
        label: idea.description,
        lat: idea.lat!,
        lng: idea.lng!,
        detail: `Idea · ${idea.locationName}`,
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
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle>Map</CardTitle>
            <CardDescription>Travel, stays, activities, food, and located ideas with routed or fallback paths.</CardDescription>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <SegmentDialog tripId={tripId} canEdit={canEdit} />
            <LodgingDialog tripId={tripId} canEdit={canEdit} />
            <ActivityDialog tripId={tripId} canEdit={canEdit} />
            <FoodDialog tripId={tripId} canEdit={canEdit} />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <TripMap
          tripId={tripId}
          token={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
          styleUrl={process.env.NEXT_PUBLIC_MAPBOX_STYLE_URL}
          points={points}
          fallbackLines={fallbackLines}
        />
      </CardContent>
    </Card>
  );
}

async function TripTimelineSection({ tripId, canEdit }: { tripId: string; canEdit: boolean }) {
  const { segments, stays, activities, food } = await getTripTimelineData(tripId);
  return <Timeline tripId={tripId} canEdit={canEdit} segments={segments} stays={stays} activities={activities} food={food} />;
}

async function TripIdeaBucketSection({ tripId, canEdit }: { tripId: string; canEdit: boolean }) {
  const items = await getTripIdeaBucketData(tripId);
  return <IdeaBucket tripId={tripId} canEdit={canEdit} items={items} />;
}

async function TripPackingSection({ tripId, canEdit }: { tripId: string; canEdit: boolean }) {
  const items = await getTripPackingData(tripId);
  return <PackingList tripId={tripId} canEdit={canEdit} items={items} />;
}
