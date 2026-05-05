import { CalendarDays, Save } from "lucide-react";
import { createTrip, updateTrip } from "@/app/actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";

type TripFormProps = {
  trip?: {
    id: string;
    name: string;
    description: string | null;
    startDate: string;
    endDate: string;
  };
};

export function TripForm({ trip }: TripFormProps) {
  const action = trip ? updateTrip.bind(null, trip.id) : createTrip;

  return (
    <Card className="mx-auto w-full max-w-2xl">
      <CardHeader>
        <CardTitle>{trip ? "Edit trip" : "Create a trip"}</CardTitle>
        <CardDescription>Set the high-level dates and purpose for the plan.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="grid gap-5">
          <Field>
            <FieldLabel htmlFor="name" required>Name</FieldLabel>
            <Input id="name" name="name" defaultValue={trip?.name} placeholder="Japan spring trip" required />
            <FieldDescription>Use the shared name people will recognize in dashboards, invites, and trip details.</FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="description">Description</FieldLabel>
            <Textarea
              id="description"
              name="description"
              defaultValue={trip?.description ?? ""}
              placeholder="Who's going, what matters, and any constraints."
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="startDate" required>Start date</FieldLabel>
              <Input id="startDate" name="startDate" type="date" defaultValue={trip?.startDate} required />
            </Field>
            <Field>
              <FieldLabel htmlFor="endDate" required>End date</FieldLabel>
              <Input id="endDate" name="endDate" type="date" defaultValue={trip?.endDate} required />
            </Field>
          </div>
          <div className="flex justify-end gap-2">
            <SubmitButton className="w-full sm:w-auto" pendingText={trip ? "Saving trip" : "Creating trip"}>
              {trip ? <Save className="size-4" /> : <CalendarDays className="size-4" />}
              {trip ? "Save trip" : "Create trip"}
            </SubmitButton>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
