"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAppSelector } from "../../lib/store/hooks";
import { selectCompany } from "../../lib/store/slices/companySlice";
import { apiClient } from "../../lib/services/api-client";
import { useAuth } from "../../lib/contexts/auth-context";
import { UserRole } from "../../lib/types/auth-types";
import {
  PageHeader,
  COMPANY_PAGE_CLASS,
  CompanyPageLoader,
  CompanyLoadingButton,
} from "../components/PageLayout";
import { Card } from "../components/DashboardComponents";
import { toast } from "sonner";

type OvertimeRequest = {
  id: number;
  status: string;
  shift_time?: string | null;
  notes?: string | null;
  rejection_reason?: string | null;
  departments?: { id: number; name: string };
  shuttle_overtime_request_employees?: Array<{
    employee_user_id?: string;
    users?: {
      id: string;
      full_name?: string;
      employee_id?: string | null;
      department?: string | null;
      department_id?: number | null;
    };
  }>;
};

const LATER_SHIFT_BY_EARLIER: Record<string, "21:30"> = {
  "19:30": "21:30",
};

export default function OvertimeRequestsPage() {
  const company = useAppSelector(selectCompany);
  const { user, isCompanyAdmin } = useAuth();
  const companyId = Number(company?.id);
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [requestDate, setRequestDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [departmentId, setDepartmentId] = useState<string>("");
  const [shiftPreset, setShiftPreset] = useState<"19:30" | "21:30" | "CUSTOM">("19:30");
  const [customShiftTime, setCustomShiftTime] = useState("19:30");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [history, setHistory] = useState<OvertimeRequest[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [tab, setTab] = useState<"create" | "history">("create");
  const [expandedRequestId, setExpandedRequestId] = useState<number | null>(null);

  const PAGE_SIZE = 30;

  const currentShiftTime = shiftPreset === "CUSTOM" ? customShiftTime : shiftPreset;

  const load = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const [empRes, deptRes] = await Promise.all([
        apiClient.getEmployeesByCompany(companyId, { page, limit: PAGE_SIZE, search: search.trim() || undefined }),
        isCompanyAdmin ? apiClient.getDepartments(companyId) : Promise.resolve({ data: [] }),
      ]);
      const list = (empRes as any)?.data?.data ?? [];
      const pagination = (empRes as any)?.data?.pagination ?? null;
      setEmployees((prev) => (page === 1 ? list : [...prev, ...list]));
      if (pagination) {
        setHasMore(Boolean(pagination?.hasNextPage));
      } else {
        setHasMore(list.length === PAGE_SIZE);
      }
      setDepartments(deptRes.data ?? []);
      if (user?.role === UserRole.SHUTTLE_REQUESTER && user.department_id) {
        setDepartmentId(String(user.department_id));
      }
    } catch {
      toast.error("Failed to load employees");
    } finally {
      setLoading(false);
    }
  }, [companyId, isCompanyAdmin, user, page, search]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    setPage(1);
    setHasMore(true);
  }, [search]);

  const loadHistory = useCallback(async () => {
    if (!companyId) return;
    setHistoryLoading(true);
    try {
      const res = await apiClient.getOvertimeRequests(companyId, { from: requestDate, to: requestDate });
      setHistory((res as any)?.data ?? []);
    } catch {
      // silent
    } finally {
      setHistoryLoading(false);
    }
  }, [companyId, requestDate]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const approvedEarlierRequests = useMemo(
    () =>
      history.filter(
        (r) =>
          r.status === "APPROVED" &&
          shiftMinutes(r.shift_time) < shiftMinutes(currentShiftTime),
      ),
    [history, currentShiftTime],
  );

  const isExtensionMode = approvedEarlierRequests.length > 0;

  const extensionEligibleEmployees = useMemo(() => {
    const map = new Map<string, any>();
    for (const req of approvedEarlierRequests) {
      for (const line of req.shuttle_overtime_request_employees ?? []) {
        const emp = line.users;
        const id = line.employee_user_id ?? emp?.id;
        if (!id) continue;
        map.set(id, {
          id,
          full_name: emp?.full_name ?? "Unknown",
          employee_id: emp?.employee_id,
          department_id: emp?.department_id,
          departments: req.departments,
          department: emp?.department,
        });
      }
    }
    return [...map.values()];
  }, [approvedEarlierRequests]);

  const blockedEmployeeIds = useMemo(() => {
    const ids = new Set<string>();
    for (const req of history) {
      if (req.status !== "APPROVED" && req.status !== "PENDING") continue;
      if (shiftMinutes(req.shift_time) !== shiftMinutes(currentShiftTime)) continue;
      for (const line of req.shuttle_overtime_request_employees ?? []) {
        const id = line.employee_user_id ?? line.users?.id;
        if (id) ids.add(id);
      }
    }
    return ids;
  }, [history, currentShiftTime]);

  const filteredEmployees = useMemo(() => {
    const deptFilter = departmentId ? Number(departmentId) : null;
    return employees.filter((e) => {
      if (deptFilter && e.department_id !== deptFilter) return false;
      return true;
    });
  }, [employees, departmentId]);

  const pickerEmployees = useMemo(() => {
    const base = isExtensionMode ? extensionEligibleEmployees : filteredEmployees;
    const q = search.trim().toLowerCase();
    if (!q) return base;
    return base.filter((e) => {
      const name = (e.full_name ?? "").toLowerCase();
      const empId = String(e.employee_id ?? e.id ?? "").toLowerCase();
      return name.includes(q) || empId.includes(q);
    });
  }, [isExtensionMode, extensionEligibleEmployees, filteredEmployees, search]);

  const selectedEmployees = useMemo(
    () => {
      const pool = isExtensionMode ? extensionEligibleEmployees : employees;
      return pool.filter((e) => selected.has(e.id));
    },
    [isExtensionMode, extensionEligibleEmployees, employees, selected],
  );

  useEffect(() => {
    if (!isExtensionMode) return;
    const eligible = new Set(extensionEligibleEmployees.map((e) => e.id));
    setSelected((prev) => {
      const next = new Set([...prev].filter((id) => eligible.has(id) && !blockedEmployeeIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [isExtensionMode, extensionEligibleEmployees, blockedEmployeeIds]);

  const resolveSubmitDepartmentId = useCallback((): number | null => {
    if (!isCompanyAdmin) {
      return user?.department_id ? Number(user.department_id) : null;
    }
    if (departmentId) return Number(departmentId);
    const deptIds = new Set(
      selectedEmployees.map((e) => e.department_id).filter((id): id is number => id != null),
    );
    if (deptIds.size === 1) return [...deptIds][0];
    return null;
  }, [isCompanyAdmin, user?.department_id, departmentId, selectedEmployees]);

  useEffect(() => {
    if (!isCompanyAdmin || departmentId || selected.size === 0) return;
    const deptIds = new Set(
      selectedEmployees.map((e) => e.department_id).filter((id): id is number => id != null),
    );
    if (deptIds.size === 1) {
      setDepartmentId(String([...deptIds][0]));
    }
  }, [isCompanyAdmin, departmentId, selected, selectedEmployees]);

  const toggle = (id: string) => {
    if (submitting || blockedEmployeeIds.has(id)) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const startExtensionFromRequest = (request: OvertimeRequest) => {
    const earlierShift = normalizeShiftTime(request.shift_time);
    const laterShift = LATER_SHIFT_BY_EARLIER[earlierShift];
    if (!laterShift) {
      toast.error("No later shift preset available for this request");
      return;
    }
    setTab("create");
    setShiftPreset(laterShift as "21:30");
    setSelected(new Set());
    toast.info(`Select employees staying until ${formatShiftTimeLabel(laterShift)}`);
  };

  const handleSubmit = async () => {
    if (!companyId || submitting) return;

    const submitDepartmentId = resolveSubmitDepartmentId();
    if (isCompanyAdmin && !submitDepartmentId) {
      const deptIds = new Set(
        selectedEmployees.map((e) => e.department_id).filter((id): id is number => id != null),
      );
      if (deptIds.size > 1) {
        toast.error("Selected employees are from different departments. Submit one department at a time.");
      } else {
        toast.error("Select a department before submitting");
      }
      return;
    }

    setSubmitting(true);
    try {
      await apiClient.upsertOvertimeRequest(companyId, {
        request_date: requestDate,
        shift_time: currentShiftTime,
        employee_user_ids: [...selected],
        department_id: submitDepartmentId ?? undefined,
        notes: notes || undefined,
      });
      toast.success(
        isExtensionMode
          ? "Extension overtime request submitted for approval"
          : "Overtime request submitted for approval",
      );
      setSelected(new Set());
      loadHistory();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  };

  const submitDepartmentId = resolveSubmitDepartmentId();
  const submitDisabled = selected.size === 0 || (isCompanyAdmin && !submitDepartmentId);
  const needsDepartmentHint =
    isCompanyAdmin && selected.size > 0 && !submitDepartmentId;

  const submitLabel =
    selected.size > 0
      ? isExtensionMode
        ? `Submit extension (${selected.size}) for Approval`
        : `Submit (${selected.size}) for Approval`
      : isExtensionMode
        ? "Submit extension for Approval"
        : "Submit for Approval";

  const submitLoadingText =
    selected.size > 0
      ? `Submitting (${selected.size})…`
      : "Submitting…";

  return (
    <div className={COMPANY_PAGE_CLASS}>
      <PageHeader
        label="Operations"
        title="Overtime Requests"
        description="Mark employees who will work overtime and skip the evening shuttle"
      />
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-[var(--border-default)] pb-3">
          <button
            type="button"
            onClick={() => setTab("create")}
            className={cx(
              "rounded-lg px-3 py-2 text-sm font-semibold border",
              tab === "create"
                ? "bg-[var(--bg-subtle)] border-[var(--border-default)]"
                : "border-transparent text-[var(--text-muted)] hover:bg-[var(--bg-subtle)]",
            )}
          >
            New Request
          </button>
          <button
            type="button"
            onClick={() => setTab("history")}
            className={cx(
              "rounded-lg px-3 py-2 text-sm font-semibold border",
              tab === "history"
                ? "bg-[var(--bg-subtle)] border-[var(--border-default)]"
                : "border-transparent text-[var(--text-muted)] hover:bg-[var(--bg-subtle)]",
            )}
          >
            My Requests
          </button>
        </div>

        {tab === "history" ? (
          <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-subtle)] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Today&apos;s requests</p>
                <p className="text-xs text-[var(--text-muted)]">
                  Pending / approved / rejected for the selected date (your department).
                </p>
              </div>
              <label className="text-xs text-[var(--text-muted)]">
                Date
                <input
                  type="date"
                  value={requestDate}
                  onChange={(e) => setRequestDate(e.target.value)}
                  className="mt-1 block rounded-lg border border-[var(--border-input)] bg-[var(--bg-input)] px-2 py-1.5 text-xs"
                />
              </label>
              <button
                type="button"
                onClick={loadHistory}
                disabled={historyLoading || submitting}
                className="rounded-lg border border-[var(--border-input)] px-3 py-2 text-xs disabled:opacity-60"
              >
                {historyLoading ? "Refreshing…" : "Refresh"}
              </button>
            </div>
            <div className="mt-3 space-y-3">
              {historyLoading ? (
                <p className="text-xs text-[var(--text-muted)]">Loading…</p>
              ) : history.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)]">No requests yet for this date.</p>
              ) : (
                history.map((r) => {
                  const employeeLines = r.shuttle_overtime_request_employees ?? [];
                  const isExpanded = expandedRequestId === r.id;
                  const earlierShift = normalizeShiftTime(r.shift_time);
                  const canExtend =
                    r.status === "APPROVED" && Boolean(LATER_SHIFT_BY_EARLIER[earlierShift]);

                  return (
                    <div
                      key={r.id}
                      className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-input)] p-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-[var(--cort-orange)]">
                            {formatShiftTimeLabel(r.shift_time) || "—"}
                          </p>
                          <p className="text-xs text-[var(--text-muted)] mt-0.5">
                            Status: <span className="font-medium text-[var(--text-default)]">{r.status}</span>
                            {" · "}
                            {employeeLines.length} employee{employeeLines.length === 1 ? "" : "s"}
                          </p>
                          {r.notes && (
                            <p className="text-xs text-[var(--text-muted)] mt-1">Notes: {r.notes}</p>
                          )}
                          {r.rejection_reason && (
                            <p className="text-xs text-red-600 mt-1">Rejected: {r.rejection_reason}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {canExtend && (
                            <button
                              type="button"
                              onClick={() => startExtensionFromRequest(r)}
                              className="rounded-lg border border-[var(--border-input)] px-2.5 py-1.5 text-xs font-semibold hover:bg-[var(--bg-subtle)]"
                            >
                              Request further overtime
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setExpandedRequestId(isExpanded ? null : r.id)}
                            className="rounded-lg border border-[var(--border-input)] px-2.5 py-1.5 text-xs"
                          >
                            {isExpanded ? "Hide employees" : "Show employees"}
                          </button>
                        </div>
                      </div>
                      {isExpanded && (
                        <ul className="mt-3 divide-y divide-[var(--border-default)] border-t border-[var(--border-default)] pt-2">
                          {employeeLines.length === 0 ? (
                            <li className="py-2 text-xs text-[var(--text-muted)]">No employees listed.</li>
                          ) : (
                            employeeLines.map((line) => {
                              const emp = line.users;
                              const name = emp?.full_name ?? "Unknown";
                              const empId = emp?.employee_id ?? line.employee_user_id?.slice(0, 8);
                              return (
                                <li key={line.employee_user_id ?? emp?.id} className="py-2 text-sm">
                                  <span className="font-medium">{name}</span>
                                  {empId && (
                                    <span className="text-xs text-[var(--text-muted)]"> · {empId}</span>
                                  )}
                                </li>
                              );
                            })
                          )}
                        </ul>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="grid gap-3 md:grid-cols-3">
              <label className="text-sm">
                <span className="text-[var(--text-muted)]">Date</span>
                <input
                  type="date"
                  value={requestDate}
                  onChange={(e) => setRequestDate(e.target.value)}
                  disabled={submitting}
                  className="mt-1 w-full rounded-lg border border-[var(--border-input)] bg-[var(--bg-input)] px-3 py-2 text-sm disabled:opacity-60"
                />
              </label>
              <div className="text-sm">
                <span className="text-[var(--text-muted)]">Shift time</span>
                <select
                  value={shiftPreset}
                  onChange={(e) => setShiftPreset(e.target.value as any)}
                  disabled={submitting}
                  className="mt-1 w-full rounded-lg border border-[var(--border-input)] bg-[var(--bg-input)] px-3 py-2 text-sm disabled:opacity-60"
                >
                  <option value="19:30">07:30 PM</option>
                  <option value="21:30">09:30 PM</option>
                  <option value="CUSTOM">Custom…</option>
                </select>
                {shiftPreset === "CUSTOM" && (
                  <input
                    type="time"
                    value={customShiftTime}
                    onChange={(e) => setCustomShiftTime(e.target.value)}
                    disabled={submitting}
                    className="mt-2 w-full rounded-lg border border-[var(--border-input)] bg-[var(--bg-input)] px-3 py-2 text-sm disabled:opacity-60"
                  />
                )}
              </div>
              {isCompanyAdmin && (
                <label className="text-sm">
                  <span className="text-[var(--text-muted)]">Department</span>
                  <select
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    disabled={submitting || isExtensionMode}
                    className="mt-1 w-full rounded-lg border border-[var(--border-input)] bg-[var(--bg-input)] px-3 py-2 text-sm disabled:opacity-60"
                  >
                    <option value="">All departments (browse)</option>
                    {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </label>
              )}
              <label className="text-sm md:col-span-3">
                <span className="text-[var(--text-muted)]">Search</span>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={
                    isExtensionMode
                      ? "Search approved overtime employees"
                      : "Search by employee name or employee ID"
                  }
                  disabled={submitting}
                  className="mt-1 w-full rounded-lg border border-[var(--border-input)] bg-[var(--bg-input)] px-3 py-2 text-sm disabled:opacity-60"
                />
              </label>
            </div>

            {isExtensionMode && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                <p className="font-semibold">Extension request</p>
                <p className="mt-0.5">
                  An earlier shift is already approved for this date. Select employees from that
                  approved list who need to stay until {formatShiftTimeLabel(currentShiftTime)}.
                </p>
              </div>
            )}

            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes (optional)"
              disabled={submitting}
              className="w-full rounded-lg border border-[var(--border-input)] bg-[var(--bg-input)] px-3 py-2 text-sm disabled:opacity-60"
              rows={2}
            />
            {loading && !isExtensionMode ? (
              <CompanyPageLoader label="Loading employees…" minHeight="min-h-[240px]" />
            ) : (
              <div className="max-h-96 overflow-y-auto divide-y divide-[var(--border-default)] border border-[var(--border-default)] rounded-lg">
                {pickerEmployees.map((e) => {
                  const blocked = blockedEmployeeIds.has(e.id);
                  return (
                    <label
                      key={e.id}
                      className={cx(
                        "flex items-center gap-3 px-4 py-3",
                        blocked || submitting
                          ? "opacity-50 cursor-not-allowed"
                          : "cursor-pointer hover:bg-[var(--bg-subtle)]",
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(e.id)}
                        onChange={() => toggle(e.id)}
                        disabled={submitting || blocked}
                      />
                      <div>
                        <p className="text-sm font-medium">{e.full_name}</p>
                        <p className="text-xs text-[var(--text-muted)]">
                          {e.departments?.name ?? e.department ?? "—"} · {e.employee_id ?? e.id.slice(0, 8)}
                          {blocked && " · Already on this shift"}
                        </p>
                      </div>
                    </label>
                  );
                })}
                {pickerEmployees.length === 0 && (
                  <div className="px-4 py-6 text-sm text-[var(--text-muted)]">
                    {isExtensionMode
                      ? "No approved overtime employees available for an extension at this shift."
                      : "No employees found."}
                  </div>
                )}
              </div>
            )}

            {!isExtensionMode && (
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-[var(--text-muted)]">
                  Showing {pickerEmployees.length} employee{pickerEmployees.length === 1 ? "" : "s"}
                  {search.trim() ? " (filtered by search)" : ""}
                </p>
                <CompanyLoadingButton
                  type="button"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!hasMore || loading || submitting}
                  loading={loading && page > 1}
                  loadingText="Loading…"
                  className="px-3 py-2 text-xs"
                >
                  Load more
                </CompanyLoadingButton>
              </div>
            )}

            <CompanyLoadingButton
              type="button"
              onClick={handleSubmit}
              disabled={submitDisabled}
              loading={submitting}
              loadingText={submitLoadingText}
              className="w-full sm:w-auto"
            >
              {submitLabel}
            </CompanyLoadingButton>
            {needsDepartmentHint && (
              <p className="text-xs text-amber-600">
                Pick a department above, or select employees from one department only — the department will be set automatically.
              </p>
            )}
          </>
        )}
      </Card>
    </div>
  );
}

function normalizeShiftTime(raw: string | null | undefined): string {
  if (!raw) return "";
  const match = String(raw).match(/(\d{2}:\d{2})/);
  return match ? match[1] : "";
}

function shiftMinutes(raw: string | null | undefined): number {
  const t = normalizeShiftTime(raw);
  if (!t) return 0;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function formatShiftTimeLabel(raw: string | null | undefined): string {
  const t = normalizeShiftTime(raw);
  if (!t) return "";
  const [hStr, mStr] = t.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(hour12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${period}`;
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}
