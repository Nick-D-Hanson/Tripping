"use client";

import { ArrowRight, CalendarDays, MapPinned, UsersRound } from "lucide-react";
import Link from "next/link";
import { TripDeleteDialog } from "@/components/trips/trip-delete-dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
    <Card className="group flex h-full flex-col overflow-hidden rounded-2xl transition duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-xl hover:shadow-primary/10">
      <Link href={`/trips/${trip.id}`} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
        <div className="trip-card-art relative h-40 overflow-hidden sm:h-48">
          <Badge className="absolute left-4 top-4 border-0 bg-white/85 text-primary shadow-sm backdrop-blur" variant="secondary">
            {trip.role}
          </Badge>
          <MapPinned className="absolute bottom-5 right-6 size-11 text-white/75 drop-shadow-sm" strokeWidth={1.4} />
        </div>
        <CardContent className="p-5 sm:p-6">
          <h2 className="font-serif text-2xl font-medium tracking-tight sm:text-[1.7rem]">{trip.name}</h2>
          <p className="mt-1.5 line-clamp-2 min-h-10 text-sm leading-5 text-muted-foreground">{trip.description || "A shared plan ready for its next detail."}</p>
          <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-3.5" />
              {fmtDate(trip.startDate)} – {fmtDate(trip.endDate)}
            </span>
            <span className="inline-flex items-center gap-1.5"><UsersRound className="size-3.5" /> Shared plan</span>
          </div>
          <div className="mt-5 flex items-center justify-between border-t pt-4">
            <span className="text-xs font-semibold text-primary">Open planner</span>
            <ArrowRight className="size-4 text-primary transition-transform group-hover:translate-x-0.5" />
          </div>
        </CardContent>
      </Link>
      {trip.role === "owner" ? (
        <CardContent className="mt-auto flex justify-end border-t bg-muted/35 px-5 py-2.5 sm:px-6">
          <TripDeleteDialog tripId={trip.id} tripName={trip.name} />
        </CardContent>
      ) : null}
    </Card>
  );
}
