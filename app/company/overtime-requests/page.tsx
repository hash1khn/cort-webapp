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

export default function OvertimeRequestsPage() {
  const company = useAppSelector(selectCompany);
  const { user, isCompanyAdmin } = useAuth();
  const companyId = Number(company?.id);
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [requestDate, setRequestDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [departmentId, setDepartmentId] = useState<string>("");
  const [shiftPreset, setShiftPreset] = useState<"07:30" | "09:30" | "CUSTOM">("07:30");
  const [customShiftTime, setCustomShiftTime] = useState("07:30");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [tab, setTab] = useState<"create" | "history">("create");

  const PAGE_SIZE = 30;

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
    // When search changes, restart pagination
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
      // keep silent-ish; page is still usable
    } finally {
      setHistoryLoading(false);
    }
  }, [companyId, requestDate]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const filteredEmployees = useMemo(() => {
    const deptFilter = departmentId ? Number(departmentId) : null;
    return employees.filter((e) => {
      if (deptFilter && e.department_id !== deptFilter) return false;
      // Search is handled by backend; keep client filter minimal.
      return true;
    });
  }, [employees, departmentId]);

  const toggle = (id: string) => {
    if (submitting) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!companyId || submitting) return;
    setSubmitting(true);
    try {
      const shift_time = shiftPreset === "CUSTOM" ? customShiftTime : shiftPreset;
      await apiClient.upsertOvertimeRequest(companyId, {
        request_date: requestDate,
        employee_user_ids: [...selected],
        shift_time,
        department_id: departmentId ? Number(departmentId) : undefined,
        notes: notes || undefined,
      });
      toast.success("Overtime request submitted for approval");
      setSelected(new Set());
      loadHistory();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  };

  const submitDisabled = selected.size === 0 || (isCompanyAdmin && !departmentId);

  const submitLabel =
    selected.size > 0
      ? `Submit (${selected.size}) for Approval`
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
                <p className="text-sm font-semibold">Today’s requests</p>
                <p className="text-xs text-[var(--text-muted)]">
                  Pending / approved / rejected for the selected date (your department).
                </p>
              </div>
              <button
                type="button"
                onClick={loadHistory}
                disabled={historyLoading || submitting}
                className="rounded-lg border border-[var(--border-input)] px-3 py-2 text-xs disabled:opacity-60"
              >
                {historyLoading ? "Refreshing…" : "Refresh"}
              </button>
            </div>
            <div className="mt-3 overflow-x-auto">
              {historyLoading ? (
                <p className="text-xs text-[var(--text-muted)]">Loading…</p>
              ) : history.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)]">No requests yet for this date.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="text-xs text-[var(--text-muted)]">
                    <tr className="border-b border-[var(--border-default)]">
                      <th className="py-2 text-left font-semibold">Status</th>
                      <th className="py-2 text-left font-semibold">Employees</th>
                      <th className="py-2 text-left font-semibold">Notes</th>
                      <th className="py-2 text-left font-semibold">Rejection reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((r) => (
                      <tr key={r.id} className="border-b border-[var(--border-default)]">
                        <td className="py-2 font-medium">{r.status}</td>
                        <td className="py-2 text-[var(--text-muted)]">{r.shuttle_overtime_request_employees?.length ?? 0}</td>
                        <td className="py-2 text-[var(--text-muted)]">{r.notes ?? "—"}</td>
                        <td className="py-2 text-[var(--text-muted)]">{r.rejection_reason ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
          <label className="text-sm">
            <span className="text-[var(--text-muted)]">Shift time</span>
            <select
              value={shiftPreset}
              onChange={(e) => setShiftPreset(e.target.value as any)}
              disabled={submitting}
              className="mt-1 w-full rounded-lg border border-[var(--border-input)] bg-[var(--bg-input)] px-3 py-2 text-sm disabled:opacity-60"
            >
              <option value="07:30">07:30</option>
              <option value="09:30">09:30</option>
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
          </label>
          {isCompanyAdmin && (
            <label className="text-sm">
              <span className="text-[var(--text-muted)]">Department</span>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                disabled={submitting}
                className="mt-1 w-full rounded-lg border border-[var(--border-input)] bg-[var(--bg-input)] px-3 py-2 text-sm disabled:opacity-60"
              >
                <option value="">All (select when submitting)</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </label>
          )}
          <label className="text-sm md:col-span-3">
            <span className="text-[var(--text-muted)]">Search</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by employee name or employee ID"
              disabled={submitting}
              className="mt-1 w-full rounded-lg border border-[var(--border-input)] bg-[var(--bg-input)] px-3 py-2 text-sm disabled:opacity-60"
            />
          </label>
        </div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes (optional)"
          disabled={submitting}
          className="w-full rounded-lg border border-[var(--border-input)] bg-[var(--bg-input)] px-3 py-2 text-sm disabled:opacity-60"
          rows={2}
        />
        {loading ? (
          <CompanyPageLoader label="Loading employees…" minHeight="min-h-[240px]" />
        ) : (
          <div className="max-h-96 overflow-y-auto divide-y divide-[var(--border-default)] border border-[var(--border-default)] rounded-lg">
            {filteredEmployees.map((e) => (
              <label
                key={e.id}
                className={cx(
                  "flex items-center gap-3 px-4 py-3",
                  submitting ? "opacity-60 cursor-not-allowed" : "cursor-pointer hover:bg-[var(--bg-subtle)]",
                )}
              >
                <input
                  type="checkbox"
                  checked={selected.has(e.id)}
                  onChange={() => toggle(e.id)}
                  disabled={submitting}
                />
                <div>
                  <p className="text-sm font-medium">{e.full_name}</p>
                  <p className="text-xs text-[var(--text-muted)]">{e.departments?.name ?? e.department ?? "—"} · {e.employee_id ?? e.id.slice(0, 8)}</p>
                </div>
              </label>
            ))}
            {filteredEmployees.length === 0 && (
              <div className="px-4 py-6 text-sm text-[var(--text-muted)]">No employees found.</div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-[var(--text-muted)]">
            Showing {filteredEmployees.length} employee{filteredEmployees.length === 1 ? "" : "s"}
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
          </>
        )}
      </Card>
    </div>
  );
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}
