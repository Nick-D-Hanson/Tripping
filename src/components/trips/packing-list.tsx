import { Check, Package2 } from "lucide-react";
import { DeleteButton } from "@/components/trips/delete-button";
import { PackingItemDialog } from "@/components/trips/item-dialogs";
import { TogglePackingButton } from "@/components/trips/toggle-packing-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
          <PackingItemDialog tripId={tripId} canEdit={canEdit} />
        </div>
      </CardHeader>
      <CardContent className="grid gap-3">
        {sortedItems.length === 0 ? (
          <div className="rounded-md border border-dashed p-5 text-sm text-muted-foreground">
            Start a shared checklist for the trip so everyone knows what still needs packing.
          </div>
        ) : (
          sortedItems.map((item) => (
            <div key={item.id} className={cn("flex items-start gap-3 rounded-md border p-3 sm:p-4", item.isPacked && "bg-muted/30")}>
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

              <div className="min-w-0 flex-1">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className={cn("font-medium", item.isPacked && "text-muted-foreground line-through")}>{item.name}</p>
                      {item.quantity ? <Badge variant="secondary">{item.quantity}</Badge> : null}
                    </div>
                    {item.notes ? <p className="mt-2 text-sm text-muted-foreground">{item.notes}</p> : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="flex size-8 items-center justify-center rounded-full border text-xs font-semibold text-muted-foreground"
                      aria-label={`Added by ${item.creatorInitials}`}
                      title={`Added by ${item.creatorInitials}`}
                    >
                      {item.creatorInitials}
                    </span>
                    {canEdit ? <PackingItemDialog tripId={tripId} canEdit={canEdit} item={item} /> : null}
                    {canEdit ? <DeleteButton kind="packing" tripId={tripId} id={item.id} /> : null}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
