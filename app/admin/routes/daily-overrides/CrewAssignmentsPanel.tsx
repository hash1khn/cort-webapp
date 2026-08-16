'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Bus, Car, RotateCcw, User } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/app/admin/ui/Button';
import { Card } from '@/app/admin/ui/Card';
import { apiClient } from '@/app/lib/services/api-client';
import { useAppDispatch, useAppSelector } from '@/app/lib/store/hooks';
import { fetchAdminDrivers, selectAdminDrivers } from '@/app/lib/store/slices/adminDriversSlice';
import { fetchAdminVehicles, selectAdminVehicles } from '@/app/lib/store/slices/adminVehiclesSlice';
import { DriverType } from '@/app/lib/services/types/drivers';

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

function statusLabel(status: string): { text: string; className: string } {
    if (status === 'SCHEDULED') return { text: 'Not started', className: 'bg-slate-100 text-slate-700' };
    if (status === 'STARTED' || status === 'IN_PROGRESS') return { text: 'On the road', className: 'bg-emerald-100 text-emerald-800' };
    if (status === 'COMPLETED') return { text: 'Finished', className: 'bg-zinc-100 text-zinc-500' };
    return { text: status, className: 'bg-zinc-100 text-zinc-600' };
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
        return companyDrivers.find((d) => d.id === id)?.full_name ?? trips.find((t) => t.users?.id === id)?.users?.full_name ?? trips.find((t) => t.routes?.users?.id === id)?.routes?.users?.full_name ?? null;
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
        return <p className="text-sm text-gray-400">Loading today&apos;s trips…</p>;
    }

    if (trips.length === 0) {
        return (
            <Card className="p-8 text-center space-y-3">
                <Bus className="w-8 h-8 mx-auto text-gray-300" />
                <p className="text-sm font-medium text-gray-700">No trips generated for this day yet</p>
                <p className="text-sm text-gray-500">
                    Generate the {direction === 'MORNING' ? 'morning' : 'evening'} trips first, then come back here to swap the driver or vehicle. Passenger moves on the other tab still work without this.
                </p>
                <Link href="/admin/routes/shuttle-trips">
                    <Button variant="outline">Open trip scheduling</Button>
                </Link>
            </Card>
        );
    }

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-500">
                <span>
                    {trips.length} {trips.length === 1 ? 'trip' : 'trips'} · pick a new driver or vehicle and it saves immediately for this date and {direction === 'MORNING' ? 'morning' : 'evening'} only.
                </span>
                <span className="inline-flex items-center gap-1.5">
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 font-semibold text-amber-800">Temporary</span>
                    Different from the route&apos;s usual crew
                </span>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
                {trips.map((trip) => {
                    const currentDriverId = trip.driver_id ?? trip.users?.id ?? '';
                    const currentVehicleId = tripVehicleId(trip);
                    const vehicle = tripVehicle(trip);
                    const isTemp = trip.shuttle_trip_resource_overrides != null;
                    const locked = trip.status === 'COMPLETED' || trip.status === 'CANCELLED';
                    const busy = savingId === trip.id;
                    const status = statusLabel(trip.status ?? '');
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
                    const driverOptions = currentDriverId && !companyDrivers.some((d) => d.id === currentDriverId)
                        ? [{ id: currentDriverId, full_name: trip.users?.full_name ?? 'Current driver' }, ...companyDrivers]
                        : companyDrivers;
                    const vehicleOptions = currentVehicleId && !companyVehicles.some((v) => v.id === currentVehicleId)
                        ? [{ id: currentVehicleId, plate_number: vehicle?.plate_number ?? `#${currentVehicleId}`, make: vehicle?.make, model: vehicle?.model }, ...companyVehicles]
                        : companyVehicles;

                    return (
                        <Card key={trip.id} className="p-4 space-y-3">
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <div className="font-semibold text-gray-900">{trip.routes?.name ?? `Route ${trip.id}`}</div>
                                    <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${status.className}`}>
                                        {status.text}
                                    </span>
                                </div>
                                {isTemp && (
                                    <span className="text-[10px] font-bold uppercase tracking-wide bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                                        Temporary
                                    </span>
                                )}
                            </div>

                            {isTemp && (
                                <p className="text-xs text-amber-800 bg-amber-50 rounded-md px-2.5 py-1.5">
                                    Usually {usualDriverLabel} · {usualVehicleLabel}
                                </p>
                            )}

                            <label className="block text-xs font-medium text-gray-500">
                                <span className="inline-flex items-center gap-1 mb-1"><User className="w-3.5 h-3.5" /> Driver today</span>
                                <select
                                    className="w-full border rounded-md px-3 py-2 text-sm bg-white text-gray-900"
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
                            </label>

                            <label className="block text-xs font-medium text-gray-500">
                                <span className="inline-flex items-center gap-1 mb-1"><Car className="w-3.5 h-3.5" /> Vehicle today</span>
                                <select
                                    className="w-full border rounded-md px-3 py-2 text-sm bg-white text-gray-900"
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

                            {isTemp && canMutate && !locked && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={busy}
                                    onClick={() => void undoOverride(trip)}
                                >
                                    <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                                    Restore usual driver & vehicle
                                </Button>
                            )}
                            {locked && (
                                <p className="text-xs text-gray-400">This trip is finished — assignments can&apos;t be changed.</p>
                            )}
                            {busy && (
                                <p className="text-xs text-gray-400">Saving…</p>
                            )}
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
