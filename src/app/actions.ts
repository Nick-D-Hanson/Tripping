"use server";

import { and, eq, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb } from "@/db";
import { activities, food, ideaBucketItems, lodging, packingItems, travelSegments, tripMembers, trips } from "@/db/schema";
import { recordAuditEvent } from "@/lib/audit";
import { requireUser } from "@/lib/auth/server";
import { tripCoreTag, tripIdeasTag, tripItineraryTag, tripPackingTag } from "@/lib/cache-tags";
import { getClientIp, getRequestId, logInfo, timeAsync } from "@/lib/observability";
import { requireTripRole } from "@/lib/permissions";
import { checkRateLimit } from "@/lib/rate-limit";

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
const optionalCoordinate = z
  .string()
  .trim()
  .transform((value) => (value ? Number(value) : null))
  .pipe(z.number().finite().nullable());
const requiredDateTime = z.date();
const optionalDateTime = z.date().nullable();
const requiredLocationText = (message: string) => z.string().trim().min(1, message);

const tripSchema = z
  .object({
    name: z.string().trim().min(1),
    description: nullableText,
    startDate: z.string().min(1),
    endDate: z.string().min(1),
  })
  .refine((value) => value.endDate >= value.startDate, {
    message: "Trip end date must be on or after the start date.",
    path: ["endDate"],
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

async function enforceMutationRateLimit(actionName: string, actorId: string) {
  const requestHeaders = await headers();
  const identity = `${actorId}:${getClientIp(requestHeaders)}`;
  const limit = checkRateLimit({
    key: `action:${actionName}:${identity}`,
    limit: 30,
    windowMs: 60_000,
  });

  if (!limit.allowed) {
    throw new Error("Too many write requests. Please wait a moment and try again.");
  }

  return {
    requestId: getRequestId(requestHeaders),
    ip: getClientIp(requestHeaders),
  };
}

async function logMutation(actionName: string, payload: Record<string, unknown>, fn: () => Promise<void>) {
  const { durationMs } = await timeAsync(fn);
  logInfo("mutation.success", {
    actionName,
    durationMs,
    ...payload,
  });
}

function refreshTripCore(tripId: string) {
  updateTag(tripCoreTag(tripId));
}

function refreshTripItinerary(tripId: string) {
  updateTag(tripItineraryTag(tripId));
}

function refreshTripPacking(tripId: string) {
  updateTag(tripPackingTag(tripId));
}

function refreshTripIdeas(tripId: string) {
  updateTag(tripIdeasTag(tripId));
}

async function auditMutation(input: {
  tripId?: string | null;
  actorUserId: string;
  action:
    | "trip_created"
    | "trip_updated"
    | "trip_deleted"
    | "member_invited"
    | "member_role_updated"
    | "member_removed"
    | "trip_item_saved"
    | "trip_item_deleted"
    | "packing_item_toggled";
  targetType: string;
  targetId?: string | null;
  requestId: string;
  ipAddress: string;
  metadata?: Record<string, unknown>;
}) {
  await recordAuditEvent({
    tripId: input.tripId,
    actorUserId: input.actorUserId,
    action: input.action,
    targetType: input.targetType,
    targetId: input.targetId,
    requestId: input.requestId,
    ipAddress: input.ipAddress,
    metadata: input.metadata,
  });
}

async function requireEditorMutationContext(actionName: string, tripId: string, minimum: "editor" | "owner" = "editor") {
  const user = await requireUser();
  const context = await enforceMutationRateLimit(actionName, user.id);
  await requireTripRole(tripId, user, minimum);

  return { user, context };
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
  const context = await enforceMutationRateLimit("createTrip", user.id);
  const input = tripSchema.parse({
    name: formValue(formData, "name"),
    description: formValue(formData, "description"),
    startDate: formValue(formData, "startDate"),
    endDate: formValue(formData, "endDate"),
  });

  const [trip] = await timeAsync(async () =>
    getDb()
      .insert(trips)
      .values({
        ownerId: user.id,
        name: input.name,
        description: input.description,
        startDate: input.startDate,
        endDate: input.endDate,
      })
      .returning({ id: trips.id }),
  ).then(async ({ durationMs, result }) => {
    const createdTrip = result[0];

    await getDb().insert(tripMembers).values({
      tripId: createdTrip.id,
      userId: user.id,
      email: user.email ?? null,
      role: "owner",
    });

    logInfo("mutation.success", {
      actionName: "createTrip",
      requestId: context.requestId,
      ip: context.ip,
      actorId: user.id,
      tripId: createdTrip.id,
      durationMs,
    });

    await auditMutation({
      tripId: createdTrip.id,
      actorUserId: user.id,
      action: "trip_created",
      targetType: "trip",
      targetId: createdTrip.id,
      requestId: context.requestId,
      ipAddress: context.ip,
      metadata: {
        name: input.name,
        startDate: input.startDate,
        endDate: input.endDate,
      },
    });

    return [createdTrip];
  });

  refreshTripCore(trip.id);
  revalidatePath("/trips");
  redirect(`/trips/${trip.id}?notice=trip-created`);
}

export async function updateTrip(tripId: string, formData: FormData) {
  const user = await requireUser();
  const context = await enforceMutationRateLimit("updateTrip", user.id);
  await requireTripRole(tripId, user, "owner");
  const input = tripSchema.parse({
    name: formValue(formData, "name"),
    description: formValue(formData, "description"),
    startDate: formValue(formData, "startDate"),
    endDate: formValue(formData, "endDate"),
  });

  await logMutation(
    "updateTrip",
    {
      requestId: context.requestId,
      ip: context.ip,
      actorId: user.id,
      tripId,
    },
    async () => {
      await getDb()
        .update(trips)
        .set({ ...input, updatedAt: new Date() })
        .where(eq(trips.id, tripId));

      await auditMutation({
        tripId,
        actorUserId: user.id,
        action: "trip_updated",
        targetType: "trip",
        targetId: tripId,
        requestId: context.requestId,
        ipAddress: context.ip,
        metadata: {
          name: input.name,
          startDate: input.startDate,
          endDate: input.endDate,
        },
      });
    },
  );

  refreshTripCore(tripId);
  revalidatePath(`/trips/${tripId}`);
  redirect(`/trips/${tripId}?notice=trip-updated`);
}

export async function deleteTrip(tripId: string) {
  const user = await requireUser();
  const context = await enforceMutationRateLimit("deleteTrip", user.id);
  await requireTripRole(tripId, user, "owner");
  await logMutation(
    "deleteTrip",
    {
      requestId: context.requestId,
      ip: context.ip,
      actorId: user.id,
      tripId,
    },
    async () => {
      await getDb().delete(trips).where(eq(trips.id, tripId));

      await auditMutation({
        tripId,
        actorUserId: user.id,
        action: "trip_deleted",
        targetType: "trip",
        targetId: tripId,
        requestId: context.requestId,
        ipAddress: context.ip,
      });
    },
  );
  refreshTripCore(tripId);
  revalidatePath("/trips");
  redirect("/trips?notice=trip-deleted");
}

export async function deleteTripWithConfirmation(tripId: string, expectedName: string, formData: FormData) {
  const user = await requireUser();
  const context = await enforceMutationRateLimit("deleteTripWithConfirmation", user.id);
  await requireTripRole(tripId, user, "owner");
  const confirmation = z.string().trim().min(1).parse(formValue(formData, "tripNameConfirmation"));

  if (confirmation !== expectedName) {
    return { ok: false, error: "Trip name confirmation did not match." } satisfies ActionResult;
  }

  await logMutation(
    "deleteTripWithConfirmation",
    {
      requestId: context.requestId,
      ip: context.ip,
      actorId: user.id,
      tripId,
    },
    async () => {
      await getDb().delete(trips).where(eq(trips.id, tripId));

      await auditMutation({
        tripId,
        actorUserId: user.id,
        action: "trip_deleted",
        targetType: "trip",
        targetId: tripId,
        requestId: context.requestId,
        ipAddress: context.ip,
        metadata: {
          confirmationMatched: true,
        },
      });
    },
  );
  refreshTripCore(tripId);
  revalidatePath("/trips");
  redirect("/trips?notice=trip-deleted");
}

const segmentSchema = z
  .object({
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
  })
  .refine((value) => !value.endDatetime || value.endDatetime >= value.startDatetime, {
    message: "Segment end time must be after the start time.",
    path: ["endDatetime"],
  });

export async function saveSegment(tripId: string, segmentId: string | null, formData: FormData) {
  const { user, context } = await requireEditorMutationContext("saveSegment", tripId);
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

  await logMutation(
    "saveSegment",
    {
      requestId: context.requestId,
      ip: context.ip,
      actorId: user.id,
      tripId,
      segmentId,
    },
    async () => {
      if (segmentId) {
        await getDb()
          .update(travelSegments)
          .set({ ...input, updatedAt: new Date() })
          .where(and(eq(travelSegments.id, segmentId), eq(travelSegments.tripId, tripId)));
      } else {
        await getDb().insert(travelSegments).values({ ...input, tripId });
      }

      await auditMutation({
        tripId,
        actorUserId: user.id,
        action: "trip_item_saved",
        targetType: "travel_segment",
        targetId: segmentId,
        requestId: context.requestId,
        ipAddress: context.ip,
        metadata: {
          mode: segmentId ? "update" : "create",
          type: input.type,
          startLocationName: input.startLocationName,
          endLocationName: input.endLocationName,
        },
      });
    },
  );

  refreshTripItinerary(tripId);
  revalidatePath(`/trips/${tripId}`);
  return { ok: true } satisfies ActionResult;
}

export async function deleteSegment(tripId: string, segmentId: string) {
  const { user, context } = await requireEditorMutationContext("deleteSegment", tripId);
  await logMutation(
    "deleteSegment",
    {
      requestId: context.requestId,
      ip: context.ip,
      actorId: user.id,
      tripId,
      segmentId,
    },
    async () => {
      await getDb().delete(travelSegments).where(and(eq(travelSegments.id, segmentId), eq(travelSegments.tripId, tripId)));
      await auditMutation({
        tripId,
        actorUserId: user.id,
        action: "trip_item_deleted",
        targetType: "travel_segment",
        targetId: segmentId,
        requestId: context.requestId,
        ipAddress: context.ip,
      });
    },
  );
  refreshTripItinerary(tripId);
  revalidatePath(`/trips/${tripId}`);
  return { ok: true } satisfies ActionResult;
}

const lodgingSchema = z
  .object({
    title: nullableText,
    name: z.string().trim().min(1),
    url: nullableUrl,
    address: z.string().trim().min(1),
    lat: selectedCoordinate,
    lng: selectedCoordinate,
    checkIn: requiredDateTime,
    checkOut: optionalDateTime,
    notes: nullableText,
  })
  .refine((value) => !value.checkOut || value.checkOut >= value.checkIn, {
    message: "Check-out must be after check-in.",
    path: ["checkOut"],
  });

export async function saveLodging(tripId: string, lodgingId: string | null, formData: FormData) {
  const { user, context } = await requireEditorMutationContext("saveLodging", tripId);
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

  await logMutation(
    "saveLodging",
    {
      requestId: context.requestId,
      ip: context.ip,
      actorId: user.id,
      tripId,
      lodgingId,
      convertedIdeaId: convertedIdeaId || null,
    },
    async () => {
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

      await auditMutation({
        tripId,
        actorUserId: user.id,
        action: "trip_item_saved",
        targetType: "lodging",
        targetId: lodgingId,
        requestId: context.requestId,
        ipAddress: context.ip,
        metadata: {
          mode: lodgingId ? "update" : "create",
          name: input.name,
          convertedIdeaId: convertedIdeaId || null,
        },
      });
    },
  );

  refreshTripItinerary(tripId);
  if (convertedIdeaId) {
    refreshTripIdeas(tripId);
  }
  revalidatePath(`/trips/${tripId}`);
  return { ok: true } satisfies ActionResult;
}

export async function deleteLodging(tripId: string, lodgingId: string) {
  const { user, context } = await requireEditorMutationContext("deleteLodging", tripId);
  await logMutation(
    "deleteLodging",
    {
      requestId: context.requestId,
      ip: context.ip,
      actorId: user.id,
      tripId,
      lodgingId,
    },
    async () => {
      await getDb().delete(lodging).where(and(eq(lodging.id, lodgingId), eq(lodging.tripId, tripId)));
      await auditMutation({
        tripId,
        actorUserId: user.id,
        action: "trip_item_deleted",
        targetType: "lodging",
        targetId: lodgingId,
        requestId: context.requestId,
        ipAddress: context.ip,
      });
    },
  );
  refreshTripItinerary(tripId);
  revalidatePath(`/trips/${tripId}`);
  return { ok: true } satisfies ActionResult;
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

const ideaBucketItemSchema = z
  .object({
    kind: z.enum(["housing", "activity", "food"]),
    description: z.string().trim().min(1),
    locationName: nullableText,
    address: nullableText,
    lat: optionalCoordinate,
    lng: optionalCoordinate,
    url: nullableUrl,
    notes: nullableText,
  })
  .refine(
    ({ locationName, address, lat, lng }) => {
      const locationValues = [locationName, address, lat, lng];
      return locationValues.every((value) => value == null) || locationValues.every((value) => value != null);
    },
    { message: "Select an activity location from the search results." },
  );

const plannerDragItemSchema = z.discriminatedUnion("source", [
  z.object({ source: z.literal("idea"), id: z.string().uuid() }),
  z.object({
    source: z.literal("timeline"),
    id: z.string().uuid(),
    kind: z.enum(["travel", "lodging", "activity", "food"]),
  }),
]);

const plannerDropTargetSchema = z.discriminatedUnion("target", [
  z.object({ target: z.literal("idea-bucket") }),
  z.object({
    target: z.literal("day"),
    day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    sourceOffsetMinutes: z.number().int().min(-840).max(840),
    targetOffsetMinutes: z.number().int().min(-840).max(840),
  }),
]);

type PlannerDragItem = z.infer<typeof plannerDragItemSchema>;
type PlannerDayTarget = Extract<z.infer<typeof plannerDropTargetSchema>, { target: "day" }>;

function dateAtLocalTime(day: string, hour: number, minute: number, offsetMinutes: number) {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, date, hour, minute) + offsetMinutes * 60_000);
}

function moveDateToDay(value: Date, target: PlannerDayTarget) {
  const localValue = new Date(value.getTime() - target.sourceOffsetMinutes * 60_000);
  return dateAtLocalTime(
    target.day,
    localValue.getUTCHours(),
    localValue.getUTCMinutes(),
    target.targetOffsetMinutes,
  );
}

async function moveTimelineItemToDay(
  db: ReturnType<typeof getDb>,
  tripId: string,
  item: Extract<PlannerDragItem, { source: "timeline" }>,
  target: PlannerDayTarget,
) {
  if (item.kind === "travel") {
    const [record] = await db.select().from(travelSegments).where(and(eq(travelSegments.id, item.id), eq(travelSegments.tripId, tripId))).limit(1);
    if (!record) throw new Error("That travel item is no longer available.");
    const startDatetime = moveDateToDay(record.startDatetime, target);
    const delta = startDatetime.getTime() - record.startDatetime.getTime();
    await db.update(travelSegments).set({
      startDatetime,
      endDatetime: record.endDatetime ? new Date(record.endDatetime.getTime() + delta) : null,
      updatedAt: new Date(),
    }).where(and(eq(travelSegments.id, item.id), eq(travelSegments.tripId, tripId)));
    return;
  }

  if (item.kind === "lodging") {
    const [record] = await db.select().from(lodging).where(and(eq(lodging.id, item.id), eq(lodging.tripId, tripId))).limit(1);
    if (!record) throw new Error("That lodging item is no longer available.");
    const checkIn = moveDateToDay(record.checkIn, target);
    const delta = checkIn.getTime() - record.checkIn.getTime();
    await db.update(lodging).set({
      checkIn,
      checkOut: record.checkOut ? new Date(record.checkOut.getTime() + delta) : null,
      updatedAt: new Date(),
    }).where(and(eq(lodging.id, item.id), eq(lodging.tripId, tripId)));
    return;
  }

  const table = item.kind === "activity" ? activities : food;
  const [record] = await db.select().from(table).where(and(eq(table.id, item.id), eq(table.tripId, tripId))).limit(1);
  if (!record) throw new Error(`That ${item.kind} item is no longer available.`);
  await db.update(table).set({ datetime: moveDateToDay(record.datetime, target), updatedAt: new Date() }).where(and(eq(table.id, item.id), eq(table.tripId, tripId)));
}

export async function moveTripPlannerItem(
  tripId: string,
  rawItem: PlannerDragItem,
  rawTarget: z.infer<typeof plannerDropTargetSchema>,
) {
  const { user, context } = await requireEditorMutationContext("moveTripPlannerItem", tripId);
  const item = plannerDragItemSchema.parse(rawItem);
  const target = plannerDropTargetSchema.parse(rawTarget);

  if (item.source === "idea" && target.target === "idea-bucket") {
    return { ok: true } satisfies ActionResult;
  }

  if (item.source === "timeline" && target.target === "idea-bucket" && item.kind === "travel") {
    return { ok: false, error: "Travel items cannot be moved to the Idea Bucket." } satisfies ActionResult;
  }

  try {
    const db = getDb();
    if (item.source === "idea" && target.target === "day") {
      const [idea] = await db.select().from(ideaBucketItems).where(and(eq(ideaBucketItems.id, item.id), eq(ideaBucketItems.tripId, tripId))).limit(1);
      if (!idea) throw new Error("That idea is no longer available.");
      const datetime = dateAtLocalTime(target.day, 8, 0, target.targetOffsetMinutes);
      const removeIdea = db.delete(ideaBucketItems).where(and(eq(ideaBucketItems.id, item.id), eq(ideaBucketItems.tripId, tripId)));

      if (idea.kind === "housing") {
        await db.batch([
          db.insert(lodging).values({
            tripId,
            title: idea.description,
            name: idea.locationName || idea.description,
            address: idea.address,
            lat: idea.lat,
            lng: idea.lng,
            url: idea.url,
            notes: idea.notes,
            checkIn: datetime,
          }),
          removeIdea,
        ]);
      } else if (idea.kind === "activity") {
        await db.batch([
          db.insert(activities).values({
            tripId,
            title: idea.description,
            name: idea.locationName || idea.description,
            address: idea.address,
            lat: idea.lat,
            lng: idea.lng,
            url: idea.url,
            notes: idea.notes,
            datetime,
          }),
          removeIdea,
        ]);
      } else {
        await db.batch([
          db.insert(food).values({
            tripId,
            title: idea.description,
            name: idea.locationName || idea.description,
            address: idea.address,
            lat: idea.lat,
            lng: idea.lng,
            url: idea.url,
            notes: idea.notes,
            datetime,
          }),
          removeIdea,
        ]);
      }
    } else if (item.source === "timeline" && target.target === "day") {
      await moveTimelineItemToDay(db, tripId, item, target);
    } else if (item.source === "timeline" && item.kind !== "travel") {
      const table = item.kind === "lodging" ? lodging : item.kind === "activity" ? activities : food;
      const [record] = await db.select().from(table).where(and(eq(table.id, item.id), eq(table.tripId, tripId))).limit(1);
      if (!record) throw new Error(`That ${item.kind} item is no longer available.`);

      await db.batch([
        db.insert(ideaBucketItems).values({
          tripId,
          kind: item.kind === "lodging" ? "housing" : item.kind,
          description: record.title || record.name,
          locationName: record.name,
          address: record.address,
          lat: record.lat,
          lng: record.lng,
          url: record.url,
          notes: record.notes,
          createdByUserId: user.id,
        }),
        db.delete(table).where(and(eq(table.id, item.id), eq(table.tripId, tripId))),
      ]);
    }
  } catch (error) {
    return validationError(error);
  }

  await auditMutation({
    tripId,
    actorUserId: user.id,
    action: "trip_item_saved",
    targetType: "planner_drag",
    targetId: item.id,
    requestId: context.requestId,
    ipAddress: context.ip,
    metadata: { source: item.source, target: target.target, day: target.target === "day" ? target.day : null },
  });
  refreshTripItinerary(tripId);
  refreshTripIdeas(tripId);
  revalidatePath(`/trips/${tripId}`);
  return { ok: true } satisfies ActionResult;
}

export async function saveActivity(tripId: string, activityId: string | null, formData: FormData) {
  const { user, context } = await requireEditorMutationContext("saveActivity", tripId);
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

  await logMutation(
    "saveActivity",
    {
      requestId: context.requestId,
      ip: context.ip,
      actorId: user.id,
      tripId,
      activityId,
      convertedIdeaId: convertedIdeaId || null,
    },
    async () => {
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

      await auditMutation({
        tripId,
        actorUserId: user.id,
        action: "trip_item_saved",
        targetType: "activity",
        targetId: activityId,
        requestId: context.requestId,
        ipAddress: context.ip,
        metadata: {
          mode: activityId ? "update" : "create",
          name: input.name,
          includeInRoute: input.includeInRoute,
          convertedIdeaId: convertedIdeaId || null,
        },
      });
    },
  );

  refreshTripItinerary(tripId);
  if (convertedIdeaId) {
    refreshTripIdeas(tripId);
  }
  revalidatePath(`/trips/${tripId}`);
  return { ok: true } satisfies ActionResult;
}

export async function deleteActivity(tripId: string, activityId: string) {
  const { user, context } = await requireEditorMutationContext("deleteActivity", tripId);
  await logMutation(
    "deleteActivity",
    {
      requestId: context.requestId,
      ip: context.ip,
      actorId: user.id,
      tripId,
      activityId,
    },
    async () => {
      await getDb().delete(activities).where(and(eq(activities.id, activityId), eq(activities.tripId, tripId)));
      await auditMutation({
        tripId,
        actorUserId: user.id,
        action: "trip_item_deleted",
        targetType: "activity",
        targetId: activityId,
        requestId: context.requestId,
        ipAddress: context.ip,
      });
    },
  );
  refreshTripItinerary(tripId);
  revalidatePath(`/trips/${tripId}`);
  return { ok: true } satisfies ActionResult;
}

export async function saveFood(tripId: string, foodId: string | null, formData: FormData) {
  const { user, context } = await requireEditorMutationContext("saveFood", tripId);
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

  await logMutation(
    "saveFood",
    {
      requestId: context.requestId,
      ip: context.ip,
      actorId: user.id,
      tripId,
      foodId,
      convertedIdeaId: convertedIdeaId || null,
    },
    async () => {
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

      await auditMutation({
        tripId,
        actorUserId: user.id,
        action: "trip_item_saved",
        targetType: "food",
        targetId: foodId,
        requestId: context.requestId,
        ipAddress: context.ip,
        metadata: {
          mode: foodId ? "update" : "create",
          name: input.name,
          convertedIdeaId: convertedIdeaId || null,
        },
      });
    },
  );

  refreshTripItinerary(tripId);
  if (convertedIdeaId) {
    refreshTripIdeas(tripId);
  }
  revalidatePath(`/trips/${tripId}`);
  return { ok: true } satisfies ActionResult;
}

export async function deleteFood(tripId: string, foodId: string) {
  const { user, context } = await requireEditorMutationContext("deleteFood", tripId);
  await logMutation(
    "deleteFood",
    {
      requestId: context.requestId,
      ip: context.ip,
      actorId: user.id,
      tripId,
      foodId,
    },
    async () => {
      await getDb().delete(food).where(and(eq(food.id, foodId), eq(food.tripId, tripId)));
      await auditMutation({
        tripId,
        actorUserId: user.id,
        action: "trip_item_deleted",
        targetType: "food",
        targetId: foodId,
        requestId: context.requestId,
        ipAddress: context.ip,
      });
    },
  );
  refreshTripItinerary(tripId);
  revalidatePath(`/trips/${tripId}`);
  return { ok: true } satisfies ActionResult;
}

export async function savePackingItem(tripId: string, itemId: string | null, formData: FormData) {
  const { user, context } = await requireEditorMutationContext("savePackingItem", tripId);
  const input = (() => {
    try {
      return packingItemSchema.parse(Object.fromEntries(formData));
    } catch (error) {
      return validationError(error);
    }
  })();

  if ("ok" in input) return input;

  await logMutation(
    "savePackingItem",
    {
      requestId: context.requestId,
      ip: context.ip,
      actorId: user.id,
      tripId,
      itemId,
    },
    async () => {
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

      await auditMutation({
        tripId,
        actorUserId: user.id,
        action: "trip_item_saved",
        targetType: "packing_item",
        targetId: itemId,
        requestId: context.requestId,
        ipAddress: context.ip,
        metadata: {
          mode: itemId ? "update" : "create",
          name: input.name,
        },
      });
    },
  );

  refreshTripPacking(tripId);
  revalidatePath(`/trips/${tripId}`);
  return { ok: true } satisfies ActionResult;
}

export async function togglePackingItem(tripId: string, itemId: string, nextPackedState: boolean) {
  const { user, context } = await requireEditorMutationContext("togglePackingItem", tripId);
  await logMutation(
    "togglePackingItem",
    {
      requestId: context.requestId,
      ip: context.ip,
      actorId: user.id,
      tripId,
      itemId,
      nextPackedState,
    },
    async () => {
      await getDb()
        .update(packingItems)
        .set({ isPacked: nextPackedState, updatedAt: new Date() })
        .where(and(eq(packingItems.id, itemId), eq(packingItems.tripId, tripId)));

      await auditMutation({
        tripId,
        actorUserId: user.id,
        action: "packing_item_toggled",
        targetType: "packing_item",
        targetId: itemId,
        requestId: context.requestId,
        ipAddress: context.ip,
        metadata: {
          nextPackedState,
        },
      });
    },
  );

  refreshTripPacking(tripId);
  revalidatePath(`/trips/${tripId}`);
  return { ok: true } satisfies ActionResult;
}

export async function deletePackingItem(tripId: string, itemId: string) {
  const { user, context } = await requireEditorMutationContext("deletePackingItem", tripId);
  await logMutation(
    "deletePackingItem",
    {
      requestId: context.requestId,
      ip: context.ip,
      actorId: user.id,
      tripId,
      itemId,
    },
    async () => {
      await getDb().delete(packingItems).where(and(eq(packingItems.id, itemId), eq(packingItems.tripId, tripId)));
      await auditMutation({
        tripId,
        actorUserId: user.id,
        action: "trip_item_deleted",
        targetType: "packing_item",
        targetId: itemId,
        requestId: context.requestId,
        ipAddress: context.ip,
      });
    },
  );
  refreshTripPacking(tripId);
  revalidatePath(`/trips/${tripId}`);
  return { ok: true } satisfies ActionResult;
}

export async function saveIdeaBucketItem(tripId: string, itemId: string | null, formData: FormData) {
  const { user, context } = await requireEditorMutationContext("saveIdeaBucketItem", tripId);
  const input = (() => {
    try {
      return ideaBucketItemSchema.parse({
        kind: formValue(formData, "kind"),
        description: formValue(formData, "description"),
        locationName: formValue(formData, "locationName"),
        address: formValue(formData, "address"),
        lat: formValue(formData, "lat"),
        lng: formValue(formData, "lng"),
        url: formValue(formData, "url"),
        notes: formValue(formData, "notes"),
      });
    } catch (error) {
      return validationError(error);
    }
  })();

  if ("ok" in input) return input;

  await logMutation(
    "saveIdeaBucketItem",
    {
      requestId: context.requestId,
      ip: context.ip,
      actorId: user.id,
      tripId,
      itemId,
    },
    async () => {
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

      await auditMutation({
        tripId,
        actorUserId: user.id,
        action: "trip_item_saved",
        targetType: "idea_bucket_item",
        targetId: itemId,
        requestId: context.requestId,
        ipAddress: context.ip,
        metadata: {
          mode: itemId ? "update" : "create",
          kind: input.kind,
        },
      });
    },
  );

  refreshTripIdeas(tripId);
  revalidatePath(`/trips/${tripId}`);
  return { ok: true } satisfies ActionResult;
}

export async function deleteIdeaBucketItem(tripId: string, itemId: string) {
  const { user, context } = await requireEditorMutationContext("deleteIdeaBucketItem", tripId);
  await logMutation(
    "deleteIdeaBucketItem",
    {
      requestId: context.requestId,
      ip: context.ip,
      actorId: user.id,
      tripId,
      itemId,
    },
    async () => {
      await getDb().delete(ideaBucketItems).where(and(eq(ideaBucketItems.id, itemId), eq(ideaBucketItems.tripId, tripId)));
      await auditMutation({
        tripId,
        actorUserId: user.id,
        action: "trip_item_deleted",
        targetType: "idea_bucket_item",
        targetId: itemId,
        requestId: context.requestId,
        ipAddress: context.ip,
      });
    },
  );
  refreshTripIdeas(tripId);
  revalidatePath(`/trips/${tripId}`);
  return { ok: true } satisfies ActionResult;
}

export async function addMember(tripId: string, formData: FormData) {
  const user = await requireUser();
  const context = await enforceMutationRateLimit("addMember", user.id);
  await requireTripRole(tripId, user, "owner");
  const input = (() => {
    try {
      return {
        email: z.string().trim().email().transform((value) => value.toLowerCase()).parse(formValue(formData, "email")),
        role: z.enum(["editor", "viewer"]).parse(formValue(formData, "role")),
      };
    } catch (error) {
      return validationError(error);
    }
  })();

  if ("ok" in input) return input;
  const { email, role } = input;

  await logMutation(
    "addMember",
    {
      requestId: context.requestId,
      ip: context.ip,
      actorId: user.id,
      tripId,
      targetEmail: email,
    },
    async () => {
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

      await auditMutation({
        tripId,
        actorUserId: user.id,
        action: "member_invited",
        targetType: "trip_member",
        targetId: existing[0]?.id ?? email,
        requestId: context.requestId,
        ipAddress: context.ip,
        metadata: {
          email,
          role,
          updatedExistingMember: Boolean(existing[0]),
        },
      });
    },
  );

  revalidatePath(`/trips/${tripId}/members`);
  return { ok: true } satisfies ActionResult;
}

export async function updateMemberRole(tripId: string, memberId: string, formData: FormData) {
  const user = await requireUser();
  const context = await enforceMutationRateLimit("updateMemberRole", user.id);
  await requireTripRole(tripId, user, "owner");
  const input = (() => {
    try {
      return {
        role: z.enum(["editor", "viewer"]).parse(formValue(formData, "role")),
      };
    } catch (error) {
      return validationError(error);
    }
  })();

  if ("ok" in input) return input;
  const { role } = input;

  const existingMember = await getDb()
    .select({
      id: tripMembers.id,
      userId: tripMembers.userId,
      role: tripMembers.role,
      email: tripMembers.email,
    })
    .from(tripMembers)
    .where(and(eq(tripMembers.id, memberId), eq(tripMembers.tripId, tripId)))
    .limit(1);

  const member = existingMember[0];

  if (!member) {
    throw new Error("Member not found.");
  }

  if (member.role === "owner") {
    throw new Error("Owner access cannot be changed from this screen.");
  }

  if (member.userId === user.id) {
    throw new Error("You cannot change your own membership role.");
  }

  await logMutation(
    "updateMemberRole",
    {
      requestId: context.requestId,
      ip: context.ip,
      actorId: user.id,
      tripId,
      memberId,
      role,
    },
    async () => {
      await getDb()
        .update(tripMembers)
        .set({ role, updatedAt: new Date() })
        .where(and(eq(tripMembers.id, memberId), eq(tripMembers.tripId, tripId)));

      await auditMutation({
        tripId,
        actorUserId: user.id,
        action: "member_role_updated",
        targetType: "trip_member",
        targetId: memberId,
        requestId: context.requestId,
        ipAddress: context.ip,
        metadata: {
          email: member.email,
          previousRole: member.role,
          nextRole: role,
        },
      });
    },
  );

  revalidatePath(`/trips/${tripId}/members`);
  return { ok: true } satisfies ActionResult;
}

export async function removeMember(tripId: string, memberId: string) {
  const user = await requireUser();
  const context = await enforceMutationRateLimit("removeMember", user.id);
  await requireTripRole(tripId, user, "owner");

  const existingMember = await getDb()
    .select({
      id: tripMembers.id,
      userId: tripMembers.userId,
      role: tripMembers.role,
      email: tripMembers.email,
    })
    .from(tripMembers)
    .where(and(eq(tripMembers.id, memberId), eq(tripMembers.tripId, tripId)))
    .limit(1);

  const member = existingMember[0];

  if (!member) {
    throw new Error("Member not found.");
  }

  if (member.role === "owner") {
    throw new Error("The owner membership cannot be removed.");
  }

  if (member.userId === user.id) {
    throw new Error("You cannot remove your own membership.");
  }

  await logMutation(
    "removeMember",
    {
      requestId: context.requestId,
      ip: context.ip,
      actorId: user.id,
      tripId,
      memberId,
    },
    async () => {
      await getDb()
        .delete(tripMembers)
        .where(and(eq(tripMembers.id, memberId), eq(tripMembers.tripId, tripId)));

      await auditMutation({
        tripId,
        actorUserId: user.id,
        action: "member_removed",
        targetType: "trip_member",
        targetId: memberId,
        requestId: context.requestId,
        ipAddress: context.ip,
        metadata: {
          email: member.email,
          removedRole: member.role,
        },
      });
    },
  );

  revalidatePath(`/trips/${tripId}/members`);
  return { ok: true } satisfies ActionResult;
}
