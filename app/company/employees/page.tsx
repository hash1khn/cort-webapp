"use client";

import { useCallback, useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../lib/store/hooks";
import { selectCompany, selectCompanyFeatures } from "../../lib/store/slices/companySlice";
import {
  fetchEmployees,
  selectEmployees,
  selectEmployeesStatus,
  updateEmployee,
  deactivateEmployee,
  createEmployee,
  invalidateEmployeesCache,
} from "../../lib/store/slices/employeeSlice";
import { apiClient } from "../../lib/services/api-client";
import { useAuth } from "../../lib/contexts/auth-context";
import { UserRole } from "../../lib/types/auth-types";
import { Card } from "../components/DashboardComponents";
import { PageHeader, TABLE_CARD_CLASS, TABLE_TOP_BAR_CLASS, TABLE_HEADER_CELL_CLASS, TABLE_CELL_CLASS } from "../components/PageLayout";
import TableSkeleton from "@/app/components/ui/TableSkeleton";
import { Button } from "@/app/admin/ui/Button";
import { Plus, X } from "lucide-react";
import {
  getPhoneValidationError,
  PHONE_MAX_LENGTH,
  sanitizePhoneInput,
} from "../../lib/utils/phone";
import { toast } from "sonner";

type Department = { id: number; name: string; is_active: boolean };

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

const emptyCreateForm = () => ({
  full_name: "",
  email: "",
  phone: "",
  employee_id: "",
  department_id: "",
  home_address: "",
});

export default function EmployeesPage() {
  const dispatch = useAppDispatch();
  const company = useAppSelector(selectCompany);
  const features = useAppSelector(selectCompanyFeatures);
  const employees = useAppSelector(selectEmployees);
  const status = useAppSelector(selectEmployeesStatus);
  const { user, isCompanyAdmin } = useAuth();
  const loading = status === "loading";

  const shuttleSelfManaged = features.find((f) => f.feature_key === "shuttle_self_managed")?.is_enabled ?? false;
  const isRequester = user?.role === UserRole.SHUTTLE_REQUESTER;
  const selfManagedMode = shuttleSelfManaged && (isCompanyAdmin || isRequester);

  const [departments, setDepartments] = useState<Department[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    employee_id: "",
    department_id: "",
    home_address: "",
  });

  const companyId = company?.id?.toString();

  const loadEmployees = useCallback(() => {
    if (!companyId) return;
    dispatch(invalidateEmployeesCache());
    dispatch(fetchEmployees(companyId));
  }, [companyId, dispatch]);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  useEffect(() => {
    if (!selfManagedMode || !company?.id) return;
    apiClient.getDepartments(Number(company.id))
      .then((res) => setDepartments(res.data ?? []))
      .catch(() => toast.error("Failed to load departments"));
  }, [selfManagedMode, company?.id]);

  useEffect(() => {
    if (isRequester && user?.department_id) {
      setCreateForm((f) => ({ ...f, department_id: String(user.department_id) }));
    }
  }, [isRequester, user?.department_id]);

  if (!company) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-[var(--text-muted)]">No company selected</div>
      </div>
    );
  }

  function startEdit(employee: typeof employees[0]) {
    setEditingId(employee.id);
    setEditForm({
      full_name: employee.full_name,
      email: employee.email,
      phone: employee.phone || "",
      employee_id: employee.employee_id || "",
      department_id: employee.department_id ? String(employee.department_id) : "",
      home_address: employee.home_address || "",
    });
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function saveEdit(employee: typeof employees[0]) {
    if (!editingId) return;
    const phoneError = getPhoneValidationError(editForm.phone);
    if (phoneError) {
      toast.error(phoneError);
      return;
    }

    const data: Record<string, unknown> = selfManagedMode
      ? {
          full_name: editForm.full_name.trim(),
          email: editForm.email.trim(),
          phone: editForm.phone.trim() || undefined,
          employee_id: editForm.employee_id.trim() || undefined,
          home_address: editForm.home_address.trim() || undefined,
          ...(editForm.department_id ? { department_id: Number(editForm.department_id) } : {}),
        }
      : { phone: editForm.phone, email: editForm.email };

    try {
      await dispatch(updateEmployee({ employeeId: employee.id, data: data as any })).unwrap();
      toast.success("Employee updated");
      loadEmployees();
      cancelEdit();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to update employee");
    }
  }

  async function handleDeactivate(employee: typeof employees[0]) {
    const isActive = employee.status.toLowerCase() === "active";
    if (!confirm(`Are you sure you want to ${isActive ? "deactivate" : "activate"} ${employee.full_name}?`)) return;
    try {
      await dispatch(deactivateEmployee({ employeeId: employee.id, isActive: !isActive })).unwrap();
      toast.success(isActive ? "Employee deactivated" : "Employee activated");
    } catch {
      toast.error("Failed to update status");
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!company?.id) return;

    if (selfManagedMode && isCompanyAdmin && !createForm.department_id) {
      toast.error("Department is required");
      return;
    }

    const phoneError = getPhoneValidationError(createForm.phone);
    if (phoneError) {
      toast.error(phoneError);
      return;
    }

    setCreating(true);
    try {
      await dispatch(createEmployee({
        full_name: createForm.full_name.trim(),
        email: createForm.email.trim(),
        phone: createForm.phone.trim() || undefined,
        company_id: Number(company!.id),
        employee_id: createForm.employee_id.trim() || undefined,
        home_address: createForm.home_address.trim() || undefined,
        department_id: createForm.department_id ? Number(createForm.department_id) : undefined,
      })).unwrap();
      toast.success("Employee created");
      setShowCreate(false);
      setCreateForm(emptyCreateForm());
      if (isRequester && user?.department_id) {
        setCreateForm((f) => ({ ...f, department_id: String(user.department_id) }));
      }
      loadEmployees();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to create employee");
    } finally {
      setCreating(false);
    }
  }

  const activeDepartments = departments.filter((d) => d.is_active);
  const deptLabel = (e: typeof employees[0]) => e.departments?.name ?? e.department ?? "—";

  return (
    <div className="flex flex-col gap-6 max-w-[1600px] mx-auto pb-12">
      <PageHeader
        label="Roster Management"
        title={isRequester && selfManagedMode ? "My Department" : "Employees"}
        description={
          selfManagedMode
            ? isRequester
              ? "Manage employees in your department"
              : "Create and manage employees across all departments"
            : undefined
        }
        action={
          selfManagedMode ? (
            <Button
              onClick={() => setShowCreate(true)}
              className="gap-2 bg-[var(--cort-orange)] hover:bg-[var(--cort-orange)]/90 text-white border-0 rounded-xl"
            >
              <Plus className="w-4 h-4" />
              Add Employee
            </Button>
          ) : undefined
        }
      />

      <Card className={`min-h-[500px] ${TABLE_CARD_CLASS}`}>
        {!selfManagedMode && (
          <div className={TABLE_TOP_BAR_CLASS}>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-[var(--cort-orange)]/10 border border-[var(--cort-orange)]/20 rounded-lg text-[var(--cort-orange)]">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <div>
                <div className="text-sm font-bold text-[var(--text-primary)]">Read-Only Roster</div>
                <div className="text-sm text-[var(--text-muted)] mt-0.5 leading-relaxed max-w-3xl">
                  This roster is synced from the Cort Admin portal. You can update contact details or deactivate status, but main record creation happens centrally.
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left">
            <thead>
              <tr className="border-b border-[var(--border-light)]">
                <th className={TABLE_HEADER_CELL_CLASS}>Employee ID</th>
                <th className={TABLE_HEADER_CELL_CLASS}>Full Name</th>
                <th className={TABLE_HEADER_CELL_CLASS}>Phone</th>
                <th className={TABLE_HEADER_CELL_CLASS}>Email</th>
                <th className={TABLE_HEADER_CELL_CLASS}>Department</th>
                {selfManagedMode && <th className={TABLE_HEADER_CELL_CLASS}>Home Address</th>}
                <th className={TABLE_HEADER_CELL_CLASS}>Status</th>
                <th className={`${TABLE_HEADER_CELL_CLASS} text-right`}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-light)]/50">
              {loading && employees.length === 0 ? (
                <TableSkeleton columns={selfManagedMode ? 8 : 7} rows={8} />
              ) : employees.length === 0 && !loading ? (
                <tr>
                  <td colSpan={selfManagedMode ? 8 : 7} className={`${TABLE_CELL_CLASS} py-12 text-center text-[var(--text-muted)]`}>
                    {selfManagedMode ? "No employees yet. Add your first employee." : "No employees found. Employees are uploaded by Cort Super Admin."}
                  </td>
                </tr>
              ) : (
                employees.map((e) => {
                  const isEditing = editingId === e.id;
                  return (
                    <tr key={e.id} className={cx("group transition-colors", isEditing ? "bg-[var(--cort-orange)]/5" : "hover:bg-[var(--surface-subtle)]/80")}>
                      <td className={`${TABLE_CELL_CLASS} font-mono text-xs text-[var(--text-muted)]`}>
                        {isEditing && selfManagedMode ? (
                          <TextInput value={editForm.employee_id} onChange={(ev) => setEditForm({ ...editForm, employee_id: ev.target.value })} placeholder="EMP-001" />
                        ) : (
                          e.employee_id || "—"
                        )}
                      </td>
                      <td className={`${TABLE_CELL_CLASS} font-bold text-white`}>
                        {isEditing && selfManagedMode ? (
                          <TextInput value={editForm.full_name} onChange={(ev) => setEditForm({ ...editForm, full_name: ev.target.value })} />
                        ) : (
                          e.full_name
                        )}
                      </td>
                      <td className={TABLE_CELL_CLASS}>
                        {isEditing ? (
                          <TextInput
                            type="tel"
                            inputMode="numeric"
                            maxLength={PHONE_MAX_LENGTH}
                            value={editForm.phone}
                            onChange={(ev) => setEditForm({ ...editForm, phone: sanitizePhoneInput(ev.target.value) })}
                            placeholder="03001234567"
                          />
                        ) : (
                          <span className="text-[var(--text-secondary)] font-medium">{e.phone || "—"}</span>
                        )}
                      </td>
                      <td className={TABLE_CELL_CLASS}>
                        {isEditing ? (
                          <TextInput value={editForm.email} onChange={(ev) => setEditForm({ ...editForm, email: ev.target.value })} placeholder="Email" />
                        ) : (
                          <span className="text-[var(--text-secondary)]">{e.email || "—"}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-[var(--text-muted)]">
                        {isEditing && selfManagedMode && isCompanyAdmin ? (
                          <select
                            value={editForm.department_id}
                            onChange={(ev) => setEditForm({ ...editForm, department_id: ev.target.value })}
                            className="h-9 w-full rounded-lg border border-[var(--border-light)] bg-[var(--bg-card)] px-2 text-sm"
                          >
                            <option value="">Select department</option>
                            {activeDepartments.map((d) => (
                              <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                          </select>
                        ) : (
                          deptLabel(e)
                        )}
                      </td>
                      {selfManagedMode && (
                        <td className={TABLE_CELL_CLASS}>
                          {isEditing ? (
                            <TextInput value={editForm.home_address} onChange={(ev) => setEditForm({ ...editForm, home_address: ev.target.value })} placeholder="Home address" />
                          ) : (
                            <span className="text-[var(--text-muted)] text-xs">{e.home_address || "—"}</span>
                          )}
                        </td>
                      )}
                      <td className="px-6 py-4">
                        <span className={cx(
                          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold border",
                          e.status.toLowerCase() === "active"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "bg-rose-500/10 text-rose-400 border-rose-500/20",
                        )}>
                          <span className={cx("w-1.5 h-1.5 rounded-full mr-1.5", e.status.toLowerCase() === "active" ? "bg-emerald-400" : "bg-rose-400")} />
                          {e.status}
                        </span>
                      </td>
                      <td className={`${TABLE_CELL_CLASS} text-right`}>
                        <div className="flex items-center justify-end gap-2">
                          {isEditing ? (
                            <>
                              <button type="button" onClick={() => saveEdit(e)} className="inline-flex h-8 items-center justify-center rounded-lg bg-[var(--cort-orange)] px-3 text-xs font-bold text-white">Save</button>
                              <button type="button" onClick={cancelEdit} className="inline-flex h-8 items-center justify-center rounded-lg border border-[var(--border-input)] px-3 text-xs font-bold text-[var(--text-secondary)]">Cancel</button>
                            </>
                          ) : (
                            <>
                              <button type="button" onClick={() => startEdit(e)} className="p-1.5 text-[var(--text-muted)] hover:text-[var(--cort-orange)] hover:bg-[var(--cort-orange)]/10 rounded-lg" title="Edit">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                              </button>
                              <button type="button" onClick={() => handleDeactivate(e)} className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-rose-400 hover:bg-rose-500/10" title="Toggle status">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
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

      {showCreate && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
          <div className="fixed inset-y-0 right-0 z-50 flex flex-col w-full max-w-lg bg-[var(--bg-card)] border-l border-[var(--border-default)] shadow-2xl overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border-light)]">
              <h2 className="font-bold text-[var(--text-primary)]">Add Employee</h2>
              <button onClick={() => setShowCreate(false)} className="p-1.5 rounded-lg hover:bg-[var(--bg-subtle)]"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreate} className="flex flex-col flex-1 p-6 gap-4">
              <div>
                <label className="text-xs font-semibold text-[var(--text-muted)] uppercase">Full Name *</label>
                <TextInput required value={createForm.full_name} onChange={(ev) => setCreateForm({ ...createForm, full_name: ev.target.value })} className="mt-1 w-full" />
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--text-muted)] uppercase">Email *</label>
                <TextInput required type="email" value={createForm.email} onChange={(ev) => setCreateForm({ ...createForm, email: ev.target.value })} className="mt-1 w-full" />
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--text-muted)] uppercase">Phone</label>
                <TextInput type="tel" value={createForm.phone} onChange={(ev) => setCreateForm({ ...createForm, phone: sanitizePhoneInput(ev.target.value) })} className="mt-1 w-full" />
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--text-muted)] uppercase">Employee ID</label>
                <TextInput value={createForm.employee_id} onChange={(ev) => setCreateForm({ ...createForm, employee_id: ev.target.value })} className="mt-1 w-full" />
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--text-muted)] uppercase">Department *</label>
                {isRequester ? (
                  <TextInput
                    readOnly
                    value={activeDepartments.find((d) => d.id === user?.department_id)?.name ?? "Your department"}
                    className="mt-1 w-full opacity-70"
                  />
                ) : (
                  <select
                    required
                    value={createForm.department_id}
                    onChange={(ev) => setCreateForm({ ...createForm, department_id: ev.target.value })}
                    className="mt-1 w-full h-9 rounded-lg border border-[var(--border-light)] bg-[var(--bg-card)] px-3 text-sm"
                  >
                    <option value="">Select department</option>
                    {activeDepartments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                )}
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--text-muted)] uppercase">Home Address</label>
                <TextInput value={createForm.home_address} onChange={(ev) => setCreateForm({ ...createForm, home_address: ev.target.value })} className="mt-1 w-full" />
              </div>
              <div className="mt-auto pt-4 flex gap-2">
                <Button type="button" variant="outline" onClick={() => setShowCreate(false)} className="flex-1">Cancel</Button>
                <Button type="submit" disabled={creating} className="flex-1 bg-[var(--cort-orange)] text-white border-0">
                  {creating ? "Creating…" : "Create Employee"}
                </Button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
