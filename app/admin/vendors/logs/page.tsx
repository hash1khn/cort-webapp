"use client";

import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch } from "../../../lib/store/store";
import {
    fetchVendorLogs,
    fetchVendorStats,
    setFilters,
    clearFilters,
    selectVendorLogs,
    selectVendorStats,
    selectVendorLogsStatus,
    selectVendorLogsFilters,
    selectVendorLogsPagination
} from "../../../lib/store/slices/vendorLogsSlice";
import { fetchAdminVendors, selectAdminVendors } from "../../../lib/store/slices/adminVendorsSlice";
import Pagination from "../../../components/ui/Pagination";

export default function VendorLogsPage() {
    const dispatch = useDispatch<AppDispatch>();

    // Selectors
    const logs = useSelector(selectVendorLogs);
    const stats = useSelector(selectVendorStats);
    const status = useSelector(selectVendorLogsStatus);
    const filters = useSelector(selectVendorLogsFilters);
    const pagination = useSelector(selectVendorLogsPagination);
    const vendors = useSelector(selectAdminVendors);

    // Initial Load
    useEffect(() => {
        dispatch(fetchAdminVendors({ limit: 100 }));
    }, [dispatch]);

    // Fetch Data on Filter Change
    useEffect(() => {
        dispatch(fetchVendorStats(filters.vendor_id));
        dispatch(fetchVendorLogs(filters));
    }, [dispatch, filters]);

    const handleFilterChange = (key: string, value: any) => {
        dispatch(setFilters({ [key]: value }));
    };

    const handlePageChange = (newPage: number) => {
        dispatch(setFilters({ page: newPage }));
    };

    const handleClearFilters = () => {
        dispatch(clearFilters());
    };

    const loading = status === 'loading';

    return (
        <div className="flex flex-col gap-6">
            <div>
                <div className="text-sm font-medium text-muted">Admin / Vendors</div>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight text-navy">Vendor Trip Logs</h1>
                <p className="text-sm text-muted mt-1">Track partner vehicle trips and vendor payments.</p>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted">Total Rides</div>
                    <div className="mt-2 text-2xl font-bold text-navy">{stats?.total_rides || 0}</div>
                </div>
                <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted">Total Cost</div>
                    <div className="mt-2 text-2xl font-bold text-navy">
                        Rs. {stats ? Number(stats.total_cost).toLocaleString() : 0}
                    </div>
                </div>
                <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted">Outstanding Amount</div>
                    <div className="mt-2 text-2xl font-bold text-orange">
                        Rs. {stats ? Number(stats.total_outstanding).toLocaleString() : 0}
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-3 rounded-xl border border-border bg-white p-4 md:flex-row md:items-end">
                <div className="flex-1 space-y-1">
                    <label className="text-xs font-semibold text-muted">Vendor</label>
                    <select
                        value={filters.vendor_id || ""}
                        onChange={(e) => handleFilterChange('vendor_id', Number(e.target.value) || undefined)}
                        className="h-10 w-full rounded-md border border-border px-3 text-sm outline-none focus:ring-2 focus:ring-blue/40"
                    >
                        <option value="">All Vendors</option>
                        {vendors.map(v => (
                            <option key={v.id} value={v.id}>{v.name}</option>
                        ))}
                    </select>
                </div>
                <div className="flex-1 space-y-1">
                    <label className="text-xs font-semibold text-muted">Start Date</label>
                    <input
                        type="date"
                        value={filters.start_date || ""}
                        onChange={(e) => handleFilterChange('start_date', e.target.value)}
                        className="h-10 w-full rounded-md border border-border px-3 text-sm outline-none focus:ring-2 focus:ring-blue/40"
                    />
                </div>
                <div className="flex-1 space-y-1">
                    <label className="text-xs font-semibold text-muted">End Date</label>
                    <input
                        type="date"
                        value={filters.end_date || ""}
                        onChange={(e) => handleFilterChange('end_date', e.target.value)}
                        className="h-10 w-full rounded-md border border-border px-3 text-sm outline-none focus:ring-2 focus:ring-blue/40"
                    />
                </div>
                <div className="flex-1 space-y-1">
                    <label className="text-xs font-semibold text-muted">Payment Status</label>
                    <select
                        value={filters.payment_status || ""}
                        onChange={(e) => handleFilterChange('payment_status', e.target.value)}
                        className="h-10 w-full rounded-md border border-border px-3 text-sm outline-none focus:ring-2 focus:ring-blue/40"
                    >
                        <option value="">All Statuses</option>
                        <option value="UNPAID">Unpaid</option>
                        <option value="FULLY_PAID">Paid</option>
                        <option value="PARTIALLY_PAID">Partially Paid</option>
                    </select>
                </div>
                <button
                    onClick={handleClearFilters}
                    className="h-10 rounded-md border border-border bg-white px-4 text-sm font-medium text-muted hover:bg-surface hover:text-ink"
                >
                    Reset
                </button>
            </div>

            {/* Logs Table */}
            <div className="rounded-xl border border-border bg-white overflow-hidden">
                {loading && logs.length === 0 ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="text-sm text-muted">Loading logs...</div>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="bg-surface text-xs font-semibold tracking-wider text-muted">
                                <tr>
                                    <th className="px-4 py-3 text-left">Date</th>
                                    <th className="px-4 py-3 text-left">Vehicle / Vendor</th>
                                    <th className="px-4 py-3 text-left">Trip Type</th>
                                    <th className="px-4 py-3 text-left">Passenger</th>
                                    <th className="px-4 py-3 text-right">Distance</th>
                                    <th className="px-4 py-3 text-right">Cost</th>
                                    <th className="px-4 py-3 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {logs.map((log) => (
                                    <tr key={log.booking_id} className="hover:bg-surface/50">
                                        <td className="px-4 py-3 text-ink">
                                            {log.start_time ? new Date(log.start_time).toLocaleDateString() : '-'}
                                            <div className="text-xs text-muted">
                                                {log.start_time ? new Date(log.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-ink">
                                                {log.chauffeur_bookings?.vehicles?.plate_number || 'N/A'}
                                            </div>
                                            <div className="text-xs text-muted">
                                                {log.chauffeur_bookings?.vehicles?.vendors?.name || 'Unknown Vendor'}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-ink">
                                            {log.chauffeur_bookings?.trip_type?.replace('_', ' ') || '-'}
                                        </td>
                                        <td className="px-4 py-3 text-ink">
                                            {log.chauffeur_bookings?.users_chauffeur_bookings_passenger_idTousers?.full_name || '-'}
                                        </td>
                                        <td className="px-4 py-3 text-right text-ink">
                                            {log.total_distance_km ? `${Number(log.total_distance_km).toFixed(1)} km` : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="font-medium text-ink">
                                                Rs. {Number(log.vendor_cost).toLocaleString()}
                                            </div>
                                            {log.vendor_amount_paid ? (
                                                <>
                                                    <div className="text-xs text-green-600 mt-1">
                                                        Paid: Rs. {Number(log.vendor_amount_paid).toLocaleString()}
                                                    </div>
                                                    <div className="text-xs text-muted">
                                                        Rem: Rs. {Number(log.vendor_amount_remaining).toLocaleString()}
                                                    </div>
                                                </>
                                            ) : null}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${['PAID', 'FULLY_PAID'].includes(String(log.vendor_payment_status).toUpperCase()) ? 'bg-green-100 text-green-800' :
                                                log.vendor_payment_status === 'PARTIALLY_PAID' ? 'bg-blue/10 text-blue' :
                                                    'bg-orange/10 text-orange'
                                                }`}>
                                                {log.vendor_payment_status?.replace('_', ' ') || 'UNPAID'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {logs.length === 0 && !loading && (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-12 text-center text-muted">
                                            No trips found matching your filters.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                <div className="border-t border-border">
                    <Pagination
                        currentPage={pagination.page}
                        totalPages={pagination.pages}
                        onPageChange={handlePageChange}
                    />
                </div>
            </div>
        </div>
    );
}
