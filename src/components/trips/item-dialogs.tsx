"use client";

import { Backpack, Edit, Hotel, MapPin, Plane, Plus, UtensilsCrossed } from "lucide-react";
import { useState } from "react";
import { saveActivity, saveFood, saveLodging, savePackingItem, saveSegment } from "@/app/actions";
import { LocationSearch } from "@/components/trips/location-search";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toDateTimeInputValue } from "@/lib/dates";

type BaseDialogProps = {
  tripId: string;
  canEdit: boolean;
};

function SubmitButton({ children }: { children: React.ReactNode }) {
  return (
    <Button type="submit" className="w-full sm:w-auto">
      {children}
    </Button>
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
    <div className="grid gap-2">
      <Label>{label}</Label>
      <Input
        name={name}
        type="datetime-local"
        value={currentValue}
        onChange={(event) => setCurrentValue(event.target.value)}
        required={required}
      />
      <input name={`${name}OffsetMinutes`} type="hidden" value={getOffsetMinutes(currentValue)} readOnly suppressHydrationWarning />
    </div>
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
  const [open, setOpen] = useState(false);
  if (!canEdit) return null;
  const action = async (formData: FormData) => {
    await saveSegment(tripId, segment?.id ?? null, formData);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={segment ? "ghost" : "outline"} size={segment ? "sm" : "default"} className={segment ? undefined : "w-full sm:w-auto"}>
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
          <div className="grid gap-2">
            <Label>Display title</Label>
            <Input name="title" defaultValue={segment?.title ?? ""} placeholder="Flight to Denver" />
          </div>
          <div className="grid gap-2">
            <Label>Type</Label>
            <Select name="type" defaultValue={segment?.type === "flight" ? "flight" : "drive"}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="drive">Drive</SelectItem>
                <SelectItem value="flight">Flight</SelectItem>
              </SelectContent>
            </Select>
          </div>
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
          <div className="grid gap-2">
            <Label>Optional link</Label>
            <Input name="url" type="url" defaultValue={segment?.url ?? ""} placeholder="https://example.com/booking" />
          </div>
          <div className="grid gap-2">
            <Label>Notes</Label>
            <Textarea name="notes" defaultValue={segment?.notes ?? ""} />
          </div>
          <div className="flex justify-end">
            <SubmitButton><Plane className="size-4" /> Save segment</SubmitButton>
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
}) {
  const [open, setOpen] = useState(false);
  if (!canEdit) return null;
  const action = async (formData: FormData) => {
    await saveLodging(tripId, stay?.id ?? null, formData);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={stay ? "ghost" : "outline"} size={stay ? "sm" : "default"} className={stay ? undefined : "w-full sm:w-auto"}>
          {stay ? <Edit /> : <Plus />}
          {stay ? "Edit" : "Lodging"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{stay ? "Edit lodging" : "Add lodging"}</DialogTitle>
          <DialogDescription>Stays appear as distinct pins and timeline entries.</DialogDescription>
        </DialogHeader>
        <form action={action} className="grid gap-4">
          <div className="grid gap-2">
            <Label>Display title</Label>
            <Input name="title" defaultValue={stay?.title ?? ""} placeholder="Mountain lodge check-in" />
          </div>
          <LocationSearch
            label="Lodging location"
            addressName="address"
            locationNameName="name"
            latName="lat"
            lngName="lng"
            defaultAddress={stay?.address}
            defaultLocationName={stay?.name}
            defaultLat={stay?.lat}
            defaultLng={stay?.lng}
            placeholder="Search for a hotel, stay, or address"
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <DateTimeField label="Check-in" name="checkIn" value={toDateTimeInputValue(stay?.checkIn)} required />
            <DateTimeField label="Check-out" name="checkOut" value={toDateTimeInputValue(stay?.checkOut)} />
          </div>
          <div className="grid gap-2">
            <Label>Optional link</Label>
            <Input name="url" type="url" defaultValue={stay?.url ?? ""} placeholder="https://example.com/hotel" />
          </div>
          <div className="grid gap-2"><Label>Notes</Label><Textarea name="notes" defaultValue={stay?.notes ?? ""} /></div>
          <div className="flex justify-end"><SubmitButton><Hotel className="size-4" /> Save lodging</SubmitButton></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ActivityDialog({
  tripId,
  canEdit,
  activity,
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
    category: string | null;
    includeInRoute: boolean;
    notes: string | null;
  };
}) {
  const [open, setOpen] = useState(false);
  if (!canEdit) return null;
  const action = async (formData: FormData) => {
    await saveActivity(tripId, activity?.id ?? null, formData);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={activity ? "ghost" : "outline"} size={activity ? "sm" : "default"} className={activity ? undefined : "w-full sm:w-auto"}>
          {activity ? <Edit /> : <Plus />}
          {activity ? "Edit" : "Activity"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{activity ? "Edit activity" : "Add activity"}</DialogTitle>
          <DialogDescription>Choose whether this stop should be eligible for route optimization.</DialogDescription>
        </DialogHeader>
        <form action={action} className="grid gap-4">
          <div className="grid gap-2">
            <Label>Display title</Label>
            <Input name="title" defaultValue={activity?.title ?? ""} placeholder="Dinner reservation" />
          </div>
          <LocationSearch
            label="Activity location"
            addressName="address"
            locationNameName="name"
            latName="lat"
            lngName="lng"
            defaultAddress={activity?.address}
            defaultLocationName={activity?.name}
            defaultLat={activity?.lat}
            defaultLng={activity?.lng}
            placeholder="Search for a place, attraction, or address"
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2"><Label>Category</Label><Input name="category" defaultValue={activity?.category ?? ""} /></div>
            <DateTimeField label="Date and time" name="datetime" value={toDateTimeInputValue(activity?.datetime)} required />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input name="includeInRoute" type="checkbox" defaultChecked={activity?.includeInRoute} className="size-4 rounded border-input" />
            Include in route optimization
          </label>
          <div className="grid gap-2">
            <Label>Optional link</Label>
            <Input name="url" type="url" defaultValue={activity?.url ?? ""} placeholder="https://example.com/tickets" />
          </div>
          <div className="grid gap-2"><Label>Notes</Label><Textarea name="notes" defaultValue={activity?.notes ?? ""} /></div>
          <div className="flex justify-end"><SubmitButton><MapPin className="size-4" /> Save activity</SubmitButton></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function FoodDialog({
  tripId,
  canEdit,
  food,
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
    notes: string | null;
  };
}) {
  const [open, setOpen] = useState(false);
  if (!canEdit) return null;
  const action = async (formData: FormData) => {
    await saveFood(tripId, food?.id ?? null, formData);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={food ? "ghost" : "outline"} size={food ? "sm" : "default"} className={food ? undefined : "w-full sm:w-auto"}>
          {food ? <Edit /> : <Plus />}
          {food ? "Edit" : "Food"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{food ? "Edit food stop" : "Add food stop"}</DialogTitle>
          <DialogDescription>Restaurants, cafes, and meal stops appear as their own timeline and map items.</DialogDescription>
        </DialogHeader>
        <form action={action} className="grid gap-4">
          <div className="grid gap-2">
            <Label>Display title</Label>
            <Input name="title" defaultValue={food?.title ?? ""} placeholder="Brunch at Snooze" />
          </div>
          <LocationSearch
            label="Food location"
            addressName="address"
            locationNameName="name"
            latName="lat"
            lngName="lng"
            defaultAddress={food?.address}
            defaultLocationName={food?.name}
            defaultLat={food?.lat}
            defaultLng={food?.lng}
            placeholder="Search for a restaurant, cafe, or bar"
          />
          <DateTimeField label="Date and time" name="datetime" value={toDateTimeInputValue(food?.datetime)} required />
          <div className="grid gap-2">
            <Label>Optional link</Label>
            <Input name="url" type="url" defaultValue={food?.url ?? ""} placeholder="https://example.com/menu" />
          </div>
          <div className="grid gap-2">
            <Label>Notes</Label>
            <Textarea name="notes" defaultValue={food?.notes ?? ""} />
          </div>
          <div className="flex justify-end"><SubmitButton><UtensilsCrossed className="size-4" /> Save food</SubmitButton></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function PackingItemDialog({
  tripId,
  canEdit,
  item,
}: BaseDialogProps & {
  item?: {
    id: string;
    name: string;
    quantity: string | null;
    notes: string | null;
    isPacked: boolean;
  };
}) {
  const [open, setOpen] = useState(false);
  if (!canEdit) return null;
  const action = async (formData: FormData) => {
    await savePackingItem(tripId, item?.id ?? null, formData);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={item ? "ghost" : "outline"} size={item ? "sm" : "default"} className={item ? undefined : "w-full sm:w-auto"}>
          {item ? <Edit /> : <Plus />}
          {item ? "Edit" : "Item"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item ? "Edit packing item" : "Add packing item"}</DialogTitle>
          <DialogDescription>Keep a simple shared checklist for what still needs to make it into the bag.</DialogDescription>
        </DialogHeader>
        <form action={action} className="grid gap-4">
          <div className="grid gap-2">
            <Label>Item name</Label>
            <Input name="name" defaultValue={item?.name ?? ""} placeholder="Passport" required />
          </div>
          <div className="grid gap-2">
            <Label>Quantity</Label>
            <Input name="quantity" defaultValue={item?.quantity ?? ""} placeholder="2 pairs" />
          </div>
          <div className="grid gap-2">
            <Label>Notes</Label>
            <Textarea name="notes" defaultValue={item?.notes ?? ""} placeholder="Carry-on only" />
          </div>
          <div className="flex justify-end">
            <SubmitButton><Backpack className="size-4" /> Save item</SubmitButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
