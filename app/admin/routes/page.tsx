'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Card } from '@/app/admin/ui/Card';
import { Button } from '@/app/admin/ui/Button';
import { Plus, MapPin, Truck, User, ArrowLeft, ChevronRight, Building2 } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/app/lib/store/hooks';
import { fetchAdminRoutes, selectAdminRoutes, selectAdminRoutesStatus } from '@/app/lib/store/slices/adminRoutesSlice';
import { PermissionGate } from '@/app/admin/components/PermissionGate';
import { AdminCan, useAdminAbility } from '@/app/lib/abilities/AdminAbilityProvider';
import { ADMIN_SUBJECTS } from '@/app/lib/abilities/admin-subjects';

export default function RoutesPage() {
    return (
        <PermissionGate permission="routes">
            <AdminCan I="read" a="Routes">
                <RoutesPageContent />
            </AdminCan>
        </PermissionGate>
    );
}

function RoutesPageContent() {
    const dispatch = useAppDispatch();
    const ability = useAdminAbility();
    const canCreate = ability.can('create', ADMIN_SUBJECTS.routes);
    const routes = useAppSelector(selectAdminRoutes);
    const status = useAppSelector(selectAdminRoutesStatus);
    const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);

    useEffect(() => {
        if (status === 'idle') {
            dispatch(fetchAdminRoutes({}));
        }
    }, [dispatch, status]);

    const companiesWithRoutes = useMemo(() => {
        const companyMap = new Map<number, { id: number; name: string; routeCount: number }>();

        routes.forEach(route => {
            const company = route.company ?? route.companies;
            const companyId = company?.id ?? route.company_id;

            if (companyId) {
                const existing = companyMap.get(companyId);
                if (existing) {
                    existing.routeCount++;
                } else {
                    companyMap.set(companyId, {
                        id: companyId,
                        name: company?.name ?? `Company #${companyId}`,
                        routeCount: 1
                    });
                }
            }
        });

        return Array.from(companyMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    }, [routes]);

    const filteredRoutes = useMemo(() => {
        if (selectedCompanyId === null) return [];
        return routes.filter(route => (route.company?.id ?? route.companies?.id ?? route.company_id) === selectedCompanyId);
    }, [routes, selectedCompanyId]);

    const selectedCompany = useMemo(() => {
        if (selectedCompanyId === null) return null;
        return companiesWithRoutes.find(c => c.id === selectedCompanyId);
    }, [companiesWithRoutes, selectedCompanyId]);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        {selectedCompanyId ? `Routes for ${selectedCompany?.name}` : 'Route Management'}
                    </h1>
                    <p className="text-sm text-gray-500">
                        {selectedCompanyId
                            ? `Showing all routes assigned to ${selectedCompany?.name}`
                            : 'Manage shuttle routes and stops by company'
                        }
                    </p>
                </div>
                <div className="flex gap-2">
                    {selectedCompanyId && (
                        <Button variant="outline" onClick={() => setSelectedCompanyId(null)}>
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Companies
                        </Button>
                    )}
                    {canCreate ? (
                        <Link href="/admin/routes/create">
                            <Button>
                                <Plus className="w-4 h-4 mr-2" />
                                Create New Route
                            </Button>
                        </Link>
                    ) : (
                        <Button disabled>
                            <Plus className="w-4 h-4 mr-2" />
                            Create New Route
                        </Button>
                    )}
                </div>
            </div>

            {status === 'loading' && (
                <div className="text-center py-12">
                    <p className="text-gray-500">Loading routes...</p>
                </div>
            )}

            {status === 'failed' && (
                <div className="text-center py-12 text-red-500">
                    <p>Failed to load routes. Please try again.</p>
                </div>
            )}

            {status === 'succeeded' && routes.length === 0 && (
                <Card className="p-12 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                        <MapPin className="w-12 h-12 text-gray-300" />
                        <h3 className="text-lg font-medium text-gray-900">No Routes Found</h3>
                        <p>Get started by creating your first route.</p>
                        {canCreate ? (
                            <Link href="/admin/routes/create" className="mt-4">
                                <Button variant="outline">Create Route</Button>
                            </Link>
                        ) : (
                            <Button variant="outline" className="mt-4" disabled>
                                Create Route
                            </Button>
                        )}
                    </div>
                </Card>
            )}

            {status === 'succeeded' && routes.length > 0 && (
                <>
                    {selectedCompanyId === null ? (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {companiesWithRoutes.map((company) => (
                                <Card
                                    key={company.id}
                                    className="p-6 cursor-pointer hover:shadow-lg transition-all border-l-4 border-l-indigo-500 flex justify-between items-center"
                                    onClick={() => setSelectedCompanyId(company.id)}
                                >
                                    <div>
                                        <h3 className="font-bold text-xl text-gray-900 mb-1">{company.name}</h3>
                                        <div className="flex items-center text-gray-500 text-sm">
                                            <MapPin className="w-4 h-4 mr-1" />
                                            <span>{company.routeCount} {company.routeCount === 1 ? 'Route' : 'Routes'}</span>
                                        </div>
                                    </div>
                                    <ChevronRight className="w-6 h-6 text-gray-300" />
                                </Card>
                            ))}
                            {companiesWithRoutes.length === 0 && (
                                <div className="col-span-full text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed">
                                    <User className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                                    <p className="text-gray-500 font-medium">No companies with assigned routes found.</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
                            {filteredRoutes.map((route) => (
                                <Card key={route.id} className="p-4 hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-semibold text-lg">{route.name}</h3>
                                        <span className={`px-2 py-1 text-xs rounded-full ${route.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                            }`}>
                                            {route.status}
                                        </span>
                                    </div>

                                    <div className="space-y-2 text-sm text-gray-600 mb-4">
                                        <div className="flex items-center gap-2">
                                            <MapPin className="w-4 h-4" />
                                            <span>{route.route_stops?.length || 0} Stops</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Building2 className="w-4 h-4" />
                                            {route.company_vendor_link_id ? (
                                                <span className="px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-700 font-medium">
                                                    {route.company_vendor_links?.external_vendors?.name ?? 'External Vendor'}
                                                </span>
                                            ) : (
                                                <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700 font-medium">CORT</span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Truck className="w-4 h-4" />
                                            <span>
                                                {route.vehicles?.plate_number && route.vehicles?.model
                                                    ? `${route.vehicles.model} (${route.vehicles.plate_number})`
                                                    : 'Unassigned Vehicle'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
                                        <Link href={`/admin/routes/${route.id}`}>
                                            <Button variant="ghost" size="sm">View Details</Button>
                                        </Link>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
