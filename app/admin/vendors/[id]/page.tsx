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
    selectVendorLogsPagination,
    createVendorPayment
} from '../../../lib/store/slices/vendorLogsSlice';
import { ArrowLeft, Calendar, Filter, DollarSign, X } from 'lucide-react';
import Pagination from '../../../components/ui/Pagination';

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



    useEffect(() => {
        if (vendorId) {
            dispatch(fetchVendorStats(vendorId));
            dispatch(fetchVendorLogs({
                vendor_id: vendorId,
                page: 1,
                limit: 10,
                ...filters
            }));
        }
    }, [dispatch, vendorId, filters]);

    const handleFilterChange = (key: string, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    // Payment Modal State
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [selectedBookingForPayment, setSelectedBookingForPayment] = useState<{ id: number; cost: number; paid: number } | null>(null);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentNotes, setPaymentNotes] = useState('');
    const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

    const openPaymentModal = (bookingId: number, cost: number, paid: number = 0) => {
        setSelectedBookingForPayment({ id: bookingId, cost, paid });
        // If cost is 0 the trip is still in progress — leave amount blank for admin to fill in
        setPaymentAmount(cost > 0 ? (cost - paid).toString() : '');
        setPaymentNotes('');
        setIsPaymentModalOpen(true);
    };

    const closePaymentModal = () => {
        setIsPaymentModalOpen(false);
        setSelectedBookingForPayment(null);
        setPaymentAmount('');
        setPaymentNotes('');
    };

    const handleSubmitPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedBookingForPayment || !paymentAmount) return;

        setIsSubmittingPayment(true);
        try {
            await dispatch(createVendorPayment({
                booking_id: selectedBookingForPayment.id,
                amount: parseFloat(paymentAmount),
                notes: paymentNotes,
                payment_method: 'CASH' // Default or add selector
            })).unwrap();

            // Refresh logs and stats
            dispatch(fetchVendorStats(vendorId));
            dispatch(fetchVendorLogs({
                vendor_id: vendorId,
                page: logsPagination.page,
                limit: logsPagination.limit,
                ...filters
            }));
            closePaymentModal();
        } catch (error) {
            console.error('Failed to create payment:', error);
            // Show error notification if possible
        } finally {
            setIsSubmittingPayment(false);
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
                            <option value="FULLY_PAID">Fully Paid</option>
                            <option value="PARTIALLY_PAID">Partially Paid</option>
                            <option value="UNPAID">Unpaid</option>
                        </select>
                    </div>
                </div>

                {/* Only visible when rows are selected */}

            </div>

            {/* Logs Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 font-semibold text-slate-700">Date/Time</th>
                                <th className="px-6 py-4 font-semibold text-slate-700">Booking ID</th>
                                <th className="px-6 py-4 font-semibold text-slate-700">Passenger</th>
                                <th className="px-6 py-4 font-semibold text-slate-700">Vehicle</th>
                                <th className="px-6 py-4 font-semibold text-slate-700">Description</th>
                                <th className="px-6 py-4 font-semibold text-slate-700 text-right">Vendor Cost</th>
                                <th className="px-6 py-4 font-semibold text-slate-700 text-center">Status</th>
                                <th className="px-6 py-4 font-semibold text-slate-700 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {logsStatus === 'loading' ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                                        Loading logs...
                                    </td>
                                </tr>
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                                        No logs found matching criteria.
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log) => {
                                    const statusRaw = log.vendor_payment_status || '';
                                    const isPaid = ['FULLY_PAID'].includes(statusRaw.toUpperCase());

                                    return (
                                        <tr key={log.booking_id} className="hover:bg-slate-50 transition-colors">

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
                                            <td className="px-6 py-4">
                                                <div className="text-slate-900 text-sm max-w-[200px] truncate" title={log.chauffeur_bookings?.vendor_payment_transactions?.[0]?.notes || '-'}>
                                                    {log.chauffeur_bookings?.vendor_payment_transactions?.[0]?.notes || '-'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="font-medium text-slate-900">
                                                    PKR {Number(log.vendor_cost).toLocaleString()}
                                                </div>
                                                {log.vendor_amount_paid ? (
                                                    <>
                                                        <div className="text-xs text-green-600 mt-1">
                                                            Paid: PKR {Number(log.vendor_amount_paid).toLocaleString()}
                                                        </div>
                                                        <div className="text-xs text-slate-500">
                                                            Rem: PKR {Number(log.vendor_amount_remaining).toLocaleString()}
                                                        </div>
                                                    </>
                                                ) : null}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${isPaid
                                                    ? 'bg-green-100 text-green-700'
                                                    : 'bg-orange-100 text-orange-700'
                                                    }`}>
                                                    {log.vendor_payment_status || 'UNPAID'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {!isPaid && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            openPaymentModal(
                                                                log.booking_id,
                                                                Number(log.vendor_cost),
                                                                Number(log.vendor_amount_paid || 0)
                                                            );
                                                        }}
                                                        className="text-orange hover:opacity-80 font-medium text-sm inline-flex items-center gap-1"
                                                    >
                                                        <DollarSign className="w-4 h-4" />
                                                        Pay
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
                {/* Pagination */}
                <div className="border-t border-slate-200">
                    <Pagination
                        currentPage={logsPagination.page}
                        totalPages={logsPagination.pages}
                        onPageChange={(page) => {
                            dispatch(fetchVendorLogs({
                                vendor_id: vendorId,
                                page,
                                limit: logsPagination.limit,
                                ...filters
                            }));
                        }}
                    />
                </div>
            </div>

            {/* Payment Modal */}
            {
                isPaymentModalOpen && selectedBookingForPayment && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                            <div className="flex items-center justify-between p-4 border-b border-slate-100">
                                <h3 className="text-lg font-semibold text-slate-900">Record Payment</h3>
                                <button onClick={closePaymentModal} className="text-slate-400 hover:text-slate-600">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <form onSubmit={handleSubmitPayment} className="p-4 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Booking ID</label>
                                    <div className="text-slate-900 font-semibold">#{selectedBookingForPayment.id}</div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Total Cost</label>
                                    <div className="text-slate-900">
                                        {selectedBookingForPayment.cost > 0
                                            ? `PKR ${selectedBookingForPayment.cost.toLocaleString()}`
                                            : <span className="text-orange-600 text-sm font-medium">Trip in progress — cost not yet finalized</span>
                                        }
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Payment Amount</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">PKR</span>
                                        <input
                                            type="number"
                                            required
                                            min="1"
                                            step="0.01"
                                            value={paymentAmount}
                                            onChange={(e) => setPaymentAmount(e.target.value)}
                                            className="w-full pl-12 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Notes (Optional)</label>
                                    <textarea
                                        value={paymentNotes}
                                        onChange={(e) => setPaymentNotes(e.target.value)}
                                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none h-24"
                                        placeholder="Enter payment details..."
                                    />
                                </div>
                                <div className="flex justify-end gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={closePaymentModal}
                                        className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg font-medium text-sm"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmittingPayment}
                                        className="px-4 py-2 bg-orange text-white rounded-lg font-medium text-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                        {isSubmittingPayment ? (
                                            <>
                                                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                Saving...
                                            </>
                                        ) : (
                                            'Record Payment'
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
