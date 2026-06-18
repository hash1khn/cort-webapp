"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Skeleton } from "@/app/components/ui/Skeleton";
import { useAppSelector } from "../../lib/store/hooks";
import { selectCompany } from "../../lib/store/slices/companySlice";
import { apiClient } from "../../lib/services/api-client";
import {
  PageHeader,
  COMPANY_PAGE_CLASS,
  CompanyLoadingButton,
  CompanyModal,
} from "../components/PageLayout";
import { Card } from "../components/DashboardComponents";
import { OvertimeRouteMapTabs, type OvertimeRouteMapData } from "../components/OvertimeRouteMap";
import { toast } from "sonner";
import { Bus, Users, RefreshCw, Save, ChevronDown, UserPlus } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type OvertimeEmployee = {
  user_id: string;
  full_name: string;
  department: string | null;
  home_address: string | null;
};

type OvertimeGroup = {
  vehicle: { id: number; plate_number: string; make: string | null; model: string | null; seat_capacity: number };
  employees: OvertimeEmployee[];
  occupancy: number;
  pct: number;
};

type SuggestionResponse = {
  employee_count: number;
  suggested_vehicles: OvertimeGroup["vehicle"][];
  available_vehicles: OvertimeGroup["vehicle"][];
};

type SavedAssignment = {
  id: number;
  request_id: number;
  vehicles: { id: number; plate_number: string; make: string | null; model: string | null; seat_capacity: number };
  shuttle_overtime_vehicle_assignment_employees: Array<{
    users: { id: string; full_name: string; department: string | null; home_address: string | null };
  }>;
};

type VehicleInitData =
  | { type: "saved"; assignments: SavedAssignment[] }
  | { type: "suggestion"; data: SuggestionResponse };

type RoutePreview = {
  request_id?: number;
  status?: string;
  department_name: string;
  request_date: string;
  routes: OvertimeRouteMapData[];
};

type ApprovedMapState = { requestId: number; label: string; routes: OvertimeRouteMapData[] };
type ActionState = { id: number; type: "approve" | "reject" } | null;

function formatShiftTime(raw: string | null | undefined): string {
  if (!raw) return "";
  const match = String(raw).match(/(\d{2}:\d{2})/);
  return match ? match[1] : "";
}

function initGroupsFromData(initData: VehicleInitData): OvertimeGroup[] {
  if (initData.type === "saved") {
    return initData.assignments.map((a) => ({
      vehicle: a.vehicles,
      employees: a.shuttle_overtime_vehicle_assignment_employees.map((e) => ({
        user_id: e.users.id,
        full_name: e.users.full_name,
        department: e.users.department,
        home_address: e.users.home_address,
      })),
      occupancy: a.shuttle_overtime_vehicle_assignment_employees.length,
      pct: Math.round(
        (a.shuttle_overtime_vehicle_assignment_employees.length / a.vehicles.seat_capacity) * 100,
      ),
    }));
  }
  return (initData.data.suggested_vehicles ?? []).map((v) => ({
    vehicle: v,
    employees: [],
    occupancy: 0,
    pct: 0,
  }));
}

function initUnassignedFromData(initData: VehicleInitData, employees: OvertimeEmployee[]): OvertimeEmployee[] {
  return initData.type === "saved" ? [] : employees;
}

// ─── Skeleton for vehicle optimizer section ───────────────────────────────────

function VehicleOptimizerSkeleton() {
  return (
    <div className="mt-4 space-y-3 border-t border-[var(--border-light)] pt-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-7 w-20 rounded-lg" />
          <Skeleton className="h-7 w-14 rounded-lg" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-lg border border-[var(--border-light)] bg-[var(--bg-subtle)] p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-2.5 w-16" />
              </div>
              <div className="space-y-1.5 items-end flex flex-col">
                <Skeleton className="h-3 w-10" />
                <Skeleton className="h-1.5 w-16 rounded-full" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── OvertimeVehicleOptimizer (controlled — no internal fetching) ─────────────

function OvertimeVehicleOptimizer({
  requestId,
  companyId,
  overtimeEmployees,
  initData,
}: {
  requestId: number;
  companyId: number;
  overtimeEmployees: OvertimeEmployee[];
  initData: VehicleInitData;
}) {
  const [groups, setGroups] = useState<OvertimeGroup[]>(() => initGroupsFromData(initData));
  const [unassigned, setUnassigned] = useState<OvertimeEmployee[]>(() =>
    initUnassignedFromData(initData, overtimeEmployees),
  );
  const [resuggesting, setResuggesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [moveTarget, setMoveTarget] = useState<{ empId: string; fromGroup: number | "unassigned" } | null>(null);
  const employeesRef = useRef(overtimeEmployees);
  employeesRef.current = overtimeEmployees;

  const resuggest = async () => {
    if (!confirm("Re-suggest will replace your current grouping. Continue?")) return;
    setResuggesting(true);
    try {
      const res: any = await apiClient.getOvertimeVehicleSuggestions(companyId, requestId);
      const data: SuggestionResponse = res?.data ?? res;
      setGroups((data.suggested_vehicles ?? []).map((v) => ({ vehicle: v, employees: [], occupancy: 0, pct: 0 })));
      setUnassigned(employeesRef.current);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to generate suggestions");
    } finally {
      setResuggesting(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      await apiClient.saveOvertimeVehicleAssignments(companyId, requestId, {
        assignments: groups.map((g) => ({
          vehicle_id: g.vehicle.id,
          employee_user_ids: g.employees.map((e) => e.user_id),
        })),
      });
      toast.success("Vehicle assignments saved");
    } catch (e: any) {
      toast.error(e?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const moveEmployee = (empId: string, from: number | "unassigned", to: number | "unassigned") => {
    if (from === to) return;
    let emp: OvertimeEmployee | undefined;

    if (from === "unassigned") {
      emp = unassigned.find((e) => e.user_id === empId);
      setUnassigned((prev) => prev.filter((e) => e.user_id !== empId));
    } else {
      emp = groups[from]?.employees.find((e) => e.user_id === empId);
      setGroups((prev) =>
        prev.map((g, i) =>
          i === from
            ? {
                ...g,
                employees: g.employees.filter((e) => e.user_id !== empId),
                occupancy: g.occupancy - 1,
                pct: Math.round(((g.occupancy - 1) / g.vehicle.seat_capacity) * 100),
              }
            : g,
        ),
      );
    }
    if (!emp) return;

    if (to === "unassigned") {
      setUnassigned((prev) => [...prev, emp!]);
    } else {
      setGroups((prev) =>
        prev.map((g, i) =>
          i === to
            ? {
                ...g,
                employees: [...g.employees, emp!],
                occupancy: g.occupancy + 1,
                pct: Math.round(((g.occupancy + 1) / g.vehicle.seat_capacity) * 100),
              }
            : g,
        ),
      );
    }
    setMoveTarget(null);
  };

  if (groups.length === 0 && unassigned.length === 0 && overtimeEmployees.length > 0) {
    return (
      <div className="text-sm text-amber-600 bg-amber-500/10 rounded-lg px-4 py-3 mt-3">
        No free vehicles available on this date. All company vehicles are already assigned to routes running on this day.
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-3 border-t border-[var(--border-light)] pt-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bus className="w-4 h-4 text-[var(--cort-orange)]" />
          <span className="text-sm font-semibold text-[var(--text-primary)]">Overtime Vehicle Groups</span>
          <span className="text-xs text-[var(--text-muted)]">
            ({groups.length} vehicles · {unassigned.length} unassigned)
          </span>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={resuggest}
            disabled={resuggesting}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-[var(--border-input)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] disabled:opacity-60"
          >
            <RefreshCw className={`w-3 h-3 ${resuggesting ? "animate-spin" : ""}`} /> Re-suggest
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-[var(--cort-orange)] text-white disabled:opacity-60"
          >
            {saving ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
            Save
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {groups.map((group, gi) => (
          <div
            key={group.vehicle.id}
            className="rounded-lg border border-[var(--border-light)] bg-[var(--bg-subtle)] p-3 space-y-2"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-[var(--text-primary)]">{group.vehicle.plate_number}</div>
                <div className="text-[10px] text-[var(--text-muted)]">
                  {[group.vehicle.make, group.vehicle.model].filter(Boolean).join(" ")}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-semibold text-[var(--cort-orange)]">
                  {group.occupancy}/{group.vehicle.seat_capacity}
                </div>
                <div className="mt-1 h-1.5 w-16 rounded-full bg-[var(--bg-card)] overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      group.pct > 90 ? "bg-red-500" : group.pct > 65 ? "bg-amber-500" : "bg-emerald-500"
                    }`}
                    style={{ width: `${Math.min(group.pct, 100)}%` }}
                  />
                </div>
              </div>
            </div>
            <div className="space-y-1">
              {group.employees.map((emp) => (
                <div key={emp.user_id} className="flex items-center justify-between text-xs gap-1">
                  <div className="min-w-0">
                    <span className="font-medium truncate">{emp.full_name}</span>
                    {emp.department && <span className="text-[var(--text-muted)] ml-1">· {emp.department}</span>}
                  </div>
                  <div className="relative flex-shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        setMoveTarget(moveTarget?.empId === emp.user_id ? null : { empId: emp.user_id, fromGroup: gi })
                      }
                      className="text-[var(--text-muted)] hover:text-[var(--cort-orange)] p-0.5 rounded"
                    >
                      <ChevronDown className="w-3 h-3" />
                    </button>
                    {moveTarget?.empId === emp.user_id && moveTarget.fromGroup === gi && (
                      <div className="absolute right-0 top-5 z-50 w-40 bg-[var(--bg-card)] border border-[var(--border-input)] rounded-lg shadow-lg py-1 text-xs">
                        {groups.map(
                          (g, i) =>
                            i !== gi && (
                              <button
                                key={i}
                                type="button"
                                onClick={() => moveEmployee(emp.user_id, gi, i)}
                                className="w-full text-left px-3 py-1.5 hover:bg-[var(--bg-subtle)]"
                              >
                                → {g.vehicle.plate_number}
                              </button>
                            ),
                        )}
                        <button
                          type="button"
                          onClick={() => moveEmployee(emp.user_id, gi, "unassigned")}
                          className="w-full text-left px-3 py-1.5 hover:bg-[var(--bg-subtle)] text-red-400"
                        >
                          → Unassigned
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {unassigned.length > 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-600 mb-2">
            <Users className="w-3.5 h-3.5" />
            Unassigned ({unassigned.length}) — no address or vehicle overflow
          </div>
          {unassigned.map((emp) => (
            <div key={emp.user_id} className="flex items-center justify-between text-xs gap-1">
              <div className="min-w-0">
                <span className="font-medium">{emp.full_name}</span>
                {emp.department && <span className="text-[var(--text-muted)] ml-1">· {emp.department}</span>}
                {!emp.home_address && <span className="text-amber-500 ml-1">(no address)</span>}
              </div>
              {groups.length > 0 && (
                <div className="relative flex-shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      setMoveTarget(
                        moveTarget?.empId === emp.user_id ? null : { empId: emp.user_id, fromGroup: "unassigned" },
                      )
                    }
                    className="text-[var(--text-muted)] hover:text-[var(--cort-orange)] p-0.5 rounded"
                  >
                    <UserPlus className="w-3 h-3" />
                  </button>
                  {moveTarget?.empId === emp.user_id && moveTarget.fromGroup === "unassigned" && (
                    <div className="absolute right-0 top-5 z-50 w-40 bg-[var(--bg-card)] border border-[var(--border-input)] rounded-lg shadow-lg py-1 text-xs">
                      {groups.map((g, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => moveEmployee(emp.user_id, "unassigned", i)}
                          className="w-full text-left px-3 py-1.5 hover:bg-[var(--bg-subtle)]"
                        >
                          → {g.vehicle.plate_number}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OvertimeApprovalsPage() {
  const company = useAppSelector(selectCompany);
  const companyId = Number(company?.id);
  const [tab, setTab] = useState<"pending" | "approved">("pending");
  const [requests, setRequests] = useState<any[]>([]);
  const [approvedRequests, setApprovedRequests] = useState<any[]>([]);
  const [previews, setPreviews] = useState<Record<number, RoutePreview>>({});
  const [vehicleDataMap, setVehicleDataMap] = useState<Record<number, VehicleInitData>>({});
  const [listLoading, setListLoading] = useState(true);
  const [previewsLoading, setPreviewsLoading] = useState(false);
  const [vehicleDataLoading, setVehicleDataLoading] = useState(false);
  const [actionState, setActionState] = useState<ActionState>(null);
  const [approvalModal, setApprovalModal] = useState<ApprovedMapState | null>(null);

  const loadSectionData = useCallback(
    async (pending: any[], approved: any[]) => {
      if (!companyId) return;
      const pendingIds: number[] = pending.map((r) => r.id);
      const approvedIds: number[] = approved.map((r) => r.id);
      const allIds = [...new Set([...pendingIds, ...approvedIds])];
      if (allIds.length === 0) return;

      setPreviewsLoading(true);
      if (pendingIds.length > 0) setVehicleDataLoading(true);

      // Previews (both tabs) and pending vehicle assignments fire in parallel
      await Promise.all([
        // ── Route previews ──────────────────────────────────────────────────
        apiClient
          .bulkGetOvertimePreviews(companyId, allIds)
          .then((res: any) => {
            const data: Record<string, RoutePreview> = res?.data ?? res ?? {};
            setPreviews((prev) => ({
              ...prev,
              ...Object.fromEntries(Object.entries(data).map(([k, v]) => [Number(k), v])),
            }));
          })
          .catch(() => {})
          .finally(() => setPreviewsLoading(false)),

        // ── Vehicle data (pending only) ─────────────────────────────────────
        pendingIds.length > 0
          ? (async () => {
              try {
                const assignRes: any = await apiClient.bulkGetOvertimeVehicleAssignments(companyId, pendingIds);
                const assignData: Record<string, SavedAssignment[]> = assignRes?.data ?? assignRes ?? {};

                const vehicleMap: Record<number, VehicleInitData> = {};
                const needsSuggestion: number[] = [];

                for (const id of pendingIds) {
                  const saved = assignData[String(id)] ?? [];
                  if (saved.length > 0) {
                    vehicleMap[id] = { type: "saved", assignments: saved };
                  } else {
                    needsSuggestion.push(id);
                  }
                }

                if (needsSuggestion.length > 0) {
                  const suggestRes: any = await apiClient.bulkSuggestOvertimeVehicles(companyId, needsSuggestion);
                  const suggestData: Record<string, SuggestionResponse> = suggestRes?.data ?? suggestRes ?? {};
                  for (const id of needsSuggestion) {
                    if (suggestData[String(id)]) {
                      vehicleMap[id] = { type: "suggestion", data: suggestData[String(id)] };
                    }
                  }
                }

                setVehicleDataMap((prev) => ({ ...prev, ...vehicleMap }));
              } finally {
                setVehicleDataLoading(false);
              }
            })()
          : Promise.resolve(),
      ]);
    },
    [companyId],
  );

  const load = useCallback(async () => {
    if (!companyId) return;
    setListLoading(true);
    try {
      const [pendingRes, approvedRes] = await Promise.all([
        apiClient.getOvertimeRequests(companyId, { status: "PENDING" }),
        apiClient.getOvertimeRequests(companyId, { status: "APPROVED" }),
      ]);
      const pending = pendingRes.data ?? [];
      const approved = (approvedRes.data ?? []).slice(0, 20);
      setRequests(pending);
      setApprovedRequests(approved);
      // Reset section data so re-load fetches fresh
      setPreviews({});
      setVehicleDataMap({});
      await loadSectionData(pending, approved);
    } catch {
      toast.error("Failed to load overtime requests");
    } finally {
      setListLoading(false);
    }
  }, [companyId, loadSectionData]);

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
        toast.success(
          `Approved · ${impact
            .map(
              (r: { route_name: string; employees_excluded: number; stops_skipped: number }) =>
                `${r.route_name}: ${r.employees_excluded} removed → ${r.stops_skipped} stops skipped`,
            )
            .join(" · ")}`,
        );
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
        description="Review overtime requests, assign vehicles by address proximity, then approve"
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

      {listLoading ? (
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <Card key={i} className="p-6 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex-1 space-y-3">
                  <Skeleton className="h-5 w-64" />
                  <Skeleton className="h-3 w-48" />
                  <div className="space-y-1.5 mt-3">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-5/6" />
                    <Skeleton className="h-3 w-4/6" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-9 w-20 rounded-lg" />
                  <Skeleton className="h-9 w-16 rounded-lg" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : tab === "pending" ? (
        requests.length === 0 ? (
          <Card className="p-6 text-sm text-[var(--text-muted)]">No pending requests.</Card>
        ) : (
          requests.map((r) => {
            const preview = previews[r.id];
            const vehicleInit = vehicleDataMap[r.id];
            const busy = cardBusy(r.id);
            const approving = busy && actionState?.type === "approve";
            const rejecting = busy && actionState?.type === "reject";
            const overtimeEmployees: OvertimeEmployee[] = (r.shuttle_overtime_request_employees ?? []).map(
              (e: any) => ({
                user_id: e.users?.id ?? e.employee_user_id,
                full_name: e.users?.full_name ?? "",
                department: e.users?.department ?? null,
                home_address: e.users?.home_address ?? null,
              }),
            );
            return (
              <Card key={r.id} className="p-6 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">
                      {r.departments?.name} · {String(r.request_date).slice(0, 10)}
                      {r.shift_time && (
                        <span className="ml-2 text-sm font-normal text-[var(--cort-orange)]">
                          Shift {formatShiftTime(r.shift_time)}
                        </span>
                      )}
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

                    {/* Route preview */}
                    {previewsLoading && !preview ? (
                      <div className="mt-4 rounded-lg border border-[var(--border-light)] bg-[var(--surface-subtle)]/50 p-4 space-y-3">
                        <Skeleton className="h-3 w-36" />
                        <div className="space-y-1.5">
                          <Skeleton className="h-3 w-full" />
                          <Skeleton className="h-3 w-5/6" />
                          <Skeleton className="h-3 w-4/6" />
                        </div>
                        <Skeleton className="h-[300px] w-full rounded-lg" />
                      </div>
                    ) : preview && preview.routes.length > 0 ? (
                      <div className="mt-4 rounded-lg border border-[var(--border-light)] bg-[var(--surface-subtle)]/50 p-4 space-y-4">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">
                            Evening route impact preview
                          </p>
                          <ul className="space-y-1.5 text-sm">
                            {preview.routes.map((route) => (
                              <li key={route.route_id} className="text-[var(--text-secondary)]">
                                <span className="font-medium text-[var(--text-primary)]">{route.route_name}</span>
                                {": "}
                                {route.employees_excluded} employee
                                {route.employees_excluded !== 1 ? "s" : ""} removed{" → "}
                                {route.stops_skipped} stop{route.stops_skipped !== 1 ? "s" : ""} skipped
                              </li>
                            ))}
                          </ul>
                        </div>
                        <OvertimeRouteMapTabs routes={preview.routes} height="300px" />
                      </div>
                    ) : null}

                    {/* Vehicle optimizer */}
                    {vehicleDataLoading && !vehicleInit ? (
                      <VehicleOptimizerSkeleton />
                    ) : vehicleInit ? (
                      <OvertimeVehicleOptimizer
                        key={r.id}
                        requestId={r.id}
                        companyId={companyId}
                        overtimeEmployees={overtimeEmployees}
                        initData={vehicleInit}
                      />
                    ) : null}
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
          const preview = previews[r.id];
          const routes = preview?.routes ?? [];
          return (
            <Card key={r.id} className="p-6 space-y-4">
              <div>
                <p className="font-semibold">
                  {r.departments?.name} · {String(r.request_date).slice(0, 10)}
                  {r.shift_time && (
                    <span className="ml-2 text-sm font-normal text-[var(--cort-orange)]">
                      Shift {formatShiftTime(r.shift_time)}
                    </span>
                  )}
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Approved · {r.shuttle_overtime_request_employees?.length ?? 0} employees excluded
                </p>
              </div>
              {previewsLoading && !preview ? (
                <Skeleton className="h-[300px] w-full rounded-lg" />
              ) : routes.length > 0 ? (
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
        {approvalModal && <OvertimeRouteMapTabs routes={approvalModal.routes} height="360px" />}
      </CompanyModal>
    </div>
  );
}
