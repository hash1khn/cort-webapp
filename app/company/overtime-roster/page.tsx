"use client";

import { useCallback, useEffect, useState } from "react";
import { useAppSelector } from "../../lib/store/hooks";
import { selectCompany } from "../../lib/store/slices/companySlice";
import { apiClient } from "../../lib/services/api-client";
import { PageHeader, COMPANY_PAGE_CLASS, CompanyPageLoader } from "../components/PageLayout";
import { Card } from "../components/DashboardComponents";
import { toast } from "sonner";

type RosterLine = {
  employee: {
    id: string;
    full_name: string;
    employee_id?: string | null;
    department?: string | null;
  };
  route?: { id: number; name: string } | null;
  pickup_stop?: { id: number; name: string } | null;
};

type OvertimeShift = {
  shift_time: string;
  status: string;
  request_id: number;
  kind: "initial" | "extension";
};

type OvertimeLine = {
  employee: RosterLine["employee"];
  department: { id: number; name: string };
  route?: { id: number; name: string } | null;
  pickup_stop?: { id: number; name: string } | null;
  shifts: OvertimeShift[];
  latest_shift_time: string | null;
  evening_shuttle: "excluded" | "pending_approval";
};

type ShiftSummary = {
  shift_time: string;
  approved: number;
  pending: number;
  extensions: number;
};

export default function OvertimeRosterPage() {
  const company = useAppSelector(selectCompany);
  const companyId = Number(company?.id);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [tab, setTab] = useState<"on_time" | "overtime">("on_time");
  const [search, setSearch] = useState("");
  const PAGE_SIZE = 25;
  const [pageOnTime, setPageOnTime] = useState(1);
  const [pageOvertime, setPageOvertime] = useState(1);

  const load = useCallback(async () => {
    if (!companyId || !date) return;
    setLoading(true);
    try {
      const page = tab === "on_time" ? pageOnTime : pageOvertime;
      const res: any = await apiClient.getOvertimeDailyRoster(companyId, {
        date,
        tab,
        page,
        limit: PAGE_SIZE,
        search: search.trim() || undefined,
      });
      setData(res?.data ?? res);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to load daily roster");
    } finally {
      setLoading(false);
    }
  }, [companyId, date, tab, pageOnTime, pageOvertime, search]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPageOnTime(1);
    setPageOvertime(1);
  }, [date, tab, search]);

  const counts = data?.counts ?? { roster: 0, on_time: 0, overtime: 0 };
  const dataTab = data?.tab as "on_time" | "overtime" | undefined;
  const isStaleData = Boolean(data && dataTab && dataTab !== tab);
  const overtimeSummary = data?.overtime_summary as
    | { employees: number; by_shift: ShiftSummary[] }
    | undefined;
  const pagination = data?.pagination ?? {
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 1,
    hasPrev: false,
    hasNext: false,
  };

  const items: Array<RosterLine | OvertimeLine> = data?.items ?? [];
  const onTimeItems = dataTab === "on_time" ? (items as RosterLine[]) : [];
  const overtimeItems =
    dataTab === "overtime" ? (items as any[]).map(normalizeOvertimeLine) : [];

  const Pagination = ({
    page,
    totalPages,
    onPrev,
    onNext,
    total,
  }: {
    page: number;
    totalPages: number;
    onPrev: () => void;
    onNext: () => void;
    total: number;
  }) => (
    <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
      <div className="text-xs text-[var(--text-muted)]">
        Showing {(page - 1) * PAGE_SIZE + (total === 0 ? 0 : 1)}–{Math.min(page * PAGE_SIZE, total)} of {total}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onPrev}
          disabled={page <= 1}
          className="rounded-lg border border-[var(--border-input)] px-3 py-2 text-xs disabled:opacity-60"
        >
          Prev
        </button>
        <span className="text-xs text-[var(--text-muted)]">
          Page {page} / {totalPages}
        </span>
        <button
          type="button"
          onClick={onNext}
          disabled={page >= totalPages}
          className="rounded-lg border border-[var(--border-input)] px-3 py-2 text-xs disabled:opacity-60"
        >
          Next
        </button>
      </div>
    </div>
  );

  return (
    <div className={COMPANY_PAGE_CLASS}>
      <PageHeader
        label="Operations"
        title="Daily Roster"
        description="Who rides the evening shuttle vs who is on overtime (and until which shift)"
      />

      <Card className="p-6 space-y-4">
        <div className="grid gap-3 md:grid-cols-3 items-end">
          <label className="text-sm">
            <span className="text-[var(--text-muted)]">Date</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[var(--border-input)] bg-[var(--bg-input)] px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm md:col-span-2">
            <span className="text-[var(--text-muted)]">Search</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by employee name or employee ID"
              className="mt-1 w-full rounded-lg border border-[var(--border-input)] bg-[var(--bg-input)] px-3 py-2 text-sm"
            />
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-subtle)] px-4 py-3">
            <p className="text-xs text-[var(--text-muted)]">Total on routes</p>
            <p className="text-xl font-bold">{counts.roster}</p>
          </div>
          <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-subtle)] px-4 py-3">
            <p className="text-xs text-[var(--text-muted)]">Evening shuttle (on-time)</p>
            <p className="text-xl font-bold text-emerald-700">{counts.on_time}</p>
          </div>
          <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-subtle)] px-4 py-3">
            <p className="text-xs text-[var(--text-muted)]">Overtime employees</p>
            <p className="text-xl font-bold text-[var(--cort-orange)]">{counts.overtime}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setTab("on_time")}
            className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
              tab === "on_time"
                ? "bg-[var(--bg-subtle)] border-[var(--border-default)]"
                : "border-transparent text-[var(--text-muted)] hover:bg-[var(--bg-subtle)]"
            }`}
          >
            Evening shuttle ({counts.on_time})
          </button>
          <button
            type="button"
            onClick={() => setTab("overtime")}
            className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
              tab === "overtime"
                ? "bg-[var(--bg-subtle)] border-[var(--border-default)]"
                : "border-transparent text-[var(--text-muted)] hover:bg-[var(--bg-subtle)]"
            }`}
          >
            Overtime ({counts.overtime})
          </button>
          <button
            type="button"
            onClick={load}
            className="ml-auto rounded-lg border border-[var(--border-input)] px-3 py-2 text-sm"
          >
            Refresh
          </button>
        </div>

        {tab === "overtime" && dataTab === "overtime" && overtimeSummary?.by_shift && overtimeSummary.by_shift.length > 0 && (
          <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-subtle)] p-4 space-y-2">
            <p className="text-sm font-semibold">Overtime by shift</p>
            <div className="flex flex-wrap gap-2">
              {overtimeSummary.by_shift.map((bucket) => (
                <div
                  key={bucket.shift_time}
                  className="rounded-lg border border-[var(--border-input)] bg-[var(--bg-input)] px-3 py-2 text-xs"
                >
                  <p className="font-semibold text-[var(--cort-orange)]">
                    {formatShiftTimeLabel(bucket.shift_time)}
                  </p>
                  <p className="text-[var(--text-muted)] mt-0.5">
                    {bucket.approved} approved · {bucket.pending} pending
                    {bucket.extensions > 0 && ` · ${bucket.extensions} extension${bucket.extensions === 1 ? "" : "s"}`}
                  </p>
                </div>
              ))}
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              Approved overtime = excluded from evening shuttle. Extension = employee already on an earlier
              approved shift and staying until a later shift.
            </p>
          </div>
        )}

        {loading || isStaleData ? (
          <CompanyPageLoader label="Loading roster…" minHeight="min-h-[240px]" />
        ) : tab === "on_time" ? (
          <div className="space-y-3">
            <p className="text-xs text-[var(--text-muted)]">
              Employees taking the normal evening return shuttle (not marked overtime for this date).
            </p>
            <Pagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              total={pagination.total}
              onPrev={() => setPageOnTime((p) => Math.max(1, p - 1))}
              onNext={() => setPageOnTime((p) => Math.min(pagination.totalPages, p + 1))}
            />
            <div className="overflow-x-auto rounded-lg border border-[var(--border-default)]">
              <table className="w-full text-sm">
                <thead className="text-xs text-[var(--text-muted)] bg-[var(--bg-subtle)]">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Employee</th>
                    <th className="px-4 py-3 text-left font-semibold">Department</th>
                    <th className="px-4 py-3 text-left font-semibold">Route</th>
                    <th className="px-4 py-3 text-left font-semibold">Pickup stop</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-default)]">
                  {onTimeItems.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-10 text-center text-[var(--text-muted)]">
                        No on-time employees found for this date.
                      </td>
                    </tr>
                  ) : (
                    onTimeItems.map((l) => (
                      <tr key={l.employee.id}>
                        <td className="px-4 py-3">
                          <div className="font-medium">{l.employee.full_name}</div>
                          {l.employee.employee_id && (
                            <div className="text-xs text-[var(--text-muted)]">{l.employee.employee_id}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-[var(--text-muted)]">{l.employee.department ?? "—"}</td>
                        <td className="px-4 py-3 text-[var(--text-muted)]">{l.route?.name ?? "—"}</td>
                        <td className="px-4 py-3 text-[var(--text-muted)]">{l.pickup_stop?.name ?? "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-[var(--text-muted)]">
              One row per employee. If they have an extension request, both shifts are shown.
            </p>
            <Pagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              total={pagination.total}
              onPrev={() => setPageOvertime((p) => Math.max(1, p - 1))}
              onNext={() => setPageOvertime((p) => Math.min(pagination.totalPages, p + 1))}
            />
            <div className="overflow-x-auto rounded-lg border border-[var(--border-default)]">
              <table className="w-full text-sm">
                <thead className="text-xs text-[var(--text-muted)] bg-[var(--bg-subtle)]">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Employee</th>
                    <th className="px-4 py-3 text-left font-semibold">Department</th>
                    <th className="px-4 py-3 text-left font-semibold">Staying until</th>
                    <th className="px-4 py-3 text-left font-semibold">OT requests</th>
                    <th className="px-4 py-3 text-left font-semibold">Evening shuttle</th>
                    <th className="px-4 py-3 text-left font-semibold">Route</th>
                    <th className="px-4 py-3 text-left font-semibold">Pickup stop</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-default)]">
                  {overtimeItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-[var(--text-muted)]">
                        No overtime employees found for this date.
                      </td>
                    </tr>
                  ) : (
                    overtimeItems.map((l) => {
                      const shifts = l.shifts ?? [];
                      return (
                      <tr key={l.employee.id}>
                        <td className="px-4 py-3">
                          <div className="font-medium">{l.employee.full_name}</div>
                          {l.employee.employee_id && (
                            <div className="text-xs text-[var(--text-muted)]">{l.employee.employee_id}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-[var(--text-muted)]">
                          {l.department?.name ?? l.employee.department ?? "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-semibold text-[var(--cort-orange)]">
                            {formatShiftTimeLabel(l.latest_shift_time) || "—"}
                          </span>
                          {shifts.length > 1 && (
                            <p className="text-xs text-[var(--text-muted)] mt-0.5">
                              Started {formatShiftTimeLabel(shifts[0]?.shift_time)}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-1.5">
                            {shifts.map((shift) => (
                              <div key={`${shift.request_id}-${shift.shift_time}`} className="flex flex-wrap items-center gap-1.5">
                                <StatusBadge status={shift.status} />
                                <span className="text-xs text-[var(--text-muted)]">
                                  {formatShiftTimeLabel(shift.shift_time)}
                                  {shift.kind === "extension" && (
                                    <span className="ml-1 font-medium text-amber-700">· Extension</span>
                                  )}
                                </span>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {l.evening_shuttle === "excluded" ? (
                            <span className="rounded-full bg-orange-100 text-orange-800 px-2 py-1 text-xs font-semibold">
                              Excluded
                            </span>
                          ) : (
                            <span className="rounded-full bg-amber-100 text-amber-800 px-2 py-1 text-xs font-semibold">
                              Pending approval
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-[var(--text-muted)]">{l.route?.name ?? "—"}</td>
                        <td className="px-4 py-3 text-[var(--text-muted)]">{l.pickup_stop?.name ?? "—"}</td>
                      </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function normalizeOvertimeLine(raw: any): OvertimeLine {
  if (Array.isArray(raw?.shifts) && raw.shifts.length > 0) {
    const shifts = raw.shifts as OvertimeShift[];
    const hasApproved = shifts.some((s) => String(s.status).toUpperCase() === "APPROVED");
    return {
      employee: raw.employee,
      department: raw.department ?? { id: 0, name: raw.employee?.department ?? "" },
      route: raw.route ?? null,
      pickup_stop: raw.pickup_stop ?? null,
      shifts,
      latest_shift_time: raw.latest_shift_time ?? shifts[shifts.length - 1]?.shift_time ?? null,
      evening_shuttle: raw.evening_shuttle ?? (hasApproved ? "excluded" : "pending_approval"),
    };
  }

  const status = String(raw?.status ?? "PENDING");
  const requestId = Number(raw?.request_id ?? 0);
  const shiftTime = raw?.latest_shift_time ?? raw?.shift_time ?? "";
  const shifts: OvertimeShift[] = [
    {
      shift_time: shiftTime,
      status,
      request_id: requestId,
      kind: "initial",
    },
  ];

  return {
    employee: raw.employee,
    department: raw.department ?? { id: 0, name: raw.employee?.department ?? "" },
    route: raw.route ?? null,
    pickup_stop: raw.pickup_stop ?? null,
    shifts,
    latest_shift_time: shiftTime || null,
    evening_shuttle: status.toUpperCase() === "APPROVED" ? "excluded" : "pending_approval",
  };
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toUpperCase();
  const styles =
    normalized === "APPROVED"
      ? "bg-emerald-100 text-emerald-800"
      : normalized === "PENDING"
        ? "bg-amber-100 text-amber-800"
        : "bg-gray-100 text-gray-700";

  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${styles}`}>
      {normalized}
    </span>
  );
}

function formatShiftTimeLabel(raw: string | null | undefined): string {
  if (!raw) return "";
  const match = String(raw).match(/(\d{2}):(\d{2})/);
  if (!match) return raw;
  const h = Number(match[1]);
  const m = Number(match[2]);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(hour12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${period}`;
}
