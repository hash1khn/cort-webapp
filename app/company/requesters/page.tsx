"use client";

import { useCallback, useEffect, useState } from "react";
import { useAppSelector } from "../../lib/store/hooks";
import { selectCompany } from "../../lib/store/slices/companySlice";
import { apiClient } from "../../lib/services/api-client";
import { PageHeader } from "../components/PageLayout";
import { Card } from "../components/DashboardComponents";
import { toast } from "sonner";

export default function RequestersPage() {
  const company = useAppSelector(selectCompany);
  const companyId = Number(company?.id);
  const [requesters, setRequesters] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [form, setForm] = useState({ full_name: "", email: "", password: "", phone: "", department_id: "" });
  const [loading, setLoading] = useState(false);

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

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!companyId || !form.department_id) return;
    try {
      await apiClient.createShuttleRequester(companyId, {
        ...form,
        department_id: Number(form.department_id),
      });
      setForm({ full_name: "", email: "", password: "", phone: "", department_id: "" });
      toast.success("Requester created");
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to create requester");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader label="Administration" title="Shuttle Requesters" description="Assign requesters to departments for daily overtime submissions" />
      <Card className="p-6 space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <input placeholder="Full name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="rounded-lg border border-[var(--border-input)] bg-[var(--bg-input)] px-3 py-2 text-sm" />
          <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="rounded-lg border border-[var(--border-input)] bg-[var(--bg-input)] px-3 py-2 text-sm" />
          <input placeholder="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="rounded-lg border border-[var(--border-input)] bg-[var(--bg-input)] px-3 py-2 text-sm" />
          <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="rounded-lg border border-[var(--border-input)] bg-[var(--bg-input)] px-3 py-2 text-sm" />
          <select value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })} className="rounded-lg border border-[var(--border-input)] bg-[var(--bg-input)] px-3 py-2 text-sm md:col-span-2">
            <option value="">Select department</option>
            {departments.filter((d) => d.is_active).map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
        <button onClick={handleCreate} className="rounded-lg bg-[#fe8503] px-4 py-2 text-sm font-semibold text-white">Create Requester</button>
      </Card>
      <Card className="p-6">
        {loading ? <p className="text-sm text-[var(--text-muted)]">Loading...</p> : (
          <div className="divide-y divide-[var(--border-default)]">
            {requesters.map((r) => (
              <div key={r.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium">{r.full_name}</p>
                  <p className="text-xs text-[var(--text-muted)]">{r.email} · {r.departments?.name ?? "—"}</p>
                </div>
                <span className="text-xs text-[var(--text-muted)]">{r.status}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
