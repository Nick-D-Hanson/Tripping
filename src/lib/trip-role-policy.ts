import type { TripRole } from "@/db/schema";

/** Pure role-policy functions, kept separate from database authorization. */
const roleRank: Record<TripRole, number> = {
  viewer: 0,
  editor: 1,
  owner: 2,
};

export function canEdit(role: TripRole | null) {
  return !!role && roleRank[role] >= roleRank.editor;
}

export function canManage(role: TripRole | null) {
  return role === "owner";
}

export function hasAtLeast(role: TripRole | null, minimum: TripRole) {
  return !!role && roleRank[role] >= roleRank[minimum];
}
