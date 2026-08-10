'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PermissionGate } from '@/app/admin/components/PermissionGate';
import { AdminCan } from '@/app/lib/abilities/AdminAbilityProvider';
import { Car, Clock, MapPin, Navigation, Phone, RefreshCw, User } from 'lucide-react';
import { Card } from '@/app/admin/ui/Card';
import { Button } from '@/app/admin/ui/Button';
import { apiClient } from '@/app/lib/services/api-client';
import type { MapMarker } from '@/app/admin/ui/Map';

const Map = dynamic(() => import('@/app/admin/ui/Map'), { ssr: false });

// ---- Types ------------------------------------------------------------------

type ActiveBooking = {
    id: number;
    status: string;
    scheduled_for: string;
    trip_type: string;
    package_selected: string;
    vehicle_model: string | null;
    pickup_address: string | null;
    driver_id: string | null;
    company_name: string | null;
    passenger_name: string | null;
    passenger_phone: string | null;
    driver_name: string | null;
    driver_phone: string | null;
    plate_number: string | null;
    vehicle_make: string | null;
    vehicle_model_name: string | null;
    vehicle_color: string | null;
    driver_lat: number | null;
    driver_lng: number | null;
    driver_online: boolean | null;
    driver_location_updated_at: string | null;
    pickup_lat: number | null;
    pickup_lng: number | null;
};

// ---- Helpers ----------------------------------------------------------------

const STATUS_STYLES: Record<string, string> = {
    ASSIGNED:    'bg-blue-100 text-blue-700',
    OTW:         'bg-indigo-100 text-indigo-700',
    ARRIVED:     'bg-amber-100 text-amber-700',
    IN_PROGRESS: 'bg-orange-100 text-orange-700',
    DROPPED_OFF: 'bg-purple-100 text-purple-700',
};

const STATUS_LABELS: Record<string, string> = {
    ASSIGNED:    'Assigned',
    OTW:         'On The Way',
    ARRIVED:     'Driver Arrived',
    IN_PROGRESS: 'In Progress',
    DROPPED_OFF: 'Dropped Off',
};

function timeAgo(isoString: string | null): string {
    if (!isoString) return '—';
    const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
}

function formatTime(isoString: string): string {
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ---- Component --------------------------------------------------------------

export default function OpsChauffeurPage() {
    return (
        <PermissionGate permission="ops_chauffeur">
            <AdminCan I="read" a="OpsChauffeur">
                <OpsChauffeurContent />
            </AdminCan>
        </PermissionGate>
    );
}

function OpsChauffeurContent() {
    const [bookings, setBookings] = useState<ActiveBooking[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const selectedBooking = useMemo(
        () => bookings.find((b) => b.id === selectedId) ?? null,
        [bookings, selectedId],
    );

    // ---- Data fetching -------------------------------------------------------

    const loadBookings = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        setError(null);
        try {
            const data = await apiClient.request<ActiveBooking[]>('/admin/bookings/active-locations');
            const list: ActiveBooking[] = Array.isArray(data)
                ? data
                : (((data as any)?.data ?? []) as ActiveBooking[]);
            setBookings(list);
            setLastRefresh(new Date());
            // Keep the current selection if it still exists after refresh.
            // If not, fall back to the first booking (or clear selection if empty).
            setSelectedId((prev) => {
                if (list.length === 0) return null;
                if (prev == null) return list[0].id;
                return list.some((b) => b.id === prev) ? prev : list[0].id;
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load bookings');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadBookings();
        // Auto-refresh every 15 seconds
        intervalRef.current = setInterval(() => loadBookings(true), 15_000);
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [loadBookings]);

    // ---- Map data -----------------------------------------------------------

    const mapMarkers = useMemo((): MapMarker[] => {
        const markers: MapMarker[] = [];

        bookings.forEach((b) => {
            const isSelected = b.id === selectedId;

            // Driver marker
            if (b.driver_lat != null && b.driver_lng != null) {
                markers.push({
                    id: `driver-${b.id}`,
                    type: 'chauffeur',
                    position: [b.driver_lat, b.driver_lng],
                    label: `${b.driver_name ?? 'Driver'} · ${b.plate_number ?? '—'}\n${STATUS_LABELS[b.status] ?? b.status}`,
                    color: isSelected ? '#f47f00' : '#0C225E',
                });
            }

            // Pickup marker (only for selected booking)
            if (isSelected && b.pickup_lat != null && b.pickup_lng != null) {
                markers.push({
                    id: 'pickup',
                    position: [b.pickup_lat, b.pickup_lng],
                    label: b.pickup_address ?? 'Pickup',
                });
            }
        });

        return markers;
    }, [bookings, selectedId]);

    const mapCenter = useMemo((): [number, number] => {
        if (selectedBooking?.driver_lat && selectedBooking?.driver_lng) {
            return [selectedBooking.driver_lat, selectedBooking.driver_lng];
        }
        if (selectedBooking?.pickup_lat && selectedBooking?.pickup_lng) {
            return [selectedBooking.pickup_lat, selectedBooking.pickup_lng];
        }
        return [24.8607, 67.0011]; // Karachi default
    }, [selectedBooking]);

    // ---- Render -------------------------------------------------------------

    return (
        <div className="flex flex-col gap-6 h-full">
            {/* Header */}
            <div className="flex justify-between items-center flex-wrap gap-3">
                <div>
                    <div className="text-sm font-medium text-gray-400">Operations</div>
                    <h1 className="mt-1 text-2xl font-bold text-gray-900">Chauffeur Tracking</h1>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    {lastRefresh && (
                        <span className="text-xs text-gray-400">
                            Updated {timeAgo(lastRefresh.toISOString())} · auto-refresh 15s
                        </span>
                    )}
                    <Button variant="outline" onClick={() => loadBookings()} disabled={loading}>
                        <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>
            </div>

            {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
                {/* Booking list */}
                <div className="lg:col-span-1 flex flex-col gap-3 overflow-y-auto max-h-[50vh] lg:max-h-none">
                    {/* Summary pills */}
                    <div className="flex gap-2 flex-wrap shrink-0">
                        {(['ASSIGNED', 'OTW', 'ARRIVED', 'IN_PROGRESS', 'DROPPED_OFF'] as const).map((s) => {
                            const count = bookings.filter((b) => b.status === s).length;
                            return (
                                <span
                                    key={s}
                                    className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_STYLES[s]}`}
                                >
                                    {count} {STATUS_LABELS[s]}
                                </span>
                            );
                        })}
                    </div>

                    {loading && bookings.length === 0 && (
                        <div className="text-center py-12 text-gray-400 text-sm">Loading...</div>
                    )}

                    {!loading && bookings.length === 0 && (
                        <Card className="p-8 text-center text-gray-400">
                            <Car className="w-8 h-8 mx-auto mb-2 opacity-40" />
                            <p className="text-sm">No active chauffeur bookings right now.</p>
                        </Card>
                    )}

                    {bookings.map((b) => (
                        <button
                            key={b.id}
                            type="button"
                            onClick={() => setSelectedId(b.id)}
                            className={`w-full text-left rounded-xl border p-4 transition-all ${
                                selectedId === b.id
                                    ? 'border-[#0C225E] bg-[#0C225E]/5 ring-1 ring-[#0C225E]'
                                    : 'border-gray-200 bg-white hover:border-gray-300'
                            }`}
                        >
                            <div className="flex items-start justify-between gap-2 mb-3">
                                <div>
                                    <p className="font-semibold text-gray-900 text-sm">
                                        {b.company_name ?? '—'}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-0.5">
                                        #{b.id} · {formatTime(b.scheduled_for)}
                                    </p>
                                </div>
                                <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[b.status] ?? 'bg-gray-100 text-gray-600'}`}>
                                    {STATUS_LABELS[b.status] ?? b.status}
                                </span>
                            </div>

                            {/* Passenger row */}
                            <div className="flex items-center gap-2 text-xs text-gray-600 mb-1.5">
                                <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                <span className="truncate">{b.passenger_name ?? '—'}</span>
                            </div>

                            {/* Driver + vehicle row */}
                            <div className="flex items-center gap-2 text-xs text-gray-600 mb-1.5">
                                <Car className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                <span className="truncate">
                                    {b.driver_name ?? 'Unassigned'}
                                    {b.plate_number ? ` · ${b.plate_number}` : ''}
                                </span>
                            </div>

                            {/* Pickup */}
                            {b.pickup_address && (
                                <div className="flex items-start gap-2 text-xs text-gray-500">
                                    <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                                    <span className="truncate">{b.pickup_address}</span>
                                </div>
                            )}

                            {/* Driver location freshness */}
                            {b.driver_lat != null ? (
                                <div className="mt-2 flex items-center gap-1.5 text-[10px]">
                                    <span className={`w-1.5 h-1.5 rounded-full ${b.driver_online ? 'bg-green-500' : 'bg-gray-400'}`} />
                                    <span className={b.driver_online ? 'text-green-600' : 'text-gray-400'}>
                                        {b.driver_online ? 'Online' : 'Offline'} · {timeAgo(b.driver_location_updated_at)}
                                    </span>
                                </div>
                            ) : (
                                <div className="mt-2 text-[10px] text-gray-400">No driver location yet</div>
                            )}
                        </button>
                    ))}
                </div>

                {/* Right: Map + detail panel */}
                <div className="lg:col-span-2 flex flex-col gap-3">
                    {/* Selected booking detail strip */}
                    {selectedBooking && (
                        <Card className="p-4">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                                <div>
                                    <p className="text-xs text-gray-400 mb-0.5">Passenger</p>
                                    <p className="font-medium text-gray-900 truncate">{selectedBooking.passenger_name ?? '—'}</p>
                                    {selectedBooking.passenger_phone && (
                                        <a href={`tel:${selectedBooking.passenger_phone}`} className="flex items-center gap-1 text-xs text-blue-600 mt-0.5">
                                            <Phone className="w-3 h-3" />{selectedBooking.passenger_phone}
                                        </a>
                                    )}
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400 mb-0.5">Driver</p>
                                    <p className="font-medium text-gray-900 truncate">{selectedBooking.driver_name ?? 'Unassigned'}</p>
                                    {selectedBooking.driver_phone && (
                                        <a href={`tel:${selectedBooking.driver_phone}`} className="flex items-center gap-1 text-xs text-blue-600 mt-0.5">
                                            <Phone className="w-3 h-3" />{selectedBooking.driver_phone}
                                        </a>
                                    )}
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400 mb-0.5">Vehicle</p>
                                    <p className="font-medium text-gray-900">
                                        {[selectedBooking.vehicle_make, selectedBooking.vehicle_model_name].filter(Boolean).join(' ') || selectedBooking.vehicle_model || '—'}
                                    </p>
                                    <p className="text-xs text-gray-500">{selectedBooking.plate_number ?? '—'}{selectedBooking.vehicle_color ? ` · ${selectedBooking.vehicle_color}` : ''}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400 mb-0.5">Driver Location</p>
                                    {selectedBooking.driver_lat != null ? (
                                        <>
                                            <p className="font-medium text-gray-900 flex items-center gap-1">
                                                <Navigation className="w-3.5 h-3.5 text-orange-500" />
                                                Live
                                            </p>
                                            <p className="text-xs text-gray-500 flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {timeAgo(selectedBooking.driver_location_updated_at)}
                                            </p>
                                        </>
                                    ) : (
                                        <p className="text-gray-400 text-xs">Not available</p>
                                    )}
                                </div>
                            </div>
                            {selectedBooking.pickup_address && (
                                <div className="mt-3 pt-3 border-t border-gray-100 flex items-start gap-2 text-xs text-gray-600">
                                    <MapPin className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
                                    <span>{selectedBooking.pickup_address}</span>
                                </div>
                            )}
                        </Card>
                    )}

                    {/* Map */}
                    <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm" style={{ height: 'clamp(300px, 50vh, 600px)' }}>
                        <Map
                            center={mapCenter}
                            zoom={13}
                            markers={mapMarkers}
                            polylines={[]}
                            height="100%"
                        />
                    </div>

                    {bookings.length > 0 && (
                        <p className="text-xs text-gray-400 text-right">
                            Orange marker = selected driver · Dark blue = other drivers · Green pin = pickup
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
