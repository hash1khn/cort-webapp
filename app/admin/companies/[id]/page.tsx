"use client";

import { use, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { apiClient, Company, Employee } from "../../../lib/services/api-client";
import { CompanyFeature, CompanyVendorLink, ExternalVendor } from "../../../lib/services/types/multi-mode";
import { PermissionGate } from "../../components/PermissionGate";
import { AdminCan, useAdminAbility } from "../../../lib/abilities/AdminAbilityProvider";
import { ADMIN_SUBJECTS } from "../../../lib/abilities/admin-subjects";
import { useAuth } from "../../../lib/contexts/auth-context";
import { BenchmarksModal } from "../components/BenchmarksModal";

function cx(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

// -- Components --

function Badge({ children, color = "blue" }: { children: React.ReactNode; color?: "blue" | "green" | "red" | "orange" | "purple" }) {
    const colors = {
        blue: "bg-blue-100 text-blue-700",
        green: "bg-green-100 text-green-700",
        red: "bg-red-100 text-red-700",
        orange: "bg-orange-100 text-orange-800",
        purple: "bg-purple-100 text-purple-700",
    };
    return (
        <span className={cx("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium", colors[color])}>
            {children}
        </span>
    );
}

function ToggleSwitch({ checked, onChange, disabled = false, loading = false }: { checked: boolean; onChange: () => void; disabled?: boolean; loading?: boolean }) {
    const isDisabled = disabled || loading;

    return (
        <label className={cx("relative inline-flex items-center", isDisabled ? "cursor-not-allowed opacity-60" : "cursor-pointer")}>
            <input type="checkbox" className="sr-only" checked={checked} onChange={onChange} disabled={isDisabled} />
            <div className={cx("h-6 w-11 rounded-full transition-colors", checked ? "bg-[#f47f00]" : "bg-gray-200")}></div>
            <div className={cx("absolute left-[2px] top-[2px] flex h-5 w-5 items-center justify-center rounded-full border border-gray-300 bg-white transition-transform", checked ? "translate-x-full" : "translate-x-0")}>
                {loading && (
                    <svg className="h-3 w-3 animate-spin text-[#f47f00]" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" className="opacity-25" />
                        <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="opacity-90" />
                    </svg>
                )}
            </div>
        </label>
    );
}

function Modal({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl ring-1 ring-slate-200 animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                    <h3 className="text-lg font-bold text-[#0c225e]">{title}</h3>
                    <button onClick={onClose} className="rounded-full p-1 hover:bg-gray-100 text-gray-500">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
                <div className="p-6">{children}</div>
            </div>
        </div>
    );
}

// -- Main Page --

export default function CompanyDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    return (
        <PermissionGate permission="companies">
            <AdminCan I="read" a="Companies">
                <CompanyDetailsContent params={params} />
            </AdminCan>
        </PermissionGate>
    );
}

function CompanyDetailsContent({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const ability = useAdminAbility();
    const { hasCrud } = useAuth();
    const canCreate = ability.can("create", ADMIN_SUBJECTS.companies);
    const canUpdate = ability.can("update", ADMIN_SUBJECTS.companies);
    const canViewPricing = hasCrud("pricing", "read");

    const [company, setCompany] = useState<Company | null>(null);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [activeTab, setActiveTab] = useState<"employees" | "services" | "whitelisting">("employees");
    const [linkContext, setLinkContext] = useState<'chauffeur' | 'shuttle' | 'general'>('general');

    // Feature flags state
    const [features, setFeatures] = useState<CompanyFeature[]>([]);
    const [featuresLoading, setFeaturesLoading] = useState(false);
    const [trackerForm, setTrackerForm] = useState({ api_endpoint: "", api_key: "" });
    const [trackerSaving, setTrackerSaving] = useState(false);
    const [pendingToggleKeys, setPendingToggleKeys] = useState<string[]>([]);

    // External vendors tab state
    const [companyVendorLinks, setCompanyVendorLinks] = useState<CompanyVendorLink[]>([]);
    const [vendorsLoading, setVendorsLoading] = useState(false);
    const [allVendors, setAllVendors] = useState<ExternalVendor[]>([]);
    const [showLinkModal, setShowLinkModal] = useState(false);
    const [linkSaving, setLinkSaving] = useState(false);
    const [linkForm, setLinkForm] = useState({ vendor_id: 0, serves_chauffeur: false, serves_shuttle: false });

    // Employee Modal
    const [isEmpModalOpen, setIsEmpModalOpen] = useState(false);
    const [newEmpName, setNewEmpName] = useState("");
    const [newEmpEmail, setNewEmpEmail] = useState("");
    const [newEmpPhone, setNewEmpPhone] = useState("");
    const [newEmpPassword, setNewEmpPassword] = useState("");

    // Benchmarks Modal
    const [isBenchmarksModalOpen, setIsBenchmarksModalOpen] = useState(false);
    const [newEmpId, setNewEmpId] = useState("");
    const [newEmpDepartment, setNewEmpDepartment] = useState("");
    const [isCreatingEmp, setIsCreatingEmp] = useState(false);
    const [isUploadingCsv, setIsUploadingCsv] = useState(false);

    // Hardcoded for now - list of all possible vehicle models
    const availableVehicleModels = [
        "Toyota Corolla", "Honda Civic", "Suzuki Alto", "Suzuki Cultus", "Kia Sportage", "Hyundai Tucson"
    ];

    const fetchCompanyData = async () => {
        try {
            setIsLoading(true);
            const companyRes = await apiClient.getCompany(id);
            setCompany(companyRes.data);

            const employeesRes = await apiClient.getEmployees({ company_id: Number(id), limit: 100 });
            setEmployees(employeesRes.data.data);
            setError(null);
        } catch (err: any) {
            console.error("Failed to load company data:", err);
            setError("Failed to load company details. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchCompanyData();
    }, [id]);

    const fetchFeatures = useCallback(async () => {
        setFeaturesLoading(true);
        try {
            const res = await apiClient.getCompanyFeatures(Number(id));
            setFeatures(res.data);
            const tracker = res.data.find((f) => f.feature_key === "tracker_api_integration");
            if (tracker?.config) {
                setTrackerForm({
                    api_endpoint: (tracker.config.api_endpoint as string) ?? "",
                    api_key: (tracker.config.api_key as string) ?? "",
                });
            }
        } catch {
            // silently ignore
        } finally {
            setFeaturesLoading(false);
        }
    }, [id]);

    const fetchCompanyVendors = useCallback(async () => {
        setVendorsLoading(true);
        try {
            const res = await apiClient.getCompanyExternalVendors(Number(id));
            setCompanyVendorLinks(res.data);
        } catch {
            // silently ignore
        } finally {
            setVendorsLoading(false);
        }
    }, [id]);

    useEffect(() => {
        if (activeTab === "services") {
            fetchFeatures();
            fetchCompanyVendors();
        }
    }, [activeTab, fetchFeatures, fetchCompanyVendors]);

    const isTogglePending = (key: string) => pendingToggleKeys.includes(key);

    const runWithTogglePending = async (key: string, action: () => Promise<void>) => {
        setPendingToggleKeys((prev) => (prev.includes(key) ? prev : [...prev, key]));
        try {
            await action();
        } finally {
            setPendingToggleKeys((prev) => prev.filter((item) => item !== key));
        }
    };

    const toggleFeature = async (feature_key: string, is_enabled: boolean) => {
        await runWithTogglePending(`feature:${feature_key}`, async () => {
            try {
                await apiClient.upsertCompanyFeature(Number(id), { feature_key, is_enabled });
                setFeatures((prev) => prev.map((f) => f.feature_key === feature_key ? { ...f, is_enabled } : f));
                toast.success(`${feature_key.replace(/_/g, " ")} ${is_enabled ? "enabled" : "disabled"}`);
            } catch (err) {
                toast.error(err instanceof Error ? err.message : "Failed to update feature");
            }
        });
    };

    const saveTrackerConfig = async (e: React.FormEvent) => {
        e.preventDefault();
        setTrackerSaving(true);
        try {
            await apiClient.upsertTrackerConfig(Number(id), { api_endpoint: trackerForm.api_endpoint, api_key: trackerForm.api_key });
            toast.success("Tracker config saved");
        } catch {
            toast.error("Failed to save tracker config");
        } finally {
            setTrackerSaving(false);
        }
    };

    const handleLinkVendor = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!linkForm.vendor_id) return;
        try {
            setLinkSaving(true);
            await apiClient.createVendorLink(linkForm.vendor_id, {
                company_id: Number(id),
                serves_chauffeur: linkForm.serves_chauffeur,
                serves_shuttle: linkForm.serves_shuttle,
            });
            toast.success("Vendor link saved");
            setShowLinkModal(false);
            fetchCompanyVendors();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to link vendor");
        } finally {
            setLinkSaving(false);
        }
    };

    const updateLink = async (linkId: number, dto: { serves_chauffeur?: boolean; serves_shuttle?: boolean; is_active?: boolean }) => {
        try {
            await apiClient.updateVendorLink(linkId, dto);
            fetchCompanyVendors();
            toast.success("Link updated");
        } catch {
            toast.error("Failed to update link");
        }
    };

    const removeLink = async (linkId: number) => {
        if (!confirm("Remove this vendor link?")) return;
        try {
            await apiClient.removeVendorLink(linkId);
            fetchCompanyVendors();
            toast.success("Link removed");
        } catch {
            toast.error("Failed to remove link");
        }
    };

    const openLinkModal = (context: 'chauffeur' | 'shuttle' | 'general' = 'general') => {
        setLinkContext(context);
        setLinkForm({
            vendor_id: 0,
            serves_chauffeur: context === 'chauffeur',
            serves_shuttle: context === 'shuttle',
        });
        setShowLinkModal(true);
        // Load vendor list in background — modal is already visible
        apiClient.getExternalVendors({ limit: 100 })
            .then(res => setAllVendors(res.data.data))
            .catch(() => toast.error("Failed to load vendors"));
    };

    // -- Handlers --

    const handleCreateEmployee = async () => {
        if (!newEmpName.trim() || !company) return;
        try {
            setIsCreatingEmp(true);
            await apiClient.createEmployee({
                company_id: company.id,
                full_name: newEmpName,
                email: newEmpEmail,
                phone: newEmpPhone,
                password: newEmpPassword || undefined,
                employee_id: newEmpId || undefined,
                department: newEmpDepartment || undefined,
            });
            await fetchCompanyData(); // Refresh list
            setNewEmpName("");
            setNewEmpEmail("");
            setNewEmpPhone("");
            setNewEmpPassword("");
            setNewEmpPassword("");
            setNewEmpId("");
            setNewEmpDepartment("");
            setIsEmpModalOpen(false);
        } catch (err: any) {
            alert(err.message || "Failed to create employee");
        } finally {
            setIsCreatingEmp(false);
        }
    };

    const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0 || !company) return;

        const file = e.target.files[0];
        setIsUploadingCsv(true);

        const reader = new FileReader();
        reader.onload = async (event) => {
            const text = event.target?.result as string;
            if (!text) return;

            // Simple CSV Parser
            // Expected headers: full_name, email, phone, employee_id, department
            const lines = text.split(/\r?\n/);
            const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

            const employeesToCreate: any[] = [];

            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;

                const values = line.split(',');
                // Basic mapping
                const emp: any = { company_id: company.id };
                headers.forEach((h, index) => {
                    const val = values[index]?.trim();
                    if (val) emp[h] = val;
                });

                if (emp.email && emp.full_name) {
                    employeesToCreate.push(emp);
                }
            }

            if (employeesToCreate.length === 0) {
                alert("No valid rows found in CSV. Headers should include: full_name, email, phone, employee_id, department");
                setIsUploadingCsv(false);
                return;
            }

            try {
                const result = await apiClient.bulkCreateEmployees(employeesToCreate);
                const { successful, failed } = result.data;

                let message = `Processed ${employeesToCreate.length} rows.\n\nSuccessful: ${successful.length}`;
                if (failed.length > 0) {
                    message += `\nFailed: ${failed.length}\n\nFailures:\n` + failed.map(f => `${f.email}: ${f.reason}`).join('\n');
                }

                alert(message);
                await fetchCompanyData();
            } catch (err: any) {
                console.error(err);
                alert("Failed to upload CSV: " + err.message);
            } finally {
                setIsUploadingCsv(false);
                e.target.value = ""; // Reset input
            }
        };
        reader.readAsText(file);
    };

    const handleToggleStatus = async (emp: Employee) => {
        try {
            const nextStatus = emp.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
            // Optimistic update
            setEmployees(employees.map(e => e.id === emp.id ? { ...e, status: nextStatus } : e));
            await apiClient.updateEmployee(emp.id, { status: nextStatus });
        } catch (err: any) {
            console.error("Failed to update status:", err);
            // Revert on error
            setEmployees(employees.map(e => e.id === emp.id ? { ...e, status: emp.status } : e));
            alert("Failed to update status");
        }
    };

    const handleExportCredentials = () => {
        if (!company) return;
        // This only exports currently loaded employees, basic info.
        // Backend generated passwords are NOT stored in plain text, so we can't export them unless we captured them at creation.
        // Credentials export usually implies recent batch creation. For now, we export what we have.
        const lines = [
            `Company: ${company.name}`,
            `Generated: ${new Date().toLocaleString()}`,
            "",
            "employee_id,full_name,email,phone,department,status",
            ...employees.map(e =>
                [e.employee_id, e.full_name, e.email, e.phone, e.department || "", e.status].join(",")
            )
        ];

        const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `cort-${company.name}-employees.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const toggleService = async (service: 'shuttle' | 'chauffeur') => {
        if (!company) return;
        const key = service === 'shuttle' ? 'is_shuttle_enabled' : 'is_chauffeur_enabled';
        const newVal = !company[key];

        // Optimistic
        setCompany({ ...company, [key]: newVal });

        await runWithTogglePending(`service:${key}`, async () => {
            try {
                await apiClient.updateCompany(company.id, { [key]: newVal });
            } catch (err) {
                setCompany({ ...company, [key]: !newVal }); // Revert
                alert("Failed to update settings");
            }
        });
    };

    const updateCompanyField = async (field: 'is_cort_managed' | 'is_external_vendor_managed' | 'is_own_pooled_cars_managed', newVal: boolean) => {
        if (!company) return;
        const prev = company[field];
        setCompany({ ...company, [field]: newVal });

        await runWithTogglePending(`company:${field}`, async () => {
            try {
                await apiClient.updateCompany(company.id, { [field]: newVal });
            } catch {
                setCompany({ ...company, [field]: prev }); // Revert
                alert("Failed to update settings");
            }
        });
    };

    const toggleVehicleModel = async (model: string) => {
        if (!company) return;
        const currentWhitelists = company.vehicle_whitelists || [];
        const currentModels = currentWhitelists.map(w => w.allowed_vehicle_model);
        const exists = currentModels.includes(model);

        const nextModels = exists
            ? currentModels.filter(m => m !== model)
            : [...currentModels, model];

        // Optimistic update locally requires faking the whitelist structure
        // But since API expects models array, we perform API call then refresh or just standard optimistic UI
        // Let's do API call then refresh for safety on complex relations

        try {
            await apiClient.updateCompany(company.id, { allowed_vehicle_models: nextModels });
            // Manually update local state to reflect change without full fetch if possible, or just fetch
            // Construct fake whitelist objects for local state
            const newWhitelists = nextModels.map(m => ({ id: 0, company_id: company.id, allowed_vehicle_model: m }));
            setCompany({ ...company, vehicle_whitelists: newWhitelists });
        } catch (err: any) {
            console.error(err);
            alert("Failed to update vehicle whitelist");
        }
    };

    const handleChauffeurCortManagedToggle = async (newVal: boolean) => {
        if (!canUpdate) return;
        await toggleFeature('chauffeur_cort_managed', newVal);
        if (newVal) {
            const appTrackingFeat = features.find(f => f.feature_key === 'tracking_via_app');
            if (!appTrackingFeat?.is_enabled) {
                await toggleFeature('tracking_via_app', true);
                toast.success("App Tracking was auto-enabled for CORT Managed Chauffeur.");
            }
        }
    };

    const handleShuttleCortManagedToggle = async (newVal: boolean) => {
        if (!canUpdate) return;
        await toggleFeature('shuttle_cort_managed', newVal);
        if (newVal) {
            const appTrackingFeat = features.find(f => f.feature_key === 'tracking_via_app');
            if (!appTrackingFeat?.is_enabled) {
                await toggleFeature('tracking_via_app', true);
                toast.success("App Tracking was auto-enabled for CORT Managed Shuttle.");
            }
        }
    };

    if (isLoading) {
        return <div className="p-12 text-center text-slate-500">Loading company details...</div>;
    }

    if (error || !company) {
        return (
            <div className="p-8 text-center">
                <div className="text-slate-500">{error || "Company not found."}</div>
                <button onClick={() => router.push('/admin/companies')} className="mt-4 text-[#f47f00] hover:underline">
                    Back to Companies
                </button>
            </div>
        );
    }

    const currentModels = (company.vehicle_whitelists || []).map(w => w.allowed_vehicle_model);

    return (
        <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div>
                <button
                    onClick={() => router.push('/admin/companies')}
                    className="mb-4 flex items-center text-sm text-slate-500 hover:text-[#0c225e] transition-colors"
                >
                    <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to Companies
                </button>
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-[#0c225e]">{company.name}</h1>
                        <p className="text-sm text-slate-500 mt-1">{company._count?.users || 0} Employees • {company.address || "No address"}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {canViewPricing && (
                            <Link
                                href={`/admin/pricing?companyId=${id}`}
                                className="inline-flex h-9 items-center justify-center rounded-lg border border-[#0c225e] bg-white px-4 text-sm font-semibold text-[#0c225e] shadow-sm hover:bg-slate-50 transition-colors"
                            >
                                Contracts &amp; pricing
                            </Link>
                        )}
                        <Link
                            href={`/admin/companies/${id}/fleet`}
                            className="inline-flex h-9 items-center justify-center rounded-lg border border-green-600 bg-white px-4 text-sm font-semibold text-green-700 shadow-sm hover:bg-green-50 transition-colors"
                        >
                            Fleet Efficiency
                        </Link>
                        <button
                            type="button"
                            onClick={() => setIsBenchmarksModalOpen(true)}
                            className="inline-flex h-9 items-center justify-center rounded-lg border border-emerald-600 bg-emerald-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors"
                        >
                            Pre-CORT Benchmarks
                        </button>
                        <button
                            type="button"
                            onClick={handleExportCredentials}
                            className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
                        >
                            <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Export List
                        </button>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8 overflow-x-auto">
                    {(["employees", "services", "whitelisting"] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={cx(
                                "whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium",
                                activeTab === tab
                                    ? "border-[#f47f00] text-[#f47f00]"
                                    : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
                            )}
                        >
                            {tab === "employees" && "Employees"}
                            {tab === "services" && "Services & Configuration"}
                            {tab === "whitelisting" && "Vehicle Whitelisting"}
                        </button>
                    ))}
                </nav>
            </div>

            {activeTab === "employees" && (
                <div className="space-y-4 animate-in fade-in duration-300">
                    <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <div className="text-sm text-slate-600">
                            Manage your full roster here.
                        </div>
                        <div className="flex gap-2">
                            <label
                                className={cx(
                                    "inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors",
                                    canCreate ? "cursor-pointer" : "cursor-not-allowed opacity-50 pointer-events-none",
                                )}
                            >
                                <input
                                    type="file"
                                    accept=".csv"
                                    onChange={handleCsvUpload}
                                    className="hidden"
                                    disabled={isUploadingCsv || !canCreate}
                                />
                                <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                                {isUploadingCsv ? "Uploading..." : "Upload CSV"}
                            </label>
                            <button
                                type="button"
                                onClick={() => setIsEmpModalOpen(true)}
                                disabled={!canCreate}
                                className="inline-flex h-9 items-center justify-center rounded-lg bg-[#f47f00] px-4 text-sm font-bold text-white hover:bg-[#d97000] shadow-md shadow-orange-500/10 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                            >
                                <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Add Employee
                            </button>
                        </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-[#f8fafc] text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-4">Emp ID</th>
                                        <th className="px-6 py-4">Name</th>
                                        <th className="px-6 py-4">Contact</th>
                                        <th className="px-6 py-4">Department</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {employees.map((emp) => (
                                        <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4 font-mono text-slate-500 text-xs">{emp.employee_id || "—"}</td>
                                            <td className="px-6 py-4 font-medium text-[#0c225e]">{emp.full_name}</td>
                                            <td className="px-6 py-4 text-slate-500">
                                                <div className="text-xs">{emp.email || "No Email"}</div>
                                                <div className="text-xs">{emp.phone}</div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-500">{emp.department || "—"}</td>
                                            <td className="px-6 py-4">
                                                {emp.status === 'ACTIVE' ? (
                                                    <Badge color="green">Active</Badge>
                                                ) : (
                                                    <Badge color="red">Inactive</Badge>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => handleToggleStatus(emp)}
                                                    disabled={!canUpdate}
                                                    className="text-xs font-semibold text-[#f47f00] hover:underline disabled:opacity-40 disabled:no-underline disabled:cursor-not-allowed"
                                                >
                                                    {emp.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {employees.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                                No employees found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === "services" && (
                <div className="space-y-6 animate-in fade-in duration-300">
                    {(featuresLoading || vendorsLoading) ? (
                        <div className="space-y-6">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="rounded-xl border border-slate-200 bg-white shadow-sm p-6 animate-pulse">
                                    <div className="h-5 bg-slate-200 rounded w-1/4 mb-3"></div>
                                    <div className="h-3 bg-slate-200 rounded w-1/3 mb-6"></div>
                                    <div className="h-10 bg-slate-100 rounded w-full"></div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <>
                            {/* Chauffeur Service Card */}
                            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                                <div className="flex items-center justify-between p-5 border-b border-slate-100">
                                    <div>
                                        <h3 className="text-base font-bold text-[#0c225e]">Chauffeur Service</h3>
                                        <p className="text-xs text-slate-500 mt-0.5">On-demand point-to-point bookings</p>
                                    </div>
                                    <ToggleSwitch
                                        checked={company.is_chauffeur_enabled}
                                        onChange={() => toggleService('chauffeur')}
                                        disabled={!canUpdate}
                                        loading={isTogglePending('service:is_chauffeur_enabled')}
                                    />
                                </div>
                                {company.is_chauffeur_enabled ? (
                                    <div className="divide-y divide-slate-100">
                                        {/* CORT Managed */}
                                        {(() => {
                                            const cmChauffeur = features.find(f => f.feature_key === 'chauffeur_cort_managed')?.is_enabled ?? false;
                                            return (
                                        <div className="flex items-center justify-between px-5 py-4">
                                            <div>
                                                <div className="text-sm font-semibold text-slate-700">CORT Managed</div>
                                                <div className="text-xs text-slate-500">CORT assigns drivers and vehicles for bookings</div>
                                            </div>
                                            <ToggleSwitch
                                                checked={cmChauffeur}
                                                onChange={() => handleChauffeurCortManagedToggle(!cmChauffeur)}
                                                disabled={!canUpdate}
                                                loading={isTogglePending('feature:chauffeur_cort_managed')}
                                            />
                                        </div>
                                            );
                                        })()}
                                        {/* External Vendor */}
                                        {(() => {
                                            const cvEnabled = features.find(f => f.feature_key === 'chauffeur_external_vendor')?.is_enabled ?? false;
                                            const cvVendors = companyVendorLinks.filter(l => l.serves_chauffeur);
                                            return (
                                                <div className="px-5 py-4">
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <div className="text-sm font-semibold text-slate-700">External Vendor</div>
                                                            <div className="text-xs text-slate-500">Third-party vendors fulfill bookings via their dashboard</div>
                                                        </div>
                                                        <ToggleSwitch
                                                            checked={cvEnabled}
                                                            onChange={() => toggleFeature('chauffeur_external_vendor', !cvEnabled)}
                                                            disabled={!canUpdate}
                                                            loading={isTogglePending('feature:chauffeur_external_vendor')}
                                                        />
                                                    </div>
                                                    
                                                    <div className="mt-3 rounded-lg border border-slate-200 overflow-hidden">
                                                        {cvVendors.length > 0 && (
                                                            <table className="w-full text-xs">
                                                                <thead className="bg-slate-50 border-b border-slate-200">
                                                                    <tr>{["Vendor", "Status", ""].map(h => <th key={h} className="px-3 py-2 text-left font-medium text-slate-500 uppercase tracking-wide">{h}</th>)}</tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-slate-100">
                                                                    {cvVendors.map(link => (
                                                                        <tr key={link.id} className="hover:bg-slate-50">
                                                                            <td className="px-3 py-2 font-medium text-slate-800">{link.external_vendors?.name ?? `Vendor #${link.vendor_id}`}</td>
                                                                            <td className="px-3 py-2">
                                                                                <button onClick={() => updateLink(link.id, { is_active: !link.is_active })} className={cx("inline-flex px-2 py-0.5 rounded-full text-xs font-medium transition-colors", link.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500")}>
                                                                                    {link.is_active ? "Active" : "Inactive"}
                                                                                </button>
                                                                            </td>
                                                                            <td className="px-3 py-2 text-right"><button onClick={() => removeLink(link.id)} className="text-red-400 hover:text-red-600 hover:underline">Remove</button></td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        )}
                                                        {cvVendors.length === 0 && <div className="px-4 py-3 text-xs text-slate-400 bg-slate-50">No vendors linked for chauffeur yet.</div>}
                                                        <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
                                                            <span className="text-[11px] text-slate-400">
                                                                {cvEnabled ? "Link a vendor for chauffeur fulfilment." : "Link a vendor first, then enable External Vendor."}
                                                            </span>
                                                            <button
                                                                onClick={() => openLinkModal('chauffeur')}
                                                                disabled={!canUpdate}
                                                                className={cx(
                                                                    "text-xs font-semibold",
                                                                    canUpdate ? "text-[#f47f00] hover:underline" : "text-slate-300 cursor-not-allowed"
                                                                )}
                                                            >
                                                                + Add Vendor
                                                            </button>
                                                        </div>
                                                    </div>
                                                    
                                                </div>
                                    );
                                })()}
                                {/* Own Pool */}
                                {(() => {
                                    const smEnabled = features.find(f => f.feature_key === 'chauffeur_self_managed')?.is_enabled ?? false;
                                    return (
                                        <div className="flex items-center justify-between px-5 py-4">
                                            <div>
                                                <div className="text-sm font-semibold text-slate-700">Own Pool (Self-Managed)</div>
                                                <div className="text-xs text-slate-500">Company runs its own drivers and vehicle pool</div>
                                            </div>
                                            <ToggleSwitch
                                                checked={smEnabled}
                                                onChange={() => toggleFeature('chauffeur_self_managed', !smEnabled)}
                                                disabled={!canUpdate}
                                                loading={isTogglePending('feature:chauffeur_self_managed')}
                                            />
                                        </div>
                                    );
                                })()}
                            </div>
                        ) : (
                            <div className="px-5 py-4 text-sm text-slate-400 bg-slate-50/50">Enable Chauffeur Service to configure fulfilment modes.</div>
                        )}
                    </div>

                    {/* Shuttle Service Card */}
                    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                        <div className="flex items-center justify-between p-5 border-b border-slate-100">
                            <div>
                                <h3 className="text-base font-bold text-[#0c225e]">Shuttle Service</h3>
                                <p className="text-xs text-slate-500 mt-0.5">Fixed routes with scheduled stops</p>
                            </div>
                            <ToggleSwitch
                                checked={company.is_shuttle_enabled}
                                onChange={() => toggleService('shuttle')}
                                disabled={!canUpdate}
                                loading={isTogglePending('service:is_shuttle_enabled')}
                            />
                        </div>
                        {company.is_shuttle_enabled ? (
                            <div className="divide-y divide-slate-100">
                                {/* CORT Managed */}
                                {(() => {
                                    const cmShuttle = features.find(f => f.feature_key === 'shuttle_cort_managed')?.is_enabled ?? false;
                                    return (
                                <div className="flex items-center justify-between px-5 py-4">
                                    <div>
                                        <div className="text-sm font-semibold text-slate-700">CORT Managed</div>
                                        <div className="text-xs text-slate-500">CORT manages shuttle routes and drivers</div>
                                    </div>
                                    <ToggleSwitch
                                        checked={cmShuttle}
                                        onChange={() => handleShuttleCortManagedToggle(!cmShuttle)}
                                        disabled={!canUpdate}
                                        loading={isTogglePending('feature:shuttle_cort_managed')}
                                    />
                                </div>
                                    );
                                })()}
                                {/* External Vendor */}
                                {(() => {
                                    const svEnabled = features.find(f => f.feature_key === 'shuttle_external_vendor')?.is_enabled ?? false;
                                    const svVendors = companyVendorLinks.filter(l => l.serves_shuttle);
                                    return (
                                        <div className="px-5 py-4">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <div className="text-sm font-semibold text-slate-700">External Vendor</div>
                                                    <div className="text-xs text-slate-500">Third-party vendors manage shuttle routes</div>
                                                </div>
                                                <ToggleSwitch
                                                    checked={svEnabled}
                                                    onChange={() => toggleFeature('shuttle_external_vendor', !svEnabled)}
                                                    disabled={!canUpdate}
                                                    loading={isTogglePending('feature:shuttle_external_vendor')}
                                                />
                                            </div>
                                            
                                            <div className="mt-3 rounded-lg border border-slate-200 overflow-hidden">
                                                {svVendors.length > 0 && (
                                                    <table className="w-full text-xs">
                                                        <thead className="bg-slate-50 border-b border-slate-200">
                                                            <tr>{["Vendor", "Status", ""].map(h => <th key={h} className="px-3 py-2 text-left font-medium text-slate-500 uppercase tracking-wide">{h}</th>)}</tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-100">
                                                            {svVendors.map(link => (
                                                                <tr key={link.id} className="hover:bg-slate-50">
                                                                    <td className="px-3 py-2 font-medium text-slate-800">{link.external_vendors?.name ?? `Vendor #${link.vendor_id}`}</td>
                                                                    <td className="px-3 py-2">
                                                                        <button onClick={() => updateLink(link.id, { is_active: !link.is_active })} className={cx("inline-flex px-2 py-0.5 rounded-full text-xs font-medium transition-colors", link.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500")}>
                                                                            {link.is_active ? "Active" : "Inactive"}
                                                                        </button>
                                                                    </td>
                                                                    <td className="px-3 py-2 text-right"><button onClick={() => removeLink(link.id)} className="text-red-400 hover:text-red-600 hover:underline">Remove</button></td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                )}
                                                {svVendors.length === 0 && <div className="px-4 py-3 text-xs text-slate-400 bg-slate-50">No vendors linked for shuttle yet.</div>}
                                                <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
                                                    <span className="text-[11px] text-slate-400">
                                                        {svEnabled ? "Link a vendor for shuttle fulfilment." : "Link a vendor first, then enable External Vendor."}
                                                    </span>
                                                    <button
                                                        onClick={() => openLinkModal('shuttle')}
                                                        disabled={!canUpdate}
                                                        className={cx(
                                                            "text-xs font-semibold",
                                                            canUpdate ? "text-[#f47f00] hover:underline" : "text-slate-300 cursor-not-allowed"
                                                        )}
                                                    >
                                                        + Add Vendor
                                                    </button>
                                                </div>
                                            </div>
                                            
                                        </div>
                                    );
                                })()}
                            </div>
                        ) : (
                            <div className="px-5 py-4 text-sm text-slate-400 bg-slate-50/50">Enable Shuttle Service to configure fulfilment modes.</div>
                        )}
                    </div>

                    {/* Tracking Card */}
                    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                        <div className="p-5 border-b border-slate-100">
                            <h3 className="text-base font-bold text-[#0c225e]">Tracking</h3>
                            <p className="text-xs text-slate-500 mt-0.5">How vehicles and drivers are tracked. Both methods can be active simultaneously.</p>
                        </div>
                        <div className="divide-y divide-slate-100">
                            {(() => {
                                const tEnabled = features.find(f => f.feature_key === 'tracker_api_integration')?.is_enabled ?? false;
                                return (
                                    <div className="px-5 py-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="text-sm font-semibold text-slate-700">Third-Party Tracker API</div>
                                                <div className="text-xs text-slate-500">Integrate with the company's own external tracking system</div>
                                            </div>
                                            <ToggleSwitch
                                                checked={tEnabled}
                                                onChange={() => toggleFeature('tracker_api_integration', !tEnabled)}
                                                disabled={!canUpdate}
                                                loading={isTogglePending('feature:tracker_api_integration')}
                                            />
                                        </div>
                                        {tEnabled && (
                                            <form onSubmit={saveTrackerConfig} className="mt-3 bg-blue-50 rounded-lg border border-blue-200 p-4 space-y-3">
                                                <p className="text-xs font-semibold text-blue-800">Tracker API Configuration</p>
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 mb-1">API Endpoint</label>
                                                    <input type="url" value={trackerForm.api_endpoint} onChange={(e) => setTrackerForm(f => ({ ...f, api_endpoint: e.target.value }))} placeholder="https://tracker.example.com/api" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 mb-1">API Key</label>
                                                    <input type="text" value={trackerForm.api_key} onChange={(e) => setTrackerForm(f => ({ ...f, api_key: e.target.value }))} placeholder="••••••••" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                                                </div>
                                                <button type="submit" disabled={trackerSaving} className="bg-[#f47f00] text-white text-sm px-4 py-2 rounded-lg disabled:opacity-50">{trackerSaving ? "Saving…" : "Save Config"}</button>
                                            </form>
                                        )}
                                    </div>
                                );
                            })()}
                            {(() => {
                                const appEnabled = features.find(f => f.feature_key === 'tracking_via_app')?.is_enabled ?? false;
                                return (
                                    <div className="flex items-center justify-between px-5 py-4">
                                        <div>
                                            <div className="text-sm font-semibold text-slate-700">App Tracking (CORT)</div>
                                            <div className="text-xs text-slate-500">Track drivers and vehicles via GPS in the CORT mobile app</div>
                                        </div>
                                        <ToggleSwitch
                                            checked={appEnabled}
                                            onChange={() => toggleFeature('tracking_via_app', !appEnabled)}
                                            disabled={!canUpdate}
                                            loading={isTogglePending('feature:tracking_via_app')}
                                        />
                                    </div>
                                );
                            })()}
                        </div>
                    </div>

                    {/* Add-ons Card */}
                    {(() => {
                        const aiEnabled = features.find(f => f.feature_key === 'ai_insights')?.is_enabled ?? false;
                        return (
                            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                                <div className="p-5 border-b border-slate-100">
                                    <h3 className="text-base font-bold text-[#0c225e]">Add-ons</h3>
                                    <p className="text-xs text-slate-500 mt-0.5">Optional features available to any configuration.</p>
                                </div>
                                <div className="flex items-center justify-between px-5 py-4">
                                    <div>
                                        <div className="text-sm font-semibold text-slate-700">AI Insights</div>
                                        <div className="text-xs text-slate-500">AI-powered cost savings analysis and recommendations</div>
                                    </div>
                                    <ToggleSwitch
                                        checked={aiEnabled}
                                        onChange={() => toggleFeature('ai_insights', !aiEnabled)}
                                        disabled={!canUpdate}
                                        loading={isTogglePending('feature:ai_insights')}
                                    />
                                </div>
                            </div>
                        );
                    })()}

                    {/* Active Services Summary */}
                    {(() => {
                        const cvEnabled = features.find(f => f.feature_key === 'chauffeur_external_vendor')?.is_enabled ?? false;
                        const svEnabled = features.find(f => f.feature_key === 'shuttle_external_vendor')?.is_enabled ?? false;
                        const smEnabled = features.find(f => f.feature_key === 'chauffeur_self_managed')?.is_enabled ?? false;
                        const cmChauffeur = features.find(f => f.feature_key === 'chauffeur_cort_managed')?.is_enabled ?? false;
                        const cmShuttle = features.find(f => f.feature_key === 'shuttle_cort_managed')?.is_enabled ?? false;
                        const tEnabled = features.find(f => f.feature_key === 'tracker_api_integration')?.is_enabled ?? false;
                        const appEnabled = features.find(f => f.feature_key === 'tracking_via_app')?.is_enabled ?? false;
                        const aiEnabled = features.find(f => f.feature_key === 'ai_insights')?.is_enabled ?? false;
                        const cvCount = companyVendorLinks.filter(l => l.serves_chauffeur && l.is_active).length;
                        const svCount = companyVendorLinks.filter(l => l.serves_shuttle && l.is_active).length;
                        const items: { label: string; color: "blue" | "green" | "purple" | "orange" }[] = [];
                        if (company.is_chauffeur_enabled) {
                            if (cmChauffeur) items.push({ label: "Chauffeur — CORT Managed", color: "blue" });
                            if (cvEnabled) items.push({ label: `Chauffeur — External Vendor (${cvCount} active)`, color: "purple" });
                            if (smEnabled) items.push({ label: "Chauffeur — Own Pool", color: "green" });
                        }
                        if (company.is_shuttle_enabled) {
                            if (cmShuttle) items.push({ label: "Shuttle — CORT Managed", color: "blue" });
                            if (svEnabled) items.push({ label: `Shuttle — External Vendor (${svCount} active)`, color: "purple" });
                        }
                        if (tEnabled) items.push({ label: "Tracking — Third-Party API", color: "orange" });
                        if (appEnabled) items.push({ label: "Tracking — CORT App GPS", color: "orange" });
                        if (aiEnabled) items.push({ label: "Add-on: AI Insights", color: "green" });
                        return (
                            <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5">
                                <h3 className="text-sm font-bold text-slate-600 mb-3">Active Services Summary</h3>
                                {items.length === 0 ? (
                                    <p className="text-xs text-slate-400">No services enabled yet.</p>
                                ) : (
                                    <div className="flex flex-wrap gap-2">
                                        {items.map((item, i) => <Badge key={i} color={item.color}>{item.label}</Badge>)}
                                    </div>
                                )}
                            </div>
                        );
                    })()}

                    {/* Link Vendor Modal */}
                    {showLinkModal && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-lg font-semibold text-gray-900">Link External Vendor</h2>
                                    <button onClick={() => setShowLinkModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
                                </div>
                                <form onSubmit={handleLinkVendor} className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Select Vendor *</label>
                                        <select required value={linkForm.vendor_id} onChange={(e) => setLinkForm(f => ({ ...f, vendor_id: Number(e.target.value) }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                                            <option value={0}>— Choose a vendor —</option>
                                            {allVendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="flex gap-4">
                                        <label className={cx("flex items-center gap-2 text-sm", linkContext === 'chauffeur' ? "opacity-60" : "cursor-pointer")}>
                                            <input type="checkbox" checked={linkForm.serves_chauffeur} disabled={linkContext === 'chauffeur'} onChange={(e) => linkContext !== 'chauffeur' && setLinkForm(f => ({ ...f, serves_chauffeur: e.target.checked }))} />
                                            Serves Chauffeur
                                        </label>
                                        <label className={cx("flex items-center gap-2 text-sm", linkContext === 'shuttle' ? "opacity-60" : "cursor-pointer")}>
                                            <input type="checkbox" checked={linkForm.serves_shuttle} disabled={linkContext === 'shuttle'} onChange={(e) => linkContext !== 'shuttle' && setLinkForm(f => ({ ...f, serves_shuttle: e.target.checked }))} />
                                            Serves Shuttle
                                        </label>
                                    </div>
                                    <div className="flex justify-end gap-3 pt-2">
                                        <button type="button" onClick={() => setShowLinkModal(false)} disabled={linkSaving} className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed">Cancel</button>
                                        <button type="submit" disabled={linkSaving || !linkForm.vendor_id} className="inline-flex items-center justify-center gap-2 bg-[#f47f00] text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                                            {linkSaving && (
                                                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" className="opacity-25" />
                                                    <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="opacity-90" />
                                                </svg>
                                            )}
                                            {linkSaving ? "Saving..." : "Link Vendor"}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                        </>
                    )}
                </div>
            )}

            {activeTab === "whitelisting" && (
                <div className="animate-in fade-in duration-300">
                    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-lg font-bold text-[#0c225e]">Vehicle Whitelisting</h3>
                                <div className="text-xs text-slate-500 mt-1">Select vehicle models available for Chauffeur bookings.</div>
                            </div>
                            {!company.is_chauffeur_enabled && (
                                <Badge color="red">Disabled (Chauffeur Off)</Badge>
                            )}
                        </div>
                        <div className={cx("grid grid-cols-2 gap-2 sm:grid-cols-3", (!company.is_chauffeur_enabled || !canUpdate) && "opacity-50 pointer-events-none")}>
                            {availableVehicleModels.map(model => {
                                const isAllowed = currentModels.includes(model);
                                return (
                                    <button
                                        key={model}
                                        onClick={() => toggleVehicleModel(model)}
                                        className={cx(
                                            "flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all border",
                                            isAllowed ? "bg-purple-50 border-purple-200 text-purple-700" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                                        )}
                                    >
                                        <span>{model}</span>
                                        {isAllowed && (
                                            <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Modals */}
            <Modal
                isOpen={isEmpModalOpen}
                onClose={() => setIsEmpModalOpen(false)}
                title="Add New Employee"
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Full Name</label>
                        <input
                            autoFocus
                            type="text"
                            value={newEmpName}
                            onChange={(e) => setNewEmpName(e.target.value)}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#f47f00] focus:ring-1 focus:ring-[#f47f00] outline-none"
                            placeholder="Jane Doe"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Employee ID</label>
                        <input
                            type="text"
                            value={newEmpId}
                            onChange={(e) => setNewEmpId(e.target.value)}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#f47f00] focus:ring-1 focus:ring-[#f47f00] outline-none font-mono"
                            placeholder="EMP-001"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Department</label>
                        <input
                            type="text"
                            value={newEmpDepartment}
                            onChange={(e) => setNewEmpDepartment(e.target.value)}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#f47f00] focus:ring-1 focus:ring-[#f47f00] outline-none"
                            placeholder="Engineering"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Email</label>
                        <input
                            type="email"
                            value={newEmpEmail}
                            onChange={(e) => setNewEmpEmail(e.target.value)}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#f47f00] focus:ring-1 focus:ring-[#f47f00] outline-none"
                            placeholder="jane@company.com"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Phone</label>
                        <input
                            type="tel"
                            value={newEmpPhone}
                            onChange={(e) => setNewEmpPhone(e.target.value)}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#f47f00] focus:ring-1 focus:ring-[#f47f00] outline-none"
                            placeholder="+92 300 1234567"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Password (Optional)</label>
                        <input
                            type="text"
                            value={newEmpPassword}
                            onChange={(e) => setNewEmpPassword(e.target.value)}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#f47f00] focus:ring-1 focus:ring-[#f47f00] outline-none font-mono"
                            placeholder="Auto-generated if empty"
                        />
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <button onClick={() => setIsEmpModalOpen(false)} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800">Cancel</button>
                        <button
                            type="button"
                            onClick={handleCreateEmployee}
                            disabled={isCreatingEmp || !canCreate}
                            className="px-4 py-2 text-sm font-bold text-white bg-[#f47f00] rounded-lg hover:bg-[#d97000] disabled:opacity-50"
                        >
                            {isCreatingEmp ? "Adding..." : "Add Employee"}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Benchmarks Modal */}
            <BenchmarksModal
                companyId={Number(id)}
                companyName={company.name}
                isOpen={isBenchmarksModalOpen}
                onClose={() => setIsBenchmarksModalOpen(false)}
            />
        </div>
    );
}
