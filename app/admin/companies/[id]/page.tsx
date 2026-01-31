"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient, Company, Employee } from "../../../lib/services/api-client";

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
    const { id } = use(params);
    const router = useRouter();

    const [company, setCompany] = useState<Company | null>(null);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [activeTab, setActiveTab] = useState<"employees" | "settings">("employees");

    // Employee Modal
    const [isEmpModalOpen, setIsEmpModalOpen] = useState(false);
    const [newEmpName, setNewEmpName] = useState("");
    const [newEmpEmail, setNewEmpEmail] = useState("");
    const [newEmpPhone, setNewEmpPhone] = useState("");
    const [newEmpPassword, setNewEmpPassword] = useState("");
    const [newEmpId, setNewEmpId] = useState("");
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
            });
            await fetchCompanyData(); // Refresh list
            setNewEmpName("");
            setNewEmpEmail("");
            setNewEmpPhone("");
            setNewEmpPassword("");
            setNewEmpId("");
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
            // Expected headers: full_name, email, phone, employee_id
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
                alert("No valid rows found in CSV. Headers should be: full_name, email, phone, employee_id");
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

        try {
            await apiClient.updateCompany(company.id, { [key]: newVal });
        } catch (err) {
            setCompany({ ...company, [key]: !newVal }); // Revert
            alert("Failed to update settings");
        }
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
                    <button
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

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => setActiveTab("employees")}
                        className={cx(
                            "whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium",
                            activeTab === "employees"
                                ? "border-[#f47f00] text-[#f47f00]"
                                : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
                        )}
                    >
                        Employees
                    </button>
                    <button
                        onClick={() => setActiveTab("settings")}
                        className={cx(
                            "whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium",
                            activeTab === "settings"
                                ? "border-[#f47f00] text-[#f47f00]"
                                : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
                        )}
                    >
                        Settings & Whitelisting
                    </button>
                </nav>
            </div>

            {activeTab === "employees" && (
                <div className="space-y-4 animate-in fade-in duration-300">
                    <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <div className="text-sm text-slate-600">
                            Manage your full roster here.
                        </div>
                        <div className="flex gap-2">
                            <label className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors cursor-pointer">
                                <input
                                    type="file"
                                    accept=".csv"
                                    onChange={handleCsvUpload}
                                    className="hidden"
                                    disabled={isUploadingCsv}
                                />
                                <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                                {isUploadingCsv ? "Uploading..." : "Upload CSV"}
                            </label>
                            <button
                                onClick={() => setIsEmpModalOpen(true)}
                                className="inline-flex h-9 items-center justify-center rounded-lg bg-[#f47f00] px-4 text-sm font-bold text-white hover:bg-[#d97000] shadow-md shadow-orange-500/10 transition-colors"
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
                                                    onClick={() => handleToggleStatus(emp)}
                                                    className="text-xs font-semibold text-[#f47f00] hover:underline"
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

            {activeTab === "settings" && (
                <div className="grid gap-6 md:grid-cols-2 animate-in fade-in duration-300">
                    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                        <h3 className="text-lg font-bold text-[#0c225e] mb-4">Service Configuration</h3>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                                <div>
                                    <div className="font-semibold text-slate-700">Shuttle Service</div>
                                    <div className="text-xs text-slate-500">Enable Fixed Routes & Stops</div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={company.is_shuttle_enabled}
                                        onChange={() => toggleService('shuttle')}
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#f47f00]"></div>
                                </label>
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                                <div>
                                    <div className="font-semibold text-slate-700">Chauffeur Service</div>
                                    <div className="text-xs text-slate-500">Enable On-Demand Bookings</div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={company.is_chauffeur_enabled}
                                        onChange={() => toggleService('chauffeur')}
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#f47f00]"></div>
                                </label>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-lg font-bold text-[#0c225e]">Vehicle Whitelisting</h3>
                                <div className="text-xs text-slate-500 mt-1">Select vehicles available for Chauffeur bookings.</div>
                            </div>
                            {!company.is_chauffeur_enabled && (
                                <Badge color="red">Disabled (Chauffeur Off)</Badge>
                            )}
                        </div>

                        <div className={cx("grid grid-cols-2 gap-2", !company.is_chauffeur_enabled && "opacity-50 pointer-events-none")}>
                            {availableVehicleModels.map(model => {
                                const isAllowed = currentModels.includes(model);
                                return (
                                    <button
                                        key={model}
                                        onClick={() => toggleVehicleModel(model)}
                                        className={cx(
                                            "flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all border",
                                            isAllowed
                                                ? "bg-purple-50 border-purple-200 text-purple-700"
                                                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
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
                            onClick={handleCreateEmployee}
                            disabled={isCreatingEmp}
                            className="px-4 py-2 text-sm font-bold text-white bg-[#f47f00] rounded-lg hover:bg-[#d97000] disabled:opacity-50"
                        >
                            {isCreatingEmp ? "Adding..." : "Add Employee"}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
