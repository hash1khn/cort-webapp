'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Car, RotateCcw, User } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/app/admin/components/ui/Badge';
import { adminBtnOutline, adminBtnPrimary, adminSelect } from '@/app/admin/components/ui/admin-styles';
import { cx } from '@/app/admin/components/ui/cx';
import { apiClient } from '@/app/lib/services/api-client';
import { useAppDispatch, useAppSelector } from '@/app/lib/store/hooks';
import { fetchAdminDrivers, selectAdminDrivers } from '@/app/lib/store/slices/adminDriversSlice';
import { fetchAdminVehicles, selectAdminVehicles } from '@/app/lib/store/slices/adminVehiclesSlice';
import { DriverType } from '@/app/lib/services/types/drivers';
import { PlanEmptyState } from './PlanEmptyState';
import { initials } from './plan-types';

type TripVehicle = { id: number; plate_number: string; make?: string | null; model: string | null };

type ScheduledTripRow = {
    id: number;
    driver_id: string | null;
    vehicle_id: number | null;
    trip_date: string | null;
    direction: string;
    status: string;
    vehicles: TripVehicle | null;
    routes: {
        id: number;
        name: string;
        company_id: number | null;
        assigned_vehicle_id: number | null;
        assigned_driver_id: string | null;
        users: { id: string; full_name: string } | null;
        vehicles: TripVehicle | null;
    } | null;
    users: { id: string; full_name: string } | null;
    shuttle_trip_resource_overrides: { id: number; from_driver_id: string | null; from_vehicle_id: number | null } | null;
};

function tripVehicle(trip: ScheduledTripRow): TripVehicle | null {
    return trip.vehicles ?? trip.routes?.vehicles ?? null;
}

function tripVehicleId(trip: ScheduledTripRow): number | null {
    return trip.vehicle_id ?? trip.vehicles?.id ?? trip.routes?.assigned_vehicle_id ?? trip.routes?.vehicles?.id ?? null;
}

function vehicleLabel(v: { plate_number?: string | null; make?: string | null; model?: string | null }): string {
    const plate = v.plate_number ?? 'No plate';
    const name = [v.make, v.model].filter(Boolean).join(' ');
    return name ? `${plate} · ${name}` : plate;
}

function statusBadge(status: string): { text: string; color: 'gray' | 'green' | 'orange' } {
    if (status === 'SCHEDULED') return { text: 'Not started', color: 'gray' };
    if (status === 'STARTED' || status === 'IN_PROGRESS') return { text: 'On the road', color: 'green' };
    if (status === 'COMPLETED') return { text: 'Finished', color: 'gray' };
    return { text: status, color: 'orange' };
}

export function CrewAssignmentsPanel({
    companyId,
    date,
    direction,
    canMutate,
}: {
    companyId: number;
    date: string;
    direction: 'MORNING' | 'EVENING';
    canMutate: boolean;
}) {
    const dispatch = useAppDispatch();
    const drivers = useAppSelector(selectAdminDrivers);
    const vehicles = useAppSelector(selectAdminVehicles);

    const [trips, setTrips] = useState<ScheduledTripRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [savingId, setSavingId] = useState<number | null>(null);

    useEffect(() => {
        dispatch(fetchAdminDrivers({ limit: 200, driver_type: DriverType.SHUTTLE }));
        dispatch(fetchAdminVehicles({ limit: 200 }));
    }, [dispatch]);

    const loadTrips = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                on_date: date,
                direction,
                company_id: String(companyId),
                limit: '200',
            });
            const res = await apiClient.request<{ data?: ScheduledTripRow[] }>(`/shuttle-trips/scheduled?${params.toString()}`);
            setTrips(Array.isArray(res) ? res : res?.data ?? []);
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Could not load today\'s trips');
            setTrips([]);
        } finally {
            setLoading(false);
        }
    }, [companyId, date, direction]);

    useEffect(() => {
        loadTrips();
    }, [loadTrips]);

    const companyDrivers = useMemo(() => {
        const forCompany = drivers.filter((d) => d.company_id == null || d.company_id === companyId);
        return forCompany.length > 0 ? forCompany : drivers;
    }, [drivers, companyId]);

    const companyVehicles = useMemo(() => {
        const forCompany = vehicles.filter((v) => v.owner_company_id == null || v.owner_company_id === companyId);
        return forCompany.length > 0 ? forCompany : vehicles;
    }, [vehicles, companyId]);

    const driverName = (id: string | null | undefined) => {
        if (!id) return null;
        return companyDrivers.find((d) => d.id === id)?.full_name
            ?? trips.find((t) => t.users?.id === id)?.users?.full_name
            ?? trips.find((t) => t.routes?.users?.id === id)?.routes?.users?.full_name
            ?? null;
    };

    const vehicleName = (id: number | null | undefined) => {
        if (id == null) return null;
        const fromList = companyVehicles.find((v) => v.id === id);
        if (fromList) return vehicleLabel(fromList);
        const fromTrip = trips.map((t) => t.vehicles ?? t.routes?.vehicles).find((v) => v?.id === id);
        return fromTrip ? vehicleLabel(fromTrip) : null;
    };

    const applyOverride = async (trip: ScheduledTripRow, payload: { driver_id?: string; vehicle_id?: number }) => {
        if (!canMutate) return;
        setSavingId(trip.id);
        try {
            await apiClient.setShuttleTripResourceOverride(trip.id, payload);
            toast.success('Saved for this trip only — the route\'s usual driver/vehicle is unchanged.');
            await loadTrips();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Could not save');
        } finally {
            setSavingId(null);
        }
    };

    const undoOverride = async (trip: ScheduledTripRow) => {
        if (!canMutate) return;
        setSavingId(trip.id);
        try {
            await apiClient.clearShuttleTripResourceOverride(trip.id);
            toast.success('Restored the usual driver and vehicle for this trip.');
            await loadTrips();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Could not undo');
        } finally {
            setSavingId(null);
        }
    };

    if (loading) {
        return (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {[0, 1, 2].map((i) => (
                    <div key={i} className="h-64 animate-pulse rounded-2xl bg-[var(--bg-subtle)]" />
                ))}
            </div>
        );
    }

    if (trips.length === 0) {
        return (
            <PlanEmptyState
                title="No trips generated for this day yet"
                description={`Generate the ${direction === 'MORNING' ? 'morning' : 'evening'} trips first, then come back to swap the driver or vehicle. Passenger moves on the other tab still work without this.`}
                action={
                    <Link href="/admin/routes/shuttle-trips" className={adminBtnPrimary}>
                        Open trip scheduling
                    </Link>
                }
            />
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-[var(--text-muted)]">
                    {trips.length} {trips.length === 1 ? 'trip' : 'trips'} · changes save immediately for this {direction === 'MORNING' ? 'morning' : 'evening'} only
                </span>
                <span className="rounded-full bg-[color-mix(in_srgb,var(--cort-orange)_12%,transparent)] px-2.5 py-1 text-[11px] font-medium text-[var(--cort-orange)]">
                    Temporary — different from the usual crew
                </span>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {trips.map((trip) => {
                    const currentDriverId = trip.driver_id ?? trip.users?.id ?? '';
                    const currentVehicleId = tripVehicleId(trip);
                    const vehicle = tripVehicle(trip);
                    const isTemp = trip.shuttle_trip_resource_overrides != null;
                    const locked = trip.status === 'COMPLETED' || trip.status === 'CANCELLED';
                    const busy = savingId === trip.id;
                    const status = statusBadge(trip.status ?? '');
                    const usualDriverId = trip.shuttle_trip_resource_overrides?.from_driver_id
                        ?? trip.routes?.assigned_driver_id
                        ?? trip.routes?.users?.id
                        ?? null;
                    const usualVehicleId = trip.shuttle_trip_resource_overrides?.from_vehicle_id
                        ?? trip.routes?.assigned_vehicle_id
                        ?? trip.routes?.vehicles?.id
                        ?? null;
                    const usualDriverLabel = driverName(usualDriverId) ?? 'Usual driver';
                    const usualVehicleLabel = vehicleName(usualVehicleId) ?? 'Usual vehicle';
                    const currentDriverLabel = trip.users?.full_name ?? driverName(currentDriverId) ?? 'Select driver';
                    const driverOptions = currentDriverId && !companyDrivers.some((d) => d.id === currentDriverId)
                        ? [{ id: currentDriverId, full_name: trip.users?.full_name ?? 'Current driver' }, ...companyDrivers]
                        : companyDrivers;
                    const vehicleOptions = currentVehicleId && !companyVehicles.some((v) => v.id === currentVehicleId)
                        ? [{ id: currentVehicleId, plate_number: vehicle?.plate_number ?? `#${currentVehicleId}`, make: vehicle?.make, model: vehicle?.model }, ...companyVehicles]
                        : companyVehicles;

                    return (
                        <div
                            key={trip.id}
                            className={cx(
                                'overflow-hidden rounded-2xl border bg-[var(--bg-card)] shadow-[var(--shadow-card)]',
                                isTemp ? 'border-[color-mix(in_srgb,var(--cort-orange)_40%,transparent)]' : 'border-[var(--border-default)]',
                            )}
                        >
                            <div className="flex">
                                <div className={cx('w-1.5 shrink-0', isTemp ? 'bg-[var(--cort-orange)]' : 'bg-[var(--cort-navy)]')} />
                                <div className="flex-1 space-y-4 p-4">
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <div className="font-semibold text-[var(--text-primary)]">{trip.routes?.name ?? `Route ${trip.id}`}</div>
                                            <div className="mt-1.5">
                                                <Badge color={status.color}>{status.text}</Badge>
                                            </div>
                                        </div>
                                        {isTemp && <Badge color="orange">Temporary</Badge>}
                                    </div>

                                    {isTemp && (
                                        <p className="rounded-lg bg-[color-mix(in_srgb,var(--cort-orange)_10%,transparent)] px-3 py-2 text-xs text-[var(--cort-orange)]">
                                            Usually {usualDriverLabel} · {usualVehicleLabel}
                                        </p>
                                    )}

                                    <div className="space-y-3">
                                        <label className="block">
                                            <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                                                <User className="h-3.5 w-3.5" /> Driver today
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--cort-navy)] text-[11px] font-bold text-white">
                                                    {initials(currentDriverLabel)}
                                                </span>
                                                <select
                                                    className={cx(adminSelect, 'flex-1')}
                                                    disabled={!canMutate || locked || busy}
                                                    value={currentDriverId}
                                                    onChange={(e) => {
                                                        const next = e.target.value;
                                                        if (!next || next === currentDriverId) return;
                                                        void applyOverride(trip, { driver_id: next });
                                                    }}
                                                >
                                                    <option value="">Select driver</option>
                                                    {driverOptions.map((d) => (
                                                        <option key={d.id} value={d.id}>{d.full_name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </label>

                                        <label className="block">
                                            <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                                                <Car className="h-3.5 w-3.5" /> Vehicle today
                                            </span>
                                            <select
                                                className={adminSelect}
                                                disabled={!canMutate || locked || busy}
                                                value={currentVehicleId != null ? String(currentVehicleId) : ''}
                                                onChange={(e) => {
                                                    const next = e.target.value ? Number(e.target.value) : null;
                                                    if (next == null || next === currentVehicleId) return;
                                                    void applyOverride(trip, { vehicle_id: next });
                                                }}
                                            >
                                                <option value="">Select vehicle</option>
                                                {vehicleOptions.map((v) => (
                                                    <option key={v.id} value={v.id}>{vehicleLabel(v)}</option>
                                                ))}
                                            </select>
                                        </label>
                                    </div>

                                    {isTemp && canMutate && !locked && (
                                        <button
                                            type="button"
                                            disabled={busy}
                                            onClick={() => void undoOverride(trip)}
                                            className={cx(adminBtnOutline, 'h-9 w-full text-xs')}
                                        >
                                            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                                            Restore usual driver & vehicle
                                        </button>
                                    )}
                                    {locked && (
                                        <p className="text-xs text-[var(--text-muted)]">This trip is finished — assignments can&apos;t be changed.</p>
                                    )}
                                    {busy && (
                                        <p className="text-xs text-[var(--text-muted)]">Saving…</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
