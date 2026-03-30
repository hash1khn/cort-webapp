"use client";

import { useEffect, useState, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "../../../lib/store/hooks";
import { PermissionGate } from "../../components/PermissionGate";
import { AdminCan, useAdminAbility } from "../../../lib/abilities/AdminAbilityProvider";
import { ADMIN_SUBJECTS } from "../../../lib/abilities/admin-subjects";
import {
    fetchFuelRecords,
    fetchFuelStats,
    createFuelRecord,
    updateFuelRecord,
    deleteFuelRecord,
    fetchAdminVehicles,
    markFuelRecordsAsPaid,
    selectFuelRecords,
    selectFuelStats,
    selectFuelStatus,
    selectFuelActionStatus,
    selectAdminVehicles,
    selectFuelFilters,
    resetFuelActionStatus
} from "../../../lib/store/slices/adminVehiclesSlice";

import {
    FuelRecord,
    CreateFuelRecordRequest,
    UpdateFuelRecordRequest,
    QueryFuelRecordParams,
    OwnershipType,
} from "../../../lib/services/api-client";

export default function FuelingPage() {
    return (
        <PermissionGate permission="fuel_records">
            <AdminCan I="read" a="FuelRecords">
                <FuelingPageContent />
            </AdminCan>
        </PermissionGate>
    );
}

function FuelingPageContent() {
    const dispatch = useAppDispatch();
    const ability = useAdminAbility();
    const canCreate = ability.can("create", ADMIN_SUBJECTS.fuel_records);
    const canUpdate = ability.can("update", ADMIN_SUBJECTS.fuel_records);
    const canDelete = ability.can("delete", ADMIN_SUBJECTS.fuel_records);

    const records = useAppSelector(selectFuelRecords);
    const stats = useAppSelector(selectFuelStats);
    const vehicles = useAppSelector(selectAdminVehicles);
    const status = useAppSelector(selectFuelStatus);
    const actionStatus = useAppSelector(selectFuelActionStatus);
    const savedFilters = useAppSelector(selectFuelFilters);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<"create" | "edit">("create");
    const [selectedRecord, setSelectedRecord] = useState<FuelRecord | null>(null);

    // Filters - Initialize from Redux
    const [filterVehicleId, setFilterVehicleId] = useState<number | "ALL">(savedFilters.filterVehicleId);
    const [filterBilled, setFilterBilled] = useState<boolean | "ALL">(savedFilters.filterBilled);
    const [startDate, setStartDate] = useState(savedFilters.startDate);
    const [endDate, setEndDate] = useState(savedFilters.endDate);

    // Bulk Selection State
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    // Form Data
    const [formData, setFormData] = useState<Partial<CreateFuelRecordRequest>>({});

    // Sync local state with Redux when filters change externally
    useEffect(() => {
        setFilterVehicleId(savedFilters.filterVehicleId);
        setFilterBilled(savedFilters.filterBilled);
        setStartDate(savedFilters.startDate);
        setEndDate(savedFilters.endDate);
    }, [savedFilters]);

    const loadData = useCallback(() => {
        const params: QueryFuelRecordParams = { limit: 100 };
        if (filterVehicleId !== "ALL") params.vehicle_id = filterVehicleId;
        if (filterBilled !== "ALL") params.billed = filterBilled;
        if (startDate) params.start_date = startDate;
        if (endDate) params.end_date = endDate;

        dispatch(fetchFuelRecords(params));
        dispatch(fetchFuelStats());
    }, [dispatch, filterVehicleId, filterBilled, startDate, endDate]);

    useEffect(() => {
        // Only fetch vehicles list once - Include all PARTNER vehicles for Super Admin
        dispatch(fetchAdminVehicles({ limit: 500, show_all: true, ownership: OwnershipType.OWNED }));
    }, [dispatch]);

    useEffect(() => {
        // Check if filters have changed from what's in Redux
        const filtersChanged =
            filterVehicleId !== savedFilters.filterVehicleId ||
            filterBilled !== savedFilters.filterBilled ||
            startDate !== savedFilters.startDate ||
            endDate !== savedFilters.endDate;

        // Only fetch if filters changed or initial load
        if (status === 'idle' || filtersChanged) {
            if (status === 'succeeded' && !filtersChanged) {
                return; // Already have the right data
            }
            loadData();
        }
    }, [filterVehicleId, filterBilled, startDate, endDate, status, savedFilters, loadData]);

    // Handle action updates
    useEffect(() => {
        if (actionStatus === 'succeeded') {
            closeModal();
            setSelectedIds([]); // Clear selection on success
            dispatch(resetFuelActionStatus());
            loadData(); // Re-fetch to update list and stats
        } else if (actionStatus === 'failed') {
            alert("Action failed"); // Could be improved with specific error message from state
            dispatch(resetFuelActionStatus());
        }
    }, [actionStatus, dispatch, loadData]);

    const handleCreate = () => {
        if (!formData.vehicle_id || !formData.date || !formData.fuel_litres || !formData.current_fuel_rate) {
            alert("Please fill all required fields");
            return;
        }
        dispatch(createFuelRecord(formData as CreateFuelRecordRequest));
    };

    const handleUpdate = () => {
        if (!selectedRecord) return;
        dispatch(updateFuelRecord({ id: selectedRecord.id, data: formData as UpdateFuelRecordRequest }));
    };

    const handleDelete = (record: FuelRecord) => {
        if (!confirm(`Are you sure you want to delete this fuel record?`)) return;
        dispatch(deleteFuelRecord(record.id));
    };

    const handleBulkPay = () => {
        if (selectedIds.length === 0) return;
        if (!confirm(`Mark ${selectedIds.length} records as Paid?`)) return;
        dispatch(markFuelRecordsAsPaid(selectedIds));
    };

    const toggleSelectAll = (checked: boolean) => {
        if (checked) {
            // Only select UNPAID records
            const unpaidIds = records
                .filter(r => !r.billed)
                .map(r => r.id);
            setSelectedIds(unpaidIds);
        } else {
            setSelectedIds([]);
        }
    };

    const toggleSelectId = (id: number, checked: boolean) => {
        if (checked) {
            setSelectedIds(prev => [...prev, id]);
        } else {
            setSelectedIds(prev => prev.filter(mid => mid !== id));
        }
    };

    const startCreate = () => {
        setSelectedRecord(null);
        setFormData({
            date: new Date().toISOString().split('T')[0],
            // billed: false // Default handled by backend
        });
        setModalMode("create");
        setIsModalOpen(true);
    };

    const startEdit = (record: FuelRecord) => {
        setSelectedRecord(record);
        // Format date to YYYY-MM-DD for input[type="date"]
        const formattedDate = record.date ? record.date.split('T')[0] : "";
        setFormData({
            vehicle_id: record.vehicle_id,
            date: formattedDate,
            fuel_litres: record.fuel_litres,
            current_fuel_rate: record.current_fuel_rate,
            billed: record.billed,
        });
        setModalMode("edit");
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedRecord(null);
        setFormData({});
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
                <span className="text-xs font-semibold tracking-wider text-muted">Date *</span>
                <input
                    type="date"
                    value={formData.date || ""}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="h-10 rounded-md border border-border px-3 text-sm outline-none focus:ring-2 focus:ring-blue/40"
                />
            </label>
            <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold tracking-wider text-muted">Fuel Litres *</span>
                <input
                    type="number"
                    step="0.01"
                    value={formData.fuel_litres || ""}
                    onChange={(e) => setFormData({ ...formData, fuel_litres: Number(e.target.value) })}
                    className="h-10 rounded-md border border-border px-3 text-sm outline-none focus:ring-2 focus:ring-blue/40"
                    placeholder="50.00"
                />
            </label>
            <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold tracking-wider text-muted">Fuel Rate (PKR/L) *</span>
                <input
                    type="number"
                    step="0.01"
                    value={formData.current_fuel_rate || ""}
                    onChange={(e) => setFormData({ ...formData, current_fuel_rate: Number(e.target.value) })}
                    className="h-10 rounded-md border border-border px-3 text-sm outline-none focus:ring-2 focus:ring-blue/40"
                    placeholder="280.00"
                />
            </label>

            {/* Removed "Mark as Billed" checkbox for creation */}
            {modalMode === "edit" && (
                <label className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        checked={formData.billed || false}
                        onChange={(e) => setFormData({ ...formData, billed: e.target.checked })}
                        className="h-4 w-4 rounded border-border text-blue focus:ring-2 focus:ring-blue/40"
                    />
                    <span className="text-sm font-medium text-ink">Paid</span>
                </label>
            )}

            {formData.fuel_litres && formData.current_fuel_rate && (
                <div className="col-span-full rounded-lg border border-border bg-blue/5 p-4">
                    <div className="text-xs font-semibold tracking-wider text-muted">CALCULATED COST</div>
                    <div className="mt-1 text-2xl font-bold text-blue">
                        PKR {(formData.fuel_litres * formData.current_fuel_rate).toFixed(2)}
                    </div>
                </div>
            )}
        </div>
    );

    const isLoading = status === 'loading';
    const isSubmitting = actionStatus === 'loading';

    // Count unpaid records for select all logic
    const unpaidRecordsCount = records.filter(r => !r.billed).length;
    const isAllSelected = unpaidRecordsCount > 0 && selectedIds.length === unpaidRecordsCount;

    return (
        <div className="flex flex-col gap-6">
            <div>
                <div className="text-sm font-medium text-muted">Admin / Vehicles</div>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight text-navy">Fuel Records</h1>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-xl border border-border bg-white p-4">
                        <div className="text-xs font-semibold tracking-wider text-muted">TOTAL FUEL COST</div>
                        <div className="mt-2 text-2xl font-bold text-navy">PKR {Number(stats.total_fuel_cost).toFixed(2)}</div>
                    </div>
                    <div className="rounded-xl border border-border bg-white p-4">
                        <div className="text-xs font-semibold tracking-wider text-muted">AVERAGE FUEL RATE</div>
                        <div className="mt-2 text-2xl font-bold text-navy">PKR {Number(stats.average_fuel_rate).toFixed(2)}/L</div>
                    </div>
                    <div className="rounded-xl border border-border bg-white p-4">
                        <div className="text-xs font-semibold tracking-wider text-muted">TOTAL RECORDS</div>
                        <div className="mt-2 text-2xl font-bold text-navy">{stats.total_records}</div>
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
                    value={String(filterBilled)}
                    onChange={(e) => setFilterBilled(e.target.value === "ALL" ? "ALL" : e.target.value === "true")}
                    className="h-10 rounded-md border border-border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-blue/40"
                >
                    <option value="ALL">All Status</option>
                    <option value="true">Paid</option>
                    <option value="false">Unpaid</option>
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

                {/* Bulk Action Button */}
                {selectedIds.length > 0 && (
                    <button
                        type="button"
                        onClick={handleBulkPay}
                        disabled={isSubmitting || !canUpdate}
                        className="ml-auto inline-flex h-10 items-center justify-center rounded-md bg-success px-4 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-50 disabled:pointer-events-none"
                    >
                        Mark {selectedIds.length} as Paid
                    </button>
                )}

                <button
                    type="button"
                    onClick={startCreate}
                    disabled={!canCreate}
                    className={`${selectedIds.length === 0 ? "ml-auto" : ""} inline-flex h-10 items-center justify-center rounded-md bg-orange px-4 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-50 disabled:pointer-events-none`}
                >
                    Add Fuel Record
                </button>
            </div>

            <div className="rounded-xl border border-border bg-white overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead className="bg-surface text-xs font-semibold tracking-wider text-muted">
                            <tr>
                                <th className="px-4 py-3 text-center">
                                    <input
                                        type="checkbox"
                                        className="h-4 w-4 rounded border-border text-blue focus:ring-2 focus:ring-blue/40"
                                        checked={isAllSelected}
                                        onChange={(e) => toggleSelectAll(e.target.checked)}
                                        disabled={!canUpdate}
                                    />
                                </th>
                                <th className="px-4 py-3 text-left">Date</th>
                                <th className="px-4 py-3 text-left">Vehicle</th>
                                <th className="px-4 py-3 text-right">Litres</th>
                                <th className="px-4 py-3 text-right">Rate (PKR/L)</th>
                                <th className="px-4 py-3 text-right">Total Cost</th>
                                <th className="px-4 py-3 text-center">Status</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {records.map((r) => (
                                <tr key={r.id} className="hover:bg-surface/50">
                                    <td className="px-4 py-3 text-center">
                                        {!r.billed && (
                                            <input
                                                type="checkbox"
                                                className="h-4 w-4 rounded border-border text-blue focus:ring-2 focus:ring-blue/40"
                                                checked={selectedIds.includes(r.id)}
                                                onChange={(e) => toggleSelectId(r.id, e.target.checked)}
                                                disabled={!canUpdate}
                                            />
                                        )}
                                    </td>
                                    <td className="px-4 py-3 font-medium text-ink">{new Date(r.date).toLocaleDateString()}</td>
                                    <td className="px-4 py-3">
                                        <div className="font-medium text-ink">{r.vehicles?.plate_number}</div>
                                        <div className="text-xs text-muted">{r.vehicles?.make} {r.vehicles?.model}</div>
                                    </td>
                                    <td className="px-4 py-3 text-right font-semibold">{Number(r.fuel_litres)} L</td>
                                    <td className="px-4 py-3 text-right">PKR {Number(r.current_fuel_rate).toFixed(2)}</td>
                                    <td className="px-4 py-3 text-right font-bold text-blue">PKR {Number(r.fuel_cost).toFixed(2)}</td>
                                    <td className="px-4 py-3 text-center">
                                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${r.billed ? "bg-success/10 text-success" : "bg-orange/10 text-orange"}`}>
                                            {r.billed ? "Paid" : "Unpaid"}
                                        </span>
                                    </td>
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
                                        No fuel records found matching your filters.
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
                                    {modalMode === "create" ? "Add Fuel Record" : "Edit Fuel Record"}
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
