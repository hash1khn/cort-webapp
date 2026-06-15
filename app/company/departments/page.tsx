"use client";

import { useCallback, useEffect, useState } from "react";
import { useAppSelector } from "../../lib/store/hooks";
import { selectCompany } from "../../lib/store/slices/companySlice";
import { apiClient } from "../../lib/services/api-client";
import { PageHeader } from "../components/PageLayout";
import { Card } from "../components/DashboardComponents";
import { toast } from "sonner";

type Department = { id: number; name: string; is_active: boolean };

export default function DepartmentsPage() {
  const company = useAppSelector(selectCompany);
  const companyId = Number(company?.id);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

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

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!name.trim() || !companyId) return;
    try {
      await apiClient.createDepartment(companyId, name.trim());
      setName("");
      toast.success("Department created");
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to create department");
    }
  };

  const handleDeactivate = async (dept: Department) => {
    if (!companyId) return;
    try {
      await apiClient.updateDepartment(companyId, dept.id, { is_active: !dept.is_active });
      toast.success(dept.is_active ? "Department deactivated" : "Department activated");
      load();
    } catch {
      toast.error("Failed to update department");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader label="Administration" title="Departments" description="Manage company departments for employee and requester assignment" />
      <Card className="p-6">
        <div className="flex gap-3 mb-6">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="New department name"
            className="flex-1 rounded-lg border border-[var(--border-input)] bg-[var(--bg-input)] px-3 py-2 text-sm"
          />
          <button onClick={handleCreate} className="rounded-lg bg-[#fe8503] px-4 py-2 text-sm font-semibold text-white">
            Add
          </button>
        </div>
        {loading ? (
          <p className="text-sm text-[var(--text-muted)]">Loading...</p>
        ) : (
          <div className="divide-y divide-[var(--border-default)]">
            {departments.map((d) => (
              <div key={d.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-[var(--text-primary)]">{d.name}</p>
                  <p className="text-xs text-[var(--text-muted)]">{d.is_active ? "Active" : "Inactive"}</p>
                </div>
                <button
                  onClick={() => handleDeactivate(d)}
                  className="text-sm text-[var(--text-secondary)] hover:text-[#fe8503]"
                >
                  {d.is_active ? "Deactivate" : "Activate"}
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
