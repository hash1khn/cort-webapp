"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiClient } from "../../lib/services/api-client";
import type { MapMarker, MapPolyline } from "@/app/admin/ui/Map";
import { CompanyPageLoader } from "./PageLayout";

const Map = dynamic(() => import("@/app/admin/ui/Map"), { ssr: false });

export type RouteStopMapInput = {
  id: number | string;
  name: string;
  lat?: number | null;
  lng?: number | null;
  morning_sequence?: number | null;
  evening_sequence?: number | null;
  sequence_order?: number;
};

type PolylineResponse = { points: { lat: number; lng: number }[] };

type Props = {
  stops: RouteStopMapInput[];
  height?: string;
  direction?: "MORNING" | "EVENING" | "ALL";
  className?: string;
};

function sortStops(stops: RouteStopMapInput[], direction: Props["direction"]) {
  const withCoords = stops.filter(
    (s) => typeof s.lat === "number" && typeof s.lng === "number",
  );
  if (withCoords.length === 0) return [];

  return [...withCoords].sort((a, b) => {
    if (direction === "MORNING") {
      return (a.morning_sequence ?? 999) - (b.morning_sequence ?? 999);
    }
    if (direction === "EVENING") {
      return (a.evening_sequence ?? 999) - (b.evening_sequence ?? 999);
    }
    const aSeq = a.morning_sequence ?? a.evening_sequence ?? a.sequence_order ?? 999;
    const bSeq = b.morning_sequence ?? b.evening_sequence ?? b.sequence_order ?? 999;
    return aSeq - bSeq;
  });
}

export function RouteStopsMap({
  stops,
  height = "360px",
  direction = "ALL",
  className,
}: Props) {
  const [routePolyline, setRoutePolyline] = useState<[number, number][]>([]);
  const [polylineLoading, setPolylineLoading] = useState(false);

  const orderedStops = useMemo(
    () => sortStops(stops, direction),
    [stops, direction],
  );

  const fetchPreviewPolyline = useCallback(async (ordered: RouteStopMapInput[]) => {
    if (ordered.length < 2) {
      setRoutePolyline([]);
      return;
    }
    setPolylineLoading(true);
    try {
      const data = await apiClient.request<PolylineResponse>("/routes/preview-polyline", {
        method: "POST",
        body: JSON.stringify({
          stops: ordered.map((s) => ({ lat: s.lat, lng: s.lng })),
        }),
      });
      setRoutePolyline(data.points.map((p) => [p.lat, p.lng] as [number, number]));
    } catch {
      setRoutePolyline(
        ordered.map((s) => [s.lat as number, s.lng as number] as [number, number]),
      );
    } finally {
      setPolylineLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => fetchPreviewPolyline(orderedStops), 300);
    return () => clearTimeout(timer);
  }, [orderedStops, fetchPreviewPolyline]);

  const mapMarkers: MapMarker[] = orderedStops.map((stop, index) => ({
    id: String(stop.id),
    position: [stop.lat as number, stop.lng as number],
    label: `${index + 1}. ${stop.name}`,
    color:
      index === 0
        ? "#22c55e"
        : index === orderedStops.length - 1
          ? "#ef4444"
          : "#6366f1",
  }));

  const fallbackLine: [number, number][] = orderedStops.map(
    (s) => [s.lat as number, s.lng as number] as [number, number],
  );

  const mapPolylines: MapPolyline[] =
    routePolyline.length >= 2
      ? [{ positions: routePolyline, color: "#fe8503" }]
      : fallbackLine.length >= 2
        ? [{ positions: fallbackLine, color: "#2563eb" }]
        : [];

  if (orderedStops.length === 0) {
    return (
      <div
        className={className}
        style={{ height }}
      >
        <div className="flex h-full items-center justify-center rounded-xl border border-[var(--border-light)] bg-[var(--surface-subtle)]/50 px-4 text-center text-sm text-[var(--text-muted)]">
          Add stops with coordinates to see the route map and polyline.
        </div>
      </div>
    );
  }

  return (
    <div className={className} style={{ height, position: "relative" }}>
      {polylineLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-[var(--bg-card)]/60 backdrop-blur-[1px]">
          <CompanyPageLoader label="Loading route…" minHeight="min-h-0" />
        </div>
      )}
      <Map
        height="100%"
        markers={mapMarkers}
        polylines={mapPolylines}
        center={[orderedStops[0].lat as number, orderedStops[0].lng as number]}
        zoom={12}
      />
    </div>
  );
}
