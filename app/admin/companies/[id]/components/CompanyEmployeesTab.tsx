"use client";

import { cx } from "../../../components/ui/cx";
import { Badge } from "../../../components/ui/Badge";
import { Modal } from "../../../components/ui/Modal";
import { ToggleSwitch } from "../../../components/ToggleSwitch";
import Link from "next/link";

import type { useCompanyDetail } from "../hooks/useCompanyDetail";

type Props = { detail: ReturnType<typeof useCompanyDetail> };

export function CompanyEmployeesTab({ detail: d }: Props) {
  return (
                <div className="space-y-4 animate-in fade-in duration-300">
                    <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <div className="text-sm text-slate-600">
                            Manage your full roster here.
                        </div>
                        <div className="flex gap-2">
                            <label
                                className={cx(
                                    "inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors",
                                    d.canCreate ? "cursor-pointer" : "cursor-not-allowed opacity-50 pointer-events-none",
                                )}
                            >
                                <input
                                    type="file"
                                    accept=".csv"
                                    onChange={d.handleCsvUpload}
                                    className="hidden"
                                    disabled={d.isUploadingCsv || !d.canCreate}
                                />
                                <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                                {d.isUploadingCsv ? "Uploading..." : "Upload CSV"}
                            </label>
                            <button
                                type="button"
                                onClick={() => d.setIsEmpModalOpen(true)}
                                disabled={!d.canCreate}
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
                                    {d.employees.map((emp) => (
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
                                                    onClick={() => d.handleToggleStatus(emp)}
                                                    disabled={!d.canUpdate}
                                                    className="text-xs font-semibold text-[#f47f00] hover:underline disabled:opacity-40 disabled:no-underline disabled:cursor-not-allowed"
                                                >
                                                    {emp.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {d.employees.length === 0 && (
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
  );
}
