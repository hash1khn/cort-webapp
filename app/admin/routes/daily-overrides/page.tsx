'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import Link from 'next/link';
import { ArrowLeft, ArrowLeftRight, ArrowUp, ArrowDown, Clock, RotateCcw, Bus, GripVertical, X, Save } from 'lucide-react';
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
    pickup_time: string | null;
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

interface PendingUndo {
    overrideId: number;
    entry: RosterEntry;
    toRouteId: number;
    fromRouteId: number | null;
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

/** HH:mm (24h) → 12-hour clock, e.g. 07:30 → 7:30 AM */
function format12h(hhmm: string | null | undefined): string | null {
    if (!hhmm) return null;
    const match = hhmm.match(/^(\d{1,2}):(\d{2})/);
    if (!match) return hhmm;
    let hour = Number.parseInt(match[1], 10);
    const minute = match[2];
    if (Number.isNaN(hour)) return hhmm;
    const suffix = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12 || 12;
    return `${hour}:${minute} ${suffix}`;
}

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
        disabled: !canMutate || busy,
        data: { routeId, entry },
    });

    const displayTime = format12h(entry.override?.scheduled_time ?? entry.pickup_time);

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
                className={`shrink-0 text-gray-400 ${canMutate && !busy ? 'cursor-grab active:cursor-grabbing hover:text-gray-600' : 'cursor-not-allowed opacity-30'}`}
                title={canMutate && !busy ? 'Drag to another route' : 'No permission to move'}
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
                {!editing && displayTime && (
                    <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                        <Clock className="w-3 h-3 shrink-0" />
                        {displayTime}
                    </div>
                )}
                {editing ? (
                    <div className="flex items-center gap-1 mt-1">
                        <input
                            type="time"
                            value={editValue}
                            onChange={(e) => onEditValueChange(e.target.value)}
                            className="text-xs border rounded px-1 py-0.5"
                        />
                        <Button size="sm" className="h-6 px-2 text-xs" onClick={onSaveTime} disabled={busy}>Set</Button>
                        <Button size="sm" variant="outline" className="h-6 px-2 text-xs" onClick={onCancelEditTime}>Cancel</Button>
                    </div>
                ) : (
                    (pending || (entry.override && entry.override.id !== 0)) && (
                        <button
                            onClick={onStartEditTime}
                            disabled={!canMutate || busy}
                            className="mt-1 inline-flex items-center gap-1 text-xs text-gray-400 hover:text-blue-600 disabled:cursor-not-allowed"
                        >
                            {entry.override?.scheduled_time ? 'Change time' : 'Set time'}
                        </button>
                    )
                )}
            </div>

            {(pending || entry.is_override) && canMutate && (
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
    onUndoGhost,
    onCancelPendingMove,
    onNudge,
    busy,
}: {
    route: RouteOption;
    color: string;
    entries: RosterEntry[];
    pendingUserIds: Set<string>;
    ghostOut: OverrideRow[];
    pendingGhostOut: PendingMove[];
    canMutate: boolean;
    editingOverrideId: string | null;
    editValue: string;
    onEditValueChange: (v: string) => void;
    onStartEditTime: (userId: string, current: string | null) => void;
    onSaveTime: (userId: string) => void;
    onCancelEditTime: () => void;
    onUndo: (entry: RosterEntry, routeId: number) => void;
    onUndoGhost: (row: OverrideRow) => void;
    onCancelPendingMove: (userId: string) => void;
    onNudge: (entry: RosterEntry, dir: -1 | 1) => void;
    busy: boolean;
}) {
    const { setNodeRef, isOver } = useDroppable({
        id: `panel::${route.id}`,
        data: { routeId: route.id },
        disabled: busy || !canMutate,
    });

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
                        editing={editingOverrideId === entry.user_id}
                        editValue={editValue}
                        onEditValueChange={onEditValueChange}
                        onStartEditTime={() => onStartEditTime(entry.user_id, entry.override?.scheduled_time ?? null)}
                        onSaveTime={() => onSaveTime(entry.user_id)}
                        onCancelEditTime={onCancelEditTime}
                        onUndo={() => onUndo(entry, route.id)}
                        onCancelPendingMove={() => onCancelPendingMove(entry.user_id)}
                        onNudge={(dir) => onNudge(entry, dir)}
                        busy={busy}
                    />
                ))}
                {pendingGhostOut.map((p) => (
                    <div key={p.entry.user_id} className="flex items-center gap-2 p-2.5 rounded-lg border border-dashed border-blue-200 bg-blue-50/60 text-sm">
                        <div className="flex-1 min-w-0">
                            <div className="font-medium text-blue-700 truncate">{p.entry.user?.full_name ?? p.entry.user_id}</div>
                            <div className="text-xs text-blue-500">Moving to {p.toRouteName} — not saved</div>
                            {format12h(p.entry.override?.scheduled_time ?? p.entry.pickup_time) && (
                                <div className="text-xs text-blue-400 mt-0.5">
                                    {format12h(p.entry.override?.scheduled_time ?? p.entry.pickup_time)}
                                </div>
                            )}
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
                                onClick={() => onUndoGhost(o)}
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
    const [routesLoading, setRoutesLoading] = useState(false);

    const [activeDrag, setActiveDrag] = useState<{ routeId: number; entry: RosterEntry } | null>(null);
    const [editingUserId, setEditingUserId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');
    const [pendingMoves, setPendingMoves] = useState<globalThis.Map<string, PendingMove>>(new globalThis.Map());
    const [pendingUndos, setPendingUndos] = useState<globalThis.Map<number, PendingUndo>>(new globalThis.Map());
    const [pendingTimes, setPendingTimes] = useState<globalThis.Map<string, string | null>>(new globalThis.Map());
    const [orderByRoute, setOrderByRoute] = useState<Record<number, string[]>>({});
    const [saving, setSaving] = useState(false);

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

    useEffect(() => {
        if (companiesStatus === 'idle') dispatch(fetchAdminCompanies({ limit: 200 }));
    }, [dispatch, companiesStatus]);

    const loadRoutes = useCallback(async () => {
        if (companyId === '') {
            setRoutes([]);
            setRoutesLoading(false);
            return;
        }
        setRoutes([]);
        setRoutesLoading(true);
        const params = new URLSearchParams({ company_id: String(companyId) });
        try {
            const data = await apiClient.request<RouteOption[]>(`/shuttle-trips/generation-routes?${params.toString()}`);
            setRoutes(Array.isArray(data) ? data : []);
        } catch {
            setRoutes([]);
        } finally {
            setRoutesLoading(false);
        }
    }, [companyId]);

    useEffect(() => { loadRoutes(); }, [loadRoutes]);

    const loadOverrides = useCallback(async () => {
        if (companyId === '') {
            setOverrides([]);
            return;
        }
        try {
            const data = await apiClient.request<OverrideRow[]>(
                `/shuttle-daily-overrides?date=${date}&direction=${direction}&company_id=${companyId}`,
            );
            setOverrides(Array.isArray(data) ? data : []);
        } catch {
            setOverrides([]);
        }
    }, [companyId, date, direction]);

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

    const loadGen = useRef(0);

    const loadAll = useCallback(async () => {
        if (companyId === '' || routes.length === 0) {
            setRosterByRoute({});
            return;
        }
        const gen = ++loadGen.current;
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
            if (gen !== loadGen.current) return;
            setRosterByRoute(Object.fromEntries(entries));
        } finally {
            if (gen === loadGen.current) setLoading(false);
        }
    }, [companyId, routes, date, direction]);

    useEffect(() => {
        loadAll();
        loadOverrides();
    }, [loadAll, loadOverrides]);

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

    const pendingUserIds = useMemo(() => new Set(pendingMoves.keys()), [pendingMoves]);
    const pendingUndoOverrideIds = useMemo(() => new Set(pendingUndos.keys()), [pendingUndos]);

    const applyTime = useCallback((entry: RosterEntry, routeId: number): RosterEntry => {
        const time = pendingTimes.get(entry.user_id);
        if (time === undefined) return entry;
        return {
            ...entry,
            pickup_time: time ?? entry.pickup_time,
            override: {
                id: entry.override?.id ?? 0,
                from_route_id: entry.override?.from_route_id ?? null,
                from_route_name: entry.override?.from_route_name ?? null,
                to_route_id: entry.override?.to_route_id ?? routeId,
                scheduled_time: time,
            },
        };
    }, [pendingTimes]);

    /** Server roster for a route, with unsaved moves/undos/times/order applied locally. */
    const getDisplayEntries = useCallback((routeId: number): RosterEntry[] => {
        const server = (rosterByRoute[routeId] ?? []).filter((e) => {
            if (pendingUserIds.has(e.user_id)) return false;
            if (e.override && pendingUndoOverrideIds.has(e.override.id)) return false;
            return true;
        });
        const incoming = [...pendingMoves.values()]
            .filter((m) => m.toRouteId === routeId)
            .map((m) => m.entry);
        const restored = [...pendingUndos.values()]
            .filter((u) => u.fromRouteId === routeId)
            .map((u) => ({
                ...u.entry,
                is_override: false,
                override: null,
                stop_name: 'Reverting to base assignment',
            }));
        const merged = [...server, ...incoming, ...restored].map((e) => applyTime(e, routeId));
        const order = orderByRoute[routeId];
        if (!order || order.length === 0) {
            return merged;
        }
        const byId = new globalThis.Map(merged.map((e) => [e.user_id, e]));
        const ordered: RosterEntry[] = [];
        for (const id of order) {
            const row = byId.get(id);
            if (row) {
                ordered.push(row);
                byId.delete(id);
            }
        }
        return [...ordered, ...byId.values()];
    }, [rosterByRoute, pendingMoves, pendingUserIds, pendingUndos, pendingUndoOverrideIds, orderByRoute, applyTime]);

    const getPendingGhostOut = useCallback((routeId: number): PendingMove[] => {
        return [...pendingMoves.values()].filter((m) => m.fromRouteId === routeId);
    }, [pendingMoves]);

    const hasUnsavedChanges =
        pendingMoves.size > 0 ||
        pendingUndos.size > 0 ||
        pendingTimes.size > 0 ||
        Object.keys(orderByRoute).length > 0 ||
        editingUserId != null;

    const clearDraft = useCallback(() => {
        setPendingMoves(new globalThis.Map());
        setPendingUndos(new globalThis.Map());
        setPendingTimes(new globalThis.Map());
        setOrderByRoute({});
        setEditingUserId(null);
    }, []);

    useEffect(() => {
        setPendingMoves((prev) => {
            if (prev.size > 0) {
                toast.warning('Discarded unsaved changes — filters changed');
            }
            return new globalThis.Map();
        });
        setPendingUndos(new globalThis.Map());
        setPendingTimes(new globalThis.Map());
        setOrderByRoute({});
        setEditingUserId(null);
    }, [date, direction, companyId]);

    const handleDragStart = (event: DragStartEvent) => {
        if (saving) return;
        const data = event.active.data.current as { routeId: number; entry: RosterEntry } | undefined;
        if (data) setActiveDrag(data);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveDrag(null);
        if (saving || !over || !canMutate) return;

        const dragData = active.data.current as { routeId: number; entry: RosterEntry } | undefined;
        if (!dragData) return;
        const { routeId: fromRouteId, entry } = dragData;
        const overData = over.data.current as { routeId: number } | undefined;
        const toRouteId = overData?.routeId;
        if (!toRouteId || toRouteId === fromRouteId) return;

        const originalRouteId = originalRouteByUserId.get(entry.user_id) ?? fromRouteId;

        // Dragging a saved override back to its permanent route is an undo, not a POST home.
        if (entry.override && entry.override.id !== 0 && entry.override.from_route_id === toRouteId) {
            handleUndo(entry, fromRouteId);
            return;
        }
        const fromIds = getDisplayEntries(fromRouteId).map((e) => e.user_id).filter((id) => id !== entry.user_id);
        const toIds = [...getDisplayEntries(toRouteId).map((e) => e.user_id).filter((id) => id !== entry.user_id), entry.user_id];
        setOrderByRoute((prev) => ({ ...prev, [fromRouteId]: fromIds, [toRouteId]: toIds }));

        setPendingMoves((prev) => {
            const next = new globalThis.Map(prev);
            if (toRouteId === originalRouteId) {
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
        if (entry.override) {
            setPendingUndos((prev) => {
                if (!prev.has(entry.override!.id)) return prev;
                const next = new globalThis.Map(prev);
                next.delete(entry.override!.id);
                return next;
            });
        }
    };

    const handleCancelPendingMove = (userId: string) => {
        const move = pendingMoves.get(userId);
        setPendingMoves((prev) => {
            const next = new globalThis.Map(prev);
            next.delete(userId);
            return next;
        });
        setPendingTimes((prev) => {
            if (!prev.has(userId)) return prev;
            const next = new globalThis.Map(prev);
            next.delete(userId);
            return next;
        });
        if (move) {
            const destIds = getDisplayEntries(move.toRouteId).map((e) => e.user_id).filter((id) => id !== userId);
            const sourceIds = [...getDisplayEntries(move.fromRouteId).map((e) => e.user_id).filter((id) => id !== userId), userId];
            setOrderByRoute((prev) => ({
                ...prev,
                [move.toRouteId]: destIds,
                [move.fromRouteId]: sourceIds,
            }));
        }
        if (editingUserId === userId) setEditingUserId(null);
    };

    const handleDiscardChanges = () => {
        clearDraft();
    };

    const handleSaveChanges = async () => {
        if (!hasUnsavedChanges || !canMutate) return;
        const times = new globalThis.Map(pendingTimes);
        if (editingUserId != null) {
            const trimmed = editValue.trim();
            times.set(editingUserId, trimmed ? trimmed : null);
            setPendingTimes(times);
            setEditingUserId(null);
        }
        setSaving(true);
        const failedMoves: PendingMove[] = [];
        const failedUndos: PendingUndo[] = [];
        const failedPatchUserIds = new Set<string>();
        const touchedRouteIds = new Set<number>();

        try {
            for (const undo of pendingUndos.values()) {
                try {
                    await apiClient.request(`/shuttle-daily-overrides/${undo.overrideId}`, { method: 'DELETE' });
                    touchedRouteIds.add(undo.toRouteId);
                    if (undo.fromRouteId) touchedRouteIds.add(undo.fromRouteId);
                } catch (e) {
                    failedUndos.push(undo);
                    toast.error(`Failed to undo ${undo.entry.user?.full_name ?? 'employee'}: ${e instanceof Error ? e.message : 'unknown error'}`);
                }
            }

            const undoneUsers = new Set(failedUndos.length === pendingUndos.size
                ? []
                : [...pendingUndos.values()].filter((u) => !failedUndos.some((f) => f.overrideId === u.overrideId)).map((u) => u.entry.user_id));

            for (const route of routes) {
                const list = getDisplayEntries(route.id);
                for (let i = 0; i < list.length; i++) {
                    const entry = list[i];
                    const toSequence = i + 1;
                    const time = times.get(entry.user_id);
                    const move = pendingMoves.get(entry.user_id);

                    if (move) {
                        try {
                            await apiClient.request('/shuttle-daily-overrides', {
                                method: 'POST',
                                body: JSON.stringify({
                                    user_id: entry.user_id,
                                    override_date: date,
                                    direction,
                                    to_route_id: route.id,
                                    to_sequence: toSequence,
                                    ...(time ? { scheduled_time: time } : {}),
                                }),
                            });
                            touchedRouteIds.add(move.fromRouteId);
                            touchedRouteIds.add(move.toRouteId);
                        } catch (e) {
                            failedMoves.push(move);
                            toast.error(`Failed to move ${entry.user?.full_name ?? 'employee'}: ${e instanceof Error ? e.message : 'unknown error'}`);
                        }
                        continue;
                    }

                    if (undoneUsers.has(entry.user_id)) continue;
                    if (!entry.override || entry.override.id === 0) continue;

                    const sequenceChanged = Boolean(orderByRoute[route.id]?.length);
                    if (!sequenceChanged && time === undefined) continue;

                    try {
                        await apiClient.request(`/shuttle-daily-overrides/${entry.override.id}`, {
                            method: 'PATCH',
                            body: JSON.stringify({
                                ...(sequenceChanged ? { to_sequence: toSequence } : {}),
                                ...(time !== undefined ? { scheduled_time: time } : {}),
                            }),
                        });
                        touchedRouteIds.add(route.id);
                    } catch (e) {
                        failedPatchUserIds.add(entry.user_id);
                        toast.error(`Failed to update ${entry.user?.full_name ?? 'employee'}: ${e instanceof Error ? e.message : 'unknown error'}`);
                    }
                }
            }

            setPendingMoves(new globalThis.Map(failedMoves.map((m) => [m.entry.user_id, m])));
            setPendingUndos(new globalThis.Map(failedUndos.map((u) => [u.overrideId, u])));
            if (failedMoves.length === 0 && failedUndos.length === 0 && failedPatchUserIds.size === 0) {
                setPendingTimes(new globalThis.Map());
                setOrderByRoute({});
                toast.success('Changes saved');
            }
            if (touchedRouteIds.size > 0) {
                await Promise.all([...touchedRouteIds].map((id) => refreshRoute(id)));
                await loadOverrides();
            }
        } finally {
            setSaving(false);
        }
    };

    const handleUndo = (entry: RosterEntry, routeId: number) => {
        if (!canMutate || saving) return;
        if (pendingMoves.has(entry.user_id)) {
            handleCancelPendingMove(entry.user_id);
            return;
        }
        if (!entry.override || entry.override.id === 0) return;
        const overrideId = entry.override.id;
        const fromRouteId = entry.override.from_route_id;
        setPendingUndos((prev) => {
            const next = new globalThis.Map(prev);
            next.set(overrideId, { overrideId, entry, toRouteId: routeId, fromRouteId });
            return next;
        });
        setOrderByRoute((prev) => {
            const next = { ...prev };
            next[routeId] = getDisplayEntries(routeId).map((e) => e.user_id).filter((id) => id !== entry.user_id);
            if (fromRouteId) {
                next[fromRouteId] = [...getDisplayEntries(fromRouteId).map((e) => e.user_id).filter((id) => id !== entry.user_id), entry.user_id];
            }
            return next;
        });
    };

    const handleUndoGhost = (row: OverrideRow) => {
        if (saving) return;
        const destEntry = (rosterByRoute[row.to_route_id] ?? []).find((e) => e.override?.id === row.id);
        if (destEntry) {
            handleUndo(destEntry, row.to_route_id);
            return;
        }
        handleUndo({
            user_id: row.user_id,
            pickup_stop_id: null,
            stop_name: row.stop_name,
            lat: null,
            lng: null,
            sequence: row.to_sequence,
            pickup_time: row.scheduled_time,
            is_override: true,
            override: {
                id: row.id,
                from_route_id: row.from_route_id,
                from_route_name: null,
                to_route_id: row.to_route_id,
                scheduled_time: row.scheduled_time,
            },
            user: { ...row.users_shuttle_daily_stop_overrides_user_idTousers, department: null },
        }, row.to_route_id);
    };

    const handleStartEditTime = (userId: string, current: string | null) => {
        if (!canMutate || saving) return;
        setEditingUserId(userId);
        setEditValue(pendingTimes.has(userId) ? (pendingTimes.get(userId) ?? '') : (current ?? ''));
    };

    const handleSaveTime = (userId: string) => {
        const trimmed = editValue.trim();
        setPendingTimes((prev) => {
            const next = new globalThis.Map(prev);
            next.set(userId, trimmed ? trimmed : null);
            return next;
        });
        setEditingUserId(null);
    };

    const handleNudge = (routeId: number, entry: RosterEntry, dir: -1 | 1) => {
        if (!canMutate || saving) return;
        const currentList = getDisplayEntries(routeId);
        const idx = currentList.findIndex((e) => e.user_id === entry.user_id);
        const neighborIdx = idx + dir;
        if (idx < 0 || neighborIdx < 0 || neighborIdx >= currentList.length) return;
        const ids = currentList.map((e) => e.user_id);
        [ids[idx], ids[neighborIdx]] = [ids[neighborIdx], ids[idx]];
        setOrderByRoute((prev) => ({ ...prev, [routeId]: ids }));
    };

    const filteredGhostOutByRoute = useMemo(() => {
        const map = new globalThis.Map<number, OverrideRow[]>();
        for (const [routeId, rows] of ghostOutByRoute) {
            map.set(routeId, rows.filter((o) => !pendingUndoOverrideIds.has(o.id)));
        }
        return map;
    }, [ghostOutByRoute, pendingUndoOverrideIds]);

    const polylines: MapPolyline[] = useMemo(() => {
        return routes
            .map((r) => {
                // Reflects pending (unsaved) moves too — an instant client-side preview, no
                // API round trip needed to see the route shape change while dragging.
                const entries = getDisplayEntries(r.id)
                    .filter((e) => e.lat != null && e.lng != null);
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
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <div className="text-sm font-medium text-gray-400">Routes</div>
                    <h1 className="mt-1 text-2xl font-bold text-gray-900">Daily route overrides</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Drag between routes, set pickup times, undo a temporary move, or reorder with the arrows.
                        Nothing is written until you click <span className="font-medium">Save changes</span>.
                    </p>
                </div>
                <Link href="/admin/routes">
                    <Button variant="outline">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to routes
                    </Button>
                </Link>
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
                            <option value="">Select a company</option>
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
                    {canMutate && companyId !== '' && (
                        <div className="ml-auto flex items-center gap-2">
                            <Button variant="outline" onClick={handleDiscardChanges} disabled={saving || !hasUnsavedChanges}>
                                Discard
                            </Button>
                            <Button onClick={handleSaveChanges} disabled={saving || !hasUnsavedChanges}>
                                {saving ? 'Saving…' : (
                                    <><Save className="w-4 h-4 mr-2" /> Save changes</>
                                )}
                            </Button>
                        </div>
                    )}
                </div>
            </Card>

            {companyId !== '' && loading && routes.length > 0 && (
                <p className="text-sm text-gray-400">Loading rosters…</p>
            )}

            {hasUnsavedChanges && (
                <div className="sticky top-2 z-10 flex items-center gap-3 rounded-lg border border-blue-300 bg-blue-50 px-4 py-3 shadow-sm">
                    <span className="text-sm font-medium text-blue-800">
                        Unsaved changes{pendingMoves.size > 0 ? ` · ${pendingMoves.size} route ${pendingMoves.size === 1 ? 'move' : 'moves'}` : ''}
                        {pendingUndos.size > 0 ? ` · ${pendingUndos.size} undo${pendingUndos.size === 1 ? '' : 's'}` : ''}
                        {pendingTimes.size > 0 ? ` · ${pendingTimes.size} time ${pendingTimes.size === 1 ? 'edit' : 'edits'}` : ''}
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

            {companyId === '' ? (
                <Card className="p-8 text-center text-sm text-gray-500">
                    Select a company to load its routes and daily overrides.
                </Card>
            ) : routesLoading ? (
                <Card className="p-8 text-center text-sm text-gray-400">
                    Loading routes…
                </Card>
            ) : routes.length === 0 ? (
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
                                entries={getDisplayEntries(route.id)}
                                pendingUserIds={pendingUserIds}
                                ghostOut={filteredGhostOutByRoute.get(route.id) ?? []}
                                pendingGhostOut={getPendingGhostOut(route.id)}
                                canMutate={canMutate}
                                editingOverrideId={editingUserId}
                                editValue={editValue}
                                onEditValueChange={setEditValue}
                                onStartEditTime={handleStartEditTime}
                                onSaveTime={handleSaveTime}
                                onCancelEditTime={() => setEditingUserId(null)}
                                onUndo={handleUndo}
                                onUndoGhost={handleUndoGhost}
                                onCancelPendingMove={handleCancelPendingMove}
                                onNudge={(entry, dir) => handleNudge(route.id, entry, dir)}
                                busy={saving}
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
