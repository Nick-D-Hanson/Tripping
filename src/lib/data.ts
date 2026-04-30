import { asc, eq, or, sql } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getDb } from "@/db";
import { activities, food, lodging, travelSegments, tripMembers, trips } from "@/db/schema";
import { getCurrentUser, requireUser } from "@/lib/auth/server";
import { claimEmailInvites, getTripRole, userCanOpenTrip } from "@/lib/permissions";

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

export async function getTripPageData(tripId: string) {
  const user = await requireUser();
  await claimEmailInvites(user);

  if (!(await userCanOpenTrip(tripId, user))) {
    notFound();
  }

  const db = getDb();
  const tripRows = await db.select().from(trips).where(eq(trips.id, tripId)).limit(1);
  const trip = tripRows[0];

  if (!trip) notFound();

  const [segments, stays, acts, foodItems, members, role] = await Promise.all([
    db.select().from(travelSegments).where(eq(travelSegments.tripId, tripId)).orderBy(asc(travelSegments.startDatetime)),
    db.select().from(lodging).where(eq(lodging.tripId, tripId)).orderBy(asc(lodging.checkIn)),
    db.select().from(activities).where(eq(activities.tripId, tripId)).orderBy(asc(activities.datetime)),
    db.select().from(food).where(eq(food.tripId, tripId)).orderBy(asc(food.datetime)),
    db.select().from(tripMembers).where(eq(tripMembers.tripId, tripId)).orderBy(asc(tripMembers.createdAt)),
    getTripRole(tripId, user),
  ]);

  return { trip, segments, stays, activities: acts, food: foodItems, members, role, user };
}

export async function getOptionalUser() {
  return getCurrentUser();
}
