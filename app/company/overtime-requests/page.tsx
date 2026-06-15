"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAppSelector } from "../../lib/store/hooks";
import { selectCompany } from "../../lib/store/slices/companySlice";
import { apiClient } from "../../lib/services/api-client";
import { useAuth } from "../../lib/contexts/auth-context";
import { UserRole } from "../../lib/types/auth-types";
import { PageHeader } from "../components/PageLayout";
import { Card } from "../components/DashboardComponents";
import { toast } from "sonner";

export default function OvertimeRequestsPage() {
  const company = useAppSelector(selectCompany);
  const { user, isCompanyAdmin } = useAuth();
  const companyId = Number(company?.id);
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [requestDate, setRequestDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [departmentId, setDepartmentId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const [empRes, deptRes] = await Promise.all([
        apiClient.getEmployeesByCompany(companyId),
        isCompanyAdmin ? apiClient.getDepartments(companyId) : Promise.resolve({ data: [] }),
      ]);
      const raw = empRes?.data ?? empRes;
      setEmployees(Array.isArray(raw) ? raw : raw?.data ?? []);
      setDepartments(deptRes.data ?? []);
      if (user?.role === UserRole.SHUTTLE_REQUESTER && user.department_id) {
        setDepartmentId(String(user.department_id));
      }
    } catch {
      toast.error("Failed to load employees");
    } finally {
      setLoading(false);
    }
  }, [companyId, isCompanyAdmin, user]);

  useEffect(() => { load(); }, [load]);

  const filteredEmployees = useMemo(() => {
    const deptFilter = departmentId ? Number(departmentId) : null;
    return employees.filter((e) => {
      if (deptFilter && e.department_id !== deptFilter) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return e.full_name?.toLowerCase().includes(q) || e.employee_id?.toLowerCase().includes(q);
    });
  }, [employees, departmentId, search]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!companyId) return;
    try {
      await apiClient.upsertOvertimeRequest(companyId, {
        request_date: requestDate,
        employee_user_ids: [...selected],
        department_id: departmentId ? Number(departmentId) : undefined,
        notes: notes || undefined,
      });
      toast.success("Overtime request submitted for approval");
      setSelected(new Set());
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to submit request");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        label="Operations"
        title="Overtime Requests"
        description="Mark employees who will work overtime and skip the evening shuttle"
      />
      <Card className="p-6 space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <label className="text-sm">
            <span className="text-[var(--text-muted)]">Date</span>
            <input type="date" value={requestDate} onChange={(e) => setRequestDate(e.target.value)} className="mt-1 w-full rounded-lg border border-[var(--border-input)] bg-[var(--bg-input)] px-3 py-2 text-sm" />
          </label>
          {isCompanyAdmin && (
            <label className="text-sm">
              <span className="text-[var(--text-muted)]">Department</span>
              <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className="mt-1 w-full rounded-lg border border-[var(--border-input)] bg-[var(--bg-input)] px-3 py-2 text-sm">
                <option value="">All (select when submitting)</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </label>
          )}
          <label className="text-sm md:col-span-1">
            <span className="text-[var(--text-muted)]">Search</span>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name or ID" className="mt-1 w-full rounded-lg border border-[var(--border-input)] bg-[var(--bg-input)] px-3 py-2 text-sm" />
          </label>
        </div>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)" className="w-full rounded-lg border border-[var(--border-input)] bg-[var(--bg-input)] px-3 py-2 text-sm" rows={2} />
        {loading ? <p className="text-sm text-[var(--text-muted)]">Loading employees...</p> : (
          <div className="max-h-96 overflow-y-auto divide-y divide-[var(--border-default)] border border-[var(--border-default)] rounded-lg">
            {filteredEmployees.map((e) => (
              <label key={e.id} className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[var(--bg-subtle)]">
                <input type="checkbox" checked={selected.has(e.id)} onChange={() => toggle(e.id)} />
                <div>
                  <p className="text-sm font-medium">{e.full_name}</p>
                  <p className="text-xs text-[var(--text-muted)]">{e.departments?.name ?? e.department ?? "—"} · {e.employee_id ?? e.id.slice(0, 8)}</p>
                </div>
              </label>
            ))}
          </div>
        )}
        <button onClick={handleSubmit} disabled={selected.size === 0 || (isCompanyAdmin && !departmentId)} className="rounded-lg bg-[#fe8503] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          Submit {selected.size > 0 ? `(${selected.size})` : ""} for Approval
        </button>
      </Card>
    </div>
  );
}
