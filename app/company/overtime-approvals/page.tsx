"use client";

import { useCallback, useEffect, useState } from "react";
import { useAppSelector } from "../../lib/store/hooks";
import { selectCompany } from "../../lib/store/slices/companySlice";
import { apiClient } from "../../lib/services/api-client";
import {
  PageHeader,
  COMPANY_PAGE_CLASS,
  CompanyPageLoader,
  CompanyLoadingButton,
  CompanyModal,
} from "../components/PageLayout";
import { Card } from "../components/DashboardComponents";
import { OvertimeRouteMapTabs, type OvertimeRouteMapData } from "../components/OvertimeRouteMap";
import { toast } from "sonner";

type RoutePreview = {
  request_id?: number;
  status?: string;
  department_name: string;
  request_date: string;
  routes: OvertimeRouteMapData[];
};

type ApprovedMapState = {
  requestId: number;
  label: string;
  routes: OvertimeRouteMapData[];
};

type ActionState = { id: number; type: "approve" | "reject" } | null;

export default function OvertimeApprovalsPage() {
  const company = useAppSelector(selectCompany);
  const companyId = Number(company?.id);
  const [tab, setTab] = useState<"pending" | "approved">("pending");
  const [requests, setRequests] = useState<any[]>([]);
  const [approvedRequests, setApprovedRequests] = useState<any[]>([]);
  const [previews, setPreviews] = useState<Record<number, RoutePreview>>({});
  const [approvedMaps, setApprovedMaps] = useState<Record<number, OvertimeRouteMapData[]>>({});
  const [loading, setLoading] = useState(false);
  const [actionState, setActionState] = useState<ActionState>(null);
  const [approvalModal, setApprovalModal] = useState<ApprovedMapState | null>(null);

  const loadRouteMaps = useCallback(
    async (requestIds: number[]) => {
      if (!companyId || requestIds.length === 0) return;
      const entries = await Promise.all(
        requestIds.map(async (id) => {
          try {
            const previewRes: any = await apiClient.getOvertimeApprovalPreview(companyId, id);
            const payload: RoutePreview = previewRes?.data ?? previewRes;
            return [id, payload] as const;
          } catch {
            return [id, null] as const;
          }
        }),
      );
      return Object.fromEntries(entries.filter(([, preview]) => preview != null)) as Record<
        number,
        RoutePreview
      >;
    },
    [companyId],
  );

  const load = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const [pendingRes, approvedRes] = await Promise.all([
        apiClient.getOvertimeRequests(companyId, { status: "PENDING" }),
        apiClient.getOvertimeRequests(companyId, { status: "APPROVED" }),
      ]);
      const pending = pendingRes.data ?? [];
      const approved = (approvedRes.data ?? []).slice(0, 20);
      setRequests(pending);
      setApprovedRequests(approved);

      const pendingMaps = await loadRouteMaps(pending.map((r: { id: number }) => r.id));
      setPreviews(pendingMaps ?? {});

      const approvedMapData = await loadRouteMaps(approved.map((r: { id: number }) => r.id));
      const byId: Record<number, OvertimeRouteMapData[]> = {};
      for (const [id, preview] of Object.entries(approvedMapData ?? {})) {
        byId[Number(id)] = preview.routes ?? [];
      }
      setApprovedMaps(byId);
    } catch {
      toast.error("Failed to load overtime requests");
    } finally {
      setLoading(false);
    }
  }, [companyId, loadRouteMaps]);

  useEffect(() => {
    load();
  }, [load]);

  const approve = async (id: number) => {
    if (!companyId || actionState != null) return;
    setActionState({ id, type: "approve" });
    try {
      const res: any = await apiClient.approveOvertimeRequest(companyId, id);
      const payload = res?.data ?? res;
      const routeMaps: OvertimeRouteMapData[] = payload?.route_maps ?? [];
      const request = payload?.request;
      const impact = payload?.route_impact ?? [];

      if (routeMaps.length > 0) {
        setApprovalModal({
          requestId: id,
          label: `${request?.departments?.name ?? "Department"} · ${String(request?.request_date ?? "").slice(0, 10)}`,
          routes: routeMaps,
        });
      }

      if (impact.length > 0) {
        const summary = impact
          .map((r: { route_name: string; employees_excluded: number; stops_skipped: number }) =>
            `${r.route_name}: ${r.employees_excluded} removed → ${r.stops_skipped} stops skipped`,
          )
          .join(" · ");
        toast.success(`Approved · ${summary}`);
      } else {
        toast.success("Approved");
      }
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Approval failed");
    } finally {
      setActionState(null);
    }
  };

  const reject = async (id: number) => {
    if (!companyId || actionState != null) return;
    setActionState({ id, type: "reject" });
    try {
      await apiClient.rejectOvertimeRequest(companyId, id, "Rejected by admin");
      toast.success("Request rejected");
      load();
    } catch {
      toast.error("Rejection failed");
    } finally {
      setActionState(null);
    }
  };

  const cardBusy = (id: number) => actionState?.id === id;

  return (
    <div className={COMPANY_PAGE_CLASS}>
      <PageHeader
        label="Operations"
        title="Overtime Approvals"
        description="Review overtime requests and view optimized evening shuttle routes after approval"
      />

      <div className="flex gap-2">
        {(["pending", "approved"] as const).map((key) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              tab === key
                ? "bg-[var(--cort-orange)] text-white"
                : "border border-[var(--border-input)] text-[var(--text-secondary)]"
            }`}
          >
            {key === "pending" ? "Pending" : "Approved"}
          </button>
        ))}
      </div>

      {loading ? (
        <CompanyPageLoader label="Loading overtime requests…" minHeight="min-h-[40vh]" />
      ) : tab === "pending" ? (
        requests.length === 0 ? (
          <Card className="p-6 text-sm text-[var(--text-muted)]">No pending requests.</Card>
        ) : (
          requests.map((r) => {
            const preview = previews[r.id];
            const busy = cardBusy(r.id);
            const approving = busy && actionState?.type === "approve";
            const rejecting = busy && actionState?.type === "reject";
            return (
              <Card key={r.id} className="p-6 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">
                      {r.departments?.name} · {String(r.request_date).slice(0, 10)}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                      {r.shuttle_overtime_request_employees?.length ?? 0} employees · by{" "}
                      {r.requested_by_user?.full_name}
                    </p>
                    <ul className="mt-3 space-y-1 text-sm">
                      {(r.shuttle_overtime_request_employees ?? []).map((line: any) => (
                        <li key={line.id}>
                          {line.users?.full_name} — {line.routes?.name ?? "No route"} /{" "}
                          {line.route_stops?.name ?? "—"}
                        </li>
                      ))}
                    </ul>

                    {preview && preview.routes.length > 0 && (
                      <div className="mt-4 rounded-lg border border-[var(--border-light)] bg-[var(--surface-subtle)]/50 p-4 space-y-4">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">
                            Evening route impact preview
                          </p>
                          <ul className="space-y-1.5 text-sm">
                            {preview.routes.map((route) => (
                              <li key={route.route_id} className="text-[var(--text-secondary)]">
                                <span className="font-medium text-[var(--text-primary)]">
                                  {route.route_name}
                                </span>
                                {": "}
                                {route.employees_excluded} employee
                                {route.employees_excluded !== 1 ? "s" : ""} removed
                                {" → "}
                                {route.stops_skipped} stop{route.stops_skipped !== 1 ? "s" : ""}{" "}
                                skipped
                              </li>
                            ))}
                          </ul>
                        </div>
                        <OvertimeRouteMapTabs routes={preview.routes} height="300px" />
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <CompanyLoadingButton
                      onClick={() => approve(r.id)}
                      disabled={busy}
                      loading={approving}
                      loadingText="Approving…"
                      variant="danger"
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      Approve
                    </CompanyLoadingButton>
                    <CompanyLoadingButton
                      onClick={() => reject(r.id)}
                      disabled={busy}
                      loading={rejecting}
                      loadingText="Rejecting…"
                      variant="outline"
                    >
                      Reject
                    </CompanyLoadingButton>
                  </div>
                </div>
              </Card>
            );
          })
        )
      ) : approvedRequests.length === 0 ? (
        <Card className="p-6 text-sm text-[var(--text-muted)]">No approved requests yet.</Card>
      ) : (
        approvedRequests.map((r) => {
          const routes = approvedMaps[r.id] ?? [];
          return (
            <Card key={r.id} className="p-6 space-y-4">
              <div>
                <p className="font-semibold">
                  {r.departments?.name} · {String(r.request_date).slice(0, 10)}
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Approved · {r.shuttle_overtime_request_employees?.length ?? 0} employees excluded
                </p>
              </div>
              {routes.length > 0 ? (
                <OvertimeRouteMapTabs routes={routes} height="300px" />
              ) : (
                <p className="text-sm text-[var(--text-muted)]">
                  Optimized route map will appear once affected routes have evening stops configured.
                </p>
              )}
            </Card>
          );
        })
      )}

      <CompanyModal
        isOpen={approvalModal != null}
        onClose={() => setApprovalModal(null)}
        title="Optimized Evening Routes"
        description={approvalModal?.label}
        size="xl"
      >
        {approvalModal && (
          <OvertimeRouteMapTabs routes={approvalModal.routes} height="360px" />
        )}
      </CompanyModal>
    </div>
  );
}
