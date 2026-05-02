"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { formatDateTime } from "@/app/lib/utils";
import { useAppSelector } from "../../../lib/store/hooks";
import { selectCompany } from "../../../lib/store/slices/companySlice";
import { ChauffeurReport, apiClient } from "../../../lib/services/api-client";
import { Card } from "../../components/DashboardComponents";
import { PageHeader, TABLE_CARD_CLASS, TABLE_TOP_BAR_CLASS, TABLE_HEADER_CELL_CLASS, TABLE_CELL_CLASS } from "../../components/PageLayout";
import Modal from "../../bookings/components/Modal";
import TablePageSkeleton from "../../components/TablePageSkeleton";
import TableSkeleton from "@/app/components/ui/TableSkeleton";

export default function ChauffeurReportsPage() {
  const company = useAppSelector(selectCompany);

  const [reports, setReports] = useState<ChauffeurReport[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ChauffeurReport | null>(null);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const fetchReports = useCallback(async (start: string, end: string) => {
    if (!company?.id) return;
    setIsLoading(true);
    try {
      const res = await apiClient.getChauffeurReports(company.id, {
        startDate: start || undefined,
        endDate: end || undefined,
      }) as any;
      const raw = res?.data ?? res;
      setReports(raw?.data ?? raw ?? []);
    } catch (e) {
      console.error("Failed to fetch chauffeur reports", e);
    } finally {
      setIsLoading(false);
    }
  }, [company?.id]);

  // Debounce filter changes and re-fetch
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchReports(startDate, endDate);
    }, 400);
    return () => clearTimeout(timer);
  }, [startDate, endDate, fetchReports]);

  if (!company) {
    // If company is loading, shell might cover it, or we can show skeleton.
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-[var(--text-muted)]">No company selected</div>
      </div>
    );
  }

  if (!company.services_enabled?.chauffeur_enabled) {
    return (
      <div className="flex items-center justify-center py-12">
        <Card className="max-w-md text-center flex flex-col items-center justify-center py-12">
          <div className="text-lg font-bold text-[var(--text-primary)]">
            Chauffeur Service Disabled
          </div>
          <div className="mt-2 text-sm text-[var(--text-muted)]">
            Chauffeur service is not enabled for your company. Please contact Cort
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
        title="Chauffeur Reports"
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
              <svg className="w-4 h-4 text-[var(--text-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              Export CSV
            </button>
          </>
        }
      />

      <Card className={`min-h-[500px] ${TABLE_CARD_CLASS}`}>
        <div className={TABLE_TOP_BAR_CLASS}>
          <div className="mt-1 text-sm font-medium text-[var(--text-primary)]">
            Comprehensive completed trips report with detailed cost breakdown
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left">
            <thead>
              <tr className="border-b border-[var(--border-light)]">
                <th className={TABLE_HEADER_CELL_CLASS}>Date</th>
                <th className={TABLE_HEADER_CELL_CLASS}>City</th>
                <th className={TABLE_HEADER_CELL_CLASS}>Booking ID</th>
                <th className={TABLE_HEADER_CELL_CLASS}>Passenger</th>
                <th className={TABLE_HEADER_CELL_CLASS}>Vehicle</th>
                <th className={TABLE_HEADER_CELL_CLASS}>Route</th>
                <th className={`${TABLE_HEADER_CELL_CLASS} text-right`}>Dur (min)</th>
                <th className={`${TABLE_HEADER_CELL_CLASS} text-right`}>Dist (km)</th>
                <th className={`${TABLE_HEADER_CELL_CLASS} text-right`}>Svc Chg</th>
                <th className={`${TABLE_HEADER_CELL_CLASS} text-right`}>Fuel</th>
                <th className={`${TABLE_HEADER_CELL_CLASS} text-right`}>Extras</th>
                <th className={`${TABLE_HEADER_CELL_CLASS} text-right`}>Total (PKR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-light)]/50">
              {isLoading && reports.length === 0 ? (
                <TableSkeleton columns={12} rows={8} />
              ) : reports.length === 0 && !isLoading ? (
                <tr>
                  <td colSpan={12} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-[var(--text-muted)]">
                      <span className="bg-[var(--surface-subtle)] p-4 rounded-full mb-3">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </span>
                      <span>No reports found for the selected period.</span>
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
                      {report.completed_at ? formatDateTime(report.completed_at) : "-"}
                    </td>
                    <td className={`${TABLE_CELL_CLASS} text-[var(--text-primary)] font-medium text-xs`}>
                      {report.city || "—"}
                    </td>
                    <td className={`${TABLE_CELL_CLASS} font-bold text-[var(--text-primary)]`}>
                      #{report.id}
                    </td>
                    <td className={TABLE_CELL_CLASS}>
                      <div className="font-bold text-[var(--text-primary)] text-sm">
                        {report.passenger?.full_name || "Guest"}
                      </div>
                      <div className="text-xs text-[var(--text-muted)]">
                        {report.passenger?.employee_id || "-"}
                      </div>
                    </td>
                    <td className={TABLE_CELL_CLASS}>
                      <div className="text-[var(--text-primary)] font-medium">{report.vehicle?.make} {report.vehicle?.model}</div>
                      <div className="text-xs text-[var(--text-muted)] font-mono">
                        {report.vehicle?.plate_number}
                      </div>
                    </td>
                    <td className={`${TABLE_CELL_CLASS} max-w-xs`}>
                      <div title={report.route.pickup} className="truncate text-[var(--text-primary)] font-medium text-xs">
                        <span className="text-emerald-500 font-bold mr-1">A</span> {report.route.pickup || "-"}
                      </div>
                      <div title={report.route.dropoff} className="truncate text-[var(--text-muted)] text-xs mt-0.5">
                        <span className="text-rose-500 font-bold mr-1">B</span> {report.route.dropoff || "-"}
                      </div>
                    </td>
                    <td className={`${TABLE_CELL_CLASS} text-right text-[var(--text-primary)] font-mono text-xs`}>
                      {report.total_duration_minutes}
                    </td>
                    <td className={`${TABLE_CELL_CLASS} text-right text-[var(--text-primary)] font-mono text-xs`}>
                      {report.total_distance_km}
                    </td>
                    <td className={`${TABLE_CELL_CLASS} text-right text-[var(--text-muted)] text-xs`}>
                      {Number(report.breakdown.service_charge).toLocaleString()}
                    </td>
                    <td className={`${TABLE_CELL_CLASS} text-right text-[var(--text-muted)] text-xs`}>
                      {Number(report.breakdown.fuel_cost).toLocaleString()}
                    </td>
                    <td className={`${TABLE_CELL_CLASS} text-right text-[var(--text-muted)] text-xs`}>
                      {(
                        Number(report.breakdown.toll) +
                        Number(report.breakdown.parking) +
                        Number(report.breakdown.accommodation) +
                        Number(report.breakdown.outstation_allowance)
                      ).toLocaleString()}
                    </td>
                    <td className={`${TABLE_CELL_CLASS} text-right font-bold text-[var(--text-primary)]`}>
                      {Number(report.total_cost).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        isOpen={!!selectedReport}
        onClose={() => setSelectedReport(null)}
        title={selectedReport ? `Trip Details #${selectedReport.id}` : "Trip Details"}
      >
        {selectedReport && (
          <div className="space-y-6">
            {/* Passenger & Vehicle Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[var(--surface-subtle)] p-4 rounded-xl border border-[var(--border-light)]">
                <h4 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Passenger</h4>
                <div className="font-bold text-[var(--text-primary)]">{selectedReport.passenger?.full_name || "Guest"}</div>
                <div className="text-sm text-[var(--text-muted)] font-mono mt-1">{selectedReport.passenger?.employee_id || "N/A"}</div>

              </div>
              <div className="bg-[var(--surface-subtle)] p-4 rounded-xl border border-[var(--border-light)]">
                <h4 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Vehicle & Driver</h4>
                <div className="font-bold text-[var(--text-primary)]">{selectedReport.vehicle?.make} {selectedReport.vehicle?.model}</div>
                <div className="text-sm text-[var(--text-muted)] font-mono mt-1">{selectedReport.vehicle?.plate_number}</div>
                <div className="text-sm text-[var(--text-muted)] mt-1">Driver: {selectedReport.driver?.full_name || "Assigned Driver"}</div>
              </div>
            </div>

            {/* Route Info */}
            <div className="bg-[var(--surface-subtle)] p-4 rounded-xl border border-[var(--border-light)]">
              <h4 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3">Route Journey</h4>
              <div className="flex flex-col gap-3 relative">
                <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-[var(--border-light)]"></div>
                <div className="flex gap-3 items-start relative z-10">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold shrink-0 ring-4 ring-white">A</div>
                  <div>
                    <div className="text-sm font-medium text-[var(--text-primary)]">{selectedReport.route.pickup}</div>
                    <div className="text-xs text-[var(--text-muted)] mt-0.5">Pickup Location</div>
                  </div>
                </div>
                <div className="flex gap-3 items-start relative z-10">
                  <div className="w-6 h-6 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-xs font-bold shrink-0 ring-4 ring-white">B</div>
                  <div>
                    <div className="text-sm font-medium text-[var(--text-primary)]">{selectedReport.route.dropoff}</div>
                    <div className="text-xs text-[var(--text-muted)] mt-0.5">Dropoff Location</div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-[var(--border-light)]">
                <div>
                  <span className="text-xs text-[var(--text-muted)]">Duration:</span>
                  <span className="ml-2 text-sm font-bold text-[var(--text-primary)]">{selectedReport.total_duration_minutes} mins</span>
                </div>
                <div>
                  <span className="text-xs text-[var(--text-muted)]">Distance:</span>
                  <span className="ml-2 text-sm font-bold text-[var(--text-primary)]">{selectedReport.total_distance_km} km</span>
                </div>
              </div>
            </div>

            {/* Trip Breakdown (Daily Logs) */}
            {selectedReport.daily_logs && selectedReport.daily_logs.length > 0 && (
              <div>
                <h4 className="text-sm font-bold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--cort-orange)]"></span>
                  Trip Breakdown
                </h4>
                <div className="bg-white border border-[var(--border-light)] rounded-lg overflow-hidden shadow-sm">
                  <table className="min-w-full text-left text-xs">
                    <thead className="bg-[var(--surface-subtle)] font-bold text-[var(--text-muted)] uppercase tracking-tight">
                      <tr>
                        <th className="px-4 py-2.5 border-b border-[var(--border-light)]">Date</th>
                        <th className="px-4 py-2.5 border-b border-[var(--border-light)]">Type</th>
                        <th className="px-4 py-2.5 border-b border-[var(--border-light)] text-right">Hours</th>
                        <th className="px-4 py-2.5 border-b border-[var(--border-light)] text-right">Full Day</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-light)]">
                      {[...selectedReport.daily_logs].sort((a, b) => new Date(a.log_date).getTime() - new Date(b.log_date).getTime()).map((log, idx) => (
                        <tr key={idx} className="hover:bg-[var(--surface-subtle)]/50 transition-colors">
                          <td className="px-4 py-2.5 font-medium text-[var(--text-primary)]">
                            {new Date(log.log_date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              weekday: 'short'
                            })}
                          </td>
                          <td className="px-4 py-2.5">
                            {log.trip_type === 'OUT_STATION' ? (
                              <span className="text-orange-600 font-bold bg-orange-50 px-2 py-0.5 rounded text-[10px]">OUTSTATION</span>
                            ) : (
                              <span className="text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded text-[10px]">IN CITY</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-[var(--text-primary)]">
                            {log.hours_used ? parseFloat(log.hours_used.toString()).toFixed(1) : (log.is_full_day ? "24.0" : "0.0")}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            {log.is_full_day ? (
                              <span className="text-emerald-600 text-[10px] font-bold bg-emerald-50 px-2 py-0.5 rounded uppercase">Yes</span>
                            ) : (
                              <span className="text-[var(--text-muted)] text-[10px] font-bold bg-[var(--surface-subtle)] px-2 py-0.5 rounded uppercase">No</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Cost Breakdown */}
            <div>
              <h4 className="text-sm font-bold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--cort-orange)]"></span>
                Cost Breakdown
              </h4>
              <div className="bg-white border border-[var(--border-light)] rounded-lg overflow-hidden shadow-sm">
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-[var(--border-light)]">
                    <tr className="hover:bg-[var(--surface-subtle)]/50">
                      <td className="px-4 py-3 text-[var(--text-primary)]">Service Charge (Base)</td>
                      <td className="px-4 py-3 text-right font-medium text-[var(--text-primary)]">PKR {Number(selectedReport.breakdown.service_charge).toLocaleString()}</td>
                    </tr>
                    <tr className="hover:bg-[var(--surface-subtle)]/50">
                      <td className="px-4 py-3 text-[var(--text-primary)]">Fuel Surcharge</td>
                      <td className="px-4 py-3 text-right font-medium text-[var(--text-primary)]">PKR {Number(selectedReport.breakdown.fuel_cost).toLocaleString()}</td>
                    </tr>
                    {Number(selectedReport.breakdown.toll) > 0 && (
                      <tr className="bg-[var(--surface-subtle)]/30">
                        <td className="px-4 py-2 text-[var(--text-muted)] pl-8 text-xs">Toll Charges</td>
                        <td className="px-4 py-2 text-right text-[var(--text-primary)] text-xs">PKR {Number(selectedReport.breakdown.toll).toLocaleString()}</td>
                      </tr>
                    )}
                    {Number(selectedReport.breakdown.parking) > 0 && (
                      <tr className="bg-[var(--surface-subtle)]/30">
                        <td className="px-4 py-2 text-[var(--text-muted)] pl-8 text-xs">Parking Fees</td>
                        <td className="px-4 py-2 text-right text-[var(--text-primary)] text-xs">PKR {Number(selectedReport.breakdown.parking).toLocaleString()}</td>
                      </tr>
                    )}
                    {Number(selectedReport.breakdown.outstation_allowance) > 0 && (
                      <tr className="bg-[var(--surface-subtle)]/30">
                        <td className="px-4 py-2 text-[var(--text-muted)] pl-8 text-xs">Outstation Allowance</td>
                        <td className="px-4 py-2 text-right text-[var(--text-primary)] text-xs">PKR {Number(selectedReport.breakdown.outstation_allowance).toLocaleString()}</td>
                      </tr>
                    )}
                    {Number(selectedReport.breakdown.accommodation) > 0 && (
                      <tr className="bg-[var(--surface-subtle)]/30">
                        <td className="px-4 py-2 text-[var(--text-muted)] pl-8 text-xs">Accommodation</td>
                        <td className="px-4 py-2 text-right text-[var(--text-primary)] text-xs">PKR {Number(selectedReport.breakdown.accommodation).toLocaleString()}</td>
                      </tr>
                    )}
                    <tr className="bg-[var(--surface-subtle)] font-bold border-t border-[var(--border-light)]">
                      <td className="px-4 py-3 text-[var(--text-primary)]">Total Trip Cost</td>
                      <td className="px-4 py-3 text-right text-[var(--cort-orange)]">PKR {Number(selectedReport.total_cost).toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Receipts Section */}
            {(selectedReport.breakdown.expense_toll_image_url || selectedReport.breakdown.expense_parking_image_url) && (
              <div>
                <h4 className="text-sm font-bold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--cort-orange)]"></span>
                  Expense Receipts
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  {selectedReport.breakdown.expense_toll_image_url && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Toll Receipt</p>
                      <a
                        href={selectedReport.breakdown.expense_toll_image_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block aspect-[4/3] rounded-lg overflow-hidden border border-[var(--border-light)] hover:border-[var(--cort-orange)] transition-colors group relative"
                      >
                        <img
                          src={selectedReport.breakdown.expense_toll_image_url}
                          alt="Toll Receipt"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                          <svg className="w-6 h-6 text-[var(--text-primary)] opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </div>
                      </a>
                    </div>
                  )}
                  {selectedReport.breakdown.expense_parking_image_url && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Parking Receipt</p>
                      <a
                        href={selectedReport.breakdown.expense_parking_image_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block aspect-[4/3] rounded-lg overflow-hidden border border-[var(--border-light)] hover:border-[var(--cort-orange)] transition-colors group relative"
                      >
                        <img
                          src={selectedReport.breakdown.expense_parking_image_url}
                          alt="Parking Receipt"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                          <svg className="w-6 h-6 text-[var(--text-primary)] opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </div>
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

