'use client';

import {
    ArrowLeftRight,
    ArrowDown,
    ArrowUp,
    Clock,
    GripVertical,
    RotateCcw,
    X,
} from 'lucide-react';
import {
    useDraggable,
    useDroppable,
} from '@dnd-kit/core';
import { Badge } from '@/app/admin/components/ui/Badge';
import { adminBtnOutline, adminBtnPrimary, adminInput } from '@/app/admin/components/ui/admin-styles';
import { cx } from '@/app/admin/components/ui/cx';
import { format12h, initials } from './plan-types';
import type { OverrideRow, PendingMove, RosterEntry, RouteOption } from './plan-types';

function PassengerCard({
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
    const name = entry.user?.full_name ?? entry.user_id;
    const style = transform
        ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 50 }
        : undefined;

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cx(
                'group relative flex items-start gap-2.5 rounded-xl border bg-[var(--bg-card)] p-3 text-sm shadow-[var(--shadow-card)] transition-shadow',
                isDragging && 'opacity-40',
                pending && 'border-dashed border-[var(--cort-navy)] bg-[color-mix(in_srgb,var(--cort-navy)_6%,transparent)]',
                !pending && entry.is_override && 'border-[color-mix(in_srgb,var(--cort-orange)_45%,transparent)]',
                !pending && !entry.is_override && 'border-[var(--border-default)]',
            )}
        >
            <button
                type="button"
                {...attributes}
                {...listeners}
                className={cx(
                    'mt-1 shrink-0 text-[var(--text-muted)]',
                    canMutate && !busy ? 'cursor-grab active:cursor-grabbing hover:text-[var(--text-primary)]' : 'cursor-not-allowed opacity-30',
                )}
                title={canMutate && !busy ? 'Drag to another route' : 'No permission to move'}
            >
                <GripVertical className="h-5 w-5" />
            </button>

            <div
                className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
                style={{ backgroundColor: color }}
            >
                {initials(name)}
            </div>

            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                    <span className="truncate font-semibold text-[var(--text-primary)]">{name}</span>
                    {pending && <Badge color="blue">Pending</Badge>}
                    {!pending && entry.is_override && (
                        <Badge color="orange">
                            Temporary{entry.override?.from_route_name ? ` from ${entry.override.from_route_name}` : ''}
                        </Badge>
                    )}
                </div>
                <div className="mt-0.5 truncate text-xs text-[var(--text-muted)]">{entry.stop_name ?? 'No stop'}</div>
                {!editing && displayTime && (
                    <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-[var(--bg-subtle)] px-2 py-0.5 text-[11px] font-medium text-[var(--text-secondary)]">
                        <Clock className="h-3 w-3" />
                        {displayTime}
                    </span>
                )}
                {editing ? (
                    <div className="mt-2 flex items-center gap-1.5">
                        <input
                            type="time"
                            value={editValue}
                            onChange={(e) => onEditValueChange(e.target.value)}
                            className={cx(adminInput, 'h-8 w-[120px] py-1 text-xs')}
                        />
                        <button type="button" className={cx(adminBtnPrimary, 'h-8 px-2 text-xs')} onClick={onSaveTime} disabled={busy}>Set</button>
                        <button type="button" className={cx(adminBtnOutline, 'h-8 px-2 text-xs')} onClick={onCancelEditTime}>Cancel</button>
                    </div>
                ) : (
                    (pending || (entry.override && entry.override.id !== 0)) && (
                        <button
                            type="button"
                            onClick={onStartEditTime}
                            disabled={!canMutate || busy}
                            className="mt-1 text-[11px] font-medium text-[var(--text-muted)] hover:text-[var(--cort-orange)] disabled:cursor-not-allowed"
                        >
                            {entry.override?.scheduled_time ? 'Change time' : 'Set time'}
                        </button>
                    )
                )}
            </div>

            <div className="flex shrink-0 flex-col items-center gap-0.5 opacity-100 md:opacity-0 md:group-hover:opacity-100">
                {(pending || entry.is_override) && canMutate && (
                    <>
                        <button type="button" onClick={() => onNudge(-1)} disabled={busy} className="rounded-md p-1 text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]" title="Move earlier">
                            <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" onClick={() => onNudge(1)} disabled={busy} className="rounded-md p-1 text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]" title="Move later">
                            <ArrowDown className="h-3.5 w-3.5" />
                        </button>
                    </>
                )}
                {pending && canMutate && (
                    <button type="button" onClick={onCancelPendingMove} className="rounded-md p-1 text-[var(--text-muted)] hover:bg-rose-500/10 hover:text-rose-600" title="Cancel this move">
                        <X className="h-4 w-4" />
                    </button>
                )}
                {!pending && entry.is_override && canMutate && (
                    <button type="button" onClick={onUndo} disabled={busy} className="rounded-md p-1 text-[var(--text-muted)] hover:bg-rose-500/10 hover:text-rose-600" title="Send back to their usual route">
                        <RotateCcw className="h-4 w-4" />
                    </button>
                )}
            </div>
        </div>
    );
}

function RouteColumn({
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
        <div
            ref={setNodeRef}
            className={cx(
                'flex min-h-[480px] min-w-[300px] max-w-[340px] w-full shrink-0 flex-col overflow-hidden rounded-2xl bg-[var(--bg-subtle)]',
                isOver && 'ring-2 ring-[var(--cort-orange)] ring-offset-2 ring-offset-[var(--bg-page)]',
            )}
        >
            <div className="flex items-start gap-3 px-4 pb-3 pt-4">
                <span className="mt-1 h-10 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-[var(--text-primary)]">{route.name}</div>
                    <div className="mt-0.5 text-2xl font-semibold tabular-nums tracking-tight text-[var(--text-primary)]">
                        {entries.length}
                        <span className="ml-1 text-xs font-medium text-[var(--text-muted)]">
                            {entries.length === 1 ? 'person' : 'people'}
                        </span>
                    </div>
                </div>
            </div>

            <div className={cx('flex flex-1 flex-col gap-2 px-3 pb-3', isOver && 'bg-[color-mix(in_srgb,var(--cort-orange)_8%,transparent)]')}>
                {isOver && (
                    <p className="rounded-lg py-2 text-center text-xs font-semibold text-[var(--cort-orange)]">
                        Drop on this column
                    </p>
                )}
                {entries.length === 0 && ghostOut.length === 0 && pendingGhostOut.length === 0 && !isOver && (
                    <p className="py-10 text-center text-xs text-[var(--text-muted)]">Empty — drop a passenger here</p>
                )}
                {entries.map((entry) => (
                    <PassengerCard
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
                    <div
                        key={p.entry.user_id}
                        className="flex items-center gap-2 rounded-xl border border-dashed border-[var(--cort-navy)]/30 bg-[color-mix(in_srgb,var(--cort-navy)_5%,transparent)] px-3 py-2.5 text-sm"
                    >
                        <div className="min-w-0 flex-1">
                            <div className="truncate font-medium text-[var(--text-secondary)] line-through">
                                {p.entry.user?.full_name ?? p.entry.user_id}
                            </div>
                            <div className="text-xs text-[var(--text-muted)]">Moving to {p.toRouteName} — not saved</div>
                        </div>
                        {canMutate && (
                            <button type="button" onClick={() => onCancelPendingMove(p.entry.user_id)} className="text-[var(--text-muted)] hover:text-rose-600" title="Cancel this move">
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                ))}
                {ghostOut.map((o) => (
                    <div
                        key={o.id}
                        className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm opacity-60"
                    >
                        <div className="min-w-0 flex-1">
                            <div className="truncate font-medium text-[var(--text-muted)] line-through">
                                {o.users_shuttle_daily_stop_overrides_user_idTousers.full_name}
                            </div>
                            <div className="text-xs text-[var(--text-muted)]">Moved to {o.routes.name} today</div>
                        </div>
                        {canMutate && (
                            <button type="button" onClick={() => onUndoGhost(o)} className="text-[var(--text-muted)] hover:text-rose-600" title="Undo">
                                <RotateCcw className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

export function PlanLegend() {
    return (
        <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[var(--bg-card)] px-2.5 py-1 text-[11px] text-[var(--text-muted)] ring-1 ring-[var(--border-default)]">
                Usual rider
            </span>
            <span className="rounded-full bg-[color-mix(in_srgb,var(--cort-orange)_12%,transparent)] px-2.5 py-1 text-[11px] font-medium text-[var(--cort-orange)]">
                Temporary — this day only
            </span>
            <span className="rounded-full border border-dashed border-[var(--cort-navy)] px-2.5 py-1 text-[11px] font-medium text-[var(--cort-navy)]">
                Pending — not saved
            </span>
        </div>
    );
}

export function PlanBoard({
    routes,
    routeColor,
    getDisplayEntries,
    pendingUserIds,
    filteredGhostOutByRoute,
    getPendingGhostOut,
    canMutate,
    editingUserId,
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
    routes: RouteOption[];
    routeColor: Map<number, string>;
    getDisplayEntries: (routeId: number) => RosterEntry[];
    pendingUserIds: Set<string>;
    filteredGhostOutByRoute: Map<number, OverrideRow[]>;
    getPendingGhostOut: (routeId: number) => PendingMove[];
    canMutate: boolean;
    editingUserId: string | null;
    editValue: string;
    onEditValueChange: (v: string) => void;
    onStartEditTime: (userId: string, current: string | null) => void;
    onSaveTime: (userId: string) => void;
    onCancelEditTime: () => void;
    onUndo: (entry: RosterEntry, routeId: number) => void;
    onUndoGhost: (row: OverrideRow) => void;
    onCancelPendingMove: (userId: string) => void;
    onNudge: (routeId: number, entry: RosterEntry, dir: -1 | 1) => void;
    busy: boolean;
}) {
    return (
        <div className="flex min-h-[480px] gap-4 overflow-x-auto pb-2">
            {routes.map((route) => (
                <RouteColumn
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
                    onEditValueChange={onEditValueChange}
                    onStartEditTime={onStartEditTime}
                    onSaveTime={onSaveTime}
                    onCancelEditTime={onCancelEditTime}
                    onUndo={onUndo}
                    onUndoGhost={onUndoGhost}
                    onCancelPendingMove={onCancelPendingMove}
                    onNudge={(entry, dir) => onNudge(route.id, entry, dir)}
                    busy={busy}
                />
            ))}
        </div>
    );
}

export function PlanDragPreview({ name }: { name: string }) {
    return (
        <div className="flex items-center gap-2 rounded-xl border border-[var(--cort-orange)] bg-[var(--bg-card)] px-3 py-2.5 text-sm shadow-[var(--shadow-modal)]">
            <ArrowLeftRight className="h-4 w-4 text-[var(--cort-orange)]" />
            <span className="font-semibold text-[var(--text-primary)]">{name}</span>
        </div>
    );
}

export function PlanBoardSkeleton() {
    return (
        <div className="flex gap-4">
            {[0, 1, 2].map((i) => (
                <div key={i} className="h-[420px] min-w-[300px] animate-pulse rounded-2xl bg-[var(--bg-subtle)]" />
            ))}
        </div>
    );
}
