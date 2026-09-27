import { asc, desc, eq, or, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { notFound } from "next/navigation";
import { cache } from "react";
import { getDb } from "@/db";
import { activities, food, ideaBucketItems, lodging, packingItems, travelSegments, tripItemVotes, tripLinks, tripMembers, trips, type TripItemVoteType } from "@/db/schema";
import { getCurrentUser, requireUser } from "@/lib/auth/server";
import { tripCoreTag, tripIdeasTag, tripItineraryTag, tripLinksTag, tripPackingTag } from "@/lib/cache-tags";
import { claimEmailInvites, getTripRole, userCanOpenTrip } from "@/lib/permissions";
import { initialsFromValue } from "@/lib/utils";
import type { ItemVoteSummary } from "@/lib/votes";

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
    .orderBy(desc(trips.startDate));
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

async function getTripLinks(tripId: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(tripLinksTag(tripId));

  return getDb().select().from(tripLinks).where(eq(tripLinks.tripId, tripId)).orderBy(asc(tripLinks.title));
}

async function getTripItemVotes(tripId: string) {
  return getDb()
    .select({
      itemType: tripItemVotes.itemType,
      itemId: tripItemVotes.itemId,
      userId: tripItemVotes.userId,
      vote: tripItemVotes.vote,
    })
    .from(tripItemVotes)
    .where(eq(tripItemVotes.tripId, tripId));
}

function summarizeVotes(
  rows: Awaited<ReturnType<typeof getTripItemVotes>>,
  currentUserId: string,
) {
  const summaries = new Map<string, ItemVoteSummary>();

  for (const row of rows) {
    const key = `${row.itemType}:${row.itemId}`;
    const summary = summaries.get(key) ?? { up: 0, down: 0, current: 0 };
    if (row.vote === 1) summary.up += 1;
    if (row.vote === -1) summary.down += 1;
    if (row.userId === currentUserId) summary.current = row.vote === 1 ? 1 : -1;
    summaries.set(key, summary);
  }

  return (itemType: TripItemVoteType, itemId: string): ItemVoteSummary => (
    summaries.get(`${itemType}:${itemId}`) ?? { up: 0, down: 0, current: 0 }
  );
}

export async function getTripPageData(tripId: string) {
  const [{ user, role }, trip, { segments, stays, activities: acts, food: foodItems }, members, packing, ideas, links, votes] = await Promise.all([
    getTripAccessContext(tripId),
    getTripCoreRecord(tripId),
    getTripItineraryData(tripId),
    getTripMembers(tripId),
    getTripPackingItems(tripId),
    getTripIdeaBucketItems(tripId),
    getTripLinks(tripId),
    getTripItemVotes(tripId),
  ]);

  const voteSummary = summarizeVotes(votes, user.id);

  const memberEmailByUserId = new Map(
    members
      .filter((member) => member.userId)
      .map((member) => [member.userId!, member.email]),
  );
  const memberDisplayById = new Map(
    members.map((member) => [member.id, member.email ?? member.userId ?? "Traveler"]),
  );

  const packingWithCreators = packing.map((item) => {
    const creatorDisplay =
      memberEmailByUserId.get(item.createdByUserId) ||
      (item.createdByUserId === user.id ? user.name ?? user.email ?? user.id : item.createdByUserId);

    return {
      ...item,
      creatorInitials: initialsFromValue(creatorDisplay),
      assigneeLabel: item.assignedToMemberId ? memberDisplayById.get(item.assignedToMemberId) ?? "Traveler" : null,
      assigneeInitials: item.assignedToMemberId
        ? initialsFromValue(memberDisplayById.get(item.assignedToMemberId) ?? "Traveler")
        : null,
    };
  });

  const ideasWithCreators = ideas.map((item) => {
    const creatorDisplay =
      memberEmailByUserId.get(item.createdByUserId) ||
      (item.createdByUserId === user.id ? user.name ?? user.email ?? user.id : item.createdByUserId);

    return {
      ...item,
      creatorInitials: initialsFromValue(creatorDisplay),
      votes: voteSummary("idea", item.id),
    };
  });

  const linksWithCreators = links.map((item) => {
    const creatorDisplay =
      memberEmailByUserId.get(item.createdByUserId) ||
      (item.createdByUserId === user.id ? user.name ?? user.email ?? user.id : item.createdByUserId);

    return {
      ...item,
      creatorInitials: initialsFromValue(creatorDisplay),
    };
  });

  return {
    trip,
    segments: segments.map((item) => ({ ...item, votes: voteSummary("travel", item.id) })),
    stays: stays.map((item) => ({ ...item, votes: voteSummary("lodging", item.id) })),
    activities: acts.map((item) => ({ ...item, votes: voteSummary("activity", item.id) })),
    food: foodItems.map((item) => ({ ...item, votes: voteSummary("food", item.id) })),
    members,
    role,
    user,
    packingItems: packingWithCreators,
    ideaBucketItems: ideasWithCreators,
    tripLinks: linksWithCreators,
  };
}

export async function getTripShellData(tripId: string) {
  const [{ role }, trip] = await Promise.all([getTripAccessContext(tripId), getTripCoreRecord(tripId)]);
  return { trip, role };
}

export async function getTripMapData(tripId: string) {
  const [itinerary, ideas] = await Promise.all([
    getTripItineraryData(tripId),
    getTripIdeaBucketItems(tripId),
  ]);

  return { ...itinerary, ideas };
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
  const memberDisplayById = new Map(
    members.map((member) => [member.id, member.email ?? member.userId ?? "Traveler"]),
  );

  return packing.map((item) => {
    const creatorDisplay =
      memberEmailByUserId.get(item.createdByUserId) ||
      (item.createdByUserId === user.id ? user.name ?? user.email ?? user.id : item.createdByUserId);

    return {
      ...item,
      creatorInitials: initialsFromValue(creatorDisplay),
      assigneeLabel: item.assignedToMemberId ? memberDisplayById.get(item.assignedToMemberId) ?? "Traveler" : null,
      assigneeInitials: item.assignedToMemberId
        ? initialsFromValue(memberDisplayById.get(item.assignedToMemberId) ?? "Traveler")
        : null,
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
