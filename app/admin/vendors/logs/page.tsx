"use client";

import { useEffect, useState } from "react";
import { Pencil, Check, X } from "lucide-react";
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
import { Modal } from "../../components/ui/Modal";
import { VendorLog } from "../../../lib/services/types/vendors";
import { apiClient } from "../../../lib/services/api-client";
import { AdminProtectedPage } from "../../components/AdminProtectedPage";
import { ADMIN_SUBJECTS } from "../../../lib/abilities/admin-subjects";

export default function VendorLogsPage() {
    return (
        <AdminProtectedPage permission="vendor_logs" subject={ADMIN_SUBJECTS.vendor_logs}>
            <VendorLogsContent />
        </AdminProtectedPage>
    );
}

function VendorLogsContent() {
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
        dispatch(fetchVendorStats({
            vendor_id: filters.vendor_id,
            company_id: filters.company_id,
        }));
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
    const [breakdownLog, setBreakdownLog] = useState<VendorLog | null>(null);
    const [settlementLog, setSettlementLog] = useState<any | null>(null);
    const [settlementLoading, setSettlementLoading] = useState(false);
    const [settlementError, setSettlementError] = useState<string | null>(null);
    const [settlementTxns, setSettlementTxns] = useState<any[]>([]);
    const [editDistance, setEditDistance] = useState<string>('');
    const [savingDistance, setSavingDistance] = useState(false);
    const [distanceError, setDistanceError] = useState<string | null>(null);

    // Inline row-edit state for settlement transactions
    const [editingTxnId, setEditingTxnId] = useState<number | null>(null);
    const [editTxnForm, setEditTxnForm] = useState({ amount: '', payment_method: '', notes: '', payment_date: '' });
    const [savingTxn, setSavingTxn] = useState(false);
    const [txnEditError, setTxnEditError] = useState<string | null>(null);

    const toDatetimeLocal = (iso: string) => {
        const d = new Date(iso);
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    const startEditTxn = (t: any) => {
        setEditingTxnId(t.id);
        setEditTxnForm({
            amount: String(Number(t.amount || 0)),
            payment_method: t.payment_method || '',
            notes: t.notes || '',
            payment_date: t.payment_date ? toDatetimeLocal(t.payment_date) : '',
        });
        setTxnEditError(null);
    };

    const cancelEditTxn = () => {
        setEditingTxnId(null);
        setTxnEditError(null);
    };

    const saveEditTxn = async (txnId: number) => {
        const amount = parseFloat(editTxnForm.amount);
        if (isNaN(amount) || amount <= 0) {
            setTxnEditError('Enter a valid amount greater than zero.');
            return;
        }
        setSavingTxn(true);
        setTxnEditError(null);
        try {
            await apiClient.updateVendorPayment(txnId, {
                amount,
                payment_method: editTxnForm.payment_method || undefined,
                notes: editTxnForm.notes || undefined,
                payment_date: editTxnForm.payment_date ? new Date(editTxnForm.payment_date).toISOString() : undefined,
            });

            if (settlementLog?.booking_id) {
                const res: any = await apiClient.getVendorPaymentHistory(settlementLog.booking_id);
                const txns = Array.isArray(res) ? res : (res?.data ?? []);
                setSettlementTxns(Array.isArray(txns) ? txns : []);
            }
            dispatch(fetchVendorLogs(filters));
            dispatch(fetchVendorStats({
                vendor_id: filters.vendor_id,
                company_id: filters.company_id,
            }));
            setEditingTxnId(null);
        } catch (e: any) {
            setTxnEditError(e?.message || 'Failed to save changes.');
        } finally {
            setSavingTxn(false);
        }
    };

    // Sync edit input when modal opens
    useEffect(() => {
        if (breakdownLog) {
            const d = breakdownLog.vendor_distance_km ?? breakdownLog.total_distance_km;
            setEditDistance(d != null ? String(Number(d)) : '');
            setDistanceError(null);
        }
    }, [breakdownLog?.booking_id]);

    const handleSaveDistance = async () => {
        if (!breakdownLog) return;
        const km = parseFloat(editDistance);
        if (isNaN(km) || km < 0) { setDistanceError('Enter a valid distance'); return; }
        setSavingDistance(true);
        setDistanceError(null);
        try {
            await apiClient.updateVendorTripLog(breakdownLog.booking_id, km);
            dispatch(fetchVendorLogs(filters));
            dispatch(fetchVendorStats({
            vendor_id: filters.vendor_id,
            company_id: filters.company_id,
        }));
            setBreakdownLog(null);
        } catch {
            setDistanceError('Failed to save. Please try again.');
        } finally {
            setSavingDistance(false);
        }
    };

    const openSettlementModal = async (log: any) => {
        setSettlementLog(log);
        setSettlementError(null);
        setSettlementTxns([]);
        setEditingTxnId(null);
        setTxnEditError(null);

        if (!log?.booking_id || log?.type !== 'CHAUFFEUR') {
            return;
        }

        setSettlementLoading(true);
        try {
            const res: any = await apiClient.getVendorPaymentHistory(log.booking_id);
            const txns = Array.isArray(res) ? res : (res?.data ?? []);
            setSettlementTxns(Array.isArray(txns) ? txns : []);
        } catch (e: any) {
            setSettlementError(e?.message || 'Failed to load settlement history');
        } finally {
            setSettlementLoading(false);
        }
    };

    return (
        <>
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
                                    <th className="px-4 py-3 text-left">Settled At</th>
                                    <th className="px-4 py-3 text-left">Type</th>
                                    <th className="px-4 py-3 text-left">Vehicle / Vendor</th>
                                    <th className="px-4 py-3 text-left">Reference / Passenger</th>
                                    <th className="px-4 py-3 text-left">Charged Against</th>
                                    <th className="px-4 py-3 text-right">Vendor Distance</th>
                                    <th className="px-4 py-3 text-right">Cost</th>
                                    <th className="px-4 py-3 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {logs.map((log: any) => (
                                    <tr
                                        key={log.id}
                                        className="hover:bg-surface/50 cursor-pointer"
                                        onClick={() => openSettlementModal(log)}
                                        title={log.type === 'CHAUFFEUR' ? 'Click to view settlement breakdown' : 'Settlement breakdown not available for shuttle yet'}
                                    >
                                        <td className="px-4 py-3 text-ink">
                                            {log.date ? new Date(log.date).toLocaleDateString() : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-ink">
                                            {log.settled_at
                                                ? new Date(log.settled_at).toLocaleString()
                                                : '—'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${log.type === 'SHUTTLE' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                                {log.type}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-ink">
                                                {log.vehicle || 'N/A'}
                                            </div>
                                            <div className="text-xs text-muted">
                                                {log.vendor_name || 'Unknown Vendor'}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-ink">
                                            <div className="font-medium">{log.passenger || '-'}</div>
                                            <div className="text-xs text-muted">{log.details}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            {log.invoice_id ? (
                                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-200 rounded px-2 py-0.5">
                                                    Invoice #{log.invoice_id}
                                                </span>
                                            ) : log.booking_id ? (
                                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded px-2 py-0.5">
                                                    Booking #{log.booking_id}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-muted">—</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right text-ink">
                                            {log.distance != null
                                                ? `${Number(log.distance).toFixed(1)} km`
                                                : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="font-medium text-ink">
                                                Rs. {Number(log.cost || 0).toLocaleString()}
                                            </div>
                                            {Number(log.amount_paid || 0) > 0 ? (
                                                <>
                                                    <div className="text-xs text-green-600 mt-1">
                                                        Paid: Rs. {Number(log.amount_paid).toLocaleString()}
                                                    </div>
                                                    <div className="text-xs text-muted">
                                                        Rem: Rs. {Number(log.amount_remaining).toLocaleString()}
                                                    </div>
                                                </>
                                            ) : null}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${['PAID', 'FULLY_PAID', 'PAID'].includes(String(log.status).toUpperCase()) ? 'bg-green-100 text-green-800' :
                                                log.status === 'PARTIALLY_PAID' ? 'bg-blue/10 text-blue' :
                                                    'bg-orange/10 text-orange'
                                                }`}>
                                                {log.status?.replace('_', ' ') || 'UNPAID'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {logs.length === 0 && !loading && (
                                    <tr>
                                        <td colSpan={9} className="px-4 py-12 text-center text-muted">
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

        {/* Cost Breakdown Modal */}
        <Modal
            isOpen={breakdownLog !== null}
            onClose={() => setBreakdownLog(null)}
            title="Vendor Cost Breakdown"
        >
            {breakdownLog && (() => {
                const bl = breakdownLog;
                return (
                <div className="space-y-4">
                    {/* Trip Info */}
                    <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-sm space-y-1">
                        <div className="flex justify-between">
                            <span className="text-muted">Vehicle</span>
                            <span className="font-medium text-ink">{bl.chauffeur_bookings?.vehicles?.plate_number || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted">Vendor</span>
                            <span className="font-medium text-ink">{bl.chauffeur_bookings?.vehicles?.vendors?.name || '—'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted">Trip Type</span>
                            <span className="font-medium text-ink">{bl.chauffeur_bookings?.trip_type?.replace('_', ' ') || '—'}</span>
                        </div>
                        {bl.chauffeur_bookings?.package_selected && (
                            <div className="flex justify-between">
                                <span className="text-muted">Package</span>
                                <span className="font-medium text-ink">{bl.chauffeur_bookings.package_selected.replace('_', ' ')}</span>
                            </div>
                        )}
                        <div className="flex justify-between">
                            <span className="text-muted">Distance (GPS)</span>
                            <span className="font-medium text-ink">{bl.total_distance_km ? `${Number(bl.total_distance_km).toFixed(1)} km` : '—'}</span>
                        </div>
                        {/* Vendor Distance — editable override for fuel cost */}
                        <div className="flex items-center justify-between gap-3 pt-1">
                            <span className="text-muted shrink-0">Vendor Distance</span>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    min="0"
                                    step="0.1"
                                    value={editDistance}
                                    onChange={(e) => { setEditDistance(e.target.value); setDistanceError(null); }}
                                    className="w-28 rounded-md border border-border px-2 py-1 text-right text-sm outline-none focus:ring-2 focus:ring-blue/40"
                                />
                                <span className="text-sm text-muted">km</span>
                                <button
                                    onClick={handleSaveDistance}
                                    disabled={savingDistance}
                                    className="rounded-md bg-navy px-3 py-1 text-xs font-medium text-white hover:bg-navy/90 disabled:opacity-50"
                                >
                                    {savingDistance ? 'Saving…' : 'Save'}
                                </button>
                            </div>
                        </div>
                        {distanceError && <div className="text-xs text-red-500">{distanceError}</div>}
                        <div className="flex justify-between">
                            <span className="text-muted">Duration</span>
                            <span className="font-medium text-ink">{bl.total_duration_minutes ? `${Math.floor(Number(bl.total_duration_minutes) / 60)}h ${Number(bl.total_duration_minutes) % 60}m` : '—'}</span>
                        </div>
                    </div>

                    {/* Breakdown Lines */}
                    <div className="space-y-2">
                        <div className="text-xs font-semibold uppercase tracking-wider text-muted">Breakdown</div>
                        <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 overflow-hidden">
                            {Number(bl.vendor_base_rent) > 0 && (() => {
                                const v = bl.chauffeur_bookings?.vehicles;
                                const pkg = bl.chauffeur_bookings?.package_selected;
                                const tripType = bl.chauffeur_bookings?.trip_type;
                                const isOutstation = tripType === 'OUT_STATION';
                                let rateLabel: string | null = null;
                                let rateValue: number | null = null;
                                if (pkg === 'HOURS_24') {
                                    rateLabel = isOutstation ? 'Rate / day (outstation)' : 'Rate / day (city)';
                                    rateValue = isOutstation ? Number(v?.rent_per_day_outstation) : Number(v?.rent_per_day_city);
                                } else if (pkg === 'HOURS_10') {
                                    rateLabel = 'Rate (10 hr)';
                                    rateValue = Number(v?.vendor_rent_10hr);
                                } else if (pkg === 'HOURS_5') {
                                    rateLabel = 'Rate (5 hr)';
                                    rateValue = Number(v?.vendor_rent_5hr);
                                }
                                return (
                                    <>
                                        <div className="flex justify-between px-4 py-2.5 text-sm">
                                            <span className="text-slate-600">
                                                Base Rent
                                                {rateLabel && rateValue ? (
                                                    <span className="ml-1.5 text-xs text-muted font-normal">({rateLabel}: Rs. {rateValue.toLocaleString()})</span>
                                                ) : null}
                                            </span>
                                            <span className="font-medium text-ink">Rs. {Number(bl.vendor_base_rent).toLocaleString()}</span>
                                        </div>
                                    </>
                                );
                            })()}
                            {Number(bl.vendor_fuel_cost) > 0 && (
                                <div className="flex justify-between px-4 py-2.5 text-sm">
                                    <span className="text-slate-600">
                                        Fuel Cost
                                        {bl.fuel_price_snapshot ? <span className="ml-1 text-xs text-muted">@ Rs. {Number(bl.fuel_price_snapshot).toLocaleString()}/L</span> : null}
                                    </span>
                                    <span className="font-medium text-ink">Rs. {Number(bl.vendor_fuel_cost).toLocaleString()}</span>
                                </div>
                            )}
                            {Number(bl.vendor_overtime_charge) > 0 && (
                                <div className="flex justify-between px-4 py-2.5 text-sm">
                                    <span className="text-slate-600">
                                        Overtime
                                        {bl.chauffeur_bookings?.vehicles?.vendor_overtime_rate
                                            ? <span className="ml-1 text-xs text-muted">@ Rs. {Number(bl.chauffeur_bookings.vehicles.vendor_overtime_rate).toLocaleString()}/hr</span>
                                            : null}
                                    </span>
                                    <span className="font-medium text-ink">Rs. {Number(bl.vendor_overtime_charge).toLocaleString()}</span>
                                </div>
                            )}
                            {Number(bl.expense_toll) > 0 && (
                                <div className="flex justify-between px-4 py-2.5 text-sm">
                                    <span className="text-slate-600">Toll</span>
                                    <span className="font-medium text-ink">Rs. {Number(bl.expense_toll).toLocaleString()}</span>
                                </div>
                            )}
                            {Number(bl.expense_parking) > 0 && (
                                <div className="flex justify-between px-4 py-2.5 text-sm">
                                    <span className="text-slate-600">Parking</span>
                                    <span className="font-medium text-ink">Rs. {Number(bl.expense_parking).toLocaleString()}</span>
                                </div>
                            )}
                            {/* Total row */}
                            <div className="flex justify-between px-4 py-3 bg-slate-50 text-sm font-bold">
                                <span className="text-[#0c225e]">Total Vendor Cost</span>
                                <span className="text-[#0c225e]">Rs. {Number(bl.vendor_cost).toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    {/* Payment status */}
                    {(Number(bl.vendor_amount_paid) > 0 || bl.vendor_payment_status) && (
                        <div className="space-y-2">
                            <div className="text-xs font-semibold uppercase tracking-wider text-muted">Payment</div>
                            <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 overflow-hidden">
                                <div className="flex justify-between px-4 py-2.5 text-sm">
                                    <span className="text-slate-600">Status</span>
                                    <span className={`font-medium ${['PAID', 'FULLY_PAID'].includes(String(bl.vendor_payment_status).toUpperCase()) ? 'text-green-600' : bl.vendor_payment_status === 'PARTIALLY_PAID' ? 'text-blue-600' : 'text-orange-500'}`}>
                                        {bl.vendor_payment_status?.replace(/_/g, ' ') || 'UNPAID'}
                                    </span>
                                </div>
                                {Number(bl.vendor_amount_paid) > 0 && (
                                    <div className="flex justify-between px-4 py-2.5 text-sm">
                                        <span className="text-slate-600">Amount Paid</span>
                                        <span className="font-medium text-green-600">Rs. {Number(bl.vendor_amount_paid).toLocaleString()}</span>
                                    </div>
                                )}
                                {Number(bl.vendor_amount_remaining) > 0 && (
                                    <div className="flex justify-between px-4 py-2.5 text-sm">
                                        <span className="text-slate-600">Remaining</span>
                                        <span className="font-medium text-orange-500">Rs. {Number(bl.vendor_amount_remaining).toLocaleString()}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
                );
            })()}
        </Modal>

        {/* Settlement Breakdown Modal */}
        <Modal
            isOpen={settlementLog !== null}
            onClose={() => {
                setSettlementLog(null);
                setSettlementTxns([]);
                setSettlementError(null);
            }}
            title="Settlement Breakdown"
            size="xl"
            priority={breakdownLog ? 'elevated' : 'default'}
        >
            {settlementLog && (
                <div className="space-y-4">
                    <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-sm space-y-1">
                        <div className="flex justify-between">
                            <span className="text-muted">Type</span>
                            <span className="font-medium text-ink">{settlementLog.type}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted">Booking</span>
                            <span className="font-medium text-ink">
                                {settlementLog.booking_id ? `#${settlementLog.booking_id}` : '—'}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted">Vendor</span>
                            <span className="font-medium text-ink">{settlementLog.vendor_name || '—'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted">Total Cost</span>
                            <span className="font-medium text-ink">Rs. {Number(settlementLog.cost || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted">Paid</span>
                            <span className="font-medium text-green-700">Rs. {Number(settlementLog.amount_paid || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted">Remaining</span>
                            <span className="font-medium text-orange-700">Rs. {Number(settlementLog.amount_remaining || 0).toLocaleString()}</span>
                        </div>
                    </div>

                    {settlementLog.type !== 'CHAUFFEUR' ? (
                        <div className="text-sm text-muted">
                            Settlement breakdown is currently available for chauffeur logs only.
                        </div>
                    ) : settlementLoading ? (
                        <div className="text-sm text-muted">Loading settlement history…</div>
                    ) : settlementError ? (
                        <div className="text-sm text-red-600">{settlementError}</div>
                    ) : (
                        <div className="space-y-2">
                            <div className="text-xs font-semibold uppercase tracking-wider text-muted">Payments</div>
                            <div className="rounded-lg border border-slate-200 overflow-hidden">
                                {txnEditError && (
                                    <div className="px-3 py-2 text-sm text-red-600 bg-red-50 border-b border-red-100">{txnEditError}</div>
                                )}
                                <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 text-xs font-semibold tracking-wider text-muted">
                                        <tr>
                                            <th className="px-3 py-2 text-left">Date</th>
                                            <th className="px-3 py-2 text-right">Amount</th>
                                            <th className="px-3 py-2 text-left">Method</th>
                                            <th className="px-3 py-2 text-left">Notes</th>
                                            <th className="px-3 py-2 text-left">Settled By</th>
                                            <th className="sticky right-0 bg-slate-50 px-3 py-2 text-right shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.15)]">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {settlementTxns.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="px-3 py-10 text-center text-muted">
                                                    No payments recorded yet.
                                                </td>
                                            </tr>
                                        ) : (
                                            settlementTxns.map((t: any) => {
                                                const isEditing = editingTxnId === t.id;
                                                return (
                                                    <tr key={t.id}>
                                                        <td className="px-3 py-2 text-ink whitespace-nowrap">
                                                            {isEditing ? (
                                                                <input
                                                                    type="datetime-local"
                                                                    value={editTxnForm.payment_date}
                                                                    onChange={(e) => setEditTxnForm(f => ({ ...f, payment_date: e.target.value }))}
                                                                    className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                                                                />
                                                            ) : (
                                                                t.payment_date ? new Date(t.payment_date).toLocaleString() : '—'
                                                            )}
                                                        </td>
                                                        <td className="px-3 py-2 text-right font-medium text-ink whitespace-nowrap">
                                                            {isEditing ? (
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    step="0.01"
                                                                    value={editTxnForm.amount}
                                                                    onChange={(e) => setEditTxnForm(f => ({ ...f, amount: e.target.value }))}
                                                                    className="w-28 rounded-md border border-slate-300 px-2 py-1 text-sm text-right"
                                                                />
                                                            ) : (
                                                                `Rs. ${Number(t.amount || 0).toLocaleString()}`
                                                            )}
                                                        </td>
                                                        <td className="px-3 py-2 text-ink whitespace-nowrap">
                                                            {isEditing ? (
                                                                <input
                                                                    type="text"
                                                                    value={editTxnForm.payment_method}
                                                                    onChange={(e) => setEditTxnForm(f => ({ ...f, payment_method: e.target.value }))}
                                                                    className="w-28 rounded-md border border-slate-300 px-2 py-1 text-sm"
                                                                />
                                                            ) : (
                                                                t.payment_method || '—'
                                                            )}
                                                        </td>
                                                        <td className="px-3 py-2 text-ink">
                                                            {isEditing ? (
                                                                <input
                                                                    type="text"
                                                                    value={editTxnForm.notes}
                                                                    onChange={(e) => setEditTxnForm(f => ({ ...f, notes: e.target.value }))}
                                                                    className="w-full min-w-[10rem] rounded-md border border-slate-300 px-2 py-1 text-sm"
                                                                />
                                                            ) : (
                                                                t.notes || '—'
                                                            )}
                                                        </td>
                                                        <td className="px-3 py-2 text-ink whitespace-nowrap">
                                                            {t.users?.full_name || t.created_by || '—'}
                                                        </td>
                                                        <td className="sticky right-0 bg-white px-3 py-2 text-right whitespace-nowrap shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.15)]">
                                                            {isEditing ? (
                                                                <div className="flex items-center justify-end gap-1">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => saveEditTxn(t.id)}
                                                                        disabled={savingTxn}
                                                                        title="Save"
                                                                        className="rounded-md p-1.5 text-green-600 hover:bg-green-50 disabled:opacity-50"
                                                                    >
                                                                        <Check className="w-4 h-4" />
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={cancelEditTxn}
                                                                        disabled={savingTxn}
                                                                        title="Cancel"
                                                                        className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
                                                                    >
                                                                        <X className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => startEditTxn(t)}
                                                                    title="Edit payment"
                                                                    className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                                                                >
                                                                    <Pencil className="w-4 h-4" />
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
                            </div>
                        </div>
                    )}
                </div>
            )}
        </Modal>
        </>
    );
}
