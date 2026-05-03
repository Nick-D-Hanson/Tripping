"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb } from "@/db";
import { activities, food, ideaBucketItems, lodging, packingItems, travelSegments, tripMembers, trips } from "@/db/schema";
import { requireUser } from "@/lib/auth/server";
import { requireTripRole } from "@/lib/permissions";

type ActionResult = { ok: true } | { ok: false; error: string };

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
const requiredDateTime = z.date();
const optionalDateTime = z.date().nullable();
const requiredLocationText = (message: string) => z.string().trim().min(1, message);

const tripSchema = z.object({
  name: z.string().trim().min(1),
  description: nullableText,
  startDate: z.string().min(1),
  endDate: z.string().min(1),
});

function validationError(error: unknown): ActionResult {
  if (error instanceof z.ZodError) {
    const issue = error.issues[0];
    return { ok: false, error: issue?.message ?? "Check the highlighted fields and try again." };
  }

  if (error instanceof Error) {
    return { ok: false, error: error.message };
  }

  return { ok: false, error: "Check the form fields and try again." };
}

function formValue(formData: FormData, name: string) {
  return String(formData.get(name) ?? "");
}

function parseDateTimeParts(value: string) {
  const match = value
    .trim()
    .match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/);

  if (!match) {
    throw new Error(`Invalid date/time value for ${value}.`);
  }

  const [, year, month, day, hour, minute] = match;

  return {
    year: Number(year),
    month: Number(month),
    day: Number(day),
    hour: Number(hour),
    minute: Number(minute),
  };
}

function parseDateTimeOffset(formData: FormData, name: string) {
  const rawOffset = formValue(formData, `${name}OffsetMinutes`).trim();
  const offsetMinutes = Number(rawOffset);

  if (!rawOffset || !Number.isFinite(offsetMinutes)) {
    throw new Error(`Missing timezone offset for ${name}.`);
  }

  return offsetMinutes;
}

function parseRequiredLocalDateTime(formData: FormData, name: string) {
  const value = formValue(formData, name).trim();

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  const { year, month, day, hour, minute } = parseDateTimeParts(value);
  const offsetMinutes = parseDateTimeOffset(formData, name);

  return new Date(Date.UTC(year, month - 1, day, hour, minute) + offsetMinutes * 60_000);
}

function parseOptionalLocalDateTime(formData: FormData, name: string) {
  const value = formValue(formData, name).trim();

  if (!value) {
    return null;
  }

  const { year, month, day, hour, minute } = parseDateTimeParts(value);
  const offsetMinutes = parseDateTimeOffset(formData, name);

  return new Date(Date.UTC(year, month - 1, day, hour, minute) + offsetMinutes * 60_000);
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

export async function deleteTripWithConfirmation(tripId: string, expectedName: string, formData: FormData) {
  const user = await requireUser();
  await requireTripRole(tripId, user, "owner");
  const confirmation = z.string().trim().min(1).parse(formValue(formData, "tripNameConfirmation"));

  if (confirmation !== expectedName) {
    throw new Error("Trip name confirmation did not match.");
  }

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
  endDatetime: optionalDateTime,
  notes: nullableText,
});

export async function saveSegment(tripId: string, segmentId: string | null, formData: FormData) {
  const user = await requireUser();
  await requireTripRole(tripId, user, "editor");
  const input = (() => {
    try {
      return segmentSchema.parse({
        title: formValue(formData, "title"),
        url: formValue(formData, "url"),
        type: formValue(formData, "type"),
        startLocationName: formValue(formData, "startLocationName"),
        startAddress: formValue(formData, "startAddress"),
        startLat: formValue(formData, "startLat"),
        startLng: formValue(formData, "startLng"),
        endLocationName: formValue(formData, "endLocationName"),
        endAddress: formValue(formData, "endAddress"),
        endLat: formValue(formData, "endLat"),
        endLng: formValue(formData, "endLng"),
        startDatetime: parseRequiredLocalDateTime(formData, "startDatetime"),
        endDatetime: parseOptionalLocalDateTime(formData, "endDatetime"),
        notes: formValue(formData, "notes"),
      });
    } catch (error) {
      return validationError(error);
    }
  })();

  if ("ok" in input) return input;

  if (segmentId) {
    await getDb()
      .update(travelSegments)
      .set({ ...input, updatedAt: new Date() })
      .where(and(eq(travelSegments.id, segmentId), eq(travelSegments.tripId, tripId)));
  } else {
    await getDb().insert(travelSegments).values({ ...input, tripId });
  }

  revalidatePath(`/trips/${tripId}`);
  return { ok: true } satisfies ActionResult;
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
  checkOut: optionalDateTime,
  notes: nullableText,
});

export async function saveLodging(tripId: string, lodgingId: string | null, formData: FormData) {
  const user = await requireUser();
  await requireTripRole(tripId, user, "editor");
  const convertedIdeaId = formValue(formData, "convertedIdeaId").trim();
  const input = (() => {
    try {
      return lodgingSchema.parse({
        title: formValue(formData, "title"),
        name: formValue(formData, "name"),
        url: formValue(formData, "url"),
        address: formValue(formData, "address"),
        lat: formValue(formData, "lat"),
        lng: formValue(formData, "lng"),
        checkIn: parseRequiredLocalDateTime(formData, "checkIn"),
        checkOut: parseOptionalLocalDateTime(formData, "checkOut"),
        notes: formValue(formData, "notes"),
      });
    } catch (error) {
      return validationError(error);
    }
  })();

  if ("ok" in input) return input;

  if (lodgingId) {
    await getDb()
      .update(lodging)
      .set({ ...input, updatedAt: new Date() })
      .where(and(eq(lodging.id, lodgingId), eq(lodging.tripId, tripId)));
  } else {
    await getDb().insert(lodging).values({ ...input, tripId });
  }

  if (convertedIdeaId) {
    await getDb().delete(ideaBucketItems).where(and(eq(ideaBucketItems.id, convertedIdeaId), eq(ideaBucketItems.tripId, tripId)));
  }

  revalidatePath(`/trips/${tripId}`);
  return { ok: true } satisfies ActionResult;
}

export async function deleteLodging(tripId: string, lodgingId: string) {
  const user = await requireUser();
  await requireTripRole(tripId, user, "editor");
  await getDb().delete(lodging).where(and(eq(lodging.id, lodgingId), eq(lodging.tripId, tripId)));
  revalidatePath(`/trips/${tripId}`);
}

const activitySchema = z.object({
  title: nullableText,
  name: requiredLocationText("Select an activity location from the search results."),
  url: nullableUrl,
  address: requiredLocationText("Select an activity location from the search results."),
  lat: selectedCoordinate,
  lng: selectedCoordinate,
  datetime: requiredDateTime,
  category: z.null(),
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

const packingItemSchema = z.object({
  name: z.string().trim().min(1),
  quantity: nullableText,
  notes: nullableText,
});

const ideaBucketItemSchema = z.object({
  kind: z.enum(["housing", "activity", "food"]),
  description: z.string().trim().min(1),
  url: nullableUrl,
  notes: nullableText,
});

export async function saveActivity(tripId: string, activityId: string | null, formData: FormData) {
  const user = await requireUser();
  await requireTripRole(tripId, user, "editor");
  const convertedIdeaId = formValue(formData, "convertedIdeaId").trim();
  const input = (() => {
    try {
      return activitySchema.parse({
        title: formValue(formData, "title"),
        name: formValue(formData, "name"),
        url: formValue(formData, "url"),
        address: formValue(formData, "address"),
        lat: formValue(formData, "lat"),
        lng: formValue(formData, "lng"),
        datetime: parseRequiredLocalDateTime(formData, "datetime"),
        category: null,
        includeInRoute: formData.get("includeInRoute") ?? undefined,
        notes: formValue(formData, "notes"),
      });
    } catch (error) {
      return validationError(error);
    }
  })();

  if ("ok" in input) return input;

  if (activityId) {
    await getDb()
      .update(activities)
      .set({ ...input, updatedAt: new Date() })
      .where(and(eq(activities.id, activityId), eq(activities.tripId, tripId)));
  } else {
    await getDb().insert(activities).values({ ...input, tripId });
  }

  if (convertedIdeaId) {
    await getDb().delete(ideaBucketItems).where(and(eq(ideaBucketItems.id, convertedIdeaId), eq(ideaBucketItems.tripId, tripId)));
  }

  revalidatePath(`/trips/${tripId}`);
  return { ok: true } satisfies ActionResult;
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
  const convertedIdeaId = formValue(formData, "convertedIdeaId").trim();
  const input = (() => {
    try {
      return foodSchema.parse({
        title: formValue(formData, "title"),
        name: formValue(formData, "name"),
        url: formValue(formData, "url"),
        address: formValue(formData, "address"),
        lat: formValue(formData, "lat"),
        lng: formValue(formData, "lng"),
        datetime: parseRequiredLocalDateTime(formData, "datetime"),
        notes: formValue(formData, "notes"),
      });
    } catch (error) {
      return validationError(error);
    }
  })();

  if ("ok" in input) return input;

  if (foodId) {
    await getDb()
      .update(food)
      .set({ ...input, updatedAt: new Date() })
      .where(and(eq(food.id, foodId), eq(food.tripId, tripId)));
  } else {
    await getDb().insert(food).values({ ...input, tripId });
  }

  if (convertedIdeaId) {
    await getDb().delete(ideaBucketItems).where(and(eq(ideaBucketItems.id, convertedIdeaId), eq(ideaBucketItems.tripId, tripId)));
  }

  revalidatePath(`/trips/${tripId}`);
  return { ok: true } satisfies ActionResult;
}

export async function deleteFood(tripId: string, foodId: string) {
  const user = await requireUser();
  await requireTripRole(tripId, user, "editor");
  await getDb().delete(food).where(and(eq(food.id, foodId), eq(food.tripId, tripId)));
  revalidatePath(`/trips/${tripId}`);
}

export async function savePackingItem(tripId: string, itemId: string | null, formData: FormData) {
  const user = await requireUser();
  await requireTripRole(tripId, user, "editor");
  const input = (() => {
    try {
      return packingItemSchema.parse(Object.fromEntries(formData));
    } catch (error) {
      return validationError(error);
    }
  })();

  if ("ok" in input) return input;

  if (itemId) {
    await getDb()
      .update(packingItems)
      .set({ ...input, updatedAt: new Date() })
      .where(and(eq(packingItems.id, itemId), eq(packingItems.tripId, tripId)));
  } else {
    await getDb().insert(packingItems).values({
      ...input,
      tripId,
      createdByUserId: user.id,
    });
  }

  revalidatePath(`/trips/${tripId}`);
  return { ok: true } satisfies ActionResult;
}

export async function togglePackingItem(tripId: string, itemId: string, nextPackedState: boolean) {
  const user = await requireUser();
  await requireTripRole(tripId, user, "editor");
  await getDb()
    .update(packingItems)
    .set({ isPacked: nextPackedState, updatedAt: new Date() })
    .where(and(eq(packingItems.id, itemId), eq(packingItems.tripId, tripId)));

  revalidatePath(`/trips/${tripId}`);
}

export async function deletePackingItem(tripId: string, itemId: string) {
  const user = await requireUser();
  await requireTripRole(tripId, user, "editor");
  await getDb().delete(packingItems).where(and(eq(packingItems.id, itemId), eq(packingItems.tripId, tripId)));
  revalidatePath(`/trips/${tripId}`);
}

export async function saveIdeaBucketItem(tripId: string, itemId: string | null, formData: FormData) {
  const user = await requireUser();
  await requireTripRole(tripId, user, "editor");
  const input = (() => {
    try {
      return ideaBucketItemSchema.parse({
        kind: formValue(formData, "kind"),
        description: formValue(formData, "description"),
        url: formValue(formData, "url"),
        notes: formValue(formData, "notes"),
      });
    } catch (error) {
      return validationError(error);
    }
  })();

  if ("ok" in input) return input;

  if (itemId) {
    await getDb()
      .update(ideaBucketItems)
      .set({ ...input, updatedAt: new Date() })
      .where(and(eq(ideaBucketItems.id, itemId), eq(ideaBucketItems.tripId, tripId)));
  } else {
    await getDb().insert(ideaBucketItems).values({
      ...input,
      tripId,
      createdByUserId: user.id,
    });
  }

  revalidatePath(`/trips/${tripId}`);
  return { ok: true } satisfies ActionResult;
}

export async function deleteIdeaBucketItem(tripId: string, itemId: string) {
  const user = await requireUser();
  await requireTripRole(tripId, user, "editor");
  await getDb().delete(ideaBucketItems).where(and(eq(ideaBucketItems.id, itemId), eq(ideaBucketItems.tripId, tripId)));
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
