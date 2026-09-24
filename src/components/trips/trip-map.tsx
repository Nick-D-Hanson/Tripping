"use client";

import mapboxgl, { LngLatBounds } from "mapbox-gl";
import type { StyleSpecification } from "mapbox-gl";
import { Info } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { SectionState } from "@/components/ui/section-state";
import { fmtDateTime } from "@/lib/dates";
import { cn } from "@/lib/utils";

export type TripMapPoint = {
  id: string;
  kind: "travel" | "lodging" | "activity" | "food" | "idea";
  label: string;
  lng: number;
  lat: number;
  day?: string;
  endDay?: string;
  detail?: string;
  detailDateTime?: string | Date;
  detailPrefix?: string;
  address?: string | null;
  notes?: string | null;
  url?: string | null;
  timelineItemId?: string;
};

type TripMapProps = {
  tripId: string;
  token?: string;
  styleUrl?: string;
  points: TripMapPoint[];
  fallbackLines: Array<{
    kind: "drive" | "flight";
    coordinates: [[number, number], [number, number]];
  }>;
  className?: string;
  selectedPointId?: string | null;
  focusPointId?: string | null;
  onSelectPoint?: (point: TripMapPoint) => void;
  visible?: boolean;
  showRoutes?: boolean;
};

type RouteFeature = GeoJSON.Feature<
  GeoJSON.LineString,
  { label?: string; fallback?: boolean; kind?: "drive" | "flight" | "activities" }
>;
type RouteGeoJson = GeoJSON.FeatureCollection<GeoJSON.LineString, RouteFeature["properties"]>;

const markerColors = {
  travel: "#0f766e",
  lodging: "#d97706",
  activity: "#2563eb",
  food: "#db2777",
  idea: "#7c3aed",
};

const defaultMapStyle = "mapbox://styles/mapbox/streets-v12";

const localTripStyle: StyleSpecification = {
  version: 8,
  sources: {
    carto: {
      type: "raster",
      tiles: ["https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors © CARTO",
    },
  },
  layers: [
    {
      id: "trip-carto",
      type: "raster",
      source: "carto",
    },
  ],
};

function fallbackGeoJson(lines: TripMapProps["fallbackLines"]): RouteGeoJson {
  return {
    type: "FeatureCollection",
    features: lines.map((line, index) => ({
      type: "Feature",
      id: index,
      properties: { fallback: true, kind: line.kind },
      geometry: {
        type: "LineString",
        coordinates: line.coordinates,
      },
    }) satisfies RouteFeature),
  };
}

function buildPopupContent(point: TripMapPoint) {
  const wrapper = document.createElement("div");

  const title = document.createElement("strong");
  title.textContent = point.label;
  wrapper.appendChild(title);

  const kind = document.createElement("div");
  kind.textContent = point.kind;
  wrapper.appendChild(kind);

  const detailText = point.detailDateTime
    ? `${point.detailPrefix ? `${point.detailPrefix} ` : ""}${fmtDateTime(point.detailDateTime)}`
    : point.detail;

  if (detailText) {
    const detail = document.createElement("small");
    detail.textContent = detailText;
    wrapper.appendChild(document.createElement("br"));
    wrapper.appendChild(detail);
  }

  return wrapper;
}

export function TripMap({ tripId, token, styleUrl, points, fallbackLines, className, selectedPointId, focusPointId, onSelectPoint, visible = true, showRoutes = true }: TripMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const routeRef = useRef<RouteGeoJson>(fallbackGeoJson(fallbackLines));
  const [route, setRoute] = useState<RouteGeoJson>(() => fallbackGeoJson(showRoutes ? fallbackLines : []));

  const fallback = useMemo(() => fallbackGeoJson(showRoutes ? fallbackLines : []), [fallbackLines, showRoutes]);
  const firstPoint = points[0];

  useEffect(() => {
    let cancelled = false;

    if (!showRoutes) {
      return () => {
        cancelled = true;
      };
    }

    fetch(`/api/trips/${tripId}/route`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data: RouteGeoJson | null) => {
        if (!cancelled && data?.features?.length) setRoute(data);
      })
      .catch(() => {
        if (!cancelled) setRoute(fallback);
      });

    return () => {
      cancelled = true;
    };
  }, [tripId, fallback, showRoutes]);

  useEffect(() => {
    routeRef.current = route;
  }, [route]);

  useEffect(() => {
    if (!visible) return;
    const frame = window.requestAnimationFrame(() => mapRef.current?.resize());
    return () => window.cancelAnimationFrame(frame);
  }, [visible]);

  useEffect(() => {
    if (!containerRef.current || !token) return;

    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: styleUrl || defaultMapStyle,
      center: firstPoint ? [firstPoint.lng, firstPoint.lat] : [-98.5795, 39.8283],
      zoom: firstPoint ? 8 : 3,
      attributionControl: true,
    });

    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true, showCompass: false }), "top-right");
    mapRef.current = map;
    const resizeObserver = new ResizeObserver(() => map.resize());
    resizeObserver.observe(containerRef.current);

    map.on("error", () => {
      if (map.getStyle()?.sprite || map.getStyle()?.sources?.composite) {
        map.setStyle(localTripStyle);
      }
    });

    map.on("load", () => {
      map.addSource("trip-route", { type: "geojson", data: routeRef.current });
      map.addLayer({
        id: "trip-route-line",
        type: "line",
        source: "trip-route",
        paint: {
          "line-color": [
            "match",
            ["get", "kind"],
            "flight",
            "#7c3aed",
            "activities",
            "#2563eb",
            "#0f766e",
          ],
          "line-width": [
            "match",
            ["get", "kind"],
            "flight",
            3,
            "activities",
            3,
            5,
          ],
          "line-opacity": 0.82,
          "line-dasharray": [
            "case",
            ["==", ["get", "kind"], "flight"],
            ["literal", [2, 1.5]],
            ["boolean", ["get", "fallback"], false],
            ["literal", [1.2, 1.2]],
            ["literal", [1, 0]],
          ],
        },
      });
    });

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, [token, styleUrl, firstPoint]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const source = map.getSource("trip-route") as mapboxgl.GeoJSONSource | undefined;
    if (source) source.setData(route);
  }, [route]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = points.map((point) => {
      const marker = new mapboxgl.Marker({ color: markerColors[point.kind] })
        .setLngLat([point.lng, point.lat])
        .setPopup(new mapboxgl.Popup({ offset: 20 }).setDOMContent(buildPopupContent(point)))
        .addTo(map);
      const element = marker.getElement();
      element.setAttribute("aria-label", `Show details for ${point.label}`);
      element.setAttribute("role", "button");
      element.tabIndex = 0;
      element.style.filter = selectedPointId === point.id ? "drop-shadow(0 0 0.35rem rgba(36, 94, 83, 0.6))" : "";
      const selectPoint = () => onSelectPoint?.(point);
      element.addEventListener("click", selectPoint);
      element.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") selectPoint();
      });
      return marker;
    });

    const focusPoint = focusPointId ? points.find((point) => point.id === focusPointId) : null;
    if (focusPoint) {
      map.easeTo({ center: [focusPoint.lng, focusPoint.lat], zoom: 12, duration: 600 });
    } else if (points.length) {
      const bounds = points.reduce((acc, point) => acc.extend([point.lng, point.lat]), new LngLatBounds([points[0].lng, points[0].lat], [points[0].lng, points[0].lat]));
      map.fitBounds(bounds, { padding: 70, maxZoom: 12, duration: 600 });
    }
  }, [focusPointId, onSelectPoint, points, selectedPointId]);

  if (!token) {
    return (
      <SectionState
        title="Map token missing"
        description="Add NEXT_PUBLIC_MAPBOX_TOKEN to render the interactive trip map."
        icon={Info}
        variant="info"
        className="flex min-h-[320px] items-center sm:min-h-[420px]"
      />
    );
  }

  return <div ref={containerRef} className={cn("h-[480px] w-full overflow-hidden bg-muted md:h-full md:min-h-[680px]", className)} />;
}
