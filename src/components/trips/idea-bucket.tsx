"use client";

import { useDraggable, useDroppable } from "@dnd-kit/core";
import { Activity, Home, MapPin, Sparkles, UtensilsCrossed } from "lucide-react";
import { DeleteButton } from "@/components/trips/delete-button";
import { ExternalLinkButton } from "@/components/trips/external-link-button";
import { ItemVoteControl } from "@/components/trips/item-vote-control";
import { ActivityDialog, FoodDialog, IdeaBucketItemDialog, LodgingDialog } from "@/components/trips/item-dialogs";
import { PlannerDragHandle, plannerIdeaBucketDropId, usePlannerDragEnabled } from "@/components/trips/trip-planner-dnd";
import { Badge } from "@/components/ui/badge";
import { SectionState } from "@/components/ui/section-state";
import { cn } from "@/lib/utils";
import type { ItemVoteSummary } from "@/lib/votes";

export type IdeaBucketItem = {
  id: string;
  kind: "housing" | "activity" | "food";
  description: string;
  locationName: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  url: string | null;
  notes: string | null;
  createdAt: Date;
  creatorInitials: string;
  votes: ItemVoteSummary;
};

type IdeaBucketProps = {
  tripId: string;
  canEdit: boolean;
  items: IdeaBucketItem[];
  className?: string;
  scheduleControls?: React.ReactNode;
};

const groups = [
  { kind: "activity" as const, label: "Activities", icon: Activity },
  { kind: "food" as const, label: "Food", icon: UtensilsCrossed },
  { kind: "housing" as const, label: "Housing", icon: Home },
];

function AddToDayButton({ tripId, canEdit, item }: { tripId: string; canEdit: boolean; item: IdeaBucketItem }) {
  const idea = {
    id: item.id,
    description: item.description,
    locationName: item.locationName,
    address: item.address,
    lat: item.lat,
    lng: item.lng,
    url: item.url,
    notes: item.notes,
  };

  if (item.kind === "housing") return <LodgingDialog tripId={tripId} canEdit={canEdit} idea={idea} />;
  if (item.kind === "activity") return <ActivityDialog tripId={tripId} canEdit={canEdit} idea={idea} />;
  return <FoodDialog tripId={tripId} canEdit={canEdit} idea={idea} />;
}

function DraggableIdeaCard({ tripId, canEdit, item }: { tripId: string; canEdit: boolean; item: IdeaBucketItem }) {
  const dragEnabled = usePlannerDragEnabled();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `idea:${item.id}`,
    disabled: !dragEnabled,
    data: { source: "idea", id: item.id, label: item.description, kind: item.kind },
  });

  return (
    <article ref={setNodeRef} className={cn("rounded-xl border bg-card p-3.5 transition-colors hover:border-primary/35 hover:bg-primary/[0.025]", isDragging && "opacity-40")}>
      <div className="flex items-start gap-1">
        {dragEnabled ? (
          <button type="button" className="-ml-2 shrink-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`Drag ${item.description}`} {...attributes} {...listeners}>
            <PlannerDragHandle label={item.description} />
          </button>
        ) : null}
        <div className="min-w-0 flex-1 pt-2">
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-sm font-semibold leading-snug">{item.description}</h4>
            <ExternalLinkButton href={item.url} label={item.description} />
          </div>
          <p className="mt-1.5 flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground">
            <MapPin className="mt-0.5 size-3.5 shrink-0" />
            <span>{item.address || item.locationName || "No location yet"}</span>
          </p>
          {item.notes ? <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{item.notes}</p> : null}
          <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t pt-2">
            <ItemVoteControl key={`${item.votes.up}:${item.votes.down}:${item.votes.current}`} tripId={tripId} itemType="idea" itemId={item.id} label={item.description} votes={item.votes} />
            {canEdit ? <AddToDayButton tripId={tripId} canEdit={canEdit} item={item} /> : null}
            {canEdit ? <IdeaBucketItemDialog tripId={tripId} canEdit={canEdit} item={item} /> : null}
            {canEdit ? <DeleteButton kind="idea" tripId={tripId} id={item.id} /> : null}
            <span className="ml-auto flex size-7 items-center justify-center rounded-full bg-primary/10 text-[9px] font-bold text-primary" title={`Added by ${item.creatorInitials}`}>{item.creatorInitials}</span>
          </div>
        </div>
      </div>
    </article>
  );
}

export function IdeaBucket({ tripId, canEdit, items, className, scheduleControls }: IdeaBucketProps) {
  const sortedItems = [...items].sort((a, b) => a.description.localeCompare(b.description));
  const dragEnabled = usePlannerDragEnabled();
  const { setNodeRef, isOver } = useDroppable({ id: plannerIdeaBucketDropId, disabled: !dragEnabled });

  return (
    <aside ref={setNodeRef} className={cn("flex min-h-0 flex-col bg-card transition-colors", isOver && "bg-primary/5 ring-2 ring-inset ring-primary/30", className)} aria-label="Idea backlog">
      <header className="shrink-0 border-b p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="font-serif text-2xl font-medium tracking-tight">Idea backlog</h2>
            <p className="mt-2 max-w-md text-xs leading-relaxed text-muted-foreground">Save possibilities until you choose a day. Located ideas appear as purple map pins.</p>
          </div>
          {canEdit ? <IdeaBucketItemDialog tripId={tripId} canEdit={canEdit} triggerLabel="Add idea" /> : null}
        </div>
        {scheduleControls}
      </header>

      <div className="min-h-0 flex-1 overflow-auto p-4 sm:p-5">
        {items.length === 0 ? (
          <SectionState title="Good ideas start here" description={canEdit ? "Save a place or possibility before deciding when to go." : "No ideas have been saved yet."} icon={Sparkles} className="min-h-64" />
        ) : (
          <div className="grid gap-5">
            {groups.map((group) => {
              const groupItems = sortedItems.filter((item) => item.kind === group.kind);
              if (!groupItems.length) return null;
              const Icon = group.icon;
              return (
                <section key={group.kind}>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Icon className="size-3.5 text-primary" />
                      <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">{group.label}</h3>
                    </div>
                    <Badge variant="secondary">{groupItems.length}</Badge>
                  </div>
                  <div className="grid gap-2.5">
                    {groupItems.map((item) => <DraggableIdeaCard key={item.id} tripId={tripId} canEdit={canEdit} item={item} />)}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}
