'use client';

import { useState } from 'react';
import { Button } from '@/app/admin/ui/Button';
import { Card } from '@/app/admin/ui/Card';
import { Input } from '@/app/admin/ui/Input';
import { Label } from '@/app/admin/ui/Label';
import { useAppDispatch } from '@/app/lib/store/hooks';
import {
    createRouteStop,
    updateRouteStop,
    deleteRouteStop,
    Route
} from '@/app/lib/store/slices/adminRoutesSlice';
import { Trash, Edit, Plus, Save, X } from 'lucide-react';
import { toast } from 'sonner';

interface ManageStopsTabProps {
    route: Route;
}

export default function ManageStopsTab({ route }: ManageStopsTabProps) {
    const dispatch = useAppDispatch();
    const [editingStopId, setEditingStopId] = useState<number | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        lat: '',
        lng: '',
        morning_eta: '',
        evening_eta: '',
        sequence_order: ''
    });

    const resetForm = () => {
        setFormData({
            name: '',
            lat: '',
            lng: '',
            morning_eta: '',
            evening_eta: '',
            sequence_order: ''
        });
        setEditingStopId(null);
        setIsAdding(false);
    };

    const handleEditClick = (stop: any) => {
        setFormData({
            name: stop.name,
            lat: stop.lat?.toString() || '',
            lng: stop.lng?.toString() || '',
            morning_eta: stop.morning_eta || '',
            evening_eta: stop.evening_eta || '',
            sequence_order: stop.sequence_order?.toString() || ''
        });
        setEditingStopId(stop.id);
        setIsAdding(false);
    };

    const handleAddClick = () => {
        resetForm();
        // Auto-increment sequence order
        const maxOrder = route.route_stops?.reduce((max, s) => Math.max(max, s.sequence_order), 0) || 0;
        setFormData(prev => ({ ...prev, sequence_order: (maxOrder + 1).toString() }));
        setIsAdding(true);
    };

    const handleSubmit = async () => {
        if (!formData.name || !formData.lat || !formData.lng || !formData.sequence_order) {
            toast.error('Name, Latitude, Longitude, and Sequence Order are required');
            return;
        }

        const data = {
            name: formData.name,
            lat: parseFloat(formData.lat),
            lng: parseFloat(formData.lng),
            morning_eta: formData.morning_eta || null,
            evening_eta: formData.evening_eta || null,
            sequence_order: parseInt(formData.sequence_order),
            stop_name: formData.name // Backend might expect this alias
        };

        try {
            if (isAdding) {
                await dispatch(createRouteStop({ routeId: route.id, data })).unwrap();
                toast.success('Stop added successfully');
            } else if (editingStopId) {
                await dispatch(updateRouteStop({ stopId: editingStopId, data })).unwrap();
                toast.success('Stop updated successfully');
            }
            resetForm();
        } catch (error) {
            toast.error('Failed to save stop');
        }
    };

    const handleDelete = async (id: number) => {
        if (confirm('Are you sure you want to delete this stop?')) {
            try {
                await dispatch(deleteRouteStop(id)).unwrap();
                toast.success('Stop deleted successfully');
            } catch (error) {
                toast.error('Failed to delete stop');
            }
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Route Stops ({route.route_stops?.length || 0})</h3>
                {!isAdding && !editingStopId && (
                    <Button onClick={handleAddClick}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Stop
                    </Button>
                )}
            </div>

            {(isAdding || editingStopId) && (
                <Card className="p-4 bg-gray-50 border-blue-100">
                    <h4 className="font-medium mb-3">{isAdding ? 'New Stop' : 'Edit Stop'}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="col-span-1 md:col-span-2">
                            <Label>Stop Name <span className="text-red-500">*</span></Label>
                            <Input
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g. Central Station"
                            />
                        </div>
                        <div>
                            <Label>Sequence Order <span className="text-red-500">*</span></Label>
                            <Input
                                type="number"
                                value={formData.sequence_order}
                                onChange={e => setFormData({ ...formData, sequence_order: e.target.value })}
                            />
                        </div>
                        <div>
                            <Label>Latitude <span className="text-red-500">*</span></Label>
                            <Input
                                type="number" step="any"
                                value={formData.lat}
                                onChange={e => setFormData({ ...formData, lat: e.target.value })}
                            />
                        </div>
                        <div>
                            <Label>Longitude <span className="text-red-500">*</span></Label>
                            <Input
                                type="number" step="any"
                                value={formData.lng}
                                onChange={e => setFormData({ ...formData, lng: e.target.value })}
                            />
                        </div>
                        <div>
                            <Label>Morning ETA</Label>
                            <Input
                                type="time"
                                value={formData.morning_eta}
                                onChange={e => setFormData({ ...formData, morning_eta: e.target.value })}
                            />
                        </div>
                        <div>
                            <Label>Evening ETA</Label>
                            <Input
                                type="time"
                                value={formData.evening_eta}
                                onChange={e => setFormData({ ...formData, evening_eta: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-4">
                        <Button variant="outline" onClick={resetForm}>Cancel</Button>
                        <Button onClick={handleSubmit}>
                            <Save className="w-4 h-4 mr-2" />
                            Save Stop
                        </Button>
                    </div>
                </Card>
            )}

            <div className="space-y-2">
                {route.route_stops?.map((stop) => (
                    <div key={stop.id} className="flex items-center justify-between p-3 bg-white border rounded hover:bg-gray-50">
                        <div className="flex items-center gap-3">
                            <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-blue-100 text-blue-700 rounded-full font-bold text-sm">
                                {stop.sequence_order}
                            </div>
                            <div>
                                <div className="font-medium">{stop.name}</div>
                                <div className="text-xs text-gray-500">
                                    {stop.lat.toFixed(5)}, {stop.lng.toFixed(5)} • AM: {stop.morning_eta || '-'} • PM: {stop.evening_eta || '-'}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => handleEditClick(stop)}
                                className="p-1 text-gray-500 hover:text-blue-600 rounded"
                            >
                                <Edit className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => handleDelete(stop.id)}
                                className="p-1 text-gray-500 hover:text-red-600 rounded"
                            >
                                <Trash className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
