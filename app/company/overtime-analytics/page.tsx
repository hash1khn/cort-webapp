"use client";

import { useCallback, useEffect, useState } from "react";
import { useAppSelector } from "../../lib/store/hooks";
import { selectCompany } from "../../lib/store/slices/companySlice";
import { apiClient } from "../../lib/services/api-client";
import { PageHeader } from "../components/PageLayout";
import { Card } from "../components/DashboardComponents";
import { toast } from "sonner";

export default function OvertimeAnalyticsPage() {
  const company = useAppSelector(selectCompany);
  const companyId = Number(company?.id);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const res = await apiClient.getOvertimeAnalytics(companyId, from || undefined, to || undefined);
      setAnalytics(res.data);
    } catch {
      toast.error("Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, [companyId, from, to]);

  useEffect(() => { load(); }, [load]);

  const handleExport = async () => {
    if (!companyId) return;
    try {
      const csv = await apiClient.exportOvertimeCsv(companyId, from || undefined, to || undefined);
      // Add UTF-8 BOM so Excel opens it cleanly.
      const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const suffix = `${from || "all"}_to_${to || "all"}`.replaceAll("/", "-");
      a.download = `overtime-requests_${suffix}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Export failed");
    }
  };

  const summary = analytics?.summary;

  return (
    <div className="space-y-6">
      <PageHeader label="Analytics" title="Overtime Analytics" description="Track daily overtime exclusions and approval trends" />
      <Card className="p-6 flex flex-wrap gap-3 items-end">
        <label className="text-sm">
          <span className="text-[var(--text-muted)]">From</span>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1 block rounded-lg border border-[var(--border-input)] bg-[var(--bg-input)] px-3 py-2 text-sm" />
        </label>
        <label className="text-sm">
          <span className="text-[var(--text-muted)]">To</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="mt-1 block rounded-lg border border-[var(--border-input)] bg-[var(--bg-input)] px-3 py-2 text-sm" />
        </label>
        <button onClick={load} className="rounded-lg border border-[var(--border-input)] px-4 py-2 text-sm">Refresh</button>
        <button onClick={handleExport} className="rounded-lg bg-[#fe8503] px-4 py-2 text-sm font-semibold text-white">Export CSV</button>
      </Card>
      {loading ? <p className="text-sm text-[var(--text-muted)]">Loading...</p> : summary && (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            {[
              ["Total Requests", summary.total_requests],
              ["Approved", summary.approved],
              ["Pending", summary.pending],
              ["Approval Rate", `${summary.approval_rate}%`],
            ].map(([label, value]) => (
              <Card key={label} className="p-4">
                <p className="text-xs text-[var(--text-muted)]">{label}</p>
                <p className="text-2xl font-bold mt-1">{value}</p>
              </Card>
            ))}
          </div>
          <Card className="p-6">
            <h3 className="font-semibold mb-4">By Department</h3>
            <div className="space-y-2">
              {(analytics.by_department ?? []).map((d: any) => (
                <div key={d.department_id} className="flex justify-between text-sm border-b border-[var(--border-default)] py-2">
                  <span>{d.name}</span>
                  <span className="text-[var(--text-muted)]">{d.count} requests · {d.employees} employees</span>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
