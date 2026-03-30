"use client";

import { useEffect, useState } from "react";
import {
    Driver,
    CreateDriverRequest,
    DriverType,
    DriverStatus,
    DriverStatusAction,
    QueryDriverParams
} from "../../lib/services/api-client";
import { useAppDispatch, useAppSelector } from "../../lib/store/hooks";
import {
    fetchAdminDrivers,
    fetchPendingChauffeurs,
    createAdminDriver,
    updateAdminDriver,
    updateAdminDriverStatus,
    deleteAdminDriver,
    selectAdminDrivers,
    selectAdminDriversStatus,
    selectAdminDriversError,
    selectAdminDriversActionStatus,
    selectDriverFilters,
    resetDriversActionStatus,
    selectAdminDriversPagination,
} from "../../lib/store/slices/adminDriversSlice";
import Pagination from "../../components/ui/Pagination";

import { cx } from "../components/ui/cx";
import { Badge } from "../components/ui/Badge";
import { Modal } from "../components/ui/Modal";
import { CredentialsModal } from "../components/ui/CredentialsModal";
import { DriverForm } from "./components/DriverForm";
import { PermissionGate } from "../components/PermissionGate";
import { AdminCan, useAdminAbility } from "../../lib/abilities/AdminAbilityProvider";
import { ADMIN_SUBJECTS } from "../../lib/abilities/admin-subjects";

// -- Main Page Definition --

export default function DriversPage() {
    return (
        <PermissionGate permission="drivers">
            <AdminCan I="read" a="Drivers">
                <DriversPageContent />
            </AdminCan>
        </PermissionGate>
    );
}

function DriversPageContent() {
    const dispatch = useAppDispatch();
    const ability = useAdminAbility();
    const canCreate = ability.can("create", ADMIN_SUBJECTS.drivers);
    const canUpdate = ability.can("update", ADMIN_SUBJECTS.drivers);
    const canDelete = ability.can("delete", ADMIN_SUBJECTS.drivers);
    const drivers = useAppSelector(selectAdminDrivers);
    const status = useAppSelector(selectAdminDriversStatus);
    const error = useAppSelector(selectAdminDriversError);
    const actionStatus = useAppSelector(selectAdminDriversActionStatus);
    const savedFilters = useAppSelector(selectDriverFilters);
    const pagination = useAppSelector(selectAdminDriversPagination);

    const [activeTab, setActiveTab] = useState<"ALL" | "SHUTTLE" | "CHAUFFEUR" | "PENDING_CHAUFFEUR">("ALL");

    // Modal States
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isCredentialsModalOpen, setIsCredentialsModalOpen] = useState(false);
    const [createdCredentials, setCreatedCredentials] = useState<{ email: string, password?: string } | null>(null);
    const [editingDriver, setEditingDriver] = useState<Driver | null>(null);

    // Rejection Modal
    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
    const [rejectingDriverId, setRejectingDriverId] = useState<string | null>(null);
    const [rejectionReason, setRejectionReason] = useState("");

    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");

    // Debounce search query
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Load drivers when filters change
    useEffect(() => {
        loadDrivers();
    }, [activeTab, debouncedSearch]);

    const loadDrivers = async (page = 1) => {
        const params: QueryDriverParams & { activeTab?: string } = { limit: 10, page, search: debouncedSearch, activeTab };

        if (activeTab === "PENDING_CHAUFFEUR") {
            dispatch(fetchPendingChauffeurs(params));
        } else {
            if (activeTab === "SHUTTLE") params.driver_type = DriverType.SHUTTLE;
            if (activeTab === "CHAUFFEUR") params.driver_type = DriverType.CHAUFFEUR;
            dispatch(fetchAdminDrivers(params));
        }
    };

    const handlePageChange = (page: number) => {
        loadDrivers(page);
    };

    const handleCreateNew = () => {
        setEditingDriver(null);
        setIsCreateModalOpen(true);
    };

    const handleEdit = (driver: Driver) => {
        setEditingDriver(driver);
        setIsCreateModalOpen(true);
    }

    const handleSave = async (data: CreateDriverRequest) => {
        try {
            if (!data.full_name || !data.email) {
                alert("Please fill in all required fields (Name, Email)");
                return;
            }

            let finalData = { ...data };
            if (!editingDriver && !finalData.password) {
                const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
                let pass = "";
                for (let i = 0; i < 12; i++) {
                    pass += chars.charAt(Math.floor(Math.random() * chars.length));
                }
                finalData.password = pass;
            }

            if (!editingDriver && finalData.password && finalData.password.length < 6) {
                alert("Password must be at least 6 characters long");
                return;
            }

            if (editingDriver) {
                const { email, password, ...updateData } = finalData;
                await dispatch(updateAdminDriver({ id: editingDriver.id, data: updateData })).unwrap();
            } else {
                const response = await dispatch(createAdminDriver(finalData)).unwrap();
                setCreatedCredentials({
                    email: finalData.email,
                    password: finalData.password
                });
                setIsCredentialsModalOpen(true);
            }

            loadDrivers();
            setIsCreateModalOpen(false);
            setEditingDriver(null);
        } catch (err: any) {
            console.error("Failed to save driver:", err);
            alert(err || "Failed to save driver");
        }
    }

    const handleDelete = async (id: string) => {
        if (window.confirm("Are you sure you want to delete this driver?")) {
            await dispatch(deleteAdminDriver(id));
        }
    }

    const handleApprove = async (id: string) => {
        if (window.confirm("Are you sure you want to approve this driver?")) {
            await dispatch(updateAdminDriverStatus({ id, payload: { action: DriverStatusAction.APPROVE } }));
            loadDrivers();
        }
    }

    const handleRejectClick = (id: string) => {
        setRejectingDriverId(id);
        setRejectionReason("");
        setIsRejectModalOpen(true);
    }

    const submitRejection = async () => {
        if (!rejectingDriverId) return;
        if (!rejectionReason.trim()) {
            alert("Please provide a reason for rejection.");
            return;
        }

        try {
            await dispatch(updateAdminDriverStatus({
                id: rejectingDriverId,
                payload: {
                    action: DriverStatusAction.REJECT,
                    reason: rejectionReason
                }
            })).unwrap();
            setIsRejectModalOpen(false);
            setRejectingDriverId(null);
            loadDrivers();
        } catch (err: any) {
            alert(err || "Failed to reject driver");
        }
    }

    const isLoading = status === 'loading';
    const isSaving = actionStatus === 'loading';

    return (
        <div className="flex flex-col gap-6 p-6 mx-auto">
            {/* Page Header */}
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="mt-1 text-3xl font-bold tracking-tight text-[#0c225e]">Drivers</h1>
                </div>
                <button
                    type="button"
                    onClick={handleCreateNew}
                    disabled={!canCreate}
                    className="inline-flex h-10 items-center justify-center rounded-lg bg-[#f47f00] px-5 text-sm font-bold text-white shadow-lg shadow-orange-500/20 transition-all hover:bg-[#d97000] hover:-translate-y-0.5 disabled:opacity-50 disabled:pointer-events-none disabled:hover:translate-y-0"
                >
                    <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Create Driver
                </button>
            </div>

            {/* Tabs & Search */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    {[
                        { id: "ALL", name: "All Drivers" },
                        { id: "SHUTTLE", name: "Shuttle" },
                        { id: "CHAUFFEUR", name: "Chauffeur" },
                        { id: "PENDING_CHAUFFEUR", name: "Pending Chauffeurs" },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={cx(
                                activeTab === tab.id
                                    ? "border-[#f47f00] text-[#f47f00]"
                                    : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700",
                                "whitespace-nowrap border-b-2 py-4 px-1 text-sm font-bold transition-colors"
                            )}
                        >
                            {tab.name}
                        </button>
                    ))}
                </nav>

                <div className="pb-2">
                    <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <svg className="h-5 w-5 text-slate-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            placeholder="Search drivers..."
                            className="block w-full max-w-xs rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-3 text-sm focus:border-[#f47f00] focus:ring-1 focus:ring-[#f47f00] outline-none"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Drivers Table */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-[#f8fafc] text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4">Driver Name</th>
                                <th className="px-6 py-4">Type</th>
                                <th className="px-6 py-4">Information</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading && drivers.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">Loading drivers...</td>
                                </tr>
                            ) : error ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-red-500">{error}</td>
                                </tr>
                            ) : drivers.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                        <div className="flex flex-col items-center gap-2">
                                            <span className="font-medium">No drivers found</span>
                                            <button type="button" onClick={handleCreateNew} disabled={!canCreate} className="text-sm text-[#f47f00] hover:underline disabled:opacity-50 disabled:no-underline">
                                                Create your first driver
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ) : drivers.map((driver) => (
                                <tr key={driver.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-semibold text-[#0c225e]">{driver.full_name}</div>
                                        <div className="text-xs text-slate-500">{driver.email}</div>
                                    </td>

                                    <td className="px-6 py-4">
                                        {driver.drivers_profile?.driver_type === DriverType.SHUTTLE ? (
                                            <Badge color="blue">Shuttle</Badge>
                                        ) : (
                                            <Badge color="purple">Chauffeur</Badge>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-xs">
                                            <div>Phone: {driver.phone || "N/A"}</div>
                                            <div>CNIC: {driver.drivers_profile?.cnic_number || "N/A"}</div>
                                            <div>License: {driver.drivers_profile?.license_number || "N/A"}</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={cx(
                                            "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset",
                                            driver.status === DriverStatus.ACTIVE ? "bg-green-50 text-green-700 ring-green-600/20" :
                                                driver.status === DriverStatus.PENDING ? "bg-yellow-50 text-yellow-800 ring-yellow-600/20" :
                                                    driver.status === DriverStatus.REJECTED ? "bg-red-50 text-red-700 ring-red-600/20" :
                                                        "bg-gray-50 text-gray-600 ring-gray-500/10"
                                        )}>
                                            {driver.status}
                                        </span>
                                        {driver.status === DriverStatus.REJECTED && driver.drivers_profile?.rejection_reason && (
                                            <div className="text-xs text-red-500 mt-1 max-w-[150px] truncate" title={driver.drivers_profile.rejection_reason}>
                                                Reason: {driver.drivers_profile.rejection_reason}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {driver.status === DriverStatus.PENDING && (
                                                <>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleApprove(driver.id)}
                                                        disabled={!canUpdate}
                                                        className="rounded-md p-1 text-green-600 hover:bg-green-50 disabled:opacity-40 disabled:pointer-events-none"
                                                        title="Approve"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRejectClick(driver.id)}
                                                        disabled={!canUpdate}
                                                        className="rounded-md p-1 text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:pointer-events-none"
                                                        title="Reject"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                                    </button>
                                                </>
                                            )}

                                            <button
                                                type="button"
                                                onClick={() => handleEdit(driver)}
                                                disabled={!canUpdate}
                                                className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-[#0c225e] transition-colors disabled:opacity-40 disabled:pointer-events-none"
                                                title="Edit Details"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDelete(driver.id)}
                                                disabled={!canDelete}
                                                className="rounded-md p-2 text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-40 disabled:pointer-events-none"
                                                title="Delete Driver"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="border-t border-slate-100">
                    <Pagination
                        currentPage={pagination.page}
                        totalPages={pagination.pages}
                        onPageChange={handlePageChange}
                    />
                </div>
            </div>

            {/* Create/Edit Modal */}
            <Modal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                title={!editingDriver ? "Create New Driver" : "Edit Driver"}
            >
                <DriverForm
                    driver={editingDriver}
                    onSave={handleSave}
                    onCancel={() => setIsCreateModalOpen(false)}
                    isSaving={isSaving}
                />
            </Modal>

            {/* Credentials Modal */}
            {createdCredentials && (
                <CredentialsModal
                    isOpen={isCredentialsModalOpen}
                    onClose={() => setIsCredentialsModalOpen(false)}
                    title="Driver Credentials"
                    successMessage="Driver created successfully! Please share these credentials with the driver."
                    email={createdCredentials.email}
                    password={createdCredentials.password}
                />
            )}

            {/* Reject Reason Modal */}
            <Modal
                isOpen={isRejectModalOpen}
                onClose={() => setIsRejectModalOpen(false)}
                title="Reject Driver"
            >
                <div className="space-y-4">
                    <p className="text-sm text-slate-600">Please provide a reason for rejecting this driver request.</p>
                    <textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 p-3 text-sm focus:border-[#f47f00] focus:ring-1 focus:ring-[#f47f00] outline-none min-h-[100px]"
                        placeholder="Rejection reason..."
                    />
                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            onClick={() => setIsRejectModalOpen(false)}
                            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={submitRejection}
                            disabled={!canUpdate}
                            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50 disabled:pointer-events-none"
                        >
                            Confirm Rejection
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
