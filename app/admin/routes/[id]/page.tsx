'use client';

import { useCallback, useEffect, useMemo, useRef, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/app/lib/store/hooks';
import {
    fetchAdminRoute,
    updateAdminRoute,
    optimizeAdminRoute,
    deleteAdminRoute,
    createRouteStop,
    updateRouteStop,
    deleteRouteStop,
    selectCurrentRoute,
    selectAdminRoutesStatus,
    selectAdminRoutesActionStatus,
    clearCurrentRoute
} from '@/app/lib/store/slices/adminRoutesSlice';
import { fetchAdminDrivers, selectAdminDrivers } from '@/app/lib/store/slices/adminDriversSlice';
import { fetchAdminVehicles, selectAdminVehicles } from '@/app/lib/store/slices/adminVehiclesSlice';
import { Button } from '@/app/admin/ui/Button';
import { Card } from '@/app/admin/ui/Card';
import { Input } from '@/app/admin/ui/Input';
import { Label } from '@/app/admin/ui/Label';
import StopAddressSearch from '@/app/admin/ui/StopAddressSearch';
import RosteringTab from './components/RosteringTab';
import ManageStopsTab from './components/ManageStopsTab';
import { ChevronLeft, Edit, Info, MapPin, Plus, Save, Trash, Users, X, ListOrdered, Sparkles, Building2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';
import { apiClient } from '@/app/lib/services/api-client';
import { DriverType } from '@/app/lib/services/types/drivers';
import type { MapMarker, MapPolyline } from '@/app/admin/ui/Map';
import { useAuth } from '@/app/lib/contexts/auth-context';
import { PermissionGate } from '@/app/admin/components/PermissionGate';

const Map = dynamic(() => import('@/app/admin/ui/Map'), { ssr: false });

function identifyOfficeStopId(
    stops: Array<{ id: number; morning_sequence: number | null }>,
): number | null {
    const withMorning = stops.filter((s) => s.morning_sequence != null);
    if (withMorning.length === 0) return null;
    const maxSeq = Math.max(...withMorning.map((s) => s.morning_sequence!));
    return withMorning.find((s) => s.morning_sequence === maxSeq)?.id ?? null;
}

/** Helper to format ISO time strings or Date objects to HH:mm */
function formatTime(timeStr: string | null | undefined): string {
    if (!timeStr) return '';
    // If it's already HH:mm, return as is
    if (/^\d{2}:\d{2}$/.test(timeStr)) return timeStr;
    // If it's a full ISO string or Date, extract HH:mm
    try {
        const date = new Date(timeStr.includes('T') ? timeStr : `1970-01-01T${timeStr}Z`);
        if (isNaN(date.getTime())) return timeStr;
        return date.toISOString().substring(11, 16);
    } catch {
        return timeStr;
    }
}

type PolylineResponse = { points: { lat: number; lng: number }[] };

export default function RouteDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const dispatch = useAppDispatch();
    const route = useAppSelector(selectCurrentRoute);
    const officeStopId = identifyOfficeStopId(route?.route_stops ?? []);
    const status = useAppSelector(selectAdminRoutesStatus);
    const drivers = useAppSelector(selectAdminDrivers);
    const vehicles = useAppSelector(selectAdminVehicles);
    const actionStatus = useAppSelector(selectAdminRoutesActionStatus);

    const { hasCrud } = useAuth();
    const canEditRoutes =
        hasCrud('routes', 'create') ||
        hasCrud('routes', 'update') ||
        hasCrud('routes', 'delete');

    const [isOptimizing, setIsOptimizing] = useState(false);
    const [activeTab, setActiveTab] = useState<'overview' | 'stops' | 'rostering'>('overview');
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({ name: '', assigned_vehicle_id: '', assigned_driver_id: '' });
    const [currentAssignedVehicle, setCurrentAssignedVehicle] = useState<any>(null);

    // Direction toggle for the overview map
    const [mapDirection, setMapDirection] = useState<'MORNING' | 'EVENING'>('MORNING');

    // Stop form
    const [editingStopId, setEditingStopId] = useState<number | null>(null);
    const [isAddingStop, setIsAddingStop] = useState(false);
    const [isSavingStop, setIsSavingStop] = useState(false);
    const [stopForm, setStopForm] = useState({
        name: '',
        lat: '',
        lng: '',
        morning_eta: '',
        evening_eta: '',
        sequence_order: '',
        direction: 'BOTH',
    });

    // Road-following polyline for the saved route stops
    const [savedPolyline, setSavedPolyline] = useState<[number, number][]>([]);
    const polylineDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (id) dispatch(fetchAdminRoute(parseInt(id)));
        return () => { dispatch(clearCurrentRoute()); };
    }, [dispatch, id]);

    // Load drivers and vehicles for assignment editing
    useEffect(() => {
        // Only show shuttle drivers for shuttle routes
        dispatch(fetchAdminDrivers({ limit: 100, driver_type: DriverType.SHUTTLE }));
        dispatch(fetchAdminVehicles({ limit: 100 }));
    }, [dispatch]);

    useEffect(() => {
        if (route) {
            setEditForm({
                name: route.name,
                assigned_vehicle_id: route.assigned_vehicle_id?.toString() || '',
                assigned_driver_id: route.assigned_driver_id?.toString() || '',
            });
            // Load the road-following polyline for the saved stops
            fetchSavedPolyline();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [route?.id]);

    // If the currently-assigned vehicle is excluded from the "available vehicles" list,
    // we still want it to remain selectable/visible in the edit dropdown.
    useEffect(() => {
        let cancelled = false;
        const vehicleId = route?.assigned_vehicle_id;
        if (!vehicleId) {
            setCurrentAssignedVehicle(null);
            return;
        }
        (async () => {
            try {
                const res: any = await apiClient.getVehicle(vehicleId);
                const v = res?.data ?? res;
                if (!cancelled) setCurrentAssignedVehicle(v);
            } catch {
                if (!cancelled) setCurrentAssignedVehicle(null);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [route?.assigned_vehicle_id]);

    const vehiclesForSelect = useMemo(() => {
        const currentId = currentAssignedVehicle?.id;
        if (!currentId) return vehicles;
        const exists = vehicles.some((v: any) => v?.id === currentId);
        return exists ? vehicles : [...vehicles, currentAssignedVehicle];
    }, [vehicles, currentAssignedVehicle]);

    const fetchSavedPolyline = useCallback(async () => {
        if (!id) return;
        try {
            const data = await apiClient.request<PolylineResponse>(`/routes/${id}/polyline?direction=${mapDirection}`);
            setSavedPolyline(data.points.map((p) => [p.lat, p.lng] as [number, number]));
        } catch {
            setSavedPolyline([]);
        }
    }, [id, mapDirection]);

    // Re-fetch polyline when direction toggle changes or after a stop is saved/deleted
    useEffect(() => {
        if (route?.id) {
            setSavedPolyline([]); // clear stale polyline immediately so fallback renders correct direction
            fetchSavedPolyline();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mapDirection]);

    const schedulePolylineRefresh = useCallback(() => {
        setSavedPolyline([]); // clear stale polyline immediately
        if (polylineDebounceRef.current) clearTimeout(polylineDebounceRef.current);
        polylineDebounceRef.current = setTimeout(fetchSavedPolyline, 3000);
    }, [fetchSavedPolyline]);

    // ---- Stop form helpers -----------------------------------------------

    const resetStopForm = () => {
        setStopForm({ name: '', lat: '', lng: '', morning_eta: '', evening_eta: '', sequence_order: '', direction: 'BOTH' });
        setEditingStopId(null);
        setIsAddingStop(false);
    };

    const handleStopEditClick = (stop: any) => {
        setStopForm({
            name: stop.name,
            lat: stop.lat?.toString() || '',
            lng: stop.lng?.toString() || '',
            morning_eta: stop.morning_eta ? formatTime(stop.morning_eta) : '',
            evening_eta: stop.evening_eta ? formatTime(stop.evening_eta) : '',
            sequence_order: stop.sequence_order?.toString() || '0',
            direction: stop.morning_sequence != null && stop.evening_sequence != null ? 'BOTH' : (stop.morning_sequence != null ? 'MORNING' : 'EVENING'),
        });
        setEditingStopId(stop.id);
        setIsAddingStop(false);
    };

    const handleStopAddClick = () => {
        resetStopForm();
        const maxOrder = route?.route_stops?.reduce((max, s) => Math.max(max, s.sequence_order), 0) || 0;
        setStopForm((prev) => ({ ...prev, sequence_order: (maxOrder + 1).toString() }));
        setIsAddingStop(true);
    };

    // Fill form from address search selection
    const handleAddressSelect = useCallback(({ name, lat, lng }: { name: string; lat: number; lng: number }) => {
        setStopForm((prev) => ({
            ...prev,
            name,
            lat: lat.toFixed(6),
            lng: lng.toFixed(6),
        }));
    }, []);

    const handleStopSubmit = async () => {
        if (!canEditRoutes) return;
        if (!route) return;
        if (!stopForm.name || !stopForm.lat || !stopForm.lng) {
            toast.error('Name and location are required');
            return;
        }
        const data = {
            name: stopForm.name,
            lat: parseFloat(stopForm.lat),
            lng: parseFloat(stopForm.lng),
            morning_eta: stopForm.morning_eta || null,
            evening_eta: stopForm.evening_eta || null,
            sequence_order: parseInt(stopForm.sequence_order) || 0,
            direction: stopForm.direction || 'BOTH',
        };
        // Duplicate guard: prevent adding a stop at the exact same lat/lng as an existing one
        if (isAddingStop) {
            const duplicate = route.route_stops?.find(
                (s) =>
                    Math.abs((s.lat ?? 0) - data.lat) < 0.0001 &&
                    Math.abs((s.lng ?? 0) - data.lng) < 0.0001
            );
            if (duplicate) {
                toast.error(`A stop at this location already exists: "${duplicate.name}"`);
                return;
            }
        }
        try {
            setIsSavingStop(true);
            if (isAddingStop) {
                await dispatch(createRouteStop({ routeId: route.id, data })).unwrap();
                toast.success('Stop added');
            } else if (editingStopId) {
                await dispatch(updateRouteStop({ stopId: editingStopId, routeId: route.id, data })).unwrap();
                toast.success('Stop updated');
            }
            resetStopForm();
            schedulePolylineRefresh();
        } catch {
            toast.error('Failed to save stop');
        } finally {
            setIsSavingStop(false);
        }
    };

    const handleDeleteRoute = async () => {
        if (!route) return;
        if (!confirm(`Delete route "${route.name}"? This cannot be undone.`)) return;
        try {
            await dispatch(deleteAdminRoute(route.id)).unwrap();
            toast.success('Route deleted');
            router.replace('/admin/routes');
        } catch {
            toast.error('Failed to delete route');
        }
    };

    const handleStopDelete = async (stopId: number) => {
        if (!canEditRoutes) return;
        if (stopId === officeStopId) {
            toast.error('Cannot delete the company office stop. Edit its location instead.');
            return;
        }
        if (!confirm('Delete this stop?')) return;
        if (!route) return;
        try {
            await dispatch(deleteRouteStop({ stopId, routeId: route.id })).unwrap();
            toast.success('Stop deleted');
            if (editingStopId === stopId) resetStopForm();
            schedulePolylineRefresh();
        } catch {
            toast.error('Failed to delete stop');
        }
    };

    const handleMarkerClick = (markerId: string) => {
        const stop = route?.route_stops?.find((s) => s.id === parseInt(markerId));
        if (stop) handleStopEditClick(stop);
    };

    const handleMapClick = (lat: number, lng: number) => {
        if (isAddingStop || editingStopId) {
            setStopForm((prev) => ({ ...prev, lat: lat.toFixed(6), lng: lng.toFixed(6) }));
            toast.info('Coordinates updated from map click');
        }
    };

    const handleOptimizeRoute = async () => {
        if (!canEditRoutes || !route) return;
        setIsOptimizing(true);
        try {
            await dispatch(optimizeAdminRoute(route.id)).unwrap();
            toast.success('Route optimized — morning pickups reordered, evening reversed');
            schedulePolylineRefresh();
        } catch (err: any) {
            toast.error(err || 'Failed to optimize route');
        } finally {
            setIsOptimizing(false);
        }
    };

    const handleSaveDetails = async () => {
        if (!canEditRoutes) return;
        if (!route) return;
        try {
            await dispatch(updateAdminRoute({
                id: route.id,
                data: {
                    name: editForm.name,
                    assigned_vehicle_id: editForm.assigned_vehicle_id ? parseInt(editForm.assigned_vehicle_id) : undefined,
                    assigned_driver_id: editForm.assigned_driver_id || undefined,
                },
            })).unwrap();

            setIsEditing(false);
            toast.success('Route details updated');
        } catch {
            toast.error('Failed to update route');
        }
    };

    // ---- Map data ------------------------------------------------------------

    const mapMarkers: MapMarker[] = (() => {
        const base: MapMarker[] = (route?.route_stops ?? [])
            .filter((s) => {
                if (s.lat == null || s.lng == null || isNaN(Number(s.lat)) || isNaN(Number(s.lng))) return false;
                // Only show stops that belong to the active direction
                return mapDirection === 'MORNING'
                    ? s.morning_sequence != null
                    : s.evening_sequence != null;
            })
            .sort((a, b) =>
                mapDirection === 'MORNING'
                    ? (a.morning_sequence ?? 0) - (b.morning_sequence ?? 0)
                    : (a.evening_sequence ?? 0) - (b.evening_sequence ?? 0)
            )
            .map((s) => {
                const isOffice = s.id === officeStopId;
                if (editingStopId === s.id && stopForm.lat && stopForm.lng) {
                    return {
                        id: s.id.toString(),
                        position: [parseFloat(stopForm.lat), parseFloat(stopForm.lng)] as [number, number],
                        label: isOffice ? `Office · ${stopForm.name || s.name}` : (stopForm.name || s.name),
                        color: '#f59e0b',
                    };
                }
                return {
                    id: s.id.toString(),
                    position: [s.lat, s.lng] as [number, number],
                    label: isOffice
                        ? `Office · ${s.name}`
                        : `${mapDirection === 'MORNING' ? (s.morning_sequence ?? s.sequence_order) : (s.evening_sequence ?? s.sequence_order)}. ${s.name}`,
                    color: isOffice ? '#ef4444' : '#6366f1',
                };
            });

        if (isAddingStop && stopForm.lat && stopForm.lng) {
            base.push({
                id: 'new-temp',
                position: [parseFloat(stopForm.lat), parseFloat(stopForm.lng)],
                label: stopForm.name || 'New Stop',
                color: '#22c55e',
            });
        }
        return base;
    })();

    // Use road-following polyline; fall back to straight-line for the active direction while it loads
    const mapPolylines: MapPolyline[] = savedPolyline.length >= 2
        ? [{ positions: savedPolyline, color: '#0C225E' }]
        : (() => {
            const dirStops = (route?.route_stops ?? []).filter(
                (s) => s.lat != null && s.lng != null &&
                    (mapDirection === 'MORNING' ? s.morning_sequence != null : s.evening_sequence != null),
            ).sort((a, b) =>
                mapDirection === 'MORNING'
                    ? (a.morning_sequence ?? 0) - (b.morning_sequence ?? 0)
                    : (a.evening_sequence ?? 0) - (b.evening_sequence ?? 0)
            );
            return dirStops.length > 1
                ? [{ positions: dirStops.map((s) => [s.lat, s.lng] as [number, number]), color: '#6366f1' }]
                : [];
        })();

    // ---- Render --------------------------------------------------------------

    if (status === 'loading') return <div className="p-8 text-center">Loading route details...</div>;
    if (!route) return <div className="p-8 text-center">Route not found</div>;

    return (
        <PermissionGate permission="routes">
            <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <Button variant="ghost" size="sm" onClick={() => router.back()}>
                    <ChevronLeft className="w-4 h-4 mr-1" /> Back
                </Button>
                <div className="flex-1">
                    {isEditing ? (
                        <Input
                            value={editForm.name}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            className="max-w-md font-bold text-xl h-10"
                        />
                    ) : (
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            {route.name}
                            <button
                                onClick={canEditRoutes ? () => setIsEditing(true) : undefined}
                                disabled={!canEditRoutes}
                                className="text-gray-400 hover:text-blue-600 disabled:opacity-40"
                            >
                                <Edit className="w-4 h-4" />
                            </button>
                        </h1>
                    )}
                    <div className="text-gray-500 text-sm mt-1">
                        Route ID: {route.id} · {route.route_stops?.length || 0} stops
                    </div>
                </div>
                <div className="flex gap-2">
                    {isEditing ? (
                        <>
                            <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                            <Button onClick={handleSaveDetails} disabled={!canEditRoutes}>Save Changes</Button>
                        </>
                    ) : (
                        canEditRoutes && (
                            <>
                                <Button
                                    variant="outline"
                                    onClick={handleOptimizeRoute}
                                    disabled={isOptimizing || (route.route_stops?.length ?? 0) < 3}
                                    title="Optimize pickup order from office (last stop). Evening auto-reverses morning."
                                >
                                    <Sparkles className="w-4 h-4 mr-1" />
                                    {isOptimizing ? 'Optimizing…' : 'Optimize Route'}
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={handleDeleteRoute}
                                    className="text-red-600 border-red-300 hover:bg-red-50"
                                >
                                    <Trash className="w-4 h-4 mr-1" /> Delete Route
                                </Button>
                            </>
                        )
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b">
                {(['overview', 'stops', 'rostering'] as const).map((tab) => (
                    <button
                        key={tab}
                        className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors capitalize flex items-center gap-2 ${activeTab === tab
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                        onClick={() => setActiveTab(tab)}
                    >
                        {tab === 'overview' ? <Info className="w-4 h-4" /> : tab === 'stops' ? <ListOrdered className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                ))}
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && (
                <div className="space-y-4">
                    {/* Route meta (company, vehicle, driver) */}
                    <Card className="p-4">
                        <h3 className="font-semibold mb-3">Route Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                            <div>
                                <span className="text-gray-500">Company:</span>{' '}
                                <span className="font-medium">
                                    {route.company?.name ?? route.companies?.name ?? 'N/A'}
                                </span>
                            </div>
                            {!isEditing && (
                                <>
                                    <div>
                                        <span className="text-gray-500">Vehicle:</span>{' '}
                                        <span className="font-medium">
                                            {route.vehicles?.model && route.vehicles?.plate_number
                                                ? `${route.vehicles.model} (${route.vehicles.plate_number})`
                                                : 'Unassigned'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Driver:</span>{' '}
                                        <span className="font-medium">
                                            {route.users?.full_name ?? 'Unassigned'}
                                        </span>
                                    </div>
                                </>
                            )}
                            {isEditing && (
                                <>
                                    <div className="flex flex-col gap-1">
                                        <span className="text-gray-500 text-xs">Assigned Vehicle</span>
                                        <select
                                            className="w-full border rounded-lg p-2 text-sm"
                                            value={editForm.assigned_vehicle_id}
                                            onChange={(e) =>
                                                setEditForm({ ...editForm, assigned_vehicle_id: e.target.value })
                                            }
                                        >
                                            <option value="">None</option>
                                            {vehiclesForSelect.map((v: any) => (
                                                <option key={v.id} value={v.id}>
                                                    {v.plate_number}
                                                    {v.model ? ` · ${v.model}` : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span className="text-gray-500 text-xs">Assigned Driver</span>
                                        <select
                                            className="w-full border rounded-lg p-2 text-sm"
                                            value={editForm.assigned_driver_id}
                                            onChange={(e) =>
                                                setEditForm({ ...editForm, assigned_driver_id: e.target.value })
                                            }
                                        >
                                            <option value="">None</option>
                                            {drivers.map((d) => (
                                                <option key={d.id} value={d.id}>
                                                    {d.full_name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </>
                            )}
                        </div>
                    </Card>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Map */}
                        <div className="col-span-2 flex flex-col gap-2" style={{ height: '520px' }}>
                            {/* Direction toggle */}
                            <div className="flex items-center gap-1 shrink-0">
                                <button
                                    onClick={() => setMapDirection('MORNING')}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                                        mapDirection === 'MORNING'
                                            ? 'bg-amber-100 text-amber-700 border border-amber-300'
                                            : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
                                    }`}
                                >
                                    ☀ Morning route
                                </button>
                                <button
                                    onClick={() => setMapDirection('EVENING')}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                                        mapDirection === 'EVENING'
                                            ? 'bg-indigo-100 text-indigo-700 border border-indigo-300'
                                            : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
                                    }`}
                                >
                                    🌙 Evening route
                                </button>
                            </div>
                            <Card className="overflow-hidden flex-1">
                                <Map
                                    height="100%"
                                    markers={mapMarkers}
                                    polylines={mapPolylines}
                                    onMarkerClick={handleMarkerClick}
                                    onMapClick={handleMapClick}
                                />
                            </Card>
                        </div>

                        {/* Stops Sidebar */}
                        <Card className="p-4 flex flex-col" style={{ maxHeight: '520px' }}>
                            <div className="flex justify-between items-center mb-3 shrink-0">
                                <h3 className="font-semibold flex items-center gap-2">
                                    <MapPin className="w-4 h-4" />
                                    {mapDirection === 'MORNING' ? 'Morning' : 'Evening'} Stops
                                </h3>
                                {!isAddingStop && !editingStopId && (
                                    <Button
                                        size="sm"
                                        onClick={canEditRoutes ? handleStopAddClick : undefined}
                                        disabled={!canEditRoutes}
                                    >
                                        <Plus className="w-4 h-4 mr-1" /> Add
                                    </Button>
                                )}
                            </div>

                            {/* Stop form (add / edit) */}
                            {(isAddingStop || editingStopId) && (
                                <div className="bg-gray-50 rounded-lg border border-blue-100 p-3 mb-3 shrink-0 space-y-3">
                                    <div className="flex justify-between items-center">
                                        <h4 className="font-medium text-sm text-blue-800">
                                            {isAddingStop ? 'New Stop' : 'Edit Stop'}
                                        </h4>
                                        <button onClick={resetStopForm}>
                                            <X className="w-4 h-4 text-gray-400" />
                                        </button>
                                    </div>

                                    {/* Address Search */}
                                    <div>
                                        <Label className="text-xs">Search Location</Label>
                                        <StopAddressSearch
                                            onSelect={handleAddressSelect}
                                            defaultValue={stopForm.name}
                                            placeholder="Search address..."
                                            className="mt-1"
                                        />
                                    </div>

                                    {/* Name */}
                                    <div>
                                        <Label className="text-xs">Stop Name</Label>
                                        <Input
                                            className="h-8 text-sm"
                                            value={stopForm.name}
                                            onChange={(e) => setStopForm({ ...stopForm, name: e.target.value })}
                                            placeholder="e.g. Disco Bakery"
                                        />
                                    </div>

                                    {/* Direction */}
                                    <div>
                                        <Label className="text-xs">Direction</Label>
                                        <select
                                            className="w-full h-8 px-2 mt-1 border rounded text-xs bg-white"
                                            value={stopForm.direction || 'BOTH'}
                                            onChange={(e) => setStopForm({ ...stopForm, direction: e.target.value })}
                                        >
                                            <option value="BOTH">Both</option>
                                            <option value="MORNING">Morning Only</option>
                                            <option value="EVENING">Evening Only</option>
                                        </select>
                                    </div>

                                    {/* Coordinates */}
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <Label className="text-xs">Lat</Label>
                                            <Input
                                                className="h-8 text-sm"
                                                type="number"
                                                step="any"
                                                value={stopForm.lat}
                                                onChange={(e) => setStopForm({ ...stopForm, lat: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-xs">Lng</Label>
                                            <Input
                                                className="h-8 text-sm"
                                                type="number"
                                                step="any"
                                                value={stopForm.lng}
                                                onChange={(e) => setStopForm({ ...stopForm, lng: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <Label className="text-xs">AM</Label>
                                            <Input
                                                className="h-8 text-sm"
                                                type="time"
                                                value={stopForm.morning_eta}
                                                onChange={(e) => setStopForm({ ...stopForm, morning_eta: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-xs">PM</Label>
                                            <Input
                                                className="h-8 text-sm"
                                                type="time"
                                                value={stopForm.evening_eta}
                                                onChange={(e) => setStopForm({ ...stopForm, evening_eta: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <Button 
                                        size="sm" 
                                        className="w-full" 
                                        onClick={handleStopSubmit} 
                                        disabled={!canEditRoutes || isSavingStop}
                                    >
                                        {isSavingStop ? (
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                Saving...
                                            </div>
                                        ) : (
                                            <><Save className="w-3 h-3 mr-2" /> Save Stop</>
                                        )}
                                    </Button>
                                </div>
                            )}


                            {/* Stops list */}
                            <div className="flex-1 overflow-y-auto space-y-3 min-h-0">
                                {(route.route_stops ?? [])
                                    .filter(stop =>
                                        mapDirection === 'MORNING'
                                            ? stop.morning_sequence != null
                                            : stop.evening_sequence != null
                                    )
                                    .sort((a, b) =>
                                        mapDirection === 'MORNING'
                                            ? (a.morning_sequence ?? 0) - (b.morning_sequence ?? 0)
                                            : (a.evening_sequence ?? 0) - (b.evening_sequence ?? 0)
                                    )
                                    .map((stop) => {
                                    const isOffice = stop.id === officeStopId;
                                    return (
                                    <div
                                        key={stop.id}
                                        className={`relative pl-6 border-l-2 pb-3 last:pb-0 group ${
                                            isOffice ? 'border-red-300' : 'border-gray-200'
                                        }`}
                                    >
                                        <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center text-[8px] text-white font-bold ${
                                            isOffice ? 'bg-red-500' : 'bg-[#6366f1]'
                                        }`}>
                                            {isOffice
                                                ? <Building2 className="w-2.5 h-2.5" />
                                                : (mapDirection === 'MORNING' ? (stop.morning_sequence ?? stop.sequence_order) : (stop.evening_sequence ?? stop.sequence_order))}
                                        </div>
                                        <div className="flex justify-between items-start">
                                            <div
                                                className="cursor-pointer hover:text-blue-600"
                                                onClick={canEditRoutes ? () => handleStopEditClick(stop) : undefined}
                                            >
                                                <div className="text-sm font-medium flex items-center gap-1.5 flex-wrap">
                                                    {stop.name}
                                                    {isOffice && (
                                                        <>
                                                            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold uppercase tracking-wide bg-red-100 text-red-700 px-1.5 py-0.5 rounded">
                                                                Office
                                                            </span>
                                                            <span className="text-[10px] font-bold uppercase tracking-wide bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                                                                {mapDirection === 'MORNING' ? 'AM last' : 'PM first'}
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                                <div className="text-xs text-gray-400">
                                                    AM: {formatTime(stop.morning_eta) || '—'} · PM: {formatTime(stop.evening_eta) || '—'}
                                                    {isOffice && ' · No employee assignment'}
                                                </div>
                                            </div>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={canEditRoutes ? () => handleStopEditClick(stop) : undefined}
                                                    disabled={!canEditRoutes}
                                                    className="p-1 hover:bg-gray-100 rounded text-blue-500 disabled:opacity-40"
                                                >
                                                    <Edit className="w-3 h-3" />
                                                </button>
                                                <button
                                                    onClick={canEditRoutes && !isOffice ? () => handleStopDelete(stop.id) : undefined}
                                                    disabled={!canEditRoutes || isOffice}
                                                    className="p-1 hover:bg-gray-100 rounded text-red-500 disabled:opacity-40"
                                                    title={isOffice ? 'Office cannot be deleted' : 'Delete stop'}
                                                >
                                                    <Trash className="w-3 h-3" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    );
                                })}
                            </div>

                            {savedPolyline.length >= 2 && (
                                <div className="shrink-0 mt-3 pt-2 border-t flex items-center gap-1.5 text-[10px] text-gray-400">
                                    <div className="w-2 h-2 rounded-full bg-[#0C225E]" />
                                    Road-following route via Google Maps
                                </div>
                            )}
                        </Card>
                    </div>
                </div>
            )}

            {/* Stops Tab */}
            {activeTab === 'stops' && <ManageStopsTab route={route} onStopMutated={schedulePolylineRefresh} />}

            {/* Rostering Tab */}
            {activeTab === 'rostering' && <RosteringTab route={route} />}
            </div>
        </PermissionGate>
    );
}
