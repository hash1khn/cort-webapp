"use client";

import { useEffect, useState } from "react";
import { apiClient } from "../lib/services/api-client";
import { VendorDashboardStats } from "../lib/services/types/multi-mode";
import { useVendorContext } from "./layout";
import { Inbox, Car, Users, Building2 } from "lucide-react";

function KpiCard({ label, value, icon: Icon, color }: { label: string; value: number | string; icon: React.ElementType; color: string }) {
    return (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex items-center gap-5">
            <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${color}`}>
                <Icon className="w-6 h-6" />
            </div>
            <div>
                <p className="text-2xl font-bold text-[#0c225e]">{value}</p>
                <p className="text-sm text-gray-500 mt-0.5">{label}</p>
            </div>
        </div>
    );
}

export default function VendorDashboardPage() {
    const { selectedLink } = useVendorContext();
    const [stats, setStats] = useState<VendorDashboardStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        apiClient.getVendorDashboard()
            .then((r) => setStats(r.data))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-[#0c225e]">Dashboard</h1>
                {selectedLink && (
                    <p className="text-sm text-gray-500 mt-1">
                        Viewing: <span className="font-medium text-gray-700">{selectedLink.companies?.name ?? `Link #${selectedLink.id}`}</span>
                    </p>
                )}
            </div>

            {loading ? (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="bg-white rounded-2xl border border-gray-200 p-6 h-28 animate-pulse" />
                    ))}
                </div>
            ) : stats ? (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <KpiCard label="Pending Requests" value={stats.pending_requests} icon={Inbox} color="bg-yellow-100 text-yellow-600" />
                    <KpiCard label="Active Bookings" value={stats.active_bookings} icon={Building2} color="bg-blue-100 text-blue-600" />
                    <KpiCard label="Fleet Vehicles" value={stats.total_vehicles} icon={Car} color="bg-green-100 text-green-600" />
                    <KpiCard label="Drivers" value={stats.total_drivers} icon={Users} color="bg-purple-100 text-purple-600" />
                </div>
            ) : null}

            {/* Company Links */}
            {stats?.company_links && stats.company_links.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                    <h2 className="text-base font-bold text-[#0c225e] mb-4">Company Assignments</h2>
                    <div className="space-y-3">
                        {stats.company_links.map((link) => (
                            <div key={link.link_id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                                <span className="text-sm font-medium text-gray-800">{link.company_name}</span>
                                <div className="flex gap-2">
                                    {link.serves_chauffeur && (
                                        <span className="text-xs bg-orange-100 text-[#f47f00] px-2.5 py-1 rounded-full font-medium">Chauffeur</span>
                                    )}
                                    {link.serves_shuttle && (
                                        <span className="text-xs bg-blue-100 text-blue-600 px-2.5 py-1 rounded-full font-medium">Shuttle</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
