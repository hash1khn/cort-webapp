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
import { PageHeader } from "../../../components/PageLayout";
import { Card } from "../../../components/DashboardComponents";
import { Button } from "@/app/admin/ui/Button";
import StopAddressSearch from "@/app/admin/ui/StopAddressSearch";

type RouteStop = {
  id: number;
  name: string;
  morning_sequence?: number | null;
  evening_sequence?: number | null;
  morning_eta?: string | null;
  evening_eta?: string | null;
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
    } catch {
      toast.error("Failed to load route");
    } finally {
      setLoading(false);
    }
  }, [routeId, companyId]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!routeId) return;
    setSaving(true);
    try {
      await apiClient.updateRoute(routeId, {
        name: name.trim(),
        assigned_vehicle_id: vehicleId ? Number(vehicleId) : null,
        assigned_driver_id: driverId || null,
      });
      toast.success("Route updated");
      router.push(`/company/routes/${routeId}`);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to update route");
    } finally {
      setSaving(false);
    }
  };

  const handleAddStop = async ({ name: stopName, lat, lng }: { name: string; lat: number; lng: number }) => {
    if (!routeId) return;
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
    }
  };

  const handleDeleteStop = async (stopId: number) => {
    if (!confirm("Remove this stop?")) return;
    try {
      await apiClient.deleteRouteStop(stopId);
      toast.success("Stop removed");
      load();
    } catch {
      toast.error("Failed to remove stop");
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
    return (
      <Card className="py-16 text-center">
        <Loader2 className="w-5 h-5 mx-auto animate-spin text-[var(--text-muted)]" />
      </Card>
    );
  }

  const stops = route?.route_stops ?? [];

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto pb-12">
      <PageHeader
        label="Shuttle Operations"
        title="Edit Route"
        description={`Update route settings and stops for ${route?.name ?? ""}`}
        action={
          <div className="flex gap-2">
            <Link href={`/company/routes/${routeId}`}>
              <Button type="button" variant="outline">Cancel</Button>
            </Link>
            <Button onClick={handleSave} disabled={saving} className="bg-[var(--cort-orange)] text-white border-0">
              {saving ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        }
      />

      <Card className="p-6 space-y-4">
        <div>
          <label className="text-xs font-semibold text-[var(--text-muted)] uppercase">Route name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-lg border border-[var(--border-input)] bg-[var(--bg-input)] px-3 py-2 text-sm" />
        </div>
        <div className="grid grid-cols-2 gap-4">
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
        <StopAddressSearch onSelect={handleAddStop} placeholder="Add stop by address…" clearOnSelect />
        <div className="divide-y divide-[var(--border-light)]">
          {stops.map((stop, idx) => (
            <div key={stop.id} className="flex items-center justify-between py-3">
              <div>
                <span className="text-xs font-bold text-[var(--cort-orange)] mr-2">{idx + 1}</span>
                <span className="text-sm font-medium">{stop.name}</span>
              </div>
              <button type="button" onClick={() => handleDeleteStop(stop.id)} className="text-red-400 hover:text-red-600 p-1">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {stops.length === 0 && <p className="text-sm text-[var(--text-muted)] py-4">No stops yet.</p>}
        </div>
      </Card>
    </div>
  );
}
