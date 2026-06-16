"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GripVertical, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAppSelector } from "../../../lib/store/hooks";
import { selectCompany, selectCompanyFeatures } from "../../../lib/store/slices/companySlice";
import { apiClient } from "../../../lib/services/api-client";
import { useAuth } from "../../../lib/contexts/auth-context";
import { PageHeader } from "../../components/PageLayout";
import { Card } from "../../components/DashboardComponents";
import { Button } from "@/app/admin/ui/Button";
import StopAddressSearch from "@/app/admin/ui/StopAddressSearch";
import type { MapMarker, MapPolyline } from "@/app/admin/ui/Map";

const Map = dynamic(() => import("@/app/admin/ui/Map"), { ssr: false });

type StopDirection = "MORNING" | "EVENING" | "BOTH";

interface Stop {
  id: string;
  name: string;
  lat: number;
  lng: number;
  morningEta: string;
  eveningEta: string;
  direction: StopDirection;
}

type PolylineResponse = { points: { lat: number; lng: number }[] };

export default function CreateCompanyRoutePage() {
  const router = useRouter();
  const company = useAppSelector(selectCompany);
  const features = useAppSelector(selectCompanyFeatures);
  const { isCompanyAdmin } = useAuth();
  const companyId = Number(company?.id);

  const shuttleSelfManaged = features.find((f) => f.feature_key === "shuttle_self_managed")?.is_enabled ?? false;

  const [name, setName] = useState("");
  const [assignedVehicleId, setAssignedVehicleId] = useState("");
  const [assignedDriverId, setAssignedDriverId] = useState("");
  const [stops, setStops] = useState<Stop[]>([]);
  const [routePolyline, setRoutePolyline] = useState<[number, number][]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const polylineDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!companyId || !shuttleSelfManaged) return;
    Promise.all([
      apiClient.getPoolVehicles(companyId),
      apiClient.getPoolDrivers(companyId),
    ]).then(([vRes, dRes]) => {
      setVehicles(vRes.data ?? []);
      setDrivers((dRes.data ?? []).filter((d: any) => d.driver_type === "SHUTTLE"));
    }).catch(() => toast.error("Failed to load pool fleet"));
  }, [companyId, shuttleSelfManaged]);

  const fetchPreviewPolyline = useCallback(async (currentStops: Stop[]) => {
    if (currentStops.length < 2) {
      setRoutePolyline([]);
      return;
    }
    try {
      const data = await apiClient.request<PolylineResponse>("/routes/preview-polyline", {
        method: "POST",
        body: JSON.stringify({ stops: currentStops.map((s) => ({ lat: s.lat, lng: s.lng })) }),
      });
      setRoutePolyline(data.points.map((p) => [p.lat, p.lng] as [number, number]));
    } catch {
      setRoutePolyline(currentStops.map((s) => [s.lat, s.lng] as [number, number]));
    }
  }, []);

  const schedulePolylineUpdate = useCallback((updatedStops: Stop[]) => {
    if (polylineDebounceRef.current) clearTimeout(polylineDebounceRef.current);
    polylineDebounceRef.current = setTimeout(() => fetchPreviewPolyline(updatedStops), 600);
  }, [fetchPreviewPolyline]);

  const addStop = useCallback((stopName: string, lat: number, lng: number) => {
    const newStop: Stop = {
      id: crypto.randomUUID(),
      name: stopName,
      lat,
      lng,
      morningEta: "08:00",
      eveningEta: "18:00",
      direction: "BOTH",
    };
    setStops((prev) => {
      const updated = [...prev, newStop];
      schedulePolylineUpdate(updated);
      return updated;
    });
  }, [schedulePolylineUpdate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !name.trim()) {
      toast.error("Route name is required");
      return;
    }
    if (stops.length < 2) {
      toast.error("Add at least 2 stops");
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.createRoute({
        name: name.trim(),
        company_id: companyId,
        assigned_vehicle_id: assignedVehicleId ? Number(assignedVehicleId) : undefined,
        assigned_driver_id: assignedDriverId || undefined,
        stops: stops.map((stop, index) => ({
          name: stop.name,
          lat: stop.lat,
          lng: stop.lng,
          morning_eta: stop.direction !== "EVENING" ? stop.morningEta : undefined,
          evening_eta: stop.direction !== "MORNING" ? stop.eveningEta : undefined,
          sequence_order: index + 1,
          direction: stop.direction,
        })),
      });
      toast.success("Route created");
      router.push("/company/routes");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to create route");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isCompanyAdmin || !shuttleSelfManaged) {
    return (
      <Card className="p-8 text-center text-sm text-[var(--text-muted)]">
        Route creation is available for company admins when Self-Managed Shuttle is enabled.
        <div className="mt-4">
          <Link href="/company/routes" className="text-[var(--cort-orange)] hover:underline">Back to routes</Link>
        </div>
      </Card>
    );
  }

  const mapMarkers: MapMarker[] = stops.map((s, index) => ({
    id: s.id,
    position: [s.lat, s.lng],
    label: `${index + 1}. ${s.name}`,
    color: index === 0 ? "#22c55e" : index === stops.length - 1 ? "#ef4444" : "#6366f1",
  }));

  const mapPolylines: MapPolyline[] = routePolyline.length >= 2
    ? [{ positions: routePolyline, color: "#fe8503" }]
    : stops.length > 1
      ? [{ positions: stops.map((s) => [s.lat, s.lng] as [number, number]), color: "#2563eb" }]
      : [];

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 max-w-[1600px] mx-auto pb-12 h-[calc(100vh-8rem)]">
      <PageHeader
        label="Shuttle Operations"
        title="Create Route"
        description="Define stops, assign your pool vehicle and shuttle driver."
        action={
          <div className="flex gap-2">
            <Link href="/company/routes">
              <Button type="button" variant="outline">Cancel</Button>
            </Link>
            <Button type="submit" disabled={submitting} className="bg-[var(--cort-orange)] text-white border-0">
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving…</> : "Save Route"}
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        <Card className="p-4 flex flex-col gap-4 overflow-hidden">
          <div>
            <label className="text-xs font-semibold text-[var(--text-muted)] uppercase">Route name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Production Line A"
              className="mt-1 w-full rounded-lg border border-[var(--border-input)] bg-[var(--bg-input)] px-3 py-2 text-sm"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-[var(--text-muted)] uppercase">Pool vehicle</label>
              <select
                value={assignedVehicleId}
                onChange={(e) => setAssignedVehicleId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--border-input)] bg-[var(--bg-input)] px-3 py-2 text-sm"
              >
                <option value="">None</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>{v.plate_number}{v.model ? ` · ${v.model}` : ""}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-[var(--text-muted)] uppercase">Shuttle driver</label>
              <select
                value={assignedDriverId}
                onChange={(e) => setAssignedDriverId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--border-input)] bg-[var(--bg-input)] px-3 py-2 text-sm"
              >
                <option value="">None</option>
                {drivers.map((d) => (
                  <option key={d.user_id} value={d.user_id}>{d.users?.full_name ?? d.user_id}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-[var(--text-muted)] uppercase">Add stop by address</label>
            <StopAddressSearch
              onSelect={({ name: stopName, lat, lng }) => addStop(stopName, lat, lng)}
              placeholder="Search location…"
              clearOnSelect
              className="mt-1"
            />
            <p className="text-xs text-[var(--text-muted)] mt-1">Or click the map to add a stop.</p>
          </div>
          <div className="flex-1 overflow-y-auto min-h-0 space-y-2">
            {stops.map((stop, index) => (
              <div key={stop.id} className="rounded-lg border border-[var(--border-light)] p-3 bg-[var(--bg-subtle)]">
                <div className="flex items-center gap-2 mb-2">
                  <GripVertical className="w-4 h-4 text-[var(--text-muted)]" />
                  <span className="text-xs font-bold text-[var(--cort-orange)]">{index + 1}</span>
                  <input
                    value={stop.name}
                    onChange={(e) => setStops((prev) => prev.map((s) => s.id === stop.id ? { ...s, name: e.target.value } : s))}
                    className="flex-1 rounded border border-[var(--border-input)] px-2 py-1 text-sm bg-[var(--bg-input)]"
                  />
                  <button
                    type="button"
                    onClick={() => setStops((prev) => {
                      const updated = prev.filter((s) => s.id !== stop.id);
                      schedulePolylineUpdate(updated);
                      return updated;
                    })}
                    className="text-red-400 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs pl-6">
                  <div>
                    <label className="block text-[var(--text-muted)] mb-0.5">Direction</label>
                    <select
                      value={stop.direction}
                      onChange={(e) => setStops((prev) => prev.map((s) => s.id === stop.id ? { ...s, direction: e.target.value as StopDirection } : s))}
                      className="rounded border border-[var(--border-input)] px-1 py-1 bg-[var(--bg-input)] w-full"
                    >
                      <option value="BOTH">Both</option>
                      <option value="MORNING">AM only</option>
                      <option value="EVENING">PM only</option>
                    </select>
                  </div>
                  {stop.direction !== "EVENING" && (
                    <div>
                      <label className="block text-[var(--text-muted)] mb-0.5">AM pickup</label>
                      <input type="time" value={stop.morningEta} onChange={(e) => setStops((prev) => prev.map((s) => s.id === stop.id ? { ...s, morningEta: e.target.value } : s))} className="rounded border border-[var(--border-input)] px-1 py-1 bg-[var(--bg-input)] w-full" />
                    </div>
                  )}
                  {stop.direction !== "MORNING" && (
                    <div>
                      <label className="block text-[var(--text-muted)] mb-0.5">PM pickup</label>
                      <input type="time" value={stop.eveningEta} onChange={(e) => setStops((prev) => prev.map((s) => s.id === stop.id ? { ...s, eveningEta: e.target.value } : s))} className="rounded border border-[var(--border-input)] px-1 py-1 bg-[var(--bg-input)] w-full" />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card className="lg:col-span-2 p-0 overflow-hidden min-h-[400px]">
          <Map
            height="100%"
            onMapClick={(lat, lng) => addStop(`Stop ${stops.length + 1}`, lat, lng)}
            markers={mapMarkers}
            polylines={mapPolylines}
            center={stops.length > 0 ? [stops[0].lat, stops[0].lng] : undefined}
          />
        </Card>
      </div>
    </form>
  );
}
