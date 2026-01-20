"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { makeNewEmployee, useAdminStore } from "../../store/AdminStore";
import type { Company, Employee } from "../../store/types";

function cx(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

// -- Utilities --

function parseCsv(text: string) {
    const lines = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
    if (lines.length === 0) return [];

    const header = lines[0]!.split(",").map((h) => h.trim().toLowerCase());
    const rows = lines.slice(1);

    function idx(name: string) {
        return header.indexOf(name);
    }

    const iName = idx("full name");
    const iPhone = idx("phone");
    const iEmail = idx("email");
    const iEmp = idx("employee_id");

    return rows.map((row) => {
        const cols = row.split(",").map((c) => c.trim());
        return {
            full_name: cols[iName] ?? "",
            phone: cols[iPhone] ?? "",
            email: cols[iEmail] ?? "",
            employee_id: cols[iEmp] ?? "",
        };
    });
}

function downloadText(filename: string, content: string) {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
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
    const { db, upsertCompany, upsertEmployee, deleteCompany, vehicleModels } = useAdminStore();

    // We need to find the company from the store. 
    // Since the store might still be hydrating or finding, we handle the case where it's not found gracefully.
    const company = db.companies.find((c) => c.id === id);

    const [activeTab, setActiveTab] = useState<"employees" | "settings">("employees");
    const [isEmpModalOpen, setIsEmpModalOpen] = useState(false);
    const [newEmpName, setNewEmpName] = useState("");

    if (!company) {
        return (
            <div className="p-8 text-center">
                <div className="text-slate-500">Company not found.</div>
                <button onClick={() => router.push('/admin/companies')} className="mt-4 text-[#f47f00] hover:underline">
                    Back to Companies
                </button>
            </div>
        );
    }

    // -- Handlers --

    const handleCreateEmployee = () => {
        if (!newEmpName.trim()) return;
        const emp = makeNewEmployee(newEmpName);
        upsertEmployee(company.id, emp);
        setNewEmpName("");
        setIsEmpModalOpen(false);
    };

    const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
            const text = String(reader.result ?? "");
            const parsed = parseCsv(text);
            const newEmployees = parsed.map(row => {
                const emp = makeNewEmployee(row.full_name || "Employee");
                emp.full_name = row.full_name || emp.full_name;
                emp.phone = row.phone || "";
                emp.email = row.email || "";
                emp.employee_id = row.employee_id || "";
                // Mock auto-assign
                return emp;
            });

            // Merge into existing company
            const updatedCompany: Company = {
                ...company,
                employees: [...newEmployees, ...company.employees]
            };
            upsertCompany(updatedCompany);
        };
        reader.readAsText(file);
        e.target.value = ""; // Reset input
    };

    const handleExportCredentials = () => {
        const lines = [
            `Company: ${company.name}`,
            `Generated: ${new Date().toLocaleString()}`,
            "",
            "employee_id,full_name,username,password,email,phone,status",
            ...company.employees.map(e =>
                [e.employee_id, e.full_name, e.username, e.password, e.email, e.phone, e.status].join(",")
            )
        ];
        downloadText(`cort-${company.name}-credentials.csv`, lines.join("\n"));
    };

    const toggleVehicleModel = (model: string) => {
        const current = company.allowed_vehicle_models;
        const exists = current.includes(model);
        const next = exists ? current.filter(m => m !== model) : [...current, model];
        upsertCompany({ ...company, allowed_vehicle_models: next.sort() });
    };

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
                        <p className="text-sm text-slate-500 mt-1">{company.employees.length} Employees • {company.address || "No address"}</p>
                    </div>
                    <button
                        onClick={handleExportCredentials}
                        className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
                    >
                        <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Export Credentials
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
                            Manage your full roster here. Use CSV for bulk import.
                        </div>
                        <div className="flex gap-2">
                            <label className="cursor-pointer inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
                                <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                                Upload CSV
                                <input type="file" accept=".csv" className="hidden" onChange={handleCsvUpload} />
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
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {company.employees.map((emp) => (
                                        <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4 font-mono text-slate-500 text-xs">{emp.employee_id || "—"}</td>
                                            <td className="px-6 py-4 font-medium text-[#0c225e]">{emp.full_name}</td>
                                            <td className="px-6 py-4 text-slate-500">
                                                <div className="text-xs">{emp.email || "No Email"}</div>
                                                <div className="text-xs">{emp.phone}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {emp.status === 'active' ? (
                                                    <Badge color="green">Active</Badge>
                                                ) : (
                                                    <Badge color="red">Inactive</Badge>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => {
                                                        const next = emp.status === 'active' ? 'inactive' : 'active';
                                                        upsertEmployee(company.id, { ...emp, status: next });
                                                    }}
                                                    className="text-xs font-semibold text-[#f47f00] hover:underline"
                                                >
                                                    {emp.status === 'active' ? 'Deactivate' : 'Activate'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {company.employees.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                                No employees found. Upload a CSV to get started.
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
                                        checked={company.services_enabled.shuttle_enabled}
                                        onChange={() => upsertCompany({
                                            ...company,
                                            services_enabled: { ...company.services_enabled, shuttle_enabled: !company.services_enabled.shuttle_enabled }
                                        })}
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
                                        checked={company.services_enabled.chauffeur_enabled}
                                        onChange={() => upsertCompany({
                                            ...company,
                                            services_enabled: { ...company.services_enabled, chauffeur_enabled: !company.services_enabled.chauffeur_enabled }
                                        })}
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
                            {!company.services_enabled.chauffeur_enabled && (
                                <Badge color="red">Disabled (Chauffeur Off)</Badge>
                            )}
                        </div>

                        <div className={cx("grid grid-cols-2 gap-2", !company.services_enabled.chauffeur_enabled && "opacity-50 pointer-events-none")}>
                            {vehicleModels.map(model => {
                                const isAllowed = company.allowed_vehicle_models.includes(model);
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
                            onKeyDown={(e) => e.key === 'Enter' && handleCreateEmployee()}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#f47f00] focus:ring-1 focus:ring-[#f47f00] outline-none"
                            placeholder="Jane Doe"
                        />
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <button onClick={() => setIsEmpModalOpen(false)} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800">Cancel</button>
                        <button onClick={handleCreateEmployee} className="px-4 py-2 text-sm font-bold text-white bg-[#f47f00] rounded-lg hover:bg-[#d97000]">Add Employee</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
