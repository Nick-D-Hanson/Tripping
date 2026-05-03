import { Activity, Home, UtensilsCrossed } from "lucide-react";
import { DeleteButton } from "@/components/trips/delete-button";
import { ExternalLinkButton } from "@/components/trips/external-link-button";
import { ActivityDialog, FoodDialog, IdeaBucketItemDialog, LodgingDialog } from "@/components/trips/item-dialogs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type IdeaBucketItem = {
  id: string;
  kind: "housing" | "activity" | "food";
  description: string;
  url: string | null;
  notes: string | null;
  createdAt: Date;
  creatorInitials: string;
};

type IdeaBucketProps = {
  tripId: string;
  canEdit: boolean;
  items: IdeaBucketItem[];
};

const groups = [
  { kind: "housing" as const, label: "Housing", icon: Home },
  { kind: "activity" as const, label: "Activities", icon: Activity },
  { kind: "food" as const, label: "Food", icon: UtensilsCrossed },
];

function PlanButton({ tripId, canEdit, item }: { tripId: string; canEdit: boolean; item: IdeaBucketItem }) {
  const idea = {
    id: item.id,
    description: item.description,
    url: item.url,
    notes: item.notes,
  };

  if (item.kind === "housing") {
    return <LodgingDialog tripId={tripId} canEdit={canEdit} idea={idea} />;
  }

  if (item.kind === "activity") {
    return <ActivityDialog tripId={tripId} canEdit={canEdit} idea={idea} />;
  }

  return <FoodDialog tripId={tripId} canEdit={canEdit} idea={idea} />;
}

export function IdeaBucket({ tripId, canEdit, items }: IdeaBucketProps) {
  const sortedItems = [...items].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Idea Bucket</CardTitle>
            <CardDescription>{items.length} early-stage idea{items.length === 1 ? "" : "s"}</CardDescription>
          </div>
          <IdeaBucketItemDialog tripId={tripId} canEdit={canEdit} />
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        {items.length === 0 ? (
          <div className="rounded-md border border-dashed p-5 text-sm text-muted-foreground">
            Save loose housing, activity, and food ideas here before they are ready for the map or timeline.
          </div>
        ) : (
          groups.map((group) => {
            const groupItems = sortedItems.filter((item) => item.kind === group.kind);
            const Icon = group.icon;

            return (
              <section key={group.kind} className="grid gap-3 rounded-md border p-3 sm:p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="flex size-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
                      <Icon className="size-4" />
                    </span>
                    <h3 className="text-sm font-semibold">{group.label}</h3>
                  </div>
                  <Badge variant="secondary">{groupItems.length}</Badge>
                </div>

                {groupItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No {group.label.toLowerCase()} ideas yet.</p>
                ) : (
                  <div className="grid gap-3">
                    {groupItems.map((item) => (
                      <div key={item.id} className="flex flex-col gap-3 rounded-md border p-3 sm:flex-row sm:items-start sm:justify-between sm:p-4">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium">{item.description}</p>
                            <ExternalLinkButton href={item.url} label={item.description} />
                          </div>
                          {item.notes ? <p className="mt-2 text-sm text-muted-foreground">{item.notes}</p> : null}
                        </div>

                        <div className="flex shrink-0 flex-wrap items-center gap-2">
                          <span
                            className="flex size-8 items-center justify-center rounded-full border text-xs font-semibold text-muted-foreground"
                            aria-label={`Added by ${item.creatorInitials}`}
                            title={`Added by ${item.creatorInitials}`}
                          >
                            {item.creatorInitials}
                          </span>
                          {canEdit ? <PlanButton tripId={tripId} canEdit={canEdit} item={item} /> : null}
                          {canEdit ? <IdeaBucketItemDialog tripId={tripId} canEdit={canEdit} item={item} /> : null}
                          {canEdit ? <DeleteButton kind="idea" tripId={tripId} id={item.id} /> : null}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
