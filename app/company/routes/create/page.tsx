"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { GripVertical, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAppSelector } from "../../../lib/store/hooks";
import { selectCompany } from "../../../lib/store/slices/companySlice";
import { apiClient } from "../../../lib/services/api-client";
import { PoolDriver, PoolVehicle } from "../../../lib/services/types/multi-mode";
import { useAuth } from "../../../lib/contexts/auth-context";
import StopAddressSearch from "@/app/admin/ui/StopAddressSearch";
import type { MapMarker, MapPolyline } from "@/app/admin/ui/Map";

const Map = dynamic(() => import("@/app/admin/ui/Map"), { ssr: false });

interface Stop {
    id: string;
    name: string;
    lat: number;
    lng: number;
    morningEta: string;
    eveningEta: string;
}

const inputCls = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm";
const labelCls = "block text-xs font-semibold text-gray-500 mb-1";
const cancelBtnCls = "rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50";
const saveBtnCls = "rounded-lg bg-[#0c225e] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0c225e]/90 disabled:opacity-60";

export default function CompanyCreateRoutePage() {
    const router = useRouter();
    const { user } = useAuth();
    const company = useAppSelector(selectCompany);
    const companyId = Number(company?.id);

    const [name, setName] = useState("");
    const [assignedVehicleId, setAssignedVehicleId] = useState("");
    const [assignedDriverId, setAssignedDriverId] = useState("");
    const [stops, setStops] = useState<Stop[]>([]);
    const [routePolyline, setRoutePolyline] = useState<[number, number][]>([]);
    const [saving, setSaving] = useState(false);
    const [vehicles, setVehicles] = useState<PoolVehicle[]>([]);
    const [drivers, setDrivers] = useState<PoolDriver[]>([]);

    const polylineDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (!companyId) return;
        apiClient.getPoolVehicles(companyId).then((r) => setVehicles(r.data)).catch(() => {});
        apiClient.getPoolDrivers(companyId).then((r) => {
            setDrivers(r.data.filter((d) => d.driver_type === "SHUTTLE"));
        }).catch(() => {});
    }, [companyId]);

    const fetchPreviewPolyline = useCallback(async (currentStops: Stop[]) => {
        if (currentStops.length < 2) {
            setRoutePolyline([]);
            return;
        }
        try {
            const data = await apiClient.previewCompanyRoutePolyline(
                currentStops.map((s) => ({ lat: s.lat, lng: s.lng })),
            );
            setRoutePolyline(data.points.map((p) => [p.lat, p.lng] as [number, number]));
        } catch {
            setRoutePolyline(currentStops.map((s) => [s.lat, s.lng] as [number, number]));
        }
    }, []);

    const schedulePolylineUpdate = useCallback(
        (updatedStops: Stop[]) => {
            if (polylineDebounceRef.current) clearTimeout(polylineDebounceRef.current);
            polylineDebounceRef.current = setTimeout(() => fetchPreviewPolyline(updatedStops), 600);
        },
        [fetchPreviewPolyline],
    );

    const handleAddressSelect = useCallback(
        ({ name: stopName, lat, lng }: { name: string; lat: number; lng: number }) => {
            const newStop: Stop = {
                id: crypto.randomUUID(),
                name: stopName,
                lat,
                lng,
                morningEta: "08:00",
                eveningEta: "18:00",
            };
            setStops((prev) => {
                const updated = [...prev, newStop];
                schedulePolylineUpdate(updated);
                return updated;
            });
            toast.success(`Stop "${stopName}" added`);
        },
        [schedulePolylineUpdate],
    );

    const handleMapClick = useCallback(
        (lat: number, lng: number) => {
            const newStop: Stop = {
                id: crypto.randomUUID(),
                name: `Stop ${stops.length + 1}`,
                lat,
                lng,
                morningEta: "08:00",
                eveningEta: "18:00",
            };
            setStops((prev) => {
                const updated = [...prev, newStop];
                schedulePolylineUpdate(updated);
                return updated;
            });
        },
        [stops.length, schedulePolylineUpdate],
    );

    const handleRemoveStop = (id: string) => {
        setStops((prev) => {
            const updated = prev.filter((s) => s.id !== id);
            schedulePolylineUpdate(updated);
            return updated;
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!companyId) {
            toast.error("Company not loaded");
            return;
        }
        if (!name.trim()) {
            toast.error("Route name is required");
            return;
        }
        if (stops.length < 2) {
            toast.error("A route must have at least 2 stops");
            return;
        }
        setSaving(true);
        try {
            await apiClient.createCompanyRoute({
                name: name.trim(),
                company_id: companyId,
                assigned_vehicle_id: assignedVehicleId ? Number(assignedVehicleId) : undefined,
                assigned_driver_id: assignedDriverId || undefined,
                stops: stops.map((stop, index) => ({
                    name: stop.name,
                    lat: stop.lat,
                    lng: stop.lng,
                    morning_eta: stop.morningEta,
                    evening_eta: stop.eveningEta,
                    sequence_order: index + 1,
                })),
            });
            toast.success("Route created successfully!");
            router.push("/company/routes");
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Failed to create route");
        } finally {
            setSaving(false);
        }
    };

    const mapMarkers: MapMarker[] = stops.map((s, index) => ({
        id: s.id,
        position: [s.lat, s.lng],
        label: `${index + 1}. ${s.name}`,
        color: index === 0 ? "#22c55e" : index === stops.length - 1 ? "#ef4444" : "#6366f1",
    }));

    const mapPolylines: MapPolyline[] =
        routePolyline.length >= 2
            ? [{ positions: routePolyline, color: "#0C225E" }]
            : stops.length > 1
            ? [{ positions: stops.map((s) => [s.lat, s.lng] as [number, number]), color: "#2563eb" }]
            : [];

    if (!user?.is_trial && user?.role !== "SUPER_ADMIN") {
        return (
            <div className="p-6 text-center text-sm text-gray-500">
                Route creation from the company portal is available during your trial.
            </div>
        );
    }

    return (
        <div className="space-y-6 h-[calc(100vh-100px)] flex flex-col p-6 max-w-[1600px] mx-auto">
            <div className="flex justify-between items-center shrink-0">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)]">Create Shuttle Route</h1>
                    <p className="text-sm text-[var(--text-muted)] mt-1">Add at least two stops and assign your shuttle vehicle and driver.</p>
                </div>
                <div className="flex gap-2">
                    <button type="button" onClick={() => router.back()} className={cancelBtnCls}>Cancel</button>
                    <button type="button" onClick={handleSubmit} disabled={saving} className={saveBtnCls}>
                        {saving ? "Saving…" : "Save Route"}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
                <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-default)] p-4 flex flex-col gap-4 overflow-y-auto">
                    <div>
                        <label className={labelCls}>Route name *</label>
                        <input required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="e.g. Office — Gulshan" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className={labelCls}>Vehicle</label>
                            <select className={inputCls} value={assignedVehicleId} onChange={(e) => setAssignedVehicleId(e.target.value)}>
                                <option value="">Select…</option>
                                {vehicles.map((v) => (
                                    <option key={v.id} value={v.id}>{v.plate_number}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className={labelCls}>Driver</label>
                            <select className={inputCls} value={assignedDriverId} onChange={(e) => setAssignedDriverId(e.target.value)}>
                                <option value="">Select…</option>
                                {drivers.map((d) => (
                                    <option key={d.user_id} value={d.user_id}>{d.users?.full_name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className={labelCls}>Add stop by address</label>
                        <StopAddressSearch onSelect={handleAddressSelect} />
                    </div>
                    <div className="space-y-2">
                        {stops.map((stop, index) => (
                            <div key={stop.id} className="flex items-start gap-2 rounded-lg border border-[var(--border-light)] p-2">
                                <GripVertical className="w-4 h-4 mt-2 text-gray-400 shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium truncate">{index + 1}. {stop.name}</div>
                                    <div className="grid grid-cols-2 gap-1 mt-1">
                                        <input className={inputCls} value={stop.morningEta} onChange={(e) => setStops((prev) => prev.map((s) => s.id === stop.id ? { ...s, morningEta: e.target.value } : s))} />
                                        <input className={inputCls} value={stop.eveningEta} onChange={(e) => setStops((prev) => prev.map((s) => s.id === stop.id ? { ...s, eveningEta: e.target.value } : s))} />
                                    </div>
                                </div>
                                <button type="button" onClick={() => handleRemoveStop(stop.id)} className="p-1 text-red-500"><Trash2 className="w-4 h-4" /></button>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="lg:col-span-2 rounded-xl border border-[var(--border-default)] overflow-hidden min-h-[400px]">
                    <Map markers={mapMarkers} polylines={mapPolylines} onMapClick={handleMapClick} />
                </div>
            </div>
        </div>
    );
}
