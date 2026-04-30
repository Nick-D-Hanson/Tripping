import { CalendarDays, Save } from "lucide-react";
import { createTrip, updateTrip } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" defaultValue={trip?.name} placeholder="Japan spring trip" required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={trip?.description ?? ""}
              placeholder="Who's going, what matters, and any constraints."
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="startDate">Start date</Label>
              <Input id="startDate" name="startDate" type="date" defaultValue={trip?.startDate} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="endDate">End date</Label>
              <Input id="endDate" name="endDate" type="date" defaultValue={trip?.endDate} required />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="submit" className="w-full sm:w-auto">
              {trip ? <Save className="size-4" /> : <CalendarDays className="size-4" />}
              {trip ? "Save trip" : "Create trip"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
