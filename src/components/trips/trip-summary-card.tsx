"use client";

import { CalendarDays, UsersRound } from "lucide-react";
import Link from "next/link";
import { TripDeleteDialog } from "@/components/trips/trip-delete-dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import { fmtDate } from "@/lib/dates";

type TripSummaryCardProps = {
  trip: {
    id: string;
    name: string;
    description: string | null;
    startDate: string | Date;
    endDate: string | Date;
    role: "owner" | "editor" | "viewer";
  };
};

export function TripSummaryCard({ trip }: TripSummaryCardProps) {
  return (
    <Card className="flex h-full flex-col transition hover:border-primary/60 hover:shadow-md">
      <Link href={`/trips/${trip.id}`} className="block">
        <CardHeader>
          <SectionHeader
            title={
              <>
                <CardTitle className="leading-6">{trip.name}</CardTitle>
                <Badge variant={trip.role === "owner" ? "default" : "secondary"}>{trip.role}</Badge>
              </>
            }
            description={<CardDescription className="line-clamp-2">{trip.description || "No description yet."}</CardDescription>}
            className="gap-3"
            descriptionClassName="mt-0"
          />
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
  );
}
