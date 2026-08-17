'use client';

import { useState, useEffect, useMemo } from 'react';
import { UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/app/admin/components/ui/Badge';
import { adminBtnPrimary, adminInput, adminSelect } from '@/app/admin/components/ui/admin-styles';
import { useAppDispatch, useAppSelector } from '@/app/lib/store/hooks';
import {
    fetchRouteAssignments,
    assignEmployeeToRoute,
    removeEmployeeFromRoute,
    selectRouteAssignments,
    selectAssignmentStatus,
    type Route,
} from '@/app/lib/store/slices/adminRoutesSlice';
import { fetchEmployees, selectEmployees } from '@/app/lib/store/slices/employeeSlice';
import { format12h, initials } from '../../RouteCommandBar';
import { getOfficeStops } from '@/app/lib/utils/routeStops';

export default function RosteringTab({ route }: { route: Route }) {
    const dispatch = useAppDispatch();
    const assignments = useAppSelector(selectRouteAssignments);
    const assignmentStatus = useAppSelector(selectAssignmentStatus);
    const employees = useAppSelector(selectEmployees);

    const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
    const [selectedStopId, setSelectedStopId] = useState<number | ''>('');
    const [selectedOfficeStopId, setSelectedOfficeStopId] = useState<number | ''>('');
    const [search, setSearch] = useState('');

    // A route may have multiple OFFICE-type stops (multi-office shuttle support).
    const officeStops = getOfficeStops(route.route_stops ?? []);
    const officeStopIds = new Set(officeStops.map((s) => s.id));
    const hasMultipleOffices = officeStops.length > 1;

    useEffect(() => {
        if (route.id && route.company_id) {
            setSelectedEmployeeId('');
            setSelectedStopId('');
            setSelectedOfficeStopId('');
            dispatch(fetchRouteAssignments(route.id));
            dispatch(fetchEmployees(route.company_id.toString()));
        }
    }, [dispatch, route.id, route.company_id]);

    // Default-select the single office stop so single-office routes need no extra input.
    useEffect(() => {
        if (!hasMultipleOffices && officeStops.length === 1) {
            setSelectedOfficeStopId(officeStops[0].id);
        } else if (!hasMultipleOffices) {
            setSelectedOfficeStopId('');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [route.id, hasMultipleOffices, officeStops.length]);

    const handleAssign = async () => {
        if (!selectedEmployeeId || !selectedStopId) {
            toast.error('Select a person and a pickup');
            return;
        }
        if (hasMultipleOffices && !selectedOfficeStopId) {
            toast.error('Select which office this person is assigned to');
            return;
        }
        try {
            await dispatch(assignEmployeeToRoute({
                user_id: selectedEmployeeId,
                route_id: route.id,
                pickup_stop_id: Number(selectedStopId),
                ...(hasMultipleOffices ? { office_stop_id: Number(selectedOfficeStopId) } : {}),
            })).unwrap();
            toast.success('Added to this route');
            setSelectedEmployeeId('');
            setSelectedStopId('');
            setSelectedOfficeStopId(hasMultipleOffices ? '' : selectedOfficeStopId);
        } catch {
            toast.error('Could not add this person');
        }
    };

    const handleRemove = async (userId: string) => {
        if (!confirm('Remove this person from the standing roster?')) return;
        try {
            await dispatch(removeEmployeeFromRoute(userId)).unwrap();
            toast.success('Removed from this route');
        } catch {
            toast.error('Could not remove this person');
        }
    };

    // Office stops are not assignable as a pickup.
    const pickupStops = (route.route_stops ?? []).filter((s) => !officeStopIds.has(s.id));
    const assignedUserIds = new Set(assignments.map((a) => a.user_id));
    const availableEmployees = employees.filter((emp) => !assignedUserIds.has(emp.id));

    const stopById = useMemo(() => {
        const map = new Map((route.route_stops ?? []).map((s) => [s.id, s]));
        return map;
    }, [route.route_stops]);

    const visible = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return assignments;
        return assignments.filter((a) => {
            const name = a.users?.full_name ?? '';
            const pickup = a.route_stops?.name ?? '';
            const office = a.office_route_stops?.name ?? '';
            return `${name} ${pickup} ${office}`.toLowerCase().includes(q);
        });
    }, [assignments, search]);

    return (
        <div className="space-y-4">
            <div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">Who normally rides this route</h3>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                    This is the standing roster. Day-of moves live on Today&apos;s shuttle plan.
                </p>
            </div>

            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 shadow-[var(--shadow-card)]">
                <div className={`grid grid-cols-1 items-end gap-3 ${hasMultipleOffices ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}>
                    <div>
                        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Employee</label>
                        <select
                            className={adminSelect}
                            value={selectedEmployeeId}
                            onChange={(e) => setSelectedEmployeeId(e.target.value)}
                        >
                            <option value="">Select employee</option>
                            {availableEmployees.map((emp) => (
                                <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Pickup</label>
                        <select
                            className={adminSelect}
                            value={selectedStopId}
                            onChange={(e) => setSelectedStopId(e.target.value ? Number(e.target.value) : '')}
                        >
                            <option value="">Select pickup</option>
                            {pickupStops.map((stop) => (
                                <option key={stop.id} value={stop.id}>
                                    {stop.name}{stop.morning_eta ? ` · ${format12h(stop.morning_eta) ?? stop.morning_eta}` : ''}
                                </option>
                            ))}
                        </select>
                        <p className="mt-1 text-[11px] text-[var(--text-muted)]">Office is excluded — people board at pickups only.</p>
                    </div>
                    {hasMultipleOffices && (
                        <div>
                            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Office</label>
                            <select
                                className={adminSelect}
                                value={selectedOfficeStopId}
                                onChange={(e) => setSelectedOfficeStopId(e.target.value ? Number(e.target.value) : '')}
                            >
                                <option value="">Select office</option>
                                {officeStops.map((stop) => (
                                    <option key={stop.id} value={stop.id}>{stop.name}</option>
                                ))}
                            </select>
                            <p className="mt-1 text-[11px] text-[var(--text-muted)]">This route has multiple offices — pick which one this person is assigned to.</p>
                        </div>
                    )}
                    <button
                        type="button"
                        onClick={() => void handleAssign()}
                        disabled={assignmentStatus === 'loading'}
                        className={adminBtnPrimary}
                    >
                        <UserPlus className="mr-2 h-4 w-4" />
                        {assignmentStatus === 'loading' ? 'Adding…' : 'Add to route'}
                    </button>
                </div>
            </div>

            <label className="block max-w-sm">
                <span className="sr-only">Search roster</span>
                <input
                    className={adminInput}
                    placeholder={hasMultipleOffices ? 'Search name, pickup, or office' : 'Search name or pickup'}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </label>

            {visible.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-[var(--border-default)] py-10 text-center text-sm text-[var(--text-muted)]">
                    {assignments.length === 0 ? 'No one is on this route yet.' : 'No one matches that search.'}
                </p>
            ) : (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {visible.map((assignment) => {
                        const name = assignment.users?.full_name ?? 'Employee';
                        const stop = assignment.pickup_stop_id ? stopById.get(assignment.pickup_stop_id) : undefined;
                        const pickupName = assignment.route_stops?.name ?? stop?.name ?? 'Pickup';
                        const officeName = assignment.office_route_stops?.name ?? null;
                        const time = format12h(stop?.morning_eta ?? null);
                        return (
                            <div
                                key={assignment.user_id}
                                className="flex items-start gap-3 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 shadow-[var(--shadow-card)]"
                            >
                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--cort-navy)] text-xs font-bold text-white">
                                    {initials(name)}
                                </span>
                                <div className="min-w-0 flex-1">
                                    <div className="font-semibold text-[var(--text-primary)]">{name}</div>
                                    {assignment.users?.email && (
                                        <div className="truncate text-xs text-[var(--text-muted)]">{assignment.users.email}</div>
                                    )}
                                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                        <Badge color="gray">{pickupName}</Badge>
                                        {hasMultipleOffices && officeName && <Badge color="purple">{officeName}</Badge>}
                                        {time && <span className="text-xs text-[var(--text-muted)]">{time}</span>}
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => void handleRemove(assignment.user_id)}
                                    className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-rose-600 hover:bg-rose-500/10"
                                >
                                    Remove
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
