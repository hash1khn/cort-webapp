'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { Building2, MapPin, Plus, Trash2 } from 'lucide-react';
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
import type { MapMarker, MapPolyline } from '@/app/admin/ui/Map';
import { PermissionGate } from '@/app/admin/components/PermissionGate';

const Map = dynamic(() => import('@/app/admin/ui/Map'), { ssr: false });

type StopDirection = 'MORNING' | 'EVENING' | 'BOTH';
type PinMode = 'pickup' | 'office';

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

function makeStop(
    name: string,
    lat: number,
    lng: number,
    extras?: Partial<Pick<Stop, 'morningEta' | 'eveningEta' | 'direction'>>,
): Stop {
    return {
        id: crypto.randomUUID(),
        name,
        lat,
        lng,
        morningEta: extras?.morningEta ?? '09:00',
        eveningEta: extras?.eveningEta ?? '18:00',
        direction: extras?.direction ?? 'BOTH',
    };
}

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
    const [officeStop, setOfficeStop] = useState<Stop | null>(null);
    const [pickupStops, setPickupStops] = useState<Stop[]>([]);
    const [pinMode, setPinMode] = useState<PinMode>('office');
    const [routePolyline, setRoutePolyline] = useState<[number, number][]>([]);
    const polylineDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    /** Ordered for API: pickups first, office always last (morning last / evening first after reverse). */
    const orderedStops = useMemo(
        () => (officeStop ? [...pickupStops, officeStop] : [...pickupStops]),
        [pickupStops, officeStop],
    );

    useEffect(() => {
        if (companiesStatus === 'idle') dispatch(fetchAdminCompanies({ limit: 100 }));
        dispatch(fetchAdminDrivers({ limit: 100, driver_type: DriverType.SHUTTLE }));
        dispatch(fetchAdminVehicles({ limit: 100 }));
    }, [dispatch, companiesStatus]);

    // Once office is set, default map/search pin mode to pickups
    useEffect(() => {
        if (officeStop) setPinMode('pickup');
        else setPinMode('office');
    }, [officeStop]);

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
            setRoutePolyline(currentStops.map((s) => [s.lat, s.lng] as [number, number]));
        }
    }, []);

    const schedulePolylineUpdate = useCallback((updatedStops: Stop[]) => {
        if (polylineDebounceRef.current) clearTimeout(polylineDebounceRef.current);
        polylineDebounceRef.current = setTimeout(() => fetchPreviewPolyline(updatedStops), 600);
    }, [fetchPreviewPolyline]);

    const applyOffice = useCallback((stop: Stop) => {
        setOfficeStop(stop);
        setPickupStops((prev) => {
            const next = [...prev];
            schedulePolylineUpdate([...next, stop]);
            return next;
        });
        toast.success('Company office set');
    }, [schedulePolylineUpdate]);

    const applyPickup = useCallback((stop: Stop) => {
        setPickupStops((prev) => {
            const updated = [...prev, stop];
            schedulePolylineUpdate(officeStop ? [...updated, officeStop] : updated);
            return updated;
        });
        toast.success(`Pickup "${stop.name}" added`);
    }, [officeStop, schedulePolylineUpdate]);

    const handleAddressSelect = useCallback(({ name: stopName, lat, lng }: { name: string; lat: number; lng: number }) => {
        if (pinMode === 'office') {
            applyOffice(makeStop(stopName, lat, lng, { morningEta: '09:00', eveningEta: '18:00' }));
        } else {
            applyPickup(makeStop(stopName, lat, lng, { morningEta: '08:00', eveningEta: '18:30' }));
        }
    }, [pinMode, applyOffice, applyPickup]);

    const handleMapClick = useCallback((lat: number, lng: number) => {
        if (pinMode === 'office') {
            applyOffice(makeStop('Company Office', lat, lng, { morningEta: '09:00', eveningEta: '18:00' }));
        } else {
            applyPickup(makeStop(`Pickup ${pickupStops.length + 1}`, lat, lng, { morningEta: '08:00', eveningEta: '18:30' }));
        }
    }, [pinMode, pickupStops.length, applyOffice, applyPickup]);

    const handleRemovePickup = useCallback((id: string) => {
        setPickupStops((prev) => {
            const updated = prev.filter((s) => s.id !== id);
            schedulePolylineUpdate(officeStop ? [...updated, officeStop] : updated);
            return updated;
        });
    }, [officeStop, schedulePolylineUpdate]);

    const handleClearOffice = useCallback(() => {
        setOfficeStop(null);
        schedulePolylineUpdate(pickupStops);
    }, [pickupStops, schedulePolylineUpdate]);

    const handlePickupChange = useCallback((id: string, field: keyof Stop, value: string) => {
        setPickupStops((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
    }, []);

    const handleOfficeChange = useCallback((field: keyof Stop, value: string) => {
        setOfficeStop((prev) => (prev ? { ...prev, [field]: value } : prev));
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !companyId) { toast.error('Please fill in required fields'); return; }
        if (!officeStop) { toast.error('Set the company office stop — it is required'); return; }
        if (pickupStops.length < 1) { toast.error('Add at least one employee pickup stop'); return; }

        try {
            await dispatch(createAdminRoute({
                name,
                company_id: Number(companyId),
                assigned_vehicle_id: assignedVehicleId ? Number(assignedVehicleId) : undefined,
                assigned_driver_id: assignedDriverId || undefined,
                stops: orderedStops.map((stop, index) => ({
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

    const mapMarkers: MapMarker[] = [
        ...pickupStops.map((s, index) => ({
            id: s.id,
            position: [s.lat, s.lng] as [number, number],
            label: `${index + 1}. ${s.name}`,
            color: '#6366f1',
        })),
        ...(officeStop
            ? [{
                id: officeStop.id,
                position: [officeStop.lat, officeStop.lng] as [number, number],
                label: `Office · ${officeStop.name}`,
                color: '#ef4444',
            }]
            : []),
    ];

    const mapPolylines: MapPolyline[] = routePolyline.length >= 2
        ? [{ positions: routePolyline, color: '#0C225E' }]
        : orderedStops.length > 1
        ? [{ positions: orderedStops.map((s) => [s.lat, s.lng] as [number, number]), color: '#2563eb' }]
        : [];

    const mapCenter: [number, number] | undefined = officeStop
        ? [officeStop.lat, officeStop.lng]
        : pickupStops[0]
        ? [pickupStops[0].lat, pickupStops[0].lng]
        : undefined;

    return (
        <div className="space-y-6 h-[calc(100vh-100px)] flex flex-col">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Create New Route</h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                        Office is always morning&apos;s last stop and evening&apos;s first stop.
                    </p>
                </div>
                <div className="space-x-2">
                    <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={routeActionStatus === 'loading'}>
                        {routeActionStatus === 'loading' ? 'Saving...' : 'Save Route'}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
                <Card className="p-4 flex flex-col h-full overflow-hidden gap-4">
                    {/* Route Details */}
                    <div className="space-y-3 shrink-0">
                        <div>
                            <Label htmlFor="name">Route Name</Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g., Route 1 — Gulshan to Office"
                            />
                        </div>
                        <div>
                            <Label htmlFor="company">Company</Label>
                            <select
                                id="company"
                                className="w-full border rounded-lg p-2 text-sm"
                                value={companyId}
                                onChange={(e) => setCompanyId(e.target.value)}
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
                                >
                                    <option value="">None</option>
                                    {vehicles.map((v) => (
                                        <option key={v.id} value={v.id}>
                                            {v.plate_number}{v.model ? ` · ${v.model}` : ''}
                                        </option>
                                    ))}
                                </select>
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

                    {/* Pin mode */}
                    <div className="shrink-0 flex rounded-lg border border-gray-200 p-0.5 bg-gray-50">
                        <button
                            type="button"
                            onClick={() => setPinMode('office')}
                            className={`flex-1 flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-semibold transition-colors ${
                                pinMode === 'office'
                                    ? 'bg-red-500 text-white shadow-sm'
                                    : 'text-gray-600 hover:bg-white'
                            }`}
                        >
                            <Building2 className="w-3.5 h-3.5" />
                            Set office
                        </button>
                        <button
                            type="button"
                            onClick={() => setPinMode('pickup')}
                            className={`flex-1 flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-semibold transition-colors ${
                                pinMode === 'pickup'
                                    ? 'bg-indigo-600 text-white shadow-sm'
                                    : 'text-gray-600 hover:bg-white'
                            }`}
                        >
                            <MapPin className="w-3.5 h-3.5" />
                            Add pickup
                        </button>
                    </div>

                    <div className="shrink-0">
                        <Label>
                            {pinMode === 'office' ? 'Search company office address' : 'Search employee pickup'}
                        </Label>
                        <StopAddressSearch
                            onSelect={handleAddressSelect}
                            placeholder={
                                pinMode === 'office'
                                    ? 'Search office / HQ address…'
                                    : 'Search pickup location…'
                            }
                            clearOnSelect
                            className="mt-1"
                        />
                        <p className="text-xs text-gray-400 mt-1.5">
                            Or click the map to pin the {pinMode === 'office' ? 'office' : 'pickup'}.
                        </p>
                    </div>

                    <div className="flex-1 overflow-y-auto min-h-0 space-y-4">
                        {/* Office — prominent */}
                        <section>
                            <div className="flex items-center gap-2 mb-2">
                                <Building2 className="w-4 h-4 text-red-500" />
                                <h3 className="font-semibold text-sm text-red-700">Company Office</h3>
                                <span className="text-[10px] font-bold uppercase tracking-wide bg-red-100 text-red-700 px-1.5 py-0.5 rounded">
                                    Required
                                </span>
                            </div>

                            {!officeStop ? (
                                <div className="rounded-xl border-2 border-dashed border-red-200 bg-red-50/50 p-4 text-center">
                                    <Building2 className="w-8 h-8 text-red-300 mx-auto mb-2" />
                                    <p className="text-sm font-medium text-red-800">No office set yet</p>
                                    <p className="text-xs text-red-600/80 mt-1">
                                        Switch to <strong>Set office</strong>, then search or click the map.
                                    </p>
                                    <p className="text-[11px] text-red-500 mt-2">
                                        Morning: last stop · Evening: first stop
                                    </p>
                                </div>
                            ) : (
                                <div className="rounded-xl border-2 border-red-300 bg-red-50 p-3 shadow-sm">
                                    <div className="flex items-start gap-2 mb-2">
                                        <span className="w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center shrink-0">
                                            <Building2 className="w-3.5 h-3.5" />
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <Input
                                                value={officeStop.name}
                                                onChange={(e) => handleOfficeChange('name', e.target.value)}
                                                className="h-8 text-sm font-semibold bg-white"
                                            />
                                            <div className="flex flex-wrap gap-1.5 mt-2">
                                                <span className="text-[10px] font-bold uppercase tracking-wide bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                                                    AM last stop
                                                </span>
                                                <span className="text-[10px] font-bold uppercase tracking-wide bg-violet-100 text-violet-800 px-1.5 py-0.5 rounded">
                                                    PM first stop
                                                </span>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleClearOffice}
                                            className="text-red-400 hover:text-red-600 p-0.5 shrink-0"
                                            title="Clear office"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-xs pl-9">
                                        <div>
                                            <label className="block text-red-700/70 mb-0.5">AM arrival</label>
                                            <input
                                                type="time"
                                                value={officeStop.morningEta}
                                                onChange={(e) => handleOfficeChange('morningEta', e.target.value)}
                                                className="border border-red-200 rounded px-1.5 py-0.5 w-full text-xs bg-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-red-700/70 mb-0.5">PM departure</label>
                                            <input
                                                type="time"
                                                value={officeStop.eveningEta}
                                                onChange={(e) => handleOfficeChange('eveningEta', e.target.value)}
                                                className="border border-red-200 rounded px-1.5 py-0.5 w-full text-xs bg-white"
                                            />
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-red-400 pl-9 mt-1">
                                        {officeStop.lat.toFixed(5)}, {officeStop.lng.toFixed(5)}
                                    </p>
                                </div>
                            )}
                        </section>

                        {/* Pickups */}
                        <section>
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-indigo-500" />
                                    <h3 className="font-semibold text-sm">
                                        Employee pickups
                                        <span className="ml-1.5 text-xs text-gray-400 font-normal">
                                            ({pickupStops.length})
                                        </span>
                                    </h3>
                                </div>
                            </div>

                            {pickupStops.length === 0 ? (
                                <p className="text-sm text-gray-400 italic text-center py-4 border border-dashed border-gray-200 rounded-lg">
                                    No pickups yet — use <strong>Add pickup</strong> or the map.
                                </p>
                            ) : (
                                <div className="space-y-2">
                                    {pickupStops.map((stop, index) => (
                                        <div
                                            key={stop.id}
                                            className="border border-gray-200 rounded-lg p-3 bg-gray-50 group"
                                        >
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 bg-indigo-500">
                                                    {index + 1}
                                                </span>
                                                <Input
                                                    value={stop.name}
                                                    onChange={(e) => handlePickupChange(stop.id, 'name', e.target.value)}
                                                    className="h-7 text-sm flex-1"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemovePickup(stop.id)}
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-600 p-0.5 shrink-0"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-3 gap-2 text-xs pl-8">
                                                <div>
                                                    <label className="block text-gray-500 mb-0.5">Direction</label>
                                                    <select
                                                        value={stop.direction}
                                                        onChange={(e) => handlePickupChange(stop.id, 'direction', e.target.value)}
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
                                                            onChange={(e) => handlePickupChange(stop.id, 'morningEta', e.target.value)}
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
                                                            onChange={(e) => handlePickupChange(stop.id, 'eveningEta', e.target.value)}
                                                            className="border rounded px-1.5 py-0.5 w-full text-xs"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>

                        {/* Order preview */}
                        {officeStop && pickupStops.length > 0 && (
                            <section className="rounded-lg border border-gray-200 bg-white p-3 text-xs space-y-2">
                                <p className="font-semibold text-gray-700 flex items-center gap-1">
                                    <Plus className="w-3 h-3" /> Route order on save
                                </p>
                                <div>
                                    <span className="font-bold text-amber-700">Morning → </span>
                                    <span className="text-gray-600">
                                        {pickupStops.map((s) => s.name).join(' → ')}
                                        {' → '}
                                        <span className="font-semibold text-red-600">{officeStop.name}</span>
                                    </span>
                                </div>
                                <div>
                                    <span className="font-bold text-violet-700">Evening → </span>
                                    <span className="text-gray-600">
                                        <span className="font-semibold text-red-600">{officeStop.name}</span>
                                        {' → '}
                                        {[...pickupStops].reverse().map((s) => s.name).join(' → ')}
                                    </span>
                                </div>
                                <p className="text-[10px] text-gray-400">
                                    Pickup order is auto-optimized on save; evening is the reverse of morning.
                                </p>
                            </section>
                        )}
                    </div>

                    {orderedStops.length >= 2 && (
                        <div className="shrink-0 flex items-center gap-2 text-xs text-gray-400 border-t pt-2">
                            <div className="w-2 h-2 rounded-full bg-[#0C225E]" />
                            Road-following route via Google Maps
                        </div>
                    )}
                </Card>

                <Card className="lg:col-span-2 overflow-hidden h-full p-0 relative">
                    <div className="absolute top-3 left-3 z-[500] flex gap-2 pointer-events-none">
                        <span className="bg-white/95 border border-red-200 text-red-700 text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-lg shadow-sm flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-red-500" /> Office
                        </span>
                        <span className="bg-white/95 border border-indigo-200 text-indigo-700 text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-lg shadow-sm flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-indigo-500" /> Pickups
                        </span>
                    </div>
                    <Map
                        height="100%"
                        onMapClick={handleMapClick}
                        markers={mapMarkers}
                        polylines={mapPolylines}
                        center={mapCenter}
                    />
                </Card>
            </div>
        </div>
    );
}
