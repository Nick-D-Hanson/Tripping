"use client";

import { Activity, ChevronDown, Hotel, Plane, UtensilsCrossed } from "lucide-react";
import { useMemo, useState, useSyncExternalStore } from "react";
import { DeleteButton } from "@/components/trips/delete-button";
import { ExternalLinkButton } from "@/components/trips/external-link-button";
import { ActivityDialog, FoodDialog, LodgingDialog, SegmentDialog } from "@/components/trips/item-dialogs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { dateValue, dayKey, dayLabel, fmtDateTime } from "@/lib/dates";

const emptySubscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

type TimelineProps = {
  tripId: string;
  canEdit: boolean;
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

export function Timeline({ tripId, canEdit, segments, stays, activities, food }: TimelineProps) {
  const hydrated = useSyncExternalStore(emptySubscribe, clientSnapshot, serverSnapshot);
  const [openDayKeys, setOpenDayKeys] = useState<Set<string>>(() => new Set());

  const items = useMemo(
    () => [
      ...segments.map((item) => ({
        id: `segment-${item.id}`,
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
    () =>
      items.reduce<Array<{ key: string; items: typeof items }>>((acc, item) => {
        const key = dayKey(item.when);
        const currentDay = acc[acc.length - 1];

        if (!currentDay || currentDay.key !== key) {
          acc.push({ key, items: [item] });
          return acc;
        }

        currentDay.items.push(item);
        return acc;
      }, []),
    [items],
  );

  if (!hydrated) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">Loading timeline...</CardContent>
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">Add travel, lodging, or activities to build the trip timeline.</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <CardTitle>Timeline</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setOpenDayKeys(new Set(days.map((day) => day.key)))}>
              Expand all
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setOpenDayKeys(new Set())}>
              Collapse all
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-6">
        {days.map((day) => {
          const isOpen = openDayKeys.has(day.key);

          return (
            <details key={day.key} open={isOpen} className="group rounded-md border">
            <summary
              className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3"
              onClick={(event) => {
                event.preventDefault();
                setOpenDayKeys((current) => {
                  const next = new Set(current);
                  if (isOpen) {
                    next.delete(day.key);
                  } else {
                    next.add(day.key);
                  }
                  return next;
                });
              }}
            >
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground">{dayLabel(day.key)}</h3>
                <p className="text-xs text-muted-foreground">{day.items.length} item{day.items.length === 1 ? "" : "s"}</p>
              </div>
              <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
            </summary>
            <div className="grid gap-3 border-t p-4">
              {day.items.map((item) => (
                <div key={item.id} className="grid grid-cols-[2rem_1fr] gap-3 rounded-md border p-3 sm:p-4">
                  <span
                    className={
                      item.type === "travel"
                        ? "mt-1 flex size-8 items-center justify-center rounded-md bg-teal-500/12 text-teal-700 dark:text-teal-300"
                        : item.type === "lodging"
                          ? "mt-1 flex size-8 items-center justify-center rounded-md bg-amber-500/12 text-amber-700 dark:text-amber-300"
                          : item.type === "activity"
                            ? "mt-1 flex size-8 items-center justify-center rounded-md bg-blue-500/12 text-blue-700 dark:text-blue-300"
                            : "mt-1 flex size-8 items-center justify-center rounded-md bg-pink-500/12 text-pink-700 dark:text-pink-300"
                    }
                  >
                    {item.type === "travel" ? <Plane className="size-4" /> : item.type === "lodging" ? <Hotel className="size-4" /> : item.type === "activity" ? <Activity className="size-4" /> : <UtensilsCrossed className="size-4" />}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{item.title}</p>
                          <Badge variant="secondary">{item.kindLabel}</Badge>
                          <ExternalLinkButton href={item.url} label={item.title} />
                          {item.type === "activity" && item.route ? <Badge variant="outline">route</Badge> : null}
                        </div>
                        <p className="text-sm text-muted-foreground">{item.meta}</p>
                      </div>
                      {canEdit ? (
                        <div className="flex shrink-0 flex-wrap items-center gap-1">
                          {item.type === "travel" ? <SegmentDialog tripId={tripId} canEdit={canEdit} segment={item.raw} /> : null}
                          {item.type === "lodging" ? <LodgingDialog tripId={tripId} canEdit={canEdit} stay={item.raw} /> : null}
                          {item.type === "activity" ? <ActivityDialog tripId={tripId} canEdit={canEdit} activity={item.raw} /> : null}
                          {item.type === "food" ? <FoodDialog tripId={tripId} canEdit={canEdit} food={item.raw} /> : null}
                          {item.type === "travel" ? <DeleteButton kind="segment" tripId={tripId} id={item.raw.id} /> : null}
                          {item.type === "lodging" ? <DeleteButton kind="lodging" tripId={tripId} id={item.raw.id} /> : null}
                          {item.type === "activity" ? <DeleteButton kind="activity" tripId={tripId} id={item.raw.id} /> : null}
                          {item.type === "food" ? <DeleteButton kind="food" tripId={tripId} id={item.raw.id} /> : null}
                        </div>
                      ) : null}
                    </div>
                    {item.notes ? <p className="mt-2 text-sm">{item.notes}</p> : null}
                  </div>
                </div>
              ))}
            </div>
          </details>
          );
        })}
      </CardContent>
    </Card>
  );
}
