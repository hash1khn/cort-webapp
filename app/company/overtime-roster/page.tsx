"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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

type OvertimeLine = {
  employee: RosterLine["employee"];
  status: string;
  request_id: number;
  department: { id: number; name: string };
  route?: { id: number; name: string } | null;
  pickup_stop?: { id: number; name: string } | null;
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

  // Reset pagination when the dataset changes
  useEffect(() => {
    setPageOnTime(1);
    setPageOvertime(1);
  }, [date, tab, search]);

  const counts = data?.counts ?? { roster: 0, on_time: 0, overtime: 0 };
  const pagination = data?.pagination ?? {
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 1,
    hasPrev: false,
    hasNext: false,
  };

  const items: Array<RosterLine | OvertimeLine> = data?.items ?? [];

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
        description="See who is on-time vs overtime (excluded from evening shuttle) for a given day"
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
            On-time ({counts.on_time})
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

        {loading ? (
          <CompanyPageLoader label="Loading roster…" minHeight="min-h-[240px]" />
        ) : tab === "on_time" ? (
          <div className="space-y-3">
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
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-[var(--text-muted)]">
                      No on-time employees found for this date.
                    </td>
                  </tr>
                ) : (
                  (items as RosterLine[]).map((l) => (
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
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3 text-left font-semibold">Route</th>
                  <th className="px-4 py-3 text-left font-semibold">Pickup stop</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-default)]">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-[var(--text-muted)]">
                      No overtime employees found for this date.
                    </td>
                  </tr>
                ) : (
                  (items as OvertimeLine[]).map((l) => (
                    <tr key={l.employee.id}>
                      <td className="px-4 py-3">
                        <div className="font-medium">{l.employee.full_name}</div>
                        {l.employee.employee_id && (
                          <div className="text-xs text-[var(--text-muted)]">{l.employee.employee_id}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[var(--text-muted)]">{l.department?.name ?? l.employee.department ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-orange-100 text-orange-700 px-2 py-1 text-xs font-semibold">
                          {l.status}
                        </span>
                        <span className="ml-2 text-xs text-[var(--text-muted)]">#{l.request_id}</span>
                      </td>
                      <td className="px-4 py-3 text-[var(--text-muted)]">{l.route?.name ?? "—"}</td>
                      <td className="px-4 py-3 text-[var(--text-muted)]">{l.pickup_stop?.name ?? "—"}</td>
                    </tr>
                  ))
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

