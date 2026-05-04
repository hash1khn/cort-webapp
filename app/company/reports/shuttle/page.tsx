"use client";

import { useCallback, useEffect, useState } from "react";
import { useAppSelector } from "../../../lib/store/hooks";
import { selectCompany } from "../../../lib/store/slices/companySlice";
import { ShuttleReport, apiClient } from "../../../lib/services/api-client";
import { Card } from "../../components/DashboardComponents";
import {
  PageHeader,
  TABLE_CARD_CLASS,
  TABLE_TOP_BAR_CLASS,
  TABLE_HEADER_CELL_CLASS,
  TABLE_CELL_CLASS,
} from "../../components/PageLayout";
import Modal from "../../bookings/components/Modal";
import TableSkeleton from "@/app/components/ui/TableSkeleton";

function DirectionBadge({ direction }: { direction: string }) {
  const isEvening = direction === "EVENING";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
        isEvening
          ? "bg-indigo-500/20 text-indigo-400"
          : "bg-amber-500/20 text-amber-400"
      }`}
    >
      {isEvening ? "🌙" : "☀️"} {direction}
    </span>
  );
}

interface PaginationMeta {
  page: number;
  pages: number;
  total: number;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-PK", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export default function ShuttleReportsPage() {
  const company = useAppSelector(selectCompany);

  const [reports, setReports] = useState<ShuttleReport[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pagination, setPagination] = useState<PaginationMeta>({ page: 1, pages: 1, total: 0 });
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedReport, setSelectedReport] = useState<ShuttleReport | null>(null);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const fetchReports = useCallback(async (page: number, start: string, end: string) => {
    if (!company?.id) return;
    setIsLoading(true);
    try {
      const res = await apiClient.getShuttleReports(company.id, {
        startDate: start || undefined,
        endDate: end || undefined,
        page,
      }) as any;
      const raw = res?.data ?? res;
      setReports(raw?.data ?? raw ?? []);
      const meta = raw?.pagination ?? {};
      setPagination({ page: meta.page ?? page, pages: meta.pages ?? 1, total: meta.total ?? 0 });
    } catch (e) {
      console.error("Failed to fetch shuttle reports", e);
    } finally {
      setIsLoading(false);
    }
  }, [company?.id]);

  // Debounce filter changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
      fetchReports(1, startDate, endDate);
    }, 400);
    return () => clearTimeout(timer);
  }, [startDate, endDate, fetchReports]);

  // Page change
  useEffect(() => {
    fetchReports(currentPage, startDate, endDate);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  if (!company) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-[var(--text-muted)]">No company selected</div>
      </div>
    );
  }

  if (!company.services_enabled?.shuttle_enabled) {
    return (
      <div className="flex items-center justify-center py-12">
        <Card className="max-w-md text-center flex flex-col items-center justify-center py-12">
          <div className="text-lg font-bold text-[var(--text-primary)]">
            Shuttle Service Disabled
          </div>
          <div className="mt-2 text-sm text-[var(--text-muted)]">
            Shuttle service is not enabled for your company. Please contact Cort
            Super Admin.
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-[1600px] mx-auto pb-12">
      <PageHeader
        label="Financial Reporting"
        title="Shuttle Reports"
        action={
          <>
            <div className="flex items-center gap-2 bg-[var(--bg-subtle)] p-1 rounded-xl border border-[var(--border-strong)] backdrop-blur-sm">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-9 rounded-lg border-0 bg-transparent px-3 text-sm text-[var(--text-primary)] focus:ring-0"
                placeholder="Start Date"
              />
              <span className="text-[var(--text-muted)]">/</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-9 rounded-lg border-0 bg-transparent px-3 text-sm text-[var(--text-primary)] focus:ring-0"
                placeholder="End Date"
              />
            </div>
            <button
              type="button"
              className="group relative flex items-center gap-2 rounded-xl bg-[var(--cort-orange)] px-5 py-2.5 text-sm font-bold text-[var(--text-primary)] transition-all hover:bg-[var(--cort-orange-hover)] hover:-translate-y-0.5 shadow-lg active:translate-y-0 active:shadow-md"
              onClick={() => alert("Export to CSV coming soon")}
            >
              <svg
                className="w-4 h-4 text-[var(--text-primary)]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Export CSV
            </button>
          </>
        }
      />

      <Card className={`min-h-[500px] ${TABLE_CARD_CLASS}`}>
        <div className={TABLE_TOP_BAR_CLASS}>
          <div className="mt-1 text-sm font-medium text-[var(--text-primary)]">
            Completed shuttle trips with route, vehicle, driver and boarding summary
          </div>
        </div>

        {/* error display removed — errors are logged to console */}

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left">
            <thead>
              <tr className="border-b border-[var(--border-light)]">
                <th className={TABLE_HEADER_CELL_CLASS}>Trip Date</th>
                <th className={TABLE_HEADER_CELL_CLASS}>Direction</th>
                <th className={TABLE_HEADER_CELL_CLASS}>Trip ID</th>
                <th className={TABLE_HEADER_CELL_CLASS}>Route</th>
                <th className={TABLE_HEADER_CELL_CLASS}>Vehicle</th>
                <th className={TABLE_HEADER_CELL_CLASS}>Driver</th>
                <th className={`${TABLE_HEADER_CELL_CLASS} text-right`}>Boarded</th>
                <th className={`${TABLE_HEADER_CELL_CLASS} text-right`}>Absent</th>
                <th className={`${TABLE_HEADER_CELL_CLASS} text-right`}>Assigned</th>
                <th className={TABLE_HEADER_CELL_CLASS}>Completed At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-light)]/50">
              {isLoading && reports.length === 0 ? (
                <TableSkeleton columns={10} rows={8} />
              ) : reports.length === 0 && !isLoading ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-[var(--text-muted)]">
                      <span className="bg-[var(--surface-subtle)] p-4 rounded-full mb-3">
                        <svg
                          className="w-6 h-6"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      </span>
                      <span>No shuttle reports found for the selected period.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                reports.map((report) => (
                  <tr
                    key={report.id}
                    onClick={() => setSelectedReport(report)}
                    className="group transition-colors border-b border-transparent hover:bg-[var(--surface-subtle)]/80 cursor-pointer"
                  >
                    <td className={`${TABLE_CELL_CLASS} whitespace-nowrap text-[var(--text-primary)] font-medium font-mono text-xs`}>
                      {report.trip_date
                        ? new Date(report.trip_date).toLocaleDateString("en-PK", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })
                        : "—"}
                    </td>
                    <td className={TABLE_CELL_CLASS}>
                      <DirectionBadge direction={report.direction} />
                    </td>
                    <td className={`${TABLE_CELL_CLASS} font-bold text-[var(--text-primary)]`}>
                      #{report.id}
                    </td>
                    <td className={TABLE_CELL_CLASS}>
                      <div className="font-semibold text-[var(--text-primary)] text-sm">
                        {report.route?.name || "—"}
                      </div>
                    </td>
                    <td className={TABLE_CELL_CLASS}>
                      {report.vehicle ? (
                        <>
                          <div className="text-[var(--text-primary)] font-medium">
                            {report.vehicle.make} {report.vehicle.model}
                          </div>
                          <div className="text-xs text-[var(--text-muted)] font-mono">
                            {report.vehicle.plate_number}
                          </div>
                        </>
                      ) : (
                        <span className="text-[var(--text-muted)]">—</span>
                      )}
                    </td>
                    <td className={TABLE_CELL_CLASS}>
                      <div className="text-[var(--text-primary)] font-medium text-sm">
                        {report.driver?.full_name || "—"}
                      </div>
                    </td>
                    <td className={`${TABLE_CELL_CLASS} text-right font-mono text-emerald-600 font-semibold`}>
                      {report.passengers.boarded}
                    </td>
                    <td className={`${TABLE_CELL_CLASS} text-right font-mono text-rose-500 font-semibold`}>
                      {report.passengers.absent}
                    </td>
                    <td className={`${TABLE_CELL_CLASS} text-right font-mono text-[var(--text-primary)]`}>
                      {report.passengers.total}
                    </td>
                    <td className={`${TABLE_CELL_CLASS} whitespace-nowrap text-xs text-[var(--text-muted)] font-mono`}>
                      {formatDateTime(report.completed_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border-light)]">
            <div className="text-xs text-[var(--text-muted)]">
              Showing {reports.length} of {pagination.total} trips
            </div>
            <div className="flex gap-1">
              {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(
                (page) => (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`h-7 w-7 rounded text-xs font-medium transition-colors ${
                      page === pagination.page
                        ? "bg-[#fe8503] text-[var(--text-primary)]"
                        : "text-[var(--text-muted)] hover:bg-[var(--surface-subtle)]"
                    }`}
                  >
                    {page}
                  </button>
                )
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Trip Detail Modal */}
      <Modal
        isOpen={!!selectedReport}
        onClose={() => setSelectedReport(null)}
        title={selectedReport ? `Shuttle Trip #${selectedReport.id}` : "Trip Details"}
      >
        {selectedReport && (
          <div className="space-y-6">
            {/* Trip Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-[var(--text-muted)] mb-1">Date</div>
                <div className="font-semibold text-[var(--text-primary)]">
                  {selectedReport.trip_date
                    ? new Date(selectedReport.trip_date).toLocaleDateString("en-PK", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })
                    : "—"}
                </div>
              </div>
              <div>
                <div className="text-xs text-[var(--text-muted)] mb-1">Direction</div>
                <DirectionBadge direction={selectedReport.direction} />
              </div>
              <div>
                <div className="text-xs text-[var(--text-muted)] mb-1">Route</div>
                <div className="font-semibold text-[var(--text-primary)]">
                  {selectedReport.route?.name || "—"}
                </div>
              </div>
              <div>
                <div className="text-xs text-[var(--text-muted)] mb-1">Driver</div>
                <div className="font-semibold text-[var(--text-primary)]">
                  {selectedReport.driver?.full_name || "—"}
                </div>
              </div>
              {selectedReport.vehicle && (
                <div className="col-span-2">
                  <div className="text-xs text-[var(--text-muted)] mb-1">Vehicle</div>
                  <div className="font-semibold text-[var(--text-primary)]">
                    {selectedReport.vehicle.make} {selectedReport.vehicle.model}{" "}
                    <span className="font-mono text-xs text-[var(--text-muted)]">
                      ({selectedReport.vehicle.plate_number})
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Boarding Summary */}
            <div>
              <div className="text-xs font-semibold tracking-wider text-[var(--text-muted)] uppercase mb-3">
                Boarding Summary
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-[var(--surface-subtle)] px-4 py-3 text-center">
                  <div className="text-2xl font-bold text-[var(--text-primary)]">
                    {selectedReport.passengers.total}
                  </div>
                  <div className="text-xs text-[var(--text-muted)] mt-1">Assigned</div>
                </div>
                <div className="rounded-xl bg-emerald-50 px-4 py-3 text-center">
                  <div className="text-2xl font-bold text-emerald-600">
                    {selectedReport.passengers.boarded}
                  </div>
                  <div className="text-xs text-emerald-600/70 mt-1">Boarded</div>
                </div>
                <div className="rounded-xl bg-rose-50 px-4 py-3 text-center">
                  <div className="text-2xl font-bold text-rose-500">
                    {selectedReport.passengers.absent}
                  </div>
                  <div className="text-xs text-rose-500/70 mt-1">Absent</div>
                </div>
              </div>
            </div>

            {/* Passenger Details */}
            {selectedReport.passengers.details.length > 0 && (
              <div>
                <div className="text-xs font-semibold tracking-wider text-[var(--text-muted)] uppercase mb-2">
                  Passenger Details
                </div>
                <div className="max-h-72 overflow-y-auto rounded-xl border border-[var(--border-light)] divide-y divide-[var(--border-light)]">
                  {selectedReport.passengers.details.map((log, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between px-4 py-2.5"
                    >
                      <div>
                        <div className="font-medium text-sm text-[var(--text-primary)]">
                          {log.employee?.full_name || "Unknown"}
                        </div>
                        <div className="text-xs text-[var(--text-muted)]">
                          {log.employee?.department || ""}{" "}
                          {log.employee?.employee_id
                            ? `· ID: ${log.employee.employee_id}`
                            : ""}
                        </div>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          log.status === "BOARDED"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-rose-100 text-rose-600"
                        }`}
                      >
                        {log.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <div className="text-xs font-semibold tracking-wider text-[var(--text-muted)] uppercase mb-2">
                Stop Logs
              </div>
              <div className="rounded-xl border border-[var(--border-light)] overflow-hidden">
                {selectedReport.route?.stops && selectedReport.route.stops.length > 0 ? (
                  <div className="divide-y divide-[var(--border-light)]">
                    {selectedReport.route.stops.map((stop, index) => {
                      const log = selectedReport.stop_logs?.find((item) => item.stop_id === stop.id);
                      const isEvening = selectedReport.direction === "EVENING";
                      const arrivedAt = formatDateTime(log?.arrived_at ?? null);
                      const boardedAt = formatDateTime(log?.boarded_at ?? null);
                      const isFirstEveningStop = isEvening && index === 0;
                      const dropOffAt = isFirstEveningStop
                        ? formatDateTime(selectedReport.started_at)
                        : formatDateTime(log?.drop_off_at ?? null);

                      return (
                        <div
                          key={stop.id}
                          className="grid grid-cols-[auto,1fr,auto] items-start gap-3 px-4 py-3"
                        >
                          <div className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-[var(--surface-subtle)] px-2 text-xs font-semibold text-[var(--text-primary)]">
                            {stop.sequence ?? "—"}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-[var(--text-primary)]">
                              {stop.name}
                            </div>
                            <div className="text-xs text-[var(--text-muted)]">
                              {isEvening ? "Dropoff from shuttle boarding logs" : "Arrival from trip stop logs"}
                            </div>
                          </div>
                          <div className="text-right text-sm font-mono text-[var(--text-primary)]">
                            {isEvening ? (
                              <div>
                                <div className="text-xs text-[var(--text-muted)]">
                                  {isFirstEveningStop ? "Trip started at" : "Dropoff time"}
                                </div>
                                <div>{dropOffAt}</div>
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <div>
                                  <div className="text-xs text-[var(--text-muted)]">Arrived at</div>
                                  <div>{arrivedAt}</div>
                                </div>
                                <div>
                                  <div className="text-xs text-[var(--text-muted)]">Boarded at</div>
                                  <div>{boardedAt}</div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="px-4 py-6 text-sm text-[var(--text-muted)]">
                    No stop logs found for this trip.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
