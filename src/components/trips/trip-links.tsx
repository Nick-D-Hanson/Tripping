"use client";

import { Link2 } from "lucide-react";
import { DeleteButton } from "@/components/trips/delete-button";
import { ExternalLinkButton } from "@/components/trips/external-link-button";
import { TripLinkDialog } from "@/components/trips/item-dialogs";
import { SectionState } from "@/components/ui/section-state";
import { cn } from "@/lib/utils";

export type TripLink = {
  id: string;
  title: string;
  url: string;
  description: string | null;
  createdAt: Date;
  creatorInitials: string;
};

type TripLinksProps = {
  tripId: string;
  canEdit: boolean;
  items: TripLink[];
  className?: string;
};

export function TripLinks({ tripId, canEdit, items, className }: TripLinksProps) {
  const sortedItems = [...items].sort((a, b) => a.title.localeCompare(b.title));

  return (
    <section className={cn("min-h-[620px] overflow-auto bg-background px-4 py-6 sm:px-8 sm:py-8", className)} aria-label="Trip links">
      <div className="mx-auto w-full max-w-4xl">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent">Shared resources</p>
            <h2 className="mt-1 font-serif text-2xl font-medium tracking-tight">Trip links</h2>
            <p className="mt-2 text-sm text-muted-foreground">Keep tickets, reservations, guides, and other useful pages in one place.</p>
          </div>
          {canEdit ? <TripLinkDialog tripId={tripId} canEdit={canEdit} triggerLabel="Add link" /> : null}
        </header>

        {items.length === 0 ? (
          <SectionState
            title="No shared links yet"
            description={canEdit ? "Add the first useful resource for this trip." : "No links have been shared for this trip yet."}
            icon={Link2}
            className="mt-6 min-h-72 bg-card"
          />
        ) : (
          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            {sortedItems.map((item) => (
              <article key={item.id} className="flex min-w-0 flex-col rounded-xl border bg-card p-4 transition-colors hover:border-primary/35 hover:bg-primary/[0.025]">
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold" title={item.title}>{item.title}</h3>
                    {item.description ? <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{item.description}</p> : null}
                  </div>
                  <ExternalLinkButton href={item.url} label={item.title} />
                </div>
                <div className="mt-auto flex flex-wrap items-center gap-1.5 border-t pt-3">
                  {canEdit ? <TripLinkDialog tripId={tripId} canEdit={canEdit} item={item} /> : null}
                  {canEdit ? <DeleteButton kind="link" tripId={tripId} id={item.id} /> : null}
                  <span className="ml-auto flex size-7 items-center justify-center rounded-full bg-primary/10 text-[9px] font-bold text-primary" title={`Added by ${item.creatorInitials}`}>{item.creatorInitials}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
