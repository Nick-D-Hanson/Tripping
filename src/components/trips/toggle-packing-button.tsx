"use client";

import { Check } from "lucide-react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { togglePackingItem } from "@/app/actions";
import { actionErrorMessage } from "@/components/trips/mutation-feedback";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-provider";
import { cn } from "@/lib/utils";

type TogglePackingButtonProps = {
  tripId: string;
  id: string;
  packed: boolean;
};

export function TogglePackingButton({ tripId, id, packed }: TogglePackingButtonProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="secondary"
      size="icon"
      disabled={pending}
      aria-pressed={packed}
      aria-label={packed ? "Mark as unpacked" : "Mark as packed"}
      className={cn(
        "size-9 shrink-0",
        packed ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20" : "text-muted-foreground",
      )}
      onClick={() => {
        startTransition(async () => {
          try {
            await togglePackingItem(tripId, id, !packed);
            router.refresh();
            toast({
              variant: "success",
              title: packed ? "Marked as unpacked" : "Marked as packed",
              description: "The packing list was updated.",
            });
          } catch (error) {
            toast({
              variant: "error",
              title: "Unable to update item",
              description: actionErrorMessage(error),
            });
          }
        });
      }}
    >
      <Check className="size-4" />
    </Button>
  );
}
