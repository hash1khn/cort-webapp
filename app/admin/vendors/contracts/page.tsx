'use client';

import { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/app/lib/store/hooks';
import {
    fetchVendorContracts,
    createVendorContract,
    updateVendorContract,
    deleteVendorContract,
    resetActionStatus,
    selectVendorContracts,
    selectVendorContractsStatus,
    selectVendorContractsActionStatus,
    selectVendorContractsError,
    selectVendorContractsPagination,
} from '@/app/lib/store/slices/vendorContractsSlice';
import { VendorContract, ContractStatus, CreateVendorContractRequest } from '@/app/lib/services/api-client';
import { apiClient } from '@/app/lib/services/api-client';

export default function VendorContractsPage() {
    const dispatch = useAppDispatch();
    const contracts = useAppSelector(selectVendorContracts);
    const status = useAppSelector(selectVendorContractsStatus);
    const actionStatus = useAppSelector(selectVendorContractsActionStatus);
    const error = useAppSelector(selectVendorContractsError);
    const pagination = useAppSelector(selectVendorContractsPagination);

    const [showModal, setShowModal] = useState(false);
    const [editingContract, setEditingContract] = useState<VendorContract | null>(null);
    const [vendors, setVendors] = useState<any[]>([]);
    const [vehicles, setVehicles] = useState<any[]>([]);
    const [formData, setFormData] = useState<CreateVendorContractRequest>({
        vendor_id: 0,
        vehicle_id: 0,
        month: '',
        total_payable: 0,
        status: ContractStatus.ACTIVE,
        notes: '',
    });

    // Filters
    const [monthFilter, setMonthFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState<ContractStatus | undefined>(undefined);

    useEffect(() => {
        loadContracts();
        loadVendors();
        loadVehicles();
    }, []);

    useEffect(() => {
        if (actionStatus === 'succeeded') {
            setShowModal(false);
            setEditingContract(null);
            resetForm();
            dispatch(resetActionStatus());
        }
    }, [actionStatus]);

    const loadContracts = () => {
        dispatch(fetchVendorContracts({
            page: pagination.page,
            limit: pagination.limit,
            month: monthFilter || undefined,
            status: statusFilter,
        }));
    };

    const loadVendors = async () => {
        try {
            const response = await apiClient.getVendors({ limit: 100 });
            setVendors(response.data.data);
        } catch (error) {
            console.error('Failed to load vendors:', error);
        }
    };

    const loadVehicles = async () => {
        try {
            const response = await apiClient.getVehicles({ limit: 200, show_all: true });
            setVehicles(response.data.data);
        } catch (error) {
            console.error('Failed to load vehicles:', error);
        }
    };

    const resetForm = () => {
        setFormData({
            vendor_id: 0,
            vehicle_id: 0,
            month: '',
            total_payable: 0,
            status: ContractStatus.ACTIVE,
            notes: '',
        });
    };

    const handleApplyFilters = () => {
        dispatch(fetchVendorContracts({
            page: 1,
            limit: pagination.limit,
            month: monthFilter || undefined,
            status: statusFilter,
        }));
    };

    const handleClearFilters = () => {
        setMonthFilter('');
        setStatusFilter(undefined);
        dispatch(fetchVendorContracts({
            page: 1,
            limit: pagination.limit,
        }));
    };

    // Auto-fill logic
    useEffect(() => {
        if (formData.vehicle_id) {
            const vehicle = vehicles.find(v => v.id === formData.vehicle_id);
            if (vehicle) {
                // 1. Auto-select vendor if vehicle has one
                if (vehicle.vendor_id && !editingContract) {
                    setFormData(prev => ({ ...prev, vendor_id: vehicle.vendor_id }));
                }

                // 2. Auto-calculate total payable if rent_per_day exists and month is valid
                if (vehicle.rent_per_day && formData.month && !editingContract) {
                    const [yearStr, monthStr] = formData.month.split('-');
                    const year = parseInt(yearStr);
                    const month = parseInt(monthStr);

                    if (!isNaN(year) && !isNaN(month)) {
                        const daysInMonth = new Date(year, month, 0).getDate();
                        const dailyRate = Number(vehicle.rent_per_day);
                        const total = dailyRate * daysInMonth;
                        setFormData(prev => ({ ...prev, total_payable: total }));
                    }
                }
            }
        }
    }, [formData.vehicle_id, formData.month, vehicles, editingContract]);

    const handleCreate = () => {
        setEditingContract(null);
        resetForm();
        setShowModal(true);
    };

    const handleEdit = (contract: VendorContract) => {
        setEditingContract(contract);
        setFormData({
            vendor_id: contract.vendor_id,
            vehicle_id: contract.vehicle_id,
            month: contract.month,
            total_payable: Number(contract.total_payable),
            status: contract.status,
            payment_date: contract.payment_date || undefined,
            notes: contract.notes || '',
        });
        setShowModal(true);
    };

    const handleDelete = async (id: number) => {
        if (confirm('Are you sure you want to delete this contract?')) {
            dispatch(deleteVendorContract(id));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingContract) {
            dispatch(updateVendorContract({ id: editingContract.id, data: formData }));
        } else {
            dispatch(createVendorContract(formData));
        }
    };

    const isLoading = status === 'loading';
    const isSubmitting = actionStatus === 'loading';

    const getStatusBadgeColor = (status: ContractStatus) => {
        switch (status) {
            case ContractStatus.ACTIVE:
                return 'bg-blue/10 text-blue';
            case ContractStatus.PAID:
                return 'bg-green-100 text-green-800'; // Fallback if no custom classes
            case ContractStatus.PENDING_PAYMENT:
                return 'bg-orange/10 text-orange';
            case ContractStatus.ENDED:
                return 'bg-surface text-muted';
            default:
                return 'bg-surface text-muted';
        }
    };

    return (
        <div className="flex flex-col gap-6">
            <div>
                <div className="text-sm font-medium text-muted">Admin / Vendors</div>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight text-navy">Vendor Contracts</h1>
                <p className="text-sm text-muted mt-1">Manage monthly vendor-vehicle contracts</p>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-3 rounded-xl border border-border bg-white p-4">
                <div className="flex-1 min-w-[200px] grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input
                        type="text"
                        value={monthFilter}
                        onChange={(e) => setMonthFilter(e.target.value)}
                        placeholder="Filter by Month (YYYY-MM)"
                        className="h-10 w-full rounded-md border border-border px-3 text-sm outline-none focus:ring-2 focus:ring-blue/40"
                    />
                    <select
                        value={statusFilter || ''}
                        onChange={(e) => setStatusFilter(e.target.value as ContractStatus || undefined)}
                        className="h-10 w-full rounded-md border border-border px-3 text-sm outline-none focus:ring-2 focus:ring-blue/40"
                    >
                        <option value="">All Statuses</option>
                        <option value={ContractStatus.ACTIVE}>Active</option>
                        <option value={ContractStatus.PENDING_PAYMENT}>Pending Payment</option>
                        <option value={ContractStatus.PAID}>Paid</option>
                        <option value={ContractStatus.ENDED}>Ended</option>
                    </select>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleApplyFilters}
                        className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-white px-4 text-sm font-medium text-ink hover:bg-surface"
                    >
                        Apply
                    </button>
                    <button
                        onClick={handleClearFilters}
                        className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-white px-4 text-sm font-medium text-muted hover:text-ink hover:bg-surface"
                    >
                        Reset
                    </button>
                    <div className="h-6 w-px bg-border mx-1"></div>
                    <button
                        onClick={handleCreate}
                        className="inline-flex h-10 items-center justify-center rounded-md bg-orange px-4 text-sm font-semibold text-white hover:opacity-95"
                    >
                        + New Contract
                    </button>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                    {error}
                </div>
            )}

            {/* Table */}
            <div className="rounded-xl border border-border bg-white overflow-hidden">
                {isLoading && contracts.length === 0 ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="text-sm text-muted">Loading contracts...</div>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="bg-surface text-xs font-semibold tracking-wider text-muted">
                                <tr>
                                    <th className="px-4 py-3 text-left">Month</th>
                                    <th className="px-4 py-3 text-left">Vendor & Vehicle</th>
                                    <th className="px-4 py-3 text-left">Amount</th>
                                    <th className="px-4 py-3 text-left">Status</th>
                                    <th className="px-4 py-3 text-left">Payment Date</th>
                                    <th className="px-4 py-3 text-left">Notes</th>
                                    <th className="px-4 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {contracts.map((contract) => (
                                    <tr key={contract.id} className="hover:bg-surface/50">
                                        <td className="px-4 py-3 font-medium text-ink">{contract.month}</td>
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-ink">{contract.vendors?.name || 'Unknown Vendor'}</div>
                                            <div className="text-xs text-muted">
                                                {contract.vehicles
                                                    ? `${contract.vehicles.make} ${contract.vehicles.model} (${contract.vehicles.plate_number})`
                                                    : 'Unknown Vehicle'
                                                }
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 font-medium text-ink">
                                            Rs. {Number(contract.total_payable).toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusBadgeColor(contract.status)}`}>
                                                {contract.status ? contract.status.replace('_', ' ') : 'UNKNOWN'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-muted">
                                            {contract.payment_date ? new Date(contract.payment_date).toLocaleDateString() : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-muted max-w-xs truncate">
                                            {contract.notes || '-'}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => handleEdit(contract)}
                                                    className="inline-flex h-8 items-center justify-center rounded-md border border-border bg-white px-3 text-xs font-medium text-ink hover:bg-surface"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(contract.id)}
                                                    className="inline-flex h-8 items-center justify-center rounded-md border border-border bg-white px-3 text-xs font-medium text-danger hover:bg-danger/5"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {!isLoading && contracts.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-12 text-center text-muted">
                                            No contracts found matching your filters.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Pagination Info */}
            {!isLoading && contracts.length > 0 && (
                <div className="flex items-center justify-between text-xs text-muted">
                    <div>
                        Showing {contracts.length} of {pagination.total} contracts
                    </div>
                    {/* Add simple controls if needed, or rely on limit for now */}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200">
                        <div className="mb-6 flex items-center justify-between">
                            <div>
                                <div className="text-xs font-semibold tracking-wider text-muted">
                                    {editingContract ? "EDIT CONTRACT" : "NEW CONTRACT"}
                                </div>
                                <h2 className="mt-1 text-2xl font-semibold text-navy">
                                    {editingContract ? "Edit Contract" : "Create New Contract"}
                                </h2>
                            </div>
                            <button
                                onClick={() => setShowModal(false)}
                                className="rounded-full p-2 text-muted hover:bg-surface hover:text-ink"
                            >
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <label className="flex flex-col gap-1">
                                    <span className="text-xs font-semibold tracking-wider text-muted">Vendor *</span>
                                    <select
                                        required
                                        value={formData.vendor_id}
                                        onChange={(e) => setFormData({ ...formData, vendor_id: Number(e.target.value) })}
                                        className="h-10 rounded-md border border-border px-3 text-sm outline-none focus:ring-2 focus:ring-blue/40"
                                    >
                                        <option value={0}>Select Vendor</option>
                                        {vendors.map((v) => (
                                            <option key={v.id} value={v.id}>
                                                {v.name}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <label className="flex flex-col gap-1">
                                    <span className="text-xs font-semibold tracking-wider text-muted">Vehicle *</span>
                                    <select
                                        required
                                        value={formData.vehicle_id}
                                        onChange={(e) => setFormData({ ...formData, vehicle_id: Number(e.target.value) })}
                                        className="h-10 rounded-md border border-border px-3 text-sm outline-none focus:ring-2 focus:ring-blue/40"
                                        disabled={!!editingContract}
                                    >
                                        <option value={0}>Select Vehicle</option>
                                        {vehicles.map((v) => (
                                            <option key={v.id} value={v.id}>
                                                {v.make} {v.model} ({v.plate_number})
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <label className="flex flex-col gap-1">
                                    <span className="text-xs font-semibold tracking-wider text-muted">Month (YYYY-MM) *</span>
                                    <input
                                        required
                                        type="text"
                                        value={formData.month}
                                        onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                                        placeholder="2026-08"
                                        className="h-10 rounded-md border border-border px-3 text-sm outline-none focus:ring-2 focus:ring-blue/40"
                                        disabled={!!editingContract}
                                    />
                                </label>
                                <label className="flex flex-col gap-1">
                                    <span className="text-xs font-semibold tracking-wider text-muted">Total Payable *</span>
                                    <input
                                        required
                                        type="number"
                                        value={formData.total_payable}
                                        onChange={(e) => setFormData({ ...formData, total_payable: Number(e.target.value) })}
                                        className="h-10 rounded-md border border-border px-3 text-sm outline-none focus:ring-2 focus:ring-blue/40"
                                    />
                                </label>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <label className="flex flex-col gap-1">
                                    <span className="text-xs font-semibold tracking-wider text-muted">Status</span>
                                    <select
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value as ContractStatus })}
                                        className="h-10 rounded-md border border-border px-3 text-sm outline-none focus:ring-2 focus:ring-blue/40"
                                    >
                                        <option value={ContractStatus.ACTIVE}>Active</option>
                                        <option value={ContractStatus.PENDING_PAYMENT}>Pending Payment</option>
                                        <option value={ContractStatus.PAID}>Paid</option>
                                        <option value={ContractStatus.ENDED}>Ended</option>
                                    </select>
                                </label>
                                <label className="flex flex-col gap-1">
                                    <span className="text-xs font-semibold tracking-wider text-muted">Payment Date</span>
                                    <input
                                        type="date"
                                        value={formData.payment_date || ''}
                                        onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                                        className="h-10 rounded-md border border-border px-3 text-sm outline-none focus:ring-2 focus:ring-blue/40"
                                    />
                                </label>
                            </div>

                            <label className="flex flex-col gap-1">
                                <span className="text-xs font-semibold tracking-wider text-muted">Notes</span>
                                <textarea
                                    value={formData.notes || ''}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    rows={3}
                                    className="min-h-[80px] w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue/40"
                                />
                            </label>

                            <div className="mt-6 flex justify-end gap-3 border-t border-border pt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    disabled={isSubmitting}
                                    className="inline-flex h-10 items-center justify-center rounded-md border border-border px-4 text-sm font-medium text-ink hover:bg-surface disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="inline-flex h-10 items-center justify-center rounded-md bg-blue px-6 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-50"
                                >
                                    {isSubmitting ? 'Saving...' : editingContract ? 'Save Changes' : 'Create Contract'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
