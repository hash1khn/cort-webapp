'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Bus, RefreshCw, Trash2 } from 'lucide-react';
import { PermissionGate } from '@/app/admin/components/PermissionGate';
import { AdminCan } from '@/app/lib/abilities/AdminAbilityProvider';
import { Card } from '@/app/admin/ui/Card';
import { Button } from '@/app/admin/ui/Button';
import { apiClient } from '@/app/lib/services/api-client';
import { useAuth } from '@/app/lib/contexts/auth-context';
import { useAppDispatch, useAppSelector } from '@/app/lib/store/hooks';
import {
    fetchAdminCompanies,
    selectAdminCompanies,
    selectAdminCompaniesStatus,
} from '@/app/lib/store/slices/adminCompaniesSlice';

type GenerationRoute = {
    id: number;
    name: string;
    company_id: number | null;
    companies: { id: number; name: string } | null;
};

type ScheduledTripRow = {
    id: number;
    trip_date: string | null;
    direction: string;
    status: string;
    routes: {
        id: number;
        name: string;
        company_id: number | null;
        companies: { id: number; name: string } | null;
        vehicles: { plate_number: string; model: string | null } | null;
    } | null;
    users: { id: string; full_name: string } | null;
};

type Paginated<T> = {
    data: T[];
    pagination: { page: number; limit: number; total: number; pages: number; hasNext: boolean; hasPrev: boolean };
};

function utcTodayYmd(): string {
    const n = new Date();
    return `${n.getUTCFullYear()}-${String(n.getUTCMonth() + 1).padStart(2, '0')}-${String(n.getUTCDate()).padStart(2, '0')}`;
}

function formatTripDate(isoOrDate: string | null): string {
    if (!isoOrDate) return '—';
    const d = new Date(isoOrDate);
    if (Number.isNaN(d.getTime())) return isoOrDate.slice(0, 10);
    return d.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
}

export default function ShuttleTripsSchedulingPage() {
    return (
        <PermissionGate permission="ops_shuttle">
            <AdminCan I="read" a="OpsShuttle">
                <ShuttleTripsSchedulingContent />
            </AdminCan>
        </PermissionGate>
    );
}

function ShuttleTripsSchedulingContent() {
    const dispatch = useAppDispatch();
    const { hasCrud } = useAuth();
    const canMutate = hasCrud('ops_shuttle', 'update');
    const companies = useAppSelector(selectAdminCompanies);
    const companiesStatus = useAppSelector(selectAdminCompaniesStatus);

    const [generationRoutes, setGenerationRoutes] = useState<GenerationRoute[]>([]);
    const [fromDate, setFromDate] = useState(utcTodayYmd);
    const [filterCompanyId, setFilterCompanyId] = useState<number | ''>('');
    const [filterRouteId, setFilterRouteId] = useState<number | ''>('');
    const [page, setPage] = useState(1);
    const [listLoading, setListLoading] = useState(true);
    const [listError, setListError] = useState<string | null>(null);
    const [rows, setRows] = useState<ScheduledTripRow[]>([]);
    const [pagination, setPagination] = useState<Paginated<ScheduledTripRow>['pagination'] | null>(null);

    const [selectedRouteId, setSelectedRouteId] = useState<number | ''>('');
    const [generateDate, setGenerateDate] = useState(utcTodayYmd);
    const [generateBusy, setGenerateBusy] = useState(false);
    const [dailyAllBusy, setDailyAllBusy] = useState(false);
    const [regenerateBusy, setRegenerateBusy] = useState(false);
    const [banner, setBanner] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

    const loadGenerationRoutes = useCallback(async (companyId?: number) => {
        const params = new URLSearchParams();
        if (companyId) params.set('company_id', String(companyId));
        const q = params.toString();
        const data = await apiClient.request<GenerationRoute[]>(
            `/shuttle-trips/generation-routes${q ? `?${q}` : ''}`,
        );
        setGenerationRoutes(Array.isArray(data) ? data : []);
    }, []);

    const loadTrips = useCallback(async () => {
        try {
            setListLoading(true);
            setListError(null);
            const params = new URLSearchParams({ from_date: fromDate, page: String(page), limit: '50' });
            if (filterCompanyId !== '') params.set('company_id', String(filterCompanyId));
            if (filterRouteId !== '') params.set('route_id', String(filterRouteId));
            const res = await apiClient.request<Paginated<ScheduledTripRow>>(`/shuttle-trips/scheduled?${params.toString()}`);
            setRows(res?.data ?? []);
            setPagination(res?.pagination ?? null);
        } catch (e) {
            setListError(e instanceof Error ? e.message : 'Failed to load trips');
            setRows([]);
            setPagination(null);
        } finally {
            setListLoading(false);
        }
    }, [fromDate, filterCompanyId, filterRouteId, page]);

    useEffect(() => {
        if (companiesStatus === 'idle') {
            dispatch(fetchAdminCompanies({ limit: 200 }));
        }
    }, [dispatch, companiesStatus]);

    useEffect(() => {
        loadGenerationRoutes(filterCompanyId === '' ? undefined : filterCompanyId).catch(() => setGenerationRoutes([]));
    }, [loadGenerationRoutes, filterCompanyId]);

    useEffect(() => {
        loadTrips();
    }, [loadTrips]);

    const routeOptions = useMemo(() => {
        if (filterCompanyId === '') return generationRoutes;
        return generationRoutes.filter((r) => r.company_id === filterCompanyId);
    }, [generationRoutes, filterCompanyId]);

    const handleGenerateForDate = async () => {
        if (!canMutate || selectedRouteId === '') {
            setBanner({ type: 'err', text: 'Select a route and ensure you have permission to update shuttle ops.' });
            return;
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(generateDate)) {
            setBanner({ type: 'err', text: 'Pick a valid date.' });
            return;
        }
        setGenerateBusy(true);
        setBanner(null);
        try {
            const result = await apiClient.request<{ message: string; createdCount: number }>(
                '/shuttle-trips/generate-for-route',
                {
                    method: 'POST',
                    body: JSON.stringify({ route_id: selectedRouteId, dates: [generateDate] }),
                },
            );
            setBanner({ type: 'ok', text: result.message });
            await loadTrips();
        } catch (e) {
            setBanner({ type: 'err', text: e instanceof Error ? e.message : 'Generation failed' });
        } finally {
            setGenerateBusy(false);
        }
    };

    const handleDailyAllRoutes = async () => {
        if (!canMutate) return;
        setDailyAllBusy(true);
        setBanner(null);
        try {
            const result = await apiClient.request<{ message: string; createdCount: number }>(
                '/shuttle-trips/trigger-daily-generation',
                { method: 'POST' },
            );
            setBanner({ type: 'ok', text: result.message });
            await loadTrips();
        } catch (e) {
            setBanner({ type: 'err', text: e instanceof Error ? e.message : 'Failed to generate trips for today' });
        } finally {
            setDailyAllBusy(false);
        }
    };

    const handleRegenerateToday = async () => {
        if (!canMutate) return;
        if (!window.confirm('This will delete all SCHEDULED trips for today and regenerate them. Continue?')) return;
        setRegenerateBusy(true);
        setBanner(null);
        try {
            const result = await apiClient.request<{ message: string; deletedCount: number; createdCount: number }>(
                '/shuttle-trips/regenerate-daily',
                { method: 'POST' },
            );
            setBanner({ type: 'ok', text: result.message });
            await loadTrips();
        } catch (e) {
            setBanner({ type: 'err', text: e instanceof Error ? e.message : 'Failed to regenerate trips' });
        } finally {
            setRegenerateBusy(false);
        }
    };

    const handleDelete = async (trip: ScheduledTripRow) => {
        if (!canMutate || trip.status !== 'SCHEDULED') return;
        if (!window.confirm(`Delete ${trip.direction} trip #${trip.id} on ${formatTripDate(trip.trip_date)}?`)) return;
        try {
            await apiClient.request(`/shuttle-trips/${trip.id}`, { method: 'DELETE' });
            setBanner({ type: 'ok', text: 'Trip deleted.' });
            await loadTrips();
        } catch (e) {
            setBanner({ type: 'err', text: e instanceof Error ? e.message : 'Delete failed' });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <div className="text-sm font-medium text-gray-400">Routes</div>
                    <h1 className="mt-1 text-2xl font-bold text-gray-900">Shuttle trip scheduling</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        View upcoming trips, remove mistaken SCHEDULED trips, and generate trips for one route and one day at a time.
                    </p>
                </div>
                <Link href="/admin/routes">
                    <Button variant="outline">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to routes
                    </Button>
                </Link>
            </div>

            {banner && (
                <div
                    className={`rounded-lg border p-4 text-sm ${
                        banner.type === 'ok'
                            ? 'border-green-200 bg-green-50 text-green-800'
                            : 'border-red-200 bg-red-50 text-red-700'
                    }`}
                >
                    {banner.text}
                </div>
            )}

            <Card className="p-6 space-y-4">
                <h2 className="text-lg font-semibold text-gray-900">Quick actions</h2>
                <p className="text-sm text-gray-500">
                    Generate morning and evening trips for <strong>today (UTC)</strong> on every eligible route (driver + vehicle + shuttle-enabled company).
                </p>
                <div className="flex flex-wrap gap-3">
                    <Button variant="outline" onClick={handleDailyAllRoutes} disabled={!canMutate || dailyAllBusy}>
                        {dailyAllBusy ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Bus className="mr-2 h-4 w-4" />}
                        Generate today&apos;s trips (all routes)
                    </Button>
                    <Button variant="outline" onClick={handleRegenerateToday} disabled={!canMutate || regenerateBusy}>
                        {regenerateBusy ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                        Regenerate today&apos;s trips
                    </Button>
                </div>
            </Card>

            <Card className="p-6 space-y-4">
                <h2 className="text-lg font-semibold text-gray-900">Generate by route and date</h2>
                <p className="text-sm text-gray-500">
                    Creates MORNING and EVENING SCHEDULED trips for that single calendar day (UTC). Any direction that already exists for that day is skipped.
                </p>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <label className="flex flex-col gap-1 text-sm">
                        <span className="font-medium text-gray-700">Route</span>
                        <select
                            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0C225E]/30"
                            value={selectedRouteId === '' ? '' : String(selectedRouteId)}
                            onChange={(e) => setSelectedRouteId(e.target.value ? Number(e.target.value) : '')}
                        >
                            <option value="">Select route…</option>
                            {routeOptions.map((r) => (
                                <option key={r.id} value={r.id}>
                                    {r.companies?.name ? `${r.companies.name} · ` : ''}
                                    {r.name}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="flex flex-col gap-1 text-sm">
                        <span className="font-medium text-gray-700">Date (UTC)</span>
                        <input
                            type="date"
                            className="rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0C225E]/30"
                            value={generateDate}
                            onChange={(e) => setGenerateDate(e.target.value)}
                        />
                    </label>
                    <div className="flex items-end">
                        <Button onClick={handleGenerateForDate} disabled={!canMutate || generateBusy || selectedRouteId === ''}>
                            {generateBusy ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Generate trips
                        </Button>
                    </div>
                </div>
            </Card>

            <Card className="p-6 space-y-4">
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <h2 className="text-lg font-semibold text-gray-900">Scheduled trips</h2>
                    <Button variant="outline" size="sm" onClick={() => loadTrips()} disabled={listLoading}>
                        <RefreshCw className={`mr-2 h-4 w-4 ${listLoading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <label className="flex flex-col gap-1 text-sm">
                        <span className="font-medium text-gray-700">From date (UTC)</span>
                        <input
                            type="date"
                            className="rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0C225E]/30"
                            value={fromDate}
                            onChange={(e) => {
                                setFromDate(e.target.value);
                                setPage(1);
                            }}
                        />
                    </label>
                    <label className="flex flex-col gap-1 text-sm">
                        <span className="font-medium text-gray-700">Company</span>
                        <select
                            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0C225E]/30"
                            value={filterCompanyId === '' ? '' : String(filterCompanyId)}
                            onChange={(e) => {
                                setFilterCompanyId(e.target.value ? Number(e.target.value) : '');
                                setFilterRouteId('');
                                setPage(1);
                            }}
                        >
                            <option value="">All companies</option>
                            {companies.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="flex flex-col gap-1 text-sm">
                        <span className="font-medium text-gray-700">Route</span>
                        <select
                            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0C225E]/30"
                            value={filterRouteId === '' ? '' : String(filterRouteId)}
                            onChange={(e) => {
                                setFilterRouteId(e.target.value ? Number(e.target.value) : '');
                                setPage(1);
                            }}
                        >
                            <option value="">All routes</option>
                            {routeOptions.map((r) => (
                                <option key={r.id} value={r.id}>
                                    {r.name}
                                </option>
                            ))}
                        </select>
                    </label>
                </div>

                {listError && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{listError}</div>
                )}

                <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-3 py-2 text-left font-medium text-gray-600">Date (UTC)</th>
                                <th className="px-3 py-2 text-left font-medium text-gray-600">Company</th>
                                <th className="px-3 py-2 text-left font-medium text-gray-600">Route</th>
                                <th className="px-3 py-2 text-left font-medium text-gray-600">Direction</th>
                                <th className="px-3 py-2 text-left font-medium text-gray-600">Status</th>
                                <th className="px-3 py-2 text-left font-medium text-gray-600">Driver</th>
                                <th className="px-3 py-2 text-left font-medium text-gray-600">Vehicle</th>
                                <th className="px-3 py-2 text-right font-medium text-gray-600">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                            {listLoading && (
                                <tr>
                                    <td colSpan={8} className="px-3 py-8 text-center text-gray-400">
                                        Loading…
                                    </td>
                                </tr>
                            )}
                            {!listLoading && rows.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="px-3 py-8 text-center text-gray-400">
                                        No trips in this range.
                                    </td>
                                </tr>
                            )}
                            {!listLoading &&
                                rows.map((trip) => (
                                    <tr key={trip.id} className="hover:bg-gray-50/80">
                                        <td className="whitespace-nowrap px-3 py-2 text-gray-900">{formatTripDate(trip.trip_date)}</td>
                                        <td className="px-3 py-2 text-gray-700">{trip.routes?.companies?.name ?? '—'}</td>
                                        <td className="px-3 py-2 text-gray-900">{trip.routes?.name ?? '—'}</td>
                                        <td className="px-3 py-2 text-gray-700">{trip.direction}</td>
                                        <td className="px-3 py-2">
                                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                                                {trip.status}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2 text-gray-700">{trip.users?.full_name ?? '—'}</td>
                                        <td className="whitespace-nowrap px-3 py-2 text-gray-600">
                                            {trip.routes?.vehicles
                                                ? `${trip.routes.vehicles.model ?? ''} ${trip.routes.vehicles.plate_number}`.trim()
                                                : '—'}
                                        </td>
                                        <td className="px-3 py-2 text-right">
                                            {trip.status === 'SCHEDULED' && canMutate ? (
                                                <button
                                                    type="button"
                                                    onClick={() => handleDelete(trip)}
                                                    className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-white px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                    Delete
                                                </button>
                                            ) : (
                                                <span className="text-xs text-gray-400">—</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                </div>

                {pagination && pagination.pages > 1 && (
                    <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-gray-600">
                        <span>
                            Page {pagination.page} of {pagination.pages} ({pagination.total} total)
                        </span>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={!pagination.hasPrev || listLoading}
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                            >
                                Previous
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={!pagination.hasNext || listLoading}
                                onClick={() => setPage((p) => p + 1)}
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
}
