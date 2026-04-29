import { Activity, Hotel, Plane } from "lucide-react";
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

  const days = items.reduce<Record<string, typeof items>>((acc, item) => {
    const key = dayKey(item.when);
    acc[key] ??= [];
    acc[key].push(item);
    return acc;
  }, {});

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
        {Object.entries(days).map(([key, dayItems]) => (
          <section key={key} className="grid gap-3">
            <h3 className="text-sm font-semibold text-muted-foreground">{dayLabel(key)}</h3>
            <div className="grid gap-3">
              {dayItems.map((item) => (
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
          </section>
        ))}
      </CardContent>
    </Card>
  );
}
