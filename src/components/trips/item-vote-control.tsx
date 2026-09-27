"use client";

import { ThumbsDown, ThumbsUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { setTripItemVote } from "@/app/actions";
import { actionErrorMessage } from "@/components/trips/mutation-feedback";
import { useToast } from "@/components/ui/toast-provider";
import type { TripItemVoteType } from "@/db/schema";
import type { ItemVoteSummary } from "@/lib/votes";
import { cn } from "@/lib/utils";

type ItemVoteControlProps = {
  tripId: string;
  itemType: TripItemVoteType;
  itemId: string;
  label: string;
  votes: ItemVoteSummary;
};

function optimisticVote(current: ItemVoteSummary, direction: -1 | 1): ItemVoteSummary {
  const nextVote = current.current === direction ? 0 : direction;

  return {
    up: Math.max(0, current.up - (current.current === 1 ? 1 : 0) + (nextVote === 1 ? 1 : 0)),
    down: Math.max(0, current.down - (current.current === -1 ? 1 : 0) + (nextVote === -1 ? 1 : 0)),
    current: nextVote,
  };
}

export function ItemVoteControl({ tripId, itemType, itemId, label, votes }: ItemVoteControlProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [displayVotes, updateOptimisticVote] = useOptimistic(votes, optimisticVote);

  function castVote(direction: -1 | 1) {
    startTransition(async () => {
      updateOptimisticVote(direction);
      try {
        await setTripItemVote(tripId, itemType, itemId, direction);
        router.refresh();
      } catch (error) {
        toast({
          variant: "error",
          title: "Unable to record vote",
          description: actionErrorMessage(error),
        });
      }
    });
  }

  return (
    <div
      className="flex items-center gap-1"
      aria-label={`Anonymous votes for ${label}`}
      title="Votes are anonymous to trip collaborators"
      onClick={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        disabled={pending}
        aria-pressed={displayVotes.current === 1}
        aria-label={`Upvote ${label}. ${displayVotes.up} upvotes`}
        className={cn(
          "inline-flex h-8 min-w-10 items-center justify-center gap-1 rounded-lg border px-2 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60",
          displayVotes.current === 1
            ? "border-primary/40 bg-primary/10 text-primary"
            : "border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground",
        )}
        onClick={() => castVote(1)}
      >
        <ThumbsUp className="size-3.5" aria-hidden="true" />
        <span>{displayVotes.up}</span>
      </button>
      <button
        type="button"
        disabled={pending}
        aria-pressed={displayVotes.current === -1}
        aria-label={`Downvote ${label}. ${displayVotes.down} downvotes`}
        className={cn(
          "inline-flex h-8 min-w-10 items-center justify-center gap-1 rounded-lg border px-2 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60",
          displayVotes.current === -1
            ? "border-destructive/40 bg-destructive/10 text-destructive"
            : "border-border bg-background text-muted-foreground hover:border-destructive/30 hover:text-foreground",
        )}
        onClick={() => castVote(-1)}
      >
        <ThumbsDown className="size-3.5" aria-hidden="true" />
        <span>{displayVotes.down}</span>
      </button>
    </div>
  );
}
