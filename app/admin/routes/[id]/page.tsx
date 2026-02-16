'use client';

import { useEffect, useState, use } from 'react';
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
import { Button } from '@/app/admin/ui/Button';
import { Card } from '@/app/admin/ui/Card';
import { Input } from '@/app/admin/ui/Input';
import { Label } from '@/app/admin/ui/Label';
import RosteringTab from './components/RosteringTab';
import { ChevronLeft, MapPin, Users, Info, Plus, Edit, Trash, Save, X } from 'lucide-react';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';
import { selectAdminDrivers } from '@/app/lib/store/slices/adminDriversSlice';
import { selectAdminVehicles } from '@/app/lib/store/slices/adminVehiclesSlice';

const Map = dynamic(() => import('@/app/admin/ui/Map'), { ssr: false });

export default function RouteDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const dispatch = useAppDispatch();
    const route = useAppSelector(selectCurrentRoute);
    const status = useAppSelector(selectAdminRoutesStatus);
    const [isEditing, setIsEditing] = useState(false);
    const [activeTab, setActiveTab] = useState<'overview' | 'rostering'>('overview');

    // Stop Management State
    const [editingStopId, setEditingStopId] = useState<number | null>(null);
    const [isAddingStop, setIsAddingStop] = useState(false);
    const [stopForm, setStopForm] = useState({
        name: '',
        lat: '',
        lng: '',
        morning_eta: '',
        evening_eta: '',
        sequence_order: ''
    });

    const [editForm, setEditForm] = useState({
        name: '',
        assigned_vehicle_id: '',
        assigned_driver_id: ''
    });

    useEffect(() => {
        if (id) {
            dispatch(fetchAdminRoute(parseInt(id)));
        }
        return () => {
            dispatch(clearCurrentRoute());
        };
    }, [dispatch, id]);

    useEffect(() => {
        if (route) {
            setEditForm({
                name: route.name,
                assigned_vehicle_id: route.assigned_vehicle_id?.toString() || '',
                assigned_driver_id: route.assigned_driver_id?.toString() || ''
            });
        }
    }, [route]);

    // Stop Handlers
    const resetStopForm = () => {
        setStopForm({
            name: '',
            lat: '',
            lng: '',
            morning_eta: '',
            evening_eta: '',
            sequence_order: ''
        });
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
            sequence_order: stop.sequence_order?.toString() || ''
        });
        setEditingStopId(stop.id);
        setIsAddingStop(false);
    };

    const handleStopAddClick = () => {
        resetStopForm();
        const maxOrder = route?.route_stops?.reduce((max, s) => Math.max(max, s.sequence_order), 0) || 0;
        setStopForm(prev => ({ ...prev, sequence_order: (maxOrder + 1).toString() }));
        setIsAddingStop(true);
    };

    const handleStopSubmit = async () => {
        if (!route) return;
        if (!stopForm.name || !stopForm.lat || !stopForm.lng || !stopForm.sequence_order) {
            toast.error('Name, Latitude, Longitude, and Sequence Order are required');
            return;
        }

        const data = {
            name: stopForm.name,
            lat: parseFloat(stopForm.lat),
            lng: parseFloat(stopForm.lng),
            morning_eta: stopForm.morning_eta || null,
            evening_eta: stopForm.evening_eta || null,
            sequence_order: parseInt(stopForm.sequence_order)
        };

        try {
            if (isAddingStop) {
                await dispatch(createRouteStop({ routeId: route.id, data })).unwrap();
                toast.success('Stop added successfully');
            } else if (editingStopId) {
                await dispatch(updateRouteStop({ stopId: editingStopId, data })).unwrap();
                toast.success('Stop updated successfully');
            }
            resetStopForm();
        } catch (error) {
            toast.error('Failed to save stop');
        }
    };

    const handleStopDelete = async (id: number) => {
        if (confirm('Are you sure you want to delete this stop?')) {
            try {
                await dispatch(deleteRouteStop(id)).unwrap();
                toast.success('Stop deleted successfully');
                if (editingStopId === id) resetStopForm();
            } catch (error) {
                toast.error('Failed to delete stop');
            }
        }
    };

    const handleMarkerClick = (markerId: string) => {
        const stopId = parseInt(markerId);
        const stop = route?.route_stops?.find(s => s.id === stopId);
        if (stop) {
            handleStopEditClick(stop);
        }
    };

    const handleMapClick = (lat: number, lng: number) => {
        if (isAddingStop || editingStopId) {
            setStopForm(prev => ({
                ...prev,
                lat: lat.toFixed(6),
                lng: lng.toFixed(6)
            }));
            toast.info('Coordinates updated');
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
                    assigned_driver_id: editForm.assigned_driver_id ? editForm.assigned_driver_id : undefined
                }
            })).unwrap();
            setIsEditing(false);
            toast.success('Route details updated');
        } catch (error) {
            toast.error('Failed to update route');
        }
    };

    if (status === 'loading') {
        return <div className="p-8 text-center">Loading route details...</div>;
    }

    if (!route) {
        return <div className="p-8 text-center">Route not found</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4 mb-6">
                <Button variant="ghost" size="sm" onClick={() => router.back()}>
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Back
                </Button>
                <div className="flex-1">
                    {isEditing ? (
                        <div className="flex items-center gap-2">
                            <Input
                                value={editForm.name}
                                onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                className="max-w-md font-bold text-xl h-10"
                            />
                        </div>
                    ) : (
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            {route.name}
                            <button onClick={() => setIsEditing(true)} className="text-gray-400 hover:text-blue-600">
                                <Edit className="w-4 h-4" />
                            </button>
                        </h1>
                    )}
                    <div className="text-gray-500 text-sm mt-1">
                        Route ID: {route.id} • {route.route_stops?.length || 0} Stops
                    </div>
                </div>
                {isEditing && (
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                        <Button onClick={handleSaveDetails}>Save Changes</Button>
                    </div>
                )}
            </div>

            <div className="flex border-b">
                <button
                    className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${activeTab === 'overview'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    onClick={() => setActiveTab('overview')}
                >
                    <div className="flex items-center gap-2">
                        <Info className="w-4 h-4" />
                        Overview
                    </div>
                </button>
                <button
                    className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${activeTab === 'rostering'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    onClick={() => setActiveTab('rostering')}
                >
                    <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Rostering
                    </div>
                </button>
            </div>

            {activeTab === 'overview' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card className="col-span-2 overflow-hidden h-96">
                        <Map
                            height="100%"
                            markers={(() => {
                                const baseMarkers = route.route_stops?.map(s => {
                                    // If editing this stop, show at new location from form
                                    if (editingStopId === s.id && stopForm.lat && stopForm.lng) {
                                        return {
                                            id: s.id.toString(),
                                            position: [parseFloat(stopForm.lat), parseFloat(stopForm.lng)] as [number, number],
                                            label: stopForm.name || s.name,
                                            color: '#ef4444'
                                        };
                                    }
                                    return {
                                        id: s.id.toString(),
                                        position: [s.lat, s.lng] as [number, number],
                                        label: s.name,
                                        color: undefined
                                    };
                                }) || [];

                                // If adding new stop, show it
                                if (isAddingStop && stopForm.lat && stopForm.lng) {
                                    baseMarkers.push({
                                        id: 'new-temp',
                                        position: [parseFloat(stopForm.lat), parseFloat(stopForm.lng)],
                                        label: stopForm.name || 'New Stop',
                                        color: '#22c55e'
                                    });
                                }
                                return baseMarkers.filter(m =>
                                    m.position &&
                                    m.position.length === 2 &&
                                    !isNaN(m.position[0]) &&
                                    !isNaN(m.position[1]) &&
                                    m.position[0] !== undefined &&
                                    m.position[1] !== undefined
                                );
                            })()}
                            polylines={(() => {
                                let stopsForPolyline = route.route_stops ? [...route.route_stops] : [];

                                // If editing, update value in place
                                if (editingStopId && stopForm.lat && stopForm.lng) {
                                    stopsForPolyline = stopsForPolyline.map(s => {
                                        if (s.id === editingStopId) {
                                            return { ...s, lat: parseFloat(stopForm.lat), lng: parseFloat(stopForm.lng) };
                                        }
                                        return s;
                                    });
                                }

                                // If adding, determine where to insert or append
                                if (isAddingStop && stopForm.lat && stopForm.lng) {
                                    const newSeq = parseInt(stopForm.sequence_order) || 999;
                                    const newStop = {
                                        id: -1, // temp id
                                        lat: parseFloat(stopForm.lat),
                                        lng: parseFloat(stopForm.lng),
                                        sequence_order: newSeq,
                                        name: stopForm.name || 'New Stop',
                                        route_id: route.id,
                                        created_at: new Date().toISOString(),
                                        updated_at: new Date().toISOString()
                                    };
                                    stopsForPolyline.push(newStop);
                                }

                                // Sort by sequence order to ensure correct line drawing
                                stopsForPolyline.sort((a, b) => a.sequence_order - b.sequence_order);

                                const validStops = stopsForPolyline.filter(s =>
                                    s.lat !== undefined && s.lat !== null && !isNaN(Number(s.lat)) &&
                                    s.lng !== undefined && s.lng !== null && !isNaN(Number(s.lng))
                                );

                                return validStops.length > 1 ? [{
                                    positions: validStops.map(s => [Number(s.lat), Number(s.lng)] as [number, number]),
                                    color: '#2563eb'
                                }] : [];
                            })()}
                            onMarkerClick={handleMarkerClick}
                            onMapClick={handleMapClick}
                        />
                    </Card>
                    <Card className="p-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-semibold flex items-center gap-2">
                                <MapPin className="w-4 h-4" />
                                Stops ({route.route_stops?.length || 0})
                            </h3>
                            {!isAddingStop && !editingStopId && (
                                <Button size="sm" onClick={handleStopAddClick}>
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add
                                </Button>
                            )}
                        </div>

                        {(isAddingStop || editingStopId) ? (
                            <div className="bg-gray-50 p-3 rounded-md mb-4 border border-blue-100">
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="font-medium text-sm text-blue-800">{isAddingStop ? 'New Stop' : 'Edit Stop'}</h4>
                                    <button onClick={resetStopForm}><X className="w-4 h-4 text-gray-500" /></button>
                                </div>
                                <div className="space-y-3">
                                    <div>
                                        <Label className="text-xs">Name</Label>
                                        <Input
                                            className="h-8 text-sm"
                                            value={stopForm.name}
                                            onChange={e => setStopForm({ ...stopForm, name: e.target.value })}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <Label className="text-xs">Lat</Label>
                                            <Input className="h-8 text-sm" type="number" step="any" value={stopForm.lat} onChange={e => setStopForm({ ...stopForm, lat: e.target.value })} />
                                        </div>
                                        <div>
                                            <Label className="text-xs">Lng</Label>
                                            <Input className="h-8 text-sm" type="number" step="any" value={stopForm.lng} onChange={e => setStopForm({ ...stopForm, lng: e.target.value })} />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                        <div>
                                            <Label className="text-xs">Seq</Label>
                                            <Input className="h-8 text-sm" type="number" value={stopForm.sequence_order} onChange={e => setStopForm({ ...stopForm, sequence_order: e.target.value })} />
                                        </div>
                                        <div>
                                            <Label className="text-xs">AM</Label>
                                            <Input className="h-8 text-sm" type="time" value={stopForm.morning_eta} onChange={e => setStopForm({ ...stopForm, morning_eta: e.target.value })} />
                                        </div>
                                        <div>
                                            <Label className="text-xs">PM</Label>
                                            <Input className="h-8 text-sm" type="time" value={stopForm.evening_eta} onChange={e => setStopForm({ ...stopForm, evening_eta: e.target.value })} />
                                        </div>
                                    </div>
                                    <Button size="sm" className="w-full" onClick={handleStopSubmit}>
                                        <Save className="w-3 h-3 mr-2" />
                                        Save Stop
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4 max-h-[500px] overflow-y-auto">
                                {route.route_stops?.map((stop, index) => (
                                    <div key={stop.id} className="relative pl-6 border-l-2 border-gray-200 pb-4 last:pb-0 group">
                                        <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-blue-600 border-2 border-white flex items-center justify-center text-[8px] text-white font-bold">
                                            {stop.sequence_order}
                                        </div>
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="text-sm font-medium hover:text-blue-600 cursor-pointer" onClick={() => handleStopEditClick(stop)}>
                                                    {stop.name}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    AM: {stop.morning_eta || '-'} • PM: {stop.evening_eta || '-'}
                                                </div>
                                            </div>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => handleStopEditClick(stop)} className="p-1 hover:bg-gray-100 rounded text-blue-600"><Edit className="w-3 h-3" /></button>
                                                <button onClick={() => handleStopDelete(stop.id)} className="p-1 hover:bg-gray-100 rounded text-red-600"><Trash className="w-3 h-3" /></button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                </div>
            )}

            {activeTab === 'rostering' && (
                <RosteringTab route={route} />
            )}
        </div>
    );
}
