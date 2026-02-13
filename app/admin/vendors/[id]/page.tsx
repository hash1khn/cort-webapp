'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '../../../lib/store/hooks';
import {
    selectAdminVendors,
} from '../../../lib/store/slices/adminVendorsSlice';
import {
    fetchVendorLogs,
    fetchVendorStats,
    markVendorLogsAsPaid,
    selectVendorLogs,
    selectVendorStats,
    selectVendorLogsStatus,
    selectVendorLogsPagination
} from '../../../lib/store/slices/vendorLogsSlice';
import { ArrowLeft, Calendar, Filter, CheckCircle } from 'lucide-react';

export default function VendorDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const dispatch = useAppDispatch();
    const vendorId = Number(params.id);

    const logs = useAppSelector(selectVendorLogs);
    const stats = useAppSelector(selectVendorStats);
    const logsStatus = useAppSelector(selectVendorLogsStatus);
    const logsPagination = useAppSelector(selectVendorLogsPagination);
    const vendors = useAppSelector(selectAdminVendors); // To get vendor name if needed, or fetch single

    // We might need to fetch the single vendor details if not in list, but let's assume we can get it or just show ID/Logs for now.
    // Or we can rely on the logs to show vendor details? No.
    // Ideally we should have `fetchVendorById`. For now, let's just use the ID in header or try to find in list.
    const vendor = vendors.find(v => v.id === vendorId);

    const [filters, setFilters] = useState({
        start_date: '',
        end_date: '',
        payment_status: ''
    });

    const [selectedLogIds, setSelectedLogIds] = useState<number[]>([]);

    useEffect(() => {
        if (vendorId) {
            dispatch(fetchVendorStats(vendorId));
            dispatch(fetchVendorLogs({
                vendor_id: vendorId,
                page: 1,
                limit: 20,
                ...filters
            }));
        }
    }, [dispatch, vendorId, filters]);

    const handleFilterChange = (key: string, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setSelectedLogIds([]); // Clear selection on filter change
    };

    const handleSelectLog = (bookingId: number) => {
        setSelectedLogIds(prev =>
            prev.includes(bookingId)
                ? prev.filter(id => id !== bookingId)
                : [...prev, bookingId]
        );
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            // Select all UNPAID logs on current page
            const unpaidIds = logs
                .filter(log => log.vendor_payment_status !== 'PAID')
                .map(log => log.booking_id);
            setSelectedLogIds(unpaidIds);
        } else {
            setSelectedLogIds([]);
        }
    };

    const [isMarkingPaid, setIsMarkingPaid] = useState(false);

    const handleMarkAsPaid = async () => {
        if (selectedLogIds.length === 0 || isMarkingPaid) return;

        setIsMarkingPaid(true);
        try {
            await dispatch(markVendorLogsAsPaid(selectedLogIds));

            // Refresh logs and stats
            dispatch(fetchVendorStats(vendorId));
            dispatch(fetchVendorLogs({
                vendor_id: vendorId,
                page: logsPagination.page,
                limit: logsPagination.limit,
                ...filters
            }));
            setSelectedLogIds([]);
        } catch (error) {
            console.error('Failed to mark logs as paid:', error);
        } finally {
            setIsMarkingPaid(false);
        }
    };

    return (
        <div className="flex flex-col gap-6 p-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => router.back()}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">
                        {vendor?.name || `Vendor #${vendorId}`}
                    </h1>
                    <p className="text-slate-500">Vendor Trip Logs & Financials</p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="text-sm font-medium text-slate-500 mb-2">Total Rides</h3>
                    <div className="text-3xl font-bold text-slate-900">
                        {logsStatus === 'loading' ? '...' : stats?.total_rides || 0}
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="text-sm font-medium text-slate-500 mb-2">Total Cost</h3>
                    <div className="text-3xl font-bold text-slate-900">
                        PKR {logsStatus === 'loading' ? '...' : (stats?.total_cost || 0).toLocaleString()}
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="text-sm font-medium text-slate-500 mb-2">Total Outstanding</h3>
                    <div className={`text-3xl font-bold ${(stats?.total_outstanding || 0) > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                        PKR {logsStatus === 'loading' ? '...' : (stats?.total_outstanding || 0).toLocaleString()}
                    </div>
                </div>
            </div>

            {/* Filters & Actions */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto">
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input
                            type="date"
                            className="pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                            value={filters.start_date}
                            onChange={(e) => handleFilterChange('start_date', e.target.value)}
                        />
                    </div>
                    <span className="text-slate-400">-</span>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input
                            type="date"
                            className="pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                            value={filters.end_date}
                            onChange={(e) => handleFilterChange('end_date', e.target.value)}
                        />
                    </div>
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <select
                            className="pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none bg-transparent"
                            value={filters.payment_status}
                            onChange={(e) => handleFilterChange('payment_status', e.target.value)}
                        >
                            <option value="">All Statuses</option>
                            <option value="PAID">Paid</option>
                            <option value="UNPAID">Unpaid</option>
                        </select>
                    </div>
                </div>

                {/* Only visible when rows are selected */}
                {selectedLogIds.length > 0 && (
                    <button
                        onClick={handleMarkAsPaid}
                        disabled={isMarkingPaid}
                        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all duration-200 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-sm border border-transparent animate-in fade-in slide-in-from-right-4"
                    >
                        {isMarkingPaid ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Processing...
                            </>
                        ) : (
                            <>
                                <CheckCircle className="w-4 h-4" />
                                Mark {selectedLogIds.length > 0 ? selectedLogIds.length : ''} as Paid
                            </>
                        )}
                    </button>
                )}
            </div>

            {/* Logs Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 w-10">
                                    <input
                                        type="checkbox"
                                        className="rounded border-slate-300 text-primary focus:ring-primary/20"
                                        onChange={handleSelectAll}
                                        checked={logs.length > 0 && logs
                                            .filter(l => l.vendor_payment_status !== 'PAID')
                                            .every(l => selectedLogIds.includes(l.booking_id))
                                        }
                                    />
                                </th>
                                <th className="px-6 py-4 font-semibold text-slate-700">Date/Time</th>
                                <th className="px-6 py-4 font-semibold text-slate-700">Booking ID</th>
                                <th className="px-6 py-4 font-semibold text-slate-700">Passenger</th>
                                <th className="px-6 py-4 font-semibold text-slate-700">Vehicle</th>
                                <th className="px-6 py-4 font-semibold text-slate-700 text-right">Vendor Cost</th>
                                <th className="px-6 py-4 font-semibold text-slate-700 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {logsStatus === 'loading' ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                                        Loading logs...
                                    </td>
                                </tr>
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                                        No logs found matching criteria.
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log) => {
                                    const isPaid = log.vendor_payment_status === 'PAID';
                                    const isSelected = selectedLogIds.includes(log.booking_id);

                                    return (
                                        <tr key={log.booking_id} className={`hover:bg-slate-50 transition-colors ${isSelected ? 'bg-primary/5' : ''}`}>
                                            <td className="px-6 py-4">
                                                {!isPaid && (
                                                    <input
                                                        type="checkbox"
                                                        className="rounded border-slate-300 text-primary focus:ring-primary/20"
                                                        checked={isSelected}
                                                        onChange={() => handleSelectLog(log.booking_id)}
                                                    />
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-slate-600">
                                                {new Date(log.start_time).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}
                                            </td>
                                            <td className="px-6 py-4 text-slate-900 font-medium">
                                                #{log.booking_id}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-slate-900">{log.chauffeur_bookings?.users_chauffeur_bookings_passenger_idTousers?.full_name || 'Guest'}</div>
                                                <div className="text-xs text-slate-500">{log.chauffeur_bookings?.users_chauffeur_bookings_passenger_idTousers?.phone}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-slate-900">{log.chauffeur_bookings?.vehicles?.model}</div>
                                                <div className="text-xs text-slate-500">{log.chauffeur_bookings?.vehicles?.plate_number}</div>
                                            </td>
                                            <td className="px-6 py-4 text-right font-medium text-slate-900">
                                                {Number(log.vendor_cost).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${isPaid
                                                    ? 'bg-green-100 text-green-700'
                                                    : 'bg-orange-100 text-orange-700'
                                                    }`}>
                                                    {log.vendor_payment_status || 'UNPAID'}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
                {/* Pagination (Simple for now) */}
                {logsPagination.total > logsPagination.limit && (
                    <div className="p-4 border-t border-slate-200 flex justify-center">
                        {/* Implement pagination controls if needed */}
                        <div className="text-sm text-slate-500">
                            Showing page {logsPagination.page} of {logsPagination.pages}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
