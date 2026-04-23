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
    Route,
    RouteStop,
} from '@/app/lib/store/slices/adminRoutesSlice';
import { Trash, Edit, Plus, Save, X, Sunrise, Sunset, ArrowLeftRight } from 'lucide-react';
import { toast } from 'sonner';

type StopDirection = 'MORNING' | 'EVENING' | 'BOTH';

interface ManageStopsTabProps {
    route: Route;
}

const DIRECTION_OPTIONS: { value: StopDirection; label: string }[] = [
    { value: 'BOTH', label: 'Both directions' },
    { value: 'MORNING', label: 'Morning only' },
    { value: 'EVENING', label: 'Evening only' },
];

function formatTime(timeStr: string | null | undefined): string {
    if (!timeStr) return '';
    if (/^\d{2}:\d{2}$/.test(timeStr)) return timeStr;
    try {
        const date = new Date(timeStr.includes('T') ? timeStr : `1970-01-01T${timeStr}Z`);
        if (isNaN(date.getTime())) return timeStr;
        return date.toISOString().substring(11, 16);
    } catch {
        return timeStr;
    }
}

function deriveDirection(stop: RouteStop): StopDirection {
    if (stop.morning_sequence != null && stop.evening_sequence != null) return 'BOTH';
    if (stop.morning_sequence != null) return 'MORNING';
    if (stop.evening_sequence != null) return 'EVENING';
    return 'BOTH';
}

function DirectionBadge({ direction }: { direction: StopDirection }) {
    if (direction === 'MORNING') {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">
                <Sunrise className="w-3 h-3" /> Morning
            </span>
        );
    }
    if (direction === 'EVENING') {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700 border border-indigo-200">
                <Sunset className="w-3 h-3" /> Evening
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
            <ArrowLeftRight className="w-3 h-3" /> Both
        </span>
    );
}

// Sequence input with a small label above it
function SequenceInput({
    label,
    value,
    onChange,
    icon,
    colorClass,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    icon: React.ReactNode;
    colorClass: string;
}) {
    return (
        <div className="flex flex-col gap-1">
            <span className={`inline-flex items-center gap-1 text-xs font-semibold ${colorClass}`}>
                {icon} {label} position
            </span>
            <input
                type="number"
                min={1}
                value={value}
                onChange={e => onChange(e.target.value)}
                className="w-20 px-2 py-1.5 border border-gray-300 rounded-md text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="#"
            />
        </div>
    );
}

export default function ManageStopsTab({ route }: ManageStopsTabProps) {
    const dispatch = useAppDispatch();
    const [isSaving, setIsSaving] = useState(false);
    const [editingStopId, setEditingStopId] = useState<number | null>(null);
    const [isAdding, setIsAdding] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        lat: '',
        lng: '',
        morning_eta: '',
        evening_eta: '',
        direction: 'BOTH' as StopDirection,
        morning_sequence: '',
        evening_sequence: '',
    });

    const resetForm = () => {
        setFormData({
            name: '',
            lat: '',
            lng: '',
            morning_eta: '',
            evening_eta: '',
            direction: 'BOTH',
            morning_sequence: '',
            evening_sequence: '',
        });
        setEditingStopId(null);
        setIsAdding(false);
    };

    const handleEditClick = (stop: RouteStop) => {
        const dir = deriveDirection(stop);
        setFormData({
            name: stop.name,
            lat: stop.lat?.toString() || '',
            lng: stop.lng?.toString() || '',
            morning_eta: stop.morning_eta ? formatTime(stop.morning_eta) : '',
            evening_eta: stop.evening_eta ? formatTime(stop.evening_eta) : '',
            direction: dir,
            morning_sequence: stop.morning_sequence?.toString() ?? '',
            evening_sequence: stop.evening_sequence?.toString() ?? '',
        });
        setEditingStopId(stop.id);
        setIsAdding(false);
    };

    const handleAddClick = () => {
        // Pre-fill sequences as next available
        const nextMorning = Math.max(0, ...(route.route_stops ?? []).map(s => s.morning_sequence ?? 0)) + 1;
        const nextEvening = Math.max(0, ...(route.route_stops ?? []).map(s => s.evening_sequence ?? 0)) + 1;
        resetForm();
        setFormData(f => ({
            ...f,
            morning_sequence: nextMorning.toString(),
            evening_sequence: nextEvening.toString(),
        }));
        setIsAdding(true);
    };

    // When direction changes in the form, clear sequences that no longer apply
    const handleDirectionChange = (dir: StopDirection) => {
        setFormData(f => ({
            ...f,
            direction: dir,
            morning_sequence: dir === 'EVENING' ? '' : f.morning_sequence,
            evening_sequence: dir === 'MORNING' ? '' : f.evening_sequence,
        }));
    };

    const handleSubmit = async () => {
        if (!formData.name || !formData.lat || !formData.lng) {
            toast.error('Name, Latitude, and Longitude are required');
            return;
        }

        const data: any = {
            name: formData.name,
            lat: parseFloat(formData.lat),
            lng: parseFloat(formData.lng),
            morning_eta: formData.morning_eta || null,
            evening_eta: formData.evening_eta || null,
            direction: formData.direction,
            sequence_order: 0,
        };

        // Pass explicit sequences if provided — backend will use these
        // instead of auto-appending
        if (formData.morning_sequence !== '' && formData.direction !== 'EVENING') {
            data.morning_sequence = parseInt(formData.morning_sequence, 10);
        }
        if (formData.evening_sequence !== '' && formData.direction !== 'MORNING') {
            data.evening_sequence = parseInt(formData.evening_sequence, 10);
        }

        try {
            setIsSaving(true);
            if (isAdding) {
                await dispatch(createRouteStop({ routeId: route.id, data })).unwrap();
                toast.success('Stop added successfully');
            } else if (editingStopId) {
                await dispatch(updateRouteStop({ stopId: editingStopId, data })).unwrap();
                toast.success('Stop updated successfully');
            }
            resetForm();
        } catch {
            toast.error('Failed to save stop');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (confirm('Are you sure you want to delete this stop?')) {
            try {
                await dispatch(deleteRouteStop(id)).unwrap();
                toast.success('Stop deleted successfully');
            } catch {
                toast.error('Failed to delete stop');
            }
        }
    };

    const morningStops = (route.route_stops ?? [])
        .filter(s => s.morning_sequence != null)
        .sort((a, b) => (a.morning_sequence ?? 0) - (b.morning_sequence ?? 0));

    const eveningStops = (route.route_stops ?? [])
        .filter(s => s.evening_sequence != null)
        .sort((a, b) => (a.evening_sequence ?? 0) - (b.evening_sequence ?? 0));

    // Shared form fields used in both add and edit panels
    const renderFormFields = () => (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Name */}
                <div className="col-span-1 md:col-span-2">
                    <Label>Stop Name <span className="text-red-500">*</span></Label>
                    <Input
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g. Central Station"
                    />
                </div>

                {/* Direction */}
                <div>
                    <Label>Direction</Label>
                    <select
                        value={formData.direction}
                        onChange={e => handleDirectionChange(e.target.value as StopDirection)}
                        className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        {DIRECTION_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>

                {/* Lat / Lng */}
                <div>
                    <Label>Latitude <span className="text-red-500">*</span></Label>
                    <Input
                        value={formData.lat}
                        onChange={e => setFormData({ ...formData, lat: e.target.value })}
                        placeholder="3.1390"
                    />
                </div>
                <div>
                    <Label>Longitude <span className="text-red-500">*</span></Label>
                    <Input
                        value={formData.lng}
                        onChange={e => setFormData({ ...formData, lng: e.target.value })}
                        placeholder="101.6869"
                    />
                </div>

                {/* ETAs */}
                {(formData.direction === 'MORNING' || formData.direction === 'BOTH') && (
                    <div>
                        <Label>Morning ETA</Label>
                        <Input
                            type="time"
                            value={formData.morning_eta}
                            onChange={e => setFormData({ ...formData, morning_eta: e.target.value })}
                        />
                    </div>
                )}
                {(formData.direction === 'EVENING' || formData.direction === 'BOTH') && (
                    <div>
                        <Label>Evening ETA</Label>
                        <Input
                            type="time"
                            value={formData.evening_eta}
                            onChange={e => setFormData({ ...formData, evening_eta: e.target.value })}
                        />
                    </div>
                )}
            </div>

            {/* ── Sequence controls ── */}
            <div className="flex flex-wrap items-end gap-6 pt-1 pb-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide w-full -mb-2">
                    Stop position in route
                </span>
                {(formData.direction === 'MORNING' || formData.direction === 'BOTH') && (
                    <SequenceInput
                        label="Morning"
                        value={formData.morning_sequence}
                        onChange={v => setFormData({ ...formData, morning_sequence: v })}
                        icon={<Sunrise className="w-3 h-3" />}
                        colorClass="text-amber-600"
                    />
                )}
                {(formData.direction === 'EVENING' || formData.direction === 'BOTH') && (
                    <SequenceInput
                        label="Evening"
                        value={formData.evening_sequence}
                        onChange={v => setFormData({ ...formData, evening_sequence: v })}
                        icon={<Sunset className="w-3 h-3" />}
                        colorClass="text-indigo-600"
                    />
                )}
                <p className="text-xs text-gray-400 italic self-end pb-0.5">
                    Other stops will shift around this position automatically.
                </p>
            </div>

            <p className="text-xs text-gray-500 italic">
                {formData.direction === 'BOTH' && '↕ This stop will appear in both morning and evening routes.'}
                {formData.direction === 'MORNING' && 'This stop will only appear in the morning route.'}
                {formData.direction === 'EVENING' && 'This stop will only appear in the evening route.'}
            </p>
        </div>
    );

    return (
        <div className="space-y-6">
            {/* ── Header ── */}
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">
                    Route Stops ({route.route_stops?.length || 0})
                </h3>
                {!isAdding && !editingStopId && (
                    <Button onClick={handleAddClick}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Stop
                    </Button>
                )}
            </div>

            {/* ── Add form ── */}
            {isAdding && (
                <Card className="p-4 bg-gray-50 border-blue-100">
                    <h4 className="font-medium mb-3 text-blue-800 flex items-center gap-2">
                        <Plus className="w-4 h-4" /> New Stop
                    </h4>
                    {renderFormFields()}
                    <div className="flex justify-end gap-2 mt-4">
                        <Button variant="outline" onClick={resetForm}>
                            <X className="w-4 h-4 mr-1" /> Cancel
                        </Button>
                        <Button onClick={handleSubmit} disabled={isSaving}>
                            {isSaving ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Saving...
                                </div>
                            ) : (
                                <><Save className="w-4 h-4 mr-2" /> Save Stop</>
                            )}
                        </Button>
                    </div>
                </Card>
            )}

            {/* ── Stop list ── */}
            <div className="space-y-2">
                {route.route_stops?.map((stop) => {
                    const dir = deriveDirection(stop);
                    const isEditingThisStop = editingStopId === stop.id;

                    if (isEditingThisStop) {
                        return (
                            <Card key={stop.id} className="p-4 bg-blue-50 border-blue-200 shadow-md">
                                <h4 className="font-medium mb-3 text-blue-800 flex items-center gap-2">
                                    <Edit className="w-4 h-4" /> Editing: {stop.name}
                                </h4>
                                {renderFormFields()}
                                <div className="flex justify-end gap-2 mt-4">
                                    <Button variant="outline" size="sm" onClick={resetForm}>
                                        <X className="w-4 h-4 mr-1" /> Cancel
                                    </Button>
                                    <Button size="sm" onClick={handleSubmit} disabled={isSaving}>
                                        {isSaving ? (
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                Updating...
                                            </div>
                                        ) : (
                                            <><Save className="w-4 h-4 mr-2" /> Update Stop</>
                                        )}
                                    </Button>
                                </div>
                            </Card>
                        );
                    }

                    return (
                        <div
                            key={stop.id}
                            className="flex items-center justify-between p-3 bg-white border rounded hover:bg-gray-50 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                {/* Sequence bubbles */}
                                <div className="flex items-center gap-1">
                                    {stop.morning_sequence != null && (
                                        <div className="flex items-center gap-0.5 w-8 h-8 justify-center bg-amber-100 text-amber-700 rounded-full font-bold text-sm" title="Morning position">
                                            {stop.morning_sequence}
                                        </div>
                                    )}
                                    {stop.evening_sequence != null && (
                                        <div className="flex items-center gap-0.5 w-8 h-8 justify-center bg-indigo-100 text-indigo-700 rounded-full font-bold text-sm" title="Evening position">
                                            {stop.evening_sequence}
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-medium">{stop.name}</span>
                                        <DirectionBadge direction={dir} />
                                    </div>
                                    <div className="text-xs text-gray-500 mt-0.5">
                                        {stop.lat?.toFixed(5)}, {stop.lng?.toFixed(5)}
                                        {stop.morning_eta && dir !== 'EVENING' && ` • AM: ${formatTime(stop.morning_eta)}`}
                                        {stop.evening_eta && dir !== 'MORNING' && ` • PM: ${formatTime(stop.evening_eta)}`}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleEditClick(stop)}
                                    className="p-1 text-gray-500 hover:text-blue-600 rounded"
                                    title="Edit stop"
                                >
                                    <Edit className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => handleDelete(stop.id)}
                                    className="p-1 text-gray-500 hover:text-red-600 rounded"
                                    title="Delete stop"
                                >
                                    <Trash className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ── Direction preview ── */}
            {(morningStops.length > 0 || eveningStops.length > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div className="border rounded-lg overflow-hidden">
                        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border-b border-amber-100">
                            <Sunrise className="w-4 h-4 text-amber-600" />
                            <span className="text-sm font-semibold text-amber-700">
                                Morning Route ({morningStops.length} stops)
                            </span>
                        </div>
                        <ol className="divide-y">
                            {morningStops.map((s, i) => (
                                <li key={s.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                                    <span className="w-5 h-5 flex items-center justify-center rounded-full bg-amber-100 text-amber-700 text-xs font-bold flex-shrink-0">
                                        {i + 1}
                                    </span>
                                    <span className="text-gray-800">{s.name}</span>
                                    {s.morning_eta && (
                                        <span className="ml-auto text-xs text-gray-400">{formatTime(s.morning_eta)}</span>
                                    )}
                                </li>
                            ))}
                            {morningStops.length === 0 && (
                                <li className="px-3 py-4 text-sm text-gray-400 text-center">No morning stops</li>
                            )}
                        </ol>
                    </div>

                    <div className="border rounded-lg overflow-hidden">
                        <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 border-b border-indigo-100">
                            <Sunset className="w-4 h-4 text-indigo-600" />
                            <span className="text-sm font-semibold text-indigo-700">
                                Evening Route ({eveningStops.length} stops)
                            </span>
                        </div>
                        <ol className="divide-y">
                            {eveningStops.map((s, i) => (
                                <li key={s.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                                    <span className="w-5 h-5 flex items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex-shrink-0">
                                        {i + 1}
                                    </span>
                                    <span className="text-gray-800">{s.name}</span>
                                    {s.evening_eta && (
                                        <span className="ml-auto text-xs text-gray-400">{formatTime(s.evening_eta)}</span>
                                    )}
                                </li>
                            ))}
                            {eveningStops.length === 0 && (
                                <li className="px-3 py-4 text-sm text-gray-400 text-center">No evening stops</li>
                            )}
                        </ol>
                    </div>
                </div>
            )}
        </div>
    );
}