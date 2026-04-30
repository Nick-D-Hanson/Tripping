import { Activity, ChevronDown, Hotel, Plane } from "lucide-react";
import { ExternalLinkButton } from "@/components/trips/external-link-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { dayKey, dayLabel, fmtDateTime } from "@/lib/dates";

type TimelineProps = {
  segments: Array<{
    id: string;
    title: string | null;
    url: string | null;
    type: string;
    startLocationName: string;
    endLocationName: string;
    startDatetime: Date;
    endDatetime: Date | null;
    notes: string | null;
  }>;
  stays: Array<{
    id: string;
    title: string | null;
    name: string;
    url: string | null;
    checkIn: Date;
    checkOut: Date | null;
    notes: string | null;
  }>;
  activities: Array<{
    id: string;
    title: string | null;
    name: string;
    url: string | null;
    datetime: Date;
    category: string | null;
    includeInRoute: boolean;
    notes: string | null;
  }>;
};

export function Timeline({ segments, stays, activities }: TimelineProps) {
  const items = [
    ...segments.map((item) => ({
      id: `segment-${item.id}`,
      when: item.startDatetime,
      type: "travel" as const,
      title: item.title || `${item.startLocationName} to ${item.endLocationName}`,
      url: item.url,
      meta: `${item.type} · ${fmtDateTime(item.startDatetime)}${item.endDatetime ? ` to ${fmtDateTime(item.endDatetime)}` : ""}`,
      notes: item.notes,
    })),
    ...stays.map((item) => ({
      id: `lodging-${item.id}`,
      when: item.checkIn,
      type: "lodging" as const,
      title: item.title || item.name,
      url: item.url,
      meta: `Check-in ${fmtDateTime(item.checkIn)}${item.checkOut ? ` · Check-out ${fmtDateTime(item.checkOut)}` : ""}`,
      notes: item.notes,
    })),
    ...activities.map((item) => ({
      id: `activity-${item.id}`,
      when: item.datetime,
      type: "activity" as const,
      title: item.title || item.name,
      url: item.url,
      meta: `${item.category ?? "Activity"} · ${fmtDateTime(item.datetime)}`,
      notes: item.notes,
      route: item.includeInRoute,
    })),
  ].sort((a, b) => a.when.getTime() - b.when.getTime());

  const days = items.reduce<Array<{ key: string; items: typeof items }>>((acc, item) => {
    const key = dayKey(item.when);
    const currentDay = acc[acc.length - 1];

    if (!currentDay || currentDay.key !== key) {
      acc.push({ key, items: [item] });
      return acc;
    }

    currentDay.items.push(item);
    return acc;
  }, []);

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
        <CardTitle>Timeline</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6">
        {days.map((day) => (
          <details key={day.key} open className="group rounded-md border">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground">{dayLabel(day.key)}</h3>
                <p className="text-xs text-muted-foreground">{day.items.length} item{day.items.length === 1 ? "" : "s"}</p>
              </div>
              <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
            </summary>
            <div className="grid gap-3 border-t p-4">
              {day.items.map((item) => (
                <div key={item.id} className="grid grid-cols-[2rem_1fr] gap-3 rounded-md border p-3">
                  <span className="mt-1 flex size-8 items-center justify-center rounded-md bg-secondary">
                    {item.type === "travel" ? <Plane className="size-4" /> : item.type === "lodging" ? <Hotel className="size-4" /> : <Activity className="size-4" />}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{item.title}</p>
                      <ExternalLinkButton href={item.url} label={item.title} />
                      {item.type === "activity" && item.route ? <Badge variant="outline">route</Badge> : null}
                    </div>
                    <p className="text-sm text-muted-foreground">{item.meta}</p>
                    {item.notes ? <p className="mt-2 text-sm">{item.notes}</p> : null}
                  </div>
                </div>
              ))}
            </div>
          </details>
        ))}
      </CardContent>
    </Card>
  );
}
