'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
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
import { useAppDispatch } from '@/app/lib/store/hooks';
import {
    updateRouteStop,
    deleteRouteStop,
    reorderAdminRouteStops,
    Route,
    RouteStop,
} from '@/app/lib/store/slices/adminRoutesSlice';
import { Save, X, Sun, Sunset, Building2, GripVertical, ArrowLeftRight, Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/app/admin/components/ui/Badge';
import { adminBtnOutline, adminBtnPrimary, adminInput } from '@/app/admin/components/ui/admin-styles';
import { cx } from '@/app/admin/components/ui/cx';
import { format12h } from '../../RouteCommandBar';
import { isOfficeStop, getOfficeStops } from '@/app/lib/utils/routeStops';

type StopDirection = 'MORNING' | 'EVENING' | 'BOTH';

interface ManageStopsTabProps {
    route: Route;
    onStopMutated?: () => void;
}

function formatTime(timeStr: string | null | undefined): string {
    if (!timeStr) return '';
    const trimmed = String(timeStr).trim();
    const hhmmMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?/);
    if (hhmmMatch) {
        const hour = Number.parseInt(hhmmMatch[1], 10);
        const minute = hhmmMatch[2];
        if (!Number.isNaN(hour) && hour >= 0 && hour <= 23) {
            return `${String(hour).padStart(2, '0')}:${minute}`;
        }
    }
    try {
        const date = new Date(trimmed.includes('T') ? trimmed : `1970-01-01T${trimmed}Z`);
        if (isNaN(date.getTime())) return trimmed;
        return date.toISOString().substring(11, 16);
    } catch {
        return trimmed;
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

function mergeOrder(prev: number[], server: number[]): number[] {
    const allowed = new Set(server);
    const kept = prev.filter((id) => allowed.has(id));
    const missing = server.filter((id) => !kept.includes(id));
    return [...kept, ...missing];
}

function moveColumnIds(ids: number[], activeId: number, overId: number): number[] {
    const oldIndex = ids.indexOf(activeId);
    const newIndex = ids.indexOf(overId);
    if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return ids;
    return arrayMove(ids, oldIndex, newIndex);
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

function stopActionKey(id: number, column: 'MORNING' | 'EVENING') {
    return `${id}-${column}`;
}

function SortableStopCard({
    stop,
    column,
    index,
    isOffice,
    dragDisabled,
    isRemoving,
    onEdit,
    onRemove,
}: {
    stop: RouteStop;
    column: 'MORNING' | 'EVENING';
    index: number;
    isOffice: boolean;
    dragDisabled: boolean;
    isRemoving: boolean;
    onEdit: () => void;
    onRemove: () => void;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: stop.id,
        disabled: dragDisabled,
    });
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
                'group rounded-xl border p-3 shadow-[var(--shadow-card)]',
                isOffice
                    ? 'border-[color-mix(in_srgb,var(--cort-orange)_35%,transparent)] bg-[color-mix(in_srgb,var(--cort-orange)_6%,var(--bg-card))]'
                    : 'border-[var(--border-default)] bg-[var(--bg-card)]',
                isDragging && 'opacity-40',
            )}
        >
            <div className="flex items-start gap-2">
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
                                {isOffice && (
                                    <Badge color="orange">Office</Badge>
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
                                disabled={isOffice || isRemoving}
                                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-rose-600 hover:bg-rose-500/10 disabled:opacity-40"
                            >
                                {isRemoving ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                ) : null}
                                {isRemoving ? 'Removing…' : 'Remove'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function AbsentStopCard({
    stop,
    column,
    isOffice,
    disabled,
    isAdding,
    onAdd,
}: {
    stop: RouteStop;
    column: 'MORNING' | 'EVENING';
    isOffice: boolean;
    disabled: boolean;
    isAdding: boolean;
    onAdd: () => void;
}) {
    const routeLabel = column === 'MORNING' ? 'morning' : 'evening';
    const activeDirLabel = column === 'MORNING' ? 'evening' : 'morning';
    const activeTime = column === 'MORNING' ? displayTime(stop.evening_eta) : displayTime(stop.morning_eta);

    return (
        <div className="rounded-xl border border-dashed border-[var(--border-default)] bg-[color-mix(in_srgb,var(--text-muted)_4%,var(--bg-card))] p-3 opacity-80">
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-[var(--text-secondary)]">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[var(--border-default)] bg-[var(--bg-subtle)] text-[var(--text-muted)]">
                            {isOffice ? <Building2 className="h-3 w-3" /> : <span className="text-[10px]">—</span>}
                        </span>
                        <span className="truncate">{stop.name}</span>
                        {isOffice && <Badge color="orange">Office</Badge>}
                    </div>
                    <p className="mt-1.5 pl-8 text-xs text-[var(--text-muted)]">
                        Not on {routeLabel} route
                        {activeTime !== '—' ? ` · on ${activeDirLabel} ${activeTime}` : ''}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={onAdd}
                    disabled={disabled}
                    className="inline-flex shrink-0 items-center gap-1 rounded-md border border-[var(--cort-navy)] px-2 py-1 text-xs font-medium text-[var(--cort-navy)] hover:bg-[color-mix(in_srgb,var(--cort-navy)_8%,transparent)] disabled:opacity-50"
                >
                    {isAdding ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                        <Plus className="h-3 w-3" />
                    )}
                    {isAdding ? 'Adding…' : `Add to ${routeLabel}`}
                </button>
            </div>
        </div>
    );
}

export default function ManageStopsTab({ route, onStopMutated }: ManageStopsTabProps) {
    const dispatch = useAppDispatch();
    const [isSaving, setIsSaving] = useState(false);
    const [editingStopId, setEditingStopId] = useState<number | null>(null);
    const officeStops = getOfficeStops(route.route_stops ?? []);
    const officeStopIds = new Set(officeStops.map((s) => s.id));
    const normalizeOfficeOrder = (ids: number[], column: 'MORNING' | 'EVENING') => {
        const offices = ids.filter((id) => officeStopIds.has(id));
        const pickups = ids.filter((id) => !officeStopIds.has(id));
        // Office is pinned:
        // - Morning: always last
        // - Evening: always first
        return column === 'MORNING' ? [...pickups, ...offices] : [...offices, ...pickups];
    };
    const [morningIds, setMorningIds] = useState<number[]>(() =>
        normalizeOfficeOrder(sequenceIds(route.route_stops, 'morning_sequence'), 'MORNING'),
    );
    const [eveningIds, setEveningIds] = useState<number[]>(() =>
        normalizeOfficeOrder(sequenceIds(route.route_stops, 'evening_sequence'), 'EVENING'),
    );
    const [isSavingOrder, setIsSavingOrder] = useState(false);
    const [addingToColumnId, setAddingToColumnId] = useState<number | null>(null);
    const [removingStopKey, setRemovingStopKey] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        lat: '',
        lng: '',
        morning_eta: '',
        evening_eta: '',
        direction: 'BOTH' as StopDirection,
    });
    const editingStop = editingStopId != null
        ? (route.route_stops ?? []).find((s) => s.id === editingStopId) ?? null
        : null;
    const isEditingOffice = editingStop != null && isOfficeStop(editingStop);

    const resetForm = useCallback(() => {
        setFormData({
            name: '',
            lat: '',
            lng: '',
            morning_eta: '',
            evening_eta: '',
            direction: 'BOTH',
        });
        setEditingStopId(null);
    }, []);

    useEffect(() => {
        resetForm();
    }, [route.id, resetForm]);

    const handleEditClick = (stop: RouteStop) => {
        const dir = deriveDirection(stop);
        setFormData({
            name: stop.name,
            lat: stop.lat?.toString() || '',
            lng: stop.lng?.toString() || '',
            morning_eta: stop.morning_eta ? formatTime(stop.morning_eta) : '',
            evening_eta: stop.evening_eta ? formatTime(stop.evening_eta) : '',
            direction: dir,
        });
        setEditingStopId(stop.id);
    };

    const handleSubmit = async () => {
        if (!editingStopId || !editingStop) return;
        if (!formData.name) {
            toast.error('Stop name is required');
            return;
        }
        const data: Record<string, unknown> = {
            name: formData.name,
            lat: parseFloat(formData.lat),
            lng: parseFloat(formData.lng),
            morning_eta: formData.morning_eta || null,
            evening_eta: formData.evening_eta || null,
            direction: isEditingOffice ? 'BOTH' : formData.direction,
            sequence_order: editingStop.sequence_order ?? 0,
            morning_sequence: editingStop.morning_sequence,
            evening_sequence: editingStop.evening_sequence,
        };
        try {
            setIsSaving(true);
            await dispatch(updateRouteStop({ stopId: editingStopId, routeId: route.id, data })).unwrap();
            toast.success('Stop updated successfully');
            onStopMutated?.();
            resetForm();
        } catch {
            toast.error('Failed to save stop');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: number, column: 'MORNING' | 'EVENING') => {
        if (officeStopIds.has(id)) {
            toast.error('Cannot delete an office stop. Change the office location by editing it instead.');
            return;
        }
        const stop = (route.route_stops ?? []).find((s) => s.id === id);
        if (!stop) return;
        const dir = deriveDirection(stop);

        // BOTH-direction stop: removing from one column drops that direction only.
        if (dir === 'BOTH') {
            const msg =
                column === 'EVENING'
                    ? `Remove "${stop.name}" from the evening route only? It will stay on the morning route.`
                    : `Remove "${stop.name}" from the morning route only? It will stay on the evening route.`;
            if (!confirm(msg)) return;
            const key = stopActionKey(id, column);
            try {
                setRemovingStopKey(key);
                await dispatch(updateRouteStop({
                    stopId: id,
                    routeId: route.id,
                    data: { direction: column === 'EVENING' ? 'MORNING' : 'EVENING' },
                })).unwrap();
                toast.success(
                    column === 'EVENING' ? 'Removed from evening route' : 'Removed from morning route',
                );
                onStopMutated?.();
            } catch {
                toast.error('Failed to update stop');
            } finally {
                setRemovingStopKey(null);
            }
            return;
        }

        if (!confirm(`Delete "${stop.name}"? This removes the stop from the route entirely.`)) return;
        const key = stopActionKey(id, column);
        try {
            setRemovingStopKey(key);
            await dispatch(deleteRouteStop({ stopId: id, routeId: route.id })).unwrap();
            toast.success('Stop deleted successfully');
            onStopMutated?.();
        } catch {
            toast.error('Failed to delete stop');
        } finally {
            setRemovingStopKey(null);
        }
    };

    const handleAddToColumn = async (id: number, column: 'MORNING' | 'EVENING') => {
        const stop = (route.route_stops ?? []).find((s) => s.id === id);
        if (!stop) return;
        const dir = deriveDirection(stop);
        const targetDir: StopDirection | null =
            column === 'EVENING' && dir === 'MORNING'
                ? 'BOTH'
                : column === 'MORNING' && dir === 'EVENING'
                    ? 'BOTH'
                    : null;
        if (!targetDir) return;

        try {
            setAddingToColumnId(id);
            await dispatch(updateRouteStop({
                stopId: id,
                routeId: route.id,
                data: { direction: targetDir },
            })).unwrap();
            toast.success(`Added "${stop.name}" to the ${column === 'EVENING' ? 'evening' : 'morning'} route`);
            onStopMutated?.();
        } catch {
            toast.error('Failed to add stop to route');
        } finally {
            setAddingToColumnId(null);
        }
    };

    const serverMorningIds = useMemo(() => sequenceIds(route.route_stops, 'morning_sequence'), [route.route_stops]);
    const serverEveningIds = useMemo(() => sequenceIds(route.route_stops, 'evening_sequence'), [route.route_stops]);
    const morningMemberKey = useMemo(() => [...serverMorningIds].sort((a, b) => a - b).join(','), [serverMorningIds]);
    const eveningMemberKey = useMemo(() => [...serverEveningIds].sort((a, b) => a - b).join(','), [serverEveningIds]);

    useEffect(() => {
        setMorningIds(normalizeOfficeOrder(sequenceIds(route.route_stops, 'morning_sequence'), 'MORNING'));
        setEveningIds(normalizeOfficeOrder(sequenceIds(route.route_stops, 'evening_sequence'), 'EVENING'));
    }, [route.id]);

    useEffect(() => {
        setMorningIds((prev) => normalizeOfficeOrder(mergeOrder(prev, serverMorningIds), 'MORNING'));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [morningMemberKey, serverMorningIds]);

    useEffect(() => {
        setEveningIds((prev) => normalizeOfficeOrder(mergeOrder(prev, serverEveningIds), 'EVENING'));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [eveningMemberKey, serverEveningIds]);

    const morningStops = useMemo(() => {
        const sorted = (route.route_stops ?? []).filter((s) => s.morning_sequence != null);
        return orderStops(sorted, morningIds);
    }, [route.route_stops, morningIds]);

    const eveningStops = useMemo(() => {
        const sorted = (route.route_stops ?? []).filter((s) => s.evening_sequence != null);
        return orderStops(sorted, eveningIds);
    }, [route.route_stops, eveningIds]);

    // Pickup stops on the other direction only — show as inactive in this column so ops can re-add.
    const absentFromMorning = useMemo(
        () => (route.route_stops ?? []).filter(
            (s) => s.evening_sequence != null && s.morning_sequence == null && !isOfficeStop(s),
        ),
        [route.route_stops],
    );
    const absentFromEvening = useMemo(
        () => (route.route_stops ?? []).filter(
            (s) => s.morning_sequence != null && s.evening_sequence == null && !isOfficeStop(s),
        ),
        [route.route_stops],
    );

    const morningDirty = !sameIds(morningIds, serverMorningIds);
    const eveningDirty = !sameIds(eveningIds, serverEveningIds);
    const orderDirty = morningDirty || eveningDirty;

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
    const dragLocked = isSavingOrder || editingStopId != null;

    const applyColumnMove = (
        column: 'MORNING' | 'EVENING',
        activeId: number,
        overId: number,
    ) => {
        const setter = column === 'MORNING' ? setMorningIds : setEveningIds;
        setter((ids) => normalizeOfficeOrder(moveColumnIds(ids, activeId, overId), column));
    };

    const handleColumnDragEnd = (column: 'MORNING' | 'EVENING', event: DragEndEvent) => {
        const { active, over } = event;
        if (!over) return;
        applyColumnMove(column, Number(active.id), Number(over.id));
    };

    const handleDiscardOrder = () => {
        setMorningIds(normalizeOfficeOrder(serverMorningIds, 'MORNING'));
        setEveningIds(normalizeOfficeOrder(serverEveningIds, 'EVENING'));
    };

    const handleSaveOrder = async () => {
        if (!orderDirty) return;
        setIsSavingOrder(true);
        try {
            if (morningDirty) {
                const normalizedMorningIds = normalizeOfficeOrder(morningIds, 'MORNING');
                await dispatch(reorderAdminRouteStops({
                    routeId: route.id,
                    direction: 'MORNING',
                    stop_ids: normalizedMorningIds,
                })).unwrap();
            }
            if (eveningDirty) {
                const normalizedEveningIds = normalizeOfficeOrder(eveningIds, 'EVENING');
                await dispatch(reorderAdminRouteStops({
                    routeId: route.id,
                    direction: 'EVENING',
                    stop_ids: normalizedEveningIds,
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

    const renderFormFields = () => (
        <div className="space-y-4">
            <div>
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {(formData.direction === 'MORNING' || formData.direction === 'BOTH' || isEditingOffice) && (
                    <div>
                        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                            {isEditingOffice ? 'Morning arrival' : 'Morning time'}
                            {formData.morning_eta && (
                                <span className="ml-1.5 normal-case font-normal text-[var(--text-secondary)]">
                                    ({format12h(formatTime(formData.morning_eta))})
                                </span>
                            )}
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
                            {formData.evening_eta && (
                                <span className="ml-1.5 normal-case font-normal text-[var(--text-secondary)]">
                                    ({format12h(formatTime(formData.evening_eta))})
                                </span>
                            )}
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
            <p className="text-xs text-[var(--text-muted)]">
                Add stops from the Overview tab. Location and stop type are edited there too. Drag stops above to change order.
            </p>
        </div>
    );

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h3 className="text-lg font-semibold text-[var(--text-primary)]">Stops</h3>
                    <p className="mt-0.5 text-sm text-[var(--text-muted)]">
                        Drag stops to reorder — pickups only. Office is pinned (morning last, evening first). Press Save to keep it.
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
                </div>
            </div>

            {editingStopId && (
                <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 shadow-[var(--shadow-card)]">
                    <h4 className="mb-3 font-semibold text-[var(--text-primary)]">
                        {isEditingOffice ? `Edit office: ${formData.name}` : `Edit: ${formData.name}`}
                    </h4>
                    {renderFormFields()}
                    <div className="mt-4 flex justify-end gap-2">
                        <button type="button" onClick={resetForm} className={adminBtnOutline}>
                            <X className="mr-1 h-4 w-4" /> Cancel
                        </button>
                        <button type="button" onClick={() => void handleSubmit()} disabled={isSaving} className={adminBtnPrimary}>
                            <Save className="mr-2 h-4 w-4" />
                            {isSaving ? 'Saving…' : 'Update stop'}
                        </button>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {([
                    { column: 'MORNING' as const, stops: morningStops, absent: absentFromMorning, title: 'Morning order', Icon: Sun },
                    { column: 'EVENING' as const, stops: eveningStops, absent: absentFromEvening, title: 'Evening order', Icon: Sunset },
                ]).map(({ column, stops, absent, title, Icon }) => (
                    <div key={column} className="relative overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--bg-subtle)] [&_[aria-live]]:hidden [&_[role='status']]:hidden">
                        <div className="flex items-center gap-2 border-b border-[var(--border-default)] px-4 py-3">
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--cort-navy)] text-white">
                                <Icon className="h-4 w-4" />
                            </span>
                            <div>
                                <h4 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h4>
                                <p className="text-xs text-[var(--text-muted)]">
                                    {stops.length} stop{stops.length !== 1 ? 's' : ''}
                                    {absent.length > 0 && ` · ${absent.length} not on route`}
                                </p>
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
                                    {stops.length === 0 && absent.length === 0 ? (
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
                                                isOffice={officeStopIds.has(s.id)}
                                                dragDisabled={dragLocked || removingStopKey != null || officeStopIds.has(s.id)}
                                                isRemoving={removingStopKey === stopActionKey(s.id, column)}
                                                onEdit={() => handleEditClick(s)}
                                                onRemove={() => void handleDelete(s.id, column)}
                                            />
                                        ))
                                    )}
                                    {absent.length > 0 && (
                                        <div className="space-y-2 border-t border-dashed border-[var(--border-default)] pt-3">
                                            <p className="flex items-center gap-1.5 px-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                                                <ArrowLeftRight className="h-3 w-3" />
                                                Not on {column === 'MORNING' ? 'morning' : 'evening'} route
                                            </p>
                                            {absent.map((s) => (
                                                <AbsentStopCard
                                                    key={`${column}-absent-${s.id}`}
                                                    stop={s}
                                                    column={column}
                                                    isOffice={officeStopIds.has(s.id)}
                                                    disabled={dragLocked || addingToColumnId != null || removingStopKey != null}
                                                    isAdding={addingToColumnId === s.id}
                                                    onAdd={() => void handleAddToColumn(s.id, column)}
                                                />
                                            ))}
                                        </div>
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
