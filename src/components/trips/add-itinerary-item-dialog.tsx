"use client";

import { Hotel, MapPin, Plane, Plus, UtensilsCrossed } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { saveActivity, saveFood, saveLodging, saveSegment } from "@/app/actions";
import { FoodCategoryControl } from "@/components/trips/food-category-control";
import { LocationSearch } from "@/components/trips/location-search";
import { actionErrorMessage } from "@/components/trips/mutation-feedback";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast-provider";
import { cn } from "@/lib/utils";

type ItemKind = "travel" | "lodging" | "activity" | "food";

const itemTypes = [
  { id: "travel" as const, label: "Travel", icon: Plane },
  { id: "lodging" as const, label: "Lodging", icon: Hotel },
  { id: "activity" as const, label: "Activity", icon: MapPin },
  { id: "food" as const, label: "Food", icon: UtensilsCrossed },
];

function offsetMinutes(value: string) {
  return value ? String(new Date(value).getTimezoneOffset()) : "";
}

function DateTimeField({ label, name, value, required }: { label: string; name: string; value: string; required?: boolean }) {
  const [currentValue, setCurrentValue] = useState(value);
  return (
    <Field>
      <FieldLabel required={required}>{label}</FieldLabel>
      <Input name={name} type="datetime-local" value={currentValue} onChange={(event) => setCurrentValue(event.target.value)} required={required} />
      <input name={`${name}OffsetMinutes`} type="hidden" value={offsetMinutes(currentValue)} readOnly suppressHydrationWarning />
    </Field>
  );
}

function FormError({ message }: { message: string | null }) {
  return message ? <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">{message}</p> : null;
}

export function AddItineraryItemDialog({ tripId, canEdit, defaultDay }: { tripId: string; canEdit: boolean; defaultDay: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<ItemKind>("activity");
  const [error, setError] = useState<string | null>(null);

  if (!canEdit) return null;

  async function action(formData: FormData) {
    setError(null);
    try {
      const result = kind === "travel"
        ? await saveSegment(tripId, null, formData)
        : kind === "lodging"
          ? await saveLodging(tripId, null, formData)
          : kind === "activity"
            ? await saveActivity(tripId, null, formData)
            : await saveFood(tripId, null, formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
      toast({ variant: "success", title: `${itemTypes.find((item) => item.id === kind)?.label} added`, description: "The itinerary and map were refreshed." });
      setOpen(false);
    } catch (actionError) {
      setError(actionErrorMessage(actionError));
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { setOpen(nextOpen); if (!nextOpen) setError(null); }}>
      <DialogTrigger asChild>
        <Button className="h-10 w-full px-4 sm:w-auto"><Plus className="size-4" /> Add</Button>
      </DialogTrigger>
      <DialogContent className="gap-5">
        <DialogHeader>
          <DialogTitle>Add to itinerary</DialogTitle>
          <DialogDescription>Choose what you are adding, then enter the details for the selected day.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-4 gap-1 rounded-xl bg-muted p-1" role="tablist" aria-label="Itinerary item type">
          {itemTypes.map((item) => {
            const Icon = item.icon;
            const active = kind === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                className={cn("flex min-h-11 min-w-0 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-muted-foreground transition-colors sm:text-sm", active && "bg-card text-primary shadow-sm")}
                onClick={() => { setKind(item.id); setError(null); }}
              >
                <Icon className="size-4 shrink-0" /><span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>

        <form key={`${kind}-${defaultDay}`} action={action} className="grid gap-4">
          <FormError message={error} />
          {kind === "travel" ? <TravelFields day={defaultDay} /> : null}
          {kind === "lodging" ? <LodgingFields day={defaultDay} /> : null}
          {kind === "activity" ? <ActivityFields day={defaultDay} /> : null}
          {kind === "food" ? <FoodFields day={defaultDay} /> : null}
          <div className="sticky bottom-0 flex justify-end border-t bg-background pt-4">
            <SubmitButton className="w-full sm:w-auto" pendingText="Adding item"><Plus className="size-4" /> Add {kind}</SubmitButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SharedFields({ linkPlaceholder }: { linkPlaceholder: string }) {
  return (
    <>
      <Field><FieldLabel>Optional link</FieldLabel><Input name="url" type="url" placeholder={linkPlaceholder} /></Field>
      <Field><FieldLabel>Notes</FieldLabel><Textarea name="notes" placeholder="Reservation details, reminders, or context" /></Field>
    </>
  );
}

function TravelFields({ day }: { day: string }) {
  return (
    <>
      <Field><FieldLabel>Display title</FieldLabel><Input name="title" placeholder="Flight to Denver" /></Field>
      <Field>
        <FieldLabel required>Travel type</FieldLabel>
        <Select name="type" defaultValue="drive"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="drive">Drive</SelectItem><SelectItem value="flight">Flight</SelectItem></SelectContent></Select>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <LocationSearch label="Start location" addressName="startAddress" locationNameName="startLocationName" latName="startLat" lngName="startLng" placeholder="Search for a departure point" />
        <LocationSearch label="End location" addressName="endAddress" locationNameName="endLocationName" latName="endLat" lngName="endLng" placeholder="Search for an arrival point" />
        <DateTimeField label="Start time" name="startDatetime" value={`${day}T09:00`} required />
        <DateTimeField label="End time" name="endDatetime" value="" />
      </div>
      <SharedFields linkPlaceholder="https://example.com/booking" />
    </>
  );
}

function LodgingFields({ day }: { day: string }) {
  return (
    <>
      <Field><FieldLabel>Display title</FieldLabel><Input name="title" placeholder="Beach house check-in" /></Field>
      <LocationSearch label="Lodging location" addressName="address" locationNameName="name" latName="lat" lngName="lng" placeholder="Search for a hotel, stay, or address" />
      <div className="grid gap-4 sm:grid-cols-2">
        <DateTimeField label="Check-in" name="checkIn" value={`${day}T15:00`} required />
        <DateTimeField label="Check-out" name="checkOut" value="" />
      </div>
      <SharedFields linkPlaceholder="https://example.com/hotel" />
    </>
  );
}

function ActivityFields({ day }: { day: string }) {
  return (
    <>
      <Field><FieldLabel>Display title</FieldLabel><Input name="title" placeholder="Museum visit" /></Field>
      <LocationSearch label="Activity location" addressName="address" locationNameName="name" latName="lat" lngName="lng" placeholder="Search for a place, attraction, or address" />
      <DateTimeField label="Date and time" name="datetime" value={`${day}T10:00`} required />
      <label className="flex min-h-11 items-center gap-2 rounded-lg border px-3 text-sm"><input name="includeInRoute" type="checkbox" defaultChecked className="size-4 rounded border-input" /> Include in route optimization</label>
      <SharedFields linkPlaceholder="https://example.com/tickets" />
    </>
  );
}

function FoodFields({ day }: { day: string }) {
  return (
    <>
      <FoodCategoryControl />
      <Field><FieldLabel>Display title</FieldLabel><Input name="title" placeholder="Lunch reservation" /></Field>
      <LocationSearch label="Food location" addressName="address" locationNameName="name" latName="lat" lngName="lng" placeholder="Search for a restaurant or cafe" />
      <DateTimeField label="Date and time" name="datetime" value={`${day}T12:00`} required />
      <SharedFields linkPlaceholder="https://example.com/menu" />
    </>
  );
}
