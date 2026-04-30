"use client";

import { Trash2 } from "lucide-react";
import { useTransition } from "react";
import { deleteActivity, deleteFood, deleteLodging, deletePackingItem, deleteSegment, removeMember } from "@/app/actions";
import { Button } from "@/components/ui/button";

type DeleteButtonProps =
  | { kind: "segment"; tripId: string; id: string; className?: string }
  | { kind: "lodging"; tripId: string; id: string; className?: string }
  | { kind: "activity"; tripId: string; id: string; className?: string }
  | { kind: "food"; tripId: string; id: string; className?: string }
  | { kind: "packing"; tripId: string; id: string; className?: string }
  | { kind: "member"; tripId: string; id: string; className?: string };

export function DeleteButton(props: DeleteButtonProps) {
  const [pending, startTransition] = useTransition();
  const label = props.kind === "member" ? "Remove" : "Delete";

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={props.className}
      disabled={pending}
      onClick={() => {
        if (!confirm(`${label} this ${props.kind}?`)) return;
        startTransition(async () => {
          if (props.kind === "segment") await deleteSegment(props.tripId, props.id);
          if (props.kind === "lodging") await deleteLodging(props.tripId, props.id);
          if (props.kind === "activity") await deleteActivity(props.tripId, props.id);
          if (props.kind === "food") await deleteFood(props.tripId, props.id);
          if (props.kind === "packing") await deletePackingItem(props.tripId, props.id);
          if (props.kind === "member") await removeMember(props.tripId, props.id);
        });
      }}
    >
      <Trash2 className="size-4" />
      {label}
    </Button>
  );
}
