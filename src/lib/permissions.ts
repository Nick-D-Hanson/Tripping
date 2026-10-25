import { and, eq, or, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { tripMembers, trips, type TripRole } from "@/db/schema";
import type { getCurrentUser } from "@/lib/auth/server";
import { hasAtLeast } from "@/lib/trip-role-policy";

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export { canEdit, canManage, hasAtLeast } from "@/lib/trip-role-policy";

export async function claimEmailInvites(user: CurrentUser) {
  if (!user.email) return;

  await getDb()
    .update(tripMembers)
    .set({ userId: user.id, updatedAt: new Date() })
    .where(
      and(
        sql`${tripMembers.userId} is null`,
        sql`lower(${tripMembers.email}) = lower(${user.email})`,
      ),
    );
}

export async function getTripRole(tripId: string, user: CurrentUser): Promise<TripRole | null> {
  const rows = await getDb()
    .select({ role: tripMembers.role })
    .from(tripMembers)
    .where(
      and(
        eq(tripMembers.tripId, tripId),
        or(
          eq(tripMembers.userId, user.id),
          user.email ? sql`lower(${tripMembers.email}) = lower(${user.email})` : undefined,
        ),
      ),
    )
    .limit(1);

  return rows[0]?.role ?? null;
}

export async function requireTripRole(tripId: string, user: CurrentUser, minimum: TripRole) {
  const role = await getTripRole(tripId, user);

  if (!hasAtLeast(role, minimum)) {
    throw new Error("You do not have permission to perform this action.");
  }

  return role;
}

export async function userCanOpenTrip(tripId: string, user: CurrentUser) {
  const rows = await getDb()
    .select({ id: trips.id })
    .from(trips)
    .innerJoin(tripMembers, eq(trips.id, tripMembers.tripId))
    .where(
      and(
        eq(trips.id, tripId),
        or(
          eq(tripMembers.userId, user.id),
          user.email ? sql`lower(${tripMembers.email}) = lower(${user.email})` : undefined,
        ),
      ),
    )
    .limit(1);

  return rows.length > 0;
}
