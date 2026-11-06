CREATE TABLE "trip_covers" (
  "trip_id" uuid PRIMARY KEY REFERENCES "trips"("id") ON DELETE CASCADE,
  "image" text NOT NULL,
  "x" double precision NOT NULL DEFAULT 50 CHECK (x BETWEEN 0 AND 100),
  "y" double precision NOT NULL DEFAULT 50 CHECK (y BETWEEN 0 AND 100),
  "zoom" double precision NOT NULL DEFAULT 1 CHECK (zoom BETWEEN 1 AND 3),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);
