'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import {
    DndContext,
    DragOverlay,
    PointerSensor,
    useSensor,
    useSensors,
    useDraggable,
    useDroppable,
    type DragEndEvent,
    type DragStartEvent,
} from '@dnd-kit/core';
import { ArrowLeftRight, ArrowUp, ArrowDown, Clock, RotateCcw, Bus, GripVertical, X, Save } from 'lucide-react';
import { toast } from 'sonner';
import { PermissionGate } from '@/app/admin/components/PermissionGate';
import { AdminCan } from '@/app/lib/abilities/AdminAbilityProvider';
import { Card } from '@/app/admin/ui/Card';
import { Button } from '@/app/admin/ui/Button';
import { apiClient, Company } from '@/app/lib/services/api-client';
import { useAuth } from '@/app/lib/contexts/auth-context';
import { useAppDispatch, useAppSelector } from '@/app/lib/store/hooks';
import { fetchAdminCompanies, selectAdminCompanies, selectAdminCompaniesStatus } from '@/app/lib/store/slices/adminCompaniesSlice';
import type { MapPolyline } from '@/app/admin/ui/Map';

const Map = dynamic(() => import('@/app/admin/ui/Map'), { ssr: false });

type Direction = 'MORNING' | 'EVENING';

interface RouteOption {
    id: number;
    name: string;
    company_id: number | null;
    companies: { id: number; name: string } | null;
}

interface RosterUser {
    id: string;
    full_name: string;
    phone: string | null;
    department: string | null;
}

interface RosterEntry {
    user_id: string;
    pickup_stop_id: number | null;
    stop_name: string | null;
    lat: number | null;
    lng: number | null;
    sequence: number | null;
    is_override: boolean;
    override: {
        id: number;
        from_route_id: number | null;
        from_route_name: string | null;
        to_route_id: number;
        scheduled_time: string | null;
    } | null;
    user: RosterUser | null;
}

interface PendingMove {
    entry: RosterEntry;
    fromRouteId: number;
    toRouteId: number;
    toRouteName: string;
}

interface OverrideRow {
    id: number;
    user_id: string;
    from_route_id: number | null;
    to_route_id: number;
    to_sequence: number;
    stop_name: string;
    scheduled_time: string | null;
    routes: { id: number; name: string };
    users_shuttle_daily_stop_overrides_user_idTousers: { id: string; full_name: string; phone: string | null };
}

const ROUTE_COLORS = ['#0C225E', '#0e7490', '#7c3aed', '#b45309', '#15803d', '#be123c'];

function utcTodayYmd(): string {
    const n = new Date();
    return `${n.getUTCFullYear()}-${String(n.getUTCMonth() + 1).padStart(2, '0')}-${String(n.getUTCDate()).padStart(2, '0')}`;
}

export default function DailyOverridesPage() {
    return (
        <PermissionGate permission="ops_shuttle">
            <AdminCan I="read" a="OpsShuttle">
                <DailyOverridesContent />
            </AdminCan>
        </PermissionGate>
    );
}

function EmployeeCard({
    entry,
    routeId,
    color,
    canMutate,
    pending,
    editing,
    onStartEditTime,
    onSaveTime,
    onCancelEditTime,
    editValue,
    onEditValueChange,
    onUndo,
    onCancelPendingMove,
    onNudge,
    busy,
}: {
    entry: RosterEntry;
    routeId: number;
    color: string;
    canMutate: boolean;
    pending: boolean;
    editing: boolean;
    onStartEditTime: () => void;
    onSaveTime: () => void;
    onCancelEditTime: () => void;
    editValue: string;
    onEditValueChange: (v: string) => void;
    onUndo: () => void;
    onCancelPendingMove: () => void;
    onNudge: (dir: -1 | 1) => void;
    busy: boolean;
}) {
    const dragId = `${routeId}::${entry.user_id}`;
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: dragId,
        disabled: !canMutate,
        data: { routeId, entry },
    });

    const style = transform
        ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 50 }
        : undefined;

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`flex items-center gap-2 p-2.5 rounded-lg border text-sm bg-white ${isDragging ? 'opacity-40' : ''} ${
                pending ? 'border-blue-300 bg-blue-50 border-dashed' : entry.is_override ? 'border-amber-300 bg-amber-50' : 'border-gray-200'
            }`}
        >
            <button
                {...attributes}
                {...listeners}
                className={`shrink-0 text-gray-400 ${canMutate ? 'cursor-grab active:cursor-grabbing hover:text-gray-600' : 'cursor-not-allowed opacity-30'}`}
                title={canMutate ? 'Drag to another route' : 'No permission to move'}
            >
                <GripVertical className="w-4 h-4" />
            </button>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-medium text-gray-900 truncate">{entry.user?.full_name ?? entry.user_id}</span>
                    {pending && (
                        <span className="text-[10px] font-bold uppercase tracking-wide bg-blue-200 text-blue-800 px-1.5 py-0.5 rounded">
                            Pending — not saved
                        </span>
                    )}
                    {!pending && entry.is_override && (
                        <span className="text-[10px] font-bold uppercase tracking-wide bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded">
                            Temporary{entry.override?.from_route_name ? ` from ${entry.override.from_route_name}` : ''}
                        </span>
                    )}
                </div>
                <div className="text-xs text-gray-500 truncate">{entry.stop_name ?? 'No stop'}</div>
                {editing ? (
                    <div className="flex items-center gap-1 mt-1">
                        <input
                            type="time"
                            value={editValue}
                            onChange={(e) => onEditValueChange(e.target.value)}
                            className="text-xs border rounded px-1 py-0.5"
                        />
                        <Button size="sm" className="h-6 px-2 text-xs" onClick={onSaveTime} disabled={busy}>Save</Button>
                        <Button size="sm" variant="outline" className="h-6 px-2 text-xs" onClick={onCancelEditTime}>Cancel</Button>
                    </div>
                ) : (
                    !pending && entry.override && (
                        <button
                            onClick={onStartEditTime}
                            disabled={!canMutate}
                            className="mt-1 inline-flex items-center gap-1 text-xs text-gray-400 hover:text-blue-600 disabled:cursor-not-allowed"
                        >
                            <Clock className="w-3 h-3" />
                            {entry.override.scheduled_time ?? 'Set time'}
                        </button>
                    )
                )}
            </div>

            {!pending && entry.is_override && canMutate && (
                <div className="flex flex-col gap-0.5 shrink-0">
                    <button onClick={() => onNudge(-1)} disabled={busy} className="text-gray-400 hover:text-gray-700" title="Move earlier">
                        <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => onNudge(1)} disabled={busy} className="text-gray-400 hover:text-gray-700" title="Move later">
                        <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}

            {pending && canMutate && (
                <button
                    onClick={onCancelPendingMove}
                    className="shrink-0 text-gray-400 hover:text-red-600"
                    title="Cancel this move"
                >
                    <X className="w-4 h-4" />
                </button>
            )}

            {!pending && entry.is_override && canMutate && (
                <button
                    onClick={onUndo}
                    disabled={busy}
                    className="shrink-0 text-gray-400 hover:text-red-600"
                    title="Undo — revert to base route"
                >
                    <RotateCcw className="w-4 h-4" />
                </button>
            )}

            {!pending && !entry.is_override && (
                <span
                    className="shrink-0 w-2 h-2 rounded-full"
                    style={{ backgroundColor: color }}
                    title="Base roster"
                />
            )}
        </div>
    );
}

function RoutePanel({
    route,
    color,
    entries,
    pendingUserIds,
    ghostOut,
    pendingGhostOut,
    canMutate,
    editingOverrideId,
    editValue,
    onEditValueChange,
    onStartEditTime,
    onSaveTime,
    onCancelEditTime,
    onUndo,
    onCancelPendingMove,
    onNudge,
    busyId,
}: {
    route: RouteOption;
    color: string;
    entries: RosterEntry[];
    pendingUserIds: Set<string>;
    ghostOut: OverrideRow[];
    pendingGhostOut: PendingMove[];
    canMutate: boolean;
    editingOverrideId: number | null;
    editValue: string;
    onEditValueChange: (v: string) => void;
    onStartEditTime: (overrideId: number, current: string | null) => void;
    onSaveTime: (overrideId: number, routeId: number) => void;
    onCancelEditTime: () => void;
    onUndo: (overrideId: number, routeId: number, otherRouteId: number | null) => void;
    onCancelPendingMove: (userId: string) => void;
    onNudge: (entry: RosterEntry, dir: -1 | 1) => void;
    busyId: number | null;
}) {
    const { setNodeRef, isOver } = useDroppable({ id: `panel::${route.id}`, data: { routeId: route.id } });

    return (
        <Card
            ref={setNodeRef}
            className={`flex flex-col min-w-[280px] max-w-[320px] w-full shrink-0 ${isOver ? 'ring-2 ring-blue-400' : ''}`}
        >
            <div className="px-3 py-2.5 border-b flex items-center gap-2" style={{ borderLeft: `4px solid ${color}` }}>
                <Bus className="w-4 h-4 shrink-0" style={{ color }} />
                <div className="min-w-0">
                    <div className="font-semibold text-sm text-gray-900 truncate">{route.name}</div>
                    <div className="text-xs text-gray-400">{entries.length} on route today</div>
                </div>
            </div>
            <div className="p-2 space-y-1.5 min-h-[80px] flex-1">
                {entries.length === 0 && ghostOut.length === 0 && pendingGhostOut.length === 0 && (
                    <p className="text-xs text-gray-300 text-center py-6">No one assigned</p>
                )}
                {entries.map((entry) => (
                    <EmployeeCard
                        key={entry.user_id}
                        entry={entry}
                        routeId={route.id}
                        color={color}
                        canMutate={canMutate}
                        pending={pendingUserIds.has(entry.user_id)}
                        editing={editingOverrideId === entry.override?.id}
                        editValue={editValue}
                        onEditValueChange={onEditValueChange}
                        onStartEditTime={() => onStartEditTime(entry.override!.id, entry.override!.scheduled_time)}
                        onSaveTime={() => onSaveTime(entry.override!.id, route.id)}
                        onCancelEditTime={onCancelEditTime}
                        onUndo={() => onUndo(entry.override!.id, route.id, entry.override!.from_route_id)}
                        onCancelPendingMove={() => onCancelPendingMove(entry.user_id)}
                        onNudge={(dir) => onNudge(entry, dir)}
                        busy={busyId === entry.override?.id}
                    />
                ))}
                {pendingGhostOut.map((p) => (
                    <div key={p.entry.user_id} className="flex items-center gap-2 p-2.5 rounded-lg border border-dashed border-blue-200 bg-blue-50/60 text-sm">
                        <div className="flex-1 min-w-0">
                            <div className="font-medium text-blue-700 truncate">{p.entry.user?.full_name ?? p.entry.user_id}</div>
                            <div className="text-xs text-blue-500">Moving to {p.toRouteName} — not saved</div>
                        </div>
                        {canMutate && (
                            <button
                                onClick={() => onCancelPendingMove(p.entry.user_id)}
                                className="shrink-0 text-blue-400 hover:text-red-600"
                                title="Cancel this move"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                ))}
                {ghostOut.map((o) => (
                    <div key={o.id} className="flex items-center gap-2 p-2.5 rounded-lg border border-dashed border-gray-200 bg-gray-50 text-sm opacity-70">
                        <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-500 truncate">{o.users_shuttle_daily_stop_overrides_user_idTousers.full_name}</div>
                            <div className="text-xs text-gray-400">Moved to {o.routes.name} today</div>
                        </div>
                        {canMutate && (
                            <button
                                onClick={() => onUndo(o.id, o.to_route_id, o.from_route_id)}
                                className="shrink-0 text-gray-400 hover:text-red-600"
                                title="Undo"
                            >
                                <RotateCcw className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </Card>
    );
}

function DailyOverridesContent() {
    const { hasCrud } = useAuth();
    const canMutate = hasCrud('ops_shuttle', 'update');
    const dispatch = useAppDispatch();
    const companies = useAppSelector(selectAdminCompanies);
    const companiesStatus = useAppSelector(selectAdminCompaniesStatus);

    const [companyId, setCompanyId] = useState<number | ''>('');
    const [date, setDate] = useState(utcTodayYmd);
    const [direction, setDirection] = useState<Direction>('MORNING');

    const [routes, setRoutes] = useState<RouteOption[]>([]);
    const [rosterByRoute, setRosterByRoute] = useState<Record<number, RosterEntry[]>>({});
    const [overrides, setOverrides] = useState<OverrideRow[]>([]);
    const [loading, setLoading] = useState(false);

    const [activeDrag, setActiveDrag] = useState<{ routeId: number; entry: RosterEntry } | null>(null);
    const [editingOverrideId, setEditingOverrideId] = useState<number | null>(null);
    const [editValue, setEditValue] = useState('');
    const [busyId, setBusyId] = useState<number | null>(null);
    const [pendingMoves, setPendingMoves] = useState<globalThis.Map<string, PendingMove>>(new globalThis.Map());
    const [saving, setSaving] = useState(false);

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

    useEffect(() => {
        if (companiesStatus === 'idle') dispatch(fetchAdminCompanies({ limit: 200 }));
    }, [dispatch, companiesStatus]);

    const loadRoutes = useCallback(async () => {
        const params = new URLSearchParams();
        if (companyId !== '') params.set('company_id', String(companyId));
        try {
            const data = await apiClient.request<RouteOption[]>(`/shuttle-trips/generation-routes?${params.toString()}`);
            setRoutes(Array.isArray(data) ? data : []);
        } catch {
            setRoutes([]);
        }
    }, [companyId]);

    useEffect(() => { loadRoutes(); }, [loadRoutes]);

    const loadOverrides = useCallback(async () => {
        try {
            const data = await apiClient.request<OverrideRow[]>(`/shuttle-daily-overrides?date=${date}&direction=${direction}`);
            setOverrides(Array.isArray(data) ? data : []);
        } catch {
            setOverrides([]);
        }
    }, [date, direction]);

    const refreshRoute = useCallback(async (routeId: number) => {
        try {
            const data = await apiClient.request<RosterEntry[]>(
                `/shuttle-daily-overrides/effective-roster?route_id=${routeId}&date=${date}&direction=${direction}`,
            );
            setRosterByRoute((prev) => ({ ...prev, [routeId]: Array.isArray(data) ? data : [] }));
        } catch {
            /* keep stale data on transient failure */
        }
    }, [date, direction]);

    const loadAll = useCallback(async () => {
        if (routes.length === 0) {
            setRosterByRoute({});
            return;
        }
        setLoading(true);
        try {
            const entries = await Promise.all(
                routes.map((r) =>
                    apiClient
                        .request<RosterEntry[]>(`/shuttle-daily-overrides/effective-roster?route_id=${r.id}&date=${date}&direction=${direction}`)
                        .then((data) => [r.id, Array.isArray(data) ? data : []] as const)
                        .catch(() => [r.id, []] as const),
                ),
            );
            setRosterByRoute(Object.fromEntries(entries));
        } finally {
            setLoading(false);
        }
    }, [routes, date, direction]);

    useEffect(() => { loadAll(); loadOverrides(); }, [loadAll, loadOverrides]);

    const routeColor = useMemo(() => {
        const map = new globalThis.Map<number, string>();
        routes.forEach((r, i) => map.set(r.id, ROUTE_COLORS[i % ROUTE_COLORS.length]));
        return map;
    }, [routes]);

    const ghostOutByRoute = useMemo(() => {
        const map = new globalThis.Map<number, OverrideRow[]>();
        for (const o of overrides) {
            if (o.from_route_id == null) continue;
            const list = map.get(o.from_route_id) ?? [];
            list.push(o);
            map.set(o.from_route_id, list);
        }
        return map;
    }, [overrides]);

    // The route each user appears under in the last-fetched server data — independent of any
    // pending (unsaved) moves, so dragging a card back to where it actually lives cancels the
    // pending move instead of creating a same-route no-op.
    const originalRouteByUserId = useMemo(() => {
        const map = new globalThis.Map<string, number>();
        for (const [routeId, entries] of Object.entries(rosterByRoute)) {
            for (const e of entries) map.set(e.user_id, Number(routeId));
        }
        return map;
    }, [rosterByRoute]);

    const routeNameById = useMemo(() => {
        const map = new globalThis.Map<number, string>();
        routes.forEach((r) => map.set(r.id, r.name));
        return map;
    }, [routes]);

    // Clear any unsaved moves when the viewed date/direction/company changes — they were staged
    // against a specific roster snapshot and don't carry over. Warn rather than discard silently.
    useEffect(() => {
        setPendingMoves((prev) => {
            if (prev.size > 0) {
                toast.warning(`Discarded ${prev.size} unsaved ${prev.size === 1 ? 'move' : 'moves'} — filters changed`);
            }
            return new globalThis.Map();
        });
    }, [date, direction, companyId]);

    const handleDragStart = (event: DragStartEvent) => {
        const data = event.active.data.current as { routeId: number; entry: RosterEntry } | undefined;
        if (data) setActiveDrag(data);
    };

    // Staged only — no API call. The move is committed when the admin clicks "Save changes",
    // so a stray or exploratory drag never silently writes to the database.
    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveDrag(null);
        if (!over || !canMutate) return;

        const dragData = active.data.current as { routeId: number; entry: RosterEntry } | undefined;
        if (!dragData) return;
        const { routeId: fromRouteId, entry } = dragData;
        const overData = over.data.current as { routeId: number } | undefined;
        const toRouteId = overData?.routeId;
        if (!toRouteId || toRouteId === fromRouteId) return;

        const originalRouteId = originalRouteByUserId.get(entry.user_id) ?? fromRouteId;

        setPendingMoves((prev) => {
            const next = new globalThis.Map(prev);
            if (toRouteId === originalRouteId) {
                // Dragged back to where it actually lives — nothing to save.
                next.delete(entry.user_id);
            } else {
                next.set(entry.user_id, {
                    entry,
                    fromRouteId: originalRouteId,
                    toRouteId,
                    toRouteName: routeNameById.get(toRouteId) ?? `Route ${toRouteId}`,
                });
            }
            return next;
        });
    };

    const handleCancelPendingMove = (userId: string) => {
        setPendingMoves((prev) => {
            const next = new globalThis.Map(prev);
            next.delete(userId);
            return next;
        });
    };

    const handleDiscardChanges = () => {
        setPendingMoves(new globalThis.Map());
    };

    const handleSaveChanges = async () => {
        if (pendingMoves.size === 0 || !canMutate) return;
        setSaving(true);
        const moves = [...pendingMoves.values()];
        const failed: PendingMove[] = [];
        const touchedRouteIds = new Set<number>();

        for (const move of moves) {
            try {
                await apiClient.request('/shuttle-daily-overrides', {
                    method: 'POST',
                    body: JSON.stringify({
                        user_id: move.entry.user_id,
                        override_date: date,
                        direction,
                        to_route_id: move.toRouteId,
                    }),
                });
                touchedRouteIds.add(move.fromRouteId);
                touchedRouteIds.add(move.toRouteId);
            } catch (e) {
                failed.push(move);
                toast.error(`Failed to move ${move.entry.user?.full_name ?? 'employee'}: ${e instanceof Error ? e.message : 'unknown error'}`);
            }
        }

        setPendingMoves(new globalThis.Map(failed.map((m) => [m.entry.user_id, m])));
        if (touchedRouteIds.size > 0) {
            await Promise.all([...touchedRouteIds].map((id) => refreshRoute(id)));
            await loadOverrides();
        }
        if (failed.length === 0) {
            toast.success(moves.length === 1 ? 'Move saved' : `${moves.length} moves saved`);
        }
        setSaving(false);
    };

    const handleUndo = async (overrideId: number, routeId: number, otherRouteId: number | null) => {
        if (!canMutate) return;
        try {
            setBusyId(overrideId);
            await apiClient.request(`/shuttle-daily-overrides/${overrideId}`, { method: 'DELETE' });
            toast.success('Override undone');
            await Promise.all([refreshRoute(routeId), ...(otherRouteId ? [refreshRoute(otherRouteId)] : []), loadOverrides()]);
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Failed to undo');
        } finally {
            setBusyId(null);
        }
    };

    const handleStartEditTime = (overrideId: number, current: string | null) => {
        if (!canMutate) return;
        setEditingOverrideId(overrideId);
        setEditValue(current ?? '');
    };

    const handleSaveTime = async (overrideId: number, routeId: number) => {
        try {
            setBusyId(overrideId);
            await apiClient.request(`/shuttle-daily-overrides/${overrideId}`, {
                method: 'PATCH',
                body: JSON.stringify({ scheduled_time: editValue || undefined }),
            });
            setEditingOverrideId(null);
            await Promise.all([refreshRoute(routeId), loadOverrides()]);
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Failed to save time');
        } finally {
            setBusyId(null);
        }
    };

    const handleNudge = async (routeId: number, entry: RosterEntry, dir: -1 | 1) => {
        if (!entry.override || !canMutate) return;
        const currentList = (rosterByRoute[routeId] ?? []).slice().sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
        const idx = currentList.findIndex((e) => e.user_id === entry.user_id);
        const neighborIdx = idx + dir;
        if (neighborIdx < 0 || neighborIdx >= currentList.length) return;
        const neighborSeq = currentList[neighborIdx].sequence ?? entry.sequence ?? 1;
        const newSeq = dir === -1 ? neighborSeq : neighborSeq + 1;
        try {
            setBusyId(entry.override.id);
            await apiClient.request(`/shuttle-daily-overrides/${entry.override.id}`, {
                method: 'PATCH',
                body: JSON.stringify({ to_sequence: Math.max(1, newSeq) }),
            });
            await refreshRoute(routeId);
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Failed to reorder');
        } finally {
            setBusyId(null);
        }
    };

    const pendingUserIds = useMemo(() => new Set(pendingMoves.keys()), [pendingMoves]);

    /** Server roster for a route, minus anyone with a pending move away from it, plus anyone
     *  pending-moved onto it (rendered as an unsaved "pending" card). */
    const getDisplayEntries = useCallback((routeId: number): RosterEntry[] => {
        const server = (rosterByRoute[routeId] ?? []).filter((e) => !pendingUserIds.has(e.user_id));
        const incoming = [...pendingMoves.values()]
            .filter((m) => m.toRouteId === routeId)
            .map((m) => m.entry);
        return [...server, ...incoming];
    }, [rosterByRoute, pendingMoves, pendingUserIds]);

    const getPendingGhostOut = useCallback((routeId: number): PendingMove[] => {
        return [...pendingMoves.values()].filter((m) => m.fromRouteId === routeId);
    }, [pendingMoves]);

    const polylines: MapPolyline[] = useMemo(() => {
        return routes
            .map((r) => {
                // Reflects pending (unsaved) moves too — an instant client-side preview, no
                // API round trip needed to see the route shape change while dragging.
                const entries = getDisplayEntries(r.id)
                    .filter((e) => e.lat != null && e.lng != null)
                    .slice()
                    .sort((a, b) => (a.sequence ?? Number.MAX_SAFE_INTEGER) - (b.sequence ?? Number.MAX_SAFE_INTEGER));
                if (entries.length < 2) return null;
                const hasOverrideToday = entries.some((e) => e.is_override) || ghostOutByRoute.has(r.id) || getPendingGhostOut(r.id).length > 0;
                return {
                    positions: entries.map((e) => [e.lat as number, e.lng as number] as [number, number]),
                    color: routeColor.get(r.id) ?? '#0C225E',
                    weight: hasOverrideToday ? 4 : 3,
                    dashArray: hasOverrideToday ? '8 6' : undefined,
                } as MapPolyline;
            })
            .filter((p): p is MapPolyline => p != null);
    }, [routes, getDisplayEntries, routeColor, ghostOutByRoute, getPendingGhostOut]);

    return (
        <div className="space-y-6">
            <div>
                <div className="text-sm font-medium text-gray-400">Routes</div>
                <h1 className="mt-1 text-2xl font-bold text-gray-900">Daily route overrides</h1>
                <p className="mt-1 text-sm text-gray-500">
                    Move an employee to a different route for a single date/direction without touching their permanent assignment.
                    Drag a card between routes to move it, then click <span className="font-medium">Save changes</span> — nothing
                    is written until you save. Once saved, use the arrows to fine-tune order and the clock to set a pickup time for today.
                </p>
            </div>

            <Card className="p-4">
                <div className="flex flex-wrap items-end gap-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Company</label>
                        <select
                            className="border rounded-md px-3 py-2 text-sm"
                            value={companyId}
                            onChange={(e) => setCompanyId(e.target.value ? Number(e.target.value) : '')}
                        >
                            <option value="">All companies</option>
                            {companies.map((c: Company) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Date</label>
                        <input
                            type="date"
                            className="border rounded-md px-3 py-2 text-sm"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Direction</label>
                        <div className="inline-flex rounded-md border overflow-hidden">
                            {(['MORNING', 'EVENING'] as Direction[]).map((d) => (
                                <button
                                    key={d}
                                    onClick={() => setDirection(d)}
                                    className={`px-3 py-2 text-sm font-medium ${
                                        direction === d ? 'bg-primary text-primary-foreground' : 'bg-white text-gray-600 hover:bg-gray-50'
                                    }`}
                                >
                                    {d === 'MORNING' ? 'Morning' : 'Evening'}
                                </button>
                            ))}
                        </div>
                    </div>
                    {!canMutate && (
                        <span className="text-xs text-gray-400 italic ml-auto">Read-only — you don&apos;t have permission to change overrides.</span>
                    )}
                </div>
            </Card>

            {loading && routes.length > 0 && (
                <p className="text-sm text-gray-400">Loading rosters…</p>
            )}

            {pendingMoves.size > 0 && (
                <div className="sticky top-2 z-10 flex items-center gap-3 rounded-lg border border-blue-300 bg-blue-50 px-4 py-3 shadow-sm">
                    <span className="text-sm font-medium text-blue-800">
                        {pendingMoves.size} unsaved {pendingMoves.size === 1 ? 'move' : 'moves'}
                    </span>
                    <div className="ml-auto flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={handleDiscardChanges} disabled={saving}>
                            Discard
                        </Button>
                        <Button size="sm" onClick={handleSaveChanges} disabled={saving}>
                            {saving ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Saving…
                                </div>
                            ) : (
                                <><Save className="w-4 h-4 mr-2" /> Save changes</>
                            )}
                        </Button>
                    </div>
                </div>
            )}

            {routes.length === 0 ? (
                <Card className="p-8 text-center text-sm text-gray-400">
                    No eligible routes (driver + vehicle assigned) for this company.
                </Card>
            ) : (
                <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                    <div className="flex gap-4 overflow-x-auto pb-2">
                        {routes.map((route) => (
                            <RoutePanel
                                key={route.id}
                                route={route}
                                color={routeColor.get(route.id) ?? '#0C225E'}
                                entries={getDisplayEntries(route.id).slice().sort((a, b) => (a.sequence ?? Number.MAX_SAFE_INTEGER) - (b.sequence ?? Number.MAX_SAFE_INTEGER))}
                                pendingUserIds={pendingUserIds}
                                ghostOut={ghostOutByRoute.get(route.id) ?? []}
                                pendingGhostOut={getPendingGhostOut(route.id)}
                                canMutate={canMutate}
                                editingOverrideId={editingOverrideId}
                                editValue={editValue}
                                onEditValueChange={setEditValue}
                                onStartEditTime={handleStartEditTime}
                                onSaveTime={handleSaveTime}
                                onCancelEditTime={() => setEditingOverrideId(null)}
                                onUndo={handleUndo}
                                onCancelPendingMove={handleCancelPendingMove}
                                onNudge={(entry, dir) => handleNudge(route.id, entry, dir)}
                                busyId={busyId}
                            />
                        ))}
                    </div>
                    <DragOverlay>
                        {activeDrag ? (
                            <div className="flex items-center gap-2 p-2.5 rounded-lg border border-blue-300 bg-white shadow-lg text-sm">
                                <ArrowLeftRight className="w-4 h-4 text-blue-500" />
                                <span className="font-medium">{activeDrag.entry.user?.full_name ?? activeDrag.entry.user_id}</span>
                            </div>
                        ) : null}
                    </DragOverlay>
                </DndContext>
            )}

            {routes.length > 0 && polylines.length > 0 && (
                <Card className="p-2">
                    <div className="px-2 py-1.5 text-sm font-semibold text-gray-700">Route preview — dashed lines show routes with active overrides today</div>
                    <Map height="420px" polylines={polylines} />
                </Card>
            )}
        </div>
    );
}
