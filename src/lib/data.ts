import { asc, eq, or, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { notFound } from "next/navigation";
import { cache } from "react";
import { getDb } from "@/db";
import { activities, food, ideaBucketItems, lodging, packingItems, travelSegments, tripMembers, trips } from "@/db/schema";
import { getCurrentUser, requireUser } from "@/lib/auth/server";
import { tripCoreTag, tripIdeasTag, tripItineraryTag, tripPackingTag } from "@/lib/cache-tags";
import { claimEmailInvites, getTripRole, userCanOpenTrip } from "@/lib/permissions";
import { initialsFromValue } from "@/lib/utils";

export async function getDashboardTrips() {
  const user = await requireUser();
  await claimEmailInvites(user);

  const membershipFilter = user.email
    ? or(eq(tripMembers.userId, user.id), sql`lower(${tripMembers.email}) = lower(${user.email})`)
    : eq(tripMembers.userId, user.id);

  return getDb()
    .select({
      id: trips.id,
      name: trips.name,
      description: trips.description,
      startDate: trips.startDate,
      endDate: trips.endDate,
      role: tripMembers.role,
    })
    .from(trips)
    .innerJoin(tripMembers, eq(trips.id, tripMembers.tripId))
    .where(membershipFilter)
    .orderBy(asc(trips.startDate));
}

const getTripAccessContext = cache(async (tripId: string) => {
  const user = await requireUser();
  await claimEmailInvites(user);

  if (!(await userCanOpenTrip(tripId, user))) {
    notFound();
  }

  const db = getDb();
  const [tripRows, role] = await Promise.all([
    db.select().from(trips).where(eq(trips.id, tripId)).limit(1),
    getTripRole(tripId, user),
  ]);
  const trip = tripRows[0];

  if (!trip) notFound();

  return { user, trip, role };
});

async function getTripCoreRecord(tripId: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(tripCoreTag(tripId));

  const tripRows = await getDb().select().from(trips).where(eq(trips.id, tripId)).limit(1);
  const trip = tripRows[0];

  if (!trip) notFound();

  return trip;
}

async function getTripItineraryData(tripId: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(tripItineraryTag(tripId));

  const db = getDb();

  const [segments, stays, acts, foodItems] = await Promise.all([
    db.select().from(travelSegments).where(eq(travelSegments.tripId, tripId)).orderBy(asc(travelSegments.startDatetime)),
    db.select().from(lodging).where(eq(lodging.tripId, tripId)).orderBy(asc(lodging.checkIn)),
    db.select().from(activities).where(eq(activities.tripId, tripId)).orderBy(asc(activities.datetime)),
    db.select().from(food).where(eq(food.tripId, tripId)).orderBy(asc(food.datetime)),
  ]);

  return { segments, stays, activities: acts, food: foodItems };
}

const getTripMembers = async (tripId: string) => {
  await getTripAccessContext(tripId);
  return getDb().select().from(tripMembers).where(eq(tripMembers.tripId, tripId)).orderBy(asc(tripMembers.createdAt));
};

async function getTripPackingItems(tripId: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(tripPackingTag(tripId));

  return getDb().select().from(packingItems).where(eq(packingItems.tripId, tripId)).orderBy(asc(packingItems.createdAt));
}

async function getTripIdeaBucketItems(tripId: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(tripIdeasTag(tripId));

  return getDb().select().from(ideaBucketItems).where(eq(ideaBucketItems.tripId, tripId)).orderBy(asc(ideaBucketItems.kind), asc(ideaBucketItems.createdAt));
}

export async function getTripPageData(tripId: string) {
  const [{ user, role }, trip, { segments, stays, activities: acts, food: foodItems }, members, packing, ideas] = await Promise.all([
    getTripAccessContext(tripId),
    getTripCoreRecord(tripId),
    getTripItineraryData(tripId),
    getTripMembers(tripId),
    getTripPackingItems(tripId),
    getTripIdeaBucketItems(tripId),
  ]);

  const memberEmailByUserId = new Map(
    members
      .filter((member) => member.userId)
      .map((member) => [member.userId!, member.email]),
  );

  const packingWithCreators = packing.map((item) => {
    const creatorDisplay =
      memberEmailByUserId.get(item.createdByUserId) ||
      (item.createdByUserId === user.id ? user.name ?? user.email ?? user.id : item.createdByUserId);

    return {
      ...item,
      creatorInitials: initialsFromValue(creatorDisplay),
    };
  });

  const ideasWithCreators = ideas.map((item) => {
    const creatorDisplay =
      memberEmailByUserId.get(item.createdByUserId) ||
      (item.createdByUserId === user.id ? user.name ?? user.email ?? user.id : item.createdByUserId);

    return {
      ...item,
      creatorInitials: initialsFromValue(creatorDisplay),
    };
  });

  return { trip, segments, stays, activities: acts, food: foodItems, members, role, user, packingItems: packingWithCreators, ideaBucketItems: ideasWithCreators };
}

export async function getTripShellData(tripId: string) {
  const [{ role }, trip] = await Promise.all([getTripAccessContext(tripId), getTripCoreRecord(tripId)]);
  return { trip, role };
}

export async function getTripMapData(tripId: string) {
  return getTripItineraryData(tripId);
}

export async function getTripTimelineData(tripId: string) {
  return getTripItineraryData(tripId);
}

export async function getTripPackingData(tripId: string) {
  const [{ user }, members, packing] = await Promise.all([
    getTripAccessContext(tripId),
    getTripMembers(tripId),
    getTripPackingItems(tripId),
  ]);

  const memberEmailByUserId = new Map(
    members
      .filter((member) => member.userId)
      .map((member) => [member.userId!, member.email]),
  );

  return packing.map((item) => {
    const creatorDisplay =
      memberEmailByUserId.get(item.createdByUserId) ||
      (item.createdByUserId === user.id ? user.name ?? user.email ?? user.id : item.createdByUserId);

    return {
      ...item,
      creatorInitials: initialsFromValue(creatorDisplay),
    };
  });
}

export async function getTripIdeaBucketData(tripId: string) {
  const [{ user }, members, ideas] = await Promise.all([
    getTripAccessContext(tripId),
    getTripMembers(tripId),
    getTripIdeaBucketItems(tripId),
  ]);

  const memberEmailByUserId = new Map(
    members
      .filter((member) => member.userId)
      .map((member) => [member.userId!, member.email]),
  );

  return ideas.map((item) => {
    const creatorDisplay =
      memberEmailByUserId.get(item.createdByUserId) ||
      (item.createdByUserId === user.id ? user.name ?? user.email ?? user.id : item.createdByUserId);

    return {
      ...item,
      creatorInitials: initialsFromValue(creatorDisplay),
    };
  });
}

export async function getTripMembersPageData(tripId: string) {
  const [{ role }, trip, members] = await Promise.all([
    getTripAccessContext(tripId),
    getTripCoreRecord(tripId),
    getTripMembers(tripId),
  ]);

  return { trip, members, role };
}

export async function getOptionalUser() {
  return getCurrentUser();
}
