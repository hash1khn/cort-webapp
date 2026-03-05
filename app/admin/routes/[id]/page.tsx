'use client';

import { useCallback, useEffect, useRef, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/app/lib/store/hooks';
import {
    fetchAdminRoute,
    updateAdminRoute,
    createRouteStop,
    updateRouteStop,
    deleteRouteStop,
    selectCurrentRoute,
    selectAdminRoutesStatus,
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
import { ChevronLeft, Edit, Info, MapPin, Plus, Save, Trash, Users, X } from 'lucide-react';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';
import { apiClient } from '@/app/lib/services/api-client';
import type { MapMarker, MapPolyline } from '@/app/admin/ui/Map';

const Map = dynamic(() => import('@/app/admin/ui/Map'), { ssr: false });

type PolylineResponse = { points: { lat: number; lng: number }[] };

export default function RouteDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const dispatch = useAppDispatch();
    const route = useAppSelector(selectCurrentRoute);
    const status = useAppSelector(selectAdminRoutesStatus);
    const drivers = useAppSelector(selectAdminDrivers);
    const vehicles = useAppSelector(selectAdminVehicles);

    const [activeTab, setActiveTab] = useState<'overview' | 'rostering'>('overview');
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({ name: '', assigned_vehicle_id: '', assigned_driver_id: '' });

    // Stop form
    const [editingStopId, setEditingStopId] = useState<number | null>(null);
    const [isAddingStop, setIsAddingStop] = useState(false);
    const [stopForm, setStopForm] = useState({
        name: '',
        lat: '',
        lng: '',
        morning_eta: '',
        evening_eta: '',
        sequence_order: '',
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
        dispatch(fetchAdminDrivers({ limit: 100 }));
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

    const fetchSavedPolyline = useCallback(async () => {
        if (!id) return;
        try {
            const data = await apiClient.request<PolylineResponse>(`/routes/${id}/polyline`);
            setSavedPolyline(data.points.map((p) => [p.lat, p.lng] as [number, number]));
        } catch {
            setSavedPolyline([]);
        }
    }, [id]);

    // Re-fetch polyline after a stop is saved/deleted
    const schedulePolylineRefresh = useCallback(() => {
        if (polylineDebounceRef.current) clearTimeout(polylineDebounceRef.current);
        polylineDebounceRef.current = setTimeout(fetchSavedPolyline, 800);
    }, [fetchSavedPolyline]);

    // ---- Stop form helpers -----------------------------------------------

    const resetStopForm = () => {
        setStopForm({ name: '', lat: '', lng: '', morning_eta: '', evening_eta: '', sequence_order: '' });
        setEditingStopId(null);
        setIsAddingStop(false);
    };

    const handleStopEditClick = (stop: any) => {
        setStopForm({
            name: stop.name,
            lat: stop.lat?.toString() || '',
            lng: stop.lng?.toString() || '',
            morning_eta: stop.morning_eta || '',
            evening_eta: stop.evening_eta || '',
            sequence_order: stop.sequence_order?.toString() || '',
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
        if (!route) return;
        if (!stopForm.name || !stopForm.lat || !stopForm.lng || !stopForm.sequence_order) {
            toast.error('Name, location, and sequence order are required');
            return;
        }
        const data = {
            name: stopForm.name,
            lat: parseFloat(stopForm.lat),
            lng: parseFloat(stopForm.lng),
            morning_eta: stopForm.morning_eta || null,
            evening_eta: stopForm.evening_eta || null,
            sequence_order: parseInt(stopForm.sequence_order),
        };
        try {
            if (isAddingStop) {
                await dispatch(createRouteStop({ routeId: route.id, data })).unwrap();
                toast.success('Stop added');
            } else if (editingStopId) {
                await dispatch(updateRouteStop({ stopId: editingStopId, data })).unwrap();
                toast.success('Stop updated');
            }
            resetStopForm();
            schedulePolylineRefresh();
        } catch {
            toast.error('Failed to save stop');
        }
    };

    const handleStopDelete = async (stopId: number) => {
        if (!confirm('Delete this stop?')) return;
        try {
            await dispatch(deleteRouteStop(stopId)).unwrap();
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

    const handleSaveDetails = async () => {
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
            .filter((s) => s.lat != null && s.lng != null && !isNaN(Number(s.lat)) && !isNaN(Number(s.lng)))
            .map((s) => {
                if (editingStopId === s.id && stopForm.lat && stopForm.lng) {
                    return {
                        id: s.id.toString(),
                        position: [parseFloat(stopForm.lat), parseFloat(stopForm.lng)] as [number, number],
                        label: stopForm.name || s.name,
                        color: '#f59e0b',
                    };
                }
                return {
                    id: s.id.toString(),
                    position: [s.lat, s.lng] as [number, number],
                    label: `${s.sequence_order}. ${s.name}`,
                    color: '#6366f1',
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

    // Use road-following polyline; fall back to straight-line while it loads
    const mapPolylines: MapPolyline[] = savedPolyline.length >= 2
        ? [{ positions: savedPolyline, color: '#0C225E' }]
        : (() => {
            const stops = route?.route_stops?.filter(
                (s) => s.lat != null && s.lng != null,
            ) ?? [];
            return stops.length > 1
                ? [{ positions: stops.map((s) => [s.lat, s.lng] as [number, number]), color: '#6366f1' }]
                : [];
        })();

    // ---- Render --------------------------------------------------------------

    if (status === 'loading') return <div className="p-8 text-center">Loading route details...</div>;
    if (!route) return <div className="p-8 text-center">Route not found</div>;

    return (
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
                            <button onClick={() => setIsEditing(true)} className="text-gray-400 hover:text-blue-600">
                                <Edit className="w-4 h-4" />
                            </button>
                        </h1>
                    )}
                    <div className="text-gray-500 text-sm mt-1">
                        Route ID: {route.id} · {route.route_stops?.length || 0} stops
                    </div>
                </div>
                {isEditing && (
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                        <Button onClick={handleSaveDetails}>Save Changes</Button>
                    </div>
                )}
            </div>

            {/* Tabs */}
            <div className="flex border-b">
                {(['overview', 'rostering'] as const).map((tab) => (
                    <button
                        key={tab}
                        className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors capitalize flex items-center gap-2 ${
                            activeTab === tab
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                        onClick={() => setActiveTab(tab)}
                    >
                        {tab === 'overview' ? <Info className="w-4 h-4" /> : <Users className="w-4 h-4" />}
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
                                            {vehicles.map((v) => (
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
                        <Card className="col-span-2 overflow-hidden" style={{ height: '520px' }}>
                            <Map
                                height="100%"
                                markers={mapMarkers}
                                polylines={mapPolylines}
                                onMarkerClick={handleMarkerClick}
                                onMapClick={handleMapClick}
                            />
                        </Card>

                        {/* Stops Sidebar */}
                        <Card className="p-4 flex flex-col" style={{ maxHeight: '520px' }}>
                        <div className="flex justify-between items-center mb-3 shrink-0">
                            <h3 className="font-semibold flex items-center gap-2">
                                <MapPin className="w-4 h-4" />
                                Stops ({route.route_stops?.length || 0})
                            </h3>
                            {!isAddingStop && !editingStopId && (
                                <Button size="sm" onClick={handleStopAddClick}>
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

                                {/* Name (editable after search) */}
                                <div>
                                    <Label className="text-xs">Stop Name</Label>
                                    <Input
                                        className="h-8 text-sm"
                                        value={stopForm.name}
                                        onChange={(e) => setStopForm({ ...stopForm, name: e.target.value })}
                                        placeholder="e.g. Disco Bakery"
                                    />
                                </div>

                                {/* Coordinates (auto-filled by search, or manual) */}
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

                                <div className="grid grid-cols-3 gap-2">
                                    <div>
                                        <Label className="text-xs">Seq</Label>
                                        <Input
                                            className="h-8 text-sm"
                                            type="number"
                                            value={stopForm.sequence_order}
                                            onChange={(e) => setStopForm({ ...stopForm, sequence_order: e.target.value })}
                                        />
                                    </div>
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

                                {stopForm.lat && stopForm.lng && (
                                    <p className="text-[10px] text-gray-400">
                                        📍 {parseFloat(stopForm.lat).toFixed(5)}, {parseFloat(stopForm.lng).toFixed(5)}
                                        <span className="ml-2 text-gray-300">·</span>
                                        <span className="ml-2 text-gray-400">or click map to adjust</span>
                                    </p>
                                )}

                                <Button size="sm" className="w-full" onClick={handleStopSubmit}>
                                    <Save className="w-3 h-3 mr-2" /> Save Stop
                                </Button>
                            </div>
                        )}

                        {/* Stops list */}
                        <div className="flex-1 overflow-y-auto space-y-3 min-h-0">
                            {(route.route_stops ?? []).map((stop) => (
                                <div
                                    key={stop.id}
                                    className="relative pl-6 border-l-2 border-gray-200 pb-3 last:pb-0 group"
                                >
                                    <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-[#6366f1] border-2 border-white flex items-center justify-center text-[8px] text-white font-bold">
                                        {stop.sequence_order}
                                    </div>
                                    <div className="flex justify-between items-start">
                                        <div
                                            className="cursor-pointer hover:text-blue-600"
                                            onClick={() => handleStopEditClick(stop)}
                                        >
                                            <div className="text-sm font-medium">{stop.name}</div>
                                            <div className="text-xs text-gray-400">
                                                AM: {stop.morning_eta || '—'} · PM: {stop.evening_eta || '—'}
                                            </div>
                                        </div>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleStopEditClick(stop)}
                                                className="p-1 hover:bg-gray-100 rounded text-blue-500"
                                            >
                                                <Edit className="w-3 h-3" />
                                            </button>
                                            <button
                                                onClick={() => handleStopDelete(stop.id)}
                                                className="p-1 hover:bg-gray-100 rounded text-red-500"
                                            >
                                                <Trash className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
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

            {/* Rostering Tab */}
            {activeTab === 'rostering' && <RosteringTab route={route} />}
        </div>
    );
}
