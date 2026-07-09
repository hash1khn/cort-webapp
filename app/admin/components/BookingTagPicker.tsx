"use client";

import { useEffect, useState } from "react";
import { apiClient, ChauffeurBooking } from "../../lib/services/api-client";

export interface TaggedBooking {
    id: number;
    label: string;
}

/**
 * Optional "tag to a booking" picker. Only searches COMPLETED bookings —
 * tagging an in-flight booking's cost doesn't make sense, and only completed
 * bookings can be recalculated on the backend.
 *
 * When `vehicleId` is provided, results are ALWAYS constrained to that
 * vehicle's bookings (a real backend filter, not just a search suggestion),
 * so typing further just refines within that vehicle rather than escaping
 * to an unscoped global search. Without a vehicle, the box requires typing.
 */
export function BookingTagPicker({
    value,
    onChange,
    vehicleId,
}: {
    value: TaggedBooking | null;
    onChange: (booking: TaggedBooking | null) => void;
    vehicleId?: number;
}) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<ChauffeurBooking[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    const typed = query.trim();
    const hasCriteria = !!typed || !!vehicleId;

    useEffect(() => {
        if (value || !hasCriteria) {
            setResults([]);
            return;
        }
        setIsSearching(true);
        const timer = setTimeout(async () => {
            try {
                const res = (await apiClient.getAllBookings({
                    status: "COMPLETED",
                    search: typed || undefined,
                    vehicle_id: vehicleId,
                    limit: 6,
                })) as any;
                const raw = res?.data ?? res;
                setResults(raw?.data ?? raw ?? []);
            } catch {
                setResults([]);
            } finally {
                setIsSearching(false);
            }
        }, typed ? 350 : 0); // no debounce when it's just the vehicle filter loading
        return () => clearTimeout(timer);
    }, [typed, vehicleId, value, hasCriteria]);

    const label = (b: ChauffeurBooking) => {
        const passenger = b.users_chauffeur_bookings_passenger_idTousers?.full_name ?? "Unknown passenger";
        const plate = b.vehicles?.plate_number ? ` · ${b.vehicles.plate_number}` : "";
        const date = b.scheduled_for ? ` · ${new Date(b.scheduled_for).toLocaleDateString()}` : "";
        return `#${b.id} — ${passenger}${plate}${date}`;
    };

    if (value) {
        return (
            <div className="flex h-10 items-center justify-between gap-2 rounded-md border border-gray-300 bg-gray-50 px-3 text-sm">
                <span className="truncate text-gray-900">{value.label}</span>
                <button
                    type="button"
                    onClick={() => onChange(null)}
                    className="shrink-0 text-xs font-semibold text-red-600 hover:text-red-800"
                >
                    Remove
                </button>
            </div>
        );
    }

    return (
        <div>
            <div className="relative">
                <svg
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
                </svg>
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={vehicleId ? "Search within this vehicle's completed bookings…" : "Search by passenger, plate number, or booking ID…"}
                    className="block h-10 w-full rounded-md border border-gray-300 pl-9 pr-3 text-sm shadow-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
                />
            </div>

            {(isSearching || results.length > 0) && (
                <div className="mt-1.5 rounded-md border border-gray-200 bg-white max-h-44 overflow-y-auto divide-y divide-gray-100">
                    {isSearching ? (
                        <div className="px-3 py-2 text-sm text-gray-500">Searching…</div>
                    ) : (
                        results.map((b) => (
                            <button
                                type="button"
                                key={b.id}
                                onClick={() => onChange({ id: b.id, label: label(b) })}
                                className="block w-full truncate px-3 py-2 text-left text-sm text-gray-900 hover:bg-gray-50"
                            >
                                {label(b)}
                            </button>
                        ))
                    )}
                </div>
            )}
            {!isSearching && hasCriteria && results.length === 0 && (
                <div className="mt-1.5 px-1 text-xs text-gray-400">
                    {vehicleId ? "No completed bookings found for this vehicle." : `No completed bookings found for "${typed}".`}
                </div>
            )}
        </div>
    );
}
