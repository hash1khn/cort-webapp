"use client";

import { useCallback, useEffect, useState } from "react";
import { useAppSelector } from "../../lib/store/hooks";
import { selectCompany } from "../../lib/store/slices/companySlice";
import { apiClient } from "../../lib/services/api-client";
import { PageHeader } from "../components/PageLayout";
import { Card } from "../components/DashboardComponents";
import { toast } from "sonner";

type RouteImpact = {
  route_id: number;
  route_name: string;
  employees_excluded: number;
  stops_skipped: number;
  stops_remaining?: number;
};

type ApprovalPreview = {
  department_name: string;
  request_date: string;
  routes: RouteImpact[];
};

export default function OvertimeApprovalsPage() {
  const company = useAppSelector(selectCompany);
  const companyId = Number(company?.id);
  const [requests, setRequests] = useState<any[]>([]);
  const [previews, setPreviews] = useState<Record<number, ApprovalPreview>>({});
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const res = await apiClient.getOvertimeRequests(companyId, { status: "PENDING" });
      const pending = res.data ?? [];
      setRequests(pending);

      const previewEntries = await Promise.all(
        pending.map(async (r: { id: number }) => {
          try {
            const previewRes: any = await apiClient.getOvertimeApprovalPreview(companyId, r.id);
            return [r.id, previewRes?.data ?? previewRes] as const;
          } catch {
            return [r.id, null] as const;
          }
        }),
      );
      setPreviews(
        Object.fromEntries(
          previewEntries.filter(([, preview]) => preview != null),
        ) as Record<number, ApprovalPreview>,
      );
    } catch {
      toast.error("Failed to load pending requests");
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => { load(); }, [load]);

  const approve = async (id: number) => {
    if (!companyId) return;
    try {
      const res: any = await apiClient.approveOvertimeRequest(companyId, id);
      const impact: RouteImpact[] = res?.data?.route_impact ?? res?.route_impact ?? [];
      if (impact.length > 0) {
        const summary = impact
          .map((r) => `${r.route_name}: ${r.employees_excluded} removed → ${r.stops_skipped} stops skipped`)
          .join(" · ");
        toast.success(`Approved · ${summary}`);
      } else {
        toast.success("Approved");
      }
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Approval failed");
    }
  };

  const reject = async (id: number) => {
    if (!companyId) return;
    try {
      await apiClient.rejectOvertimeRequest(companyId, id, "Rejected by admin");
      toast.success("Request rejected");
      load();
    } catch {
      toast.error("Rejection failed");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader label="Operations" title="Overtime Approvals" description="Review and approve department overtime requests" />
      {loading ? <p className="text-sm text-[var(--text-muted)]">Loading...</p> : requests.length === 0 ? (
        <Card className="p-6 text-sm text-[var(--text-muted)]">No pending requests.</Card>
      ) : (
        requests.map((r) => {
          const preview = previews[r.id];
          return (
            <Card key={r.id} className="p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">{r.departments?.name} · {String(r.request_date).slice(0, 10)}</p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    {r.shuttle_overtime_request_employees?.length ?? 0} employees · by {r.requested_by_user?.full_name}
                  </p>
                  <ul className="mt-3 space-y-1 text-sm">
                    {(r.shuttle_overtime_request_employees ?? []).map((line: any) => (
                      <li key={line.id}>
                        {line.users?.full_name} — {line.routes?.name ?? "No route"} / {line.route_stops?.name ?? "—"}
                      </li>
                    ))}
                  </ul>

                  {preview && preview.routes.length > 0 && (
                    <div className="mt-4 rounded-lg border border-[var(--border-light)] bg-[var(--surface-subtle)]/50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">
                        Evening route impact preview
                      </p>
                      <ul className="space-y-1.5 text-sm">
                        {preview.routes.map((route) => (
                          <li key={route.route_id} className="text-[var(--text-secondary)]">
                            <span className="font-medium text-[var(--text-primary)]">{route.route_name}</span>
                            {": "}
                            {route.employees_excluded} employee{route.employees_excluded !== 1 ? "s" : ""} removed
                            {" → "}
                            {route.stops_skipped} stop{route.stops_skipped !== 1 ? "s" : ""} skipped
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => approve(r.id)} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Approve</button>
                  <button onClick={() => reject(r.id)} className="rounded-lg border border-[var(--border-input)] px-4 py-2 text-sm">Reject</button>
                </div>
              </div>
            </Card>
          );
        })
      )}
    </div>
  );
}
