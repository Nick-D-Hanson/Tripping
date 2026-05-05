"use client";

import { Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { deleteTripWithConfirmation } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Notice } from "@/components/ui/notice";
import { SubmitButton } from "@/components/ui/submit-button";

type TripDeleteDialogProps = {
  tripId: string;
  tripName: string;
};

export function TripDeleteDialog({ tripId, tripName }: TripDeleteDialogProps) {
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const matches = useMemo(() => confirmation.trim() === tripName, [confirmation, tripName]);

  const action = async (formData: FormData) => {
    setError(null);
    const result = await deleteTripWithConfirmation(tripId, tripName, formData);
    if (result && !result.ok) {
      setError(result.error);
      return;
    }
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={(event) => event.preventDefault()}
        >
          <Trash2 className="size-4" />
          Delete
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete trip</DialogTitle>
          <DialogDescription>
            Type <span className="font-medium text-foreground">{tripName}</span> to confirm. This will permanently remove the trip and all related items.
          </DialogDescription>
        </DialogHeader>
        <form action={action} className="grid gap-4">
          {error ? <Notice variant="error">{error}</Notice> : null}
          <Field>
            <FieldLabel htmlFor={`delete-trip-${tripId}`} required>Trip name</FieldLabel>
            <Input
              id={`delete-trip-${tripId}`}
              name="tripNameConfirmation"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              autoComplete="off"
              placeholder={tripName}
              required
            />
          </Field>
          <div className="flex justify-end">
            <SubmitButton variant="destructive" className="w-full sm:w-auto" disabled={!matches} pendingText="Deleting trip">
              <Trash2 className="size-4" />
              Delete trip
            </SubmitButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
