"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb } from "@/db";
import { activities, food, lodging, travelSegments, tripMembers, trips } from "@/db/schema";
import { requireUser } from "@/lib/auth/server";
import { requireTripRole } from "@/lib/permissions";

const nullableText = z.string().trim().transform((value) => (value ? value : null));
const nullableUrl = z
  .string()
  .trim()
  .transform((value) => (value ? value : null))
  .refine(
    (value) => {
      if (!value) return true;
      try {
        const url = new URL(value);
        return url.protocol === "http:" || url.protocol === "https:";
      } catch {
        return false;
      }
    },
    { message: "Enter a valid http or https URL." },
  );
const selectedCoordinate = z
  .string()
  .trim()
  .min(1, "Select a Mapbox location.")
  .transform(Number)
  .pipe(z.number().finite());
const dateTimeOrNull = z.string().trim().transform((value) => (value ? new Date(value) : null));
const requiredDateTime = z.string().min(1).transform((value) => new Date(value));

const tripSchema = z.object({
  name: z.string().trim().min(1),
  description: nullableText,
  startDate: z.string().min(1),
  endDate: z.string().min(1),
});

function formValue(formData: FormData, name: string) {
  return String(formData.get(name) ?? "");
}

export async function createTrip(formData: FormData) {
  const user = await requireUser();
  const input = tripSchema.parse({
    name: formValue(formData, "name"),
    description: formValue(formData, "description"),
    startDate: formValue(formData, "startDate"),
    endDate: formValue(formData, "endDate"),
  });

  const [trip] = await getDb()
    .insert(trips)
    .values({
      ownerId: user.id,
      name: input.name,
      description: input.description,
      startDate: input.startDate,
      endDate: input.endDate,
    })
    .returning({ id: trips.id });

  await getDb().insert(tripMembers).values({
    tripId: trip.id,
    userId: user.id,
    email: user.email ?? null,
    role: "owner",
  });

  revalidatePath("/trips");
  redirect(`/trips/${trip.id}`);
}

export async function updateTrip(tripId: string, formData: FormData) {
  const user = await requireUser();
  await requireTripRole(tripId, user, "owner");
  const input = tripSchema.parse({
    name: formValue(formData, "name"),
    description: formValue(formData, "description"),
    startDate: formValue(formData, "startDate"),
    endDate: formValue(formData, "endDate"),
  });

  await getDb()
    .update(trips)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(trips.id, tripId));

  revalidatePath(`/trips/${tripId}`);
  redirect(`/trips/${tripId}`);
}

export async function deleteTrip(tripId: string) {
  const user = await requireUser();
  await requireTripRole(tripId, user, "owner");
  await getDb().delete(trips).where(eq(trips.id, tripId));
  revalidatePath("/trips");
  redirect("/trips");
}

const segmentSchema = z.object({
  title: nullableText,
  url: nullableUrl,
  type: z.enum(["flight", "drive"]),
  startLocationName: z.string().trim().min(1),
  startAddress: z.string().trim().min(1),
  startLat: selectedCoordinate,
  startLng: selectedCoordinate,
  endLocationName: z.string().trim().min(1),
  endAddress: z.string().trim().min(1),
  endLat: selectedCoordinate,
  endLng: selectedCoordinate,
  startDatetime: requiredDateTime,
  endDatetime: dateTimeOrNull,
  notes: nullableText,
});

export async function saveSegment(tripId: string, segmentId: string | null, formData: FormData) {
  const user = await requireUser();
  await requireTripRole(tripId, user, "editor");
  const input = segmentSchema.parse(Object.fromEntries(formData));

  if (segmentId) {
    await getDb()
      .update(travelSegments)
      .set({ ...input, updatedAt: new Date() })
      .where(and(eq(travelSegments.id, segmentId), eq(travelSegments.tripId, tripId)));
  } else {
    await getDb().insert(travelSegments).values({ ...input, tripId });
  }

  revalidatePath(`/trips/${tripId}`);
}

export async function deleteSegment(tripId: string, segmentId: string) {
  const user = await requireUser();
  await requireTripRole(tripId, user, "editor");
  await getDb().delete(travelSegments).where(and(eq(travelSegments.id, segmentId), eq(travelSegments.tripId, tripId)));
  revalidatePath(`/trips/${tripId}`);
}

const lodgingSchema = z.object({
  title: nullableText,
  name: z.string().trim().min(1),
  url: nullableUrl,
  address: z.string().trim().min(1),
  lat: selectedCoordinate,
  lng: selectedCoordinate,
  checkIn: requiredDateTime,
  checkOut: dateTimeOrNull,
  notes: nullableText,
});

export async function saveLodging(tripId: string, lodgingId: string | null, formData: FormData) {
  const user = await requireUser();
  await requireTripRole(tripId, user, "editor");
  const input = lodgingSchema.parse(Object.fromEntries(formData));

  if (lodgingId) {
    await getDb()
      .update(lodging)
      .set({ ...input, updatedAt: new Date() })
      .where(and(eq(lodging.id, lodgingId), eq(lodging.tripId, tripId)));
  } else {
    await getDb().insert(lodging).values({ ...input, tripId });
  }

  revalidatePath(`/trips/${tripId}`);
}

export async function deleteLodging(tripId: string, lodgingId: string) {
  const user = await requireUser();
  await requireTripRole(tripId, user, "editor");
  await getDb().delete(lodging).where(and(eq(lodging.id, lodgingId), eq(lodging.tripId, tripId)));
  revalidatePath(`/trips/${tripId}`);
}

const activitySchema = z.object({
  title: nullableText,
  name: z.string().trim().min(1),
  url: nullableUrl,
  address: z.string().trim().min(1),
  lat: selectedCoordinate,
  lng: selectedCoordinate,
  datetime: requiredDateTime,
  category: nullableText,
  includeInRoute: z.string().optional().transform((value) => value === "on"),
  notes: nullableText,
});

const foodSchema = z.object({
  title: nullableText,
  name: z.string().trim().min(1),
  url: nullableUrl,
  address: z.string().trim().min(1),
  lat: selectedCoordinate,
  lng: selectedCoordinate,
  datetime: requiredDateTime,
  notes: nullableText,
});

export async function saveActivity(tripId: string, activityId: string | null, formData: FormData) {
  const user = await requireUser();
  await requireTripRole(tripId, user, "editor");
  const input = activitySchema.parse(Object.fromEntries(formData));

  if (activityId) {
    await getDb()
      .update(activities)
      .set({ ...input, updatedAt: new Date() })
      .where(and(eq(activities.id, activityId), eq(activities.tripId, tripId)));
  } else {
    await getDb().insert(activities).values({ ...input, tripId });
  }

  revalidatePath(`/trips/${tripId}`);
}

export async function deleteActivity(tripId: string, activityId: string) {
  const user = await requireUser();
  await requireTripRole(tripId, user, "editor");
  await getDb().delete(activities).where(and(eq(activities.id, activityId), eq(activities.tripId, tripId)));
  revalidatePath(`/trips/${tripId}`);
}

export async function saveFood(tripId: string, foodId: string | null, formData: FormData) {
  const user = await requireUser();
  await requireTripRole(tripId, user, "editor");
  const input = foodSchema.parse(Object.fromEntries(formData));

  if (foodId) {
    await getDb()
      .update(food)
      .set({ ...input, updatedAt: new Date() })
      .where(and(eq(food.id, foodId), eq(food.tripId, tripId)));
  } else {
    await getDb().insert(food).values({ ...input, tripId });
  }

  revalidatePath(`/trips/${tripId}`);
}

export async function deleteFood(tripId: string, foodId: string) {
  const user = await requireUser();
  await requireTripRole(tripId, user, "editor");
  await getDb().delete(food).where(and(eq(food.id, foodId), eq(food.tripId, tripId)));
  revalidatePath(`/trips/${tripId}`);
}

export async function addMember(tripId: string, formData: FormData) {
  const user = await requireUser();
  await requireTripRole(tripId, user, "owner");
  const email = z.string().trim().email().parse(formValue(formData, "email"));
  const role = z.enum(["editor", "viewer"]).parse(formValue(formData, "role"));

  const existing = await getDb()
    .select({ id: tripMembers.id })
    .from(tripMembers)
    .where(and(eq(tripMembers.tripId, tripId), sql`lower(${tripMembers.email}) = lower(${email})`))
    .limit(1);

  if (existing[0]) {
    await getDb()
      .update(tripMembers)
      .set({ role, updatedAt: new Date() })
      .where(eq(tripMembers.id, existing[0].id));
  } else {
    await getDb().insert(tripMembers).values({ tripId, email, role });
  }

  revalidatePath(`/trips/${tripId}/members`);
}

export async function updateMemberRole(tripId: string, memberId: string, formData: FormData) {
  const user = await requireUser();
  await requireTripRole(tripId, user, "owner");
  const role = z.enum(["editor", "viewer"]).parse(formValue(formData, "role"));

  await getDb()
    .update(tripMembers)
    .set({ role, updatedAt: new Date() })
    .where(and(eq(tripMembers.id, memberId), eq(tripMembers.tripId, tripId)));

  revalidatePath(`/trips/${tripId}/members`);
}

export async function removeMember(tripId: string, memberId: string) {
  const user = await requireUser();
  await requireTripRole(tripId, user, "owner");

  await getDb()
    .delete(tripMembers)
    .where(and(eq(tripMembers.id, memberId), eq(tripMembers.tripId, tripId)));

  revalidatePath(`/trips/${tripId}/members`);
}
