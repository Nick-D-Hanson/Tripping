import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { activities, travelSegments } from "@/db/schema";
import { requireUser } from "@/lib/auth/server";
import { userCanOpenTrip } from "@/lib/permissions";

type LineKind = "drive" | "flight" | "activities";

type RouteLineFeature = GeoJSON.Feature<GeoJSON.LineString, { label: string; fallback?: boolean; kind: LineKind }>;

function straightLine(label: string, kind: LineKind, start: [number, number], end: [number, number]): RouteLineFeature {
  return {
    type: "Feature",
    properties: { label, fallback: true, kind },
    geometry: { type: "LineString", coordinates: [start, end] },
  };
}

async function mapboxDirections(label: string, kind: Extract<LineKind, "drive">, coords: [number, number][]) {
  const token = process.env.MAPBOX_SECRET_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) return null;

  const coordinateString = coords.map(([lng, lat]) => `${lng},${lat}`).join(";");
  const url = new URL(`https://api.mapbox.com/directions/v5/mapbox/driving/${coordinateString}`);
  url.searchParams.set("geometries", "geojson");
  url.searchParams.set("overview", "full");
  url.searchParams.set("alternatives", "false");
  url.searchParams.set("access_token", token);

  const response = await fetch(url, { next: { revalidate: 3600 } });
  if (!response.ok) return null;
  const data = await response.json();
  const geometry = data.routes?.[0]?.geometry;
  if (!geometry) return null;

  return {
    type: "Feature",
    properties: { label, kind },
    geometry,
  } satisfies RouteLineFeature;
}

async function mapboxOptimization(label: string, coords: [number, number][]) {
  const token = process.env.MAPBOX_SECRET_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token || coords.length < 2 || coords.length > 12) return null;

  const coordinateString = coords.map(([lng, lat]) => `${lng},${lat}`).join(";");
  const url = new URL(`https://api.mapbox.com/optimized-trips/v1/mapbox/driving/${coordinateString}`);
  url.searchParams.set("geometries", "geojson");
  url.searchParams.set("overview", "full");
  url.searchParams.set("source", "first");
  url.searchParams.set("destination", "last");
  url.searchParams.set("access_token", token);

  const response = await fetch(url, { next: { revalidate: 3600 } });
  if (!response.ok) return null;
  const data = await response.json();
  const geometry = data.trips?.[0]?.geometry;
  if (!geometry) return null;

  return {
    type: "Feature",
    properties: { label, kind: "activities" },
    geometry,
  } satisfies RouteLineFeature;
}

export async function GET(_request: Request, { params }: { params: Promise<{ tripId: string }> }) {
  const user = await requireUser();
  const { tripId } = await params;

  if (!(await userCanOpenTrip(tripId, user))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const db = getDb();
  const [segments, stops] = await Promise.all([
    db.select().from(travelSegments).where(eq(travelSegments.tripId, tripId)),
    db.select().from(activities).where(eq(activities.tripId, tripId)),
  ]);

  const features: RouteLineFeature[] = [];

  for (const segment of segments) {
    if (
      segment.startLng == null ||
      segment.startLat == null ||
      segment.endLng == null ||
      segment.endLat == null
    ) {
      continue;
    }

    const start: [number, number] = [segment.startLng, segment.startLat];
    const end: [number, number] = [segment.endLng, segment.endLat];
    const label = segment.title || `${segment.startLocationName} to ${segment.endLocationName}`;

    if (segment.type === "drive") {
      const routed = await mapboxDirections(label, "drive", [start, end]);
      features.push(routed ?? straightLine(label, "drive", start, end));
      continue;
    }

    features.push(straightLine(label, "flight", start, end));
  }

  const optimizedStops = stops
    .filter((stop) => stop.includeInRoute && stop.lng != null && stop.lat != null)
    .sort((a, b) => a.datetime.getTime() - b.datetime.getTime())
    .map((stop) => [stop.lng!, stop.lat!] as [number, number]);

  if (optimizedStops.length >= 2) {
    const optimized = await mapboxOptimization("Optimized activities", optimizedStops);
    features.push(
      optimized ??
        ({
          type: "Feature",
          properties: { label: "Optimized activities", fallback: true, kind: "activities" },
          geometry: { type: "LineString", coordinates: optimizedStops },
        } satisfies RouteLineFeature),
    );
  }

  return NextResponse.json({
    type: "FeatureCollection",
    features,
  });
}
