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
} from "../components/PageLayout";
import { Card } from "../components/DashboardComponents";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

type Department = { id: number; name: string; is_active: boolean };

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function DepartmentsPage() {
  const company = useAppSelector(selectCompany);
  const companyId = Number(company?.id);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [savingId, setSavingId] = useState<number | null>(null);
  const [actionId, setActionId] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const res = await apiClient.getDepartments(companyId);
      setDepartments(res.data ?? []);
    } catch {
      toast.error("Failed to load departments");
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async () => {
    if (!name.trim() || !companyId || creating) return;
    setCreating(true);
    try {
      await apiClient.createDepartment(companyId, name.trim());
      setName("");
      toast.success("Department created");
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to create department");
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (dept: Department) => {
    setEditingId(dept.id);
    setEditName(dept.name);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
  };

  const saveEdit = async (dept: Department) => {
    if (!companyId || !editName.trim() || savingId != null) {
      if (!editName.trim()) toast.error("Department name is required");
      return;
    }
    setSavingId(dept.id);
    try {
      await apiClient.updateDepartment(companyId, dept.id, { name: editName.trim() });
      toast.success("Department updated");
      cancelEdit();
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to update department");
    } finally {
      setSavingId(null);
    }
  };

  const handleToggleActive = async (dept: Department) => {
    if (!companyId || actionId != null) return;
    setActionId(dept.id);
    try {
      await apiClient.updateDepartment(companyId, dept.id, { is_active: !dept.is_active });
      toast.success(dept.is_active ? "Department deactivated" : "Department activated");
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to update department");
    } finally {
      setActionId(null);
    }
  };

  const handleDelete = async (dept: Department) => {
    if (!companyId || actionId != null) return;
    if (
      !confirm(
        `Remove department "${dept.name}"?\n\nIf employees or requesters are assigned, it will be deactivated instead of permanently deleted.`,
      )
    ) {
      return;
    }
    setActionId(dept.id);
    try {
      await apiClient.deleteDepartment(companyId, dept.id);
      toast.success("Department removed");
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to remove department");
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className={COMPANY_PAGE_CLASS}>
      <PageHeader
        label="Administration"
        title="Departments"
        description="Manage company departments for employee and requester assignment"
      />
      <Card className="p-6">
        <div className="flex gap-3 mb-6">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            placeholder="New department name"
            disabled={creating}
            className={cx(COMPANY_INPUT_CLASS, "flex-1 h-10")}
          />
          <CompanyLoadingButton onClick={handleCreate} loading={creating} loadingText="Adding…" disabled={!name.trim()}>
            Add
          </CompanyLoadingButton>
        </div>
        {loading ? (
          <CompanyPageLoader label="Loading departments…" minHeight="min-h-[200px]" />
        ) : departments.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)] py-8 text-center">No departments yet.</p>
        ) : (
          <div className="divide-y divide-[var(--border-default)]">
            {departments.map((d) => {
              const isEditing = editingId === d.id;
              const rowBusy = actionId === d.id;
              return (
                <div key={d.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className={cx(COMPANY_INPUT_CLASS, "max-w-sm h-10")}
                        autoFocus
                      />
                    ) : (
                      <>
                        <p className="font-medium text-[var(--text-primary)]">{d.name}</p>
                        <p className="text-xs text-[var(--text-muted)]">
                          {d.is_active ? "Active" : "Inactive"}
                        </p>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {isEditing ? (
                      <>
                        <CompanyLoadingButton
                          type="button"
                          onClick={() => saveEdit(d)}
                          loading={savingId === d.id}
                          loadingText="Saving…"
                          className="h-8 px-3 text-xs"
                        >
                          Save
                        </CompanyLoadingButton>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          disabled={savingId === d.id}
                          className="inline-flex h-8 items-center rounded-lg border border-[var(--border-input)] px-3 text-xs font-bold text-[var(--text-secondary)] disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => startEdit(d)}
                          disabled={rowBusy}
                          className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--cort-orange)] hover:bg-[var(--cort-orange)]/10 disabled:opacity-50"
                          title="Edit department"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleActive(d)}
                          disabled={rowBusy}
                          className="text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--cort-orange)] px-2 disabled:opacity-50 inline-flex items-center gap-1"
                        >
                          {rowBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                          {d.is_active ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(d)}
                          disabled={rowBusy}
                          className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/10 disabled:opacity-50"
                          title="Remove department"
                        >
                          {rowBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
