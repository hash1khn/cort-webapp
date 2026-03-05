"use client";

import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../lib/store/hooks";
import { selectCompany } from "../../lib/store/slices/companySlice";
import { fetchEmployees, selectEmployees, selectEmployeesStatus, updateEmployee, deactivateEmployee } from "../../lib/store/slices/employeeSlice";
import { Card } from "../components/DashboardComponents";
import { PageHeader, TABLE_CARD_CLASS, TABLE_TOP_BAR_CLASS, TABLE_HEADER_CELL_CLASS, TABLE_CELL_CLASS } from "../components/PageLayout";
import TablePageSkeleton from "../components/TablePageSkeleton";
import TableSkeleton from "@/app/components/ui/TableSkeleton";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cx(
        "h-9 rounded-lg border border-[var(--border-light)] bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[var(--cort-orange)]/20 focus:border-[var(--cort-orange)] transition-all text-[var(--cort-navy)] shadow-sm",
        props.className,
      )}
    />
  );
}

export default function EmployeesPage() {
  const dispatch = useAppDispatch();
  const company = useAppSelector(selectCompany);
  const employees = useAppSelector(selectEmployees);
  const status = useAppSelector(selectEmployeesStatus);
  const loading = status === 'loading';

  const [lastFetchedParams, setLastFetchedParams] = useState<string>("");

  useEffect(() => {
    if (!company?.id) return;

    if (company.id.toString() === lastFetchedParams && status !== 'idle') return;

    setLastFetchedParams(company.id.toString());
    dispatch(fetchEmployees(company.id.toString()));
  }, [dispatch, company?.id, lastFetchedParams, status]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPhone, setEditPhone] = useState<string>("");
  const [editEmail, setEditEmail] = useState<string>("");

  if (!company) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-[var(--text-muted)]">No company selected</div>
      </div>
    );
  }

  function startEdit(employee: typeof employees[0]) {
    setEditingId(employee.id);
    setEditPhone(employee.phone || "");
    setEditEmail(employee.email);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditPhone("");
    setEditEmail("");
  }

  async function saveEdit(employee: typeof employees[0]) {
    if (!editingId) return;
    await dispatch(updateEmployee({
      employeeId: employee.id,
      data: { phone: editPhone, email: editEmail }
    }));
    // Optimistically update or refetch - here relying on refetch or slice update logic
    if (company?.id) dispatch(fetchEmployees(company.id.toString())); // simple refetch to be sure
    cancelEdit();
  }

  async function handleDeactivate(employee: typeof employees[0]) {
    const isActive = employee.status.toLowerCase() === "active";
    if (confirm(`Are you sure you want to ${isActive ? "deactivate" : "activate"} ${employee.full_name}?`)) {
      await dispatch(deactivateEmployee({
        employeeId: employee.id,
        isActive: !isActive
      }));
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-[1600px] mx-auto pb-12">
      <PageHeader label="Roster Management" title="Employees" />

      <Card className={`min-h-[500px] ${TABLE_CARD_CLASS}`}>
        <div className={TABLE_TOP_BAR_CLASS}>
          <div className="flex items-start gap-3">
            <div className="p-2 bg-[var(--cort-orange)]/10 border border-[var(--cort-orange)]/20 rounded-lg text-[var(--cort-orange)]">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div>
              <div className="text-sm font-bold text-[var(--cort-navy)]">Read-Only Roster</div>
              <div className="text-sm text-[var(--text-muted)] mt-0.5 leading-relaxed max-w-3xl">
                This roster is synced from the Cort Admin portal. You can update contact details or deactivate status, but main record creation happens centrally.
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left">
            <thead>
              <tr className="border-b border-[var(--border-light)]">
                <th className={TABLE_HEADER_CELL_CLASS}>Employee ID</th>
                <th className={TABLE_HEADER_CELL_CLASS}>Full Name</th>
                <th className={TABLE_HEADER_CELL_CLASS}>Phone</th>
                <th className={TABLE_HEADER_CELL_CLASS}>Email</th>
                <th className={TABLE_HEADER_CELL_CLASS}>Department</th>
                <th className={TABLE_HEADER_CELL_CLASS}>Status</th>
                <th className={`${TABLE_HEADER_CELL_CLASS} text-right`}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-light)]/50">
              {loading && employees.length === 0 ? (
                <TableSkeleton columns={7} rows={8} />
              ) : employees.length === 0 && !loading ? (
                <tr>
                  <td colSpan={7} className={`${TABLE_CELL_CLASS} py-12 text-center text-[var(--text-muted)]`}>
                    No employees found. Employees are uploaded by Cort Super Admin.
                  </td>
                </tr>
              ) : (
                employees.map((e) => {
                  const isEditing = editingId === e.id;
                  return (
                    <tr key={e.id} className={`group transition-colors ${isEditing ? 'bg-[var(--cort-orange)]/5' : 'hover:bg-[var(--surface-subtle)]/80'}`}>
                      <td className={`${TABLE_CELL_CLASS} font-mono text-xs text-[var(--text-muted)]`}>{e.employee_id || "—"}</td>
                      <td className={`${TABLE_CELL_CLASS} font-bold text-[var(--cort-navy)]`}>{e.full_name}</td>
                      <td className={TABLE_CELL_CLASS}>
                        {isEditing ? (
                          <TextInput
                            value={editPhone}
                            onChange={(ev) => setEditPhone(ev.target.value)}
                            placeholder="Phone"
                          />
                        ) : (
                          <span className="text-[var(--cort-navy)] font-medium">{e.phone || "—"}</span>
                        )}
                      </td>
                      <td className={TABLE_CELL_CLASS}>
                        {isEditing ? (
                          <TextInput
                            value={editEmail}
                            onChange={(ev) => setEditEmail(ev.target.value)}
                            placeholder="Email"
                          />
                        ) : (
                          <span className="text-[var(--cort-navy)]">{e.email || "—"}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-500">{e.department || "—"}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold border ${e.status.toLowerCase() === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          'bg-rose-50 text-rose-700 border-rose-200'
                          }`}>
                          <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${e.status.toLowerCase() === 'active' ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
                          {e.status}
                        </span>
                      </td>
                      <td className={`${TABLE_CELL_CLASS} text-right`}>
                        <div className="flex items-center justify-end gap-2">
                          {isEditing ? (
                            <>
                              <button
                                type="button"
                                onClick={() => saveEdit(e)}
                                className="inline-flex h-8 items-center justify-center rounded-lg bg-[var(--cort-orange)] px-3 text-xs font-bold text-white shadow-sm hover:bg-[var(--cort-orange-hover)] transition-colors"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={cancelEdit}
                                className="inline-flex h-8 items-center justify-center rounded-lg border border-[var(--border-light)] bg-white px-3 text-xs font-bold text-[var(--cort-navy)] hover:bg-[var(--surface-subtle)] transition-colors"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => startEdit(e)}
                                className="p-1.5 text-[var(--text-muted)] hover:text-[var(--cort-orange)] hover:bg-[var(--cort-orange)]/10 rounded-lg transition-colors"
                                title="Edit Details"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeactivate(e)}
                                className={`p-1.5 rounded-lg transition-colors ${e.status.toLowerCase() === 'active' ? 'text-[var(--text-muted)] hover:text-rose-600 hover:bg-rose-50' : 'text-[var(--text-muted)] hover:text-emerald-600 hover:bg-emerald-50'}`}
                                title={e.status.toLowerCase() === "active" ? "Deactivate User" : "Activate User"}
                              >
                                {e.status.toLowerCase() === "active" ? (
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                                ) : (
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                )}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
