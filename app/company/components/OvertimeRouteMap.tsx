"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import type { MapMarker, MapPolyline } from "@/app/admin/ui/Map";

const Map = dynamic(() => import("@/app/admin/ui/Map"), { ssr: false });

export type OvertimeRouteMapData = {
  route_id: number;
  route_name: string;
  trip_id?: number | null;
  employees_excluded: number;
  stops_skipped: number;
  stops_remaining: number;
  original_polyline: Array<{ lat: number; lng: number }>;
  optimized_polyline: Array<{ lat: number; lng: number }>;
  stops: Array<{
    id: number;
    name: string;
    lat: number;
    lng: number;
    evening_sequence: number | null;
    is_skipped: boolean;
  }>;
};

type Props = {
  routes: OvertimeRouteMapData[];
  height?: string;
};

export function OvertimeRouteMap({ routes, height = "320px" }: Props) {
  const activeRoute = routes[0];

  const { markers, polylines, center } = useMemo(() => {
    if (!activeRoute) {
      return { markers: [] as MapMarker[], polylines: [] as MapPolyline[], center: undefined };
    }

    const markers: MapMarker[] = activeRoute.stops.map((stop) => ({
      id: `stop-${stop.id}`,
      position: [stop.lat, stop.lng] as [number, number],
      label: stop.evening_sequence != null ? String(stop.evening_sequence) : stop.name,
      color: stop.is_skipped ? "#94a3b8" : "#22c55e",
    }));

    const polylines: MapPolyline[] = [];

    if (activeRoute.original_polyline.length >= 2) {
      polylines.push({
        positions: activeRoute.original_polyline.map((p) => [p.lat, p.lng] as [number, number]),
        color: "#94a3b8",
        weight: 4,
        opacity: 0.55,
        dashArray: "8 8",
      });
    }

    if (activeRoute.optimized_polyline.length >= 2) {
      polylines.push({
        positions: activeRoute.optimized_polyline.map((p) => [p.lat, p.lng] as [number, number]),
        color: "#fe8503",
        weight: 5,
        opacity: 0.95,
      });
    }

    const allPoints = [
      ...activeRoute.original_polyline,
      ...activeRoute.optimized_polyline,
      ...activeRoute.stops.map((s) => ({ lat: s.lat, lng: s.lng })),
    ];
    const center: [number, number] | undefined =
      allPoints.length > 0
        ? [
            allPoints.reduce((sum, p) => sum + p.lat, 0) / allPoints.length,
            allPoints.reduce((sum, p) => sum + p.lng, 0) / allPoints.length,
          ]
        : undefined;

    return { markers, polylines, center };
  }, [activeRoute]);

  if (!activeRoute) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-[var(--border-light)] bg-[var(--surface-subtle)]/40 text-sm text-[var(--text-muted)]"
        style={{ height }}
      >
        No route map available for this request.
      </div>
    );
  }

  if (markers.length === 0 && polylines.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-[var(--border-light)] bg-[var(--surface-subtle)]/40 text-sm text-[var(--text-muted)]"
        style={{ height }}
      >
        Route stops or polylines are not configured yet for {activeRoute.route_name}.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {routes.length > 1 && (
        <p className="text-xs text-[var(--text-muted)]">
          Showing map for {activeRoute.route_name}. This request affects {routes.length} routes.
        </p>
      )}
      <div className="rounded-lg overflow-hidden border border-[var(--border-light)]">
        <Map markers={markers} polylines={polylines} center={center} zoom={12} height={height} />
      </div>
      <div className="flex flex-wrap gap-4 text-xs text-[var(--text-muted)]">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-6 border-t-2 border-dashed border-slate-400" />
          Original evening route
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-1 w-6 rounded bg-[#fe8503]" />
          Optimized route after exclusions
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />
          Active stop
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-slate-400" />
          Skipped stop
        </span>
      </div>
    </div>
  );
}

export function OvertimeRouteMapTabs({
  routes,
  height = "320px",
}: {
  routes: OvertimeRouteMapData[];
  height?: string;
}) {
  if (routes.length <= 1) {
    return <OvertimeRouteMap routes={routes} height={height} />;
  }

  return (
    <div className="space-y-4">
      {routes.map((route) => (
        <div key={route.route_id} className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-semibold text-[var(--text-primary)]">{route.route_name}</span>
            <span className="text-[var(--text-muted)]">
              {route.employees_excluded} removed · {route.stops_skipped} stops skipped ·{" "}
              {route.stops_remaining} remaining
            </span>
          </div>
          <OvertimeRouteMap routes={[route]} height={height} />
        </div>
      ))}
    </div>
  );
}
