"use client";

import { useEffect, useState, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "../../lib/store/hooks";
import {
    fetchAdminVendors,
    createAdminVendor,
    updateAdminVendor,
    deleteAdminVendor,
    selectAdminVendors,
    selectAdminVendorsStatus,
    selectAdminVendorsActionStatus,
    selectAdminVendorsError,
    selectVendorFilters,
    resetActionStatus
} from "../../lib/store/slices/adminVendorsSlice";
import { Vendor, CreateVendorRequest } from "../../lib/services/api-client";

function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
}

export default function VendorsPage() {
    const dispatch = useAppDispatch();
    const vendors = useAppSelector(selectAdminVendors);
    const status = useAppSelector(selectAdminVendorsStatus);
    const actionStatus = useAppSelector(selectAdminVendorsActionStatus);
    const error = useAppSelector(selectAdminVendorsError);
    const savedFilters = useAppSelector(selectVendorFilters);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<"create" | "edit">("create");
    const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);

    // Filters - Initialize from Redux
    const [search, setSearch] = useState(savedFilters.search);
    const debouncedSearch = useDebounce(search, 500);

    // Form Data
    const [formData, setFormData] = useState<Partial<CreateVendorRequest>>({});

    // Sync with Redux
    useEffect(() => {
        setSearch(savedFilters.search);
    }, [savedFilters]);

    useEffect(() => {
        const filtersChanged = debouncedSearch !== savedFilters.search;

        if (status === 'idle' || filtersChanged) {
            if (status === 'succeeded' && !filtersChanged) {
                return;
            }
            dispatch(fetchAdminVendors({ limit: 100, search: debouncedSearch }));
        }
    }, [dispatch, debouncedSearch, status, savedFilters]);

    // Handle action updates
    useEffect(() => {
        if (actionStatus === 'succeeded') {
            closeModal();
            dispatch(resetActionStatus());
        } else if (actionStatus === 'failed' && error) {
            alert(error);
            dispatch(resetActionStatus());
        }
    }, [actionStatus, error, dispatch]);

    const handleCreate = () => {
        if (!formData.name) {
            alert("Vendor name is required");
            return;
        }
        dispatch(createAdminVendor(formData as CreateVendorRequest));
    };

    const handleUpdate = () => {
        if (!selectedVendor) return;
        dispatch(updateAdminVendor({ id: selectedVendor.id, data: formData }));
    };

    const handleDelete = (vendor: Vendor) => {
        if (!confirm(`Are you sure you want to delete ${vendor.name}?`)) return;
        dispatch(deleteAdminVendor(vendor.id));
    };

    const startCreate = () => {
        setSelectedVendor(null);
        setFormData({});
        setModalMode("create");
        setIsModalOpen(true);
    };

    const startEdit = (vendor: Vendor) => {
        setSelectedVendor(vendor);
        setFormData({
            name: vendor.name,
            contact_person: vendor.contact_person || "",
            phone: vendor.phone || "",
            email: vendor.email || "",
            address: vendor.address || "",
        });
        setModalMode("edit");
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedVendor(null);
        setFormData({});
    };

    const renderForm = () => (
        <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold tracking-wider text-muted">Vendor Name *</span>
                <input
                    value={formData.name || ""}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="h-10 rounded-md border border-border px-3 text-sm outline-none focus:ring-2 focus:ring-blue/40"
                    placeholder="ABC Transport"
                />
            </label>
            <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold tracking-wider text-muted">Contact Person</span>
                <input
                    value={formData.contact_person || ""}
                    onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                    className="h-10 rounded-md border border-border px-3 text-sm outline-none focus:ring-2 focus:ring-blue/40"
                    placeholder="John Doe"
                />
            </label>
            <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold tracking-wider text-muted">Phone</span>
                <input
                    value={formData.phone || ""}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="h-10 rounded-md border border-border px-3 text-sm outline-none focus:ring-2 focus:ring-blue/40"
                    placeholder="+1234567890"
                />
            </label>
            <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold tracking-wider text-muted">Email</span>
                <input
                    type="email"
                    value={formData.email || ""}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="h-10 rounded-md border border-border px-3 text-sm outline-none focus:ring-2 focus:ring-blue/40"
                    placeholder="contact@example.com"
                />
            </label>
            <div className="col-span-full">
                <label className="flex flex-col gap-1">
                    <span className="text-xs font-semibold tracking-wider text-muted">Address</span>
                    <textarea
                        value={formData.address || ""}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className="min-h-[80px] rounded-md border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue/40"
                        placeholder="123 Main St, City"
                    />
                </label>
            </div>
        </div>
    );

    const isLoading = status === 'loading';
    const isSubmitting = actionStatus === 'loading';

    return (
        <div className="flex flex-col gap-6">
            <div>
                <div className="text-sm font-medium text-muted">Admin</div>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight text-navy">Vendor Management</h1>
            </div>

            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-white p-4">
                <div className="flex-1 min-w-[200px]">
                    <input
                        type="text"
                        placeholder="Search vendors..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="h-10 w-full rounded-md border border-border px-3 text-sm outline-none focus:ring-2 focus:ring-blue/40"
                    />
                </div>
                <button
                    onClick={startCreate}
                    className="inline-flex h-10 items-center justify-center rounded-md bg-orange px-4 text-sm font-semibold text-white hover:opacity-95"
                >
                    Add Vendor
                </button>
            </div>

            <div className="rounded-xl border border-border bg-white overflow-hidden">
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="text-sm text-muted">Loading vendors...</div>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="bg-surface text-xs font-semibold tracking-wider text-muted">
                                <tr>
                                    <th className="px-4 py-3 text-left">Vendor Name</th>
                                    <th className="px-4 py-3 text-left">Contact</th>
                                    <th className="px-4 py-3 text-left">Phone / Email</th>
                                    <th className="px-4 py-3 text-center">Vehicles</th>
                                    <th className="px-4 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {vendors.map((v) => (
                                    <tr key={v.id} className="hover:bg-surface/50">
                                        <td className="px-4 py-3 font-medium text-ink">{v.name}</td>
                                        <td className="px-4 py-3 text-ink">{v.contact_person || "-"}</td>
                                        <td className="px-4 py-3">
                                            <div className="text-ink">{v.phone}</div>
                                            <div className="text-xs text-muted">{v.email}</div>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className="inline-flex items-center rounded-full bg-blue/10 px-2.5 py-0.5 text-xs font-medium text-blue">
                                                {v._count?.vehicles || 0}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => startEdit(v)}
                                                    className="inline-flex h-8 items-center justify-center rounded-md border border-border bg-white px-3 text-xs font-medium text-ink hover:bg-surface"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(v)}
                                                    className="inline-flex h-8 items-center justify-center rounded-md border border-border bg-white px-3 text-xs font-medium text-danger hover:bg-danger/5"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {!isLoading && vendors.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-8 text-center text-muted">
                                            No vendors found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal */}
            {
                isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                        <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200">
                            <div className="mb-6 flex items-center justify-between">
                                <div>
                                    <div className="text-xs font-semibold tracking-wider text-muted">
                                        {modalMode === "create" ? "NEW VENDOR" : "EDIT VENDOR"}
                                    </div>
                                    <h2 className="mt-1 text-2xl font-semibold text-navy">
                                        {modalMode === "create" ? "Add New Vendor" : "Edit Vendor"}
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
                                    onClick={modalMode === "create" ? handleCreate : handleUpdate}
                                    disabled={isSubmitting}
                                    className="inline-flex h-10 items-center justify-center rounded-md bg-blue px-6 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-50"
                                >
                                    {isSubmitting ? "Saving..." : (modalMode === "create" ? "Create Vendor" : "Save Changes")}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
