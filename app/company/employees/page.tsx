"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { UserPlus, X } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../lib/store/hooks";
import { selectCompany } from "../../lib/store/slices/companySlice";
import { fetchEmployees, selectEmployees, selectEmployeesStatus, updateEmployee, deactivateEmployee } from "../../lib/store/slices/employeeSlice";
import { useAuth } from "../../lib/contexts/auth-context";
import { apiClient } from "../../lib/services/api-client";
import { Card } from "../components/DashboardComponents";
import { AccountCredentialsReveal, SaveCredentialsNote } from "../components/AccountCredentialsReveal";
import { PageHeader, TABLE_CARD_CLASS, TABLE_TOP_BAR_CLASS, TABLE_HEADER_CELL_CLASS, TABLE_CELL_CLASS } from "../components/PageLayout";
import TablePageSkeleton from "../components/TablePageSkeleton";
import TableSkeleton from "@/app/components/ui/TableSkeleton";
import {
  getPhoneValidationError,
  PHONE_MAX_LENGTH,
  PHONE_PLACEHOLDER,
  sanitizePhoneInput,
} from "../../lib/utils/phone";
import { toast } from "sonner";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cx(
        "h-9 rounded-lg border border-[var(--border-light)] bg-[var(--bg-card)] px-3 text-sm outline-none focus:ring-2 focus:ring-[var(--cort-orange)]/20 focus:border-[var(--cort-orange)] transition-all text-[var(--text-primary)] shadow-sm",
        props.className,
      )}
    />
  );
}

export default function EmployeesPage() {
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const isTrialUser = !!user?.is_trial;
  const maxEmployees = user?.trial_modules === "both" ? 6 : 3;
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

  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [employeeSaving, setEmployeeSaving] = useState(false);
  const [employeeFormError, setEmployeeFormError] = useState<string | null>(null);
  const [employeeCreated, setEmployeeCreated] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; password: string; full_name: string } | null>(null);
  const [employeeForm, setEmployeeForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    department: "",
    employee_id: "",
  });

  const atEmployeeLimit = isTrialUser && employees.length >= maxEmployees;

  function closeAddEmployeeModal() {
    setShowAddEmployee(false);
    setEmployeeCreated(false);
    setCreatedCredentials(null);
    setEmployeeFormError(null);
    setEmployeeForm({ full_name: "", email: "", phone: "", department: "", employee_id: "" });
  }

  async function handleAddEmployee(e: React.FormEvent) {
    e.preventDefault();
    if (!company?.id) return;
    const phoneError = getPhoneValidationError(employeeForm.phone);
    if (phoneError) {
      setEmployeeFormError(phoneError);
      return;
    }
    setEmployeeSaving(true);
    setEmployeeFormError(null);
    try {
      const created = await apiClient.createEmployee({
        full_name: employeeForm.full_name.trim(),
        email: employeeForm.email.trim(),
        phone: employeeForm.phone.trim(),
        department: employeeForm.department.trim() || undefined,
        employee_id: employeeForm.employee_id.trim() || undefined,
        company_id: Number(company.id),
      });
      const password = created.data?.password;
      if (password) {
        setCreatedCredentials({
          email: employeeForm.email.trim(),
          password,
          full_name: employeeForm.full_name.trim(),
        });
      }
      setEmployeeCreated(true);
      dispatch(fetchEmployees(company.id.toString()));
      toast.success("Employee created");
    } catch (err) {
      setEmployeeFormError(err instanceof Error ? err.message : "Failed to create employee");
    } finally {
      setEmployeeSaving(false);
    }
  }

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
    const phoneError = getPhoneValidationError(editPhone);
    if (phoneError) {
      toast.error(phoneError);
      return;
    }
    const result = await dispatch(updateEmployee({
      employeeId: employee.id,
      data: { phone: editPhone, email: editEmail }
    }));
    if (updateEmployee.fulfilled.match(result)) {
      toast.success("Employee updated successfully");
      if (company?.id) dispatch(fetchEmployees(company.id.toString()));
    } else {
      toast.error((result.payload as string) || "Failed to update employee");
    }
    cancelEdit();
  }

  async function handleDeactivate(employee: typeof employees[0]) {
    const isActive = employee.status.toLowerCase() === "active";
    if (confirm(`Are you sure you want to ${isActive ? "deactivate" : "activate"} ${employee.full_name}?`)) {
      const result = await dispatch(deactivateEmployee({
        employeeId: employee.id,
        isActive: !isActive
      }));
      if (deactivateEmployee.fulfilled.match(result)) {
        toast.success(`${employee.full_name} has been ${!isActive ? "activated" : "deactivated"}.`);
      } else {
        toast.error((result.payload as string) || "Failed to update employee status");
      }
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-[1600px] mx-auto pb-12">
      <PageHeader label="Roster Management" title="Employees" />

      {isTrialUser && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/90">
          Trial: {employees.length} of {maxEmployees} employees used. Add employees here and share their app login credentials after creation.
        </div>
      )}

      <Card className={`min-h-[500px] ${TABLE_CARD_CLASS}`}>
        <div className={TABLE_TOP_BAR_CLASS}>
          <div className="flex items-start justify-between gap-4 w-full">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-[var(--cort-orange)]/10 border border-[var(--cort-orange)]/20 rounded-lg text-[var(--cort-orange)]">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <div>
                <div className="text-sm font-bold text-[var(--text-primary)]">
                  {isTrialUser ? "Trial employee roster" : "Read-Only Roster"}
                </div>
                <div className="text-sm text-[var(--text-muted)] mt-0.5 leading-relaxed max-w-3xl">
                  {isTrialUser
                    ? "Add employees for your trial and assign them to shuttle routes from the Routes page."
                    : "This roster is synced from the Cort Admin portal. You can update contact details or deactivate status, but main record creation happens centrally."}
                </div>
              </div>
            </div>
            {isTrialUser && (
              <button
                type="button"
                onClick={() => setShowAddEmployee(true)}
                disabled={atEmployeeLimit}
                className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-[var(--cort-orange)] px-4 py-2 text-sm font-bold text-[var(--text-primary)] shadow-sm hover:bg-[var(--cort-orange-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                Add Employee
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left">
            <thead>
              <tr className="border-b border-[var(--border-light)]">
                <th className={TABLE_HEADER_CELL_CLASS}>Employee ID</th>
                <th className={TABLE_HEADER_CELL_CLASS}>Full Name</th>
                <th className={TABLE_HEADER_CELL_CLASS}>Home Address</th>
                <th className={TABLE_HEADER_CELL_CLASS}>Phone</th>
                <th className={TABLE_HEADER_CELL_CLASS}>Email</th>
                <th className={TABLE_HEADER_CELL_CLASS}>Department</th>
                <th className={TABLE_HEADER_CELL_CLASS}>Status</th>
                <th className={`${TABLE_HEADER_CELL_CLASS} text-right`}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-light)]/50">
              {loading && employees.length === 0 ? (
                <TableSkeleton columns={8} rows={8} />
              ) : employees.length === 0 && !loading ? (
                <tr>
                  <td colSpan={8} className={`${TABLE_CELL_CLASS} py-12 text-center text-[var(--text-muted)]`}>
                    No employees found. Employees are uploaded by Cort Super Admin.
                  </td>
                </tr>
              ) : (
                employees.map((e) => {
                  const isEditing = editingId === e.id;
                  return (
                    <tr key={e.id} className={`group transition-colors ${isEditing ? 'bg-[var(--cort-orange)]/5' : 'hover:bg-[var(--surface-subtle)]/80'}`}>
                      <td className={`${TABLE_CELL_CLASS} font-mono text-xs text-[var(--text-muted)]`}>{e.employee_id || "—"}</td>
                      <td className={`${TABLE_CELL_CLASS} font-bold text-[var(--text-primary)]`}>{e.full_name}</td>
                      <td className={`${TABLE_CELL_CLASS} text-[var(--text-secondary)] max-w-[420px]`}>
                        <span className="line-clamp-2">{e.home_address || "—"}</span>
                      </td>
                      <td className={TABLE_CELL_CLASS}>
                        {isEditing ? (
                          <TextInput
                            type="tel"
                            inputMode="numeric"
                            maxLength={PHONE_MAX_LENGTH}
                            value={editPhone}
                            onChange={(ev) => setEditPhone(sanitizePhoneInput(ev.target.value))}
                            placeholder="03001234567"
                          />
                        ) : (
                          <span className="text-[var(--text-secondary)] font-medium">{e.phone || "—"}</span>
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
                          <span className="text-[var(--text-secondary)]">{e.email || "—"}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-[var(--text-muted)]">{e.department || "—"}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold border ${e.status.toLowerCase() === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                          'bg-rose-500/10 text-rose-400 border-rose-500/20'
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
                                className="inline-flex h-8 items-center justify-center rounded-lg bg-[var(--cort-orange)] px-3 text-xs font-bold text-[var(--text-primary)] shadow-sm hover:bg-[var(--cort-orange-hover)] transition-colors"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={cancelEdit}
                                className="inline-flex h-8 items-center justify-center rounded-lg border border-[var(--border-input)] bg-[var(--bg-subtle)] px-3 text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] transition-colors"
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
                                className={`p-1.5 rounded-lg transition-colors ${e.status.toLowerCase() === 'active' ? 'text-[var(--text-muted)] hover:text-rose-400 hover:bg-rose-500/10' : 'text-[var(--text-muted)] hover:text-emerald-400 hover:bg-emerald-500/10'}`}
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

      {showAddEmployee && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-[var(--text-primary)]">
                {employeeCreated ? "Employee Created" : "Add Employee"}
              </h2>
              <button type="button" onClick={closeAddEmployeeModal} className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {employeeCreated ? (
              <div className="space-y-5">
                {createdCredentials ? (
                  <AccountCredentialsReveal
                    email={createdCredentials.email}
                    password={createdCredentials.password}
                    fullName={createdCredentials.full_name}
                    subtitle="Share these credentials for the employee mobile app."
                  />
                ) : (
                  <SaveCredentialsNote accountType="employee" />
                )}
                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={closeAddEmployeeModal}
                    className="bg-[var(--cort-orange)] text-[var(--text-primary)] px-4 py-2 rounded-lg text-sm font-bold hover:bg-[var(--cort-orange-hover)] transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleAddEmployee} className="space-y-4">
                <SaveCredentialsNote accountType="employee" />
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Full Name *</label>
                    <TextInput required value={employeeForm.full_name} onChange={(e) => setEmployeeForm((f) => ({ ...f, full_name: e.target.value }))} placeholder="Ahmed Khan" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Employee ID</label>
                    <TextInput value={employeeForm.employee_id} onChange={(e) => setEmployeeForm((f) => ({ ...f, employee_id: e.target.value }))} placeholder="EMP-001" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Department</label>
                    <TextInput value={employeeForm.department} onChange={(e) => setEmployeeForm((f) => ({ ...f, department: e.target.value }))} placeholder="Engineering" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Email *</label>
                    <TextInput required type="email" value={employeeForm.email} onChange={(e) => setEmployeeForm((f) => ({ ...f, email: e.target.value }))} placeholder="ahmed@company.com" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Phone</label>
                    <TextInput
                      type="tel"
                      inputMode="numeric"
                      maxLength={PHONE_MAX_LENGTH}
                      value={employeeForm.phone}
                      onChange={(e) => setEmployeeForm((f) => ({ ...f, phone: sanitizePhoneInput(e.target.value) }))}
                      placeholder={PHONE_PLACEHOLDER}
                    />
                  </div>
                </div>
                {employeeFormError && (
                  <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                    {employeeFormError}
                  </div>
                )}
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={closeAddEmployeeModal} className="border border-[var(--border-light)] text-[var(--text-secondary)] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[var(--surface-subtle)] transition-colors">
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={employeeSaving || !employeeForm.full_name.trim() || !employeeForm.email.trim()}
                    className="inline-flex items-center gap-2 bg-[var(--cort-orange)] text-[var(--text-primary)] px-4 py-2 rounded-lg text-sm font-bold hover:bg-[var(--cort-orange-hover)] disabled:opacity-50 transition-colors"
                  >
                    <UserPlus className="w-4 h-4" />
                    {employeeSaving ? "Adding…" : "Add Employee"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
