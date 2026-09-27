"use client";

import { useDraggable, useDroppable } from "@dnd-kit/core";
import { eachDayOfInterval, format, parseISO } from "date-fns";
import { Activity, Hotel, Lightbulb, Plane, UtensilsCrossed } from "lucide-react";
import { useMemo, useState } from "react";
import { AddItineraryItemDialog } from "@/components/trips/add-itinerary-item-dialog";
import { DeleteButton } from "@/components/trips/delete-button";
import { ExternalLinkButton } from "@/components/trips/external-link-button";
import { ItemVoteControl } from "@/components/trips/item-vote-control";
import { ActivityDialog, FoodDialog, LodgingDialog, SegmentDialog } from "@/components/trips/item-dialogs";
import { PlannerDragHandle, plannerDayDropId, plannerDayPanelDropId, plannerIdeaBucketDropId, usePlannerDragEnabled } from "@/components/trips/trip-planner-dnd";
import { Badge } from "@/components/ui/badge";
import { SectionState } from "@/components/ui/section-state";
import { dateValue, dayKey } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { ItemVoteSummary } from "@/lib/votes";

export type TimelineProps = {
  tripId: string;
  canEdit: boolean;
  tripStartDate: string;
  tripEndDate: string;
  activeDayKey?: string;
  onActiveDayChange?: (day: string) => void;
  selectedItemId?: string | null;
  onSelectItem?: (item: { id: string; sourceId: string; type: TimelineItem["type"]; day: string }) => void;
  className?: string;
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
    votes: ItemVoteSummary;
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
    votes: ItemVoteSummary;
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
    votes: ItemVoteSummary;
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
    category: string;
    notes: string | null;
    votes: ItemVoteSummary;
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
  notes: string | null;
  votes: ItemVoteSummary;
  route?: boolean;
  raw: TimelineProps["segments"][number] | TimelineProps["stays"][number] | TimelineProps["activities"][number] | TimelineProps["food"][number];
};

type TimelineDayData = { key: string; items: TimelineItem[] };

function DayPickerButton({ day, dayNumber, selected, canEdit, onSelect }: { day: string; dayNumber: number; selected: boolean; canEdit: boolean; onSelect: () => void }) {
  const dragEnabled = usePlannerDragEnabled();
  const { setNodeRef, isOver } = useDroppable({ id: plannerDayDropId(day), disabled: !canEdit || !dragEnabled });

  return (
    <button
      ref={setNodeRef}
      type="button"
      className={cn(
        "flex h-15 w-13 shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl border border-transparent bg-muted/75 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground transition-colors",
        selected && "border-primary bg-primary text-primary-foreground shadow-sm",
        isOver && "border-primary bg-primary/10 text-primary ring-2 ring-primary/20",
      )}
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`Day ${dayNumber}, ${format(parseISO(day), "EEEE, MMMM d")}`}
    >
      <span>{format(parseISO(day), "EEE")}</span>
      <span className={cn("text-base font-semibold", selected ? "text-white" : "text-foreground")}>{format(parseISO(day), "d")}</span>
    </button>
  );
}

function IdeaBucketDropTarget() {
  const dragEnabled = usePlannerDragEnabled();
  const { setNodeRef, isOver } = useDroppable({ id: plannerIdeaBucketDropId, disabled: !dragEnabled });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "mt-3 flex min-h-9 items-center justify-center gap-2 rounded-lg border border-dashed px-3 text-[11px] font-semibold text-muted-foreground transition-colors",
        isOver && "border-primary bg-primary/10 text-primary ring-2 ring-primary/15",
      )}
    >
      <Lightbulb className="size-3.5" />
      Drag a stop here to move it to Ideas
    </div>
  );
}

export function Timeline({
  tripId,
  canEdit,
  tripStartDate,
  tripEndDate,
  activeDayKey,
  onActiveDayChange,
  selectedItemId,
  onSelectItem,
  className,
  segments,
  stays,
  activities,
  food,
}: TimelineProps) {
  const [internalDayKey, setInternalDayKey] = useState(tripStartDate);
  const selectedDayKey = activeDayKey ?? internalDayKey;
  const setSelectedDayKey = onActiveDayChange ?? setInternalDayKey;

  const items = useMemo(() => [
    ...segments.map((item) => ({
      id: `segment-${item.id}`,
      sourceId: item.id,
      when: dateValue(item.startDatetime),
      type: "travel" as const,
      kindLabel: item.type === "flight" ? "Flight" : item.type === "drive" ? "Drive" : "Travel",
      title: item.title || `${item.startLocationName} to ${item.endLocationName}`,
      url: item.url,
      notes: item.notes,
      votes: item.votes,
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
      notes: item.notes,
      votes: item.votes,
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
      notes: item.notes,
      votes: item.votes,
      route: item.includeInRoute,
      raw: item,
    })),
    ...food.map((item) => ({
      id: `food-${item.id}`,
      sourceId: item.id,
      when: dateValue(item.datetime),
      type: "food" as const,
      kindLabel: item.category === "coffee" ? "Coffee" : "Meal",
      title: item.title || item.name,
      url: item.url,
      notes: item.notes,
      votes: item.votes,
      raw: item,
    })),
  ].sort((a, b) => a.when.getTime() - b.when.getTime()), [activities, food, segments, stays]);

  const days = useMemo(() => {
    const itemsByDay = new Map<string, TimelineItem[]>();
    for (const item of items) {
      const key = dayKey(item.when);
      itemsByDay.set(key, [...(itemsByDay.get(key) ?? []), item]);
    }
    const tripDays = eachDayOfInterval({ start: parseISO(tripStartDate), end: parseISO(tripEndDate) });
    const keys = new Set([...tripDays.map(dayKey), ...itemsByDay.keys()]);
    return [...keys].sort().map((key) => ({ key, items: itemsByDay.get(key) ?? [] }));
  }, [items, tripEndDate, tripStartDate]);

  const visibleDay = days.find((day) => day.key === selectedDayKey) ?? days[0];

  return (
    <section className={cn("flex min-h-0 min-w-0 flex-col bg-card", className)} aria-label="Trip itinerary">
      <div className="shrink-0 border-b px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="font-serif text-xl font-medium tracking-tight">Your itinerary</p>
            <p className="mt-1 text-xs text-muted-foreground">Choose a day, then review its stops in time order.</p>
          </div>
          {canEdit ? <AddItineraryItemDialog tripId={tripId} canEdit={canEdit} defaultDay={selectedDayKey} /> : null}
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1" aria-label="Trip days">
          {days.map((day, index) => (
            <DayPickerButton
              key={day.key}
              day={day.key}
              dayNumber={index + 1}
              selected={day.key === selectedDayKey}
              canEdit={canEdit}
              onSelect={() => setSelectedDayKey(day.key)}
            />
          ))}
        </div>
        {canEdit ? <IdeaBucketDropTarget /> : null}
      </div>

      <div className="min-h-0 flex-1 overflow-visible p-4 sm:p-5 md:overflow-auto">
        {visibleDay ? (
          <TimelineDay
            day={visibleDay}
            dayNumber={days.findIndex((candidate) => candidate.key === visibleDay.key) + 1}
            tripId={tripId}
            canEdit={canEdit}
            active
            selectedItemId={selectedItemId}
            onActivate={() => setSelectedDayKey(visibleDay.key)}
            onSelectItem={onSelectItem}
          />
        ) : null}
      </div>
    </section>
  );
}

function TimelineDay({
  day,
  dayNumber,
  tripId,
  canEdit,
  active,
  selectedItemId,
  onActivate,
  onSelectItem,
}: {
  day: TimelineDayData;
  dayNumber: number;
  tripId: string;
  canEdit: boolean;
  active: boolean;
  selectedItemId?: string | null;
  onActivate: () => void;
  onSelectItem?: TimelineProps["onSelectItem"];
}) {
  const dragEnabled = usePlannerDragEnabled();
  const { setNodeRef, isOver } = useDroppable({ id: plannerDayPanelDropId(day.key), disabled: !dragEnabled });

  return (
    <section
      ref={setNodeRef}
      className={cn(
        "min-h-full shrink-0 rounded-xl border bg-card p-3 transition-colors",
        "w-full",
        active && "border-primary/35",
        isOver && "border-primary bg-primary/5 ring-2 ring-primary/20",
      )}
      onClick={onActivate}
    >
      <div className="mb-4 flex items-start justify-between gap-3 border-b pb-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-accent">Day {dayNumber}</p>
          <h3 className="mt-1 text-sm font-semibold">{format(parseISO(day.key), "EEEE, MMMM d")}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{day.items.length} planned {day.items.length === 1 ? "stop" : "stops"}</p>
        </div>
        {active ? <span className="mt-1 size-2 rounded-full bg-primary" aria-label="Selected day" /> : null}
      </div>

      {day.items.length === 0 ? (
        <SectionState
          title="A blank canvas"
          description={dragEnabled ? "Drop an idea here, or use the add controls above." : "No stops have been planned for this day yet."}
          className="px-3 py-10"
        />
      ) : (
        <div className="grid gap-1">
          {day.items.map((item, index) => (
            <TimelineItemRow
              key={item.id}
              item={item}
              tripId={tripId}
              canEdit={canEdit}
              selected={selectedItemId === item.id}
              last={index === day.items.length - 1}
              onSelect={() => onSelectItem?.({ id: item.id, sourceId: item.sourceId, type: item.type, day: day.key })}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function TimelineItemRow({ item, tripId, canEdit, selected, last, onSelect }: { item: TimelineItem; tripId: string; canEdit: boolean; selected: boolean; last: boolean; onSelect: () => void }) {
  const dragEnabled = usePlannerDragEnabled();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `timeline:${item.type}:${item.sourceId}`,
    disabled: !dragEnabled,
    data: { source: "timeline", id: item.sourceId, label: item.title, kind: item.type, day: dayKey(item.when), datetime: item.when.toISOString() },
  });
  const Icon = item.type === "travel" ? Plane : item.type === "lodging" ? Hotel : item.type === "activity" ? Activity : UtensilsCrossed;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "group relative flex gap-2 rounded-xl px-1 py-2 text-left transition-colors hover:bg-muted/55",
        selected && "bg-primary/[0.07]",
        isDragging && "opacity-40",
      )}
    >
      <div className="relative flex shrink-0 flex-col items-center">
        <span className={cn(
          "z-10 flex size-9 items-center justify-center rounded-xl",
          item.type === "travel" && "bg-sky-100 text-sky-700",
          item.type === "lodging" && "bg-orange-100 text-orange-700",
          item.type === "activity" && "bg-emerald-100 text-emerald-700",
          item.type === "food" && "bg-rose-100 text-rose-700",
        )}>
          <Icon className="size-4" />
        </span>
        {!last ? <span className="absolute bottom-[-17px] top-8 w-px bg-border" /> : null}
      </div>

      <div className="min-w-0 flex-1 pb-2">
        <div className="flex min-h-7 items-center justify-between gap-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">{format(item.when, "h:mm a")} · {item.kindLabel}</span>
          <ExternalLinkButton href={item.url} label={item.title} />
        </div>
        <button
          type="button"
          className="break-words text-left text-sm font-semibold leading-snug text-foreground hover:text-primary focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={(event) => {
            event.stopPropagation();
            onSelect();
          }}
        >
          {item.title}
        </button>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{compactItemMeta(item)}</p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {item.type === "activity" && item.route ? <Badge variant="outline" className="text-[10px]">On route</Badge> : null}
          {item.notes ? <span className="line-clamp-1 text-[11px] text-muted-foreground">{item.notes}</span> : null}
        </div>

        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t pt-2" onClick={(event) => event.stopPropagation()}>
          <ItemVoteControl key={`${item.votes.up}:${item.votes.down}:${item.votes.current}`} tripId={tripId} itemType={item.type} itemId={item.sourceId} label={item.title} votes={item.votes} />
          {canEdit ? (
            <div className="flex flex-wrap items-center justify-end gap-1">
              {dragEnabled ? (
                <button type="button" className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`Drag ${item.title}`} {...attributes} {...listeners}>
                  <PlannerDragHandle label={item.title} />
                </button>
              ) : null}
              {item.type === "travel" ? <SegmentDialog tripId={tripId} canEdit={canEdit} segment={item.raw as TimelineProps["segments"][number]} /> : null}
              {item.type === "lodging" ? <LodgingDialog tripId={tripId} canEdit={canEdit} stay={item.raw as TimelineProps["stays"][number]} /> : null}
              {item.type === "activity" ? <ActivityDialog tripId={tripId} canEdit={canEdit} activity={item.raw as TimelineProps["activities"][number]} /> : null}
              {item.type === "food" ? <FoodDialog tripId={tripId} canEdit={canEdit} food={item.raw as TimelineProps["food"][number]} /> : null}
              <DeleteButton kind={item.type === "travel" ? "segment" : item.type} tripId={tripId} id={item.sourceId} />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function compactItemMeta(item: TimelineItem) {
  if (item.type === "travel") {
    const segment = item.raw as TimelineProps["segments"][number];
    return `${segment.startLocationName} → ${segment.endLocationName}${segment.endDatetime ? ` · arrives ${format(dateValue(segment.endDatetime), "h:mm a")}` : ""}`;
  }
  if (item.type === "lodging") {
    const stay = item.raw as TimelineProps["stays"][number];
    return stay.address || stay.name;
  }
  if (item.type === "activity") {
    const activity = item.raw as TimelineProps["activities"][number];
    return activity.address || activity.name;
  }
  const food = item.raw as TimelineProps["food"][number];
  return food.address || food.name;
}
