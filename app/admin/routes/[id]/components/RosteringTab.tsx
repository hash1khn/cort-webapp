'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/app/admin/ui/Button';
import { Card } from '@/app/admin/ui/Card';
import { Input } from '@/app/admin/ui/Input';
import { Label } from '@/app/admin/ui/Label';
import { useAppDispatch, useAppSelector } from '@/app/lib/store/hooks';
import {
    fetchRouteAssignments,
    assignEmployeeToRoute,
    removeEmployeeFromRoute,
    selectRouteAssignments,
    selectAssignmentStatus
} from '@/app/lib/store/slices/adminRoutesSlice';
import { fetchEmployees, selectEmployees } from '@/app/lib/store/slices/employeeSlice';
import { Route } from '@/app/lib/store/slices/adminRoutesSlice';
import { Trash, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

interface RosteringTabProps {
    route: Route;
}

export default function RosteringTab({ route }: RosteringTabProps) {
    const dispatch = useAppDispatch();
    const assignments = useAppSelector(selectRouteAssignments);
    const assignmentStatus = useAppSelector(selectAssignmentStatus);
    const employees = useAppSelector(selectEmployees);

    const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
    const [selectedStopId, setSelectedStopId] = useState<number | ''>('');
    const [isAdding, setIsAdding] = useState(false);

    useEffect(() => {
        if (route.id && route.company_id) {
            dispatch(fetchRouteAssignments(route.id));
            dispatch(fetchEmployees(route.company_id.toString()));
        }
    }, [dispatch, route.id, route.company_id]);

    const handleAssign = async () => {
        if (!selectedEmployeeId || !selectedStopId) {
            toast.error('Please select an employee and a pickup stop');
            return;
        }

        try {
            await dispatch(assignEmployeeToRoute({
                user_id: selectedEmployeeId,
                route_id: route.id,
                pickup_stop_id: Number(selectedStopId)
            })).unwrap();

            toast.success('Employee assigned successfully');
            setSelectedEmployeeId('');
            setSelectedStopId('');
            setIsAdding(false);
        } catch (error) {
            toast.error('Failed to assign employee');
        }
    };

    const handleRemove = async (userId: string) => {
        if (confirm('Are you sure you want to remove this employee from the roster?')) {
            try {
                await dispatch(removeEmployeeFromRoute(userId)).unwrap();
                toast.success('Employee removed successfully');
            } catch (error) {
                toast.error('Failed to remove employee');
            }
        }
    };

    // Office = highest morning_sequence (last AM stop). Not assignable as a pickup.
    const officeStopId = (() => {
        const stops = route.route_stops ?? [];
        const withMorning = stops.filter((s) => s.morning_sequence != null);
        if (withMorning.length === 0) return null;
        const maxSeq = Math.max(...withMorning.map((s) => s.morning_sequence!));
        return withMorning.find((s) => s.morning_sequence === maxSeq)?.id ?? null;
    })();
    const pickupStops = (route.route_stops ?? []).filter((s) => s.id !== officeStopId);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Employee Roster ({assignments.length})</h3>
                <Button onClick={() => setIsAdding(!isAdding)}>
                    <UserPlus className="w-4 h-4 mr-2" />
                    {isAdding ? 'Cancel' : 'Add Employee'}
                </Button>
            </div>

            {isAdding && (
                <Card className="p-4 bg-gray-50 border-dashed">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                        <div>
                            <Label>Employee</Label>
                            <select
                                className="w-full border rounded p-2"
                                value={selectedEmployeeId}
                                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                            >
                                <option value="">Select Employee</option>
                                {employees.map(emp => (
                                    <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <Label>Pickup Stop</Label>
                            <select
                                className="w-full border rounded p-2"
                                value={selectedStopId}
                                onChange={(e) => setSelectedStopId(Number(e.target.value))}
                            >
                                <option value="">Select Stop</option>
                                {pickupStops.map(stop => (
                                    <option key={stop.id} value={stop.id}>
                                        {stop.name} ({stop.morning_eta || 'No ETA'})
                                    </option>
                                ))}
                            </select>
                            <p className="text-[11px] text-gray-400 mt-1">
                                Office stop is excluded — employees board at pickups only.
                            </p>
                        </div>
                        <Button onClick={handleAssign} disabled={assignmentStatus === 'loading'}>
                            {assignmentStatus === 'loading' ? 'Assigning...' : 'Assign'}
                        </Button>
                    </div>
                </Card>
            )}

            <div className="bg-white rounded-md border text-sm">
                <div className="grid grid-cols-4 bg-gray-50 p-3 font-semibold border-b">
                    <div className="col-span-1">Employee Name</div>
                    <div className="col-span-1">Email</div>
                    <div className="col-span-1">Pickup Stop</div>
                    <div className="col-span-1 text-right">Actions</div>
                </div>
                {assignments.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        No employees assigned to this route yet.
                    </div>
                ) : (
                    assignments.map((assignment) => (
                        <div key={assignment.user_id} className="grid grid-cols-4 p-3 border-b last:border-0 items-center hover:bg-gray-50">
                            <div className="col-span-1 font-medium">{assignment.users?.full_name}</div>
                            <div className="col-span-1 text-gray-500">{assignment.users?.email}</div>
                            <div className="col-span-1">
                                {assignment.route_stops?.name}
                            </div>
                            <div className="col-span-1 text-right">
                                <button
                                    onClick={() => handleRemove(assignment.user_id)}
                                    className="text-red-500 hover:text-red-700 p-1"
                                >
                                    <Trash className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
