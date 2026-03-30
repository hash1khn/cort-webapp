"use client";

import { useEffect, useState, useCallback } from "react";
import { apiClient, ChauffeurReport } from "../../lib/services/api-client";
import Pagination from "../../components/ui/Pagination";
import { PermissionGate } from "../components/PermissionGate";
import { AdminCan } from "../../lib/abilities/AdminAbilityProvider";

interface Pagination {
    page: number;
    totalPages: number;
    total: number;
}

export default function AdminReportsPage() {
    return (
        <PermissionGate permission="reports">
            <AdminCan I="read" a="Reports">
                <AdminReportsContent />
            </AdminCan>
        </PermissionGate>
    );
}

function AdminReportsContent() {
    const [reports, setReports] = useState<ChauffeurReport[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pagination, setPagination] = useState<Pagination>({ page: 1, totalPages: 1, total: 0 });

    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [currentPage, setCurrentPage] = useState(1);

    const fetchReports = useCallback(async (page: number, start: string, end: string) => {
        setLoading(true);
        setError(null);
        try {
            const res = await apiClient.getAllChauffeurReports({
                page,
                limit: 10,
                startDate: start || undefined,
                endDate: end || undefined,
            });
            const raw = res as any;
            const data: ChauffeurReport[] = raw?.data?.data ?? raw?.data ?? [];
            const meta = raw?.data?.pagination ?? raw?.pagination ?? {};
            setReports(data);
            setPagination({
                page: meta.page ?? page,
                totalPages: meta.pages ?? meta.totalPages ?? 1,
                total: meta.total ?? data.length,
            });
        } catch (e: any) {
            setError(e.message || "Failed to load reports");
        } finally {
            setLoading(false);
        }
    }, []);

    // Debounce date filter changes
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
    }, [currentPage]); // eslint-disable-line react-hooks/exhaustive-deps

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
                        />
                        <span className="text-muted">-</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="h-10 rounded-md border border-border px-3 text-sm"
                        />
                        <button
                            onClick={() => fetchReports(currentPage, startDate, endDate)}
                            className="h-10 px-3 rounded-md border border-border bg-white text-sm hover:bg-zinc-50"
                            title="Refresh"
                        >
                            ↻
                        </button>
                    </div>
                    <button
                        type="button"
                        className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-white px-4 text-sm font-semibold text-ink shadow-sm hover:bg-zinc-50"
                        onClick={() => alert("Export to CSV coming soon")}
                    >
                        Export CSV
                    </button>
                </div>
            </div>

            <div className="rounded-xl border border-border bg-white overflow-hidden shadow-sm">
                <div className="border-b border-border bg-zinc-50/50 p-4">
                    <div className="text-xs font-semibold tracking-wider text-muted">GLOBAL CHAUFFEUR REPORTS</div>
                    <div className="mt-1 text-sm text-muted">
                        Consolidated view of all chauffeur trips across all companies.
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full min-w-max text-left text-sm">
                        <thead className="bg-zinc-50 text-xs font-medium uppercase text-muted">
                            <tr>
                                <th className="px-4 py-3">Date</th>
                                <th className="px-4 py-3">City</th>
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
                            {loading ? (
                                <tr>
                                    <td colSpan={9} className="px-4 py-8 text-center text-muted">Loading reports...</td>
                                </tr>
                            ) : error ? (
                                <tr>
                                    <td colSpan={9} className="px-4 py-8 text-center text-red-500">{error}</td>
                                </tr>
                            ) : reports.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="px-4 py-8 text-center text-muted">No reports found for the selected period.</td>
                                </tr>
                            ) : (
                                reports.map((report) => (
                                    <tr key={report.id} className="hover:bg-zinc-50/50">
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            {report.completed_at
                                                ? new Date(report.completed_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
                                                : "-"}
                                        </td>
                                        <td className="px-4 py-3 text-navy">{report.city || "—"}</td>
                                        <td className="px-4 py-3 font-medium text-navy">{report.company?.name || "Unknown"}</td>
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-navy">{report.passenger?.full_name || "Guest"}</div>
                                            <div className="text-xs text-muted">{report.passenger?.email || "-"}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-navy">{report.vehicle?.make} {report.vehicle?.model}</div>
                                            <div className="text-xs text-muted">{report.vehicle?.plate_number}</div>
                                        </td>
                                        <td className="px-4 py-3 max-w-xs truncate">
                                            <div title={report.route.pickup} className="truncate text-navy">{report.route.pickup || "-"}</div>
                                            <div title={report.route.dropoff} className="truncate text-muted text-xs">To: {report.route.dropoff || "-"}</div>
                                        </td>
                                        <td className="px-4 py-3 text-right text-navy">{report.total_duration_minutes}</td>
                                        <td className="px-4 py-3 text-right text-navy">{report.total_distance_km}</td>
                                        <td className="px-4 py-3 text-right font-medium text-navy">{Number(report.total_cost).toLocaleString()}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="border-t border-border">
                    <Pagination
                        currentPage={pagination.page}
                        totalPages={pagination.totalPages}
                        onPageChange={setCurrentPage}
                    />
                </div>
            </div>
        </div>
    );
}
