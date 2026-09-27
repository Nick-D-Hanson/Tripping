import { Suspense } from "react";
import { CalendarDays, Pencil, Settings, UsersRound } from "lucide-react";
import Link from "next/link";
import { tripNoticeMessage } from "@/components/trips/mutation-feedback";
import { TripPlannerDragProvider } from "@/components/trips/trip-planner-dnd";
import { TripPlannerWorkspace } from "@/components/trips/trip-planner-workspace";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeaderSkeleton, SectionCardSkeleton } from "@/components/ui/loading-state";
import { Notice } from "@/components/ui/notice";
import { SectionState } from "@/components/ui/section-state";
import { fmtDate } from "@/lib/dates";
import { getTripPageData } from "@/lib/data";
import { canEdit, canManage } from "@/lib/permissions";
import { initialsFromValue } from "@/lib/utils";

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
  const { trip, segments, stays, activities, food, members, role, packingItems, ideaBucketItems, tripLinks } = await getTripPageData(tripId);
  const noticeMessage = tripNoticeMessage((await searchParams).notice);
  const editable = canEdit(role);
  const manageable = canManage(role);

  return (
    <main className="mx-auto grid w-full max-w-[1500px] gap-6 px-3 py-5 sm:px-6 sm:py-7 lg:px-8">
      {noticeMessage ? <Notice variant="success">{noticeMessage}</Notice> : null}

      <section className="flex flex-col gap-5 md:sticky md:top-0 md:z-30 md:-mx-6 md:bg-background/95 md:px-6 md:py-2 md:backdrop-blur lg:-mx-8 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">{new Date(trip.startDate) > new Date() ? "Upcoming trip" : "Your trip"}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2.5">
            <h1 className="font-serif text-3xl font-medium tracking-tight sm:text-4xl">{trip.name}</h1>
            {role ? <Badge variant={role === "owner" ? "default" : "secondary"}>{role}</Badge> : null}
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">{trip.description || "A shared plan ready for its next detail."}</p>
          <p className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <CalendarDays className="size-3.5" />
            {fmtDate(trip.startDate)} – {fmtDate(trip.endDate)}
            <span aria-hidden="true">·</span>
            {members.length} traveler{members.length === 1 ? "" : "s"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex -space-x-2" aria-label={`${members.length} trip collaborators`}>
            {members.slice(0, 4).map((member, index) => (
              <span
                key={member.id}
                className="flex size-9 items-center justify-center rounded-full border-2 border-background bg-primary/10 text-[10px] font-bold text-primary"
                style={{ zIndex: members.length - index }}
                title={member.email ?? member.userId ?? member.role}
              >
                {initialsFromValue(member.email ?? member.userId)}
              </span>
            ))}
          </div>
          <Button asChild variant="secondary">
            <Link href={`/trips/${trip.id}/members`}><UsersRound className="size-4" /> People & access</Link>
          </Button>
          {manageable ? (
            <Button asChild variant="ghost" size="icon">
              <Link href={`/trips/${trip.id}/edit`} aria-label="Edit trip settings" title="Edit trip settings"><Pencil className="size-4" /></Link>
            </Button>
          ) : null}
        </div>
      </section>

      <TripPlannerDragProvider tripId={trip.id} canEdit={editable}>
        <div className="grid gap-6">
          <TripPlannerWorkspace
            tripId={trip.id}
            canEdit={editable}
            tripStartDate={trip.startDate}
            tripEndDate={trip.endDate}
            token={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
            styleUrl={process.env.NEXT_PUBLIC_MAPBOX_STYLE_URL}
            segments={segments}
            stays={stays}
            activities={activities}
            food={food}
            ideas={ideaBucketItems}
            packingItems={packingItems}
            links={tripLinks}
            members={members.map((member) => ({ id: member.id, label: member.email ?? member.userId ?? "Traveler" }))}
          />
        </div>
      </TripPlannerDragProvider>

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
    <main className="mx-auto grid w-full max-w-[1500px] gap-6 px-3 py-5 sm:px-6 sm:py-7 lg:px-8">
      <PageHeaderSkeleton withActions />
      <SectionCardSkeleton withActions lines={5} className="min-h-[680px]" />
      <div className="grid gap-6 xl:grid-cols-2"><SectionCardSkeleton lines={3} /><SectionCardSkeleton lines={3} /></div>
    </main>
  );
}
