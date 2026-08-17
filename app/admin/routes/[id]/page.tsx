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
import StopAddressSearch from '@/app/admin/ui/StopAddressSearch';
import RosteringTab from './components/RosteringTab';
import ManageStopsTab from './components/ManageStopsTab';
import { ChevronLeft, Info, Plus, Save, Trash, Users, X, ListOrdered, Sparkles, Building2, Sun, Sunset } from 'lucide-react';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';
import { apiClient } from '@/app/lib/services/api-client';
import { DriverType } from '@/app/lib/services/types/drivers';
import type { MapMarker, MapPolyline } from '@/app/admin/ui/Map';
import { useAuth } from '@/app/lib/contexts/auth-context';
import { PermissionGate } from '@/app/admin/components/PermissionGate';
import { Badge } from '@/app/admin/components/ui/Badge';
import { adminBtnDestructive, adminBtnOutline, adminBtnPrimary, adminInput, adminSelect } from '@/app/admin/components/ui/admin-styles';
import { cx } from '@/app/admin/components/ui/cx';
import { RouteCommandBar, RoutePill, format12h } from '../RouteCommandBar';

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
    const [editForm, setEditForm] = useState({
        name: '',
        assigned_vehicle_id: '',
        assigned_driver_id: '',
        evening_lock_time: '',
    });
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

    // Reset overview stop editor when route changes
    useEffect(() => {
        setEditingStopId(null);
        setIsAddingStop(false);
        setIsEditing(false);
        setStopForm({ name: '', lat: '', lng: '', morning_eta: '', evening_eta: '', sequence_order: '', direction: 'BOTH' });
        setActiveTab('overview');
    }, [id]);

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
                evening_lock_time: formatTime(route.evening_lock_time) || '',
            });
            // Load the road-following polyline for the saved stops
            fetchSavedPolyline();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [route?.id, route?.assigned_vehicle_id, route?.assigned_driver_id, route?.name, route?.evening_lock_time]);

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

    // Keep currently-assigned driver visible even if filtered out of the shuttle list
    const driversForSelect = useMemo(() => {
        const assignedId = route?.assigned_driver_id;
        if (!assignedId) return drivers;
        const exists = drivers.some((d) => d.id === assignedId);
        if (exists) return drivers;
        if (route?.users) {
            return [
                ...drivers,
                {
                    id: assignedId,
                    full_name: route.users.full_name,
                    phone: route.users.phone,
                } as (typeof drivers)[number],
            ];
        }
        return drivers;
    }, [drivers, route?.assigned_driver_id, route?.users]);

    const hydrateEditFormFromRoute = useCallback(() => {
        if (!route) return;
        setEditForm({
            name: route.name,
            assigned_vehicle_id: route.assigned_vehicle_id?.toString() || '',
            assigned_driver_id: route.assigned_driver_id?.toString() || '',
            evening_lock_time: formatTime(route.evening_lock_time) || '',
        });
    }, [route]);

    const handleCancelEdit = () => {
        hydrateEditFormFromRoute();
        setIsEditing(false);
    };

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
                    // null clears the FK; undefined would omit the key and leave the old assignment
                    assigned_vehicle_id: editForm.assigned_vehicle_id
                        ? parseInt(editForm.assigned_vehicle_id, 10)
                        : null,
                    assigned_driver_id: editForm.assigned_driver_id || null,
                    evening_lock_time: editForm.evening_lock_time.trim() || null,
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

    if (status === 'loading') return <div className="p-8 text-center text-[var(--text-muted)]">Loading route…</div>;
    if (!route) return <div className="p-8 text-center text-[var(--text-muted)]">Route not found</div>;

    const companyName = route.company?.name ?? route.companies?.name ?? 'Company';
    const usualDriver = route.users?.full_name ?? 'Not set';
    const usualVehicle = route.vehicles?.plate_number
        ? [route.vehicles.model, route.vehicles.plate_number].filter(Boolean).join(' · ')
        : 'Not set';

    return (
        <PermissionGate permission="routes">
            <div className="space-y-5">
            <RouteCommandBar
                title={route.name}
                subtitle={`${companyName} · ${route.route_stops?.length || 0} stops`}
                actions={
                    <>
                        <button type="button" onClick={() => router.push('/admin/routes')} className={adminBtnOutline}>
                            <ChevronLeft className="mr-1 h-4 w-4" /> Back
                        </button>
                        {isEditing ? (
                            <>
                                <button type="button" onClick={handleCancelEdit} className={adminBtnOutline}>Cancel</button>
                                <button type="button" onClick={() => void handleSaveDetails()} disabled={!canEditRoutes} className={adminBtnPrimary}>
                                    <Save className="mr-2 h-4 w-4" /> Save
                                </button>
                            </>
                        ) : canEditRoutes && (
                            <>
                                <button
                                    type="button"
                                    onClick={() => { hydrateEditFormFromRoute(); setIsEditing(true); }}
                                    className={adminBtnOutline}
                                >
                                    Edit route
                                </button>
                                <button
                                    type="button"
                                    onClick={() => void handleOptimizeRoute()}
                                    disabled={isOptimizing || (route.route_stops?.length ?? 0) < 3}
                                    className={adminBtnOutline}
                                    title="Optimize pickup order from office. Evening auto-reverses morning."
                                >
                                    <Sparkles className="mr-1 h-4 w-4" />
                                    {isOptimizing ? 'Optimizing…' : 'Optimize order'}
                                </button>
                                <button type="button" onClick={() => void handleDeleteRoute()} className={adminBtnDestructive}>
                                    <Trash className="mr-1 h-4 w-4" /> Delete
                                </button>
                            </>
                        )}
                    </>
                }
                tabs={
                    <div className="flex rounded-full bg-[var(--bg-subtle)] p-1">
                        <RoutePill active={activeTab === 'overview'} onClick={() => setActiveTab('overview')}>
                            <Info className="h-4 w-4" /> Overview
                        </RoutePill>
                        <RoutePill active={activeTab === 'stops'} onClick={() => setActiveTab('stops')}>
                            <ListOrdered className="h-4 w-4" /> Stops
                        </RoutePill>
                        <RoutePill active={activeTab === 'rostering'} onClick={() => setActiveTab('rostering')}>
                            <Users className="h-4 w-4" /> People
                        </RoutePill>
                    </div>
                }
            />

            {/* Overview Tab */}
            {activeTab === 'overview' && (
                <div className="space-y-4">
                    <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 shadow-[var(--shadow-card)]">
                        {isEditing && (
                            <div className="mb-4">
                                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Route name</label>
                                <input
                                    value={editForm.name}
                                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                    className={cx(adminInput, 'max-w-md')}
                                />
                            </div>
                        )}
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 text-sm">
                            <div>
                                <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Company</div>
                                <div className="mt-1 font-medium text-[var(--text-primary)]">{companyName}</div>
                            </div>
                            {!isEditing && (
                                <>
                                    <div>
                                        <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Usual driver</div>
                                        <div className="mt-1 font-medium text-[var(--text-primary)]">{usualDriver}</div>
                                    </div>
                                    <div>
                                        <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Usual vehicle</div>
                                        <div className="mt-1 font-medium text-[var(--text-primary)]">{usualVehicle}</div>
                                    </div>
                                    <div>
                                        <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Evening lock time</div>
                                        <div className="mt-1 font-medium text-[var(--text-primary)]">
                                            {format12h(formatTime(route.evening_lock_time)) || 'Not set'}
                                        </div>
                                        <div className="mt-0.5 text-xs text-[var(--text-muted)]">Evening return cannot start before this</div>
                                    </div>
                                </>
                            )}
                            {isEditing && (
                                <>
                                    <div>
                                        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Usual driver</label>
                                        <select
                                            className={adminSelect}
                                            value={editForm.assigned_driver_id}
                                            onChange={(e) => setEditForm({ ...editForm, assigned_driver_id: e.target.value })}
                                        >
                                            <option value="">None</option>
                                            {driversForSelect.map((d) => (
                                                <option key={d.id} value={d.id}>{d.full_name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Usual vehicle</label>
                                        <select
                                            className={adminSelect}
                                            value={editForm.assigned_vehicle_id}
                                            onChange={(e) => setEditForm({ ...editForm, assigned_vehicle_id: e.target.value })}
                                        >
                                            <option value="">None</option>
                                            {vehiclesForSelect.map((v: { id: number; plate_number?: string; model?: string }) => (
                                                <option key={v.id} value={v.id}>
                                                    {v.plate_number}{v.model ? ` · ${v.model}` : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Evening lock time</label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="time"
                                                value={editForm.evening_lock_time}
                                                onChange={(e) => setEditForm({ ...editForm, evening_lock_time: e.target.value })}
                                                className={adminInput}
                                            />
                                            {editForm.evening_lock_time && (
                                                <button
                                                    type="button"
                                                    className="text-xs text-[var(--text-muted)] hover:text-rose-600"
                                                    onClick={() => setEditForm({ ...editForm, evening_lock_time: '' })}
                                                >
                                                    Clear
                                                </button>
                                            )}
                                        </div>
                                        <span className="mt-1 block text-xs text-[var(--text-muted)]">Drivers cannot start evening trips before this time.</span>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Map */}
                        <div className="col-span-2 flex flex-col gap-2" style={{ height: '520px' }}>
                            <div className="flex shrink-0 rounded-full bg-[var(--bg-subtle)] p-1 w-fit">
                                <RoutePill active={mapDirection === 'MORNING'} onClick={() => setMapDirection('MORNING')}>
                                    <Sun className="h-3.5 w-3.5" /> Morning
                                </RoutePill>
                                <RoutePill active={mapDirection === 'EVENING'} onClick={() => setMapDirection('EVENING')}>
                                    <Sunset className="h-3.5 w-3.5" /> Evening
                                </RoutePill>
                            </div>
                            <div className="flex-1 overflow-hidden rounded-2xl border border-[var(--border-default)]">
                                <Map
                                    height="100%"
                                    markers={mapMarkers}
                                    polylines={mapPolylines}
                                    onMarkerClick={handleMarkerClick}
                                    onMapClick={handleMapClick}
                                />
                            </div>
                        </div>

                        <div className="flex max-h-[520px] flex-col overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 shadow-[var(--shadow-card)]">
                            <div className="mb-3 flex shrink-0 items-center justify-between">
                                <h3 className="font-semibold text-[var(--text-primary)]">
                                    {mapDirection === 'MORNING' ? 'Morning' : 'Evening'} stops
                                </h3>
                                {!isAddingStop && !editingStopId && (
                                    <button
                                        type="button"
                                        onClick={canEditRoutes ? handleStopAddClick : undefined}
                                        disabled={!canEditRoutes}
                                        className={cx(adminBtnPrimary, 'h-8 px-3 text-xs')}
                                    >
                                        <Plus className="mr-1 h-4 w-4" /> Add stop
                                    </button>
                                )}
                            </div>

                            {/* Stop form (add / edit) */}
                            {(isAddingStop || editingStopId) && (
                                <div className="mb-3 shrink-0 space-y-3 rounded-xl border border-[var(--border-default)] bg-[var(--bg-subtle)] p-3">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-sm font-medium text-[var(--text-primary)]">
                                            {isAddingStop ? 'New stop' : 'Edit stop'}
                                        </h4>
                                        <button type="button" onClick={resetStopForm} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]" aria-label="Close">
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Search location</label>
                                        <StopAddressSearch
                                            onSelect={handleAddressSelect}
                                            defaultValue={stopForm.name}
                                            placeholder="Search address..."
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Stop name</label>
                                        <input
                                            className={cx(adminInput, 'h-8 text-sm')}
                                            value={stopForm.name}
                                            onChange={(e) => setStopForm({ ...stopForm, name: e.target.value })}
                                            placeholder="e.g. Disco Bakery"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">When</label>
                                        <select
                                            className={cx(adminSelect, 'h-8 text-xs')}
                                            value={stopForm.direction || 'BOTH'}
                                            onChange={(e) => setStopForm({ ...stopForm, direction: e.target.value })}
                                        >
                                            <option value="BOTH">Both directions</option>
                                            <option value="MORNING">Morning only</option>
                                            <option value="EVENING">Evening only</option>
                                        </select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Lat</label>
                                            <input className={cx(adminInput, 'h-8 text-sm')} type="number" step="any" value={stopForm.lat} onChange={(e) => setStopForm({ ...stopForm, lat: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Lng</label>
                                            <input className={cx(adminInput, 'h-8 text-sm')} type="number" step="any" value={stopForm.lng} onChange={(e) => setStopForm({ ...stopForm, lng: e.target.value })} />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Morning time</label>
                                            <input className={cx(adminInput, 'h-8 text-sm')} type="time" value={stopForm.morning_eta} onChange={(e) => setStopForm({ ...stopForm, morning_eta: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Evening time</label>
                                            <input className={cx(adminInput, 'h-8 text-sm')} type="time" value={stopForm.evening_eta} onChange={(e) => setStopForm({ ...stopForm, evening_eta: e.target.value })} />
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        className={cx(adminBtnPrimary, 'w-full text-xs')}
                                        onClick={() => void handleStopSubmit()}
                                        disabled={!canEditRoutes || isSavingStop}
                                    >
                                        {isSavingStop ? 'Saving…' : 'Save stop'}
                                    </button>
                                </div>
                            )}

                            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
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
                                    const seq = mapDirection === 'MORNING' ? (stop.morning_sequence ?? stop.sequence_order) : (stop.evening_sequence ?? stop.sequence_order);
                                    return (
                                    <div
                                        key={stop.id}
                                        className="group rounded-xl border border-[var(--border-default)] bg-[var(--bg-subtle)] p-3"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <div className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-[var(--text-primary)]">
                                                    <span className={cx(
                                                        'flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white',
                                                        isOffice ? 'bg-[var(--cort-orange)]' : 'bg-[var(--cort-navy)]',
                                                    )}>
                                                        {isOffice ? <Building2 className="h-3 w-3" /> : seq}
                                                    </span>
                                                    {stop.name}
                                                    {isOffice && <Badge color="orange">Office — last morning / first evening</Badge>}
                                                </div>
                                                <div className="mt-1 text-xs text-[var(--text-muted)]">
                                                    Morning {format12h(formatTime(stop.morning_eta)) || '—'} · Evening {format12h(formatTime(stop.evening_eta)) || '—'}
                                                    {isOffice ? ' · People board at pickups only' : ''}
                                                </div>
                                            </div>
                                            <div className="flex shrink-0 gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100">
                                                <button
                                                    type="button"
                                                    onClick={canEditRoutes ? () => handleStopEditClick(stop) : undefined}
                                                    disabled={!canEditRoutes}
                                                    className="rounded-md px-2 py-1 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-card)] disabled:opacity-40"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={canEditRoutes && !isOffice ? () => void handleStopDelete(stop.id) : undefined}
                                                    disabled={!canEditRoutes || isOffice}
                                                    className="rounded-md px-2 py-1 text-xs font-medium text-rose-600 hover:bg-rose-500/10 disabled:opacity-40"
                                                    title={isOffice ? 'Office cannot be deleted' : 'Remove stop'}
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    );
                                })}
                            </div>
                        </div>
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
