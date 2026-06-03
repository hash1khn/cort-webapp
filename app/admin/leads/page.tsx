"use client";

import { useCallback, useEffect, useState } from "react";
import { apiClient } from "../../lib/services/api-client";
import { Users } from "lucide-react";
import { AdminProtectedPage } from "../components/AdminProtectedPage";
import { ADMIN_SUBJECTS } from "../../lib/abilities/admin-subjects";

type LandingLead = {
  id: number;
  name: string;
  role: string;
  email: string;
  phone: string;
  organization: string;
  country: string;
  city: string;
  fleet_size: string;
  primary_goal: string;
  created_at: string;
};

export default function AdminLeadsPage() {
  return (
    <AdminProtectedPage permission="dashboard" subject={ADMIN_SUBJECTS.dashboard}>
      <LeadsContent />
    </AdminProtectedPage>
  );
}

function LeadsContent() {
  const [leads, setLeads] = useState<LandingLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.getLandingLeads();
      setLeads(res.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load leads");
      setLeads([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchLeads();
  }, [fetchLeads]);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-muted">Admin Portal</div>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold tracking-tight text-navy">
            <Users className="h-7 w-7 text-emerald-600" />
            Leads
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Inquiries submitted from the Traflinq marketing landing page.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead className="border-b border-border bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wide text-muted">
              <tr>
                <th className="whitespace-nowrap px-4 py-3">Submitted</th>
                <th className="whitespace-nowrap px-4 py-3">Name</th>
                <th className="whitespace-nowrap px-4 py-3">Role</th>
                <th className="whitespace-nowrap px-4 py-3">Email</th>
                <th className="whitespace-nowrap px-4 py-3">Phone</th>
                <th className="whitespace-nowrap px-4 py-3">Organization</th>
                <th className="whitespace-nowrap px-4 py-3">Location</th>
                <th className="whitespace-nowrap px-4 py-3">Fleet size</th>
                <th className="min-w-[140px] px-4 py-3">Primary goal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-muted">
                    Loading…
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-muted">
                    No leads yet.
                  </td>
                </tr>
              ) : (
                leads.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/60">
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-navy">
                      {new Date(row.created_at).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </td>
                    <td className="px-4 py-3 font-medium text-navy">{row.name}</td>
                    <td className="px-4 py-3 text-muted">{row.role}</td>
                    <td className="max-w-[200px] truncate px-4 py-3 text-muted" title={row.email}>
                      {row.email}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted">{row.phone}</td>
                    <td className="px-4 py-3 text-muted">{row.organization}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted">
                      {row.city}, {row.country}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted">{row.fleet_size}</td>
                    <td className="px-4 py-3 text-muted">{row.primary_goal}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
