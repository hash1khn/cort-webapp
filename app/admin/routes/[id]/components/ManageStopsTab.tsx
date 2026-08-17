'use client';

import { useState, useCallback, useEffect, useMemo, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import {
    DndContext,
    PointerSensor,
    closestCenter,
    useSensor,
    useSensors,
    type DragEndEvent,
} from '@dnd-kit/core';
import {
    SortableContext,
    arrayMove,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import StopAddressSearch from '@/app/admin/ui/StopAddressSearch';
import { useAppDispatch } from '@/app/lib/store/hooks';
import {
    createRouteStop,
    updateRouteStop,
    deleteRouteStop,
    reorderAdminRouteStops,
    Route,
    RouteStop,
} from '@/app/lib/store/slices/adminRoutesSlice';
import { Plus, Save, X, Sun, Sunset, MapPin, Building2, GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import type { MapMarker } from '@/app/admin/ui/Map';
import { Badge } from '@/app/admin/components/ui/Badge';
import { adminBtnOutline, adminBtnPrimary, adminInput, adminSelect } from '@/app/admin/components/ui/admin-styles';
import { cx } from '@/app/admin/components/ui/cx';
import { format12h } from '../../RouteCommandBar';

const StopMap = dynamic(() => import('@/app/admin/ui/Map'), { ssr: false });

type StopDirection = 'MORNING' | 'EVENING' | 'BOTH';

interface ManageStopsTabProps {
    route: Route;
    onStopMutated?: () => void;
}

const DIRECTION_OPTIONS: { value: StopDirection; label: string }[] = [
    { value: 'BOTH', label: 'Both' },
    { value: 'MORNING', label: 'Morning only' },
    { value: 'EVENING', label: 'Evening only' },
];

function identifyOfficeStopId(
    stops: Array<{ id: number; morning_sequence: number | null }>,
): number | null {
    const withMorning = stops.filter((s) => s.morning_sequence != null);
    if (withMorning.length === 0) return null;
    const maxSeq = Math.max(...withMorning.map((s) => s.morning_sequence!));
    return withMorning.find((s) => s.morning_sequence === maxSeq)?.id ?? null;
}

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

function displayTime(timeStr: string | null | undefined): string {
    return format12h(formatTime(timeStr)) || '—';
}

function deriveDirection(stop: RouteStop): StopDirection {
    if (stop.morning_sequence != null && stop.evening_sequence != null) return 'BOTH';
    if (stop.morning_sequence != null) return 'MORNING';
    if (stop.evening_sequence != null) return 'EVENING';
    return 'BOTH';
}

function directionLabel(direction: StopDirection): string {
    if (direction === 'MORNING') return 'Morning only';
    if (direction === 'EVENING') return 'Evening only';
    return 'Both';
}

function pinOffice(ids: number[], column: 'MORNING' | 'EVENING', officeStopId: number | null): number[] {
    if (!officeStopId || !ids.includes(officeStopId)) return ids;
    const rest = ids.filter((id) => id !== officeStopId);
    return column === 'MORNING' ? [...rest, officeStopId] : [officeStopId, ...rest];
}

function sequenceIds(
    stops: RouteStop[] | undefined,
    key: 'morning_sequence' | 'evening_sequence',
): number[] {
    return (stops ?? [])
        .filter((s) => s[key] != null)
        .sort((a, b) => (a[key] ?? 0) - (b[key] ?? 0))
        .map((s) => s.id);
}

function sameIds(a: number[], b: number[]): boolean {
    return a.length === b.length && a.every((id, i) => id === b[i]);
}

function mergeOrder(prev: number[], server: number[], column: 'MORNING' | 'EVENING', officeStopId: number | null): number[] {
    const allowed = new Set(server);
    const kept = prev.filter((id) => allowed.has(id));
    const missing = server.filter((id) => !kept.includes(id));
    return pinOffice([...kept, ...missing], column, officeStopId);
}

function moveColumnIds(
    ids: number[],
    activeId: number,
    overId: number,
    column: 'MORNING' | 'EVENING',
    officeStopId: number | null,
): number[] {
    const oldIndex = ids.indexOf(activeId);
    const newIndex = ids.indexOf(overId);
    if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return ids;
    return pinOffice(arrayMove(ids, oldIndex, newIndex), column, officeStopId);
}

const SILENT_DND_ANNOUNCEMENTS = {
    onDragStart: () => '',
    onDragOver: () => '',
    onDragEnd: () => '',
    onDragCancel: () => '',
};

function orderStops(stops: RouteStop[], ids: number[] | null): RouteStop[] {
    if (!ids || ids.length === 0) return stops;
    const byId = new Map(stops.map((s) => [s.id, s]));
    const ordered = ids.map((id) => byId.get(id)).filter((s): s is RouteStop => !!s);
    const seen = new Set(ordered.map((s) => s.id));
    for (const s of stops) {
        if (!seen.has(s.id)) ordered.push(s);
    }
    return ordered;
}

function SequenceInput({
    label,
    value,
    onChange,
    icon,
    disabled = false,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    icon: ReactNode;
    disabled?: boolean;
}) {
    return (
        <div className="flex flex-col gap-1">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                {icon} {label} position
            </span>
            <input
                type="number"
                min={1}
                value={value}
                disabled={disabled}
                onChange={(e) => onChange(e.target.value)}
                className={cx(adminInput, 'w-24 text-center')}
                placeholder="#"
            />
        </div>
    );
}

function SortableStopCard({
    stop,
    column,
    index,
    isOffice,
    dragDisabled,
    onEdit,
    onRemove,
}: {
    stop: RouteStop;
    column: 'MORNING' | 'EVENING';
    index: number;
    isOffice: boolean;
    dragDisabled: boolean;
    onEdit: () => void;
    onRemove: () => void;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: stop.id,
        disabled: dragDisabled || isOffice,
    });
    const dir = deriveDirection(stop);
    const time = column === 'MORNING' ? displayTime(stop.morning_eta) : displayTime(stop.evening_eta);
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cx(
                'group rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-3 shadow-[var(--shadow-card)]',
                isDragging && 'opacity-40',
            )}
        >
            <div className="flex items-start gap-2">
                {!isOffice ? (
                    <button
                        type="button"
                        className={cx(
                            'mt-0.5 shrink-0 rounded-md p-1 text-[var(--text-muted)]',
                            dragDisabled ? 'cursor-not-allowed opacity-40' : 'cursor-grab hover:bg-[var(--bg-subtle)] active:cursor-grabbing',
                        )}
                        aria-label="Drag to reorder"
                        disabled={dragDisabled}
                        {...attributes}
                        {...listeners}
                    >
                        <GripVertical className="h-4 w-4" />
                    </button>
                ) : (
                    <span className="mt-0.5 w-6 shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-[var(--text-primary)]">
                                <span className={cx(
                                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white',
                                    isOffice ? 'bg-[var(--cort-orange)]' : 'bg-[var(--cort-navy)]',
                                )}>
                                    {isOffice ? <Building2 className="h-3 w-3" /> : index + 1}
                                </span>
                                <span className="truncate">{stop.name}</span>
                                {isOffice ? (
                                    <Badge color="orange">Office — last morning / first evening</Badge>
                                ) : (
                                    <Badge color="gray">{directionLabel(dir)}</Badge>
                                )}
                            </div>
                            <div className="mt-1.5 pl-8 text-xs text-[var(--text-muted)]">
                                {column === 'MORNING' ? 'Morning' : 'Evening'} {time}
                                {isOffice ? ' · People board at pickups only' : ''}
                            </div>
                        </div>
                        <div className="flex shrink-0 gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100">
                            <button
                                type="button"
                                onClick={onEdit}
                                className="rounded-md px-2 py-1 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
                            >
                                Edit
                            </button>
                            <button
                                type="button"
                                onClick={onRemove}
                                disabled={isOffice}
                                className="rounded-md px-2 py-1 text-xs font-medium text-rose-600 hover:bg-rose-500/10 disabled:opacity-40"
                            >
                                Remove
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function ManageStopsTab({ route, onStopMutated }: ManageStopsTabProps) {
    const dispatch = useAppDispatch();
    const [isSaving, setIsSaving] = useState(false);
    const [editingStopId, setEditingStopId] = useState<number | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [originalDirection, setOriginalDirection] = useState<StopDirection | null>(null);
    const [morningIds, setMorningIds] = useState<number[]>(() => sequenceIds(route.route_stops, 'morning_sequence'));
    const [eveningIds, setEveningIds] = useState<number[]>(() => sequenceIds(route.route_stops, 'evening_sequence'));
    const [isSavingOrder, setIsSavingOrder] = useState(false);

    const officeStopId = identifyOfficeStopId(route.route_stops ?? []);
    const officeStop = (route.route_stops ?? []).find((s) => s.id === officeStopId) ?? null;
    const isEditingOffice = editingStopId != null && editingStopId === officeStopId;

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

    const resetForm = useCallback(() => {
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
        setOriginalDirection(null);
    }, []);

    useEffect(() => {
        resetForm();
    }, [route.id, resetForm]);

    const handleEditClick = (stop: RouteStop) => {
        const dir = deriveDirection(stop);
        setOriginalDirection(dir);
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
        const officeMorning = officeStop?.morning_sequence ?? null;
        const insertMorning = officeMorning != null
            ? officeMorning
            : Math.max(0, ...(route.route_stops ?? []).map((s) => s.morning_sequence ?? 0)) + 1;
        const insertEvening = officeStop?.evening_sequence != null
            ? officeStop.evening_sequence + 1
            : Math.max(0, ...(route.route_stops ?? []).map((s) => s.evening_sequence ?? 0)) + 1;
        resetForm();
        setOriginalDirection(null);
        setFormData((f) => ({
            ...f,
            morning_sequence: insertMorning.toString(),
            evening_sequence: insertEvening.toString(),
        }));
        setIsAdding(true);
    };

    const handleDirectionChange = (dir: StopDirection) => {
        if (isEditingOffice) return;
        const nextMorning = Math.max(0, ...(route.route_stops ?? []).map((s) => s.morning_sequence ?? 0)) + 1;
        const nextEvening = Math.max(0, ...(route.route_stops ?? []).map((s) => s.evening_sequence ?? 0)) + 1;

        setFormData((f) => ({
            ...f,
            direction: dir,
            morning_sequence:
                dir === 'EVENING'
                    ? ''
                    : dir === 'BOTH'
                        ? (f.morning_sequence || nextMorning.toString())
                        : f.morning_sequence,
            evening_sequence:
                dir === 'MORNING'
                    ? ''
                    : dir === 'BOTH'
                        ? (f.evening_sequence || nextEvening.toString())
                        : f.evening_sequence,
        }));
    };

    const handleSubmit = async () => {
        if (!formData.name || !formData.lat || !formData.lng) {
            toast.error('Name, Latitude, and Longitude are required');
            return;
        }

        if (formData.direction === 'BOTH' && (!formData.morning_sequence || !formData.evening_sequence)) {
            if (editingStopId && originalDirection && originalDirection !== 'BOTH') {
                toast.error('When changing from Morning/Evening only to Both, set both sequence positions');
            } else {
                toast.error('Both Morning and Evening sequence positions are required for Both directions');
            }
            return;
        }

        const data: Record<string, unknown> = {
            name: formData.name,
            lat: parseFloat(formData.lat),
            lng: parseFloat(formData.lng),
            morning_eta: formData.morning_eta || null,
            evening_eta: formData.evening_eta || null,
            direction: isEditingOffice ? 'BOTH' : formData.direction,
            sequence_order: 0,
        };

        if (isEditingOffice && officeStop) {
            data.morning_sequence = officeStop.morning_sequence;
            data.evening_sequence = officeStop.evening_sequence;
        } else {
            if (formData.morning_sequence !== '' && formData.direction !== 'EVENING') {
                data.morning_sequence = parseInt(formData.morning_sequence, 10);
            }
            if (formData.evening_sequence !== '' && formData.direction !== 'MORNING') {
                data.evening_sequence = parseInt(formData.evening_sequence, 10);
            }
        }

        try {
            setIsSaving(true);
            if (isAdding) {
                await dispatch(createRouteStop({ routeId: route.id, data })).unwrap();
                toast.success('Stop added successfully');
            } else if (editingStopId) {
                await dispatch(updateRouteStop({ stopId: editingStopId, routeId: route.id, data })).unwrap();
                toast.success('Stop updated successfully');
            }
            onStopMutated?.();
            resetForm();
        } catch {
            toast.error('Failed to save stop');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (id === officeStopId) {
            toast.error('Cannot delete the company office stop. Change the office location by editing it instead.');
            return;
        }
        if (confirm('Are you sure you want to delete this stop?')) {
            try {
                await dispatch(deleteRouteStop({ stopId: id, routeId: route.id })).unwrap();
                toast.success('Stop deleted successfully');
                onStopMutated?.();
            } catch {
                toast.error('Failed to delete stop');
            }
        }
    };

    const serverMorningIds = useMemo(() => sequenceIds(route.route_stops, 'morning_sequence'), [route.route_stops]);
    const serverEveningIds = useMemo(() => sequenceIds(route.route_stops, 'evening_sequence'), [route.route_stops]);
    const morningMemberKey = useMemo(() => [...serverMorningIds].sort((a, b) => a - b).join(','), [serverMorningIds]);
    const eveningMemberKey = useMemo(() => [...serverEveningIds].sort((a, b) => a - b).join(','), [serverEveningIds]);

    useEffect(() => {
        setMorningIds(sequenceIds(route.route_stops, 'morning_sequence'));
        setEveningIds(sequenceIds(route.route_stops, 'evening_sequence'));
    }, [route.id]);

    useEffect(() => {
        setMorningIds((prev) => mergeOrder(prev, serverMorningIds, 'MORNING', officeStopId));
    }, [morningMemberKey, officeStopId, serverMorningIds]);

    useEffect(() => {
        setEveningIds((prev) => mergeOrder(prev, serverEveningIds, 'EVENING', officeStopId));
    }, [eveningMemberKey, officeStopId, serverEveningIds]);

    const morningStops = useMemo(() => {
        const sorted = (route.route_stops ?? []).filter((s) => s.morning_sequence != null);
        return orderStops(sorted, morningIds);
    }, [route.route_stops, morningIds]);

    const eveningStops = useMemo(() => {
        const sorted = (route.route_stops ?? []).filter((s) => s.evening_sequence != null);
        return orderStops(sorted, eveningIds);
    }, [route.route_stops, eveningIds]);

    const morningDirty = !sameIds(morningIds, serverMorningIds);
    const eveningDirty = !sameIds(eveningIds, serverEveningIds);
    const orderDirty = morningDirty || eveningDirty;

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
    const dragLocked = isSavingOrder || isAdding || editingStopId != null;

    const applyColumnMove = (
        column: 'MORNING' | 'EVENING',
        activeId: number,
        overId: number,
    ) => {
        const setter = column === 'MORNING' ? setMorningIds : setEveningIds;
        setter((ids) => moveColumnIds(ids, activeId, overId, column, officeStopId));
    };

    const handleColumnDragEnd = (column: 'MORNING' | 'EVENING', event: DragEndEvent) => {
        const { active, over } = event;
        if (!over) return;
        applyColumnMove(column, Number(active.id), Number(over.id));
    };

    const handleDiscardOrder = () => {
        setMorningIds(serverMorningIds);
        setEveningIds(serverEveningIds);
    };

    const handleSaveOrder = async () => {
        if (!orderDirty) return;
        setIsSavingOrder(true);
        try {
            if (morningDirty) {
                await dispatch(reorderAdminRouteStops({
                    routeId: route.id,
                    direction: 'MORNING',
                    stop_ids: morningIds,
                })).unwrap();
            }
            if (eveningDirty) {
                await dispatch(reorderAdminRouteStops({
                    routeId: route.id,
                    direction: 'EVENING',
                    stop_ids: eveningIds,
                })).unwrap();
            }
            toast.success('Stop order saved');
            onStopMutated?.();
        } catch {
            toast.error('Could not save the new stop order');
        } finally {
            setIsSavingOrder(false);
        }
    };

    const handleAddressSelect = useCallback(({ name, lat, lng }: { name: string; lat: number; lng: number; fullAddress: string }) => {
        setFormData((f) => ({ ...f, name, lat: lat.toFixed(6), lng: lng.toFixed(6) }));
    }, []);

    const handleMapClick = useCallback((lat: number, lng: number) => {
        setFormData((f) => ({ ...f, lat: lat.toFixed(6), lng: lng.toFixed(6) }));
        toast.info('Coordinates updated from map click');
    }, []);

    const renderFormFields = () => {
        const mapMarkers: MapMarker[] = formData.lat && formData.lng ? [{
            id: 'form-pin',
            position: [parseFloat(formData.lat), parseFloat(formData.lng)],
            label: formData.name || 'New Stop',
            color: '#6366f1',
        }] : [];

        return (
            <div className="space-y-4">
                {isEditingOffice && (
                    <div className="flex items-start gap-3 rounded-xl border border-[color-mix(in_srgb,var(--cort-orange)_35%,transparent)] bg-[var(--bg-subtle)] p-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--cort-orange)] text-white">
                            <Building2 className="h-4 w-4" />
                        </span>
                        <div>
                            <p className="text-sm font-semibold text-[var(--text-primary)]">Office — last morning / first evening</p>
                            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                                People board at pickups only. Position is locked so office stays last in the morning and first in the evening.
                            </p>
                        </div>
                    </div>
                )}

                <div>
                    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                        Search location <span className="text-rose-500">*</span>
                    </label>
                    <StopAddressSearch
                        onSelect={handleAddressSelect}
                        defaultValue={formData.name}
                        placeholder="Search address or place..."
                        className="mt-1"
                    />
                </div>

                <div className="overflow-hidden rounded-xl border border-[var(--border-default)]" style={{ height: 200 }}>
                    <StopMap
                        height="100%"
                        markers={mapMarkers}
                        onMapClick={handleMapClick}
                        center={
                            formData.lat && formData.lng
                                ? [parseFloat(formData.lat), parseFloat(formData.lng)]
                                : undefined
                        }
                    />
                </div>
                {formData.lat && formData.lng && (
                    <p className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                        <MapPin className="h-3 w-3" />
                        {parseFloat(formData.lat).toFixed(5)}, {parseFloat(formData.lng).toFixed(5)} · Click map to adjust
                    </p>
                )}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <div className="col-span-1 md:col-span-2">
                        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                            Stop name <span className="text-rose-500">*</span>
                        </label>
                        <input
                            className={adminInput}
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="e.g. Central Station"
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">When</label>
                        <select
                            value={isEditingOffice ? 'BOTH' : formData.direction}
                            onChange={(e) => handleDirectionChange(e.target.value as StopDirection)}
                            disabled={isEditingOffice}
                            className={adminSelect}
                        >
                            {DIRECTION_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>

                    {(formData.direction === 'MORNING' || formData.direction === 'BOTH' || isEditingOffice) && (
                        <div>
                            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                                {isEditingOffice ? 'Morning arrival' : 'Morning time'}
                            </label>
                            <input
                                className={adminInput}
                                type="time"
                                value={formData.morning_eta}
                                onChange={(e) => setFormData({ ...formData, morning_eta: e.target.value })}
                            />
                        </div>
                    )}
                    {(formData.direction === 'EVENING' || formData.direction === 'BOTH' || isEditingOffice) && (
                        <div>
                            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                                {isEditingOffice ? 'Evening departure' : 'Evening time'}
                            </label>
                            <input
                                className={adminInput}
                                type="time"
                                value={formData.evening_eta}
                                onChange={(e) => setFormData({ ...formData, evening_eta: e.target.value })}
                            />
                        </div>
                    )}
                </div>

                <div className={cx(
                    'flex flex-wrap items-end gap-6 rounded-xl border px-3 py-3',
                    isEditingOffice
                        ? 'border-[color-mix(in_srgb,var(--cort-orange)_35%,transparent)] bg-[var(--bg-subtle)]'
                        : 'border-[var(--border-default)] bg-[var(--bg-subtle)]',
                )}>
                    <span className="w-full text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                        {isEditingOffice ? 'Office position (locked)' : 'Stop position in route'}
                    </span>
                    {(formData.direction === 'MORNING' || formData.direction === 'BOTH' || isEditingOffice) && (
                        <SequenceInput
                            label="Morning"
                            value={formData.morning_sequence}
                            onChange={(v) => setFormData({ ...formData, morning_sequence: v })}
                            icon={<Sun className="h-3 w-3" />}
                            disabled={isEditingOffice}
                        />
                    )}
                    {(formData.direction === 'EVENING' || formData.direction === 'BOTH' || isEditingOffice) && (
                        <SequenceInput
                            label="Evening"
                            value={formData.evening_sequence}
                            onChange={(v) => setFormData({ ...formData, evening_sequence: v })}
                            icon={<Sunset className="h-3 w-3" />}
                            disabled={isEditingOffice}
                        />
                    )}
                    <p className="self-end pb-0.5 text-xs text-[var(--text-muted)]">
                        {isEditingOffice
                            ? 'Position is fixed so office stays last in morning and first in evening.'
                            : 'Other stops will shift around this position automatically.'}
                    </p>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h3 className="text-lg font-semibold text-[var(--text-primary)]">Stops</h3>
                    <p className="mt-0.5 text-sm text-[var(--text-muted)]">
                        Drag pickups to reorder. Press Save to keep it. Office stays last in the morning and first in the evening.
                    </p>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                    {orderDirty && (
                        <>
                            <span className="rounded-full border border-dashed border-[var(--cort-navy)] px-2.5 py-1 text-[11px] font-medium text-[var(--cort-navy)]">
                                Pending — not saved
                            </span>
                            <button
                                type="button"
                                onClick={handleDiscardOrder}
                                disabled={isSavingOrder}
                                className={adminBtnOutline}
                            >
                                Discard
                            </button>
                            <button
                                type="button"
                                onClick={() => void handleSaveOrder()}
                                disabled={isSavingOrder}
                                className="inline-flex items-center justify-center rounded-lg bg-[var(--cort-orange)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--cort-orange-hover)] transition-colors disabled:opacity-50"
                            >
                                <Save className="mr-2 h-4 w-4" />
                                {isSavingOrder ? 'Saving…' : 'Save order'}
                            </button>
                        </>
                    )}
                    {!isAdding && !editingStopId && (
                        <button type="button" onClick={handleAddClick} className={adminBtnPrimary}>
                            <Plus className="mr-2 h-4 w-4" />
                            Add pickup
                        </button>
                    )}
                </div>
            </div>

            {(isAdding || editingStopId) && (
                <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 shadow-[var(--shadow-card)]">
                    <h4 className="mb-3 font-semibold text-[var(--text-primary)]">
                        {isAdding ? 'New pickup' : isEditingOffice ? `Edit office: ${formData.name}` : `Edit: ${formData.name}`}
                    </h4>
                    {renderFormFields()}
                    <div className="mt-4 flex justify-end gap-2">
                        <button type="button" onClick={resetForm} className={adminBtnOutline}>
                            <X className="mr-1 h-4 w-4" /> Cancel
                        </button>
                        <button type="button" onClick={() => void handleSubmit()} disabled={isSaving} className={adminBtnPrimary}>
                            <Save className="mr-2 h-4 w-4" />
                            {isSaving ? 'Saving…' : isAdding ? 'Save stop' : 'Update stop'}
                        </button>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {([
                    { column: 'MORNING' as const, stops: morningStops, title: 'Morning order', hint: 'office last', Icon: Sun },
                    { column: 'EVENING' as const, stops: eveningStops, title: 'Evening order', hint: 'office first', Icon: Sunset },
                ]).map(({ column, stops, title, hint, Icon }) => (
                    <div key={column} className="relative overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--bg-subtle)] [&_[aria-live]]:hidden [&_[role='status']]:hidden">
                        <div className="flex items-center gap-2 border-b border-[var(--border-default)] px-4 py-3">
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--cort-navy)] text-white">
                                <Icon className="h-4 w-4" />
                            </span>
                            <div>
                                <h4 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h4>
                                <p className="text-xs text-[var(--text-muted)]">{stops.length} stops · {hint}</p>
                            </div>
                        </div>
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            accessibility={{ announcements: SILENT_DND_ANNOUNCEMENTS }}
                            onDragEnd={(event) => handleColumnDragEnd(column, event)}
                        >
                            <SortableContext items={stops.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                                <div className="space-y-2 p-3">
                                    {stops.length === 0 ? (
                                        <p className="py-8 text-center text-sm text-[var(--text-muted)]">
                                            No {column === 'MORNING' ? 'morning' : 'evening'} stops
                                        </p>
                                    ) : (
                                        stops.map((s, i) => (
                                            <SortableStopCard
                                                key={`${column}-${s.id}`}
                                                stop={s}
                                                column={column}
                                                index={i}
                                                isOffice={s.id === officeStopId}
                                                dragDisabled={dragLocked}
                                                onEdit={() => handleEditClick(s)}
                                                onRemove={() => void handleDelete(s.id)}
                                            />
                                        ))
                                    )}
                                </div>
                            </SortableContext>
                        </DndContext>
                    </div>
                ))}
            </div>
        </div>
    );
}
