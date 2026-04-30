"use client";

import { Check } from "lucide-react";
import { useTransition } from "react";
import { togglePackingItem } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type TogglePackingButtonProps = {
  tripId: string;
  id: string;
  packed: boolean;
};

export function TogglePackingButton({ tripId, id, packed }: TogglePackingButtonProps) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
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
          await togglePackingItem(tripId, id, !packed);
        });
      }}
    >
      <Check className="size-4" />
    </Button>
  );
}
