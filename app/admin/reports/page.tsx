"use client";

import React, { useEffect, useState, useCallback } from "react";
import { apiClient, ChauffeurReport, ShuttleReport } from "../../lib/services/api-client";
import Pagination from "../../components/ui/Pagination";
import { PermissionGate } from "../components/PermissionGate";
import { AdminCan } from "../../lib/abilities/AdminAbilityProvider";

interface PaginationState {
    page: number;
    totalPages: number;
    total: number;
}

type Tab = "chauffeur" | "shuttle";

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
    const [activeTab, setActiveTab] = useState<Tab>("chauffeur");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    return (
        <div className="flex flex-col gap-6 p-6">
            {/* Header */}
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
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b border-border">
                {(["chauffeur", "shuttle"] as Tab[]).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                            activeTab === tab
                                ? "border-emerald-500 text-emerald-600"
                                : "border-transparent text-muted hover:text-navy"
                        }`}
                    >
                        {tab === "chauffeur" ? "Chauffeur Reports" : "Shuttle Logs"}
                    </button>
                ))}
            </div>

            {activeTab === "chauffeur" ? (
                <ChauffeurReportsTab startDate={startDate} endDate={endDate} />
            ) : (
                <ShuttleLogsTab startDate={startDate} endDate={endDate} />
            )}
        </div>
    );
}

// ── Chauffeur Reports Tab ──────────────────────────────────────────────────────

function ChauffeurReportsTab({ startDate, endDate }: { startDate: string; endDate: string }) {
    const [reports, setReports] = useState<ChauffeurReport[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pagination, setPagination] = useState<PaginationState>({ page: 1, totalPages: 1, total: 0 });
    const [currentPage, setCurrentPage] = useState(1);

    const fetchReports = useCallback(async (page: number, start: string, end: string) => {
        setLoading(true);
        setError(null);
        try {
            const res = await apiClient.getAllChauffeurReports({
                page,
                limit: 15,
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

    useEffect(() => {
        const timer = setTimeout(() => { setCurrentPage(1); fetchReports(1, startDate, endDate); }, 400);
        return () => clearTimeout(timer);
    }, [startDate, endDate, fetchReports]);

    useEffect(() => { fetchReports(currentPage, startDate, endDate); }, [currentPage]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div className="rounded-xl border border-border bg-white overflow-hidden shadow-sm">
            <div className="border-b border-border bg-zinc-50/50 p-4">
                <div className="text-xs font-semibold tracking-wider text-muted">GLOBAL CHAUFFEUR REPORTS</div>
                <div className="mt-1 text-sm text-muted">Consolidated view of all chauffeur trips across all companies.</div>
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
                            <tr><td colSpan={9} className="px-4 py-8 text-center text-muted">Loading reports...</td></tr>
                        ) : error ? (
                            <tr><td colSpan={9} className="px-4 py-8 text-center text-red-500">{error}</td></tr>
                        ) : reports.length === 0 ? (
                            <tr><td colSpan={9} className="px-4 py-8 text-center text-muted">No reports found for the selected period.</td></tr>
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
                <Pagination currentPage={pagination.page} totalPages={pagination.totalPages} onPageChange={setCurrentPage} />
            </div>
        </div>
    );
}

// ── Shuttle Logs Tab ───────────────────────────────────────────────────────────

function DirectionBadge({ direction }: { direction: string }) {
    const isEvening = direction === "EVENING";
    return (
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${isEvening ? "bg-indigo-100 text-indigo-700" : "bg-amber-100 text-amber-700"}`}>
            {isEvening ? "🌙" : "☀️"} {direction}
        </span>
    );
}

function StatusBadge({ status }: { status: string }) {
    const colors: Record<string, string> = {
        COMPLETED: "bg-emerald-100 text-emerald-700",
        STARTED: "bg-blue-100 text-blue-700",
        SCHEDULED: "bg-zinc-100 text-zinc-600",
        CANCELLED: "bg-red-100 text-red-600",
    };
    return (
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${colors[status] ?? "bg-zinc-100 text-zinc-600"}`}>
            {status}
        </span>
    );
}

function ShuttleLogsTab({ startDate, endDate }: { startDate: string; endDate: string }) {
    const [logs, setLogs] = useState<ShuttleReport[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pagination, setPagination] = useState<PaginationState>({ page: 1, totalPages: 1, total: 0 });
    const [currentPage, setCurrentPage] = useState(1);
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [statusFilter, setStatusFilter] = useState("");
    const [directionFilter, setDirectionFilter] = useState("");

    const fetchLogs = useCallback(async (page: number, start: string, end: string) => {
        setLoading(true);
        setError(null);
        try {
            const res = await apiClient.getAllShuttleReports({
                page,
                limit: 15,
                startDate: start || undefined,
                endDate: end || undefined,
            }) as any;
            const raw = res?.data ?? res;
            const data: ShuttleReport[] = raw?.data ?? raw ?? [];
            const meta = raw?.pagination ?? {};
            setLogs(data);
            setPagination({
                page: meta.page ?? page,
                totalPages: meta.pages ?? meta.totalPages ?? 1,
                total: meta.total ?? data.length,
            });
        } catch (e: any) {
            setError(e.message || "Failed to load shuttle logs");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => { setCurrentPage(1); fetchLogs(1, startDate, endDate); }, 400);
        return () => clearTimeout(timer);
    }, [startDate, endDate, fetchLogs]);

    useEffect(() => { fetchLogs(currentPage, startDate, endDate); }, [currentPage]); // eslint-disable-line react-hooks/exhaustive-deps

    const filtered = logs.filter((l) => {
        if (statusFilter && l.status !== statusFilter) return false;
        if (directionFilter && l.direction !== directionFilter) return false;
        return true;
    });

    return (
        <div className="rounded-xl border border-border bg-white overflow-hidden shadow-sm">
            <div className="border-b border-border bg-zinc-50/50 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <div className="text-xs font-semibold tracking-wider text-muted">GLOBAL SHUTTLE LOGS</div>
                    <div className="mt-0.5 text-sm text-muted">All shuttle trips across all companies — boarding, route, driver and stop details.</div>
                </div>
                <div className="flex items-center gap-2">
                    <select
                        value={directionFilter}
                        onChange={(e) => setDirectionFilter(e.target.value)}
                        className="h-8 rounded-md border border-border px-2 text-xs bg-white"
                    >
                        <option value="">All directions</option>
                        <option value="MORNING">Morning</option>
                        <option value="EVENING">Evening</option>
                    </select>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="h-8 rounded-md border border-border px-2 text-xs bg-white"
                    >
                        <option value="">All statuses</option>
                        <option value="COMPLETED">Completed</option>
                        <option value="STARTED">Started</option>
                        <option value="SCHEDULED">Scheduled</option>
                        <option value="CANCELLED">Cancelled</option>
                    </select>
                    <span className="text-xs text-muted">{pagination.total.toLocaleString()} total</span>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full min-w-max text-left text-sm">
                    <thead className="bg-zinc-50 text-xs font-medium uppercase text-muted">
                        <tr>
                            <th className="px-4 py-3">Trip Date</th>
                            <th className="px-4 py-3">Direction</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3">Company</th>
                            <th className="px-4 py-3">Route</th>
                            <th className="px-4 py-3">Driver</th>
                            <th className="px-4 py-3">Vehicle</th>
                            <th className="px-4 py-3 text-right">Boarded</th>
                            <th className="px-4 py-3 text-right">Absent</th>
                            <th className="px-4 py-3 text-right">Assigned</th>
                            <th className="px-4 py-3">Started At</th>
                            <th className="px-4 py-3">Completed At</th>
                            <th className="px-4 py-3"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {loading ? (
                            <tr><td colSpan={13} className="px-4 py-8 text-center text-muted">Loading shuttle logs...</td></tr>
                        ) : error ? (
                            <tr><td colSpan={13} className="px-4 py-8 text-center text-red-500">{error}</td></tr>
                        ) : filtered.length === 0 ? (
                            <tr><td colSpan={13} className="px-4 py-8 text-center text-muted">No shuttle logs found for the selected filters.</td></tr>
                        ) : (
                            filtered.map((log) => (
                                <React.Fragment key={log.id}>
                                    <tr
                                        className={`hover:bg-zinc-50/50 ${expandedId === log.id ? "bg-zinc-50" : ""}`}
                                    >
                                        <td className="px-4 py-3 whitespace-nowrap font-medium text-navy">
                                            {log.trip_date
                                                ? new Date(log.trip_date).toLocaleDateString('en-PK', { timeZone: 'Asia/Karachi', day: 'numeric', month: 'short', year: 'numeric' })
                                                : "—"}
                                        </td>
                                        <td className="px-4 py-3"><DirectionBadge direction={log.direction} /></td>
                                        <td className="px-4 py-3"><StatusBadge status={log.status} /></td>
                                        <td className="px-4 py-3 font-medium text-navy">{log.company?.name || "—"}</td>
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-navy">{log.route?.name || "—"}</div>
                                            {log.route?.stops && log.route.stops.length > 0 && (
                                                <div className="text-xs text-muted">{log.route.stops.length} stops</div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-navy">{log.driver?.full_name || "—"}</td>
                                        <td className="px-4 py-3">
                                            {log.vehicle ? (
                                                <>
                                                    <div className="text-navy">{log.vehicle.make} {log.vehicle.model}</div>
                                                    <div className="text-xs text-muted">{log.vehicle.plate_number}</div>
                                                </>
                                            ) : "—"}
                                        </td>
                                        <td className="px-4 py-3 text-right font-medium text-emerald-600">{log.passengers.boarded}</td>
                                        <td className="px-4 py-3 text-right text-red-500">{log.passengers.absent}</td>
                                        <td className="px-4 py-3 text-right text-muted">{log.passengers.total}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-muted text-xs">
                                            {log.started_at
                                                ? new Date(log.started_at).toLocaleString('en-PK', { timeZone: 'Asia/Karachi', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })
                                                : "—"}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-muted text-xs">
                                            {log.completed_at
                                                ? new Date(log.completed_at).toLocaleString('en-PK', { timeZone: 'Asia/Karachi', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })
                                                : "—"}
                                        </td>
                                        <td className="px-4 py-3">
                                            {(log.passengers.details?.length > 0 || (log.stop_logs && log.stop_logs.length > 0)) && (
                                                <button
                                                    onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                                                    className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                                                >
                                                    {expandedId === log.id ? "Hide" : "Details"}
                                                </button>
                                            )}
                                        </td>
                                    </tr>

                                    {/* Expanded detail row */}
                                    {expandedId === log.id && (
                                        <tr key={`${log.id}-detail`} className="bg-zinc-50">
                                            <td colSpan={13} className="px-6 py-4">
                                                <div className="flex flex-wrap gap-8">
                                                    {/* Passenger manifest */}
                                                    {log.passengers.details?.length > 0 && (
                                                        <div className="flex-1 min-w-[280px]">
                                                            <div className="text-xs font-semibold text-muted uppercase mb-2">Passenger Manifest</div>
                                                            <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
                                                                {log.passengers.details.map((p, idx) => {
                                                                    // scanned_at is set on ABSENT logs too (it doubles as "marked at"), so
                                                                    // only treat it as a boarding time for passengers who actually boarded.
                                                                    const boardedAt = (p.status === "BOARDED" || p.status === "DROPPED_OFF") && p.scanned_at
                                                                        ? new Date(p.scanned_at).toLocaleTimeString('en-PK', { timeZone: 'Asia/Karachi', hour: '2-digit', minute: '2-digit', hour12: true })
                                                                        : null;
                                                                    const dropOffAt = p.drop_off_at
                                                                        ? new Date(p.drop_off_at).toLocaleTimeString('en-PK', { timeZone: 'Asia/Karachi', hour: '2-digit', minute: '2-digit', hour12: true })
                                                                        : null;
                                                                    return (
                                                                    <div key={idx} className="flex items-center justify-between gap-3 px-3 py-2 bg-white text-xs">
                                                                        <div className="min-w-0">
                                                                            <div className="font-medium text-navy">{p.employee?.full_name || "Unknown"}</div>
                                                                            <div className="text-muted">{p.employee?.department || p.employee?.email || "-"}</div>
                                                                            {boardedAt && (
                                                                                <div className="mt-0.5 font-mono text-emerald-600/80">Boarded {boardedAt}</div>
                                                                            )}
                                                                            {dropOffAt && (
                                                                                <div className="mt-0.5 font-mono text-sky-600">Dropoff {dropOffAt}</div>
                                                                            )}
                                                                        </div>
                                                                        <span className={`shrink-0 rounded-full px-2 py-0.5 font-semibold ${
                                                                            p.status === "BOARDED" ? "bg-emerald-100 text-emerald-700"
                                                                            : p.status === "DROPPED_OFF" ? "bg-sky-100 text-sky-700"
                                                                            : p.status === "ABSENT" ? "bg-red-100 text-red-600"
                                                                            : "bg-zinc-100 text-zinc-600"
                                                                        }`}>
                                                                            {p.status}
                                                                        </span>
                                                                    </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Stop logs */}
                                                    {log.stop_logs && log.stop_logs.length > 0 && (
                                                        <div className="flex-1 min-w-[280px]">
                                                            <div className="text-xs font-semibold text-muted uppercase mb-2">Stop Timeline</div>
                                                            <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
                                                                {/* Started At */}
                                                                <div className="flex items-center justify-between gap-4 px-3 py-2 bg-emerald-50 text-xs">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                                                                        <div>
                                                                            <div className="font-semibold text-emerald-700">Trip Started</div>
                                                                            <div className="text-emerald-600/70">
                                                                                {log.started_at
                                                                                    ? new Date(log.started_at).toLocaleDateString('en-PK', { timeZone: 'Asia/Karachi', month: 'short', day: 'numeric' })
                                                                                    : '—'}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    <div className="font-mono font-semibold text-emerald-700">
                                                                        {log.started_at
                                                                            ? new Date(log.started_at).toLocaleTimeString('en-PK', { timeZone: 'Asia/Karachi', hour: '2-digit', minute: '2-digit', hour12: true })
                                                                            : '—'}
                                                                    </div>
                                                                </div>

                                                                {log.stop_logs
                                                                    .slice()
                                                                    .sort((a, b) => {
                                                                        const aSeq = log.direction === 'EVENING'
                                                                            ? (a.evening_sequence ?? a.morning_sequence ?? 0)
                                                                            : (a.morning_sequence ?? a.evening_sequence ?? 0);
                                                                        const bSeq = log.direction === 'EVENING'
                                                                            ? (b.evening_sequence ?? b.morning_sequence ?? 0)
                                                                            : (b.morning_sequence ?? b.evening_sequence ?? 0);
                                                                        return aSeq - bSeq;
                                                                    })
                                                                    .map((s, idx) => {
                                                                        const isEvening = log.direction === 'EVENING';
                                                                        const arrivedAt = s.arrived_at
                                                                            ? new Date(s.arrived_at).toLocaleTimeString('en-PK', { timeZone: 'Asia/Karachi', hour: '2-digit', minute: '2-digit', hour12: true })
                                                                            : null;
                                                                        const boardedAt = s.boarded_at
                                                                            ? new Date(s.boarded_at).toLocaleTimeString('en-PK', { timeZone: 'Asia/Karachi', hour: '2-digit', minute: '2-digit', hour12: true })
                                                                            : null;
                                                                        const dropOffAt = s.drop_off_at
                                                                            ? new Date(s.drop_off_at).toLocaleTimeString('en-PK', { timeZone: 'Asia/Karachi', hour: '2-digit', minute: '2-digit', hour12: true })
                                                                            : null;
                                                                        return (
                                                                        <div key={idx} className="flex items-start justify-between gap-4 px-3 py-2 bg-white text-xs">
                                                                            <div>
                                                                                <div className="font-medium text-navy">{s.stop_name || `Stop ${s.stop_id}`}</div>
                                                                                <div className="text-muted">
                                                                                    {isEvening ? 'Evening dropoff stop' : 'Morning pickup stop'}
                                                                                </div>
                                                                            </div>
                                                                            <div className="text-right space-y-1 font-mono text-navy">
                                                                                {isEvening ? (
                                                                                    <div>
                                                                                        <div className="text-[10px] text-muted font-sans">Dropoff time</div>
                                                                                        <div>{dropOffAt || '—'}</div>
                                                                                    </div>
                                                                                ) : (
                                                                                    <>
                                                                                        <div>
                                                                                            <div className="text-[10px] text-muted font-sans">Arrived</div>
                                                                                            <div>{arrivedAt || '—'}</div>
                                                                                        </div>
                                                                                        <div>
                                                                                            <div className="text-[10px] text-muted font-sans">Boarded</div>
                                                                                            <div>{boardedAt || '—'}</div>
                                                                                        </div>
                                                                                    </>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                        );
                                                                    })}

                                                                {/* Completed At */}
                                                                <div className="flex items-center justify-between gap-4 px-3 py-2 bg-zinc-50 text-xs">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="h-2 w-2 rounded-full bg-zinc-400 shrink-0" />
                                                                        <div>
                                                                            <div className="font-semibold text-zinc-600">Trip Completed</div>
                                                                            <div className="text-zinc-400">
                                                                                {log.completed_at
                                                                                    ? new Date(log.completed_at).toLocaleDateString('en-PK', { timeZone: 'Asia/Karachi', month: 'short', day: 'numeric' })
                                                                                    : '—'}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    <div className="font-mono font-semibold text-zinc-600">
                                                                        {log.completed_at
                                                                            ? new Date(log.completed_at).toLocaleTimeString('en-PK', { timeZone: 'Asia/Karachi', hour: '2-digit', minute: '2-digit', hour12: true })
                                                                            : '—'}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div className="border-t border-border">
                <Pagination currentPage={pagination.page} totalPages={pagination.totalPages} onPageChange={setCurrentPage} />
            </div>
        </div>
    );
}
