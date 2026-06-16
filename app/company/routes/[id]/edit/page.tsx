"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAppSelector } from "../../../../lib/store/hooks";
import { selectCompany, selectCompanyFeatures } from "../../../../lib/store/slices/companySlice";
import { apiClient } from "../../../../lib/services/api-client";
import { useAuth } from "../../../../lib/contexts/auth-context";
import {
  PageHeader,
  CompanyPageLoader,
  CompanyLoadingButton,
} from "../../../components/PageLayout";
import { RouteStopsMap } from "../../../components/RouteStopsMap";
import { Card } from "../../../components/DashboardComponents";
import { Button } from "@/app/admin/ui/Button";
import StopAddressSearch from "@/app/admin/ui/StopAddressSearch";

type RouteStop = {
  id: number;
  name: string;
  lat?: number | null;
  lng?: number | null;
  morning_sequence?: number | null;
  evening_sequence?: number | null;
  morning_eta?: string | null;
  evening_eta?: string | null;
  sequence_order?: number;
};

type RouteDetail = {
  id: number;
  name: string;
  assigned_vehicle_id?: number | null;
  assigned_driver_id?: string | null;
  route_stops?: RouteStop[];
};

export default function EditCompanyRoutePage() {
  const params = useParams();
  const router = useRouter();
  const routeId = Number(params.id);
  const company = useAppSelector(selectCompany);
  const features = useAppSelector(selectCompanyFeatures);
  const { isCompanyAdmin } = useAuth();
  const companyId = Number(company?.id);

  const shuttleSelfManaged = features.find((f) => f.feature_key === "shuttle_self_managed")?.is_enabled ?? false;

  const [route, setRoute] = useState<RouteDetail | null>(null);
  const [name, setName] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [driverId, setDriverId] = useState("");
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addingStop, setAddingStop] = useState(false);
  const [deletingStopId, setDeletingStopId] = useState<number | null>(null);
  const [stopEdits, setStopEdits] = useState<Record<number, { morning_eta: string; evening_eta: string; direction: string }>>({});

  const load = useCallback(async () => {
    if (!routeId || !companyId) return;
    setLoading(true);
    try {
      const [routeData, vRes, dRes] = await Promise.all([
        apiClient.getRoute(routeId) as Promise<RouteDetail>,
        apiClient.getPoolVehicles(companyId),
        apiClient.getPoolDrivers(companyId),
      ]);
      setRoute(routeData);
      setName(routeData.name);
      setVehicleId(routeData.assigned_vehicle_id ? String(routeData.assigned_vehicle_id) : "");
      setDriverId(routeData.assigned_driver_id ?? "");
      setVehicles(vRes.data ?? []);
      setDrivers((dRes.data ?? []).filter((d: any) => d.driver_type === "SHUTTLE"));
      const edits: Record<number, { morning_eta: string; evening_eta: string; direction: string }> = {};
      (routeData.route_stops ?? []).forEach((s: RouteStop) => {
        const hasMorning = s.morning_sequence != null || s.morning_eta != null;
        const hasEvening = s.evening_sequence != null || s.evening_eta != null;
        edits[s.id] = {
          morning_eta: s.morning_eta ?? "08:00",
          evening_eta: s.evening_eta ?? "18:00",
          direction: hasMorning && hasEvening ? "BOTH" : hasEvening ? "EVENING" : "MORNING",
        };
      });
      setStopEdits(edits);
    } catch {
      toast.error("Failed to load route");
    } finally {
      setLoading(false);
    }
  }, [routeId, companyId]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!routeId || saving) return;
    setSaving(true);
    try {
      const stopUpdates = Object.entries(stopEdits).map(([id, edit]) =>
        apiClient.updateRouteStop(Number(id), {
          morning_eta: edit.direction !== "EVENING" ? edit.morning_eta : null,
          evening_eta: edit.direction !== "MORNING" ? edit.evening_eta : null,
          direction: edit.direction,
        })
      );
      await Promise.all([
        apiClient.updateRoute(routeId, {
          name: name.trim(),
          assigned_vehicle_id: vehicleId ? Number(vehicleId) : null,
          assigned_driver_id: driverId || null,
        }),
        ...stopUpdates,
      ]);
      toast.success("Route updated");
      router.push(`/company/routes/${routeId}`);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to update route");
    } finally {
      setSaving(false);
    }
  };

  const handleAddStop = async ({ name: stopName, lat, lng }: { name: string; lat: number; lng: number }) => {
    if (!routeId || addingStop) return;
    setAddingStop(true);
    try {
      await apiClient.addRouteStop(routeId, {
        name: stopName,
        lat,
        lng,
        morning_eta: "08:00",
        evening_eta: "18:00",
        sequence_order: (route?.route_stops?.length ?? 0) + 1,
        direction: "BOTH",
      });
      toast.success("Stop added");
      load();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to add stop");
    } finally {
      setAddingStop(false);
    }
  };

  const handleDeleteStop = async (stopId: number) => {
    if (!confirm("Remove this stop?") || deletingStopId != null) return;
    setDeletingStopId(stopId);
    try {
      await apiClient.deleteRouteStop(stopId);
      toast.success("Stop removed");
      load();
    } catch {
      toast.error("Failed to remove stop");
    } finally {
      setDeletingStopId(null);
    }
  };

  if (!isCompanyAdmin || !shuttleSelfManaged) {
    return (
      <Card className="p-8 text-center text-sm text-[var(--text-muted)]">
        Route editing requires company admin access and Self-Managed Shuttle.
      </Card>
    );
  }

  if (loading) {
    return <CompanyPageLoader label="Loading route…" minHeight="min-h-[50vh]" />;
  }

  const stops = route?.route_stops ?? [];

  return (
    <div className="flex flex-col gap-6 max-w-[1600px] mx-auto pb-12">
      <PageHeader
        label="Shuttle Operations"
        title="Edit Route"
        description={`Update route settings and stops for ${route?.name ?? ""}`}
        action={
          <div className="flex gap-2">
            <Link href={`/company/routes/${routeId}`}>
              <Button type="button" variant="outline">Cancel</Button>
            </Link>
            <CompanyLoadingButton onClick={handleSave} loading={saving} loadingText="Saving…">
              Save Changes
            </CompanyLoadingButton>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="flex flex-col gap-6">
          <Card className="p-6 space-y-4">
            <div>
              <label className="text-xs font-semibold text-[var(--text-muted)] uppercase">Route name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-lg border border-[var(--border-input)] bg-[var(--bg-input)] px-3 py-2 text-sm" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-[var(--text-muted)] uppercase">Pool vehicle</label>
                <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} className="mt-1 w-full rounded-lg border border-[var(--border-input)] bg-[var(--bg-input)] px-3 py-2 text-sm">
                  <option value="">None</option>
                  {vehicles.map((v) => <option key={v.id} value={v.id}>{v.plate_number}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--text-muted)] uppercase">Shuttle driver</label>
                <select value={driverId} onChange={(e) => setDriverId(e.target.value)} className="mt-1 w-full rounded-lg border border-[var(--border-input)] bg-[var(--bg-input)] px-3 py-2 text-sm">
                  <option value="">None</option>
                  {drivers.map((d) => <option key={d.user_id} value={d.user_id}>{d.users?.full_name}</option>)}
                </select>
              </div>
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <h3 className="font-semibold text-[var(--text-primary)]">Stops ({stops.length})</h3>
            <StopAddressSearch
              onSelect={handleAddStop}
              placeholder="Add stop by address…"
              clearOnSelect
            />
            {addingStop && (
              <p className="text-xs text-[var(--text-muted)] flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--cort-orange)]" />
                Adding stop…
              </p>
            )}
            <div className="divide-y divide-[var(--border-light)]">
              {stops.map((stop, idx) => {
                const edit = stopEdits[stop.id] ?? { morning_eta: "08:00", evening_eta: "18:00", direction: "BOTH" };
                const setEdit = (patch: Partial<typeof edit>) =>
                  setStopEdits((prev) => ({ ...prev, [stop.id]: { ...edit, ...patch } }));
                return (
                  <div key={stop.id} className="py-3 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-[var(--cort-orange)] mr-2">{idx + 1}</span>
                        <span className="text-sm font-medium">{stop.name}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteStop(stop.id)}
                        disabled={deletingStopId === stop.id}
                        className="text-red-400 hover:text-red-600 p-1 disabled:opacity-50"
                        title="Remove stop"
                      >
                        {deletingStopId === stop.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs pl-4">
                      <div>
                        <label className="block text-[var(--text-muted)] mb-0.5">Direction</label>
                        <select
                          value={edit.direction}
                          onChange={(e) => setEdit({ direction: e.target.value })}
                          className="rounded border border-[var(--border-input)] px-1 py-1 bg-[var(--bg-input)] w-full"
                        >
                          <option value="BOTH">Both</option>
                          <option value="MORNING">AM only</option>
                          <option value="EVENING">PM only</option>
                        </select>
                      </div>
                      {edit.direction !== "EVENING" && (
                        <div>
                          <label className="block text-[var(--text-muted)] mb-0.5">AM pickup</label>
                          <input
                            type="time"
                            value={edit.morning_eta}
                            onChange={(e) => setEdit({ morning_eta: e.target.value })}
                            className="rounded border border-[var(--border-input)] px-1 py-1 bg-[var(--bg-input)] w-full"
                          />
                        </div>
                      )}
                      {edit.direction !== "MORNING" && (
                        <div>
                          <label className="block text-[var(--text-muted)] mb-0.5">PM pickup</label>
                          <input
                            type="time"
                            value={edit.evening_eta}
                            onChange={(e) => setEdit({ evening_eta: e.target.value })}
                            className="rounded border border-[var(--border-input)] px-1 py-1 bg-[var(--bg-input)] w-full"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {stops.length === 0 && <p className="text-sm text-[var(--text-muted)] py-4">No stops yet.</p>}
            </div>
          </Card>
        </div>

        <Card className="lg:col-span-2 p-0 overflow-hidden min-h-[480px]">
          <div className="px-6 py-4 border-b border-[var(--border-light)]">
            <h3 className="font-semibold text-[var(--text-primary)]">Route Map</h3>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Stops and road polyline update as you add or remove stops
            </p>
          </div>
          <RouteStopsMap stops={stops} height="480px" />
        </Card>
      </div>
    </div>
  );
}
