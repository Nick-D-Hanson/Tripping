"use client";

import { Check, Package2, UserRound } from "lucide-react";
import { DeleteButton } from "@/components/trips/delete-button";
import { PackingItemDialog } from "@/components/trips/item-dialogs";
import { TogglePackingButton } from "@/components/trips/toggle-packing-button";
import { Badge } from "@/components/ui/badge";
import { SectionState } from "@/components/ui/section-state";
import { cn } from "@/lib/utils";

type PackingItem = {
  id: string;
  name: string;
  category: string;
  quantity: string | null;
  assignedToMemberId: string | null;
  assigneeLabel: string | null;
  assigneeInitials: string | null;
  notes: string | null;
  isPacked: boolean;
  createdByUserId: string;
  createdAt: Date;
  creatorInitials: string;
};

type PackingListProps = {
  tripId: string;
  canEdit: boolean;
  items: PackingItem[];
  members: Array<{ id: string; label: string }>;
  className?: string;
};

const categoryOrder = ["Documents", "Clothing", "Toiletries", "Gear", "Other"];

export function PackingList({ tripId, canEdit, items, members, className }: PackingListProps) {
  const sortedItems = [...items].sort((a, b) => {
    if (a.isPacked !== b.isPacked) return a.isPacked ? 1 : -1;
    return a.name.localeCompare(b.name);
  });
  const categories = [
    ...categoryOrder.filter((category) => sortedItems.some((item) => item.category === category)),
    ...[...new Set(sortedItems.map((item) => item.category))].filter((category) => !categoryOrder.includes(category)).sort(),
  ];
  const packedCount = items.filter((item) => item.isPacked).length;
  const progress = items.length ? Math.round((packedCount / items.length) * 100) : 0;

  return (
    <section className={cn("min-h-[620px] overflow-auto bg-background px-4 py-6 sm:px-8 sm:py-8", className)} aria-label="Trip packing list">
      <div className="mx-auto w-full max-w-4xl">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent">Before you go</p>
            <h2 className="mt-1 font-serif text-2xl font-medium tracking-tight">Packing list</h2>
            <p className="mt-2 text-sm text-muted-foreground">One shared checklist for the whole trip.</p>
          </div>
          {canEdit ? <PackingItemDialog tripId={tripId} canEdit={canEdit} members={members} triggerLabel="Add item" /> : null}
        </header>

        <div className="mt-6 rounded-xl border bg-card p-4 sm:p-5" aria-label={`${progress}% packed`}>
          <div className="flex items-center justify-between gap-3 text-sm">
            <strong>{packedCount} of {items.length} packed</strong>
            <span className="text-muted-foreground">{progress}% ready</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-[width] duration-200" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {items.length === 0 ? (
          <SectionState
            title="Your packing list is ready"
            description={canEdit ? "Add the first item, assign it if needed, and keep everyone in sync." : "No packing items have been added yet."}
            icon={Package2}
            className="mt-6 min-h-72 bg-card"
          />
        ) : (
          <div className="mt-7 grid gap-7">
            {categories.map((category) => {
              const categoryItems = sortedItems.filter((item) => item.category === category);
              return (
                <section key={category}>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">{category}</h3>
                    <Badge variant="secondary">{categoryItems.length}</Badge>
                  </div>
                  <div className="overflow-hidden rounded-xl border bg-card">
                    {categoryItems.map((item) => (
                      <div key={item.id} className={cn("flex min-h-16 items-start gap-3 border-b p-3 last:border-b-0 sm:items-center", item.isPacked && "bg-muted/35")}>
                        {canEdit ? (
                          <TogglePackingButton tripId={tripId} id={item.id} packed={item.isPacked} />
                        ) : (
                          <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg border", item.isPacked ? "border-primary/30 bg-primary/10 text-primary" : "text-muted-foreground")}>
                            {item.isPacked ? <Check className="size-4" /> : <Package2 className="size-4" />}
                          </span>
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className={cn("text-sm font-semibold", item.isPacked && "text-muted-foreground line-through")}>{item.name}</p>
                            {item.quantity ? <Badge variant="outline">Qty {item.quantity}</Badge> : null}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            {item.assigneeLabel ? (
                              <span className="inline-flex items-center gap-1.5" title={item.assigneeLabel}>
                                <span className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-[8px] font-bold text-primary">{item.assigneeInitials}</span>
                                {item.assigneeLabel}
                              </span>
                            ) : <span className="inline-flex items-center gap-1"><UserRound className="size-3" /> Anyone</span>}
                            {item.notes ? <span className="line-clamp-1">{item.notes}</span> : null}
                          </div>
                        </div>

                        {canEdit ? (
                          <div className="flex shrink-0 items-center gap-1">
                            <PackingItemDialog tripId={tripId} canEdit={canEdit} item={item} members={members} />
                            <DeleteButton kind="packing" tripId={tripId} id={item.id} />
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
