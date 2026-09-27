"use client";

import { useDroppable } from "@dnd-kit/core";
import { eachDayOfInterval, format, parseISO } from "date-fns";
import { CalendarDays, ExternalLink, Lightbulb, Link2, List, Luggage, Map as MapIcon, Route, X } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { IdeaBucket, type IdeaBucketItem } from "@/components/trips/idea-bucket";
import { PackingList } from "@/components/trips/packing-list";
import { TripLinks, type TripLink } from "@/components/trips/trip-links";
import { plannerDayDropId, usePlannerDragEnabled } from "@/components/trips/trip-planner-dnd";
import { Timeline, type TimelineProps } from "@/components/trips/timeline";
import { TripMap, type TripMapPoint } from "@/components/trips/trip-map";
import { Button } from "@/components/ui/button";
import { dayKey } from "@/lib/dates";
import { cn } from "@/lib/utils";

type TimelineData = Pick<TimelineProps, "segments" | "stays" | "activities" | "food">;
type TripSection = "itinerary" | "ideas" | "packing" | "links";

type PackingItem = {
  id: string;
  name: string;
  category: string;
  quantity: string | null;
  assignedToMemberId: string | null;
  assigneeLabel: string | null;
  assigneeInitials: string | null;
  notes: string | null;
  isPacked: boolean;
  createdByUserId: string;
  createdAt: Date;
  creatorInitials: string;
};

type TripPlannerWorkspaceProps = TimelineData & {
  tripId: string;
  canEdit: boolean;
  tripStartDate: string;
  tripEndDate: string;
  token?: string;
  styleUrl?: string;
  ideas: IdeaBucketItem[];
  packingItems: PackingItem[];
  links: TripLink[];
  members: Array<{ id: string; label: string }>;
};

function ScheduleDay({ day, index }: { day: Date; index: number }) {
  const dragEnabled = usePlannerDragEnabled();
  const key = dayKey(day);
  const { setNodeRef, isOver } = useDroppable({ id: plannerDayDropId(key), disabled: !dragEnabled });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg border bg-background text-[9px] font-semibold uppercase text-muted-foreground transition-colors",
        isOver && "border-primary bg-primary/10 text-primary ring-2 ring-primary/15",
      )}
      title={`Drop on Day ${index + 1}, ${format(day, "MMMM d")}`}
    >
      <span>{format(day, "EEE")}</span>
      <span className="text-sm font-semibold text-foreground">{format(day, "d")}</span>
    </div>
  );
}

function IdeaScheduleStrip({ startDate, endDate }: { startDate: string; endDate: string }) {
  const days = useMemo(() => eachDayOfInterval({ start: parseISO(startDate), end: parseISO(endDate) }), [endDate, startDate]);

  return (
    <div className="mt-4 rounded-xl bg-muted/70 p-3">
      <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground"><CalendarDays className="size-3.5" /> Drag an idea to a day</p>
      <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
        {days.map((day, index) => <ScheduleDay key={day.toISOString()} day={day} index={index} />)}
      </div>
    </div>
  );
}

export function TripPlannerWorkspace({
  tripId,
  canEdit,
  tripStartDate,
  tripEndDate,
  token,
  styleUrl,
  segments,
  stays,
  activities,
  food,
  ideas,
  packingItems,
  links,
  members,
}: TripPlannerWorkspaceProps) {
  const [section, setSection] = useState<TripSection>("itinerary");
  const [activeDayKey, setActiveDayKey] = useState(tripStartDate);
  const [mobileView, setMobileView] = useState<"list" | "map">("list");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<TripMapPoint | null>(null);

  const itineraryPoints = useMemo<TripMapPoint[]>(() => [
    ...segments.flatMap((segment) => {
      const timelineItemId = `segment-${segment.id}`;
      const day = dayKey(segment.startDatetime);
      const result: TripMapPoint[] = [];
      if (segment.startLat != null && segment.startLng != null) {
        result.push({
          id: `${segment.id}-start`, kind: "travel", label: segment.title || segment.startLocationName,
          lat: segment.startLat, lng: segment.startLng, day, detail: `Departure · ${segment.type}`,
          address: segment.startAddress, notes: segment.notes, url: segment.url, timelineItemId,
        });
      }
      if (segment.endLat != null && segment.endLng != null) {
        result.push({
          id: `${segment.id}-end`, kind: "travel", label: segment.title || segment.endLocationName,
          lat: segment.endLat, lng: segment.endLng, day, detail: `Arrival · ${segment.type}`,
          address: segment.endAddress, notes: segment.notes, url: segment.url, timelineItemId,
        });
      }
      return result;
    }),
    ...stays.flatMap((stay) => stay.lat != null && stay.lng != null ? [{
      id: `lodging-${stay.id}`, kind: "lodging" as const, label: stay.title || stay.name,
      lat: stay.lat, lng: stay.lng, day: dayKey(stay.checkIn), endDay: dayKey(stay.checkOut ?? stay.checkIn),
      detailDateTime: stay.checkIn, detailPrefix: "Check-in", address: stay.address, notes: stay.notes,
      url: stay.url, timelineItemId: `lodging-${stay.id}`,
    }] : []),
    ...activities.flatMap((activity) => activity.lat != null && activity.lng != null ? [{
      id: `activity-${activity.id}`, kind: "activity" as const, label: activity.title || activity.name,
      lat: activity.lat, lng: activity.lng, day: dayKey(activity.datetime),
      detail: activity.includeInRoute ? "Included in the day route" : "Standalone stop",
      detailDateTime: activity.datetime, address: activity.address, notes: activity.notes,
      url: activity.url, timelineItemId: `activity-${activity.id}`,
    }] : []),
    ...food.flatMap((item) => item.lat != null && item.lng != null ? [{
      id: `food-${item.id}`, kind: "food" as const, label: item.title || item.name,
      lat: item.lat, lng: item.lng, day: dayKey(item.datetime), detailDateTime: item.datetime,
      address: item.address, notes: item.notes, url: item.url, timelineItemId: `food-${item.id}`,
    }] : []),
  ], [activities, food, segments, stays]);

  const ideaPoints = useMemo<TripMapPoint[]>(() => ideas.flatMap((idea) => idea.lat != null && idea.lng != null ? [{
    id: `idea-${idea.id}`, kind: "idea" as const, label: idea.description, lat: idea.lat, lng: idea.lng,
    detail: `Unscheduled idea · ${idea.locationName || "Saved place"}`, address: idea.address,
    notes: idea.notes, url: idea.url,
  }] : []), [ideas]);

  const fallbackLines = useMemo(() => segments
    .filter((segment) => segment.startLat != null && segment.startLng != null && segment.endLat != null && segment.endLng != null)
    .map((segment): { kind: "drive" | "flight"; coordinates: [[number, number], [number, number]] } => ({
      kind: segment.type === "drive" ? "drive" : "flight",
      coordinates: [[segment.startLng!, segment.startLat!], [segment.endLng!, segment.endLat!]],
    })), [segments]);

  const visibleItineraryPoints = useMemo(() => itineraryPoints.filter((point) => {
    if (point.kind === "lodging") return Boolean(point.day && point.day <= activeDayKey && (point.endDay ?? point.day) >= activeDayKey);
    return point.day === activeDayKey;
  }), [activeDayKey, itineraryPoints]);
  const overlappingLodging = visibleItineraryPoints.find((point) => point.kind === "lodging") ?? null;
  const dayStopCount = visibleItineraryPoints.length;

  const selectPoint = useCallback((point: TripMapPoint) => {
    setSelectedPoint(point);
    setSelectedItemId(point.timelineItemId ?? null);
  }, []);

  function selectTimelineItem(item: { id: string; sourceId: string; type: "travel" | "lodging" | "activity" | "food"; day: string }) {
    setSelectedItemId(item.id);
    setActiveDayKey(item.day);
    setSelectedPoint(itineraryPoints.find((candidate) => candidate.timelineItemId === item.id) ?? null);
  }

  function changeDay(day: string) {
    setActiveDayKey(day);
    setSelectedItemId(null);
    setSelectedPoint(null);
  }

  function changeSection(nextSection: TripSection) {
    setSection(nextSection);
    setMobileView("list");
    setSelectedItemId(null);
    setSelectedPoint(null);
  }

  const mapVisible = section === "itinerary" || section === "ideas";

  return (
    <section className="w-full min-w-0 overflow-hidden rounded-2xl border bg-card shadow-sm" aria-label="Trip planner">
      <div className="grid min-h-14 grid-cols-4 gap-1 border-b bg-muted/35 p-1.5 sm:flex sm:h-12 sm:min-h-0 sm:items-center sm:gap-6 sm:bg-transparent sm:px-6 sm:py-0" role="tablist" aria-label="Trip sections">
        {([
          { id: "itinerary" as const, label: "Itinerary", icon: CalendarDays },
          { id: "ideas" as const, label: "Ideas", icon: Lightbulb, count: ideas.length },
          { id: "packing" as const, label: "Packing", icon: Luggage },
          { id: "links" as const, label: "Links", icon: Link2, count: links.length },
        ]).map((tab) => {
          const Icon = tab.icon;
          const active = section === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              className={cn(
                "relative flex min-w-0 items-center justify-center gap-1 rounded-lg px-1.5 py-2 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-card hover:text-primary sm:h-full sm:flex-none sm:justify-start sm:gap-2 sm:rounded-none sm:px-0 sm:py-0 sm:text-sm sm:hover:bg-transparent",
                active && "bg-card text-primary shadow-sm ring-1 ring-border sm:bg-transparent sm:shadow-none sm:ring-0 sm:after:absolute sm:after:inset-x-0 sm:after:bottom-0 sm:after:h-0.5 sm:after:bg-primary",
              )}
              onClick={() => changeSection(tab.id)}
            >
              <Icon className="size-3.5 shrink-0 sm:hidden" />
              <span className="truncate">{tab.label}</span>
              {tab.count != null ? <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px]">{tab.count}</span> : null}
            </button>
          );
        })}
      </div>

      <div className="relative min-w-0 overflow-visible md:h-[clamp(560px,calc(100dvh-18.75rem),780px)] md:min-h-[560px] md:overflow-hidden">
        {section === "itinerary" ? (
          <div className={cn(
            "grid min-h-0 min-w-0 grid-cols-[minmax(0,1fr)] md:h-full md:grid-cols-[minmax(25rem,42%)_1fr]",
            mobileView === "map" && "h-[calc(100dvh-10rem)] min-h-[560px]",
          )}>
            <Timeline
              tripId={tripId} canEdit={canEdit} tripStartDate={tripStartDate} tripEndDate={tripEndDate}
              segments={segments} stays={stays} activities={activities} food={food}
              activeDayKey={activeDayKey} onActiveDayChange={changeDay}
              selectedItemId={selectedItemId} onSelectItem={selectTimelineItem}
              className={cn("min-w-0 border-r", mobileView === "map" && "hidden md:flex")}
            />
            <PlannerMapPanel
              className={mobileView === "list" ? "hidden md:block" : undefined}
              tripId={tripId} token={token} styleUrl={styleUrl} points={visibleItineraryPoints}
              fallbackLines={fallbackLines} selectedPoint={selectedPoint} onSelectPoint={selectPoint}
              onClosePoint={() => { setSelectedPoint(null); setSelectedItemId(null); }}
              focusPointId={overlappingLodging?.id} visible={mobileView === "map"}
              chip={`Day ${Math.max(1, Math.round((parseISO(activeDayKey).getTime() - parseISO(tripStartDate).getTime()) / 86_400_000) + 1)} · ${dayStopCount} mapped ${dayStopCount === 1 ? "point" : "points"}`}
            />
          </div>
        ) : null}

        {section === "ideas" ? (
          <div className={cn(
            "grid min-h-0 min-w-0 grid-cols-[minmax(0,1fr)] md:h-full md:grid-cols-[minmax(22rem,38%)_1fr]",
            mobileView === "map" && "h-[calc(100dvh-10rem)] min-h-[560px]",
          )}>
            <IdeaBucket
              tripId={tripId} canEdit={canEdit} items={ideas}
              scheduleControls={canEdit ? <IdeaScheduleStrip startDate={tripStartDate} endDate={tripEndDate} /> : null}
              className={cn("min-w-0 border-r", mobileView === "map" && "hidden md:flex")}
            />
            <PlannerMapPanel
              className={mobileView === "list" ? "hidden md:block" : undefined}
              tripId={tripId} token={token} styleUrl={styleUrl} points={ideaPoints}
              fallbackLines={[]} selectedPoint={selectedPoint} onSelectPoint={selectPoint}
              onClosePoint={() => setSelectedPoint(null)} visible={mobileView === "map"} showRoutes={false}
              chip={`${ideaPoints.length} located ${ideaPoints.length === 1 ? "idea" : "ideas"}`}
            />
          </div>
        ) : null}

        {section === "packing" ? <PackingList tripId={tripId} canEdit={canEdit} items={packingItems} members={members} className="md:h-full" /> : null}

        {section === "links" ? <TripLinks tripId={tripId} canEdit={canEdit} items={links} className="md:h-full" /> : null}

        {mapVisible ? (
          <div className="fixed bottom-20 left-1/2 z-50 flex -translate-x-1/2 gap-1 rounded-xl border bg-card/95 p-1.5 shadow-xl backdrop-blur md:hidden" role="group" aria-label={`${section} view`}>
            <Button type="button" size="sm" variant={mobileView === "list" ? "primary" : "outline"} className="h-11 min-w-24 rounded-lg text-foreground data-[active=true]:text-primary-foreground" data-active={mobileView === "list"} aria-pressed={mobileView === "list"} onClick={() => setMobileView("list")}>
              <List className="size-4" /> {section === "ideas" ? "Ideas" : "Itinerary"}
            </Button>
            <Button type="button" size="sm" variant={mobileView === "map" ? "primary" : "outline"} className="h-11 min-w-24 rounded-lg text-foreground data-[active=true]:text-primary-foreground" data-active={mobileView === "map"} aria-pressed={mobileView === "map"} onClick={() => setMobileView("map")}>
              <MapIcon className="size-4" /> Map
            </Button>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function PlannerMapPanel({
  tripId, token, styleUrl, points, fallbackLines, selectedPoint, onSelectPoint, onClosePoint,
  focusPointId, visible, showRoutes = true, chip, className,
}: {
  tripId: string;
  token?: string;
  styleUrl?: string;
  points: TripMapPoint[];
  fallbackLines: Array<{ kind: "drive" | "flight"; coordinates: [[number, number], [number, number]] }>;
  selectedPoint: TripMapPoint | null;
  onSelectPoint: (point: TripMapPoint) => void;
  onClosePoint: () => void;
  focusPointId?: string;
  visible: boolean;
  showRoutes?: boolean;
  chip: string;
  className?: string;
}) {
  return (
    <div className={cn("relative min-h-0 overflow-hidden bg-muted", className)}>
      <TripMap
        tripId={tripId} token={token} styleUrl={styleUrl} points={points} fallbackLines={fallbackLines}
        selectedPointId={selectedPoint?.id} focusPointId={focusPointId} onSelectPoint={onSelectPoint}
        visible={visible} showRoutes={showRoutes} className="h-full min-h-0 border-0"
      />
      <div className="pointer-events-none absolute left-4 top-4 flex items-center gap-2 rounded-lg bg-white/92 px-3 py-2 text-xs font-semibold text-foreground shadow-md backdrop-blur">
        <span className={cn("size-2 rounded-full", showRoutes ? "bg-emerald-500" : "bg-violet-500")} />{chip}
      </div>
      {selectedPoint ? (
        <div className="absolute right-4 top-16 w-[min(18rem,calc(100%-2rem))] rounded-2xl border bg-card p-4 shadow-xl">
          <button type="button" className="float-right flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted" onClick={onClosePoint} aria-label="Close stop details"><X className="size-4" /></button>
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-accent">{selectedPoint.kind}</p>
          <h3 className="mt-2 pr-8 text-base font-semibold">{selectedPoint.label}</h3>
          {selectedPoint.detailDateTime ? <p className="mt-2 text-xs font-semibold">{selectedPoint.detailPrefix ? `${selectedPoint.detailPrefix} ` : ""}{format(new Date(selectedPoint.detailDateTime), "MMM d · h:mm a")}</p> : null}
          {selectedPoint.detail ? <p className="mt-2 text-xs text-muted-foreground">{selectedPoint.detail}</p> : null}
          {selectedPoint.address ? <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{selectedPoint.address}</p> : null}
          {selectedPoint.notes ? <p className="mt-3 border-t pt-3 text-xs leading-relaxed text-foreground">{selectedPoint.notes}</p> : null}
          {selectedPoint.url ? <a href={selectedPoint.url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">Open link <ExternalLink className="size-3" /></a> : null}
        </div>
      ) : null}
      {showRoutes ? (
        <div className="absolute bottom-4 right-4 hidden max-w-64 rounded-xl border bg-white/92 p-3 shadow-lg backdrop-blur sm:block">
          <p className="flex items-center gap-2 text-xs font-semibold"><Route className="size-3.5 text-primary" /> Live route preview</p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">Driving routes use Mapbox. Flights and unavailable routes fall back to direct connections.</p>
        </div>
      ) : null}
    </div>
  );
}
