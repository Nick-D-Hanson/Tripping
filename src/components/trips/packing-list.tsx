"use client";

import { Check, ChevronDown, Package2 } from "lucide-react";
import { useState } from "react";
import { DeleteButton } from "@/components/trips/delete-button";
import { PackingItemDialog } from "@/components/trips/item-dialogs";
import { TogglePackingButton } from "@/components/trips/toggle-packing-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EntityRow, EntityRowActions, EntityRowAvatar, EntityRowBody, EntityRowHeader, EntityRowNotes, EntityRowTitle } from "@/components/ui/entity-row";
import { SectionState } from "@/components/ui/section-state";
import { cn } from "@/lib/utils";

type PackingListProps = {
  tripId: string;
  canEdit: boolean;
  items: Array<{
    id: string;
    name: string;
    quantity: string | null;
    notes: string | null;
    isPacked: boolean;
    createdByUserId: string;
    createdAt: Date;
    creatorInitials: string;
  }>;
};

export function PackingList({ tripId, canEdit, items }: PackingListProps) {
  const [expanded, setExpanded] = useState(false);
  const sortedItems = [...items].sort((a, b) => {
    if (a.isPacked !== b.isPacked) return a.isPacked ? 1 : -1;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });

  const packedCount = items.filter((item) => item.isPacked).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Packing List</CardTitle>
            <CardDescription>
              {packedCount} of {items.length} packed
            </CardDescription>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
            <Button
              type="button"
              variant="secondary"
              className="w-full sm:w-auto"
              aria-expanded={expanded}
              onClick={() => setExpanded((current) => !current)}
            >
              <ChevronDown className={`size-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
              {expanded ? "Collapse" : "Expand"}
            </Button>
            <PackingItemDialog tripId={tripId} canEdit={canEdit} />
          </div>
        </div>
      </CardHeader>
      {expanded ? <CardContent className="grid gap-3">
        {sortedItems.length === 0 ? (
          <SectionState
            title="No packing items yet"
            description="Start a shared checklist for the trip so everyone knows what still needs packing."
          />
        ) : (
          sortedItems.map((item) => (
            <EntityRow key={item.id} className={cn("flex items-start gap-3", item.isPacked && "bg-muted/30")}>
              {canEdit ? (
                <TogglePackingButton tripId={tripId} id={item.id} packed={item.isPacked} />
              ) : (
                <span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-md border",
                    item.isPacked ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300" : "text-muted-foreground",
                  )}
                  aria-hidden="true"
                >
                  {item.isPacked ? <Check className="size-4" /> : <Package2 className="size-4" />}
                </span>
              )}

              <EntityRowBody>
                <EntityRowHeader>
                  <div className="min-w-0">
                    <EntityRowTitle>
                      <p className={cn("font-medium", item.isPacked && "text-muted-foreground line-through")}>{item.name}</p>
                      {item.quantity ? <Badge variant="secondary">{item.quantity}</Badge> : null}
                    </EntityRowTitle>
                    {item.notes ? <EntityRowNotes>{item.notes}</EntityRowNotes> : null}
                  </div>

                  <EntityRowActions>
                    <EntityRowAvatar label={`Added by ${item.creatorInitials}`}>
                      {item.creatorInitials}
                    </EntityRowAvatar>
                    {canEdit ? <PackingItemDialog tripId={tripId} canEdit={canEdit} item={item} /> : null}
                    {canEdit ? <DeleteButton kind="packing" tripId={tripId} id={item.id} /> : null}
                  </EntityRowActions>
                </EntityRowHeader>
              </EntityRowBody>
            </EntityRow>
          ))
        )}
      </CardContent> : null}
    </Card>
  );
}
