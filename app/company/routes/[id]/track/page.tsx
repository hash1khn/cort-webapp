'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Bus, MapPin, Navigation, RefreshCw, Radio, ChevronLeft } from 'lucide-react';
import { Card } from '@/app/admin/ui/Card';
import { Button } from '@/app/admin/ui/Button';
import { apiClient } from '@/app/lib/services/api-client';
import { useShuttleTracking } from '@/app/lib/hooks/useShuttleTracking';
import type { MapMarker, MapPolyline } from '@/app/admin/ui/Map';

const Map = dynamic(() => import('@/app/admin/ui/Map'), { ssr: false });

// ---- Types ----------------------------------------------------------------

type RouteStop = {
    id: number;
    name: string;
    sequence_order: number;
    morning_eta: string | null;
    evening_eta: string | null;
    lat: number | null;
    lng: number | null;
};

type ShuttleTrip = {
    id: number;
    direction: 'MORNING' | 'EVENING';
    status: string;
    started_at: string | null;
    completed_at: string | null;
    current_stop_id: number | null;
    routes?: {
        id: number;
        name: string;
        vehicles?: { id: number; plate_number: string; model: string | null } | null;
        route_stops?: RouteStop[];
    } | null;
};

type PolylineResponse = {
    points: { lat: number; lng: number }[];
    encodedPolyline: string;
};

// ---- Helpers ---------------------------------------------------------------

function statusBadge(status: string) {
    const map: Record<string, string> = {
        SCHEDULED: 'bg-gray-100 text-gray-600',
        STARTED: 'bg-blue-100 text-blue-700',
        IN_PROGRESS: 'bg-orange-100 text-orange-700',
        COMPLETED: 'bg-green-100 text-green-700',
        CANCELLED: 'bg-red-100 text-red-600',
    };
    return map[status] ?? 'bg-gray-100 text-gray-600';
}

// ---- Component -------------------------------------------------------------

export default function CompanyRouteTrackingPage() {
    const params = useParams();
    const router = useRouter();
    const routeId = params.id ? +params.id : null;

    const [trips, setTrips] = useState<ShuttleTrip[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedTripId, setSelectedTripId] = useState<number | null>(null);
    const [polyline, setPolyline] = useState<PolylineResponse | null>(null);
    const [polylineLoading, setPolylineLoading] = useState(false);

    const { driverCoord, isConnected } = useShuttleTracking(selectedTripId);

    const selectedTrip = useMemo(
        () => trips.find((t) => t.id === selectedTripId) ?? null,
        [trips, selectedTripId],
    );

    // ---- Data fetching -------------------------------------------------------

    const loadTrips = useCallback(async () => {
        if (!routeId) return;
        try {
            setLoading(true);
            setError(null);
            const now = new Date();
            const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

            // Fetch trips for this specific route for today
            const data = await apiClient.request<ShuttleTrip[]>(`/shuttle-trips/today?date=${date}&route_id=${routeId}`);
            const list = Array.isArray(data) ? data : (data as any)?.data ?? [];
            setTrips(list);

            // Select the first trip (usually the active one if available due to backend sorting)
            if (list.length > 0 && !selectedTripId) {
                setSelectedTripId(list[0].id);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load tracking data');
        } finally {
            setLoading(false);
        }
    }, [routeId, selectedTripId]);

    const loadPolyline = useCallback(async (tripId: number) => {
        try {
            setPolylineLoading(true);
            const data = await apiClient.request<PolylineResponse>(`/shuttle-trips/${tripId}/polyline`);
            setPolyline(data);
        } catch {
            setPolyline(null);
        } finally {
            setPolylineLoading(false);
        }
    }, []);

    useEffect(() => {
        loadTrips();
    }, [loadTrips]);

    useEffect(() => {
        if (selectedTripId) {
            setPolyline(null);
            loadPolyline(selectedTripId);
        }
    }, [selectedTripId, loadPolyline]);

    // ---- Map data -------------------------------------------------------

    const stopMarkers: MapMarker[] = useMemo(() => {
        const stops = selectedTrip?.routes?.route_stops ?? [];
        return stops
            .filter((s) => s.lat !== null && s.lng !== null)
            .map((s) => ({
                id: `stop-${s.id}`,
                position: [s.lat!, s.lng!] as [number, number],
                label: `${s.name}${selectedTrip?.direction === 'MORNING' ? (s.morning_eta ? ` · ${s.morning_eta}` : '') : (s.evening_eta ? ` · ${s.evening_eta}` : '')}`,
                color: s.id === selectedTrip?.current_stop_id ? '#f47f00' : '#6366f1',
            }));
    }, [selectedTrip]);

    const driverMarker: MapMarker | null = useMemo(() => {
        if (!driverCoord) return null;
        return {
            id: 'driver',
            position: [driverCoord.lat, driverCoord.lng],
            label: `Driver · ${driverCoord.speed !== undefined ? `${Math.round((driverCoord.speed ?? 0) * 3.6)} km/h` : 'live'}`,
        };
    }, [driverCoord]);

    const mapMarkers = useMemo(
        () => [...stopMarkers, ...(driverMarker ? [driverMarker] : [])],
        [stopMarkers, driverMarker],
    );

    const mapPolylines: MapPolyline[] = useMemo(() => {
        if (!polyline?.points?.length) return [];
        let points = polyline.points;

        if (driverCoord) {
            let minDist = Infinity;
            let nearestIdx = 0;
            for (let i = 0; i < points.length; i++) {
                const dLat = points[i].lat - driverCoord.lat;
                const dLng = points[i].lng - driverCoord.lng;
                const dist = dLat * dLat + dLng * dLng;
                if (dist < minDist) {
                    minDist = dist;
                    nearestIdx = i;
                }
            }
            points = points.slice(nearestIdx);
        }

        return [{ positions: points.map((p) => [p.lat, p.lng] as [number, number]), color: '#0C225E' }];
    }, [polyline, driverCoord]);

    const mapCenter = useMemo((): [number, number] => {
        if (driverCoord) return [driverCoord.lat, driverCoord.lng];
        const firstStop = selectedTrip?.routes?.route_stops?.find((s) => s.lat && s.lng);
        if (firstStop) return [firstStop.lat!, firstStop.lng!];
        return [24.8607, 67.0011];
    }, [driverCoord, selectedTrip]);

    // ---- Render ----------------------------------------------------------------

    return (
        <div className="flex flex-col gap-6 h-full p-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" onClick={() => router.back()}>
                        <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <div>
                        <div className="text-sm font-medium text-gray-400">Route Tracking</div>
                        <h1 className="mt-1 text-2xl font-bold text-gray-900">
                            {selectedTrip?.routes?.name || 'Loading Route...'}
                        </h1>
                    </div>
                </div>
                <Button variant="outline" onClick={loadTrips} disabled={loading}>
                    <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 min-h-[600px]">
                {/* Trip list & Info */}
                <div className="lg:col-span-1 flex flex-col gap-4 overflow-y-auto">
                    {loading && (
                        <div className="text-center py-12 text-gray-400">
                            <p>Loading today&apos;s trips...</p>
                        </div>
                    )}
                    {!loading && trips.length === 0 && (
                        <Card className="p-8 text-center text-gray-400">
                            <Bus className="w-8 h-8 mx-auto mb-2 opacity-40" />
                            <p className="text-sm">No trips scheduled for this route today.</p>
                        </Card>
                    )}

                    {trips.map((trip) => (
                        <button
                            key={trip.id}
                            type="button"
                            onClick={() => setSelectedTripId(trip.id)}
                            className={`w-full text-left rounded-xl border p-4 transition-all ${selectedTripId === trip.id
                                    ? 'border-[#0C225E] bg-[#0C225E]/5 ring-1 ring-[#0C225E]'
                                    : 'border-gray-200 bg-white hover:border-gray-300'
                                }`}
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <Bus className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-semibold text-gray-900 text-sm">
                                            {trip.direction} Trip
                                        </p>
                                        <p className="text-xs text-gray-400 mt-0.5">
                                            {trip.routes?.vehicles?.plate_number ?? 'No vehicle assigned'}
                                        </p>
                                    </div>
                                </div>
                                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${statusBadge(trip.status)}`}>
                                    {trip.status}
                                </span>
                            </div>

                            {selectedTripId === trip.id && (
                                <div className={`mt-3 flex items-center gap-1.5 text-xs font-medium ${isConnected ? 'text-green-600' : 'text-gray-400'}`}>
                                    <Radio className="w-3 h-3" />
                                    {isConnected ? 'Live tracking active' : 'Connecting...'}
                                </div>
                            )}
                        </button>
                    ))}

                    {selectedTrip && (
                        <Card className="p-4 mt-auto">
                            <div className="text-xs font-semibold text-gray-400 tracking-wider mb-3">ROUTE DETAILS</div>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                                        <Navigation className="w-4 h-4 text-gray-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400">Status</p>
                                        <p className="text-sm font-medium text-gray-900">{selectedTrip.status}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                                        <MapPin className="w-4 h-4 text-gray-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400">Total Stops</p>
                                        <p className="text-sm font-medium text-gray-900">{selectedTrip.routes?.route_stops?.length || 0} Stops</p>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    )}
                </div>

                {/* Map */}
                <div className="lg:col-span-3 flex flex-col gap-3 relative">
                    <div className="absolute top-4 left-4 z-[10] flex flex-col gap-2">
                        {selectedTrip && (
                            <div className="bg-white/90 backdrop-blur px-3 py-2 rounded-lg shadow-sm border border-gray-200">
                                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-tight">Active Trip</p>
                                <p className="text-sm font-bold text-[#0C225E]">{selectedTrip.direction} · {selectedTrip.routes?.vehicles?.plate_number || 'No Vehicle'}</p>
                            </div>
                        )}
                    </div>

                    <Map
                        center={mapCenter}
                        zoom={13}
                        markers={mapMarkers}
                        polylines={mapPolylines}
                        height="100%"
                        className="flex-1 min-h-[500px]"
                    />
                </div>
            </div>
        </div>
    );
}
