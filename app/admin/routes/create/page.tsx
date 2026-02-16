'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { Card } from '@/app/admin/ui/Card';
import { Button } from '@/app/admin/ui/Button';
import { Input } from '@/app/admin/ui/Input';
import { Label } from '@/app/admin/ui/Label';
import { toast } from 'sonner';
import { useAppDispatch, useAppSelector } from '@/app/lib/store/hooks';
import { fetchAdminCompanies, selectAdminCompanies, selectAdminCompaniesStatus } from '@/app/lib/store/slices/adminCompaniesSlice';
import { createAdminRoute, selectAdminRoutesActionStatus } from '@/app/lib/store/slices/adminRoutesSlice';
import { fetchAdminDrivers, selectAdminDrivers } from '@/app/lib/store/slices/adminDriversSlice';
import { fetchAdminVehicles, selectAdminVehicles } from '@/app/lib/store/slices/adminVehiclesSlice';

// Import Map dynamically to avoid SSR issues with Leaflet
const Map = dynamic(() => import('@/app/admin/ui/Map'), { ssr: false });

interface Stop {
    id: string; // Temp ID
    name: string;
    lat: number;
    lng: number;
    morningEta: string;
    eveningEta: string;
}

export default function CreateRoutePage() {
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
    const [stops, setStops] = useState<Stop[]>([]);

    useEffect(() => {
        if (companiesStatus === 'idle') {
            dispatch(fetchAdminCompanies({ limit: 100 }));
        }
        // Fetch drivers and vehicles
        dispatch(fetchAdminDrivers({ limit: 100 }));
        dispatch(fetchAdminVehicles({ limit: 100 }));
    }, [dispatch, companiesStatus]);

    const handleMapClick = (lat: number, lng: number) => {
        const newStop: Stop = {
            id: crypto.randomUUID(),
            name: `Stop ${stops.length + 1}`,
            lat,
            lng,
            morningEta: '08:00',
            eveningEta: '18:00',
        };
        setStops([...stops, newStop]);
    };

    const handleRemoveStop = (id: string) => {
        setStops(stops.filter((s) => s.id !== id));
    };

    const handleStopChange = (id: string, field: keyof Stop, value: string) => {
        setStops(
            stops.map((s) => (s.id === id ? { ...s, [field]: value } : s))
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !companyId) {
            toast.error('Please fill in required fields');
            return;
        }
        if (stops.length < 2) {
            toast.error('A route must have at least 2 stops');
            return;
        }

        const routeData = {
            name,
            company_id: Number(companyId),
            assigned_vehicle_id: assignedVehicleId ? Number(assignedVehicleId) : undefined,
            assigned_driver_id: assignedDriverId || undefined,
            stops: stops.map((stop, index) => ({
                name: stop.name,
                lat: stop.lat,
                lng: stop.lng,
                morning_eta: stop.morningEta,
                evening_eta: stop.eveningEta,
                sequence_order: index + 1,
            })),
        };

        try {
            await dispatch(createAdminRoute(routeData)).unwrap();
            toast.success('Route created successfully!');
            router.push('/admin/routes');
        } catch (error: any) {
            console.error('Failed to create route:', error);
            toast.error(error || 'Failed to create route');
        }
    };

    return (
        <div className="space-y-6 h-[calc(100vh-100px)] flex flex-col">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Create New Route</h1>
                <div className="space-x-2">
                    <Button variant="outline" onClick={() => router.back()}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={routeActionStatus === 'loading'}>
                        {routeActionStatus === 'loading' ? 'Saving...' : 'Save Route'}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
                {/* Left Panel: Form & Stops List */}
                <Card className="p-4 flex flex-col h-full overflow-hidden">
                    <div className="space-y-4 mb-4">
                        <div>
                            <Label htmlFor="name">Route Name</Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g., Route 1 - Gulshan to DHA"
                            />
                        </div>
                        <div>
                            <Label htmlFor="company">Company</Label>
                            <select
                                id="company"
                                className="w-full border rounded p-2"
                                value={companyId}
                                onChange={(e) => setCompanyId(e.target.value)}
                                disabled={companiesStatus === 'loading'}
                            >
                                <option value="">Select Company</option>
                                {companies.map((company) => (
                                    <option key={company.id} value={company.id}>
                                        {company.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <Label htmlFor="vehicle">Assign Vehicle (Optional)</Label>
                            <select
                                id="vehicle"
                                className="w-full border rounded p-2"
                                value={assignedVehicleId}
                                onChange={(e) => setAssignedVehicleId(e.target.value)}
                            >
                                <option value="">Select Vehicle</option>
                                {vehicles.map((vehicle) => (
                                    <option key={vehicle.id} value={vehicle.id}>
                                        {vehicle.plate_number} {vehicle.model ? `- ${vehicle.model}` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <Label htmlFor="driver">Assign Driver (Optional)</Label>
                            <select
                                id="driver"
                                className="w-full border rounded p-2"
                                value={assignedDriverId}
                                onChange={(e) => setAssignedDriverId(e.target.value)}
                            >
                                <option value="">Select Driver</option>
                                {drivers.map((driver) => (
                                    <option key={driver.id} value={driver.id}>
                                        {driver.full_name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-2">
                        <h3 className="font-semibold mb-2">Stops ({stops.length})</h3>
                        <div className="space-y-3">
                            {stops.map((stop, index) => (
                                <div key={stop.id} className="border p-3 rounded-md bg-gray-50 relative group">
                                    <button
                                        onClick={() => handleRemoveStop(stop.id)}
                                        className="absolute top-2 right-2 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity text-sm"
                                    >
                                        Remove
                                    </button>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
                                            {index + 1}
                                        </span>
                                        <Input
                                            value={stop.name}
                                            onChange={(e) => handleStopChange(stop.id, 'name', e.target.value)}
                                            className="h-8 text-sm"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div>
                                            <label className="block text-gray-500">Pick (AM)</label>
                                            <input
                                                type="time"
                                                value={stop.morningEta}
                                                onChange={(e) => handleStopChange(stop.id, 'morningEta', e.target.value)}
                                                className="border rounded px-1 w-full"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-gray-500">Drop (PM)</label>
                                            <input
                                                type="time"
                                                value={stop.eveningEta}
                                                onChange={(e) => handleStopChange(stop.id, 'eveningEta', e.target.value)}
                                                className="border rounded px-1 w-full"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {stops.length === 0 && (
                                <p className="text-sm text-gray-500 italic text-center py-4">
                                    Click on the map to add stops.
                                </p>
                            )}
                        </div>
                    </div>
                </Card>

                {/* Right Panel: Map */}
                <Card className="lg:col-span-2 overflow-hidden h-full">
                    <Map
                        height="100%"
                        onMapClick={handleMapClick}
                        markers={stops.map(s => ({
                            id: s.id,
                            position: [s.lat, s.lng],
                            label: s.name
                        }))}
                        polylines={stops.length > 1 ? [{
                            positions: stops.map(s => [s.lat, s.lng]),
                            color: '#2563eb'
                        }] : []}
                    />
                </Card>
            </div >
        </div >
    );
}
