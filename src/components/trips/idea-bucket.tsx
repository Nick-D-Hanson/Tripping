"use client";

import { Activity, ChevronDown, Home, MapPin, UtensilsCrossed } from "lucide-react";
import { useState } from "react";
import { DeleteButton } from "@/components/trips/delete-button";
import { ExternalLinkButton } from "@/components/trips/external-link-button";
import { ActivityDialog, FoodDialog, IdeaBucketItemDialog, LodgingDialog } from "@/components/trips/item-dialogs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EntityRow, EntityRowActions, EntityRowAvatar, EntityRowBody, EntityRowNotes, EntityRowTitle } from "@/components/ui/entity-row";
import { SectionState } from "@/components/ui/section-state";

type IdeaBucketItem = {
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
    locationName: item.locationName,
    address: item.address,
    lat: item.lat,
    lng: item.lng,
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
  const [expanded, setExpanded] = useState(false);
  const sortedItems = [...items].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Idea Bucket</CardTitle>
            <CardDescription>{items.length} early-stage idea{items.length === 1 ? "" : "s"}</CardDescription>
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
            <IdeaBucketItemDialog tripId={tripId} canEdit={canEdit} />
          </div>
        </div>
      </CardHeader>
      {expanded ? <CardContent className="grid gap-4">
        {items.length === 0 ? (
          <SectionState
            title="No saved ideas yet"
            description="Save loose housing, activity, and food ideas here before they are ready for the map or timeline."
          />
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
                  <SectionState
                    title={`No ${group.label.toLowerCase()} ideas yet`}
                    description={`Save possible ${group.label.toLowerCase()} options here before they become confirmed trip items.`}
                    className="px-4 py-4"
                  />
                ) : (
                  <div className="grid gap-3">
                    {groupItems.map((item) => (
                      <EntityRow key={item.id} className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <EntityRowBody className="min-w-0">
                          <EntityRowTitle>
                            <p className="font-medium">{item.description}</p>
                            <ExternalLinkButton href={item.url} label={item.description} />
                          </EntityRowTitle>
                          {item.address ? (
                            <p className="flex items-start gap-2 text-sm text-muted-foreground">
                              <MapPin className="mt-0.5 size-4 shrink-0" />
                              <span>{item.address}</span>
                            </p>
                          ) : null}
                          {item.notes ? <EntityRowNotes>{item.notes}</EntityRowNotes> : null}
                        </EntityRowBody>

                        <EntityRowActions>
                          <EntityRowAvatar label={`Added by ${item.creatorInitials}`}>
                            {item.creatorInitials}
                          </EntityRowAvatar>
                          {canEdit ? <PlanButton tripId={tripId} canEdit={canEdit} item={item} /> : null}
                          {canEdit ? <IdeaBucketItemDialog tripId={tripId} canEdit={canEdit} item={item} /> : null}
                          {canEdit ? <DeleteButton kind="idea" tripId={tripId} id={item.id} /> : null}
                        </EntityRowActions>
                      </EntityRow>
                    ))}
                  </div>
                )}
              </section>
            );
          })
        )}
      </CardContent> : null}
    </Card>
  );
}
