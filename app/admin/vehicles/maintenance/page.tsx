"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { useAppDispatch, useAppSelector } from "../../../lib/store/hooks";
import { useAuth } from "../../../lib/contexts/auth-context";
import { PermissionGate } from "../../components/PermissionGate";
import { AdminCan, useAdminAbility } from "../../../lib/abilities/AdminAbilityProvider";
import { ADMIN_SUBJECTS } from "../../../lib/abilities/admin-subjects";
import {
    fetchMaintenanceRecords,
    fetchUpcomingMaintenance,
    createMaintenanceRecord,
    updateMaintenanceRecord,
    deleteMaintenanceRecord,
    fetchAdminVehicles,
    selectMaintenanceRecords,
    selectUpcomingMaintenance,
    selectMaintenanceStatus,
    selectMaintenanceActionStatus,
    selectMaintenanceActionError,
    selectAdminVehicles,
    selectMaintenanceFilters,
    resetMaintenanceActionStatus
} from "../../../lib/store/slices/adminVehiclesSlice";
import {
    MaintenanceRecord,
    MaintenanceType,
    CreateMaintenanceRecordRequest,
    UpdateMaintenanceRecordRequest,
    QueryMaintenanceRecordParams,
    OwnershipType,
} from "../../../lib/services/api-client";
import { useDebounce } from "../../../lib/hooks/useDebounce";

export default function MaintenancePage() {
    return (
        <PermissionGate permission="maintenance">
            <AdminCan I="read" a="Maintenance">
                <MaintenancePageContent />
            </AdminCan>
        </PermissionGate>
    );
}

function MaintenancePageContent() {
    const dispatch = useAppDispatch();
    const { user, isSuperAdmin } = useAuth();
    const ability = useAdminAbility();
    const canCreate = ability.can("create", ADMIN_SUBJECTS.maintenance);
    const canUpdate = ability.can("update", ADMIN_SUBJECTS.maintenance);
    const canDelete = ability.can("delete", ADMIN_SUBJECTS.maintenance);

    const records = useAppSelector(selectMaintenanceRecords);
    const vehicles = useAppSelector(selectAdminVehicles);
    const upcomingMaintenance = useAppSelector(selectUpcomingMaintenance);
    const status = useAppSelector(selectMaintenanceStatus);
    const actionStatus = useAppSelector(selectMaintenanceActionStatus);
    const actionError = useAppSelector(selectMaintenanceActionError);
    const savedFilters = useAppSelector(selectMaintenanceFilters);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<"create" | "edit">("create");
    const [selectedRecord, setSelectedRecord] = useState<MaintenanceRecord | null>(null);

    // Filters - Initialize from Redux
    const [filterVehicleId, setFilterVehicleId] = useState<number | "ALL">(savedFilters.filterVehicleId);
    const [filterType, setFilterType] = useState<MaintenanceType | "ALL">(savedFilters.filterType);
    const [startDate, setStartDate] = useState(savedFilters.startDate);
    const [endDate, setEndDate] = useState(savedFilters.endDate);

    // Form Data
    const [formData, setFormData] = useState<Partial<CreateMaintenanceRecordRequest>>({});

    // Sync local state with Redux
    useEffect(() => {
        setFilterVehicleId(savedFilters.filterVehicleId);
        setFilterType(savedFilters.filterType);
        setStartDate(savedFilters.startDate);
        setEndDate(savedFilters.endDate);
    }, [savedFilters]);

    const loadData = useCallback(() => {
        const params: QueryMaintenanceRecordParams = { limit: 100 };
        if (filterVehicleId !== "ALL") params.vehicle_id = filterVehicleId;
        if (filterType !== "ALL") params.maintenance_type = filterType;
        if (startDate) params.start_date = startDate;
        if (endDate) params.end_date = endDate;

        dispatch(fetchMaintenanceRecords(params));
        dispatch(fetchUpcomingMaintenance());
    }, [dispatch, filterVehicleId, filterType, startDate, endDate]);

    useEffect(() => {
        // Fetch only OWNED vehicles for maintenance
        dispatch(fetchAdminVehicles({ limit: 500, show_all: true, ownership: OwnershipType.OWNED }));
    }, [dispatch]);

    useEffect(() => {
        const filtersChanged =
            filterVehicleId !== savedFilters.filterVehicleId ||
            filterType !== savedFilters.filterType ||
            startDate !== savedFilters.startDate ||
            endDate !== savedFilters.endDate;

        if (status === 'idle' || filtersChanged) {
            if (status === 'succeeded' && !filtersChanged) {
                return;
            }
            loadData();
        }
    }, [filterVehicleId, filterType, startDate, endDate, status, savedFilters, loadData]);

    // Handle action updates
    useEffect(() => {
        if (actionStatus === 'succeeded') {
            closeModal();
            dispatch(resetMaintenanceActionStatus());
            loadData();
        } else if (actionStatus === 'failed') {
            toast.error(actionError || "Action failed");
            dispatch(resetMaintenanceActionStatus());
        }
    }, [actionStatus, dispatch, loadData]);


    const handleCreate = () => {
        if (!formData.vehicle_id || !formData.maintenance_type || !formData.date || !formData.odometer_reading) {
            alert("Please fill all required fields");
            return;
        }
        dispatch(createMaintenanceRecord(formData as CreateMaintenanceRecordRequest));
    };

    const handleUpdate = () => {
        if (!selectedRecord) return;
        dispatch(updateMaintenanceRecord({ id: selectedRecord.id, data: formData as UpdateMaintenanceRecordRequest }));
    };

    const handleDelete = async (record: MaintenanceRecord) => {
        const isOwner = isSuperAdmin || record.created_by === user?.id;
        const confirmMessage = isOwner
            ? "Are you sure you want to delete this maintenance record?"
            : "You didn't add this record. Deleting it will send a request to the super admin for approval. Continue?";
        if (!confirm(confirmMessage)) return;

        try {
            const result = await dispatch(deleteMaintenanceRecord(record.id)).unwrap();
            if (result.requiresApproval) {
                toast.success(result.message || "Delete request sent for super admin approval");
            } else {
                toast.success("Maintenance record deleted");
            }
        } catch (err: any) {
            toast.error(err || "Failed to delete maintenance record");
        }
    };

    const startCreate = () => {
        setSelectedRecord(null);
        setFormData({
            date: new Date().toISOString().split('T')[0],
            maintenance_type: MaintenanceType.OIL_CHANGE,
        });
        setModalMode("create");
        setIsModalOpen(true);
    };

    const startEdit = (record: MaintenanceRecord) => {
        setSelectedRecord(record);
        // Format date to YYYY-MM-DD for input[type="date"]
        const formattedDate = record.date ? record.date.split('T')[0] : "";
        setFormData({
            vehicle_id: record.vehicle_id,
            maintenance_type: record.maintenance_type,
            date: formattedDate,
            odometer_reading: record.odometer_reading,
            cost: record.cost || undefined,
            notes: record.notes || undefined,
        });
        setModalMode("edit");
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedRecord(null);
        setFormData({});
    };

    const getTypeColor = (type: MaintenanceType) => {
        const colors: Record<MaintenanceType, string> = {
            [MaintenanceType.OIL_CHANGE]: "bg-blue/10 text-blue",
            [MaintenanceType.TIRE_ROTATION]: "bg-purple/10 text-purple",
            [MaintenanceType.BRAKE_SERVICE]: "bg-danger/10 text-danger",
            [MaintenanceType.GENERAL_INSPECTION]: "bg-success/10 text-success",
            [MaintenanceType.REPAIR]: "bg-orange/10 text-orange",
            [MaintenanceType.OTHER]: "bg-gray-500/10 text-gray-700",
        };
        return colors[type] || "bg-gray-500/10 text-gray-700";
    };

    const renderForm = () => (
        <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 sm:col-span-2">
                <span className="text-xs font-semibold tracking-wider text-muted">Vehicle *</span>
                <select
                    value={formData.vehicle_id || ""}
                    onChange={(e) => setFormData({ ...formData, vehicle_id: Number(e.target.value) })}
                    className="h-10 rounded-md border border-border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-blue/40"
                >
                    <option value="">Select Vehicle</option>
                    {vehicles.map((v) => (
                        <option key={v.id} value={v.id}>
                            {v.plate_number} - {v.make} {v.model}
                        </option>
                    ))}
                </select>
            </label>
            <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold tracking-wider text-muted">Maintenance Type *</span>
                <select
                    value={formData.maintenance_type || ""}
                    onChange={(e) => setFormData({ ...formData, maintenance_type: e.target.value as MaintenanceType })}
                    className="h-10 rounded-md border border-border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-blue/40"
                >
                    {Object.values(MaintenanceType).map((type) => (
                        <option key={type} value={type}>
                            {type.replace(/_/g, ' ')}
                        </option>
                    ))}
                </select>
            </label>
            <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold tracking-wider text-muted">Date *</span>
                <input
                    type="date"
                    value={formData.date || ""}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="h-10 rounded-md border border-border px-3 text-sm outline-none focus:ring-2 focus:ring-blue/40"
                />
            </label>
            <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold tracking-wider text-muted">Odometer Reading (KM) *</span>
                <input
                    type="number"
                    value={formData.odometer_reading || ""}
                    onChange={(e) => setFormData({ ...formData, odometer_reading: Number(e.target.value) })}
                    className="h-10 rounded-md border border-border px-3 text-sm outline-none focus:ring-2 focus:ring-blue/40"
                    placeholder="125000"
                />
            </label>
            <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold tracking-wider text-muted">Cost (PKR)</span>
                <input
                    type="number"
                    step="0.01"
                    value={formData.cost || ""}
                    onChange={(e) => setFormData({ ...formData, cost: Number(e.target.value) })}
                    className="h-10 rounded-md border border-border px-3 text-sm outline-none focus:ring-2 focus:ring-blue/40"
                    placeholder="5000.00"
                />
            </label>
            <label className="flex flex-col gap-1 sm:col-span-2">
                <span className="text-xs font-semibold tracking-wider text-muted">Notes</span>
                <textarea
                    value={formData.notes || ""}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="min-h-[80px] rounded-md border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue/40"
                    placeholder="Additional notes about this maintenance..."
                />
            </label>
            {formData.maintenance_type === MaintenanceType.OIL_CHANGE && formData.odometer_reading && (
                <div className="col-span-full rounded-lg border border-border bg-blue/5 p-4">
                    <div className="text-xs font-semibold tracking-wider text-muted">NEXT OIL CHANGE DUE</div>
                    <div className="mt-1 text-2xl font-bold text-blue">
                        {formData.odometer_reading + 5000} KM
                    </div>
                    <div className="text-xs text-muted mt-1">Auto-calculated: Current + 5,000 km</div>
                </div>
            )}
        </div>
    );

    const isLoading = status === 'loading';
    const isSubmitting = actionStatus === 'loading';

    return (
        <div className="flex flex-col gap-6">
            <div>
                <div className="text-sm font-medium text-muted">Admin / Vehicles</div>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight text-navy">Maintenance Records</h1>
            </div>

            {/* Upcoming Maintenance Alert */}
            {upcomingMaintenance && upcomingMaintenance.length > 0 && (
                <div className="rounded-xl border border-orange bg-orange/5 p-4">
                    <div className="flex items-start gap-3">
                        <div className="rounded-lg bg-orange/10 p-2">
                            <svg className="h-5 w-5 text-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <div className="flex-1">
                            <div className="font-semibold text-orange">Vehicles Due for Maintenance</div>
                            <div className="mt-2 space-y-1 text-sm">
                                {upcomingMaintenance.map((m) => (
                                    <div key={m.vehicle_id} className="flex items-center gap-2">
                                        <span className="font-medium">{m.plate_number}</span>
                                        <span className="text-muted">·</span>
                                        <span className="text-muted">Next service at {m.next_service_odometer} km</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-white p-4">
                <select
                    value={filterVehicleId}
                    onChange={(e) => setFilterVehicleId(e.target.value === "ALL" ? "ALL" : Number(e.target.value))}
                    className="h-10 rounded-md border border-border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-blue/40"
                >
                    <option value="ALL">All Vehicles</option>
                    {vehicles.map((v) => (
                        <option key={v.id} value={v.id}>
                            {v.plate_number}
                        </option>
                    ))}
                </select>
                <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value === "ALL" ? "ALL" : e.target.value as MaintenanceType)}
                    className="h-10 rounded-md border border-border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-blue/40"
                >
                    <option value="ALL">All Types</option>
                    {Object.values(MaintenanceType).map((type) => (
                        <option key={type} value={type}>
                            {type.replace(/_/g, ' ')}
                        </option>
                    ))}
                </select>
                <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="h-10 rounded-md border border-border px-3 text-sm outline-none focus:ring-2 focus:ring-blue/40"
                    placeholder="Start Date"
                />
                <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="h-10 rounded-md border border-border px-3 text-sm outline-none focus:ring-2 focus:ring-blue/40"
                    placeholder="End Date"
                />
                <button
                    type="button"
                    onClick={startCreate}
                    disabled={!canCreate}
                    className="ml-auto inline-flex h-10 items-center justify-center rounded-md bg-orange px-4 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-50 disabled:pointer-events-none"
                >
                    Add Maintenance Record
                </button>
            </div>

            <div className="rounded-xl border border-border bg-white overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead className="bg-surface text-xs font-semibold tracking-wider text-muted">
                            <tr>
                                <th className="px-4 py-3 text-left">Date</th>
                                <th className="px-4 py-3 text-left">Vehicle</th>
                                <th className="px-4 py-3 text-left">Type</th>
                                <th className="px-4 py-3 text-right">Odometer</th>
                                <th className="px-4 py-3 text-right">Next Service</th>
                                <th className="px-4 py-3 text-right">Cost</th>
                                <th className="px-4 py-3 text-left">Added By</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {records.map((r) => (
                                <tr key={r.id} className="hover:bg-surface/50">
                                    <td className="px-4 py-3 font-medium text-ink">{new Date(r.date).toLocaleDateString()}</td>
                                    <td className="px-4 py-3">
                                        <div className="font-medium text-ink">{r.vehicles?.plate_number}</div>
                                        <div className="text-xs text-muted">{r.vehicles?.make} {r.vehicles?.model}</div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getTypeColor(r.maintenance_type)}`}>
                                            {r.maintenance_type.replace(/_/g, ' ')}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right font-semibold">{r.odometer_reading.toLocaleString()} km</td>
                                    <td className="px-4 py-3 text-right text-muted">
                                        {r.next_service_odometer ? `${r.next_service_odometer.toLocaleString()} km` : '-'}
                                    </td>
                                    <td className="px-4 py-3 text-right font-medium text-blue">
                                        {r.cost ? `PKR ${Number(r.cost).toFixed(2)}` : '-'}
                                    </td>
                                    <td className="px-4 py-3 text-muted">{r.added_by_name || "—"}</td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                type="button"
                                                onClick={() => startEdit(r)}
                                                disabled={!canUpdate}
                                                className="inline-flex h-8 items-center justify-center rounded-md border border-border bg-white px-3 text-xs font-medium text-ink hover:bg-surface disabled:opacity-50 disabled:pointer-events-none"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDelete(r)}
                                                disabled={!canDelete}
                                                className="inline-flex h-8 items-center justify-center rounded-md border border-border bg-white px-3 text-xs font-medium text-danger hover:bg-danger/5 disabled:opacity-50 disabled:pointer-events-none"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {!isLoading && records.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="px-4 py-8 text-center text-muted">
                                        No maintenance records found matching your filters.
                                    </td>
                                </tr>
                            )}
                            {isLoading && (
                                <tr>
                                    <td colSpan={8} className="px-4 py-8 text-center text-muted">
                                        Loading...
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200">
                        <div className="mb-6 flex items-center justify-between">
                            <div>
                                <div className="text-xs font-semibold tracking-wider text-muted">
                                    {modalMode === "create" ? "NEW ENTRY" : "EDIT ENTRY"}
                                </div>
                                <h2 className="mt-1 text-2xl font-semibold text-navy">
                                    {modalMode === "create" ? "Add Maintenance Record" : "Edit Maintenance Record"}
                                </h2>
                            </div>
                            <button
                                onClick={closeModal}
                                className="rounded-full p-2 text-muted hover:bg-surface hover:text-ink"
                            >
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="max-h-[70vh] overflow-y-auto pr-2">
                            {renderForm()}
                        </div>

                        <div className="mt-6 flex justify-end gap-3 border-t border-border pt-6">
                            <button
                                onClick={closeModal}
                                disabled={isSubmitting}
                                className="inline-flex h-10 items-center justify-center rounded-md border border-border px-4 text-sm font-medium text-ink hover:bg-surface disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={modalMode === "create" ? handleCreate : handleUpdate}
                                disabled={isSubmitting || (modalMode === "create" ? !canCreate : !canUpdate)}
                                className="inline-flex h-10 items-center justify-center rounded-md bg-blue px-6 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? "Saving..." : (modalMode === "create" ? "Create Record" : "Save Changes")}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
