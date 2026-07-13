"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiClient } from "../../lib/services/api-client";
import { ArrowDown, ArrowUp, ArrowUpDown, Users } from "lucide-react";
import { AdminProtectedPage } from "../components/AdminProtectedPage";
import { ADMIN_SUBJECTS } from "../../lib/abilities/admin-subjects";
import { cx } from "../components/ui/cx";

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

type TrialLead = {
  id: number;
  name: string;
  role: string | null;
  email: string;
  phone: string | null;
  organization: string | null;
  country: string | null;
  locale: string | null;
  modules: string;
  created_at: string;
};

type SortDir = "asc" | "desc";

function sortRows<T extends Record<string, unknown>>(rows: T[], key: keyof T | null, dir: SortDir): T[] {
  if (!key) return rows;
  return [...rows].sort((a, b) => {
    const av = a[key];
    const bv = b[key];
    if (av == null && bv == null) return 0;
    if (av == null) return dir === "asc" ? -1 : 1;
    if (bv == null) return dir === "asc" ? 1 : -1;
    if (typeof av === "number" && typeof bv === "number") {
      return dir === "asc" ? av - bv : bv - av;
    }
    const cmp = String(av).localeCompare(String(bv));
    return dir === "asc" ? cmp : -cmp;
  });
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ArrowUpDown className="h-3 w-3 text-slate-300" />;
  return dir === "asc" ? <ArrowUp className="h-3 w-3 text-emerald-600" /> : <ArrowDown className="h-3 w-3 text-emerald-600" />;
}

function SortableTh<T>({
  label,
  sortKey,
  activeKey,
  dir,
  onSort,
  className,
}: {
  label: string;
  sortKey: keyof T;
  activeKey: keyof T | null;
  dir: SortDir;
  onSort: (key: keyof T) => void;
  className?: string;
}) {
  return (
    <th className={cx("whitespace-nowrap px-4 py-3", className)}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="inline-flex items-center gap-1 hover:text-navy"
      >
        {label}
        <SortIcon active={activeKey === sortKey} dir={dir} />
      </button>
    </th>
  );
}

export default function AdminLeadsPage() {
  return (
    <AdminProtectedPage permission="dashboard" subject={ADMIN_SUBJECTS.dashboard}>
      <LeadsContent />
    </AdminProtectedPage>
  );
}

function LeadsContent() {
  const [activeTab, setActiveTab] = useState<"briefing" | "trial">("briefing");

  const [leads, setLeads] = useState<LandingLead[]>([]);
  const [trialLeads, setTrialLeads] = useState<TrialLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [leadsSort, setLeadsSort] = useState<{ key: keyof LandingLead | null; dir: SortDir }>({
    key: "created_at",
    dir: "desc",
  });
  const [trialSort, setTrialSort] = useState<{ key: keyof TrialLead | null; dir: SortDir }>({
    key: "created_at",
    dir: "desc",
  });

  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [briefingRes, trialRes] = await Promise.all([apiClient.getLandingLeads(), apiClient.getTrialLeads()]);
      setLeads(briefingRes.data ?? []);
      setTrialLeads(trialRes.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load leads");
      setLeads([]);
      setTrialLeads([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchLeads();
  }, [fetchLeads]);

  const handleLeadsSort = (key: keyof LandingLead) => {
    setLeadsSort((prev) => ({
      key,
      dir: prev.key === key && prev.dir === "asc" ? "desc" : "asc",
    }));
  };

  const handleTrialSort = (key: keyof TrialLead) => {
    setTrialSort((prev) => ({
      key,
      dir: prev.key === key && prev.dir === "asc" ? "desc" : "asc",
    }));
  };

  const sortedLeads = useMemo(() => sortRows(leads, leadsSort.key, leadsSort.dir), [leads, leadsSort]);
  const sortedTrialLeads = useMemo(
    () => sortRows(trialLeads, trialSort.key, trialSort.dir),
    [trialLeads, trialSort]
  );

  const tabs: { id: "briefing" | "trial"; name: string; count: number }[] = [
    { id: "briefing", name: "Briefing Leads", count: leads.length },
    { id: "trial", name: "Trial Leads", count: trialLeads.length },
  ];

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
            Inquiries submitted from the Traflinq marketing landing page and the Explore trial signup.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>
      )}

      <div className="flex gap-1 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cx(
              "border-b-2 px-4 py-2 text-sm font-medium transition-colors",
              activeTab === tab.id
                ? "border-emerald-600 text-navy"
                : "border-transparent text-muted hover:text-navy"
            )}
          >
            {tab.name}
            <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-xs text-muted">{tab.count}</span>
          </button>
        ))}
      </div>

      {activeTab === "briefing" ? (
        <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="border-b border-border bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wide text-muted">
                <tr>
                  <SortableTh label="Submitted" sortKey="created_at" activeKey={leadsSort.key} dir={leadsSort.dir} onSort={handleLeadsSort} />
                  <SortableTh label="Name" sortKey="name" activeKey={leadsSort.key} dir={leadsSort.dir} onSort={handleLeadsSort} />
                  <SortableTh label="Role" sortKey="role" activeKey={leadsSort.key} dir={leadsSort.dir} onSort={handleLeadsSort} />
                  <SortableTh label="Email" sortKey="email" activeKey={leadsSort.key} dir={leadsSort.dir} onSort={handleLeadsSort} />
                  <SortableTh label="Phone" sortKey="phone" activeKey={leadsSort.key} dir={leadsSort.dir} onSort={handleLeadsSort} />
                  <SortableTh label="Organization" sortKey="organization" activeKey={leadsSort.key} dir={leadsSort.dir} onSort={handleLeadsSort} />
                  <SortableTh label="Country" sortKey="country" activeKey={leadsSort.key} dir={leadsSort.dir} onSort={handleLeadsSort} />
                  <SortableTh label="Fleet size" sortKey="fleet_size" activeKey={leadsSort.key} dir={leadsSort.dir} onSort={handleLeadsSort} />
                  <SortableTh label="Primary goal" sortKey="primary_goal" activeKey={leadsSort.key} dir={leadsSort.dir} onSort={handleLeadsSort} className="min-w-[140px]" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-muted">
                      Loading…
                    </td>
                  </tr>
                ) : sortedLeads.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-muted">
                      No leads yet.
                    </td>
                  </tr>
                ) : (
                  sortedLeads.map((row) => (
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
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="border-b border-border bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wide text-muted">
                <tr>
                  <SortableTh label="Submitted" sortKey="created_at" activeKey={trialSort.key} dir={trialSort.dir} onSort={handleTrialSort} />
                  <SortableTh label="Name" sortKey="name" activeKey={trialSort.key} dir={trialSort.dir} onSort={handleTrialSort} />
                  <SortableTh label="Role" sortKey="role" activeKey={trialSort.key} dir={trialSort.dir} onSort={handleTrialSort} />
                  <SortableTh label="Email" sortKey="email" activeKey={trialSort.key} dir={trialSort.dir} onSort={handleTrialSort} />
                  <SortableTh label="Phone" sortKey="phone" activeKey={trialSort.key} dir={trialSort.dir} onSort={handleTrialSort} />
                  <SortableTh label="Organization" sortKey="organization" activeKey={trialSort.key} dir={trialSort.dir} onSort={handleTrialSort} />
                  <SortableTh label="Country" sortKey="country" activeKey={trialSort.key} dir={trialSort.dir} onSort={handleTrialSort} />
                  <SortableTh label="Locale" sortKey="locale" activeKey={trialSort.key} dir={trialSort.dir} onSort={handleTrialSort} />
                  <SortableTh label="Modules" sortKey="modules" activeKey={trialSort.key} dir={trialSort.dir} onSort={handleTrialSort} />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-muted">
                      Loading…
                    </td>
                  </tr>
                ) : sortedTrialLeads.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-muted">
                      No trial leads yet.
                    </td>
                  </tr>
                ) : (
                  sortedTrialLeads.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/60">
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-navy">
                        {new Date(row.created_at).toLocaleString(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </td>
                      <td className="px-4 py-3 font-medium text-navy">{row.name}</td>
                      <td className="px-4 py-3 text-muted">{row.role ?? "—"}</td>
                      <td className="max-w-[200px] truncate px-4 py-3 text-muted" title={row.email}>
                        {row.email}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted">{row.phone ?? "—"}</td>
                      <td className="px-4 py-3 text-muted">{row.organization ?? "—"}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted">{row.country ?? "—"}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted">{row.locale ?? "—"}</td>
                      <td className="whitespace-nowrap px-4 py-3 capitalize text-muted">{row.modules}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
