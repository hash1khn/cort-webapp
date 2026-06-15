"use client";

import { useCallback, useEffect, useState } from "react";
import { useAppSelector } from "../../lib/store/hooks";
import { selectCompany } from "../../lib/store/slices/companySlice";
import { apiClient } from "../../lib/services/api-client";
import {
  PageHeader,
  COMPANY_PAGE_CLASS,
  COMPANY_INPUT_CLASS,
  CompanyPageLoader,
  CompanyLoadingButton,
  CompanyModal,
} from "../components/PageLayout";
import { Card } from "../components/DashboardComponents";
import { Loader2, Pencil } from "lucide-react";
import {
  getPhoneValidationError,
  PHONE_MAX_LENGTH,
  sanitizePhoneInput,
} from "../../lib/utils/phone";
import { toast } from "sonner";

type Department = { id: number; name: string; is_active: boolean };

type Requester = {
  id: string;
  full_name: string;
  email: string;
  phone?: string | null;
  status: string;
  department_id?: number | null;
  departments?: { id: number; name: string } | null;
};

const emptyCreateForm = () => ({
  full_name: "",
  email: "",
  password: "",
  phone: "",
  department_id: "",
});

const emptyEditForm = () => ({
  full_name: "",
  email: "",
  phone: "",
  department_id: "",
  password: "",
});

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const fieldInputClass = cx(COMPANY_INPUT_CLASS, "h-10");

export default function RequestersPage() {
  const company = useAppSelector(selectCompany);
  const companyId = Number(company?.id);
  const [requesters, setRequesters] = useState<Requester[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [form, setForm] = useState(emptyCreateForm);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Requester | null>(null);
  const [editForm, setEditForm] = useState(emptyEditForm);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const [reqRes, deptRes] = await Promise.all([
        apiClient.getShuttleRequesters(companyId),
        apiClient.getDepartments(companyId),
      ]);
      setRequesters(reqRes.data ?? []);
      setDepartments(deptRes.data ?? []);
    } catch {
      toast.error("Failed to load requesters");
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async () => {
    if (!companyId || !form.department_id || !form.full_name.trim() || !form.email.trim() || !form.password || creating) {
      if (!creating) toast.error("Name, email, password, and department are required");
      return;
    }
    const phoneError = getPhoneValidationError(form.phone);
    if (phoneError) {
      toast.error(phoneError);
      return;
    }
    setCreating(true);
    try {
      await apiClient.createShuttleRequester(companyId, {
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        password: form.password,
        phone: form.phone.trim() || undefined,
        department_id: Number(form.department_id),
      });
      setForm(emptyCreateForm());
      toast.success("Requester created");
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to create requester");
    } finally {
      setCreating(false);
    }
  };

  const openEdit = (requester: Requester) => {
    setEditing(requester);
    setEditForm({
      full_name: requester.full_name,
      email: requester.email,
      phone: requester.phone ?? "",
      department_id: requester.department_id ? String(requester.department_id) : "",
      password: "",
    });
  };

  const closeEdit = () => {
    setEditing(null);
    setEditForm(emptyEditForm());
  };

  const handleSaveEdit = async () => {
    if (!companyId || !editing || saving) return;
    if (!editForm.full_name.trim() || !editForm.email.trim() || !editForm.department_id) {
      toast.error("Name, email, and department are required");
      return;
    }
    const phoneError = getPhoneValidationError(editForm.phone);
    if (phoneError) {
      toast.error(phoneError);
      return;
    }
    if (editForm.password && editForm.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setSaving(true);
    try {
      await apiClient.updateShuttleRequester(companyId, editing.id, {
        full_name: editForm.full_name.trim(),
        email: editForm.email.trim(),
        phone: editForm.phone.trim() || undefined,
        department_id: Number(editForm.department_id),
        ...(editForm.password ? { password: editForm.password } : {}),
      });
      toast.success("Requester updated");
      closeEdit();
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to update requester");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (requester: Requester) => {
    if (!companyId || actionId != null) return;
    const isActive = requester.status.toUpperCase() === "ACTIVE";
    const action = isActive ? "deactivate" : "activate";
    if (!confirm(`${isActive ? "Deactivate" : "Activate"} ${requester.full_name}?`)) return;

    setActionId(requester.id);
    try {
      if (isActive) {
        await apiClient.deactivateShuttleRequester(companyId, requester.id);
      } else {
        await apiClient.activateShuttleRequester(companyId, requester.id);
      }
      toast.success(`Requester ${action}d`);
      load();
    } catch (e: any) {
      toast.error(e?.message ?? `Failed to ${action} requester`);
    } finally {
      setActionId(null);
    }
  };

  const activeDepartments = departments.filter((d) => d.is_active);

  return (
    <div className={COMPANY_PAGE_CLASS}>
      <PageHeader
        label="Administration"
        title="Shuttle Requesters"
        description="Assign requesters to departments for daily overtime submissions"
      />
      <Card className="p-6 space-y-4">
        <h3 className="text-sm font-bold text-[var(--text-primary)]">Create Requester</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <input
            placeholder="Full name *"
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            disabled={creating}
            className={fieldInputClass}
          />
          <input
            placeholder="Email *"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            disabled={creating}
            className={fieldInputClass}
          />
          <input
            placeholder="Password *"
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            disabled={creating}
            className={fieldInputClass}
          />
          <input
            placeholder="Phone"
            type="tel"
            maxLength={PHONE_MAX_LENGTH}
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: sanitizePhoneInput(e.target.value) })}
            disabled={creating}
            className={fieldInputClass}
          />
          <select
            value={form.department_id}
            onChange={(e) => setForm({ ...form, department_id: e.target.value })}
            disabled={creating}
            className={cx(fieldInputClass, "md:col-span-2")}
          >
            <option value="">Select department *</option>
            {activeDepartments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <CompanyLoadingButton onClick={handleCreate} loading={creating} loadingText="Creating…">
          Create Requester
        </CompanyLoadingButton>
      </Card>

      <Card className="p-6">
        {loading ? (
          <CompanyPageLoader label="Loading requesters…" minHeight="min-h-[200px]" />
        ) : requesters.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)] py-8 text-center">No requesters yet.</p>
        ) : (
          <div className="divide-y divide-[var(--border-default)]">
            {requesters.map((r) => {
              const isActive = r.status.toUpperCase() === "ACTIVE";
              const rowBusy = actionId === r.id;
              return (
                <div key={r.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="font-medium text-[var(--text-primary)]">{r.full_name}</p>
                    <p className="text-xs text-[var(--text-muted)] truncate">
                      {r.email}
                      {r.phone ? ` · ${r.phone}` : ""}
                      {" · "}
                      {r.departments?.name ?? "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={cx(
                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold border",
                        isActive
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : "bg-rose-500/10 text-rose-400 border-rose-500/20",
                      )}
                    >
                      {r.status}
                    </span>
                    <button
                      type="button"
                      onClick={() => openEdit(r)}
                      disabled={rowBusy}
                      className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--cort-orange)] hover:bg-[var(--cort-orange)]/10 disabled:opacity-50"
                      title="Edit requester"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(r)}
                      disabled={rowBusy}
                      className="text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--cort-orange)] px-2 disabled:opacity-50 inline-flex items-center gap-1"
                    >
                      {rowBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                      {isActive ? "Deactivate" : "Activate"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <CompanyModal
        isOpen={editing != null}
        onClose={closeEdit}
        title="Edit Requester"
        loading={saving}
        closeOnBackdrop={!saving}
        size="lg"
      >
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold text-[var(--text-muted)] uppercase">Full Name *</label>
            <input
              value={editForm.full_name}
              onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
              className={cx(fieldInputClass, "mt-1")}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-[var(--text-muted)] uppercase">Email *</label>
            <input
              type="email"
              value={editForm.email}
              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              className={cx(fieldInputClass, "mt-1")}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-[var(--text-muted)] uppercase">Phone</label>
            <input
              type="tel"
              maxLength={PHONE_MAX_LENGTH}
              value={editForm.phone}
              onChange={(e) =>
                setEditForm({ ...editForm, phone: sanitizePhoneInput(e.target.value) })
              }
              className={cx(fieldInputClass, "mt-1")}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-[var(--text-muted)] uppercase">Department *</label>
            <select
              value={editForm.department_id}
              onChange={(e) => setEditForm({ ...editForm, department_id: e.target.value })}
              className={cx(fieldInputClass, "mt-1")}
            >
              <option value="">Select department</option>
              {activeDepartments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-[var(--text-muted)] uppercase">
              New Password
            </label>
            <input
              type="password"
              value={editForm.password}
              onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
              placeholder="Leave blank to keep current password"
              className={cx(fieldInputClass, "mt-1")}
            />
          </div>
          <div className="pt-4 flex gap-2">
            <CompanyLoadingButton type="button" variant="outline" onClick={closeEdit} disabled={saving} className="flex-1">
              Cancel
            </CompanyLoadingButton>
            <CompanyLoadingButton type="button" onClick={handleSaveEdit} loading={saving} loadingText="Saving…" className="flex-1">
              Save Changes
            </CompanyLoadingButton>
          </div>
        </div>
      </CompanyModal>
    </div>
  );
}
