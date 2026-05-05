"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { TripSummaryCard } from "@/components/trips/trip-summary-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/section-header";

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
            <div className="border-b pb-2">
              <SectionHeader
                title={
                  <>
                    <h2 className="text-xl font-semibold tracking-normal">{group.year}</h2>
                    <Badge variant="secondary">{group.trips.length} trip{group.trips.length === 1 ? "" : "s"}</Badge>
                  </>
                }
                actions={
                  <Button
                    type="button"
                    variant="secondary"
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
                }
                className="gap-3 sm:items-center"
              />
            </div>

            {expanded ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {group.trips.map((trip) => (
                  <TripSummaryCard key={trip.id} trip={trip} />
                ))}
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
