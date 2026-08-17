'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeftRight, Bus, Car, MapPin, Plus, Search } from 'lucide-react';
import { Badge } from '@/app/admin/components/ui/Badge';
import { adminBtnOutline, adminBtnPrimary, adminSelect, adminInput } from '@/app/admin/components/ui/admin-styles';
import { cx } from '@/app/admin/components/ui/cx';
import { PermissionGate } from '@/app/admin/components/PermissionGate';
import { AdminCan, useAdminAbility } from '@/app/lib/abilities/AdminAbilityProvider';
import { ADMIN_SUBJECTS } from '@/app/lib/abilities/admin-subjects';
import { useAuth } from '@/app/lib/contexts/auth-context';
import { useAppDispatch, useAppSelector } from '@/app/lib/store/hooks';
import { fetchAdminRoutes, selectAdminRoutes, selectAdminRoutesStatus, type Route } from '@/app/lib/store/slices/adminRoutesSlice';
import { fetchAdminCompanies, selectAdminCompanies, selectAdminCompaniesStatus } from '@/app/lib/store/slices/adminCompaniesSlice';
import { RouteCommandBar, RouteEmptyState, initials } from './RouteCommandBar';

export default function RoutesPage() {
    return (
        <PermissionGate permission="routes">
            <AdminCan I="read" a="Routes">
                <RoutesPageContent />
            </AdminCan>
        </PermissionGate>
    );
}

function routeCompanyId(route: Route): number | null {
    return route.company?.id ?? route.companies?.id ?? route.company_id ?? null;
}

function RoutesPageContent() {
    const dispatch = useAppDispatch();
    const ability = useAdminAbility();
    const { hasPermission } = useAuth();
    const canOpsShuttle = hasPermission('ops_shuttle');
    const canCreate = ability.can('create', ADMIN_SUBJECTS.routes);
    const routes = useAppSelector(selectAdminRoutes);
    const status = useAppSelector(selectAdminRoutesStatus);
    const companies = useAppSelector(selectAdminCompanies);
    const companiesStatus = useAppSelector(selectAdminCompaniesStatus);
    const [selectedCompanyId, setSelectedCompanyId] = useState<number | ''>('');
    const [search, setSearch] = useState('');

    useEffect(() => {
        dispatch(fetchAdminRoutes({}));
    }, [dispatch]);

    useEffect(() => {
        if (companiesStatus === 'idle') dispatch(fetchAdminCompanies({ limit: 200 }));
    }, [dispatch, companiesStatus]);

    const filteredRoutes = useMemo(() => {
        if (selectedCompanyId === '') return [];
        const q = search.trim().toLowerCase();
        return routes.filter((route) => {
            if (routeCompanyId(route) !== selectedCompanyId) return false;
            if (!q) return true;
            const driver = route.users?.full_name ?? '';
            const vehicle = `${route.vehicles?.model ?? ''} ${route.vehicles?.plate_number ?? ''}`;
            return [route.name, driver, vehicle].join(' ').toLowerCase().includes(q);
        });
    }, [routes, selectedCompanyId, search]);

    const companyRouteCount = useMemo(() => {
        if (selectedCompanyId === '') return 0;
        return routes.filter((r) => routeCompanyId(r) === selectedCompanyId).length;
    }, [routes, selectedCompanyId]);

    return (
        <div className="space-y-5">
            <RouteCommandBar
                title="Shuttle routes"
                subtitle={
                    selectedCompanyId !== ''
                        ? `${companyRouteCount} ${companyRouteCount === 1 ? 'route' : 'routes'} for this company`
                        : 'Pick a company, then open a route to set stops, people, and usual crew.'
                }
                filters={
                    <>
                        <select
                            className={cx(adminSelect, 'min-w-[220px] max-w-[280px]')}
                            value={selectedCompanyId}
                            onChange={(e) => setSelectedCompanyId(e.target.value ? Number(e.target.value) : '')}
                            aria-label="Company"
                        >
                            <option value="">Select a company</option>
                            {companies.map((c) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                        {selectedCompanyId !== '' && (
                            <label className="relative min-w-[180px] max-w-[240px] flex-1">
                                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
                                <input
                                    className={cx(adminInput, 'pl-9')}
                                    placeholder="Search route, driver, plate"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    aria-label="Search routes"
                                />
                            </label>
                        )}
                    </>
                }
                actions={
                    <>
                        {canOpsShuttle && (
                            <Link href="/admin/routes/daily-overrides" className={cx(adminBtnOutline, 'h-9 px-3 text-xs')}>
                                <ArrowLeftRight className="mr-1.5 h-3.5 w-3.5" />
                                Daily plan
                            </Link>
                        )}
                        {canOpsShuttle && (
                            <Link href="/admin/routes/shuttle-trips" className={cx(adminBtnOutline, 'h-9 px-3 text-xs')}>
                                <Bus className="mr-1.5 h-3.5 w-3.5" />
                                Trip scheduling
                            </Link>
                        )}
                        {canCreate ? (
                            <Link href="/admin/routes/create" className={adminBtnPrimary}>
                                <Plus className="mr-2 h-4 w-4" />
                                Create route
                            </Link>
                        ) : (
                            <button type="button" disabled className={adminBtnPrimary}>
                                <Plus className="mr-2 h-4 w-4" />
                                Create route
                            </button>
                        )}
                    </>
                }
            />

            {status === 'loading' && (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {[0, 1, 2].map((i) => (
                        <div key={i} className="h-44 animate-pulse rounded-2xl bg-[var(--bg-subtle)]" />
                    ))}
                </div>
            )}

            {status === 'failed' && (
                <RouteEmptyState title="Couldn’t load routes" description="Refresh the page and try again." />
            )}

            {status === 'succeeded' && selectedCompanyId === '' && (
                <RouteEmptyState
                    title="Pick a company to start"
                    description="Choose who you are setting up routes for."
                    action={
                        <select
                            className={cx(adminSelect, 'min-w-[240px]')}
                            value={selectedCompanyId}
                            onChange={(e) => setSelectedCompanyId(e.target.value ? Number(e.target.value) : '')}
                        >
                            <option value="">Select a company</option>
                            {companies.map((c) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    }
                />
            )}

            {status === 'succeeded' && selectedCompanyId !== '' && filteredRoutes.length === 0 && (
                <RouteEmptyState
                    title={search ? 'No routes match that search' : 'No routes for this company yet'}
                    description={search ? 'Try a different name, driver, or plate.' : 'Create a route, then assign usual driver, vehicle, stops, and people.'}
                    action={
                        canCreate && !search ? (
                            <Link href="/admin/routes/create" className={adminBtnPrimary}>Create route</Link>
                        ) : null
                    }
                />
            )}

            {status === 'succeeded' && selectedCompanyId !== '' && filteredRoutes.length > 0 && (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {filteredRoutes.map((route) => (
                        <RouteTile key={route.id} route={route} />
                    ))}
                </div>
            )}
        </div>
    );
}

function RouteTile({ route }: { route: Route }) {
    const driver = route.users?.full_name;
    const vehicle = route.vehicles?.plate_number
        ? [route.vehicles.model, route.vehicles.plate_number].filter(Boolean).join(' · ')
        : null;
    const missingCrew = !driver || !vehicle;
    const stopCount = route.route_stops?.length || 0;
    const vendor = route.company_vendor_link_id
        ? (route.company_vendor_links?.external_vendors?.name ?? 'External vendor')
        : 'CORT';

    return (
        <Link
            href={`/admin/routes/${route.id}`}
            className="block overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] shadow-[var(--shadow-card)] transition hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5"
        >
            <div className="flex">
                <div className={cx('w-1.5 shrink-0', missingCrew ? 'bg-[var(--cort-orange)]' : 'bg-[var(--cort-navy)]')} />
                <div className="flex-1 space-y-3 p-4">
                    <div className="flex items-start justify-between gap-2">
                        <h2 className="font-semibold text-[var(--text-primary)]">{route.name}</h2>
                        <Badge color={route.status === 'ACTIVE' ? 'green' : 'gray'}>
                            {route.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                        </Badge>
                    </div>

                    <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--cort-navy)] text-[11px] font-bold text-white">
                            {initials(driver)}
                        </span>
                        <div className="min-w-0">
                            <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Usual driver</div>
                            <div className="truncate text-sm text-[var(--text-primary)]">
                                {driver ?? 'Not set'}
                            </div>
                        </div>
                    </div>

                    <div>
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Usual vehicle</div>
                        <div className="mt-0.5 flex items-center gap-2 text-sm text-[var(--text-primary)]">
                            <Car className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
                            <span className="truncate">{vehicle ?? 'Not set'}</span>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
                        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--bg-subtle)] px-2 py-1">
                            <MapPin className="h-3 w-3" /> {stopCount} {stopCount === 1 ? 'stop' : 'stops'}
                        </span>
                        <Badge color={route.company_vendor_link_id ? 'purple' : 'blue'}>{vendor}</Badge>
                    </div>

                    {missingCrew && (
                        <p className="rounded-lg bg-[color-mix(in_srgb,var(--cort-orange)_12%,transparent)] px-2.5 py-1.5 text-xs text-[var(--cort-orange)]">
                            {!driver && !vehicle
                                ? 'Set a usual driver and vehicle — needed for trips'
                                : !driver
                                    ? 'Set a usual driver — needed for trips'
                                    : 'Set a usual vehicle — needed for trips'}
                        </p>
                    )}
                </div>
            </div>
        </Link>
    );
}
