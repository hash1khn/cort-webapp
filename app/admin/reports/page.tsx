"use client";

import { useEffect, useState } from "react";
import { apiClient, ChauffeurReport } from "../../lib/services/api-client";


export default function AdminReportsPage() {
    // Reports State
    const [reports, setReports] = useState<ChauffeurReport[]>([]);
    const [isReportsLoading, setIsReportsLoading] = useState(false);
    const [startDate, setStartDate] = useState<string>("");
    const [endDate, setEndDate] = useState<string>("");

    // Fetch Reports
    useEffect(() => {
        const fetchReports = async () => {
            setIsReportsLoading(true);
            try {
                const response = await apiClient.getAllChauffeurReports({
                    startDate: startDate || undefined,
                    endDate: endDate || undefined,
                });

                if (response.data && Array.isArray(response.data.data)) {
                    setReports(response.data.data);
                } else if (Array.isArray(response.data)) {
                    setReports(response.data as any);
                } else {
                    setReports([]);
                }
            } catch (error) {
                console.error("Failed to fetch reports:", error);
            } finally {
                setIsReportsLoading(false);
            }
        };
        fetchReports();
    }, [startDate, endDate]);

    return (
        <div className="flex flex-col gap-6 p-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <div className="text-sm font-medium text-muted">Admin Portal</div>
                    <h1 className="mt-1 text-2xl font-semibold tracking-tight text-navy">
                        All Company Reports
                    </h1>
                </div>
                <div className="flex flex-wrap items-end gap-3">
                    <div className="flex items-center gap-2">
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="h-10 rounded-md border border-border px-3 text-sm"
                            placeholder="Start Date"
                        />
                        <span className="text-muted">-</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="h-10 rounded-md border border-border px-3 text-sm"
                            placeholder="End Date"
                        />
                    </div>
                    <button
                        type="button"
                        className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-white px-4 text-sm font-semibold text-ink shadow-sm transition-colors hover:bg-zinc-50"
                        onClick={() => {
                            alert("Export to CSV coming soon");
                        }}
                    >
                        Export CSV
                    </button>
                </div>
            </div>

            <div className="rounded-xl border border-border bg-white overflow-hidden shadow-sm">
                <div className="border-b border-border bg-zinc-50/50 p-4">
                    <div className="text-xs font-semibold tracking-wider text-muted">
                        GLOBAL CHAUFFEUR REPORTS
                    </div>
                    <div className="mt-1 text-sm text-muted">
                        Consolidated view of all chauffeur trips across all companies.
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full min-w-max text-left text-sm">
                        <thead className="bg-zinc-50 text-xs font-medium uppercase text-muted">
                            <tr>
                                <th className="px-4 py-3">Date</th>
                                <th className="px-4 py-3">Company</th>
                                <th className="px-4 py-3">Passenger</th>
                                <th className="px-4 py-3">Vehicle</th>
                                <th className="px-4 py-3">Route</th>
                                <th className="px-4 py-3 text-right">Dur (min)</th>
                                <th className="px-4 py-3 text-right">Dist (km)</th>
                                <th className="px-4 py-3 text-right">Total (PKR)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {isReportsLoading ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-8 text-center text-muted">
                                        Loading reports...
                                    </td>
                                </tr>
                            ) : reports.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-8 text-center text-muted">
                                        No reports found for the selected period.
                                    </td>
                                </tr>
                            ) : (
                                reports.map((report) => (
                                    <tr key={report.id} className="hover:bg-zinc-50/50">
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            {report.completed_at
                                                ? new Date(report.completed_at).toLocaleString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                    hour12: false
                                                })
                                                : "-"}
                                        </td>
                                        <td className="px-4 py-3 font-medium text-navy">
                                            {report.company?.name || "Unknown"}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-navy">
                                                {report.passenger?.full_name || "Guest"}
                                            </div>
                                            <div className="text-xs text-muted">
                                                {report.passenger?.email || "-"}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-navy">{report.vehicle?.make} {report.vehicle?.model}</div>
                                            <div className="text-xs text-muted">
                                                {report.vehicle?.plate_number}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 max-w-xs truncate">
                                            <div title={report.route.pickup} className="truncate text-navy">
                                                {report.route.pickup || "-"}
                                            </div>
                                            <div title={report.route.dropoff} className="truncate text-muted text-xs">
                                                To: {report.route.dropoff || "-"}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right text-navy">
                                            {report.total_duration_minutes}
                                        </td>
                                        <td className="px-4 py-3 text-right text-navy">
                                            {report.total_distance_km}
                                        </td>
                                        <td className="px-4 py-3 text-right font-medium text-navy">
                                            {Number(report.total_cost).toLocaleString()}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
