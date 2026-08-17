"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { Building2, Sunrise, Sunset } from "lucide-react";
import { Card } from "../../components/DashboardComponents";
import { apiClient } from "../../../lib/services/api-client";
import type { MapMarker, MapPolyline } from "@/app/admin/ui/Map";
import type { CompanyRouteStop } from "./RouteStopsEditor";
import { getOfficeStops } from "../../../lib/utils/routeStops";

const Map = dynamic(() => import("@/app/admin/ui/Map"), { ssr: false });

type RouteOverviewMapProps = {
  routeId: number;
  stops: CompanyRouteStop[];
  refreshKey?: number;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function RouteOverviewMap({ routeId, stops, refreshKey = 0 }: RouteOverviewMapProps) {
  const t = useTranslations("company.routes");
  const [mapDirection, setMapDirection] = useState<"MORNING" | "EVENING">("MORNING");
  const [savedPolyline, setSavedPolyline] = useState<[number, number][]>([]);
  const officeStopIds = useMemo(() => new Set(getOfficeStops(stops).map((s) => s.id)), [stops]);

  const fetchPolyline = useCallback(async () => {
    try {
      const data = await apiClient.request<{ points: { lat: number; lng: number }[] }>(
        `/routes/${routeId}/polyline?direction=${mapDirection}`,
      );
      setSavedPolyline(data.points.map((p) => [p.lat, p.lng] as [number, number]));
    } catch {
      setSavedPolyline([]);
    }
  }, [routeId, mapDirection]);

  useEffect(() => {
    setSavedPolyline([]);
    fetchPolyline();
  }, [fetchPolyline, refreshKey]);

  const dirStops = useMemo(
    () =>
      [...stops]
        .filter((s) => {
          if (s.lat == null || s.lng == null || isNaN(Number(s.lat)) || isNaN(Number(s.lng))) return false;
          return mapDirection === "MORNING" ? s.morning_sequence != null : s.evening_sequence != null;
        })
        .sort((a, b) =>
          mapDirection === "MORNING"
            ? (a.morning_sequence ?? 0) - (b.morning_sequence ?? 0)
            : (a.evening_sequence ?? 0) - (b.evening_sequence ?? 0),
        ),
    [stops, mapDirection],
  );

  const mapMarkers: MapMarker[] = useMemo(
    () =>
      dirStops.map((s, idx) => {
        const isOffice = officeStopIds.has(s.id);
        return {
          id: s.id.toString(),
          position: [Number(s.lat), Number(s.lng)] as [number, number],
          label: isOffice ? `Office · ${s.name}` : `${idx + 1}. ${s.name}`,
          color: isOffice ? "#ef4444" : "#6366f1",
        };
      }),
    [dirStops, officeStopIds],
  );

  const mapPolylines: MapPolyline[] = useMemo(() => {
    if (savedPolyline.length >= 2) {
      return [{ positions: savedPolyline, color: "#0C225E" }];
    }
    if (dirStops.length > 1) {
      return [{
        positions: dirStops.map((s) => [Number(s.lat), Number(s.lng)] as [number, number]),
        color: "#6366f1",
      }];
    }
    return [];
  }, [savedPolyline, dirStops]);

  return (
    <Card className="!p-0 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-[var(--border-light)] bg-[var(--bg-subtle)]">
        <div>
          <div className="text-sm font-semibold text-[var(--text-primary)]">{t("routeMap")}</div>
          <div className="text-xs text-[var(--text-muted)]">{t("routeMapDescription")}</div>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-red-600 bg-red-50 border border-red-200 px-2 py-1 rounded-lg">
            <Building2 className="w-3 h-3" /> Office = {mapDirection === "MORNING" ? "AM last" : "PM first"}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setMapDirection("MORNING")}
              className={cx(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border",
                mapDirection === "MORNING"
                  ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                  : "bg-[var(--bg-card)] text-[var(--text-muted)] border-[var(--border-light)] hover:text-[var(--text-primary)]",
              )}
            >
              <Sunrise className="w-3.5 h-3.5" />
              {t("morningRoute")}
            </button>
            <button
              type="button"
              onClick={() => setMapDirection("EVENING")}
              className={cx(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border",
                mapDirection === "EVENING"
                  ? "bg-indigo-500/10 text-indigo-600 border-indigo-500/30"
                  : "bg-[var(--bg-card)] text-[var(--text-muted)] border-[var(--border-light)] hover:text-[var(--text-primary)]",
              )}
            >
              <Sunset className="w-3.5 h-3.5" />
              {t("eveningRoute")}
            </button>
          </div>
        </div>
      </div>

      <div className="relative" style={{ height: 420 }}>
        {dirStops.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-[var(--text-muted)]">
            {t("noStopsForDirection")}
          </div>
        ) : (
          <Map height="100%" markers={mapMarkers} polylines={mapPolylines} />
        )}
      </div>
    </Card>
  );
}
