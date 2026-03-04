'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Card } from '@/app/admin/ui/Card';
import { Button } from '@/app/admin/ui/Button';
import { Plus, MapPin, Truck, User } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/app/lib/store/hooks';
import { fetchAdminRoutes, selectAdminRoutes, selectAdminRoutesStatus } from '@/app/lib/store/slices/adminRoutesSlice';

export default function RoutesPage() {
    const dispatch = useAppDispatch();
    const routes = useAppSelector(selectAdminRoutes);
    const status = useAppSelector(selectAdminRoutesStatus);

    useEffect(() => {
        if (status === 'idle') {
            dispatch(fetchAdminRoutes({}));
        }
    }, [dispatch, status]);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Route Management</h1>
                    <p className="text-sm text-gray-500">Manage shuttle routes and stops</p>
                </div>
                <Link href="/admin/routes/create">
                    <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Create New Route
                    </Button>
                </Link>
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
                        <Link href="/admin/routes/create" className="mt-4">
                            <Button variant="outline">Create Route</Button>
                        </Link>
                    </div>
                </Card>
            )}

            {status === 'succeeded' && routes.length > 0 && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {routes.map((route) => (
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
                                {route.company && (
                                    <div className="flex items-center gap-2">
                                        <User className="w-4 h-4" />
                                        <span>{route.company.name}</span>
                                    </div>
                                )}
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
        </div>
    );
}
