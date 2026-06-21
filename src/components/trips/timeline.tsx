"use client";

import { useDraggable, useDroppable } from "@dnd-kit/core";
import { eachDayOfInterval, parseISO } from "date-fns";
import { Activity, ChevronDown, Hotel, Plane, UtensilsCrossed } from "lucide-react";
import { useMemo, useState, useSyncExternalStore } from "react";
import { DeleteButton } from "@/components/trips/delete-button";
import { ExternalLinkButton } from "@/components/trips/external-link-button";
import { ActivityDialog, FoodDialog, LodgingDialog, SegmentDialog } from "@/components/trips/item-dialogs";
import { PlannerDragHandle, plannerDayDropId, usePlannerDragEnabled } from "@/components/trips/trip-planner-dnd";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EntityRow, EntityRowActions, EntityRowBody, EntityRowHeader, EntityRowMeta, EntityRowNotes, EntityRowTitle } from "@/components/ui/entity-row";
import { SectionState } from "@/components/ui/section-state";
import { dateValue, dayKey, dayLabel, fmtDateTime } from "@/lib/dates";

const emptySubscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

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

export function Timeline({ tripId, canEdit, tripStartDate, tripEndDate, segments, stays, activities, food }: TimelineProps) {
  const hydrated = useSyncExternalStore(emptySubscribe, clientSnapshot, serverSnapshot);
  const [openDayKeys, setOpenDayKeys] = useState<Set<string>>(() => new Set());

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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <CardTitle>Timeline</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setOpenDayKeys(new Set(days.map((day) => day.key)))}>
              Expand all
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => setOpenDayKeys(new Set())}>
              Collapse all
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-6">
        {days.map((day) => (
          <TimelineDay
            key={day.key}
            tripId={tripId}
            canEdit={canEdit}
            day={day}
            isOpen={openDayKeys.has(day.key)}
            onToggle={() => setOpenDayKeys((current) => {
              const next = new Set(current);
              if (next.has(day.key)) next.delete(day.key);
              else next.add(day.key);
              return next;
            })}
          />
        ))}
      </CardContent>
    </Card>
  );
}

function TimelineDay({
  tripId,
  canEdit,
  day,
  isOpen,
  onToggle,
}: {
  tripId: string;
  canEdit: boolean;
  day: { key: string; items: TimelineItem[] };
  isOpen: boolean;
  onToggle: () => void;
}) {
  const dragEnabled = usePlannerDragEnabled();
  const { setNodeRef, isOver } = useDroppable({ id: plannerDayDropId(day.key), disabled: !dragEnabled });

  return (
    <details
      ref={setNodeRef}
      open={isOpen}
      className={`group rounded-md border transition-colors ${isOver ? "border-primary bg-primary/5 ring-2 ring-primary/30" : ""}`}
    >
      <summary
        className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3"
        onClick={(event) => {
          event.preventDefault();
          onToggle();
        }}
      >
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground">{dayLabel(day.key)}</h3>
          <p className="text-xs text-muted-foreground">
            {day.items.length} item{day.items.length === 1 ? "" : "s"}
            {dragEnabled ? " · Drop items here" : ""}
          </p>
        </div>
        <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <div className="grid gap-3 border-t p-4">
        {day.items.length === 0 ? (
          <SectionState
            title="Nothing planned yet"
            description="Drag an idea or another timeline item onto this day."
            className="px-4 py-4"
          />
        ) : day.items.map((item) => (
          <TimelineItemRow key={item.id} tripId={tripId} canEdit={canEdit} item={item} />
        ))}
      </div>
    </details>
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
      className={`grid grid-cols-[2.75rem_2rem_1fr] gap-2 sm:gap-3 ${isDragging ? "opacity-40" : ""}`}
    >
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
      ) : <span />}
      <span className={iconClass}>
        {item.type === "travel" ? <Plane className="size-4" /> : item.type === "lodging" ? <Hotel className="size-4" /> : item.type === "activity" ? <Activity className="size-4" /> : <UtensilsCrossed className="size-4" />}
      </span>
      <EntityRowBody>
        <EntityRowHeader>
          <div className="min-w-0">
            <EntityRowTitle>
              <p className="font-medium">{item.title}</p>
              <Badge variant="secondary">{item.kindLabel}</Badge>
              <ExternalLinkButton href={item.url} label={item.title} />
              {item.type === "activity" && item.route ? <Badge variant="outline">route</Badge> : null}
            </EntityRowTitle>
            <EntityRowMeta>{item.meta}</EntityRowMeta>
          </div>
          {canEdit ? (
            <EntityRowActions className="gap-1">
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
        </EntityRowHeader>
        {item.notes ? <EntityRowNotes className="text-foreground">{item.notes}</EntityRowNotes> : null}
      </EntityRowBody>
    </EntityRow>
  );
}
