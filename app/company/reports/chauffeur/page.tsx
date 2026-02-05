"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { formatDateTime } from "@/app/lib/utils";
import { useAppDispatch, useAppSelector } from "../../../lib/store/hooks";
import { selectCompany } from "../../../lib/store/slices/companySlice";
import {
  fetchChauffeurReports,
  selectReports,
  selectReportsStatus,
  selectReportsError,
  selectReportsFilters,
  setFilters
} from "../../../lib/store/slices/companyReportsSlice";
import { ChauffeurReport } from "../../../lib/services/api-client";
import { Card } from "../../components/DashboardComponents";
import Modal from "../../bookings/components/Modal";
import TablePageSkeleton from "../../components/TablePageSkeleton";
import TableSkeleton from "@/app/components/ui/TableSkeleton";

export default function ChauffeurReportsPage() {
  const dispatch = useAppDispatch();
  const company = useAppSelector(selectCompany);
  const reports = useAppSelector(selectReports);
  const status = useAppSelector(selectReportsStatus);
  const errorState = useAppSelector(selectReportsError);
  const savedFilters = useAppSelector(selectReportsFilters);

  const isLoading = status === 'loading';
  const [selectedReport, setSelectedReport] = useState<ChauffeurReport | null>(null);

  // Local state for inputs (for smooth UX), initialized from Redux
  const [startDate, setStartDate] = useState<string>(savedFilters.startDate);
  const [endDate, setEndDate] = useState<string>(savedFilters.endDate);

  // Sync local state with Redux when savedFilters change (e.g., on mount)
  useEffect(() => {
    setStartDate(savedFilters.startDate);
    setEndDate(savedFilters.endDate);
  }, [savedFilters.startDate, savedFilters.endDate]);


  // Debounce and update Redux filters
  useEffect(() => {
    const timer = setTimeout(() => {
      if (startDate !== savedFilters.startDate || endDate !== savedFilters.endDate) {
        dispatch(setFilters({ startDate, endDate }));
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [startDate, endDate, savedFilters.startDate, savedFilters.endDate, dispatch]);

  // Track last fetched params to avoid duplicates
  const [lastFetchedParams, setLastFetchedParams] = useState<string>("");

  // Fetch reports when company or Redux filters change
  useEffect(() => {
    if (!company?.id) return;

    const currentParams = JSON.stringify({ startDate: savedFilters.startDate, endDate: savedFilters.endDate });
    if (currentParams === lastFetchedParams && status !== 'idle') return;

    setLastFetchedParams(currentParams);
    dispatch(fetchChauffeurReports({
      companyId: company.id,
      startDate: savedFilters.startDate || undefined,
      endDate: savedFilters.endDate || undefined,
    }));
  }, [dispatch, company?.id, savedFilters.startDate, savedFilters.endDate, lastFetchedParams, status]);

  if (!company) {
    // If company is loading, shell might cover it, or we can show skeleton.
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-slate-500">No company selected</div>
      </div>
    );
  }

  if (!company.services_enabled?.chauffeur_enabled) {
    return (
      <div className="flex items-center justify-center py-12">
        <Card className="max-w-md text-center flex flex-col items-center justify-center py-12">
          <div className="text-lg font-bold text-slate-800">
            Chauffeur Service Disabled
          </div>
          <div className="mt-2 text-sm text-slate-500">
            Chauffeur service is not enabled for your company. Please contact Cort
            Super Admin.
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-[1600px] mx-auto pb-12">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-slate-400 mb-1">
            <span className="text-xs font-medium uppercase tracking-wide">Financial Reporting</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Chauffeur Reports
          </h1>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex items-center gap-2 bg-white/50 p-1 rounded-xl border border-slate-200 backdrop-blur-sm">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-9 rounded-lg border-0 bg-transparent px-3 text-sm text-slate-600 focus:ring-0"
              placeholder="Start Date"
            />
            <span className="text-slate-300">/</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-9 rounded-lg border-0 bg-transparent px-3 text-sm text-slate-600 focus:ring-0"
              placeholder="End Date"
            />
          </div>
          <button
            type="button"
            className="group relative flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-slate-800 hover:-translate-y-0.5 shadow-lg active:translate-y-0 active:shadow-md"
            onClick={() => {
              alert("Export to CSV coming soon");
            }}
          >
            <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            Export CSV
          </button>
        </div>
      </div>

      <Card className="min-h-[500px] overflow-hidden !p-0">
        <div className="border-b border-slate-100 bg-slate-50/50 p-4">
          <div className="mt-1 text-sm font-medium text-slate-600">
            Comprehensive completed trips report with detailed cost breakdown
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Booking ID</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Passenger</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Vehicle</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Route</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Dur (min)</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Dist (km)</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Svc Chg</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Fuel</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Extras</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Total (PKR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50/50">
              {isLoading && reports.length === 0 ? (
                <TableSkeleton columns={11} rows={8} />
              ) : reports.length === 0 && !isLoading ? (
                <tr>
                  <td colSpan={11} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <span className="bg-slate-50 p-4 rounded-full mb-3">
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
                    className="group transition-colors border-b border-transparent hover:bg-slate-50/80 cursor-pointer"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-slate-600 font-medium font-mono text-xs">
                      {report.completed_at ? formatDateTime(report.completed_at) : "-"}
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-700">
                      #{report.id}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-700 text-sm">
                        {report.passenger?.full_name || "Guest"}
                      </div>
                      <div className="text-xs text-slate-400">
                        {report.passenger?.employee_id || "-"}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-slate-700 font-medium">{report.vehicle?.make} {report.vehicle?.model}</div>
                      <div className="text-xs text-slate-400 font-mono">
                        {report.vehicle?.plate_number}
                      </div>
                    </td>
                    <td className="px-6 py-4 max-w-xs">
                      <div title={report.route.pickup} className="truncate text-slate-700 font-medium text-xs">
                        <span className="text-emerald-500 font-bold mr-1">A</span> {report.route.pickup || "-"}
                      </div>
                      <div title={report.route.dropoff} className="truncate text-slate-500 text-xs mt-0.5">
                        <span className="text-rose-500 font-bold mr-1">B</span> {report.route.dropoff || "-"}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right text-slate-600 font-mono text-xs">
                      {report.total_duration_minutes}
                    </td>
                    <td className="px-6 py-4 text-right text-slate-600 font-mono text-xs">
                      {report.total_distance_km}
                    </td>
                    <td className="px-6 py-4 text-right text-slate-500 text-xs">
                      {Number(report.breakdown.service_charge).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right text-slate-500 text-xs">
                      {Number(report.breakdown.fuel_cost).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right text-slate-500 text-xs">
                      {(
                        Number(report.breakdown.toll) +
                        Number(report.breakdown.parking) +
                        Number(report.breakdown.accommodation) +
                        Number(report.breakdown.outstation_allowance)
                      ).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-slate-800">
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
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Passenger</h4>
                <div className="font-bold text-slate-900">{selectedReport.passenger?.full_name || "Guest"}</div>
                <div className="text-sm text-slate-500 font-mono mt-1">{selectedReport.passenger?.employee_id || "N/A"}</div>

              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Vehicle & Driver</h4>
                <div className="font-bold text-slate-900">{selectedReport.vehicle?.make} {selectedReport.vehicle?.model}</div>
                <div className="text-sm text-slate-500 font-mono mt-1">{selectedReport.vehicle?.plate_number}</div>
                <div className="text-sm text-slate-500 mt-1">Driver: {selectedReport.driver?.full_name || "Assigned Driver"}</div>
              </div>
            </div>

            {/* Route Info */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Route Journey</h4>
              <div className="flex flex-col gap-3 relative">
                <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-slate-200"></div>
                <div className="flex gap-3 items-start relative z-10">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold shrink-0 ring-4 ring-white">A</div>
                  <div>
                    <div className="text-sm font-medium text-slate-900">{selectedReport.route.pickup}</div>
                    <div className="text-xs text-slate-500 mt-0.5">Pickup Location</div>
                  </div>
                </div>
                <div className="flex gap-3 items-start relative z-10">
                  <div className="w-6 h-6 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-xs font-bold shrink-0 ring-4 ring-white">B</div>
                  <div>
                    <div className="text-sm font-medium text-slate-900">{selectedReport.route.dropoff}</div>
                    <div className="text-xs text-slate-500 mt-0.5">Dropoff Location</div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-200/60">
                <div>
                  <span className="text-xs text-slate-500">Duration:</span>
                  <span className="ml-2 text-sm font-bold text-slate-700">{selectedReport.total_duration_minutes} mins</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500">Distance:</span>
                  <span className="ml-2 text-sm font-bold text-slate-700">{selectedReport.total_distance_km} km</span>
                </div>
              </div>
            </div>

            {/* Cost Breakdown */}
            <div>
              <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                Cost Breakdown
              </h4>
              <div className="bg-white border boundary-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-slate-50">
                    <tr className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 text-slate-600">Service Charge (Base)</td>
                      <td className="px-4 py-3 text-right font-medium text-slate-900">PKR {Number(selectedReport.breakdown.service_charge).toLocaleString()}</td>
                    </tr>
                    <tr className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 text-slate-600">Fuel Surcharge</td>
                      <td className="px-4 py-3 text-right font-medium text-slate-900">PKR {Number(selectedReport.breakdown.fuel_cost).toLocaleString()}</td>
                    </tr>
                    {Number(selectedReport.breakdown.toll) > 0 && (
                      <tr className="bg-slate-50/30">
                        <td className="px-4 py-2 text-slate-500 pl-8 text-xs">Toll Charges</td>
                        <td className="px-4 py-2 text-right text-slate-600 text-xs">PKR {Number(selectedReport.breakdown.toll).toLocaleString()}</td>
                      </tr>
                    )}
                    {Number(selectedReport.breakdown.parking) > 0 && (
                      <tr className="bg-slate-50/30">
                        <td className="px-4 py-2 text-slate-500 pl-8 text-xs">Parking Fees</td>
                        <td className="px-4 py-2 text-right text-slate-600 text-xs">PKR {Number(selectedReport.breakdown.parking).toLocaleString()}</td>
                      </tr>
                    )}
                    {Number(selectedReport.breakdown.outstation_allowance) > 0 && (
                      <tr className="bg-slate-50/30">
                        <td className="px-4 py-2 text-slate-500 pl-8 text-xs">Outstation Allowance</td>
                        <td className="px-4 py-2 text-right text-slate-600 text-xs">PKR {Number(selectedReport.breakdown.outstation_allowance).toLocaleString()}</td>
                      </tr>
                    )}
                    {Number(selectedReport.breakdown.accommodation) > 0 && (
                      <tr className="bg-slate-50/30">
                        <td className="px-4 py-2 text-slate-500 pl-8 text-xs">Accommodation</td>
                        <td className="px-4 py-2 text-right text-slate-600 text-xs">PKR {Number(selectedReport.breakdown.accommodation).toLocaleString()}</td>
                      </tr>
                    )}
                    <tr className="bg-slate-50 font-bold border-t border-slate-200">
                      <td className="px-4 py-3 text-slate-900">Total Trip Cost</td>
                      <td className="px-4 py-3 text-right text-indigo-600">PKR {Number(selectedReport.total_cost).toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

