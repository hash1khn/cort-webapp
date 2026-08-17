'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { Building2, MapPin, Trash2 } from 'lucide-react';
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
import { adminBtnOutline, adminBtnPrimary, adminInput, adminSelect } from '@/app/admin/components/ui/admin-styles';
import { cx } from '@/app/admin/components/ui/cx';
import { RouteCommandBar } from '../RouteCommandBar';

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
    const [eveningVehicleId, setEveningVehicleId] = useState('');
    const [eveningDriverId, setEveningDriverId] = useState('');
    /** A route may have multiple company office stops (multi-office shuttle support). */
    const [officeStops, setOfficeStops] = useState<Stop[]>([]);
    const [pickupStops, setPickupStops] = useState<Stop[]>([]);
    const [pinMode, setPinMode] = useState<PinMode>('office');
    const [routePolyline, setRoutePolyline] = useState<[number, number][]>([]);
    const polylineDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    /** Ordered for API: pickups first, offices last. */
    const orderedStops = useMemo(
        () => [...pickupStops, ...officeStops],
        [pickupStops, officeStops],
    );

    useEffect(() => {
        if (companiesStatus === 'idle') dispatch(fetchAdminCompanies({ limit: 100 }));
        dispatch(fetchAdminDrivers({ limit: 100, driver_type: DriverType.SHUTTLE }));
        dispatch(fetchAdminVehicles({ limit: 100 }));
    }, [dispatch, companiesStatus]);

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
        setOfficeStops((prev) => {
            const next = [...prev, stop];
            schedulePolylineUpdate([...pickupStops, ...next]);
            return next;
        });
        toast.success('Company office added');
    }, [pickupStops, schedulePolylineUpdate]);

    const applyPickup = useCallback((stop: Stop) => {
        setPickupStops((prev) => {
            const updated = [...prev, stop];
            schedulePolylineUpdate([...updated, ...officeStops]);
            return updated;
        });
        toast.success(`Pickup "${stop.name}" added`);
    }, [officeStops, schedulePolylineUpdate]);

    const handleAddressSelect = useCallback(({ name: stopName, lat, lng }: { name: string; lat: number; lng: number }) => {
        if (pinMode === 'office') {
            applyOffice(makeStop(stopName, lat, lng, { morningEta: '09:00', eveningEta: '18:00' }));
        } else {
            applyPickup(makeStop(stopName, lat, lng, { morningEta: '08:00', eveningEta: '18:30' }));
        }
    }, [pinMode, applyOffice, applyPickup]);

    const handleMapClick = useCallback((lat: number, lng: number) => {
        if (pinMode === 'office') {
            applyOffice(makeStop(`Office ${officeStops.length + 1}`, lat, lng, { morningEta: '09:00', eveningEta: '18:00' }));
        } else {
            applyPickup(makeStop(`Pickup ${pickupStops.length + 1}`, lat, lng, { morningEta: '08:00', eveningEta: '18:30' }));
        }
    }, [pinMode, pickupStops.length, officeStops.length, applyOffice, applyPickup]);

    const handleRemovePickup = useCallback((id: string) => {
        setPickupStops((prev) => {
            const updated = prev.filter((s) => s.id !== id);
            schedulePolylineUpdate([...updated, ...officeStops]);
            return updated;
        });
    }, [officeStops, schedulePolylineUpdate]);

    const handleRemoveOffice = useCallback((id: string) => {
        setOfficeStops((prev) => {
            const updated = prev.filter((s) => s.id !== id);
            schedulePolylineUpdate([...pickupStops, ...updated]);
            return updated;
        });
    }, [pickupStops, schedulePolylineUpdate]);

    const handlePickupChange = useCallback((id: string, field: keyof Stop, value: string) => {
        setPickupStops((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
    }, []);

    const handleOfficeChange = useCallback((id: string, field: keyof Stop, value: string) => {
        setOfficeStops((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
    }, []);

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!name || !companyId) { toast.error('Please fill in required fields'); return; }
        if (officeStops.length < 1) { toast.error('Set at least one company office stop — it is required'); return; }
        if (pickupStops.length < 1) { toast.error('Add at least one employee pickup stop'); return; }

        try {
            await dispatch(createAdminRoute({
                name,
                company_id: Number(companyId),
                assigned_vehicle_id: assignedVehicleId ? Number(assignedVehicleId) : undefined,
                assigned_driver_id: assignedDriverId || undefined,
                evening_vehicle_id: eveningVehicleId ? Number(eveningVehicleId) : undefined,
                evening_driver_id: eveningDriverId || undefined,
                stops: [
                    ...pickupStops.map((stop, index) => ({
                        name: stop.name,
                        lat: stop.lat,
                        lng: stop.lng,
                        morning_eta: stop.direction !== 'EVENING' ? stop.morningEta : undefined,
                        evening_eta: stop.direction !== 'MORNING' ? stop.eveningEta : undefined,
                        sequence_order: index + 1,
                        direction: stop.direction,
                        stop_type: 'PICKUP' as const,
                    })),
                    ...officeStops.map((stop, index) => ({
                        name: stop.name,
                        lat: stop.lat,
                        lng: stop.lng,
                        morning_eta: stop.morningEta,
                        evening_eta: stop.eveningEta,
                        sequence_order: pickupStops.length + index + 1,
                        direction: 'BOTH' as const,
                        stop_type: 'OFFICE' as const,
                    })),
                ],
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
        ...officeStops.map((s) => ({
            id: s.id,
            position: [s.lat, s.lng] as [number, number],
            label: `Office · ${s.name}`,
            color: '#ef4444',
        })),
    ];

    const mapPolylines: MapPolyline[] = routePolyline.length >= 2
        ? [{ positions: routePolyline, color: '#0C225E' }]
        : orderedStops.length > 1
        ? [{ positions: orderedStops.map((s) => [s.lat, s.lng] as [number, number]), color: '#2563eb' }]
        : [];

    const mapCenter: [number, number] | undefined = officeStops[0]
        ? [officeStops[0].lat, officeStops[0].lng]
        : pickupStops[0]
        ? [pickupStops[0].lat, pickupStops[0].lng]
        : undefined;

    const missing: string[] = [];
    if (!name.trim()) missing.push('Route name');
    if (!companyId) missing.push('Company');
    if (officeStops.length === 0) missing.push('At least one office');
    if (pickupStops.length < 1) missing.push('A pickup');
    const canSave = missing.length === 0;

    return (
        <div className="flex h-[calc(100vh-100px)] flex-col gap-4">
            <RouteCommandBar
                title="New route"
                subtitle="Offices are always last in the morning and first in the evening."
                actions={
                    <>
                        <button type="button" onClick={() => router.back()} className={adminBtnOutline}>Cancel</button>
                        <button
                            type="button"
                            onClick={() => void handleSubmit()}
                            disabled={routeActionStatus === 'loading' || !canSave}
                            className={adminBtnPrimary}
                        >
                            {routeActionStatus === 'loading' ? 'Saving…' : 'Save route'}
                        </button>
                    </>
                }
            />

            {!canSave && (
                <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-[var(--text-muted)]">Still need:</span>
                    {missing.map((item) => (
                        <span key={item} className="rounded-full bg-[color-mix(in_srgb,var(--cort-orange)_12%,transparent)] px-2.5 py-1 font-medium text-[var(--cort-orange)]">
                            {item}
                        </span>
                    ))}
                </div>
            )}

            <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-3">
                <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 shadow-[var(--shadow-card)]">
                    <section className="space-y-3">
                        <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">1. Company &amp; name</h2>
                        <div>
                            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Route name</label>
                            <input
                                id="name"
                                className={adminInput}
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Gulshan to office"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Company</label>
                            <select
                                id="company"
                                className={adminSelect}
                                value={companyId}
                                onChange={(e) => setCompanyId(e.target.value)}
                                disabled={companiesStatus === 'loading'}
                            >
                                <option value="">Select company</option>
                                {companies.map((c) => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                    </section>

                    <div className="flex rounded-full bg-[var(--bg-subtle)] p-1">
                        <button
                            type="button"
                            onClick={() => setPinMode('office')}
                            className={cx(
                                'flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-xs font-semibold',
                                pinMode === 'office' ? 'bg-[var(--cort-navy)] text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]',
                            )}
                        >
                            <Building2 className="h-3.5 w-3.5" />
                            Set office
                        </button>
                        <button
                            type="button"
                            onClick={() => setPinMode('pickup')}
                            className={cx(
                                'flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-xs font-semibold',
                                pinMode === 'pickup' ? 'bg-[var(--cort-orange)] text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]',
                            )}
                        >
                            <MapPin className="h-3.5 w-3.5" />
                            Add pickup
                        </button>
                    </div>

                    <div>
                        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                            {pinMode === 'office' ? 'Search office address' : 'Search employee pickup'}
                        </label>
                        <StopAddressSearch
                            onSelect={handleAddressSelect}
                            placeholder={pinMode === 'office' ? 'Search office / HQ…' : 'Search pickup…'}
                            clearOnSelect
                        />
                        <p className="mt-1.5 text-xs text-[var(--text-muted)]">
                            Or click the map to pin the {pinMode === 'office' ? 'office' : 'pickup'}.
                        </p>
                    </div>

                    <section>
                        <div className="mb-2 flex items-center justify-between">
                            <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                                2. Office{officeStops.length !== 1 ? 's' : ''}{officeStops.length > 0 ? ` (${officeStops.length})` : ''}
                            </h2>
                            <span className="rounded-full bg-[color-mix(in_srgb,var(--cort-orange)_12%,transparent)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--cort-orange)]">
                                At least 1 required
                            </span>
                        </div>
                        {officeStops.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-[var(--border-default)] bg-[var(--bg-subtle)] p-4 text-center">
                                <p className="text-sm font-medium text-[var(--text-primary)]">No office set yet</p>
                                <p className="mt-1 text-xs text-[var(--text-muted)]">
                                    Switch to Set office, then search or click the map. Add more than one if this route serves multiple offices.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {officeStops.map((stop) => (
                                    <div key={stop.id} className="rounded-xl border border-[color-mix(in_srgb,var(--cort-orange)_35%,transparent)] bg-[var(--bg-subtle)] p-3">
                                        <div className="mb-2 flex items-start gap-2">
                                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--cort-orange)] text-white">
                                                <Building2 className="h-4 w-4" />
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <input
                                                    value={stop.name}
                                                    onChange={(e) => handleOfficeChange(stop.id, 'name', e.target.value)}
                                                    className={cx(adminInput, 'h-8 text-sm font-semibold')}
                                                />
                                                <p className="mt-1 text-[11px] text-[var(--text-muted)]">People board at pickups only — no employee assignment here.</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveOffice(stop.id)}
                                                className="text-[var(--text-muted)] hover:text-rose-600"
                                                title="Remove office"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 pl-10 text-xs">
                                            <div>
                                                <label className="mb-0.5 block text-[var(--text-muted)]">Morning arrival</label>
                                                <input type="time" value={stop.morningEta} onChange={(e) => handleOfficeChange(stop.id, 'morningEta', e.target.value)} className={adminInput} />
                                            </div>
                                            <div>
                                                <label className="mb-0.5 block text-[var(--text-muted)]">Evening departure</label>
                                                <input type="time" value={stop.eveningEta} onChange={(e) => handleOfficeChange(stop.id, 'eveningEta', e.target.value)} className={adminInput} />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    <section>
                        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                            3. Pickups ({pickupStops.length})
                        </h2>
                        {pickupStops.length === 0 ? (
                            <p className="rounded-xl border border-dashed border-[var(--border-default)] py-6 text-center text-sm text-[var(--text-muted)]">
                                No pickups yet — use Add pickup or the map.
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {pickupStops.map((stop, index) => (
                                    <div key={stop.id} className="group rounded-xl border border-[var(--border-default)] bg-[var(--bg-subtle)] p-3">
                                        <div className="mb-2 flex items-center gap-2">
                                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--cort-navy)] text-xs font-bold text-white">
                                                {index + 1}
                                            </span>
                                            <input
                                                value={stop.name}
                                                onChange={(e) => handlePickupChange(stop.id, 'name', e.target.value)}
                                                className={cx(adminInput, 'h-8 flex-1 text-sm')}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => handleRemovePickup(stop.id)}
                                                className="text-[var(--text-muted)] hover:text-rose-600 md:opacity-0 md:group-hover:opacity-100"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 pl-8 text-xs">
                                            <div>
                                                <label className="mb-0.5 block text-[var(--text-muted)]">When</label>
                                                <select
                                                    value={stop.direction}
                                                    onChange={(e) => handlePickupChange(stop.id, 'direction', e.target.value)}
                                                    className={adminSelect}
                                                >
                                                    <option value="BOTH">Both</option>
                                                    <option value="MORNING">Morning only</option>
                                                    <option value="EVENING">Evening only</option>
                                                </select>
                                            </div>
                                            {stop.direction !== 'EVENING' && (
                                                <div>
                                                    <label className="mb-0.5 block text-[var(--text-muted)]">Morning time</label>
                                                    <input type="time" value={stop.morningEta} onChange={(e) => handlePickupChange(stop.id, 'morningEta', e.target.value)} className={adminInput} />
                                                </div>
                                            )}
                                            {stop.direction !== 'MORNING' && (
                                                <div>
                                                    <label className="mb-0.5 block text-[var(--text-muted)]">Evening time</label>
                                                    <input type="time" value={stop.eveningEta} onChange={(e) => handlePickupChange(stop.id, 'eveningEta', e.target.value)} className={adminInput} />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    <section className="space-y-3">
                        <div>
                            <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">4. Usual driver &amp; vehicle (optional)</h2>
                            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                                Leave evening empty to use the same driver and vehicle as morning.
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Morning driver</label>
                                <select
                                    className={adminSelect}
                                    value={assignedDriverId}
                                    onChange={(e) => setAssignedDriverId(e.target.value)}
                                >
                                    <option value="">None</option>
                                    {drivers.map((d) => (
                                        <option key={d.id} value={d.id}>{d.full_name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Morning vehicle</label>
                                <select
                                    className={adminSelect}
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
                                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Evening driver</label>
                                <select
                                    className={adminSelect}
                                    value={eveningDriverId}
                                    onChange={(e) => setEveningDriverId(e.target.value)}
                                >
                                    <option value="">Same as morning</option>
                                    {drivers.map((d) => (
                                        <option key={d.id} value={d.id}>{d.full_name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Evening vehicle</label>
                                <select
                                    className={adminSelect}
                                    value={eveningVehicleId}
                                    onChange={(e) => setEveningVehicleId(e.target.value)}
                                >
                                    <option value="">Same as morning</option>
                                    {vehicles.map((v) => (
                                        <option key={v.id} value={v.id}>
                                            {v.plate_number}{v.model ? ` · ${v.model}` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </section>

                    {officeStops.length > 0 && pickupStops.length > 0 && (
                        <section className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-subtle)] p-3 text-xs text-[var(--text-secondary)]">
                            <p className="mb-2 font-semibold text-[var(--text-primary)]">Order on save</p>
                            <p>
                                <span className="font-medium">Morning → </span>
                                {pickupStops.map((s) => s.name).join(' → ')} → {officeStops.map((s) => s.name).join(', ')}
                            </p>
                            <p className="mt-1">
                                <span className="font-medium">Evening → </span>
                                {officeStops.map((s) => s.name).join(', ')} → {[...pickupStops].reverse().map((s) => s.name).join(' → ')}
                            </p>
                            <p className="mt-2 text-[var(--text-muted)]">
                                Pickup order is auto-optimized on save; evening is the reverse of morning.
                                {officeStops.length > 1 && ' Multiple offices are placed after pickups — adjust exact positions from Manage Stops after creating the route.'}
                            </p>
                        </section>
                    )}

                    {orderedStops.length >= 2 && (
                        <div className="flex items-center gap-2 border-t border-[var(--border-default)] pt-2 text-xs text-[var(--text-muted)]">
                            <div className="h-2 w-2 rounded-full bg-[var(--cort-navy)]" />
                            Road-following route via Google Maps
                        </div>
                    )}
                </div>

                <div className="relative h-full min-h-[320px] overflow-hidden rounded-2xl border border-[var(--border-default)] lg:col-span-2">
                    <div className="pointer-events-none absolute left-3 top-3 z-[500] flex gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--bg-card)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-secondary)] shadow-sm">
                            <span className="h-2 w-2 rounded-full bg-[var(--cort-orange)]" /> Office
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--bg-card)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-secondary)] shadow-sm">
                            <span className="h-2 w-2 rounded-full bg-[var(--cort-navy)]" /> Pickups
                        </span>
                    </div>
                    <Map
                        height="100%"
                        onMapClick={handleMapClick}
                        markers={mapMarkers}
                        polylines={mapPolylines}
                        center={mapCenter}
                    />
                </div>
            </div>
        </div>
    );
}
