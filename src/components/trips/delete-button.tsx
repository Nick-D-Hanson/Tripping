"use client";

import { Trash2 } from "lucide-react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteActivity, deleteFood, deleteIdeaBucketItem, deleteLodging, deletePackingItem, deleteSegment, deleteTripLink, removeMember } from "@/app/actions";
import { actionErrorMessage } from "@/components/trips/mutation-feedback";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-provider";

type DeleteButtonProps =
  | { kind: "segment"; tripId: string; id: string; className?: string }
  | { kind: "lodging"; tripId: string; id: string; className?: string }
  | { kind: "activity"; tripId: string; id: string; className?: string }
  | { kind: "food"; tripId: string; id: string; className?: string }
  | { kind: "idea"; tripId: string; id: string; className?: string }
  | { kind: "packing"; tripId: string; id: string; className?: string }
  | { kind: "link"; tripId: string; id: string; className?: string }
  | { kind: "member"; tripId: string; id: string; className?: string };

export function DeleteButton(props: DeleteButtonProps) {
  const router = useRouter();
  const { toast } = useToast();
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
          try {
            if (props.kind === "segment") await deleteSegment(props.tripId, props.id);
            if (props.kind === "lodging") await deleteLodging(props.tripId, props.id);
            if (props.kind === "activity") await deleteActivity(props.tripId, props.id);
            if (props.kind === "food") await deleteFood(props.tripId, props.id);
            if (props.kind === "idea") await deleteIdeaBucketItem(props.tripId, props.id);
            if (props.kind === "packing") await deletePackingItem(props.tripId, props.id);
            if (props.kind === "link") await deleteTripLink(props.tripId, props.id);
            if (props.kind === "member") await removeMember(props.tripId, props.id);
            router.refresh();
            toast({
              variant: "success",
              title: props.kind === "member" ? "Collaborator removed" : "Item deleted",
              description: props.kind === "member" ? "The member list was updated." : "The trip data was refreshed.",
            });
          } catch (error) {
            toast({
              variant: "error",
              title: "Action failed",
              description: actionErrorMessage(error),
            });
          }
        });
      }}
    >
      <Trash2 className="size-4" />
      {label}
    </Button>
  );
}
