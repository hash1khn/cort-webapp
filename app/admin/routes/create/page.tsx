'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { GripVertical, Plus, Trash2 } from 'lucide-react';
import { Card } from '@/app/admin/ui/Card';
import { Button } from '@/app/admin/ui/Button';
import { Input } from '@/app/admin/ui/Input';
import { Label } from '@/app/admin/ui/Label';
import StopAddressSearch from '@/app/admin/ui/StopAddressSearch';
import { toast } from 'sonner';
import { useAppDispatch, useAppSelector } from '@/app/lib/store/hooks';
import { fetchAdminCompanies, selectAdminCompanies, selectAdminCompaniesStatus } from '@/app/lib/store/slices/adminCompaniesSlice';
import { createAdminRoute, selectAdminRoutesActionStatus } from '@/app/lib/store/slices/adminRoutesSlice';
import { fetchAdminDrivers, selectAdminDrivers } from '@/app/lib/store/slices/adminDriversSlice';
import { fetchAdminVehicles, selectAdminVehicles } from '@/app/lib/store/slices/adminVehiclesSlice';
import { apiClient } from '@/app/lib/services/api-client';
import { DriverType } from '@/app/lib/services/types/drivers';
import type { PoolVehicle } from '@/app/lib/services/types/multi-mode';
import type { MapMarker, MapPolyline } from '@/app/admin/ui/Map';
import { PermissionGate } from '@/app/admin/components/PermissionGate';

const Map = dynamic(() => import('@/app/admin/ui/Map'), { ssr: false });

type StopDirection = 'MORNING' | 'EVENING' | 'BOTH';

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

export default function CreateRoutePage() {
    return (
        <PermissionGate permission="routes" action="create">
            <CreateRoutePageContent />
        </PermissionGate>
    );
}

function CreateRoutePageContent() {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const companies = useAppSelector(selectAdminCompanies);
    const companiesStatus = useAppSelector(selectAdminCompaniesStatus);
    const routeActionStatus = useAppSelector(selectAdminRoutesActionStatus);
    const drivers = useAppSelector(selectAdminDrivers);
    const vehicles = useAppSelector(selectAdminVehicles);

    const [name, setName] = useState('');
    const [companyId, setCompanyId] = useState('');
    const [assignedVehicleId, setAssignedVehicleId] = useState('');
    const [assignedDriverId, setAssignedDriverId] = useState('');
    const [stops, setStops] = useState<Stop[]>([]);
    const [routePolyline, setRoutePolyline] = useState<[number, number][]>([]);
    const [poolVehicles, setPoolVehicles] = useState<PoolVehicle[]>([]);
    const [poolVehiclesLoading, setPoolVehiclesLoading] = useState(false);
    const [shuttleSelfManaged, setShuttleSelfManaged] = useState(false);
    const polylineDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const selectedCompany = useMemo(
        () => companies.find((c) => String(c.id) === companyId),
        [companies, companyId],
    );

    useEffect(() => {
        if (!companyId) {
            setShuttleSelfManaged(false);
            setPoolVehicles([]);
            return;
        }

        const companyNumericId = Number(companyId);
        let cancelled = false;

        (async () => {
            try {
                const featuresRes = await apiClient.getCompanyFeatures(companyNumericId);
                const features = featuresRes.data ?? [];
                const selfManaged =
                    Boolean(selectedCompany?.is_shuttle_enabled) &&
                    Boolean(features.find((f) => f.feature_key === 'shuttle_self_managed')?.is_enabled);

                if (cancelled) return;
                setShuttleSelfManaged(selfManaged);

                if (!selfManaged) {
                    setPoolVehicles([]);
                    return;
                }

                setPoolVehiclesLoading(true);
                try {
                    const poolRes = await apiClient.getPoolVehicles(companyNumericId);
                    if (!cancelled) setPoolVehicles(poolRes.data ?? []);
                } catch {
                    if (!cancelled) setPoolVehicles([]);
                } finally {
                    if (!cancelled) setPoolVehiclesLoading(false);
                }
            } catch {
                if (!cancelled) {
                    setShuttleSelfManaged(false);
                    setPoolVehicles([]);
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [companyId, selectedCompany?.is_shuttle_enabled]);

    useEffect(() => {
        if (companiesStatus === 'idle') dispatch(fetchAdminCompanies({ limit: 100 }));
        // Only load shuttle drivers for shuttle routes
        dispatch(fetchAdminDrivers({ limit: 100, driver_type: DriverType.SHUTTLE }));
        dispatch(fetchAdminVehicles({ limit: 100 }));
    }, [dispatch, companiesStatus]);

    // Fetch road-following polyline from backend whenever stops list changes
    const fetchPreviewPolyline = useCallback(async (currentStops: Stop[]) => {
        if (currentStops.length < 2) {
            setRoutePolyline([]);
            return;
        }
        try {
            const data = await apiClient.request<PolylineResponse>('/routes/preview-polyline', {
                method: 'POST',
                body: JSON.stringify({ stops: currentStops.map((s) => ({ lat: s.lat, lng: s.lng })) }),
            });
            setRoutePolyline(data.points.map((p) => [p.lat, p.lng] as [number, number]));
        } catch {
            // Fall back to straight-line if Google Maps fails
            setRoutePolyline(currentStops.map((s) => [s.lat, s.lng] as [number, number]));
        }
    }, []);

    const schedulePolylineUpdate = useCallback((updatedStops: Stop[]) => {
        if (polylineDebounceRef.current) clearTimeout(polylineDebounceRef.current);
        polylineDebounceRef.current = setTimeout(() => fetchPreviewPolyline(updatedStops), 600);
    }, [fetchPreviewPolyline]);

    // Add stop from address search
    const handleAddressSelect = useCallback(({ name: stopName, lat, lng }: { name: string; lat: number; lng: number }) => {
        const newStop: Stop = {
            id: crypto.randomUUID(),
            name: stopName,
            lat,
            lng,
            morningEta: '08:00',
            eveningEta: '18:00',
            direction: 'BOTH',
        };
        setStops((prev) => {
            const updated = [...prev, newStop];
            schedulePolylineUpdate(updated);
            return updated;
        });
        toast.success(`Stop "${stopName}" added`);
    }, [schedulePolylineUpdate]);

    // Add stop from map click
    const handleMapClick = useCallback((lat: number, lng: number) => {
        const newStop: Stop = {
            id: crypto.randomUUID(),
            name: `Stop ${stops.length + 1}`,
            lat,
            lng,
            morningEta: '08:00',
            eveningEta: '18:00',
            direction: 'BOTH',
        };
        setStops((prev) => {
            const updated = [...prev, newStop];
            schedulePolylineUpdate(updated);
            return updated;
        });
    }, [stops.length, schedulePolylineUpdate]);

    const handleRemoveStop = useCallback((id: string) => {
        setStops((prev) => {
            const updated = prev.filter((s) => s.id !== id);
            schedulePolylineUpdate(updated);
            return updated;
        });
    }, [schedulePolylineUpdate]);

    const handleStopChange = useCallback((id: string, field: keyof Stop, value: string) => {
        setStops((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !companyId) { toast.error('Please fill in required fields'); return; }
        if (stops.length < 2) { toast.error('A route must have at least 2 stops'); return; }

        try {
            await dispatch(createAdminRoute({
                name,
                company_id: Number(companyId),
                assigned_vehicle_id: assignedVehicleId ? Number(assignedVehicleId) : undefined,
                assigned_driver_id: assignedDriverId || undefined,
                stops: stops.map((stop, index) => ({
                    name: stop.name,
                    lat: stop.lat,
                    lng: stop.lng,
                    morning_eta: stop.direction !== 'EVENING' ? stop.morningEta : undefined,
                    evening_eta: stop.direction !== 'MORNING' ? stop.eveningEta : undefined,
                    sequence_order: index + 1,
                    direction: stop.direction,
                })),
            })).unwrap();
            toast.success('Route created successfully!');
            router.push('/admin/routes');
        } catch (error: any) {
            toast.error(error || 'Failed to create route');
        }
    };

    // Map markers: each stop is a pin; last stop is a destination marker
    const mapMarkers: MapMarker[] = stops.map((s, index) => ({
        id: s.id,
        position: [s.lat, s.lng],
        label: `${index + 1}. ${s.name}`,
        color: index === 0 ? '#22c55e' : index === stops.length - 1 ? '#ef4444' : '#6366f1',
    }));

    const mapPolylines: MapPolyline[] = routePolyline.length >= 2
        ? [{ positions: routePolyline, color: '#0C225E' }]
        : stops.length > 1
        ? [{ positions: stops.map((s) => [s.lat, s.lng] as [number, number]), color: '#2563eb' }]
        : [];

    return (
        <div className="space-y-6 h-[calc(100vh-100px)] flex flex-col">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Create New Route</h1>
                <div className="space-x-2">
                    <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={routeActionStatus === 'loading'}>
                        {routeActionStatus === 'loading' ? 'Saving...' : 'Save Route'}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
                {/* Left Panel */}
                <Card className="p-4 flex flex-col h-full overflow-hidden gap-4">
                    {/* Route Details */}
                    <div className="space-y-3 shrink-0">
                        <div>
                            <Label htmlFor="name">Route Name</Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g., Route 1 — Gulshan to DHA"
                            />
                        </div>
                        <div>
                            <Label htmlFor="company">Company</Label>
                            <select
                                id="company"
                                className="w-full border rounded-lg p-2 text-sm"
                                value={companyId}
                                onChange={(e) => {
                                    setCompanyId(e.target.value);
                                    setAssignedVehicleId('');
                                }}
                                disabled={companiesStatus === 'loading'}
                            >
                                <option value="">Select Company</option>
                                {companies.map((c) => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <Label htmlFor="vehicle">Vehicle</Label>
                                <select
                                    id="vehicle"
                                    className="w-full border rounded-lg p-2 text-sm"
                                    value={assignedVehicleId}
                                    onChange={(e) => setAssignedVehicleId(e.target.value)}
                                    disabled={poolVehiclesLoading}
                                >
                                    <option value="">
                                        {poolVehiclesLoading ? 'Loading vehicles…' : 'None'}
                                    </option>
                                    {shuttleSelfManaged && poolVehicles.length > 0 && (
                                        <optgroup label="Company pool">
                                            {poolVehicles.map((v) => (
                                                <option key={`pool-${v.id}`} value={v.id}>
                                                    {v.plate_number}{v.model ? ` · ${v.model}` : ''}
                                                </option>
                                            ))}
                                        </optgroup>
                                    )}
                                    <optgroup label={shuttleSelfManaged ? 'Cort fleet' : 'Fleet'}>
                                        {vehicles
                                            .filter((v) => !poolVehicles.some((p) => p.id === v.id))
                                            .map((v) => (
                                                <option key={v.id} value={v.id}>
                                                    {v.plate_number}{v.model ? ` · ${v.model}` : ''}
                                                </option>
                                            ))}
                                    </optgroup>
                                </select>
                                {shuttleSelfManaged && (
                                    <p className="text-xs text-gray-500 mt-1">
                                        Self-managed shuttle: company pool vehicles are listed first.
                                    </p>
                                )}
                            </div>
                            <div>
                                <Label htmlFor="driver">Driver</Label>
                                <select
                                    id="driver"
                                    className="w-full border rounded-lg p-2 text-sm"
                                    value={assignedDriverId}
                                    onChange={(e) => setAssignedDriverId(e.target.value)}
                                >
                                    <option value="">None</option>
                                    {drivers.map((d) => (
                                        <option key={d.id} value={d.id}>{d.full_name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Stop Search */}
                    <div className="shrink-0">
                        <Label>Add Stop by Address</Label>
                        <StopAddressSearch
                            onSelect={handleAddressSelect}
                            placeholder="Search for a location..."
                            clearOnSelect
                            className="mt-1"
                        />
                        <p className="text-xs text-gray-400 mt-1.5">
                            Or click anywhere on the map to pin a stop.
                        </p>
                    </div>

                    {/* Stops List */}
                    <div className="flex-1 overflow-y-auto min-h-0">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold text-sm">
                                Stops
                                <span className="ml-1.5 text-xs text-gray-400 font-normal">
                                    ({stops.length})
                                </span>
                            </h3>
                        </div>

                        {stops.length === 0 && (
                            <p className="text-sm text-gray-400 italic text-center py-6">
                                No stops yet — search above or click the map.
                            </p>
                        )}

                        <div className="space-y-2">
                            {stops.map((stop, index) => (
                                <div
                                    key={stop.id}
                                    className="border border-gray-200 rounded-lg p-3 bg-gray-50 group"
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        <GripVertical className="w-4 h-4 text-gray-300 shrink-0" />
                                        <span
                                            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                                            style={{
                                                backgroundColor:
                                                    index === 0 ? '#22c55e'
                                                    : index === stops.length - 1 ? '#ef4444'
                                                    : '#6366f1',
                                            }}
                                        >
                                            {index + 1}
                                        </span>
                                        <Input
                                            value={stop.name}
                                            onChange={(e) => handleStopChange(stop.id, 'name', e.target.value)}
                                            className="h-7 text-sm flex-1"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveStop(stop.id)}
                                            className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-600 p-0.5 shrink-0"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 text-xs pl-10">
                                        <div>
                                            <label className="block text-gray-500 mb-0.5">Direction</label>
                                            <select
                                                value={stop.direction}
                                                onChange={(e) => handleStopChange(stop.id, 'direction', e.target.value)}
                                                className="border rounded px-1 py-0.5 w-full text-xs bg-white"
                                            >
                                                <option value="BOTH">Both</option>
                                                <option value="MORNING">AM only</option>
                                                <option value="EVENING">PM only</option>
                                            </select>
                                        </div>
                                        {stop.direction !== 'EVENING' && (
                                            <div>
                                                <label className="block text-gray-500 mb-0.5">AM pickup</label>
                                                <input
                                                    type="time"
                                                    value={stop.morningEta}
                                                    onChange={(e) => handleStopChange(stop.id, 'morningEta', e.target.value)}
                                                    className="border rounded px-1.5 py-0.5 w-full text-xs"
                                                />
                                            </div>
                                        )}
                                        {stop.direction !== 'MORNING' && (
                                            <div>
                                                <label className="block text-gray-500 mb-0.5">PM dropoff</label>
                                                <input
                                                    type="time"
                                                    value={stop.eveningEta}
                                                    onChange={(e) => handleStopChange(stop.id, 'eveningEta', e.target.value)}
                                                    className="border rounded px-1.5 py-0.5 w-full text-xs"
                                                />
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-gray-400 pl-10 mt-1">
                                        {stop.lat.toFixed(5)}, {stop.lng.toFixed(5)}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {stops.length >= 2 && (
                        <div className="shrink-0 flex items-center gap-2 text-xs text-gray-400 border-t pt-2">
                            <div className="w-2 h-2 rounded-full bg-[#0C225E]" />
                            Road-following route via Google Maps
                        </div>
                    )}
                </Card>

                {/* Map Panel */}
                <Card className="lg:col-span-2 overflow-hidden h-full p-0">
                    <Map
                        height="100%"
                        onMapClick={handleMapClick}
                        markers={mapMarkers}
                        polylines={mapPolylines}
                        center={
                            stops.length > 0
                                ? [stops[0].lat, stops[0].lng]
                                : undefined
                        }
                    />
                </Card>
            </div>
        </div>
    );
}
