"use client";

import { CalendarDays, ChevronDown, UsersRound } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { TripDeleteDialog } from "@/components/trips/trip-delete-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { fmtDate } from "@/lib/dates";

type TripSummary = {
  id: string;
  name: string;
  description: string | null;
  startDate: string | Date;
  endDate: string | Date;
  role: "owner" | "editor" | "viewer";
};

type TripYearGroup = {
  year: string;
  trips: TripSummary[];
};

type TripYearGroupsProps = {
  groups: TripYearGroup[];
  defaultExpandedYear: string;
};

export function TripYearGroups({ groups, defaultExpandedYear }: TripYearGroupsProps) {
  const [expandedYears, setExpandedYears] = useState<Set<string>>(() => {
    if (!groups.some((group) => group.year === defaultExpandedYear)) {
      return new Set();
    }

    return new Set([defaultExpandedYear]);
  });

  return (
    <div className="grid gap-8">
      {groups.map((group) => {
        const expanded = expandedYears.has(group.year);

        return (
          <section key={group.year} className="grid gap-4">
            <div className="flex flex-col gap-3 border-b pb-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold tracking-normal">{group.year}</h2>
                <Badge variant="secondary">{group.trips.length} trip{group.trips.length === 1 ? "" : "s"}</Badge>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full sm:w-auto"
                aria-expanded={expanded}
                onClick={() => {
                  setExpandedYears((current) => {
                    const next = new Set(current);
                    if (expanded) {
                      next.delete(group.year);
                    } else {
                      next.add(group.year);
                    }
                    return next;
                  });
                }}
              >
                <ChevronDown className={`size-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
                {expanded ? "Collapse" : "Expand"}
              </Button>
            </div>

            {expanded ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {group.trips.map((trip) => (
                  <Card key={trip.id} className="flex h-full flex-col transition hover:border-primary/60 hover:shadow-md">
                    <Link href={`/trips/${trip.id}`} className="block">
                      <CardHeader>
                        <div className="flex items-start justify-between gap-3">
                          <CardTitle className="leading-6">{trip.name}</CardTitle>
                          <Badge variant={trip.role === "owner" ? "default" : "secondary"}>{trip.role}</Badge>
                        </div>
                        <CardDescription className="line-clamp-2">{trip.description || "No description yet."}</CardDescription>
                      </CardHeader>
                      <CardContent className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="size-4" />
                          {fmtDate(trip.startDate)} - {fmtDate(trip.endDate)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <UsersRound className="size-4" />
                          Shared plan
                        </span>
                      </CardContent>
                    </Link>
                    {trip.role === "owner" ? (
                      <CardContent className="mt-auto flex justify-end pt-0">
                        <TripDeleteDialog tripId={trip.id} tripName={trip.name} />
                      </CardContent>
                    ) : null}
                  </Card>
                ))}
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
