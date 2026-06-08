"use client";

import { use, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAppSelector } from "../../../lib/store/hooks";
import { selectCompany } from "../../../lib/store/slices/companySlice";
import { apiClient, ChauffeurBooking } from "../../../lib/services/api-client";
import { BookingVendorRequest } from "../../../lib/services/types/multi-mode";
import { toast } from "sonner";

function cx(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

const STATUS_COLORS: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-700",
    ACCEPTED: "bg-green-100 text-green-700",
    REJECTED: "bg-red-100 text-red-700",
    EXPIRED: "bg-gray-100 text-gray-500",
};

export default function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const company = useAppSelector(selectCompany);
    const companyId = Number(company?.id);

    const [booking, setBooking] = useState<ChauffeurBooking | null>(null);
    const [vendorRequests, setVendorRequests] = useState<BookingVendorRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [confirming, setConfirming] = useState<number | null>(null);

    const load = useCallback(async () => {
        if (!companyId) return;
        try {
            const [bookingRes, reqRes] = await Promise.all([
                apiClient.getCompanyChauffeurBooking(companyId, Number(id)),
                apiClient.getBookingVendorRequests(companyId, Number(id)).catch(() => ({ data: [] })),
            ]);
            setBooking(bookingRes.data as unknown as ChauffeurBooking);
            setVendorRequests((reqRes as { data: BookingVendorRequest[] }).data ?? []);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to load booking");
        } finally {
            setLoading(false);
        }
    }, [companyId, id]);

    useEffect(() => { load(); }, [load]);

    // Poll every 30s while there are PENDING requests
    useEffect(() => {
        const hasPending = vendorRequests.some((r) => r.status === "PENDING");
        if (!hasPending) return;
        const timer = setInterval(load, 30_000);
        return () => clearInterval(timer);
    }, [vendorRequests, load]);

    const confirmVendor = async (requestId: number) => {
        setConfirming(requestId);
        try {
            await apiClient.confirmVendorForBooking(companyId, Number(id), requestId);
            toast.success("Vendor confirmed — other requests expired");
            load();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to confirm vendor");
        } finally {
            setConfirming(null);
        }
    };

    if (loading) {
        return <div className="p-8 text-sm text-gray-400">Loading booking…</div>;
    }

    if (!booking) {
        return <div className="p-8 text-sm text-gray-500">Booking not found.</div>;
    }

    const isExternalVendor = (booking as any).fulfillment_type === "EXTERNAL_VENDOR";
    const showVendorResponses = isExternalVendor || vendorRequests.length > 0;

    return (
        <div className="p-6 space-y-6 max-w-4xl mx-auto">
            {/* Back */}
            <Link href="/company/bookings" className="inline-flex items-center gap-1 text-sm text-[#f47f00] hover:underline">
                ← Back to Bookings
            </Link>

            {/* Booking Summary */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <h1 className="text-xl font-bold text-[#0c225e]">Booking #{booking.id}</h1>
                        <p className="text-sm text-gray-500 mt-0.5">{(booking as any).service_category ?? "Chauffeur"}</p>
                    </div>
                    <span className={cx("inline-flex px-3 py-1 rounded-full text-xs font-semibold", STATUS_COLORS[(booking as any).status ?? ""] ?? "bg-gray-100 text-gray-500")}>
                        {(booking as any).status ?? "—"}
                    </span>
                </div>

                <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                    <div>
                        <dt className="text-xs text-gray-400 font-medium uppercase tracking-wider">Pickup</dt>
                        <dd className="text-gray-800 mt-0.5">{(booking as any).pickup_address ?? "—"}</dd>
                    </div>
                    <div>
                        <dt className="text-xs text-gray-400 font-medium uppercase tracking-wider">Scheduled For</dt>
                        <dd className="text-gray-800 mt-0.5">{(booking as any).scheduled_for ? new Date((booking as any).scheduled_for).toLocaleString() : "—"}</dd>
                    </div>
                    <div>
                        <dt className="text-xs text-gray-400 font-medium uppercase tracking-wider">Package</dt>
                        <dd className="text-gray-800 mt-0.5">{(booking as any).package_selected ?? "—"}</dd>
                    </div>
                    <div>
                        <dt className="text-xs text-gray-400 font-medium uppercase tracking-wider">Fulfillment</dt>
                        <dd className="mt-0.5">
                            <span className={cx("inline-flex px-2 py-0.5 rounded text-xs font-semibold",
                                isExternalVendor ? "bg-blue-100 text-blue-700" :
                                (booking as any).fulfillment_type === "SELF_MANAGED" ? "bg-purple-100 text-purple-700" :
                                "bg-orange-100 text-orange-700"
                            )}>
                                {(booking as any).fulfillment_type ?? "CORT_MANAGED"}
                            </span>
                        </dd>
                    </div>
                </dl>
            </div>

            {/* Vendor requests: external bookings, or CORT_MANAGED broadcast while vendors were notified */}
            {showVendorResponses && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                    {!isExternalVendor && vendorRequests.length > 0 && (
                        <p className="text-xs text-slate-600 mb-3">
                            This booking was sent to Cort and to vendors. The first assignment (Cort or a vendor) confirms the trip; other pending requests are expired.
                        </p>
                    )}
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-base font-bold text-[#0c225e]">Vendor Responses</h2>
                        {vendorRequests.some((r) => r.status === "PENDING") && (
                            <span className="text-xs text-gray-400">Auto-refreshing every 30s…</span>
                        )}
                    </div>

                    {vendorRequests.length === 0 ? (
                        <p className="text-sm text-gray-400">No vendor responses yet.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        {["Vendor", "Status", "Assigned Vehicle", "Assigned Driver", "Responded At", "Action"].map((h) => (
                                            <th key={h} className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {vendorRequests.map((req) => (
                                        <tr key={req.id} className={cx("hover:bg-gray-50", req.status === "ACCEPTED" && "bg-green-50")}>
                                            <td className="px-3 py-3 font-medium text-gray-900">
                                                {req.company_vendor_links?.companies?.name ?? `Link #${req.company_vendor_link_id}`}
                                            </td>
                                            <td className="px-3 py-3">
                                                <span className={cx("inline-flex px-2 py-0.5 rounded-full text-xs font-semibold", STATUS_COLORS[req.status] ?? "bg-gray-100 text-gray-500")}>
                                                    {req.status}
                                                </span>
                                            </td>
                                            <td className="px-3 py-3 text-gray-600">
                                                {req.vehicles ? `${req.vehicles.plate_number} — ${req.vehicles.make} ${req.vehicles.model}` : "—"}
                                            </td>
                                            <td className="px-3 py-3 text-gray-600">
                                                {req.users?.full_name ?? "—"}
                                            </td>
                                            <td className="px-3 py-3 text-gray-500 text-xs">
                                                {req.responded_at ? new Date(req.responded_at).toLocaleString() : "—"}
                                            </td>
                                            <td className="px-3 py-3">
                                                {req.status === "ACCEPTED" && (
                                                    <button
                                                        onClick={() => confirmVendor(req.id)}
                                                        disabled={confirming === req.id}
                                                        className="bg-[#f47f00] text-white text-xs px-3 py-1.5 rounded-lg font-semibold disabled:opacity-50 hover:bg-[#d96e00] transition-colors"
                                                    >
                                                        {confirming === req.id ? "Confirming…" : "Confirm Vendor"}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
