"use client";

import { Backpack, Edit, Hotel, Lightbulb, MapPin, Plane, Plus, UtensilsCrossed } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveActivity, saveFood, saveIdeaBucketItem, saveLodging, savePackingItem, saveSegment } from "@/app/actions";
import { actionErrorMessage } from "@/components/trips/mutation-feedback";
import { FoodCategoryControl } from "@/components/trips/food-category-control";
import { LocationSearch } from "@/components/trips/location-search";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { useToast } from "@/components/ui/toast-provider";
import { Textarea } from "@/components/ui/textarea";
import { toDateTimeInputValue } from "@/lib/dates";

type IdeaDraft = {
  id: string;
  description: string;
  locationName: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  url: string | null;
  notes: string | null;
};

type BaseDialogProps = { tripId: string; canEdit: boolean };

function FormError({ message }: { message: string | null }) {
  if (!message) return null;

  return (
    <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
      {message}
    </p>
  );
}

function getOffsetMinutes(value: string) {
  if (!value) return "";
  return String(new Date(value).getTimezoneOffset());
}

function DateTimeField({
  label,
  name,
  value,
  required,
}: {
  label: string;
  name: string;
  value: string;
  required?: boolean;
}) {
  const [currentValue, setCurrentValue] = useState(value);

  return (
    <Field>
      <FieldLabel required={required}>{label}</FieldLabel>
      <Input
        name={name}
        type="datetime-local"
        value={currentValue}
        onChange={(event) => setCurrentValue(event.target.value)}
        required={required}
      />
      <input name={`${name}OffsetMinutes`} type="hidden" value={getOffsetMinutes(currentValue)} readOnly suppressHydrationWarning />
    </Field>
  );
}

export function SegmentDialog({
  tripId,
  canEdit,
  segment,
}: BaseDialogProps & {
  segment?: {
    id: string;
    title: string | null;
    url: string | null;
    type: string;
    startLocationName: string;
    startAddress: string | null;
    startLat: number | null;
    startLng: number | null;
    endLocationName: string;
    endAddress: string | null;
    endLat: number | null;
    endLng: number | null;
    startDatetime: Date;
    endDatetime: Date | null;
    notes: string | null;
  };
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!canEdit) return null;
  const action = async (formData: FormData) => {
    setError(null);
    try {
      const result = await saveSegment(tripId, segment?.id ?? null, formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
      toast({
        variant: "success",
        title: segment ? "Segment updated" : "Segment added",
        description: "The trip map and timeline were refreshed.",
      });
      setOpen(false);
    } catch (error) {
      setError(actionErrorMessage(error));
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={segment ? "ghost" : "secondary"} size={segment ? "sm" : "default"} className={segment ? undefined : "w-full sm:w-auto"}>
          {segment ? <Edit /> : <Plus />}
          {segment ? "Edit" : "Travel"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{segment ? "Edit travel segment" : "Add travel segment"}</DialogTitle>
          <DialogDescription>Search and select real places for maps and routes, then add an optional display title.</DialogDescription>
        </DialogHeader>
        <form action={action} className="grid gap-4">
          <FormError message={error} />
          <Field>
            <FieldLabel>Display title</FieldLabel>
            <Input name="title" defaultValue={segment?.title ?? ""} placeholder="Flight to Denver" />
          </Field>
          <Field>
            <FieldLabel required>Type</FieldLabel>
            <Select name="type" defaultValue={segment?.type === "flight" ? "flight" : "drive"}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="drive">Drive</SelectItem>
                <SelectItem value="flight">Flight</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <LocationSearch
              label="Start location"
              addressName="startAddress"
              locationNameName="startLocationName"
              latName="startLat"
              lngName="startLng"
              defaultAddress={segment?.startAddress}
              defaultLocationName={segment?.startLocationName}
              defaultLat={segment?.startLat}
              defaultLng={segment?.startLng}
              placeholder="Search for a departure point"
            />
            <LocationSearch
              label="End location"
              addressName="endAddress"
              locationNameName="endLocationName"
              latName="endLat"
              lngName="endLng"
              defaultAddress={segment?.endAddress}
              defaultLocationName={segment?.endLocationName}
              defaultLat={segment?.endLat}
              defaultLng={segment?.endLng}
              placeholder="Search for an arrival point"
            />
            <DateTimeField label="Start time" name="startDatetime" value={toDateTimeInputValue(segment?.startDatetime)} required />
            <DateTimeField label="End time" name="endDatetime" value={toDateTimeInputValue(segment?.endDatetime)} />
          </div>
          <Field>
            <FieldLabel>Optional link</FieldLabel>
            <Input name="url" type="url" defaultValue={segment?.url ?? ""} placeholder="https://example.com/booking" />
          </Field>
          <Field>
            <FieldLabel>Notes</FieldLabel>
            <Textarea name="notes" defaultValue={segment?.notes ?? ""} />
          </Field>
          <div className="flex justify-end">
            <SubmitButton className="w-full sm:w-auto" pendingText="Saving segment">
              <Plane className="size-4" />
              Save segment
            </SubmitButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function LodgingDialog({
  tripId,
  canEdit,
  stay,
  idea,
}: BaseDialogProps & {
  stay?: {
    id: string;
    title: string | null;
    name: string;
    url: string | null;
    address: string | null;
    lat: number | null;
    lng: number | null;
    checkIn: Date;
    checkOut: Date | null;
    notes: string | null;
  };
  idea?: IdeaDraft;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!canEdit) return null;
  const action = async (formData: FormData) => {
    setError(null);
    try {
      const result = await saveLodging(tripId, stay?.id ?? null, formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
      toast({
        variant: "success",
        title: stay ? "Lodging updated" : "Lodging added",
        description: "Your stay details were saved.",
      });
      setOpen(false);
    } catch (error) {
      setError(actionErrorMessage(error));
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={stay ? "ghost" : "secondary"} size={stay ? "sm" : "default"} className={stay ? undefined : "w-full sm:w-auto"}>
          {stay ? <Edit /> : <Plus />}
          {stay ? "Edit" : idea ? "Add to a day" : "Lodging"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{stay ? "Edit lodging" : idea ? "Plan housing idea" : "Add lodging"}</DialogTitle>
          <DialogDescription>Stays appear as distinct pins and timeline entries.</DialogDescription>
        </DialogHeader>
        <form action={action} className="grid gap-4">
          <FormError message={error} />
          {idea ? <input name="convertedIdeaId" type="hidden" value={idea.id} /> : null}
          <Field>
            <FieldLabel>Display title</FieldLabel>
            <Input name="title" defaultValue={stay?.title ?? idea?.description ?? ""} placeholder="Mountain lodge check-in" />
          </Field>
          <LocationSearch
            label="Lodging location"
            addressName="address"
            locationNameName="name"
            latName="lat"
            lngName="lng"
            defaultAddress={stay?.address ?? idea?.address}
            defaultLocationName={stay?.name ?? idea?.locationName}
            defaultLat={stay?.lat ?? idea?.lat}
            defaultLng={stay?.lng ?? idea?.lng}
            placeholder="Search for a hotel, stay, or address"
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <DateTimeField label="Check-in" name="checkIn" value={toDateTimeInputValue(stay?.checkIn)} required />
            <DateTimeField label="Check-out" name="checkOut" value={toDateTimeInputValue(stay?.checkOut)} />
          </div>
          <Field>
            <FieldLabel>Optional link</FieldLabel>
            <Input name="url" type="url" defaultValue={stay?.url ?? idea?.url ?? ""} placeholder="https://example.com/hotel" />
          </Field>
          <Field>
            <FieldLabel>Notes</FieldLabel>
            <Textarea name="notes" defaultValue={stay?.notes ?? idea?.notes ?? ""} />
          </Field>
          <div className="flex justify-end">
            <SubmitButton className="w-full sm:w-auto" pendingText="Saving lodging">
              <Hotel className="size-4" />
              Save lodging
            </SubmitButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ActivityDialog({
  tripId,
  canEdit,
  activity,
  idea,
}: BaseDialogProps & {
  activity?: {
    id: string;
    title: string | null;
    name: string;
    url: string | null;
    address: string | null;
    lat: number | null;
    lng: number | null;
    datetime: Date;
    includeInRoute: boolean;
    notes: string | null;
  };
  idea?: IdeaDraft;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!canEdit) return null;
  const action = async (formData: FormData) => {
    setError(null);
    try {
      const result = await saveActivity(tripId, activity?.id ?? null, formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
      toast({
        variant: "success",
        title: activity ? "Activity updated" : "Activity added",
        description: "The itinerary was updated.",
      });
      setOpen(false);
    } catch (error) {
      setError(actionErrorMessage(error));
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={activity ? "ghost" : "secondary"} size={activity ? "sm" : "default"} className={activity ? undefined : "w-full sm:w-auto"}>
          {activity ? <Edit /> : <Plus />}
          {activity ? "Edit" : idea ? "Add to a day" : "Activity"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{activity ? "Edit activity" : idea ? "Plan activity idea" : "Add activity"}</DialogTitle>
          <DialogDescription>Choose whether this stop should be eligible for route optimization.</DialogDescription>
        </DialogHeader>
        <form action={action} className="grid gap-4">
          <FormError message={error} />
          {idea ? <input name="convertedIdeaId" type="hidden" value={idea.id} /> : null}
          <Field>
            <FieldLabel>Display title</FieldLabel>
            <Input name="title" defaultValue={activity?.title ?? idea?.description ?? ""} placeholder="Dinner reservation" />
          </Field>
          <LocationSearch
            label="Activity location"
            addressName="address"
            locationNameName="name"
            latName="lat"
            lngName="lng"
            defaultAddress={activity?.address ?? idea?.address}
            defaultLocationName={activity?.name ?? idea?.locationName}
            defaultLat={activity?.lat ?? idea?.lat}
            defaultLng={activity?.lng ?? idea?.lng}
            placeholder="Search for a place, attraction, or address"
          />
          <DateTimeField label="Date and time" name="datetime" value={toDateTimeInputValue(activity?.datetime)} required />
          <label className="flex items-center gap-2 text-sm">
            <input name="includeInRoute" type="checkbox" defaultChecked={activity?.includeInRoute} className="size-4 rounded border-input" />
            Include in route optimization
          </label>
          <Field>
            <FieldLabel>Optional link</FieldLabel>
            <Input name="url" type="url" defaultValue={activity?.url ?? idea?.url ?? ""} placeholder="https://example.com/tickets" />
          </Field>
          <Field>
            <FieldLabel>Notes</FieldLabel>
            <Textarea name="notes" defaultValue={activity?.notes ?? idea?.notes ?? ""} />
          </Field>
          <div className="flex justify-end">
            <SubmitButton className="w-full sm:w-auto" pendingText="Saving activity">
              <MapPin className="size-4" />
              Save activity
            </SubmitButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function FoodDialog({
  tripId,
  canEdit,
  food,
  idea,
}: BaseDialogProps & {
  food?: {
    id: string;
    title: string | null;
    name: string;
    url: string | null;
    address: string | null;
    lat: number | null;
    lng: number | null;
    datetime: Date;
    category: string;
    notes: string | null;
  };
  idea?: IdeaDraft;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!canEdit) return null;
  const action = async (formData: FormData) => {
    setError(null);
    try {
      const result = await saveFood(tripId, food?.id ?? null, formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
      toast({
        variant: "success",
        title: food ? "Food stop updated" : "Food stop added",
        description: "The itinerary was updated.",
      });
      setOpen(false);
    } catch (error) {
      setError(actionErrorMessage(error));
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={food ? "ghost" : "secondary"} size={food ? "sm" : "default"} className={food ? undefined : "w-full sm:w-auto"}>
          {food ? <Edit /> : <Plus />}
          {food ? "Edit" : idea ? "Add to a day" : "Food"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{food ? "Edit food stop" : idea ? "Plan food idea" : "Add food stop"}</DialogTitle>
          <DialogDescription>Restaurants, cafes, and meal stops appear as their own timeline and map items.</DialogDescription>
        </DialogHeader>
        <form action={action} className="grid gap-4">
          <FormError message={error} />
          {idea ? <input name="convertedIdeaId" type="hidden" value={idea.id} /> : null}
          <FoodCategoryControl defaultValue={food?.category === "coffee" ? "coffee" : "meal"} />
          <Field>
            <FieldLabel>Display title</FieldLabel>
            <Input name="title" defaultValue={food?.title ?? idea?.description ?? ""} placeholder="Brunch at Snooze" />
          </Field>
          <LocationSearch
            label="Food location"
            addressName="address"
            locationNameName="name"
            latName="lat"
            lngName="lng"
            defaultAddress={food?.address ?? idea?.address}
            defaultLocationName={food?.name ?? idea?.locationName}
            defaultLat={food?.lat ?? idea?.lat}
            defaultLng={food?.lng ?? idea?.lng}
            placeholder="Search for a restaurant, cafe, or bar"
          />
          <DateTimeField label="Date and time" name="datetime" value={toDateTimeInputValue(food?.datetime)} required />
          <Field>
            <FieldLabel>Optional link</FieldLabel>
            <Input name="url" type="url" defaultValue={food?.url ?? idea?.url ?? ""} placeholder="https://example.com/menu" />
          </Field>
          <Field>
            <FieldLabel>Notes</FieldLabel>
            <Textarea name="notes" defaultValue={food?.notes ?? idea?.notes ?? ""} />
          </Field>
          <div className="flex justify-end">
            <SubmitButton className="w-full sm:w-auto" pendingText="Saving food">
              <UtensilsCrossed className="size-4" />
              Save food
            </SubmitButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function IdeaBucketItemDialog({
  tripId,
  canEdit,
  item,
  triggerLabel,
}: BaseDialogProps & {
  item?: {
    id: string;
    kind: "housing" | "activity" | "food";
    description: string;
    locationName: string | null;
    address: string | null;
    lat: number | null;
    lng: number | null;
    url: string | null;
    notes: string | null;
  };
  triggerLabel?: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!canEdit) return null;
  const action = async (formData: FormData) => {
    setError(null);
    try {
      const result = await saveIdeaBucketItem(tripId, item?.id ?? null, formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
      toast({
        variant: "success",
        title: item ? "Idea updated" : "Idea added",
        description: "The idea bucket was refreshed.",
      });
      setOpen(false);
    } catch (error) {
      setError(actionErrorMessage(error));
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={item ? "ghost" : "secondary"} size={item ? "sm" : "default"} className={item ? undefined : "w-full sm:w-auto"}>
          {item ? <Edit /> : <Plus />}
          {item ? "Edit" : triggerLabel ?? "Idea"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item ? "Edit idea" : "Add idea"}</DialogTitle>
          <DialogDescription>Capture early options. Ideas with a location appear on the map but not the timeline.</DialogDescription>
        </DialogHeader>
        <form action={action} className="grid gap-4">
          <FormError message={error} />
          <Field>
            <FieldLabel required>Type</FieldLabel>
            <Select name="kind" defaultValue={item?.kind ?? "activity"}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="housing">Housing</SelectItem>
                <SelectItem value="activity">Activity</SelectItem>
                <SelectItem value="food">Food</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel required>Description</FieldLabel>
            <Input name="description" defaultValue={item?.description ?? ""} placeholder="Beachfront stay near the old town" required />
          </Field>
          <LocationSearch
            label="Activity location (optional)"
            addressName="address"
            locationNameName="locationName"
            latName="lat"
            lngName="lng"
            defaultAddress={item?.address}
            defaultLocationName={item?.locationName}
            defaultLat={item?.lat}
            defaultLng={item?.lng}
            placeholder="Search for a place, attraction, or address"
          />
          <Field>
            <FieldLabel>Optional link</FieldLabel>
            <Input name="url" type="url" defaultValue={item?.url ?? ""} placeholder="https://example.com" />
          </Field>
          <Field>
            <FieldLabel>Notes</FieldLabel>
            <Textarea name="notes" defaultValue={item?.notes ?? ""} placeholder="Why this looks promising, tradeoffs, or questions" />
          </Field>
          <div className="flex justify-end">
            <SubmitButton className="w-full sm:w-auto" pendingText="Saving idea">
              <Lightbulb className="size-4" />
              Save idea
            </SubmitButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function PackingItemDialog({
  tripId,
  canEdit,
  item,
  members,
  triggerLabel,
}: BaseDialogProps & {
  item?: {
    id: string;
    name: string;
    category: string;
    quantity: string | null;
    assignedToMemberId: string | null;
    notes: string | null;
    isPacked: boolean;
  };
  members: Array<{ id: string; label: string }>;
  triggerLabel?: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!canEdit) return null;
  const action = async (formData: FormData) => {
    setError(null);
    try {
      const result = await savePackingItem(tripId, item?.id ?? null, formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
      toast({
        variant: "success",
        title: item ? "Packing item updated" : "Packing item added",
        description: "The packing list was refreshed.",
      });
      setOpen(false);
    } catch (error) {
      setError(actionErrorMessage(error));
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={item ? "ghost" : "secondary"} size={item ? "sm" : "default"} className={item ? undefined : "w-full sm:w-auto"}>
          {item ? <Edit /> : <Plus />}
          {item ? "Edit" : triggerLabel ?? "Item"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item ? "Edit packing item" : "Add packing item"}</DialogTitle>
          <DialogDescription>Keep a simple shared checklist for what still needs to make it into the bag.</DialogDescription>
        </DialogHeader>
        <form action={action} className="grid gap-4">
          <FormError message={error} />
          <Field>
            <FieldLabel required>Item name</FieldLabel>
            <Input name="name" defaultValue={item?.name ?? ""} placeholder="Passport" required />
          </Field>
          <Field>
            <FieldLabel required>Category</FieldLabel>
            <Select name="category" defaultValue={item?.category ?? "Other"}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Documents">Documents</SelectItem>
                <SelectItem value="Clothing">Clothing</SelectItem>
                <SelectItem value="Toiletries">Toiletries</SelectItem>
                <SelectItem value="Gear">Gear</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel>Quantity</FieldLabel>
            <Input name="quantity" defaultValue={item?.quantity ?? ""} placeholder="2 pairs" />
          </Field>
          <Field>
            <FieldLabel>Traveler assignment</FieldLabel>
            <Select name="assignedToMemberId" defaultValue={item?.assignedToMemberId ?? "unassigned"}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Anyone</SelectItem>
                {members.map((member) => <SelectItem key={member.id} value={member.id}>{member.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel>Notes</FieldLabel>
            <Textarea name="notes" defaultValue={item?.notes ?? ""} placeholder="Carry-on only" />
          </Field>
          <div className="flex justify-end">
            <SubmitButton className="w-full sm:w-auto" pendingText="Saving item">
              <Backpack className="size-4" />
              Save item
            </SubmitButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
