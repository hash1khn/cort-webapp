"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { apiClient } from "../../lib/services/api-client";
import { ExternalVendor, CompanyVendorLink } from "../../lib/services/types/multi-mode";
import { PermissionGate } from "../components/PermissionGate";
import { AdminCan, useAdminAbility } from "../../lib/abilities/AdminAbilityProvider";
import { ADMIN_SUBJECTS } from "../../lib/abilities/admin-subjects";
import Pagination from "../../components/ui/Pagination";
import { useDebounce } from "../../lib/hooks/useDebounce";
import {
    getPhoneValidationError,
    PHONE_MAX_LENGTH,
    PHONE_PLACEHOLDER,
    sanitizePhoneInput,
} from "../../lib/utils/phone";

export default function ExternalVendorsPage() {
    return (
        <PermissionGate permission="external_vendors">
            <AdminCan I="read" a="ExternalVendors">
                <ExternalVendorsContent />
            </AdminCan>
        </PermissionGate>
    );
}

function ExternalVendorsContent() {
    const ability = useAdminAbility();
    const canCreate = ability.can("create", ADMIN_SUBJECTS.external_vendors);
    const canUpdate = ability.can("update", ADMIN_SUBJECTS.external_vendors);
    const canDelete = ability.can("delete", ADMIN_SUBJECTS.external_vendors);

    const [vendors, setVendors] = useState<ExternalVendor[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [search, setSearch] = useState("");
    const debouncedSearch = useDebounce(search, 500);

    // Modals
    const [showCreate, setShowCreate] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const [showLinks, setShowLinks] = useState(false);
    const [selectedVendor, setSelectedVendor] = useState<ExternalVendor | null>(null);
    const [vendorLinks, setVendorLinks] = useState<CompanyVendorLink[]>([]);

    // Create form
    const [createForm, setCreateForm] = useState({ name: "", contact_email: "", password: "", contact_phone: "" });
    const [createLoading, setCreateLoading] = useState(false);

    // Edit form
    const [editForm, setEditForm] = useState({ name: "", contact_phone: "", is_active: true });

    const fetchVendors = useCallback(async () => {
        setLoading(true);
        try {
            const res = await apiClient.getExternalVendors({ page, limit: 15, search: debouncedSearch || undefined });
            setVendors(res.data.data);
            setTotalPages(res.data.pagination.pages ?? Math.ceil(res.data.pagination.total / 15));
        } catch {
            toast.error("Failed to load external vendors");
        } finally {
            setLoading(false);
        }
    }, [page, debouncedSearch]);

    useEffect(() => { fetchVendors(); }, [fetchVendors]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        const phoneError = getPhoneValidationError(createForm.contact_phone);
        if (phoneError) {
            toast.error(phoneError);
            return;
        }
        setCreateLoading(true);
        try {
            await apiClient.createExternalVendor({
                name: createForm.name,
                contact_email: createForm.contact_email,
                password: createForm.password,
                contact_phone: createForm.contact_phone || undefined,
            });
            toast.success("External vendor created");
            setShowCreate(false);
            setCreateForm({ name: "", contact_email: "", password: "", contact_phone: "" });
            fetchVendors();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to create vendor");
        } finally {
            setCreateLoading(false);
        }
    };

    const handleEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedVendor) return;
        const phoneError = getPhoneValidationError(editForm.contact_phone);
        if (phoneError) {
            toast.error(phoneError);
            return;
        }
        try {
            await apiClient.updateExternalVendor(selectedVendor.id, {
                name: editForm.name,
                contact_phone: editForm.contact_phone || undefined,
                is_active: editForm.is_active,
            });
            toast.success("Vendor updated");
            setShowEdit(false);
            fetchVendors();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to update vendor");
        }
    };

    const handleDeactivate = async (vendor: ExternalVendor) => {
        if (!confirm(`Deactivate ${vendor.name} and all their company links?`)) return;
        try {
            await apiClient.deactivateExternalVendor(vendor.id);
            toast.success("Vendor deactivated");
            fetchVendors();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to deactivate");
        }
    };

    const openEdit = (vendor: ExternalVendor) => {
        setSelectedVendor(vendor);
        setEditForm({ name: vendor.name, contact_phone: vendor.contact_phone ?? "", is_active: vendor.is_active });
        setShowEdit(true);
    };

    const openLinks = async (vendor: ExternalVendor) => {
        setSelectedVendor(vendor);
        setShowLinks(true);
        try {
            const res = await apiClient.getVendorLinks(vendor.id);
            setVendorLinks(res.data);
        } catch {
            toast.error("Failed to load vendor links");
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">External Vendors</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage external vendor accounts and their company links</p>
                </div>
                {canCreate && (
                    <button
                        onClick={() => setShowCreate(true)}
                        className="bg-[#f47f00] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#d96e00] transition-colors"
                    >
                        + Create Vendor
                    </button>
                )}
            </div>

            {/* Search */}
            <input
                type="text"
                placeholder="Search by name or email…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="w-full max-w-sm border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            {["Name", "Email", "Phone", "Company Links", "Status", "Actions"].map((h) => (
                                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading ? (
                            <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Loading…</td></tr>
                        ) : vendors.length === 0 ? (
                            <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No external vendors found</td></tr>
                        ) : vendors.map((v) => (
                            <tr key={v.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 font-medium text-gray-900">{v.name}</td>
                                <td className="px-4 py-3 text-gray-600">{v.contact_email ?? "—"}</td>
                                <td className="px-4 py-3 text-gray-600">{v.contact_phone ?? "—"}</td>
                                <td className="px-4 py-3">
                                    <button
                                        onClick={() => openLinks(v)}
                                        className="text-[#f47f00] hover:underline text-xs font-medium"
                                    >
                                        {v.company_vendor_links?.length ?? 0} link(s) →
                                    </button>
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${v.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                                        {v.is_active ? "Active" : "Inactive"}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex gap-2">
                                        {canUpdate && (
                                            <button onClick={() => openEdit(v)} className="text-xs text-blue-600 hover:underline">Edit</button>
                                        )}
                                        {canDelete && v.is_active && (
                                            <button onClick={() => handleDeactivate(v)} className="text-xs text-red-500 hover:underline">Deactivate</button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {totalPages > 1 && (
                <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
            )}

            {/* Create Modal */}
            {showCreate && (
                <Modal title="Create External Vendor" onClose={() => setShowCreate(false)}>
                    <form onSubmit={handleCreate} className="space-y-4">
                        <Field label="Vendor Name *">
                            <input required value={createForm.name} onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))} className={inputCls} />
                        </Field>
                        <Field label="Login Email *">
                            <input required type="email" value={createForm.contact_email} onChange={(e) => setCreateForm((f) => ({ ...f, contact_email: e.target.value }))} className={inputCls} />
                        </Field>
                        <Field label="Initial Password *">
                            <input required type="password" minLength={8} value={createForm.password} onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))} className={inputCls} />
                        </Field>
                        <Field label="Phone">
                            <input type="tel" inputMode="numeric" maxLength={PHONE_MAX_LENGTH} value={createForm.contact_phone} onChange={(e) => setCreateForm((f) => ({ ...f, contact_phone: sanitizePhoneInput(e.target.value) }))} placeholder={PHONE_PLACEHOLDER} className={inputCls} />
                        </Field>
                        <div className="flex justify-end gap-3 pt-2">
                            <button type="button" onClick={() => setShowCreate(false)} className={cancelBtnCls}>Cancel</button>
                            <button type="submit" disabled={createLoading} className={saveBtnCls}>{createLoading ? "Creating…" : "Create"}</button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* Edit Modal */}
            {showEdit && selectedVendor && (
                <Modal title={`Edit — ${selectedVendor.name}`} onClose={() => setShowEdit(false)}>
                    <form onSubmit={handleEdit} className="space-y-4">
                        <Field label="Name *">
                            <input required value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} className={inputCls} />
                        </Field>
                        <Field label="Phone">
                            <input type="tel" inputMode="numeric" maxLength={PHONE_MAX_LENGTH} value={editForm.contact_phone} onChange={(e) => setEditForm((f) => ({ ...f, contact_phone: sanitizePhoneInput(e.target.value) }))} placeholder={PHONE_PLACEHOLDER} className={inputCls} />
                        </Field>
                        <Field label="Status">
                            <select value={editForm.is_active ? "1" : "0"} onChange={(e) => setEditForm((f) => ({ ...f, is_active: e.target.value === "1" }))} className={inputCls}>
                                <option value="1">Active</option>
                                <option value="0">Inactive</option>
                            </select>
                        </Field>
                        <div className="flex justify-end gap-3 pt-2">
                            <button type="button" onClick={() => setShowEdit(false)} className={cancelBtnCls}>Cancel</button>
                            <button type="submit" className={saveBtnCls}>Save</button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* Links Modal */}
            {showLinks && selectedVendor && (
                <Modal title={`Company Links — ${selectedVendor.name}`} onClose={() => setShowLinks(false)}>
                    {vendorLinks.length === 0 ? (
                        <p className="text-sm text-gray-500">No company links yet. Link this vendor to a company from the company detail page.</p>
                    ) : (
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    {["Company", "Chauffeur", "Shuttle", "Active"].map((h) => (
                                        <th key={h} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {vendorLinks.map((l) => (
                                    <tr key={l.id}>
                                        <td className="px-3 py-2">{l.companies?.name ?? `Company #${l.company_id}`}</td>
                                        <td className="px-3 py-2">{l.serves_chauffeur ? "✓" : "—"}</td>
                                        <td className="px-3 py-2">{l.serves_shuttle ? "✓" : "—"}</td>
                                        <td className="px-3 py-2">
                                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs ${l.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                                                {l.is_active ? "Active" : "Inactive"}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </Modal>
            )}
        </div>
    );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
                </div>
                {children}
            </div>
        </div>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
            {children}
        </div>
    );
}

const inputCls = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#f47f00]";
const saveBtnCls = "bg-[#f47f00] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#d96e00] disabled:opacity-50";
const cancelBtnCls = "border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50";
