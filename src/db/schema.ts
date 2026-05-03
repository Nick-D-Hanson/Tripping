import {
  boolean,
  date,
  doublePrecision,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const tripRoleEnum = pgEnum("trip_role", ["owner", "editor", "viewer"]);
export const travelSegmentTypeEnum = pgEnum("travel_segment_type", [
  "flight",
  "drive",
  "train",
  "ferry",
  "walk",
  "other",
]);
export const ideaBucketItemKindEnum = pgEnum("idea_bucket_item_kind", ["housing", "activity", "food"]);

export const trips = pgTable("trips", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: text("owner_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const tripMembers = pgTable("trip_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  tripId: uuid("trip_id").notNull().references(() => trips.id, { onDelete: "cascade" }),
  userId: text("user_id"),
  email: text("email"),
  role: tripRoleEnum("role").notNull().default("viewer"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const travelSegments = pgTable("travel_segments", {
  id: uuid("id").primaryKey().defaultRandom(),
  tripId: uuid("trip_id").notNull().references(() => trips.id, { onDelete: "cascade" }),
  title: text("title"),
  url: text("url"),
  type: travelSegmentTypeEnum("type").notNull(),
  startLocationName: text("start_location_name").notNull(),
  startAddress: text("start_address"),
  startLat: doublePrecision("start_lat"),
  startLng: doublePrecision("start_lng"),
  endLocationName: text("end_location_name").notNull(),
  endAddress: text("end_address"),
  endLat: doublePrecision("end_lat"),
  endLng: doublePrecision("end_lng"),
  startDatetime: timestamp("start_datetime", { withTimezone: true }).notNull(),
  endDatetime: timestamp("end_datetime", { withTimezone: true }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const lodging = pgTable("lodging", {
  id: uuid("id").primaryKey().defaultRandom(),
  tripId: uuid("trip_id").notNull().references(() => trips.id, { onDelete: "cascade" }),
  title: text("title"),
  name: text("name").notNull(),
  url: text("url"),
  address: text("address"),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  checkIn: timestamp("check_in", { withTimezone: true }).notNull(),
  checkOut: timestamp("check_out", { withTimezone: true }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const activities = pgTable("activities", {
  id: uuid("id").primaryKey().defaultRandom(),
  tripId: uuid("trip_id").notNull().references(() => trips.id, { onDelete: "cascade" }),
  title: text("title"),
  name: text("name").notNull(),
  url: text("url"),
  address: text("address"),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  datetime: timestamp("datetime", { withTimezone: true }).notNull(),
  category: text("category"),
  includeInRoute: boolean("include_in_route").notNull().default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const food = pgTable("food", {
  id: uuid("id").primaryKey().defaultRandom(),
  tripId: uuid("trip_id").notNull().references(() => trips.id, { onDelete: "cascade" }),
  title: text("title"),
  name: text("name").notNull(),
  url: text("url"),
  address: text("address"),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  datetime: timestamp("datetime", { withTimezone: true }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const packingItems = pgTable("packing_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  tripId: uuid("trip_id").notNull().references(() => trips.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  quantity: text("quantity"),
  notes: text("notes"),
  isPacked: boolean("is_packed").notNull().default(false),
  createdByUserId: text("created_by_user_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const ideaBucketItems = pgTable("idea_bucket_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  tripId: uuid("trip_id").notNull().references(() => trips.id, { onDelete: "cascade" }),
  kind: ideaBucketItemKindEnum("kind").notNull(),
  description: text("description").notNull(),
  url: text("url"),
  notes: text("notes"),
  createdByUserId: text("created_by_user_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type IdeaBucketItemKind = (typeof ideaBucketItemKindEnum.enumValues)[number];
export type TripRole = (typeof tripRoleEnum.enumValues)[number];
export type TravelSegmentType = (typeof travelSegmentTypeEnum.enumValues)[number];
