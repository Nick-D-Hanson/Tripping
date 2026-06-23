"use client";

import { useDraggable, useDroppable } from "@dnd-kit/core";
import { eachDayOfInterval, format, parseISO } from "date-fns";
import { Activity, CalendarDays, ChevronDown, Clock, Hotel, Plane, UtensilsCrossed } from "lucide-react";
import { useMemo, useState, useSyncExternalStore } from "react";
import { DeleteButton } from "@/components/trips/delete-button";
import { ExternalLinkButton } from "@/components/trips/external-link-button";
import { ActivityDialog, FoodDialog, LodgingDialog, SegmentDialog } from "@/components/trips/item-dialogs";
import { PlannerDragHandle, plannerDayDropId, usePlannerDragEnabled } from "@/components/trips/trip-planner-dnd";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EntityRow, EntityRowActions, EntityRowMeta, EntityRowNotes } from "@/components/ui/entity-row";
import { SectionState } from "@/components/ui/section-state";
import { dateValue, dayKey, dayLabel, fmtDateTime } from "@/lib/dates";

const emptySubscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;
const desktopQuery = "(min-width: 1024px)";
const desktopSubscribe = (callback: () => void) => {
  if (typeof window === "undefined") return () => {};
  const media = window.matchMedia(desktopQuery);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
};
const desktopSnapshot = () => (typeof window === "undefined" ? false : window.matchMedia(desktopQuery).matches);

type TimelineProps = {
  tripId: string;
  canEdit: boolean;
  tripStartDate: string;
  tripEndDate: string;
  segments: Array<{
    id: string;
    title: string | null;
    url: string | null;
    type: string;
    startLocationName: string;
    startAddress: string | null;
    startLat: number | null;
    startLng: number | null;
    endLocationName: string;
    endAddress: string | null;
    endLat: number | null;
    endLng: number | null;
    startDatetime: Date;
    endDatetime: Date | null;
    notes: string | null;
  }>;
  stays: Array<{
    id: string;
    title: string | null;
    name: string;
    url: string | null;
    address: string | null;
    lat: number | null;
    lng: number | null;
    checkIn: Date;
    checkOut: Date | null;
    notes: string | null;
  }>;
  activities: Array<{
    id: string;
    title: string | null;
    name: string;
    url: string | null;
    address: string | null;
    lat: number | null;
    lng: number | null;
    datetime: Date;
    includeInRoute: boolean;
    notes: string | null;
  }>;
  food: Array<{
    id: string;
    title: string | null;
    name: string;
    url: string | null;
    address: string | null;
    lat: number | null;
    lng: number | null;
    datetime: Date;
    notes: string | null;
  }>;
};

type TimelineItem = {
  id: string;
  sourceId: string;
  when: Date;
  type: "travel" | "lodging" | "activity" | "food";
  kindLabel: string;
  title: string;
  url: string | null;
  meta: string;
  notes: string | null;
  route?: boolean;
  raw: TimelineProps["segments"][number] | TimelineProps["stays"][number] | TimelineProps["activities"][number] | TimelineProps["food"][number];
};

type TimelineDayData = {
  key: string;
  items: TimelineItem[];
};

type TimelineGroup = {
  label: "Morning" | "Afternoon" | "Evening";
  items: TimelineItem[];
};

type TimelineDisplayMode = 1 | 3 | 5 | 7 | "all";

const displayOptions: Array<{ value: TimelineDisplayMode; label: string }> = [
  { value: 1, label: "1 Day" },
  { value: 3, label: "3 Days" },
  { value: 5, label: "5 Days" },
  { value: 7, label: "7 Days" },
  { value: "all", label: "All Days" },
];

export function Timeline({ tripId, canEdit, tripStartDate, tripEndDate, segments, stays, activities, food }: TimelineProps) {
  const hydrated = useSyncExternalStore(emptySubscribe, clientSnapshot, serverSnapshot);
  const isDesktop = useSyncExternalStore(desktopSubscribe, desktopSnapshot, serverSnapshot);
  const [displayMode, setDisplayMode] = useState<TimelineDisplayMode>(3);
  const [openMobileDayKey, setOpenMobileDayKey] = useState<string | null>(null);

  const items = useMemo(
    () => [
      ...segments.map((item) => ({
        id: `segment-${item.id}`,
        sourceId: item.id,
        when: dateValue(item.startDatetime),
        type: "travel" as const,
        kindLabel: item.type === "flight" ? "Flight" : "Drive",
        title: item.title || `${item.startLocationName} to ${item.endLocationName}`,
        url: item.url,
        meta: `${item.type} · ${fmtDateTime(item.startDatetime)}${item.endDatetime ? ` to ${fmtDateTime(item.endDatetime)}` : ""}`,
        notes: item.notes,
        raw: item,
      })),
      ...stays.map((item) => ({
        id: `lodging-${item.id}`,
        sourceId: item.id,
        when: dateValue(item.checkIn),
        type: "lodging" as const,
        kindLabel: "Lodging",
        title: item.title || item.name,
        url: item.url,
        meta: `Check-in ${fmtDateTime(item.checkIn)}${item.checkOut ? ` · Check-out ${fmtDateTime(item.checkOut)}` : ""}`,
        notes: item.notes,
        raw: item,
      })),
      ...activities.map((item) => ({
        id: `activity-${item.id}`,
        sourceId: item.id,
        when: dateValue(item.datetime),
        type: "activity" as const,
        kindLabel: "Activity",
        title: item.title || item.name,
        url: item.url,
        meta: `Activity · ${fmtDateTime(item.datetime)}`,
        notes: item.notes,
        route: item.includeInRoute,
        raw: item,
      })),
      ...food.map((item) => ({
        id: `food-${item.id}`,
        sourceId: item.id,
        when: dateValue(item.datetime),
        type: "food" as const,
        kindLabel: "Food",
        title: item.title || item.name,
        url: item.url,
        meta: `Food · ${fmtDateTime(item.datetime)}`,
        notes: item.notes,
        raw: item,
      })),
    ].sort((a, b) => a.when.getTime() - b.when.getTime()),
    [activities, food, segments, stays],
  );

  const days = useMemo(
    () => {
      const itemsByDay = new Map<string, TimelineItem[]>();
      for (const item of items) {
        const key = dayKey(item.when);
        itemsByDay.set(key, [...(itemsByDay.get(key) ?? []), item]);
      }

      const tripDays = eachDayOfInterval({ start: parseISO(tripStartDate), end: parseISO(tripEndDate) });
      const keys = new Set([...tripDays.map(dayKey), ...itemsByDay.keys()]);
      return [...keys].sort().map((key) => ({ key, items: itemsByDay.get(key) ?? [] }));
    },
    [items, tripEndDate, tripStartDate],
  );

  const desktopDays = useMemo(
    () => displayMode === "all" ? days : days.slice(0, displayMode),
    [days, displayMode],
  );

  if (!hydrated) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <SectionState
            title="Loading timeline"
            description="Trip items are being grouped into day-by-day itinerary sections."
          />
        </CardContent>
      </Card>
    );
  }

  if (items.length === 0 && !canEdit) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <SectionState
            title="No itinerary yet"
            description="Add travel, lodging, or activities to build the trip timeline."
            action={canEdit ? <SegmentDialog tripId={tripId} canEdit={canEdit} /> : null}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle>Timeline</CardTitle>
            <CardDescription>Plan the trip by day. Items are grouped and ordered by time.</CardDescription>
          </div>
          <div className="grid gap-3">
            {isDesktop ? <TimelineDisplayControl value={displayMode} onChange={setDisplayMode} /> : null}
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              <SegmentDialog tripId={tripId} canEdit={canEdit} />
              <LodgingDialog tripId={tripId} canEdit={canEdit} />
              <ActivityDialog tripId={tripId} canEdit={canEdit} />
              <FoodDialog tripId={tripId} canEdit={canEdit} />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-6">
        {isDesktop ? (
          <div className="overflow-x-auto pb-2">
            <div
              className="grid min-w-full gap-4"
              style={{ gridTemplateColumns: `repeat(${desktopDays.length}, minmax(15rem, 1fr))` }}
            >
              {desktopDays.map((day) => (
                <TimelineDayColumn key={day.key} tripId={tripId} canEdit={canEdit} day={day} />
              ))}
            </div>
          </div>
        ) : (
          <div className="grid gap-4">
            {days.map((day) => (
              <TimelineDayCard
                key={day.key}
                tripId={tripId}
                canEdit={canEdit}
                day={day}
                isOpen={openMobileDayKey === day.key}
                onToggle={() => setOpenMobileDayKey((current) => current === day.key ? null : day.key)}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TimelineDisplayControl({
  value,
  onChange,
}: {
  value: TimelineDisplayMode;
  onChange: (value: TimelineDisplayMode) => void;
}) {
  return (
    <div className="grid gap-2">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Display</p>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Timeline days to display">
        {displayOptions.map((option) => (
          <Button
            key={option.label}
            type="button"
            variant={value === option.value ? "primary" : "secondary"}
            size="sm"
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

function TimelineDayColumn({
  tripId,
  canEdit,
  day,
}: {
  tripId: string;
  canEdit: boolean;
  day: TimelineDayData;
}) {
  const dragEnabled = usePlannerDragEnabled();
  const { setNodeRef, isOver } = useDroppable({ id: plannerDayDropId(day.key), disabled: !dragEnabled });
  const groups = groupTimelineItems(day.items);

  return (
    <section
      ref={setNodeRef}
      className={`flex min-h-[28rem] flex-col rounded-lg border bg-card transition-colors ${isOver ? "border-primary bg-primary/5 ring-2 ring-primary/30" : ""}`}
    >
      <div className="grid gap-4 border-b p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{format(parseISO(day.key), "EEE")}</p>
            <h3 className="text-lg font-semibold">{format(parseISO(day.key), "MMM d")}</h3>
            <p className="text-xs text-muted-foreground">
              {day.items.length} item{day.items.length === 1 ? "" : "s"}
              {dragEnabled ? " · Drop items here" : ""}
            </p>
          </div>
          <CalendarDays className="mt-1 size-4 text-muted-foreground" />
        </div>
      </div>
      <div className="grid flex-1 content-start gap-4 p-4">
        {day.items.length === 0 ? (
          <SectionState
            title="Nothing planned yet"
            description="Use the Timeline header to add an item, or drop an idea onto this day."
            className="px-3 py-4"
          />
        ) : groups.map((group) => (
          <TimelineItemGroup key={group.label} tripId={tripId} canEdit={canEdit} group={group} />
        ))}
      </div>
    </section>
  );
}

function TimelineDayCard({
  tripId,
  canEdit,
  day,
  isOpen,
  onToggle,
}: {
  tripId: string;
  canEdit: boolean;
  day: TimelineDayData;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const dragEnabled = usePlannerDragEnabled();
  const { setNodeRef, isOver } = useDroppable({ id: plannerDayDropId(day.key), disabled: !dragEnabled });
  const groups = groupTimelineItems(day.items);

  return (
    <details
      ref={setNodeRef}
      open={isOpen}
      className={`rounded-lg border bg-card transition-colors ${isOver ? "border-primary bg-primary/5 ring-2 ring-primary/30" : ""}`}
    >
      <summary
        className="flex min-h-11 cursor-pointer list-none items-start justify-between gap-3 p-4"
        onClick={(event) => {
          event.preventDefault();
          onToggle();
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground">{dayLabel(day.key)}</h3>
            <p className="text-xs text-muted-foreground">
              {day.items.length} item{day.items.length === 1 ? "" : "s"}
              {dragEnabled ? " · Drop items here" : ""}
            </p>
          </div>
          <span className="rounded-md border px-2 py-1 text-xs font-medium text-muted-foreground">
            {format(parseISO(day.key), "EEE")}
          </span>
        </div>
        <ChevronDown className={`mt-1 size-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </summary>
      <div className="grid gap-4 border-t p-4">
        {day.items.length === 0 ? (
          <SectionState
            title="Nothing planned yet"
            description="Use the Timeline header to add an item, or drag an idea onto this day."
            className="px-4 py-4"
          />
        ) : groups.map((group) => (
          <TimelineItemGroup key={group.label} tripId={tripId} canEdit={canEdit} group={group} />
        ))}
      </div>
    </details>
  );
}

function TimelineItemGroup({ tripId, canEdit, group }: { tripId: string; canEdit: boolean; group: TimelineGroup }) {
  return (
    <section className="grid gap-2">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <Clock className="size-3.5" />
        <span>{group.label}</span>
      </div>
      <div className="grid gap-3">
        {group.items.map((item) => (
          <TimelineItemRow key={item.id} tripId={tripId} canEdit={canEdit} item={item} />
        ))}
      </div>
    </section>
  );
}

function TimelineItemRow({ tripId, canEdit, item }: { tripId: string; canEdit: boolean; item: TimelineItem }) {
  const dragEnabled = usePlannerDragEnabled();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `timeline:${item.type}:${item.sourceId}`,
    disabled: !dragEnabled,
    data: {
      source: "timeline",
      id: item.sourceId,
      label: item.title,
      kind: item.type,
      day: dayKey(item.when),
      datetime: item.when.toISOString(),
    },
  });
  const iconClass = item.type === "travel"
    ? "mt-1 flex size-8 items-center justify-center rounded-md bg-teal-500/12 text-teal-700 dark:text-teal-300"
    : item.type === "lodging"
      ? "mt-1 flex size-8 items-center justify-center rounded-md bg-amber-500/12 text-amber-700 dark:text-amber-300"
      : item.type === "activity"
        ? "mt-1 flex size-8 items-center justify-center rounded-md bg-blue-500/12 text-blue-700 dark:text-blue-300"
        : "mt-1 flex size-8 items-center justify-center rounded-md bg-pink-500/12 text-pink-700 dark:text-pink-300";

  return (
    <EntityRow
      ref={setNodeRef}
      className={`grid gap-3 bg-background p-3 ${isDragging ? "opacity-40" : ""}`}
    >
      <div className="flex items-start gap-2">
        {dragEnabled ? (
          <button
            type="button"
            className="-ml-2 shrink-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`Drag ${item.title}`}
            {...attributes}
            {...listeners}
          >
            <PlannerDragHandle label={item.title} />
          </button>
        ) : null}
        <span className={iconClass}>
          {item.type === "travel" ? <Plane className="size-4" /> : item.type === "lodging" ? <Hotel className="size-4" /> : item.type === "activity" ? <Activity className="size-4" /> : <UtensilsCrossed className="size-4" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-md bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground">{format(item.when, "h:mm a")}</span>
            <Badge variant="secondary">{item.kindLabel}</Badge>
            {item.type === "activity" && item.route ? <Badge variant="outline">route</Badge> : null}
            <ExternalLinkButton href={item.url} label={item.title} />
          </div>
          <p className="mt-2 break-words text-sm font-semibold leading-snug text-foreground">{item.title}</p>
          <EntityRowMeta className="mt-1 text-xs leading-relaxed">{compactItemMeta(item)}</EntityRowMeta>
        </div>
      </div>
      {item.notes ? <EntityRowNotes className="mt-0 line-clamp-3 text-xs leading-relaxed text-foreground">{item.notes}</EntityRowNotes> : null}
      {canEdit ? (
        <EntityRowActions className="border-t pt-2">
          {item.type === "travel" ? <SegmentDialog tripId={tripId} canEdit={canEdit} segment={item.raw as TimelineProps["segments"][number]} /> : null}
          {item.type === "lodging" ? <LodgingDialog tripId={tripId} canEdit={canEdit} stay={item.raw as TimelineProps["stays"][number]} /> : null}
          {item.type === "activity" ? <ActivityDialog tripId={tripId} canEdit={canEdit} activity={item.raw as TimelineProps["activities"][number]} /> : null}
          {item.type === "food" ? <FoodDialog tripId={tripId} canEdit={canEdit} food={item.raw as TimelineProps["food"][number]} /> : null}
          {item.type === "travel" ? <DeleteButton kind="segment" tripId={tripId} id={item.sourceId} /> : null}
          {item.type === "lodging" ? <DeleteButton kind="lodging" tripId={tripId} id={item.sourceId} /> : null}
          {item.type === "activity" ? <DeleteButton kind="activity" tripId={tripId} id={item.sourceId} /> : null}
          {item.type === "food" ? <DeleteButton kind="food" tripId={tripId} id={item.sourceId} /> : null}
        </EntityRowActions>
      ) : null}
    </EntityRow>
  );
}

function groupTimelineItems(items: TimelineItem[]) {
  const groupMap = new Map<TimelineGroup["label"], TimelineItem[]>([
    ["Morning", []],
    ["Afternoon", []],
    ["Evening", []],
  ]);

  for (const item of items) {
    groupMap.get(timeGroupLabel(item.when))?.push(item);
  }

  return [...groupMap.entries()]
    .filter(([, groupItems]) => groupItems.length > 0)
    .map(([label, groupItems]) => ({ label, items: groupItems }));
}

function timeGroupLabel(value: Date): TimelineGroup["label"] {
  const hour = value.getHours();
  if (hour < 12) return "Morning";
  if (hour < 17) return "Afternoon";
  return "Evening";
}

function compactItemMeta(item: TimelineItem) {
  if (item.type === "travel") {
    const segment = item.raw as TimelineProps["segments"][number];
    return `${segment.startLocationName} → ${segment.endLocationName}${segment.endDatetime ? ` · Ends ${format(dateValue(segment.endDatetime), "h:mm a")}` : ""}`;
  }

  if (item.type === "lodging") {
    const stay = item.raw as TimelineProps["stays"][number];
    return `${stay.name}${stay.checkOut ? ` · Check-out ${format(dateValue(stay.checkOut), "MMM d, h:mm a")}` : ""}`;
  }

  const locatedItem = item.raw as TimelineProps["activities"][number] | TimelineProps["food"][number];
  return locatedItem.name;
}
